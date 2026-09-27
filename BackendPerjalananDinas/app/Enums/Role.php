<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum Role: string
{
    use HasOptions;

    case SuperAdmin = 'super_admin';
    case Supervisor = 'supervisor';
    case Finance = 'finance';
    case Employee = 'employee';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => __('Super Admin'),
            self::Supervisor => __('Supervisor'),
            self::Finance => __('Finance Manager'),
            self::Employee => __('Employee'),
        };
    }
}
