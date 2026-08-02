<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Must be admin to view all users
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized. Admin role required.'], 403);
        }

        $users = User::with('studentProfile')->orderBy('created_at', 'desc')->get();

        $formattedUsers = $users->map(function ($user) {
            return [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'clinicStaffType' => $user->clinic_staff_type,
                'createdAt' => $user->created_at,
                'studentProfile' => $user->studentProfile ? [
                    'firstName' => $user->studentProfile->first_name,
                    'middleName' => $user->studentProfile->middle_name,
                    'lastName' => $user->studentProfile->last_name,
                    'studentNumber' => $user->studentProfile->student_number,
                    'courseDept' => $user->studentProfile->course_dept,
                    'course' => $user->studentProfile->course,
                    'yearLevel' => $user->studentProfile->year_level,
                ] : null
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedUsers
        ]);
    }
}
