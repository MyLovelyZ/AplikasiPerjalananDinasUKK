<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum Transportation: string
{
    use HasOptions;

    case Plane = 'plane';
    case Train = 'train';
    case Ship = 'ship';
    case Bus = 'bus';
    case OfficeVehicle = 'office_vehicle';
    case PrivateVehicle = 'private_vehicle';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Plane => __('Plane'),
            self::Train => __('Train'),
            self::Ship => __('Ship'),
            self::Bus => __('Bus'),
            self::OfficeVehicle => __('Office vehicle'),
            self::PrivateVehicle => __('Private vehicle'),
            self::Other => __('Other'),
        };
    }
}
