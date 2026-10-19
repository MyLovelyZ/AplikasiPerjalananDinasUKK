<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The signed-in user's in-app notifications (all roles, web and mobile).
 */
class NotificationController extends Controller
{
    /**
     * Newest first. Send `unread=1` to list only the unread ones.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'unread' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $user = $request->user();

        $notifications = ($request->boolean('unread') ? $user->unreadNotifications() : $user->notifications())
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return NotificationResource::collection($notifications)->additional([
            'meta' => ['unread_count' => $user->unreadNotifications()->count()],
        ]);
    }

    /**
     * How many notifications are unread, for the badge. Cheap enough to poll.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['unread_count' => $request->user()->unreadNotifications()->count()]]);
    }

    /**
     * Mark one notification as read. Another user's notification gives 404.
     */
    public function read(Request $request, string $notification): NotificationResource
    {
        $notification = $request->user()->notifications()->findOrFail($notification);
        $notification->markAsRead();

        return NotificationResource::make($notification);
    }

    /**
     * Mark every unread notification as read.
     */
    public function readAll(Request $request): JsonResponse
    {
        $count = $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json([
            'message' => trans_choice('Marked :count notification as read.|Marked :count notifications as read.', $count),
            'data' => ['unread_count' => 0],
        ]);
    }
}
