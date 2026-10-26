<?php

namespace App\Http\Controllers\Finance;

use App\Enums\AuditAction;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseCategory;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Disbursement;
use App\Models\Expense;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MonthlyComparisonController extends Controller
{
    private const MONEY_FORMAT = '#,##0';

    private const PERCENT_FORMAT = '0.0%';

    /**
     * Spending in one month (the current one by default) against the month before it.
     * Returns JSON by default, or with `format=xlsx` a workbook that also lists every expense of both months.
     *
     * "Spending" means expenses finance has verified, dated by when the money was spent,
     * the same definition the finance dashboard and the finance recap use.
     */
    public function __invoke(Request $request): JsonResponse|StreamedResponse
    {
        $filters = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')],
            'format' => ['nullable', Rule::in(['json', 'xlsx'])],
        ]);

        $month = Carbon::create($filters['year'] ?? now()->year, $filters['month'] ?? now()->month)->startOfMonth();
        $previousMonth = $month->copy()->subMonth();
        $department = isset($filters['department_id']) ? Department::find($filters['department_id']) : null;

        $current = $this->expensesIn($month, $department);
        $previous = $this->expensesIn($previousMonth, $department);

        $report = $this->buildComparison($month, $previousMonth, $department, $current, $previous);

        if (($filters['format'] ?? 'json') === 'xlsx') {
            AuditLog::record($request, AuditAction::Exported, description: __('Exported the :period monthly spending comparison as XLSX.', [
                'period' => $report['period']['label'],
            ]));

            return $this->spreadsheetDownload($report, $current, $previous);
        }

        return response()->json(['data' => $report]);
    }

    /**
     * @param  Collection<int, Expense>  $current
     * @param  Collection<int, Expense>  $previous
     * @return array<string, mixed>
     */
    private function buildComparison(
        CarbonInterface $month,
        CarbonInterface $previousMonth,
        ?Department $department,
        Collection $current,
        Collection $previous,
    ): array {
        $currentTotals = $this->totals($current, $this->paymentsIn($month, $department));
        $previousTotals = $this->totals($previous, $this->paymentsIn($previousMonth, $department));

        $departments = $current->concat($previous)
            ->map(fn (Expense $expense): Department => $expense->expenseReport->travelRequest->department)
            ->unique('id');

        return [
            'period' => $this->period($month),
            'previous_period' => $this->period($previousMonth),
            'department' => $department?->only(['id', 'code', 'name']),
            'generated_at' => now()->toIso8601String(),
            'summary' => collect($currentTotals)
                ->map(fn (float $value, string $metric): array => $this->change($value, $previousTotals[$metric]))
                ->all(),
            // A month still in progress is only fairly compared with last month up to the same day.
            'same_day_last_month' => $month->isSameMonth(now()) ? [
                'day' => now()->day,
                'spending' => $this->sum($previous->filter(fn (Expense $expense): bool => $expense->expense_date->day <= now()->day)),
            ] : null,
            'by_category' => array_map(fn (ExpenseCategory $category): array => [
                'category' => $category->value,
                'label' => $category->label(),
                ...$this->change(
                    $this->sum($current->where('category', $category)),
                    $this->sum($previous->where('category', $category)),
                ),
            ], ExpenseCategory::cases()),
            'by_department' => $departments
                ->map(fn (Department $row): array => [
                    'code' => $row->code,
                    'department' => $row->name,
                    ...$this->change(
                        $this->sum($current->filter(fn (Expense $expense): bool => $expense->expenseReport->travelRequest->department_id === $row->id)),
                        $this->sum($previous->filter(fn (Expense $expense): bool => $expense->expenseReport->travelRequest->department_id === $row->id)),
                    ),
                ])
                ->sortBy([['current', 'desc'], ['department', 'asc']])
                ->values()
                ->all(),
            'largest_expenses' => $this->lines($current->sortByDesc(fn (Expense $expense): float => (float) $expense->approved_amount)->take(10)),
        ];
    }

    /**
     * @return Collection<int, Expense>
     */
    private function expensesIn(CarbonInterface $month, ?Department $department): Collection
    {
        return Expense::query()
            ->realized()
            ->with(['expenseReport.travelRequest.user', 'expenseReport.travelRequest.department'])
            ->whereBetween('expense_date', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
            ->when($department, fn (Builder $query, Department $department) => $query->whereHas(
                'expenseReport.travelRequest',
                fn (Builder $query) => $query->whereBelongsTo($department),
            ))
            ->orderBy('expense_date')
            ->orderBy('id')
            ->get()
            ->toBase();
    }

    /**
     * Money finance paid out or received in the month, by disbursement type.
     *
     * @return Collection<string, string>
     */
    private function paymentsIn(CarbonInterface $month, ?Department $department): Collection
    {
        return Disbursement::query()
            ->where('status', DisbursementStatus::Paid)
            ->whereBetween('paid_at', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
            ->when($department, fn (Builder $query, Department $department) => $query->whereHas(
                'travelRequest',
                fn (Builder $query) => $query->whereBelongsTo($department),
            ))
            ->toBase()
            ->selectRaw('type, sum(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');
    }

    /**
     * @param  Collection<int, Expense>  $expenses
     * @param  Collection<string, string>  $payments
     * @return array{spending: float, claimed: float, expense_count: float, trip_count: float, average_per_trip: float, advances_paid: float, reimbursements_paid: float}
     */
    private function totals(Collection $expenses, Collection $payments): array
    {
        $spending = $this->sum($expenses);
        $tripCount = $expenses->unique(fn (Expense $expense): int => $expense->expenseReport->travel_request_id)->count();

        return [
            'spending' => $spending,
            'claimed' => round($expenses->sum(fn (Expense $expense): float => (float) $expense->amount), 2),
            'expense_count' => (float) $expenses->count(),
            'trip_count' => (float) $tripCount,
            'average_per_trip' => $tripCount > 0 ? round($spending / $tripCount, 2) : 0.0,
            'advances_paid' => round((float) ($payments[DisbursementType::Advance->value] ?? 0), 2),
            'reimbursements_paid' => round((float) ($payments[DisbursementType::Reimbursement->value] ?? 0), 2),
        ];
    }

    /**
     * @return array{current: float, previous: float, change_amount: float, change_percentage: float|null}
     */
    private function change(float $current, float $previous): array
    {
        return [
            'current' => $current,
            'previous' => $previous,
            'change_amount' => round($current - $previous, 2),
            'change_percentage' => $previous > 0 ? round(($current - $previous) / $previous * 100, 1) : null,
        ];
    }

    /**
     * @return array{year: int, month: int, label: string, from: string, to: string}
     */
    private function period(CarbonInterface $month): array
    {
        return [
            'year' => $month->year,
            'month' => $month->month,
            'label' => $month->format('F Y'),
            'from' => $month->copy()->startOfMonth()->toDateString(),
            'to' => $month->copy()->endOfMonth()->toDateString(),
        ];
    }

    /**
     * @param  Collection<int, Expense>  $expenses
     * @return list<array<string, mixed>>
     */
    private function lines(Collection $expenses): array
    {
        return $expenses->map(function (Expense $expense): array {
            $trip = $expense->expenseReport->travelRequest;

            return [
                'id' => $expense->id,
                'expense_date' => $expense->expense_date->toDateString(),
                'request_number' => $trip->request_number,
                'employee' => $trip->user->name,
                'department' => $trip->department->name,
                'destination' => $trip->destination,
                'category' => $expense->category->value,
                'category_label' => $expense->category->label(),
                'description' => $expense->description,
                'amount' => (float) $expense->amount,
                'approved_amount' => (float) $expense->approved_amount,
            ];
        })->values()->all();
    }

    /**
     * @param  Collection<int, Expense>  $expenses
     */
    private function sum(Collection $expenses): float
    {
        return round($expenses->sum(fn (Expense $expense): float => (float) $expense->approved_amount), 2);
    }

    /**
     * @param  array<string, mixed>  $report
     * @param  Collection<int, Expense>  $current
     * @param  Collection<int, Expense>  $previous
     */
    private function spreadsheetDownload(array $report, Collection $current, Collection $previous): StreamedResponse
    {
        $currentLabel = $report['period']['label'];
        $previousLabel = $report['previous_period']['label'];

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator((string) config('app.name'))
            ->setTitle(__('Monthly spending :period', ['period' => $currentLabel]));

        $comparison = $spreadsheet->getActiveSheet()->setTitle('Comparison');
        $comparison->setCellValue('A1', __('Spending in :current compared with :previous', ['current' => $currentLabel, 'previous' => $previousLabel]));
        $comparison->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $comparison->fromArray([
            [__('Department'), $report['department']['name'] ?? __('All departments')],
            [__('Generated at'), now()->format('Y-m-d H:i')],
        ], startCell: 'A2');

        $metricLabels = [
            'spending' => __('Verified spending'),
            'claimed' => __('Amount claimed'),
            'expense_count' => __('Expense lines'),
            'trip_count' => __('Trips with spending'),
            'average_per_trip' => __('Average spending per trip'),
            'advances_paid' => __('Advances paid'),
            'reimbursements_paid' => __('Reimbursements paid'),
        ];

        $lastRow = $this->writeComparisonTable($comparison, 5, __('Metric'), $report, array_map(
            fn (string $metric, string $label): array => ['label' => $label, ...$report['summary'][$metric]],
            array_keys($metricLabels),
            $metricLabels,
        ), withTotal: false);

        if ($report['same_day_last_month'] !== null) {
            $note = $lastRow + 2;
            $comparison->setCellValue("A{$note}", __(':previous up to day :day', ['previous' => $previousLabel, 'day' => $report['same_day_last_month']['day']]));
            $comparison->setCellValue("B{$note}", $report['same_day_last_month']['spending']);
            $comparison->getStyle("B{$note}")->getNumberFormat()->setFormatCode(self::MONEY_FORMAT);
        }

        $this->writeComparisonTable($spreadsheet->createSheet()->setTitle('By category'), 1, __('Category'), $report, $report['by_category']);

        $this->writeComparisonTable($spreadsheet->createSheet()->setTitle('By department'), 1, __('Department'), $report, array_map(
            fn (array $row): array => ['label' => $row['department'], ...$row],
            $report['by_department'],
        ));

        foreach ([[$current, $report['period']], [$previous, $report['previous_period']]] as [$expenses, $period]) {
            $sheet = $spreadsheet->createSheet()->setTitle('Expenses '.Carbon::create($period['year'], $period['month'])->format('M Y'));
            $lastRow = $this->writeTable($sheet, 1, [
                __('Date'), __('Request number'), __('Employee'), __('Department'), __('Destination'),
                __('Category'), __('Description'), __('Claimed'), __('Approved'),
            ], array_map(fn (array $line): array => [
                ExcelDate::PHPToExcel(Carbon::parse($line['expense_date'])), $line['request_number'], $line['employee'], $line['department'],
                $line['destination'], $line['category_label'], $line['description'], $line['amount'], $line['approved_amount'],
            ], $this->lines($expenses)), formats: [1 => 'dd mmm yyyy', 8 => self::MONEY_FORMAT, 9 => self::MONEY_FORMAT], totalColumns: [8, 9]);

            $sheet->setAutoFilter('A1:I'.($lastRow - 1));
            $sheet->freezePane('A2');
        }

        $spreadsheet->setActiveSheetIndex(0);

        $department = $report['department'] === null ? '' : '-'.Str::slug($report['department']['code']);
        $filename = sprintf('monthly-spending-%d-%02d%s.xlsx', $report['period']['year'], $report['period']['month'], $department);

        return response()->streamDownload(function () use ($spreadsheet): void {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Writes a "label, previous month, current month, change, change %" table and returns its last row.
     *
     * @param  array<string, mixed>  $report
     * @param  list<array{label: string, current: float, previous: float, change_amount: float, change_percentage: float|null}>  $rows
     */
    private function writeComparisonTable(Worksheet $sheet, int $headerRow, string $labelHeader, array $report, array $rows, bool $withTotal = true): int
    {
        $lastRow = $this->writeTable(
            $sheet,
            $headerRow,
            [$labelHeader, $report['previous_period']['label'], $report['period']['label'], __('Change'), __('Change (%)')],
            array_map(fn (array $row): array => [
                $row['label'],
                $row['previous'],
                $row['current'],
                $row['change_amount'],
                $row['change_percentage'] === null ? null : $row['change_percentage'] / 100,
            ], $rows),
            formats: [2 => self::MONEY_FORMAT, 3 => self::MONEY_FORMAT, 4 => self::MONEY_FORMAT, 5 => self::PERCENT_FORMAT],
            totalColumns: $withTotal ? [2, 3, 4] : [],
        );

        if ($withTotal) {
            $sheet->setCellValue("E{$lastRow}", "=IF(B{$lastRow}=0,\"\",(C{$lastRow}-B{$lastRow})/B{$lastRow})");
        }

        return $lastRow;
    }

    /**
     * Writes a bold header row followed by the rows and returns the number of the last row written.
     *
     * With `totalColumns`, a bold total row is added. It uses SUBTOTAL so that it sums only the rows
     * a filter leaves visible. Text is always stored as plain text, so an employee's description
     * such as "=1+1" can never run as a formula.
     *
     * @param  list<string>  $headers
     * @param  list<list<string|int|float|null>>  $rows
     * @param  array<int, string>  $formats  1-based column => number format.
     * @param  list<int>  $totalColumns  1-based columns to total.
     */
    private function writeTable(Worksheet $sheet, int $headerRow, array $headers, array $rows, array $formats = [], array $totalColumns = []): int
    {
        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->fromArray($headers, startCell: "A{$headerRow}");
        $sheet->getStyle("A{$headerRow}:{$lastColumn}{$headerRow}")->getFont()->setBold(true);

        foreach ($rows as $offset => $row) {
            foreach (array_values($row) as $index => $value) {
                $cell = Coordinate::stringFromColumnIndex($index + 1).($headerRow + 1 + $offset);

                if (is_string($value)) {
                    $sheet->setCellValueExplicit($cell, $value, DataType::TYPE_STRING);
                } elseif ($value !== null) {
                    $sheet->setCellValue($cell, $value);
                }
            }
        }

        $firstRow = $headerRow + 1;
        $lastRow = $headerRow + count($rows);

        if ($totalColumns !== []) {
            $lastRow++;
            $sheet->setCellValue("A{$lastRow}", __('Total'));

            foreach ($totalColumns as $column) {
                $letter = Coordinate::stringFromColumnIndex($column);
                $sheet->setCellValue("{$letter}{$lastRow}", $rows === [] ? 0 : "=SUBTOTAL(109,{$letter}{$firstRow}:{$letter}".($lastRow - 1).')');
            }

            $sheet->getStyle("A{$lastRow}:{$lastColumn}{$lastRow}")->getFont()->setBold(true);
        }

        foreach ($formats as $column => $format) {
            $letter = Coordinate::stringFromColumnIndex($column);
            $sheet->getStyle("{$letter}{$firstRow}:{$letter}".max($lastRow, $firstRow))->getNumberFormat()->setFormatCode($format);
        }

        foreach (range(1, count($headers)) as $column) {
            $sheet->getColumnDimensionByColumn($column)->setAutoSize(true);
        }

        return $lastRow;
    }
}
