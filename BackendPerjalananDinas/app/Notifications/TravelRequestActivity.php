<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as Notifier;

/**
 * An in-app notification about a step in a travel request's workflow.
 *
 * Sent synchronously to the `database` channel, so no queue worker is needed.
 * Send it after the workflow transaction commits, so a rolled-back step never notifies anyone.
 */
class TravelRequestActivity extends Notification
{
    /**
     * @param  array<string, mixed>  $extra  Event details such as `amount`, `note`, `stage`, `settlement_type`.
     */
    public function __construct(
        public NotificationEvent $event,
        public TravelRequest $travelRequest,
        public ?User $actor = null,
        public array $extra = [],
    ) {}

    /**
     * Notify every active recipient except the person who did the action.
     *
     * @param  iterable<User|null>|User|null  $recipients
     * @param  array<string, mixed>  $extra
     */
    public static function send(
        iterable|User|null $recipients,
        NotificationEvent $event,
        TravelRequest $travelRequest,
        ?User $actor = null,
        array $extra = [],
    ): void {
        $recipients = collect($recipients instanceof User || $recipients === null ? [$recipients] : $recipients)
            ->filter(fn (?User $user): bool => $user !== null
                && $user->is_active
                && ! $user->trashed()
                && $user->id !== $actor?->id)
            ->unique('id')
            ->values();

        if ($recipients->isNotEmpty()) {
            Notifier::send($recipients, new self($event, $travelRequest, $actor, $extra));
        }
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $data = [
            'event' => $this->event->value,
            'travel_request_id' => $this->travelRequest->id,
            'request_number' => $this->travelRequest->request_number,
            'actor_name' => $this->actor?->name,
            ...$this->extra,
        ];

        return [...$data, 'message' => $this->event->message($data)];
    }

    public function databaseType(object $notifiable): string
    {
        return $this->event->value;
    }
}
