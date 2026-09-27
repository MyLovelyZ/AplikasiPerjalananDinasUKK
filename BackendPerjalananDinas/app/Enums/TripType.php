<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum TripType: string
{
    use HasOptions;

    case Local = 'local';
    case Domestic = 'domestic';
    case International = 'international';

    public function label(): string
    {
        return match ($this) {
            self::Local => __('Local (within the city)'),
            self::Domestic => __('Domestic (out of town)'),
            self::International => __('International'),
        };
    }
}
