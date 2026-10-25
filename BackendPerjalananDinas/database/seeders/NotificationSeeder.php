<?php

namespace Database\Seeders;

use App\Enums\ApprovalStage;
use App\Enums\NotificationEvent;
use App\Enums\TravelRequestStatus;
use App\Models\TravelRequest;
use App\Models\User;
use App\Notifications\TravelRequestActivity;
use Illuminate\Database\Seeder;

/**
 * Gives the demo accounts the notifications the seeded trips would have sent,
 * so every role's bell has something in it after `migrate:fresh --seed`.
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $finance = User::query()->where('email', 'finance@citramandiri.test')->sole();
        $employee = User::query()->where('email', 'employee@citramandiri.test')->sole();
        $supervisor = $employee->supervisor;

        $trips = $employee->travelRequests()->with('expenseReport')->get()->keyBy(fn (TravelRequest $trip) => $trip->status->value);

        if ($trip = $trips->get(TravelRequestStatus::Submitted->value)) {
            $this->notify($supervisor, NotificationEvent::RequestSubmitted, $trip, $employee);
        }

        if ($trip = $trips->get(TravelRequestStatus::Cancelled->value)) {
            $this->notify($supervisor, NotificationEvent::RequestCancelled, $trip, $employee, read: true);
        }

        if ($trip = $trips->get(TravelRequestStatus::SupervisorApproved->value)) {
            $this->notify($employee, NotificationEvent::RequestSupervisorApproved, $trip, $supervisor, ['stage' => ApprovalStage::Supervisor->value]);
            $this->notify($finance, NotificationEvent::RequestAwaitingFinance, $trip, $supervisor, ['stage' => ApprovalStage::Finance->value]);
        }

        if ($trip = $trips->get(TravelRequestStatus::Rejected->value)) {
            $this->notify($employee, NotificationEvent::RequestRejected, $trip, $supervisor, [
                'stage' => ApprovalStage::Supervisor->value,
                'note' => $trip->approvals()->latest('id')->value('note'),
            ], read: true);
        }

        foreach ($employee->travelRequests()->with('expenseReport')->where('status', TravelRequestStatus::Approved)->get() as $trip) {
            $this->notify($employee, NotificationEvent::RequestApproved, $trip, $finance, [
                'stage' => ApprovalStage::Finance->value,
                'amount' => (float) $trip->advance_approved,
            ], read: $trip->expenseReport !== null);

            if ($trip->financeStage() === ApprovalStage::ExpenseReport) {
                $this->notify($finance, NotificationEvent::ExpenseReportSubmitted, $trip, $employee, [
                    'stage' => ApprovalStage::ExpenseReport->value,
                    'amount' => (float) $trip->expenseReport->expenses()->sum('amount'),
                ]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function notify(?User $recipient, NotificationEvent $event, TravelRequest $trip, ?User $actor, array $extra = [], bool $read = false): void
    {
        if ($recipient === null) {
            return;
        }

        $recipient->notify(new TravelRequestActivity($event, $trip, $actor, $extra));

        if ($read) {
            $recipient->unreadNotifications()
                ->where('type', $event->value)
                ->where('data->travel_request_id', $trip->id)
                ->update(['read_at' => now()]);
        }
    }
}
