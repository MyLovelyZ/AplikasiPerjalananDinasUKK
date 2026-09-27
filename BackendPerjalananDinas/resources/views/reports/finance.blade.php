@php
    $money = fn (?float $amount): string => $amount === null ? '-' : \Illuminate\Support\Number::currency($amount, in: 'IDR', locale: 'id');
    $summary = $report['summary'];
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ __('Finance report :period', ['period' => $report['period']['label']]) }}</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10px; color: #1f2937; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #d1d5db; }
        .muted { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; border: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; font-weight: bold; }
        td.amount, th.amount { text-align: right; white-space: nowrap; }
        .summary td { width: 25%; border: none; padding: 2px 6px 6px 0; }
        .summary .label { color: #6b7280; font-size: 9px; }
        .summary .value { font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>{{ config('app.name') }} &mdash; {{ __('Finance report :period', ['period' => $report['period']['label']]) }}</h1>
    <div class="muted">
        {{ $report['department']['name'] ?? __('All departments') }}
        &middot; {{ $report['period']['from'] }} &ndash; {{ $report['period']['to'] }}
        &middot; {{ __('Generated :date', ['date' => \Illuminate\Support\Carbon::parse($report['generated_at'])->format('j M Y H:i')]) }}
    </div>

    <h2>{{ __('Summary') }}</h2>
    <table class="summary">
        <tr>
            <td><div class="label">{{ __('Trips approved') }}</div><div class="value">{{ $summary['trips_approved'] }} / {{ $summary['trips_submitted'] }}</div></td>
            <td><div class="label">{{ __('Estimated cost of approved trips') }}</div><div class="value">{{ $money($summary['estimated_cost']) }}</div></td>
            <td><div class="label">{{ __('Realized spending') }}</div><div class="value">{{ $money($summary['realized_spending']) }}</div></td>
            <td><div class="label">{{ __('Budget remaining') }}</div><div class="value">{{ $money($summary['budget_remaining']) }}</div></td>
        </tr>
        <tr>
            <td><div class="label">{{ __('Advances paid') }}</div><div class="value">{{ $money($summary['advances_paid']) }}</div></td>
            <td><div class="label">{{ __('Reimbursements paid') }}</div><div class="value">{{ $money($summary['reimbursements_paid']) }}</div></td>
            <td><div class="label">{{ __('Refunds received') }}</div><div class="value">{{ $money($summary['refunds_received']) }}</div></td>
            <td><div class="label">{{ __('Budget allocated') }}</div><div class="value">{{ $money($summary['budget_amount']) }}</div></td>
        </tr>
    </table>

    <h2>{{ __('Spending by category') }}</h2>
    <table>
        <tr><th>{{ __('Category') }}</th><th class="amount">{{ __('Realized spending') }}</th></tr>
        @foreach ($report['by_category'] as $row)
            <tr><td>{{ $row['label'] }}</td><td class="amount">{{ $money($row['total']) }}</td></tr>
        @endforeach
    </table>

    @if ($report['by_month'] !== [])
        <h2>{{ __('Spending by month') }}</h2>
        <table>
            <tr><th>{{ __('Month') }}</th><th class="amount">{{ __('Realized spending') }}</th></tr>
            @foreach ($report['by_month'] as $row)
                <tr><td>{{ $row['label'] }}</td><td class="amount">{{ $money($row['total']) }}</td></tr>
            @endforeach
        </table>
    @endif

    <h2>{{ __('By department') }}</h2>
    <table>
        <tr>
            <th>{{ __('Department') }}</th>
            <th class="amount">{{ __('Trips approved') }}</th>
            <th class="amount">{{ __('Estimated cost') }}</th>
            <th class="amount">{{ __('Realized spending') }}</th>
            <th class="amount">{{ __('Budget allocated') }}</th>
        </tr>
        @forelse ($report['by_department'] as $row)
            <tr>
                <td>{{ $row['code'] }} &mdash; {{ $row['department'] }}</td>
                <td class="amount">{{ $row['trips_approved'] }}</td>
                <td class="amount">{{ $money($row['estimated_cost']) }}</td>
                <td class="amount">{{ $money($row['realized_spending']) }}</td>
                <td class="amount">{{ $money($row['budget_amount']) }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="muted">{{ __('No data for this period.') }}</td></tr>
        @endforelse
    </table>

    <h2>{{ __('Budgets') }}</h2>
    <table>
        <tr>
            <th>{{ __('Department') }}</th>
            <th>{{ __('Period') }}</th>
            <th class="amount">{{ __('Allocated') }}</th>
            <th class="amount">{{ __('Committed') }}</th>
            <th class="amount">{{ __('Spent') }}</th>
            <th class="amount">{{ __('Remaining') }}</th>
        </tr>
        @forelse ($report['budgets'] as $row)
            <tr>
                <td>{{ $row['department'] }}</td>
                <td>{{ $row['period'] }}</td>
                <td class="amount">{{ $money($row['amount']) }}</td>
                <td class="amount">{{ $money($row['committed_amount']) }}</td>
                <td class="amount">{{ $money($row['spent_amount']) }}</td>
                <td class="amount">{{ $money($row['remaining_amount']) }}</td>
            </tr>
        @empty
            <tr><td colspan="6" class="muted">{{ __('No budget allocated for this period.') }}</td></tr>
        @endforelse
    </table>

    <h2>{{ __('Trips') }}</h2>
    <table>
        <tr>
            <th>{{ __('Number') }}</th>
            <th>{{ __('Requester') }}</th>
            <th>{{ __('Department') }}</th>
            <th>{{ __('Destination') }}</th>
            <th>{{ __('Dates') }}</th>
            <th>{{ __('Status') }}</th>
            <th class="amount">{{ __('Estimated') }}</th>
            <th class="amount">{{ __('Realized') }}</th>
        </tr>
        @forelse ($report['trips'] as $trip)
            <tr>
                <td>{{ $trip['request_number'] }}</td>
                <td>{{ $trip['requester'] }}</td>
                <td>{{ $trip['department'] }}</td>
                <td>{{ $trip['destination'] }}</td>
                <td>{{ $trip['departure_date'] }} &ndash; {{ $trip['return_date'] }}</td>
                <td>{{ $trip['status_label'] }}</td>
                <td class="amount">{{ $money($trip['estimated_cost']) }}</td>
                <td class="amount">{{ $money($trip['realized_cost']) }}</td>
            </tr>
        @empty
            <tr><td colspan="8" class="muted">{{ __('No trips in this period.') }}</td></tr>
        @endforelse
    </table>
</body>
</html>
