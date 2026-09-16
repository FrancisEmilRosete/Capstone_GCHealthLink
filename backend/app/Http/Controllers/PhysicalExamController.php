<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\PhysicalExamination;
use App\Models\StudentProfile;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class PhysicalExamController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $studentProfileId = $request->query('studentProfileId');
        
        $query = PhysicalExamination::with('studentProfile');
        
        if ($studentProfileId) {
            $query->where('student_profile_id', $studentProfileId);
        }
        
        $exams = $query->orderBy('exam_date', 'desc')->paginate(20);
        
        return response()->json([
            'success' => true,
            'message' => 'Physical exams retrieved successfully.',
            'data' => $exams->items(),
            'pagination' => [
                'total' => $exams->total(),
                'page' => $exams->currentPage(),
                'limit' => $exams->perPage(),
                'totalPages' => $exams->lastPage(),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'studentProfileId' => 'required|exists:student_profiles,id',
            'yearLevel' => 'nullable|string|max:50',
            'examDate' => 'required|date',
            'bp' => 'nullable|string|max:50',
            'cr' => 'nullable|string|max:50',
            'rr' => 'nullable|string|max:50',
            'temp' => 'nullable|string|max:50',
            'weight' => 'nullable|string|max:50',
            'height' => 'nullable|string|max:50',
            'bmi' => 'nullable|string|max:50',
            'visualAcuity' => 'nullable|string|max:100',
            'skin' => 'nullable|string|max:255',
            'heent' => 'nullable|string|max:255',
            'chestLungs' => 'nullable|string|max:255',
            'heart' => 'nullable|string|max:255',
            'abdomen' => 'nullable|string|max:255',
            'extremities' => 'nullable|string|max:255',
            'others' => 'nullable|string|max:500',
            'examinedBy' => 'nullable|string|max:255',
        ]);

        $exam = PhysicalExamination::create([
            'student_profile_id' => $validated['studentProfileId'],
            'year_level' => $validated['yearLevel'] ?? null,
            'exam_date' => $validated['examDate'],
            'bp' => $validated['bp'] ?? null,
            'cr' => $validated['cr'] ?? null,
            'rr' => $validated['rr'] ?? null,
            'temp' => $validated['temp'] ?? null,
            'weight' => $validated['weight'] ?? null,
            'height' => $validated['height'] ?? null,
            'bmi' => $validated['bmi'] ?? null,
            'visual_acuity' => $validated['visualAcuity'] ?? null,
            'skin' => $validated['skin'] ?? null,
            'heent' => $validated['heent'] ?? null,
            'chest_lungs' => $validated['chestLungs'] ?? null,
            'heart' => $validated['heart'] ?? null,
            'abdomen' => $validated['abdomen'] ?? null,
            'extremities' => $validated['extremities'] ?? null,
            'others' => $validated['others'] ?? null,
            'examined_by' => $validated['examinedBy'] ?? null,
        ]);

        AuditLog::record(
            'RECORDED_PHYSICAL_EXAM',
            'Recorded new physical examination',
            $exam->student_profile_id,
            ['exam_id' => $exam->id]
        );

        return response()->json([
            'success' => true,
            'message' => 'Physical examination created successfully.',
            'data' => $exam
        ], 201);
    }
}
