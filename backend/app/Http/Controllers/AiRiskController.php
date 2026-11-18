<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AiPrivacyService;
use App\Services\AiServiceClient;
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
        //    (URL + X-AI-Service-Key header come from config('services.ai.*')).
        try {
            $response = AiServiceClient::request()->post('/predict/patient-risk', [
                'anonymized_data' => $anonymizedData
            ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Patient risk assessment completed successfully (PII was securely masked).',
                    'data' => $response->json(),
                ]);
            }

            report(new \RuntimeException('AI service error ' . $response->status() . ': ' . $response->body()));

            return response()->json([
                'success' => false,
                'message' => 'AI Service failed to process the request.',
            ], $response->status() >= 500 ? 502 : $response->status());

        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Could not connect to the AI Microservice.',
            ], 503);
        }
    }
}
