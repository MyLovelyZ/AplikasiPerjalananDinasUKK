<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum DisbursementType: string
{
    use HasOptions;

    case Advance = 'advance';
    case Reimbursement = 'reimbursement';
    case Refund = 'refund';

    public function label(): string
    {
        return match ($this) {
            self::Advance => __('Travel advance'),
            self::Reimbursement => __('Reimbursement'),
            self::Refund => __('Refund of excess advance'),
        };
    }
}
