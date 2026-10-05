<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicStaff extends Model
{
    protected $table = 'clinic_staff';
    protected $fillable = ['name', 'position'];
}
