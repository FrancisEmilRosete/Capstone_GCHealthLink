<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MessageController
 *
 * Handles role-based in-app messaging between clinic users.
 *
 * Access Control Rules:
 *   - Students can ONLY message Clinic Staff (Nurse, Doctor, Dentist).
 *   - Students CANNOT message other Students.
 *   - Clinic Staff can message other Clinic Staff freely (Nurse ↔ Doctor ↔ Dentist).
 *   - Clinic Staff can reply to Students who have messaged them first.
 *   - ADMIN role is excluded from messaging.
 *
 * Routes (registered in routes/api.php under auth:sanctum):
 *   GET  /api/messages/contacts         → contacts()
 *   GET  /api/messages/thread/{userId}  → thread()
 *   POST /api/messages                  → store()
 *   PATCH /api/messages/{id}/read       → markRead()
 *   GET  /api/messages/unread-count     → unreadCount()
 */
class MessageController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/messages/contacts
    // Returns users the current user can initiate or view conversations with.
    //
    //   Student  → all clinic staff (Nurse, Doctor, Dentist)
    //   Staff    → all students who have ever sent them a message
    // -------------------------------------------------------------------------

    public function contacts(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->isStudent()) {
            // Students see all clinic staff they can message
            $contacts = User::where('role', 'CLINIC_STAFF')
                ->whereIn('clinic_staff_type', ['NURSE', 'DOCTOR', 'DENTIST'])
                ->select('id', 'email', 'role', 'clinic_staff_type')
                ->get()
                ->map(fn (User $u) => $this->formatContact($u, $user->id));

            return response()->json([
                'success'  => true,
                'contacts' => $contacts,
            ]);
        }

        if ($user->isClinicStaff()) {
            // Staff see two groups of contacts:
            //   1. All other clinic staff (Nurse, Doctor, Dentist) — can initiate freely
            //   2. Students who have sent them a message — can reply to those

            // Other staff members (excluding self)
            $staffContacts = User::where('role', 'CLINIC_STAFF')
                ->whereIn('clinic_staff_type', ['NURSE', 'DOCTOR', 'DENTIST'])
                ->where('id', '!=', $user->id)
                ->select('id', 'email', 'role', 'clinic_staff_type')
                ->get()
                ->map(fn (User $u) => $this->formatContact($u, $user->id));

            // Students who have messaged this staff member
            $studentIds = Message::where('recipient_id', $user->id)
                ->join('users', 'users.id', '=', 'messages.sender_id')
                ->where('users.role', 'STUDENT')
                ->select('messages.sender_id')
                ->groupBy('messages.sender_id')
                ->orderByRaw('MAX(messages.created_at) DESC')
                ->pluck('sender_id');

            $studentContacts = User::whereIn('id', $studentIds)
                ->select('id', 'email', 'role', 'clinic_staff_type')
                ->get()
                ->map(fn (User $u) => $this->formatContact($u, $user->id));

            // Merge: staff first, then students; sort by unread desc, then name
            $contacts = $staffContacts->concat($studentContacts)
                ->sortByDesc('unread_count')
                ->values();

            return response()->json([
                'success'  => true,
                'contacts' => $contacts,
            ]);
        }

        return response()->json(['error' => 'Messaging is not available for your role.'], 403);
    }

    // -------------------------------------------------------------------------
    // GET /api/messages/thread/{userId}
    // Returns the conversation thread between the authenticated user and {userId}.
    // Automatically marks received messages as read.
    // -------------------------------------------------------------------------

    public function thread(Request $request, string $userId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // Validate the target user exists and is reachable
        $target = User::find($userId);
        if (!$target) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        if (!$this->canCommunicate($user, $target)) {
            return response()->json(['error' => 'You are not allowed to message this user.'], 403);
        }

        // Fetch all messages in both directions between the two users
        $messages = Message::where(function ($q) use ($user, $userId): void {
            $q->where('sender_id', $user->id)->where('recipient_id', $userId);
        })->orWhere(function ($q) use ($user, $userId): void {
            $q->where('sender_id', $userId)->where('recipient_id', $user->id);
        })
        ->orderBy('created_at', 'asc')
        ->get();

        // Mark all unread messages sent TO the current user as read
        Message::where('sender_id', $userId)
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success'  => true,
            'messages' => $messages->map(fn (Message $m) => [
                'id'           => $m->id,
                'sender_id'    => $m->sender_id,
                'recipient_id' => $m->recipient_id,
                'body'         => $m->body,
                'is_read'      => $m->is_read,
                'created_at'   => $m->created_at->toISOString(),
                'is_mine'      => $m->sender_id === $user->id,
            ]),
            'target' => $this->formatContact($target, $user->id),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/messages
    // Sends a new message. Enforces access control at the backend level.
    // Body: { recipient_id: string, body: string }
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'recipient_id' => ['required', 'ulid', 'exists:users,id'],
            'body'         => ['required', 'string', 'max:2000'],
        ]);

        $recipient = User::findOrFail($validated['recipient_id']);

        // Access control: cannot message yourself
        if ($recipient->id === $user->id) {
            return response()->json(['error' => 'You cannot send a message to yourself.'], 422);
        }

        // Access control: students cannot message other students
        if ($user->isStudent() && $recipient->isStudent()) {
            return response()->json([
                'error' => 'Students can only message clinic staff (Nurse, Doctor, or Dentist).',
            ], 403);
        }

        // Access control: students can only message clinic staff (not admin)
        if ($user->isStudent() && !$recipient->isClinicStaff()) {
            return response()->json([
                'error' => 'Students can only message Nurse, Doctor, or Dentist roles.',
            ], 403);
        }

        // Access control: staff can message other staff freely, or reply to students
        if ($user->isClinicStaff()) {
            // Staff → Admin: not allowed
            if ($recipient->isAdmin()) {
                return response()->json([
                    'error' => 'Messaging Admin accounts is not permitted.',
                ], 403);
            }

            // Staff → Student: only allowed if the student has messaged them first
            if ($recipient->isStudent()) {
                $hasExistingMessage = Message::where('sender_id', $recipient->id)
                    ->where('recipient_id', $user->id)
                    ->exists();

                if (!$hasExistingMessage) {
                    return response()->json([
                        'error' => 'You can only reply to students who have messaged you first.',
                    ], 403);
                }
            }

            // Staff → Staff: always allowed (Nurse ↔ Doctor ↔ Dentist)
        }

        $message = Message::create([
            'sender_id'    => $user->id,
            'recipient_id' => $recipient->id,
            'body'         => $validated['body'],
        ]);

        return response()->json([
            'success' => true,
            'message' => [
                'id'           => $message->id,
                'sender_id'    => $message->sender_id,
                'recipient_id' => $message->recipient_id,
                'body'         => $message->body,
                'is_read'      => $message->is_read,
                'created_at'   => $message->created_at->toISOString(),
                'is_mine'      => true,
            ],
        ], 201);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/messages/{id}/read
    // Marks a single message as read (must be the recipient).
    // -------------------------------------------------------------------------

    public function markRead(Request $request, string $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $message = Message::findOrFail($id);

        if ($message->recipient_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        $message->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    // -------------------------------------------------------------------------
    // GET /api/messages/unread-count
    // Returns the total number of unread messages for the current user.
    // -------------------------------------------------------------------------

    public function unreadCount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $count = Message::where('recipient_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'count'   => $count,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Determines if two users are allowed to view a conversation thread together.
     */
    private function canCommunicate(User $userA, User $userB): bool
    {
        // Students can communicate with clinic staff
        if ($userA->isStudent() && $userB->isClinicStaff()) {
            return true;
        }

        // Clinic staff can communicate with students
        if ($userA->isClinicStaff() && $userB->isStudent()) {
            return true;
        }

        // Clinic staff can communicate with other clinic staff (Nurse ↔ Doctor ↔ Dentist)
        if ($userA->isClinicStaff() && $userB->isClinicStaff()) {
            return true;
        }

        return false;
    }

    /**
     * Formats a User model as a contact for the API response.
     * Includes unread message count from that contact to the current user.
     */
    private function formatContact(User $contact, string $currentUserId): array
    {
        $staffType = $contact->clinic_staff_type;

        $label = match ($staffType) {
            'NURSE'   => 'Nurse',
            'DOCTOR'  => 'Doctor',
            'DENTIST' => 'Dentist',
            default   => 'Student',
        };

        $unreadCount = Message::where('sender_id', $contact->id)
            ->where('recipient_id', $currentUserId)
            ->where('is_read', false)
            ->count();

        // Build a display name from email prefix if no profile
        $emailPrefix = explode('@', $contact->email)[0];

        return [
            'id'           => $contact->id,
            'email'        => $contact->email,
            'display_name' => $emailPrefix,
            'role'         => $contact->role,
            'staff_type'   => $staffType,
            'role_label'   => $label,
            'unread_count' => $unreadCount,
        ];
    }
}
