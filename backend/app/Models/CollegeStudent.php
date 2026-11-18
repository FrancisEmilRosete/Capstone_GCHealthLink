<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * CollegeStudent Model
 *
 * Represents a read-only student record in the simulated College MIS database (college_db).
 *
 * @property int         $id
 * @property string      $student_number
 * @property string      $email
 * @property string      $password
 * @property string      $first_name
 * @property string      $last_name
 * @property string|null $middle_name
 * @property string      $course
 * @property string      $course_dept
 * @property string      $year_level
 * @property string|null $sex
 * @property string|null $birthday
 * @property string      $status
 */
class CollegeStudent extends Model
{
    /**
     * The database connection name for the simulated College MIS database.
     */
    protected $connection = 'college_db';

    /**
     * Table name in college_db.
     */
    protected $table = 'students';

    /**
     * Disable timestamps if the legacy college table does not have created_at/updated_at.
     */
    public $timestamps = false;

    /**
     * Attributes guarded from mass-assignment.
     */
    protected $guarded = [];

    /**
     * Attributes hidden from serialization.
     */
    protected $hidden = [
        'password',
    ];
}
