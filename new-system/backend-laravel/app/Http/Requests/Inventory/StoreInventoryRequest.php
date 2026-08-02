<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() || $this->user()?->isClinicStaff();
    }

    public function rules(): array
    {
        return [
            'item_name'         => ['required', 'string', 'max:200', 'unique:inventories,item_name'],
            'reorder_threshold' => ['required', 'integer', 'min:0'],
            'dosage_value'      => ['nullable', 'string', 'max:50'],
            'form_dosage'       => ['nullable', 'string', 'max:100'],
            'unit'              => ['required', 'string', 'max:50'],
            'category'          => ['required', 'string', 'in:MEDICINE,DENTAL'],

            // Initial batch (optional but recommended)
            'batch_number'      => ['nullable', 'string', 'max:100'],
            'initial_stock'     => ['nullable', 'integer', 'min:0'],
            'expiration_date'   => ['nullable', 'date'],
        ];
    }
}
