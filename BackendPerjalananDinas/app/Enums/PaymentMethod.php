<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PaymentMethod: string
{
    use HasOptions;

    case Transfer = 'transfer';
    case Cash = 'cash';
    case Payroll = 'payroll';

    public function label(): string
    {
        return match ($this) {
            self::Transfer => __('Bank transfer'),
            self::Cash => __('Cash'),
            self::Payroll => __('Payroll'),
        };
    }
}
