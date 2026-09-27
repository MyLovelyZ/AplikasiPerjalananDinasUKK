<?php

namespace App\Enums;

enum ExpenseReportStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Returned = 'returned';
    case Verified = 'verified';

    public function label(): string
    {
        return match ($this) {
            self::Draft => __('Draft'),
            self::Submitted => __('Waiting for verification'),
            self::Returned => __('Returned for revision'),
            self::Verified => __('Verified'),
        };
    }

    /**
     * The employee may still add or remove expenses.
     */
    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Returned], true);
    }
}
