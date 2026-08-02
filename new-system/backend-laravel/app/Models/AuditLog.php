<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    use HasUlids;

    // AuditLog is append-only — never update rows
    public $timestamps  = false;
    const CREATED_AT    = null;
    const UPDATED_AT    = null;

    protected $fillable = [
        'user_id', 'user_role', 'action_type', 'description',
        'action', 'target_id', 'ip_address', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata'  => 'array',
            'timestamp' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // -------------------------------------------------------------------------
    // Factory method — preferred way to create audit entries
    // -------------------------------------------------------------------------

    /**
     * Record an audit event.
     *
     * @param  string      $actionType   e.g. 'VISIT_CREATE', 'LOGIN', 'EXPORT'
     * @param  string      $description  Human-readable description
     * @param  string|null $targetId     ULID of the affected record
     * @param  array       $metadata     Any extra JSON data
     */
    public static function record(
        string $actionType,
        string $description,
        ?string $targetId = null,
        array $metadata = []
    ): self {
        /** @var \Illuminate\Http\Request $request */
        $request = app(\Illuminate\Http\Request::class);
        $user    = $request->user();

        return static::create([
            'user_id'     => $user?->id,
            'user_role'   => $user?->role,
            'action_type' => $actionType,
            'description' => $description,
            'target_id'   => $targetId,
            'ip_address'  => $request->ip(),
            'metadata'    => $metadata ?: null,
        ]);
    }
}
