<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum AuditAction: string
{
    use HasOptions;

    case Login = 'login';
    case Logout = 'logout';
    case Created = 'created';
    case Updated = 'updated';
    case Deleted = 'deleted';
    case Submitted = 'submitted';
    case Cancelled = 'cancelled';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Verified = 'verified';
    case Paid = 'paid';
    case Exported = 'exported';

    public function label(): string
    {
        return match ($this) {
            self::Login => __('Signed in'),
            self::Logout => __('Signed out'),
            self::Created => __('Created'),
            self::Updated => __('Updated'),
            self::Deleted => __('Deleted'),
            self::Submitted => __('Submitted'),
            self::Cancelled => __('Cancelled'),
            self::Approved => __('Approved'),
            self::Rejected => __('Rejected'),
            self::Verified => __('Verified'),
            self::Paid => __('Paid'),
            self::Exported => __('Exported'),
        };
    }
}
