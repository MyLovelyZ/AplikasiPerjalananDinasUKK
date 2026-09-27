<?php

namespace App\Http\Controllers\Finance;

use App\Enums\AuditAction;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseCategory;
use App\Enums\ExpenseReportStatus;
use App\Enums\TravelRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Budget;
use App\Models\Department;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\TravelRequest;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * A finance recap for a year or a month, optionally for one department.
     * Returns JSON by default, or a download with `format=pdf` or `format=xlsx`.
     */
    public function index(Request $request): JsonResponse|StreamedResponse
    {
        $filters = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')],
            'format' => ['nullable', Rule::in(['json', 'pdf', 'xlsx'])],
        ]);

        $report = $this->buildReport(
            $filters['year'] ?? now()->year,
            $filters['month'] ?? null,
            isset($filters['department_id']) ? Department::find($filters['department_id']) : null,
        );

        $format = $filters['format'] ?? 'json';

        if ($format !== 'json') {
            AuditLog::record($request, AuditAction::Exported, description: __('Exported the :period finance report as :format.', [
                'period' => $report['period']['label'],
                'format' => Str::upper($format),
            ]));
        }

        return match ($format) {
            'pdf' => $this->pdfDownload($report),
            'xlsx' => $this->spreadsheetDownload($report),
            default => response()->json(['data' => $report]),
        };
    }

    /**
     * Each figure is dated by the event it measures: trips by departure date, spending by the
     * date on the receipt, and disbursements by payment date. A trip in April whose advance was
     * paid in March therefore shows its advance in the March report.
     *
     * Everything is expressed in plain arrays so the same data feeds JSON, PDF, and Excel.
     *
     * @return array<string, mixed>
     */
    private function buildReport(int $year, ?int $month, ?Department $department): array
    {
        $from = $month === null ? Carbon::create($year)->startOfYear() : Carbon::create($year, $month)->startOfMonth();
        $to = $month === null ? $from->copy()->endOfYear() : $from->copy()->endOfMonth();

        $trips = TravelRequest::query()
            ->with(['user', 'department', 'expenseReport'])
            ->whereNotNull('submitted_at')
            ->whereBetween('departure_date', [$from, $to])
            ->when($department, fn (Builder $query, Department $department) => $query->whereBelongsTo($department))
            ->orderBy('departure_date')
            ->orderBy('id')
            ->get();

        $approvedTrips = $trips->filter(
            fn (TravelRequest $trip): bool => in_array($trip->status, TravelRequestStatus::committed(), true),
        );

        // Verified expenses dated inside the period: the money that was really spent.
        $realizedExpenses = Expense::query()
            ->join('expense_reports', 'expense_reports.id', '=', 'expenses.expense_report_id')
            ->join('travel_requests', 'travel_requests.id', '=', 'expense_reports.travel_request_id')
            ->where('expense_reports.status', ExpenseReportStatus::Verified)
            ->whereBetween('expenses.expense_date', [$from, $to])
            ->when($department, fn (Builder $query, Department $department) => $query->where('travel_requests.department_id', $department->id))
            ->get(['expenses.category', 'expenses.expense_date', 'expenses.approved_amount', 'travel_requests.department_id']);

        $paidByType = Disbursement::query()
            ->where('status', DisbursementStatus::Paid)
            ->whereBetween('paid_at', [$from, $to])
            ->when($department, fn (Builder $query, Department $department) => $query->whereHas(
                'travelRequest',
                fn (Builder $query) => $query->whereBelongsTo($department),
            ))
            ->toBase()
            ->selectRaw('type, sum(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $budgets = Budget::query()
            ->withUsage()
            ->with('department')
            ->where('year', $year)
            ->when($month, fn (Builder $query, int $month) => $query->where(
                fn (Builder $query) => $query->where('month', $month)->orWhereNull('month'),
            ))
            ->when($department, fn (Builder $query, Department $department) => $query->whereBelongsTo($department))
            ->get();

        $departments = Department::query()
            ->whereIn('id', $trips->pluck('department_id')
                ->merge($realizedExpenses->pluck('department_id'))
                ->merge($budgets->pluck('department_id'))
                ->unique())
            ->orderBy('name')
            ->get();

        $budgetAmount = $this->sum($budgets, 'amount');
        $budgetCommitted = $this->sum($budgets, 'committed_amount');

        return [
            'period' => [
                'year' => $year,
                'month' => $month,
                'label' => $month === null ? (string) $year : $from->format('F Y'),
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'department' => $department?->only(['id', 'code', 'name']),
            'generated_at' => now()->toIso8601String(),
            'summary' => [
                'trips_submitted' => $trips->count(),
                'trips_approved' => $approvedTrips->count(),
                'estimated_cost' => $this->sum($approvedTrips, 'estimated_cost'),
                'realized_spending' => $this->sum($realizedExpenses, 'approved_amount'),
                'advances_paid' => round((float) ($paidByType[DisbursementType::Advance->value] ?? 0), 2),
                'reimbursements_paid' => round((float) ($paidByType[DisbursementType::Reimbursement->value] ?? 0), 2),
                'refunds_received' => round((float) ($paidByType[DisbursementType::Refund->value] ?? 0), 2),
                'budget_amount' => $budgetAmount,
                'budget_committed' => $budgetCommitted,
                'budget_remaining' => round($budgetAmount - $budgetCommitted, 2),
            ],
            'by_category' => array_map(fn (ExpenseCategory $category): array => [
                'category' => $category->value,
                'label' => $category->label(),
                'total' => $this->sum($realizedExpenses->where('category', $category), 'approved_amount'),
            ], ExpenseCategory::cases()),
            'by_month' => $month !== null ? [] : array_map(fn (int $monthNumber): array => [
                'month' => $monthNumber,
                'label' => Carbon::create($year, $monthNumber)->format('F'),
                'total' => $this->sum(
                    $realizedExpenses->filter(fn (Expense $expense): bool => $expense->expense_date->month === $monthNumber),
                    'approved_amount',
                ),
            ], range(1, 12)),
            'by_department' => $departments->map(fn (Department $row): array => [
                'code' => $row->code,
                'department' => $row->name,
                'trips_approved' => $approvedTrips->where('department_id', $row->id)->count(),
                'estimated_cost' => $this->sum($approvedTrips->where('department_id', $row->id), 'estimated_cost'),
                'realized_spending' => $this->sum($realizedExpenses->where('department_id', $row->id), 'approved_amount'),
                'budget_amount' => $this->sum($budgets->where('department_id', $row->id), 'amount'),
            ])->all(),
            'budgets' => $budgets->map(fn (Budget $budget): array => [
                'department' => $budget->department->name,
                'period' => $budget->period_label,
                'amount' => (float) $budget->amount,
                'committed_amount' => (float) $budget->committed_amount,
                'spent_amount' => (float) $budget->spent_amount,
                'remaining_amount' => round((float) $budget->amount - (float) $budget->committed_amount, 2),
            ])->values()->all(),
            'trips' => $trips->map(fn (TravelRequest $trip): array => [
                'request_number' => $trip->request_number,
                'requester' => $trip->user->name,
                'department' => $trip->department->name,
                'purpose' => $trip->purpose,
                'destination' => $trip->destination,
                'departure_date' => $trip->departure_date->toDateString(),
                'return_date' => $trip->return_date->toDateString(),
                'status' => $trip->status->value,
                'status_label' => $trip->status->label(),
                'estimated_cost' => (float) $trip->estimated_cost,
                'realized_cost' => $trip->expenseReport?->status === ExpenseReportStatus::Verified
                    ? (float) $trip->expenseReport->total_approved
                    : null,
            ])->values()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function pdfDownload(array $report): StreamedResponse
    {
        $options = new Options;
        $options->setDefaultFont('DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view('reports.finance', ['report' => $report])->render());
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $pdf = (string) $dompdf->output();

        return response()->streamDownload(function () use ($pdf): void {
            echo $pdf;
        }, $this->filename($report, 'pdf'), ['Content-Type' => 'application/pdf']);
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function spreadsheetDownload(array $report): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator((string) config('app.name'))
            ->setTitle(__('Finance report :period', ['period' => $report['period']['label']]));

        $summary = $report['summary'];

        $this->fillSheet($spreadsheet->getActiveSheet(), 'Summary', ['Metric', 'Value'], [
            ['Period', $report['period']['label']],
            ['Department', $report['department']['name'] ?? 'All departments'],
            ['Trips submitted', $summary['trips_submitted']],
            ['Trips approved', $summary['trips_approved']],
            ['Estimated cost of approved trips', $summary['estimated_cost']],
            ['Realized spending', $summary['realized_spending']],
            ['Advances paid', $summary['advances_paid']],
            ['Reimbursements paid', $summary['reimbursements_paid']],
            ['Refunds received', $summary['refunds_received']],
            ['Budget allocated', $summary['budget_amount']],
            ['Budget committed', $summary['budget_committed']],
            ['Budget remaining', $summary['budget_remaining']],
        ]);

        $this->fillSheet($spreadsheet->createSheet(), 'Trips', [
            'Number', 'Requester', 'Department', 'Purpose', 'Destination', 'Departure', 'Return', 'Status', 'Estimated cost', 'Realized cost',
        ], array_map(fn (array $trip): array => [
            $trip['request_number'], $trip['requester'], $trip['department'], $trip['purpose'], $trip['destination'],
            $trip['departure_date'], $trip['return_date'], $trip['status_label'], $trip['estimated_cost'], $trip['realized_cost'],
        ], $report['trips']), moneyColumns: [9, 10]);

        $this->fillSheet($spreadsheet->createSheet(), 'By category', ['Category', 'Realized spending'], array_map(
            fn (array $row): array => [$row['label'], $row['total']],
            $report['by_category'],
        ), moneyColumns: [2]);

        if ($report['by_month'] !== []) {
            $this->fillSheet($spreadsheet->createSheet(), 'By month', ['Month', 'Realized spending'], array_map(
                fn (array $row): array => [$row['label'], $row['total']],
                $report['by_month'],
            ), moneyColumns: [2]);
        }

        $this->fillSheet($spreadsheet->createSheet(), 'By department', [
            'Code', 'Department', 'Trips approved', 'Estimated cost', 'Realized spending', 'Budget allocated',
        ], array_map(fn (array $row): array => [
            $row['code'], $row['department'], $row['trips_approved'], $row['estimated_cost'], $row['realized_spending'], $row['budget_amount'],
        ], $report['by_department']), moneyColumns: [4, 5, 6]);

        $this->fillSheet($spreadsheet->createSheet(), 'Budgets', [
            'Department', 'Period', 'Allocated', 'Committed', 'Spent', 'Remaining',
        ], array_map(fn (array $row): array => [
            $row['department'], $row['period'], $row['amount'], $row['committed_amount'], $row['spent_amount'], $row['remaining_amount'],
        ], $report['budgets']), moneyColumns: [3, 4, 5, 6]);

        $spreadsheet->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($spreadsheet): void {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $this->filename($report, 'xlsx'), [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<mixed>>  $rows
     * @param  list<int>  $moneyColumns  1-based indexes of columns holding amounts.
     */
    private function fillSheet(Worksheet $sheet, string $title, array $headers, array $rows, array $moneyColumns = []): void
    {
        $sheet->setTitle($title);
        $sheet->fromArray([$headers, ...$rows], strictNullComparison: true);

        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle("A1:{$lastColumn}1")->getFont()->setBold(true);

        foreach ($moneyColumns as $column) {
            $letter = Coordinate::stringFromColumnIndex($column);
            $sheet->getStyle("{$letter}2:{$letter}".(count($rows) + 1))->getNumberFormat()->setFormatCode('#,##0.00');
        }

        foreach (range(1, count($headers)) as $column) {
            $sheet->getColumnDimensionByColumn($column)->setAutoSize(true);
        }
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function filename(array $report, string $extension): string
    {
        $period = $report['period']['month'] === null
            ? (string) $report['period']['year']
            : sprintf('%d-%02d', $report['period']['year'], $report['period']['month']);

        $department = $report['department'] === null ? '' : '-'.Str::slug($report['department']['code']);

        return "finance-report-{$period}{$department}.{$extension}";
    }

    /**
     * @param  Collection<int, Model>  $models
     */
    private function sum(Collection $models, string $attribute): float
    {
        return round($models->sum(fn (Model $model): float => (float) $model->{$attribute}), 2);
    }
}
