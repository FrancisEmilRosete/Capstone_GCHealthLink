<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Message Eloquent Model
 *
 * Represents an in-app message between two users.
 * Access control (Students cannot message Students) is
 * enforced at the controller level.
 *
 * @property string              $id
 * @property string              $sender_id
 * @property string              $recipient_id
 * @property string              $body
 * @property bool                $is_read
 * @property \Carbon\Carbon      $created_at
 * @property \Carbon\Carbon      $updated_at
 * @property-read User           $sender
 * @property-read User           $recipient
 */
class Message extends Model
{
    use HasUlids;

    protected $fillable = [
        'sender_id',
        'recipient_id',
        'body',
        'is_read',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
