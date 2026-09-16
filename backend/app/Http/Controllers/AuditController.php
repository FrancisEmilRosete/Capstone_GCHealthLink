<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /**
     * GET /api/audit
     * Fetch audit logs, with optional search and limit.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user.studentProfile')->orderByDesc('timestamp');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $limit = (int) $request->query('limit', 100);
        $logs = $query->take($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}
