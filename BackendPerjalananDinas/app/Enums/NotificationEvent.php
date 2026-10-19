<?php

namespace App\Enums;

use Illuminate\Support\Number;

/**
 * What happened to a travel request, told to the person who has to act on it next.
 */
enum NotificationEvent: string
{
    /** To the supervisor: a team member submitted a request. */
    case RequestSubmitted = 'request_submitted';

    /** To the supervisor: a team member cancelled a request that was still in the approval flow. */
    case RequestCancelled = 'request_cancelled';

    /** To the employee: the supervisor approved the request and forwarded it to finance. */
    case RequestSupervisorApproved = 'request_supervisor_approved';

    /** To finance: a request is waiting for the budget check. */
    case RequestAwaitingFinance = 'request_awaiting_finance';

    /** To the employee: finance verified the budget, so the trip is approved. */
    case RequestApproved = 'request_approved';

    /** To the employee: the supervisor or finance rejected the request. */
    case RequestRejected = 'request_rejected';

    /** To finance: an expense report is waiting for verification. */
    case ExpenseReportSubmitted = 'expense_report_submitted';

    /** To the employee: finance returned the expense report for revision. */
    case ExpenseReportReturned = 'expense_report_returned';

    /** To the employee: finance verified the expense report. */
    case ExpenseReportVerified = 'expense_report_verified';

    /** To the employee: finance recorded a disbursement of the trip as paid. */
    case DisbursementPaid = 'disbursement_paid';

    /**
     * A one-line English summary. Clients may build their own text from the other data fields.
     *
     * @param  array<string, mixed>  $data
     */
    public function message(array $data): string
    {
        $replace = [
            'number' => $data['request_number'],
            'actor' => $data['actor_name'] ?? __('Someone'),
            'amount' => Number::currency((float) ($data['amount'] ?? 0), in: 'IDR', locale: 'id'),
        ];

        return match ($this) {
            self::RequestSubmitted => __(':actor submitted travel request :number for your approval.', $replace),
            self::RequestCancelled => __(':actor cancelled travel request :number.', $replace),
            self::RequestSupervisorApproved => __(':actor approved travel request :number. It is now waiting for finance.', $replace),
            self::RequestAwaitingFinance => __('Travel request :number is waiting for budget verification.', $replace),
            self::RequestApproved => ($data['amount'] ?? 0) > 0
                ? __('Travel request :number is approved with an advance of :amount.', $replace)
                : __('Travel request :number is approved.', $replace),
            self::RequestRejected => __(':actor rejected travel request :number.', $replace),
            self::ExpenseReportSubmitted => __('The expense report of travel request :number is waiting for verification.', $replace),
            self::ExpenseReportReturned => __('The expense report of travel request :number was returned for revision.', $replace),
            self::ExpenseReportVerified => match (SettlementType::tryFrom($data['settlement_type'] ?? '')) {
                SettlementType::Reimbursement => __('The expense report of travel request :number is verified. A reimbursement of :amount will be paid to you.', $replace),
                SettlementType::Refund => __('The expense report of travel request :number is verified. Please return :amount of unused advance.', $replace),
                default => __('The expense report of travel request :number is verified.', $replace),
            },
            self::DisbursementPaid => ($data['disbursement_type'] ?? null) === DisbursementType::Refund->value
                ? __('Finance received your refund of :amount for travel request :number.', $replace)
                : __('Finance paid :amount for travel request :number.', $replace),
        };
    }
}
