<?php

declare(strict_types=1);

namespace App\Http\Requests\Appointment;

use App\Models\Appointment;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isClinicStaff() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                'in:' . implode(',', [
                    Appointment::STATUS_WAITING,
                    Appointment::STATUS_PENDING,
                    Appointment::STATUS_IN_PROGRESS,
                    Appointment::STATUS_FOR_DISPENSING,
                    Appointment::STATUS_COMPLETED,
                    Appointment::STATUS_CANCELLED,
                ]),
            ],
        ];
    }
}
