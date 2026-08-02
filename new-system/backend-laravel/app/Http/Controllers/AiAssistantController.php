<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\InventoryBatch;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Support\Facades\Log;

/**
 * AiAssistantController
 *
 * Handles AI-driven features (Chat, Smart Reminders, Outbreak Forecasting)
 * using the official google-gemini-php/laravel SDK.
 */
class AiAssistantController extends Controller
{
    /**
     * POST /api/ai/assist
     * Interactive Chat Assistant for Clinic Staff / Doctors.
     */
    public function assist(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prompt'  => ['required', 'string', 'min:2', 'max:4000'],
            'context' => ['nullable', 'string', 'max:2000'],
            'role'    => ['nullable', 'string', 'in:NURSE,DOCTOR,DENTIST,ADMIN,STUDENT'],
        ]);

        try {
            $systemInstruction = $this->buildSystemPrompt($data['role'] ?? 'NURSE');
            $userMessage       = $data['context']
                ? "Context:\n{$data['context']}\n\nQuestion:\n{$data['prompt']}"
                : $data['prompt'];

            $result = Gemini::geminiPro()
                ->generateContent("System Directive: {$systemInstruction}\n\nUser: {$userMessage}");

            return response()->json([
                'reply' => $result->text(),
                'model' => 'gemini-pro',
            ]);
        } catch (\Exception $e) {
            Log::error('Gemini SDK Error (Assist)', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'AI service temporarily unavailable.'], 503);
        }
    }

    /**
     * GET /api/ai/smart-reminders
     * Generates personalized daily reminders for staff (analyzing visits/inventory).
     */
    public function smartReminders(Request $request): JsonResponse
    {
        try {
            // 1. Gather context data
            $todayVisits = Appointment::whereDate('preferred_date', today())->count();
            $pendingVisits = Appointment::whereDate('preferred_date', today())
                                ->where('status', Appointment::STATUS_PENDING)->count();
            $lowStockItems = InventoryBatch::where('quantity', '<=', 10)->count();

            $prompt = "You are a clinical AI assistant for a university clinic. "
                    . "Based on the following data, generate 3 short, actionable, and encouraging bullet-point reminders for the clinic staff today:\n"
                    . "- Total visits today: {$todayVisits}\n"
                    . "- Pending visits: {$pendingVisits}\n"
                    . "- Low stock inventory items: {$lowStockItems}\n\n"
                    . "Return ONLY a JSON array of strings.";

            $result = Gemini::geminiPro()->generateContent($prompt);
            
            // Clean markdown blocks if present
            $text = trim($result->text());
            $text = preg_replace('/^```json\s*/', '', $text);
            $text = preg_replace('/\s*```$/', '', $text);

            $reminders = json_decode($text, true);

            if (!is_array($reminders)) {
                // Fallback
                $reminders = [
                    "You have {$pendingVisits} patients left to see today.",
                    $lowStockItems > 0 ? "Check inventory, {$lowStockItems} items are running low." : "Inventory levels are good.",
                    "Remember to sanitize workstations between visits."
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $reminders
            ]);
        } catch (\Exception $e) {
            Log::error('Gemini SDK Error (Reminders)', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => true,
                'data' => ["Stay hydrated during your shift!", "Remember to check pending appointments."] // Graceful fallback
            ]);
        }
    }

    /**
     * GET /api/ai/outbreak-forecast
     * Generates an epidemiological trend analysis based on recent visits.
     */
    public function outbreakForecast(Request $request): JsonResponse
    {
        try {
            // Get historical data for the FastAPI service
            $visits = Appointment::whereNotNull('symptoms')
                ->whereNotNull('preferred_date')
                ->selectRaw('DATE(preferred_date) as date, symptoms as illness_category, count(*) as cases')
                ->groupBy('date', 'illness_category')
                ->get();
                
            $historicalData = $visits->map(function ($visit) {
                return [
                    'date' => $visit->date,
                    'illness_category' => $visit->illness_category,
                    'cases' => (int) $visit->cases
                ];
            })->toArray();
            
            // If empty, supply a dummy record so the AI service doesn't fail
            if (empty($historicalData)) {
                $historicalData = [
                    [
                        'date' => now()->format('Y-m-d'),
                        'illness_category' => 'General Consultation',
                        'cases' => 0
                    ]
                ];
            }

            $aiServiceUrl = env('AI_SERVICE_URL', 'http://127.0.0.1:8001');
            
            $response = \Illuminate\Support\Facades\Http::post("{$aiServiceUrl}/predict/outbreak", [
                'historical_data' => $historicalData,
                'forecast_months' => 3
            ]);
            
            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Forecast retrieved',
                    'data' => $response->json() // Frontend expects the payload inside 'data'
                ]);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to reach AI service',
                'details' => $response->body()
            ], 502);
            
        } catch (\Exception $e) {
            Log::error('AI Bridge Error (Forecast)', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Unable to generate forecast at this time.'
            ], 503);
        }
    }

    /**
     * Build the persona instruction based on user role.
     */
    private function buildSystemPrompt(string $role): string
    {
        $base = "You are an advanced AI medical assistant integrated into GCHealthLink, a university clinic system. "
              . "Do not give definitive medical diagnoses; advise consultation with human professionals. ";

        return match ($role) {
            'NURSE' => $base . "Assist the clinic nurse with triage, patient queues, and basic first-aid protocols.",
            'DOCTOR' => $base . "Assist the physician with differential diagnoses, medication dosages, and medical record summaries.",
            'DENTIST' => $base . "Assist the dentist with oral health protocols, dental history, and procedure references.",
            'ADMIN' => $base . "Assist the clinic administrator with health analytics, inventory forecasting, and compliance.",
            'STUDENT' => $base . "You are a friendly health assistant. Help the student understand their health records and give general wellness advice.",
            default => $base,
        };
    }
}
