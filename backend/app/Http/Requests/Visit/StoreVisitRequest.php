<?php

declare(strict_types=1);

namespace App\Http\Requests\Visit;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isClinicStaff();
    }

    public function rules(): array
    {
        return [
            'student_profile_id' => ['required', 'ulid', 'exists:student_profiles,id'],
            'visit_date'         => ['required', 'date'],
            'visit_time'         => ['nullable', 'string', 'max:20'],
            'chief_complaint'    => ['nullable', 'string', 'max:2000'],
            'concern_tag'        => ['nullable', 'string', 'max:100'],
            // Medicines to dispense (optional)
            'medicines'                 => ['nullable', 'array'],
            'medicines.*.inventory_id'  => ['required_with:medicines', 'ulid', 'exists:inventories,id'],
            'medicines.*.quantity'      => ['required_with:medicines', 'integer', 'min:1'],
        ];
    }
}
