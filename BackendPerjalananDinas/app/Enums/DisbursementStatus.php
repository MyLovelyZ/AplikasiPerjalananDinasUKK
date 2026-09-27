<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum DisbursementStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('Waiting for payment'),
            self::Paid => __('Paid'),
        };
    }
}
