<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the login request payload (already decrypted by EncryptApiPayload middleware).
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public route — no auth gate needed
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'    => 'Email address is required.',
            'email.email'       => 'Please provide a valid email address.',
            'password.required' => 'Password is required.',
            'password.min'      => 'Password must be at least 8 characters.',
        ];
    }
}
