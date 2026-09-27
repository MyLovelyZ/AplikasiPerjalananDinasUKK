<?php

namespace App\Enums;

enum ExpenseStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case PartiallyApproved = 'partially_approved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('Pending'),
            self::Approved => __('Approved'),
            self::PartiallyApproved => __('Partially approved'),
            self::Rejected => __('Rejected'),
        };
    }

    /**
     * Derive the verification result from the claimed and approved amounts.
     */
    public static function fromAmounts(float $claimedAmount, float $approvedAmount): self
    {
        return match (true) {
            $approvedAmount <= 0 => self::Rejected,
            $approvedAmount < $claimedAmount => self::PartiallyApproved,
            default => self::Approved,
        };
    }
}
