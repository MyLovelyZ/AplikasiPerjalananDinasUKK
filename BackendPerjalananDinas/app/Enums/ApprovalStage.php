<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum ApprovalStage: string
{
    use HasOptions;

    /** The requester's supervisor approves or rejects the trip. */
    case Supervisor = 'supervisor';

    /** Finance checks the department budget and approves the travel advance. */
    case Finance = 'finance';

    /** Finance verifies the receipts submitted after the trip. */
    case ExpenseReport = 'expense_report';

    public function label(): string
    {
        return match ($this) {
            self::Supervisor => __('Supervisor approval'),
            self::Finance => __('Budget verification'),
            self::ExpenseReport => __('Expense report verification'),
        };
    }
}
