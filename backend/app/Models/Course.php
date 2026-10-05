<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    protected $fillable = ['code', 'name', 'department_id'];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
