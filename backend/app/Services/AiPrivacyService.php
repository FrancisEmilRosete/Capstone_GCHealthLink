<?php

namespace App\Services;

class AiPrivacyService
{
    /**
     * Anonymize a single patient record by masking PII.
     * 
     * @param array $patientData
     * @return array
     */
    public function anonymizePatientRecord(array $patientData): array
    {
        $anonymized = $patientData;

        // 1. Remove Direct Identifiers (Name, Email, Student Number, Phone)
        unset($anonymized['first_name']);
        unset($anonymized['last_name']);
        unset($anonymized['middle_name']);
        unset($anonymized['email']);
        unset($anonymized['phone']);
        unset($anonymized['address']);
        
        // Replace Student Number with a pseudo-ID (e.g., hash) to maintain referential integrity without exposing identity
        if (isset($anonymized['student_number'])) {
            $anonymized['pseudo_id'] = hash('sha256', $anonymized['student_number'] . config('app.key'));
            unset($anonymized['student_number']);
        }

        // 2. Generalize Quasi-Identifiers
        // Convert exact Date of Birth to Age (or Age Bracket)
        if (isset($anonymized['date_of_birth'])) {
            $dob = new \DateTime($anonymized['date_of_birth']);
            $now = new \DateTime();
            $age = $now->diff($dob)->y;
            $anonymized['age'] = $age;
            unset($anonymized['date_of_birth']);
        }

        return $anonymized;
    }

    /**
     * Mask potential PII in raw text (e.g., for chatbot prompts).
     * 
     * @param string $text
     * @return string
     */
    public function maskTextContent(string $text): string
    {
        // Simple regex masking for common PII patterns in free text
        
        // Mask Phone Numbers (e.g., 09123456789, +639...)
        $text = preg_replace('/(\+63|09)\d{9}/', '[REDACTED_PHONE]', $text);
        
        // Mask Emails
        $text = preg_replace('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', '[REDACTED_EMAIL]', $text);
        
        // Mask Student Numbers (Assuming format like 2020-12345 or similar GC formats)
        $text = preg_replace('/\b20\d{2}-\d{5}\b/', '[REDACTED_STUDENT_NO]', $text);

        return $text;
    }
}
