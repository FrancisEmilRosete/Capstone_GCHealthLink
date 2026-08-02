<?php

declare(strict_types=1);

namespace App\Http\Requests\Advisory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreAdvisoryRequest
 *
 * Validates the payload for creating a new HealthAdvisory.
 * Only Admins are authorised to post health advisories.
 *
 * Moves the inline validation from HealthAdvisoryController::store()
 * into a typed FormRequest for consistency with the rest of the codebase.
 */
class StoreAdvisoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:255'],
            'message'     => ['required', 'string'],
            'target_dept' => ['nullable', 'string', 'max:50'],
            'severity'    => ['required', 'string', 'in:INFO,WARNING,CRITICAL'],
        ];
    }

    public function messages(): array
    {
        return [
            'severity.in' => 'Severity must be one of: INFO, WARNING, CRITICAL.',
        ];
    }
}
