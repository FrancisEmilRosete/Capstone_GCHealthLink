<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Advisory\StoreAdvisoryRequest;
use App\Http\Resources\HealthAdvisoryResource;
use App\Models\AuditLog;
use App\Models\HealthAdvisory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HealthAdvisoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = HealthAdvisory::query()
            ->with('creator')
            ->orderByDesc('created_at');

        // Students/staff see advisories targeting their dept or ALL
        $user = $request->user();
        if ($user->isStudent()) {
            $dept = $user->studentProfile?->course_dept;
            $query->where(fn ($q) => $q->where('target_dept', 'ALL')
                ->orWhere('target_dept', $dept));
        }

        return HealthAdvisoryResource::collection($query->get());
    }

    public function store(StoreAdvisoryRequest $request): JsonResponse
    {
        $advisory = HealthAdvisory::create(array_merge($request->validated(), [
            'created_by' => $request->user()->id,
        ]));

        AuditLog::record(
            'ADVISORY_CREATE',
            "Health advisory posted: {$advisory->title}",
            $advisory->id
        );

        return response()->json(new HealthAdvisoryResource($advisory), 201);
    }

    public function show(HealthAdvisory $advisory): JsonResponse
    {
        return response()->json(
            new HealthAdvisoryResource($advisory->load('creator'))
        );
    }

    public function update(Request $request, HealthAdvisory $advisory): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        $data = $request->validate([
            'title'       => ['sometimes', 'string', 'max:255'],
            'message'     => ['sometimes', 'string'],
            'target_dept' => ['nullable', 'string', 'max:50'],
            'severity'    => ['sometimes', 'string', 'in:INFO,WARNING,CRITICAL'],
        ]);

        $advisory->update($data);
        AuditLog::record('ADVISORY_UPDATE', 'Health advisory updated.', $advisory->id);

        return response()->json(new HealthAdvisoryResource($advisory->fresh('creator')));
    }

    public function destroy(Request $request, HealthAdvisory $advisory): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        AuditLog::record('ADVISORY_DELETE', "Advisory deleted: {$advisory->title}", $advisory->id);
        $advisory->delete();

        return response()->json(['message' => 'Advisory deleted.']);
    }
}
