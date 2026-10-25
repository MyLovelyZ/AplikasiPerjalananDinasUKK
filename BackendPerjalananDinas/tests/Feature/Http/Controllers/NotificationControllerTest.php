<?php

use App\Enums\NotificationEvent;
use App\Models\TravelRequest;
use App\Models\User;
use App\Notifications\TravelRequestActivity;
use Laravel\Sanctum\Sanctum;

function notifyUser(User $user, NotificationEvent $event = NotificationEvent::RequestApproved): TravelRequest
{
    $travelRequest = TravelRequest::factory()->create();
    $user->notify(new TravelRequestActivity($event, $travelRequest));

    return $travelRequest;
}

describe('index', function () {
    it("lists the user's notifications newest first with the unread count", function () {
        $user = User::factory()->employee()->create();
        notifyUser($user);
        $this->travel(1)->minutes();
        $newest = notifyUser($user, NotificationEvent::DisbursementPaid);
        $user->notifications()->latest()->first()->markAsRead();
        notifyUser(User::factory()->employee()->create());
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.event', 'disbursement_paid')
            ->assertJsonPath('data.0.travel_request_id', $newest->id)
            ->assertJsonPath('data.0.is_read', true)
            ->assertJsonPath('data.1.is_read', false)
            ->assertJsonPath('meta.unread_count', 1);
    });

    it('lists only unread notifications', function () {
        $user = User::factory()->supervisor()->create();
        notifyUser($user);
        notifyUser($user);
        $user->notifications()->first()->markAsRead();
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_read', false);
    });

    it('requires authentication', function () {
        $this->getJson('/api/notifications')->assertUnauthorized();
    });
});

describe('unread count', function () {
    it('counts only unread notifications', function () {
        $user = User::factory()->finance()->create();
        notifyUser($user);
        notifyUser($user);
        notifyUser($user);
        $user->notifications()->first()->markAsRead();
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 2);
    });
});

describe('read', function () {
    it('marks one notification as read', function () {
        $user = User::factory()->employee()->create();
        notifyUser($user);
        $notification = $user->notifications()->sole();
        Sanctum::actingAs($user);

        $this->postJson("/api/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.id', $notification->id)
            ->assertJsonPath('data.is_read', true);

        expect($notification->fresh()->read_at)->not->toBeNull();
    });

    it("returns 404 for another user's notification", function () {
        $owner = User::factory()->employee()->create();
        notifyUser($owner);
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->postJson("/api/notifications/{$owner->notifications()->sole()->id}/read")->assertNotFound();

        expect($owner->unreadNotifications()->count())->toBe(1);
    });
});

describe('read all', function () {
    it("marks all of the user's notifications as read and leaves others alone", function () {
        $user = User::factory()->employee()->create();
        $other = User::factory()->employee()->create();
        notifyUser($user);
        notifyUser($user);
        notifyUser($other);
        Sanctum::actingAs($user);

        $this->postJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0)
            ->assertJsonPath('message', 'Marked 2 notifications as read.');

        expect($user->unreadNotifications()->count())->toBe(0)
            ->and($other->unreadNotifications()->count())->toBe(1);
    });
});
