<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case Transportation = 'transportation';
    case Accommodation = 'accommodation';
    case DailyAllowance = 'daily_allowance';
    case Meals = 'meals';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Transportation => __('Transportation'),
            self::Accommodation => __('Accommodation'),
            self::DailyAllowance => __('Daily allowance'),
            self::Meals => __('Meals'),
            self::Other => __('Other'),
        };
    }

    /**
     * A daily allowance is a flat rate, so it is the only category claimed without a receipt.
     */
    public function requiresReceipt(): bool
    {
        return $this !== self::DailyAllowance;
    }

    /**
     * @return list<array{value: string, label: string, requires_receipt: bool}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
                'requires_receipt' => $case->requiresReceipt(),
            ],
            self::cases(),
        );
    }
}
