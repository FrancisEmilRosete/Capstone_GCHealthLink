<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Certificate\StoreCertificateRequest;
use App\Http\Resources\MedicalCertificateResource;
use App\Models\AuditLog;
use App\Models\MedicalCertificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MedicalCertificateController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MedicalCertificate::query()
            ->with(['studentProfile', 'issuedBy'])
            ->orderByDesc('issued_at');

        if ($studentId = $request->query('student_id')) {
            $query->where('student_profile_id', $studentId);
        }

        return MedicalCertificateResource::collection($query->paginate(20));
    }

    public function store(StoreCertificateRequest $request): JsonResponse
    {
        $data = $request->validated();

        $cert = MedicalCertificate::create(array_merge($data, [
            'issued_by_id'   => $request->user()->id,
            'issued_by_role' => $request->user()->clinic_staff_type ?? 'DOCTOR',
        ]));

        AuditLog::record(
            'CERTIFICATE_ISSUE',
            "Medical certificate issued (type: {$cert->certificate_type})",
            $cert->id,
            ['student_profile_id' => $cert->student_profile_id]
        );

        return response()->json(
            new MedicalCertificateResource($cert->load(['studentProfile', 'issuedBy'])),
            201
        );
    }

    public function show(MedicalCertificate $certificate): JsonResponse
    {
        return response()->json(
            new MedicalCertificateResource($certificate->load(['studentProfile', 'issuedBy']))
        );
    }

    public function destroy(Request $request, MedicalCertificate $certificate): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized. Admin only.'], 403);
        }

        AuditLog::record('CERTIFICATE_DELETE', 'Medical certificate deleted.', $certificate->id);
        $certificate->delete();

        return response()->json(['message' => 'Certificate deleted.']);
    }
}
