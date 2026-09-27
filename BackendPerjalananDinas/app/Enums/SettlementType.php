<?php

namespace App\Enums;

enum SettlementType: string
{
    /** The verified expenses exceed the advance, so the company pays the difference. */
    case Reimbursement = 'reimbursement';

    /** The advance exceeds the verified expenses, so the employee returns the difference. */
    case Refund = 'refund';

    /** The advance matches the verified expenses exactly. */
    case None = 'none';

    public function label(): string
    {
        return match ($this) {
            self::Reimbursement => __('Company pays the employee'),
            self::Refund => __('Employee returns the excess advance'),
            self::None => __('Nothing to settle'),
        };
    }

    /**
     * @param  float  $difference  Verified expenses minus the advance already paid.
     */
    public static function fromDifference(float $difference): self
    {
        return match (true) {
            $difference > 0 => self::Reimbursement,
            $difference < 0 => self::Refund,
            default => self::None,
        };
    }
}
