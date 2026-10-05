<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AiPrivacyService;
use Illuminate\Support\Facades\Http;

class AiRiskController extends Controller
{
    protected $privacyService;

    public function __construct(AiPrivacyService $privacyService)
    {
        $this->privacyService = $privacyService;
    }

    /**
     * Analyze a patient's risk profile using the AI microservice safely.
     */
    public function predictPatientRisk(Request $request)
    {
        // 1. Validate the incoming raw patient data
        $validatedData = $request->validate([
            'patient_data' => 'required|array',
            // Allow dynamic fields but ensure it's an array
        ]);

        $rawPatientData = $validatedData['patient_data'];

        // 2. Anonymize and Pseudonymize the data to remove PII/PHI
        $anonymizedData = $this->privacyService->anonymizePatientRecord($rawPatientData);

        // 3. Send ONLY the anonymized data to the Python AI Microservice
        $aiServiceUrl = env('AI_SERVICE_URL', 'http://localhost:8000');
        
        try {
            // Assuming the AI microservice has a new endpoint /predict/patient-risk
            $response = Http::post("{$aiServiceUrl}/predict/patient-risk", [
                'anonymized_data' => $anonymizedData
            ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Patient risk assessment completed successfully (PII was securely masked).',
                    'data' => $response->json(),
                    'debug_anonymized_payload' => $anonymizedData // Only for debugging/demonstration to the adviser
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'AI Service failed to process the request.',
                'error' => $response->body()
            ], $response->status());

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Could not connect to the AI Microservice.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
