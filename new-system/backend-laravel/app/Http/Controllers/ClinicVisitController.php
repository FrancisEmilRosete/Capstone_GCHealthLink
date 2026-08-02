<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Visit\StoreVisitRequest;
use App\Http\Resources\ClinicVisitResource;
use App\Models\AuditLog;
use App\Models\ClinicVisit;
use App\Models\InventoryBatch;
use App\Models\VisitMedicine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * ClinicVisitController
 *
 * Routes:
 *   GET    /api/visits           → index()
 *   POST   /api/visits           → store()
 *   GET    /api/visits/{visit}   → show()
 *   PUT    /api/visits/{visit}   → update()  (concern_tag only)
 *   DELETE /api/visits/{visit}   → destroy() (Admin only)
 */
class ClinicVisitController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/visits
    // -------------------------------------------------------------------------

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ClinicVisit::query()
            ->with(['studentProfile', 'handledBy'])
            ->orderByDesc('visit_date')
            ->orderByDesc('created_at');

        if ($studentId = $request->query('student_id')) {
            $query->where('student_profile_id', $studentId);
        }

        if ($concern = $request->query('concern_tag')) {
            $query->where('concern_tag', $concern);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('visit_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('visit_date', '<=', $to);
        }

        $perPage = min((int) ($request->query('per_page', 20)), 100);

        return ClinicVisitResource::collection($query->paginate($perPage));
    }

    // -------------------------------------------------------------------------
    // POST /api/visits
    // -------------------------------------------------------------------------

    public function store(StoreVisitRequest $request): JsonResponse
    {
        $data = $request->validated();

        $visit = DB::transaction(function () use ($data, $request): ClinicVisit {
            // 1. Create the visit record
            $visit = ClinicVisit::create([
                'student_profile_id' => $data['student_profile_id'],
                'handled_by_id'      => $request->user()->id,
                'visit_date'         => $data['visit_date'],
                'visit_time'         => $data['visit_time'] ?? null,
                // The 'encrypted' cast in the model encrypts this before saving
                'chief_complaint_enc' => $data['chief_complaint'] ?? null,
                'concern_tag'        => $data['concern_tag'] ?? 'General Consultation',
            ]);

            // 2. Dispense medicines if provided
            if (!empty($data['medicines'])) {
                foreach ($data['medicines'] as $med) {
                    VisitMedicine::create([
                        'visit_id'     => $visit->id,
                        'inventory_id' => $med['inventory_id'],
                        'quantity'     => $med['quantity'],
                        'status'       => 'DISPENSED',
                    ]);

                    // Decrement stock from the oldest non-expired batch (FEFO)
                    $this->decrementStock($med['inventory_id'], $med['quantity']);
                }
            }

            return $visit->load(['studentProfile', 'handledBy', 'dispensedMedicines.inventory']);
        });

        AuditLog::record(
            'VISIT_CREATE',
            "New visit recorded for student ID: {$visit->student_profile_id}",
            $visit->id
        );

        return response()->json(new ClinicVisitResource($visit), 201);
    }

    // -------------------------------------------------------------------------
    // GET /api/visits/{visit}
    // -------------------------------------------------------------------------

    public function show(ClinicVisit $visit): JsonResponse
    {
        $visit->load(['studentProfile', 'handledBy', 'dispensedMedicines.inventory']);
        return response()->json(new ClinicVisitResource($visit));
    }

    // -------------------------------------------------------------------------
    // PUT /api/visits/{visit}
    // -------------------------------------------------------------------------

    public function update(Request $request, ClinicVisit $visit): JsonResponse
    {
        // Only the concern_tag and chief_complaint can be corrected after creation
        $data = $request->validate([
            'concern_tag'     => ['sometimes', 'string', 'max:100'],
            'chief_complaint' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (isset($data['chief_complaint'])) {
            $data['chief_complaint_enc'] = $data['chief_complaint'];
            unset($data['chief_complaint']);
        }

        $visit->update($data);

        AuditLog::record('VISIT_UPDATE', 'Visit record updated.', $visit->id);

        return response()->json(new ClinicVisitResource($visit->fresh()));
    }

    // -------------------------------------------------------------------------
    // DELETE /api/visits/{visit}
    // -------------------------------------------------------------------------

    public function destroy(Request $request, ClinicVisit $visit): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        AuditLog::record('VISIT_DELETE', 'Visit record deleted.', $visit->id);
        $visit->delete();

        return response()->json(['message' => 'Visit deleted.']);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Decrement inventory stock using FEFO (First Expired, First Out).
     * Walks through batches sorted by expiration date (ascending) until
     * the requested quantity is fulfilled.
     */
    private function decrementStock(string $inventoryId, int $quantity): void
    {
        $batches = InventoryBatch::where('inventory_id', $inventoryId)
            ->where('current_stock', '>', 0)
            ->orderBy('expiration_date')  // FEFO
            ->lockForUpdate()
            ->get();

        $remaining = $quantity;

        foreach ($batches as $batch) {
            if ($remaining <= 0) break;

            $deduct          = min($batch->current_stock, $remaining);
            $batch->current_stock -= $deduct;
            $batch->save();
            $remaining -= $deduct;
        }

        if ($remaining > 0) {
            throw new \RuntimeException("Insufficient stock for inventory ID: {$inventoryId}");
        }
    }
}
