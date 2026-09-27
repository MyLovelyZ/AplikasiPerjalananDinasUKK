<?php

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\ExpenseReportStatus;
use App\Enums\ExpenseStatus;
use App\Enums\SettlementType;
use App\Enums\TravelRequestStatus;
use App\Models\Budget;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * A trip back from travel whose employee received a paid advance and filed two expenses.
 */
function tripWithSubmittedReport(int $advancePaid, array $expenseAmounts): TravelRequest
{
    $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(6), 2)->create([
        'estimated_cost' => 5_000_000,
        'advance_requested' => $advancePaid,
        'advance_approved' => $advancePaid,
    ]);

    if ($advancePaid > 0) {
        Disbursement::factory()->for($travelRequest)->paid()->create(['amount' => $advancePaid]);
    }

    $expenseReport = ExpenseReport::factory()->for($travelRequest)->submitted()->create();

    foreach ($expenseAmounts as $amount) {
        Expense::factory()->for($expenseReport)->create(['amount' => $amount]);
    }

    return $travelRequest;
}

describe('index', function () {
    it('lists requests waiting for budget or expense report verification, soonest departure first', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $budgetStage = TravelRequest::factory()->supervisorApproved()->departingOn(today()->addDays(9))->create();
        $reportStage = tripWithSubmittedReport(1_000_000, [800_000]);
        TravelRequest::factory()->submitted()->create();
        TravelRequest::factory()->approved()->create();

        $this->getJson('/api/finance/approvals')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $reportStage->id)
            ->assertJsonPath('data.0.finance_stage', 'expense_report')
            ->assertJsonPath('data.1.id', $budgetStage->id)
            ->assertJsonPath('data.1.finance_stage', 'finance');
    });

    it('filters by stage', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $budgetStage = TravelRequest::factory()->supervisorApproved()->create();
        tripWithSubmittedReport(1_000_000, [800_000]);

        $this->getJson('/api/finance/approvals?stage=finance')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $budgetStage->id);
    });
});

describe('show', function () {
    it('shows which budget the trip would be charged to and whether enough is left', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create(['estimated_cost' => 3_000_000]);
        $budget = Budget::factory()->create([
            'department_id' => $travelRequest->department_id,
            'year' => $travelRequest->departure_date->year,
            'amount' => 10_000_000,
        ]);
        TravelRequest::factory()->approved()->create([
            'department_id' => $travelRequest->department_id,
            'budget_id' => $budget->id,
            'estimated_cost' => 4_000_000,
        ]);

        $this->getJson("/api/finance/approvals/{$travelRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $travelRequest->id)
            ->assertJsonPath('budget_check.budget.id', $budget->id)
            ->assertJsonPath('budget_check.remaining_amount', 6000000)
            ->assertJsonPath('budget_check.required_amount', 3000000)
            ->assertJsonPath('budget_check.is_sufficient', true);
    });

    it('reports when the department has no budget for the period', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();

        $this->getJson("/api/finance/approvals/{$travelRequest->id}")
            ->assertOk()
            ->assertJsonPath('budget_check.budget', null)
            ->assertJsonPath('budget_check.is_sufficient', false);
    });

    it('returns 404 for a draft', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->create();

        $this->getJson("/api/finance/approvals/{$travelRequest->id}")->assertNotFound();
    });
});

describe('verify at the budget stage', function () {
    it('approves the trip, charges the budget, and creates the advance disbursement', function () {
        $finance = User::factory()->finance()->create();
        Sanctum::actingAs($finance);
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create([
            'estimated_cost' => 3_000_000,
            'advance_requested' => 1_000_000,
        ]);
        $budget = Budget::factory()->create([
            'department_id' => $travelRequest->department_id,
            'year' => $travelRequest->departure_date->year,
            'amount' => 10_000_000,
        ]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.budget.id', $budget->id)
            ->assertJsonPath('data.advance_approved', 1000000)
            ->assertJsonPath('data.disbursements.0.type', 'advance');

        expect($travelRequest->fresh())
            ->status->toBe(TravelRequestStatus::Approved)
            ->budget_id->toBe($budget->id);
        $disbursement = Disbursement::query()->sole();
        expect($disbursement)
            ->type->toBe(DisbursementType::Advance)
            ->status->toBe(DisbursementStatus::Pending)
            ->amount->toBe('1000000.00')
            ->bank_account_number->toBe($travelRequest->user->bank_account_number);
        $this->assertDatabaseHas('approvals', [
            'travel_request_id' => $travelRequest->id,
            'approver_id' => $finance->id,
            'stage' => ApprovalStage::Finance->value,
            'decision' => ApprovalDecision::Approved->value,
        ]);
        expect($budget->committedAmount())->toBe(3000000.0);
    });

    it('lets finance approve a smaller advance than requested', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create(['estimated_cost' => 3_000_000, 'advance_requested' => 2_000_000]);
        Budget::factory()->create(['department_id' => $travelRequest->department_id, 'year' => $travelRequest->departure_date->year]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify", ['advance_approved' => 500_000])->assertOk();

        expect(Disbursement::query()->sole()->amount)->toBe('500000.00');
    });

    it('creates no disbursement when no advance is approved', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create(['advance_requested' => 1_000_000]);
        Budget::factory()->create(['department_id' => $travelRequest->department_id, 'year' => $travelRequest->departure_date->year]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify", ['advance_approved' => 0])
            ->assertOk()
            ->assertJsonPath('message', 'Travel request approved and its cost committed to the budget.');

        expect(Disbursement::query()->count())->toBe(0);
    });

    it('charges the monthly budget ahead of the annual one', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();
        $departure = $travelRequest->departure_date;
        Budget::factory()->create(['department_id' => $travelRequest->department_id, 'year' => $departure->year]);
        $monthly = Budget::factory()->forMonth($departure->month, $departure->year)->create(['department_id' => $travelRequest->department_id]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")->assertOk();

        expect($travelRequest->fresh()->budget_id)->toBe($monthly->id);
    });

    it('returns 422 when the budget has too little left', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create(['estimated_cost' => 3_000_000]);
        $budget = Budget::factory()->create([
            'department_id' => $travelRequest->department_id,
            'year' => $travelRequest->departure_date->year,
            'amount' => 5_000_000,
        ]);
        TravelRequest::factory()->completed()->create([
            'department_id' => $travelRequest->department_id,
            'budget_id' => $budget->id,
            'estimated_cost' => 2_500_000,
        ]);

        $response = $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify");

        $response->assertUnprocessable()->assertJsonValidationErrorFor('budget');
        expect($response->json('errors.budget.0'))->toContain('this trip needs');
        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::SupervisorApproved);
        expect(Disbursement::query()->count())->toBe(0);
    });

    it('returns 422 when no budget is allocated', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();

        $response = $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify");

        $response->assertUnprocessable()->assertJsonValidationErrorFor('budget');
        expect($response->json('errors.budget.0'))->toStartWith('No budget has been allocated to');
    });

    it('rejects an approved advance above the estimated cost', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create(['estimated_cost' => 3_000_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify", ['advance_approved' => 3_500_000])
            ->assertUnprocessable()
            ->assertJsonValidationErrorFor('advance_approved');
    });
});

describe('verify at the expense report stage', function () {
    it('creates a reimbursement when the verified expenses exceed the advance', function () {
        $finance = User::factory()->finance()->create();
        Sanctum::actingAs($finance);
        $travelRequest = tripWithSubmittedReport(1_000_000, [800_000, 700_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.expense_report.status', 'verified')
            ->assertJsonPath('data.expense_report.total_approved', 1500000)
            ->assertJsonPath('data.expense_report.difference', 500000)
            ->assertJsonPath('data.expense_report.settlement_type', 'reimbursement');

        expect(ExpenseReport::query()->sole())
            ->verified_by->toBe($finance->id)
            ->advance_amount->toBe('1000000.00');
        expect(Disbursement::query()->where('type', DisbursementType::Reimbursement)->sole()->amount)->toBe('500000.00');
        expect($travelRequest->fresh()->status)->toBe(TravelRequestStatus::Approved);
    });

    it('creates a refund when the advance exceeds the verified expenses', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = tripWithSubmittedReport(2_000_000, [800_000, 700_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.expense_report.difference', -500000)
            ->assertJsonPath('data.expense_report.settlement_type', 'refund');

        expect(Disbursement::query()->where('type', DisbursementType::Refund)->sole()->amount)->toBe('500000.00');
    });

    it('completes the trip when nothing is left to settle', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = tripWithSubmittedReport(1_500_000, [800_000, 700_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('message', 'Expense report verified. Nothing is left to settle, so the trip is complete.');

        expect(ExpenseReport::query()->sole()->settlement_type)->toBe(SettlementType::None);
        expect($travelRequest->fresh()->completed_at)->not->toBeNull();
    });

    it('approves part of an expense and the rest in full', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = tripWithSubmittedReport(0, [800_000, 700_000]);
        [$partial, $untouched] = Expense::query()->orderBy('id')->get()->all();

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify", [
            'expenses' => [['id' => $partial->id, 'approved_amount' => 600_000, 'note' => 'Minibar is not covered.']],
        ])->assertOk()->assertJsonPath('data.expense_report.total_approved', 1300000);

        expect($partial->fresh())
            ->status->toBe(ExpenseStatus::PartiallyApproved)
            ->approved_amount->toBe('600000.00')
            ->verification_note->toBe('Minibar is not covered.');
        expect($untouched->fresh())->status->toBe(ExpenseStatus::Approved)->approved_amount->toBe('700000.00');
        expect(Disbursement::query()->sole())->type->toBe(DisbursementType::Reimbursement)->amount->toBe('1300000.00');
    });

    it('rejects an approved amount above the claimed amount', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = tripWithSubmittedReport(0, [800_000]);
        $expense = Expense::query()->sole();

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify", [
            'expenses' => [['id' => $expense->id, 'approved_amount' => 900_000]],
        ])->assertUnprocessable()->assertJsonValidationErrorFor('expenses.0.approved_amount');

        expect(ExpenseReport::query()->sole()->status)->toBe(ExpenseReportStatus::Submitted);
    });

    it('returns 422 while the advance has not been paid', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = tripWithSubmittedReport(0, [800_000]);
        Disbursement::factory()->for($travelRequest)->create(['amount' => 500_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/verify")
            ->assertUnprocessable()
            ->assertJsonValidationErrorFor('disbursements');

        expect(ExpenseReport::query()->sole()->status)->toBe(ExpenseReportStatus::Submitted);
    });
});

describe('reject', function () {
    it('rejects a request at budget verification', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->supervisorApproved()->create();

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/reject", ['note' => 'Budget is reserved for Q4 events.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('message', 'Travel request rejected.');

        $this->assertDatabaseHas('approvals', [
            'travel_request_id' => $travelRequest->id,
            'stage' => ApprovalStage::Finance->value,
            'decision' => ApprovalDecision::Rejected->value,
        ]);
    });

    it('returns the expense report to the employee for revision', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = tripWithSubmittedReport(1_000_000, [800_000]);

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/reject", ['note' => 'The hotel receipt is unreadable.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.expense_report.status', 'returned')
            ->assertJsonPath('data.expense_report.verification_note', 'The hotel receipt is unreadable.');

        expect(Disbursement::query()->where('type', '!=', DisbursementType::Advance)->count())->toBe(0);
    });

    it('returns 422 for a request finance is not reviewing', function () {
        Sanctum::actingAs(User::factory()->finance()->create());
        $travelRequest = TravelRequest::factory()->submitted()->create();

        $this->postJson("/api/finance/approvals/{$travelRequest->id}/reject", ['note' => 'Not ours to decide.'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'This travel request is not waiting for finance verification.']);
    });
});
