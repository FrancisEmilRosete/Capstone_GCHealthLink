<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Inventory\StoreInventoryRequest;
use App\Http\Resources\InventoryResource;
use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * InventoryController
 *
 * Routes (apiResource):
 *   GET    /api/inventory           → index()
 *   POST   /api/inventory           → store()
 *   GET    /api/inventory/{item}    → show()
 *   PUT    /api/inventory/{item}    → update()
 *   DELETE /api/inventory/{item}    → destroy()
 *
 * Extra routes (register manually):
 *   POST   /api/inventory/{item}/batches         → addBatch()
 *   PATCH  /api/inventory/{item}/batches/{batch} → updateBatch()
 */
class InventoryController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/inventory
    // -------------------------------------------------------------------------

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Inventory::query()
            ->withSum('batches', 'current_stock')   // total_stock alias
            ->with('batches')
            ->orderBy('item_name');

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        // Filter to only low-stock items
        if ($request->boolean('low_stock')) {
            $query->havingRaw('COALESCE(batches_sum_current_stock, 0) <= reorder_threshold');
        }

        return InventoryResource::collection(
            $query->paginate((int) ($request->query('per_page', 50)))
        );
    }

    // -------------------------------------------------------------------------
    // POST /api/inventory
    // -------------------------------------------------------------------------

    public function store(StoreInventoryRequest $request): JsonResponse
    {
        $data = $request->validated();

        $item = DB::transaction(function () use ($data): Inventory {
            $item = Inventory::create(collect($data)->only([
                'item_name', 'reorder_threshold', 'dosage_value',
                'form_dosage', 'unit', 'category',
            ])->all());

            // Optionally create the first batch in the same request
            if (!empty($data['batch_number'])) {
                InventoryBatch::create([
                    'inventory_id'    => $item->id,
                    'batch_number'    => $data['batch_number'],
                    'current_stock'   => $data['initial_stock'] ?? 0,
                    'expiration_date' => $data['expiration_date'] ?? null,
                ]);
            }

            return $item->load('batches');
        });

        AuditLog::record('INVENTORY_CREATE', "Added inventory item: {$item->item_name}", $item->id);

        return response()->json(new InventoryResource($item), 201);
    }

    // -------------------------------------------------------------------------
    // GET /api/inventory/{item}
    // -------------------------------------------------------------------------

    public function show(Inventory $inventory): JsonResponse
    {
        return response()->json(
            new InventoryResource($inventory->load('batches'))
        );
    }

    // -------------------------------------------------------------------------
    // PUT /api/inventory/{item}
    // -------------------------------------------------------------------------

    public function update(Request $request, Inventory $inventory): JsonResponse
    {
        $data = $request->validate([
            'item_name'         => ['sometimes', 'string', 'max:200',
                Rule::unique('inventories', 'item_name')->ignore($inventory->id)],
            'reorder_threshold' => ['sometimes', 'integer', 'min:0'],
            'dosage_value'      => ['nullable', 'string', 'max:50'],
            'form_dosage'       => ['nullable', 'string', 'max:100'],
            'unit'              => ['sometimes', 'string', 'max:50'],
            'category'          => ['sometimes', 'string', 'in:MEDICINE,DENTAL'],
        ]);

        $inventory->update($data);
        AuditLog::record('INVENTORY_UPDATE', "Updated inventory: {$inventory->item_name}", $inventory->id);

        return response()->json(
            new InventoryResource($inventory->load('batches'))
        );
    }

    // -------------------------------------------------------------------------
    // POST /api/inventory/{item}/batches
    // -------------------------------------------------------------------------

    public function addBatch(Request $request, Inventory $inventory): JsonResponse
    {
        $data = $request->validate([
            'batch_number'    => ['required', 'string', 'max:100'],
            'current_stock'   => ['required', 'integer', 'min:0'],
            'expiration_date' => ['nullable', 'date'],
        ]);

        $batch = InventoryBatch::create(array_merge($data, ['inventory_id' => $inventory->id]));

        AuditLog::record(
            'BATCH_ADD',
            "Added batch #{$batch->batch_number} to {$inventory->item_name}",
            $inventory->id,
            ['batch_id' => $batch->id, 'stock' => $batch->current_stock]
        );

        return response()->json($batch, 201);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/inventory/{item}
    // -------------------------------------------------------------------------

    public function destroy(Request $request, Inventory $inventory): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized. Admin only.'], 403);
        }

        AuditLog::record('INVENTORY_DELETE', "Deleted inventory: {$inventory->item_name}", $inventory->id);
        $inventory->delete();

        return response()->json(['message' => 'Inventory item deleted.']);
    }
}
