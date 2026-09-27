<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum TravelRequestStatus: string
{
    use HasOptions;

    case Draft = 'draft';
    case Submitted = 'submitted';
    case SupervisorApproved = 'supervisor_approved';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => __('Draft'),
            self::Submitted => __('Waiting for supervisor'),
            self::SupervisorApproved => __('Waiting for finance'),
            self::Approved => __('Approved'),
            self::Rejected => __('Rejected'),
            self::Cancelled => __('Cancelled'),
            self::Completed => __('Completed'),
        };
    }

    public function isEditable(): bool
    {
        return in_array($this, self::editable(), true);
    }

    public function isCancellable(): bool
    {
        return in_array($this, self::cancellable(), true);
    }

    /**
     * Statuses in which the requester may still edit the request: nobody has approved it yet.
     *
     * @return list<self>
     */
    public static function editable(): array
    {
        return [self::Draft, self::Submitted];
    }

    /**
     * Statuses in which the requester may still cancel: finance has not committed any budget yet.
     *
     * @return list<self>
     */
    public static function cancellable(): array
    {
        return [self::Draft, self::Submitted, self::SupervisorApproved];
    }

    /**
     * Statuses that reserve the requester's travel dates.
     *
     * @return list<self>
     */
    public static function active(): array
    {
        return [self::Submitted, self::SupervisorApproved, self::Approved];
    }

    /**
     * Statuses whose estimated cost is committed against a department budget.
     *
     * @return list<self>
     */
    public static function committed(): array
    {
        return [self::Approved, self::Completed];
    }
}
