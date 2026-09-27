<?php

use App\Enums\ExpenseReportStatus;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

describe('index', function () {
    it('returns the expense report, the advance paid, and whether it can still be changed', function () {
        $travelRequest = TravelRequest::factory()->approved()->create();
        Disbursement::factory()->for($travelRequest)->paid()->create(['amount' => 1_500_000]);
        $expenseReport = ExpenseReport::factory()->for($travelRequest)->create();
        Expense::factory()->for($expenseReport)->create(['amount' => 400_000]);
        Sanctum::actingAs($travelRequest->user);

        $this->getJson("/api/employee/requests/{$travelRequest->id}/expenses")
            ->assertOk()
            ->assertJsonPath('data.can_manage', true)
            ->assertJsonPath('data.advance_paid', 1500000)
            ->assertJsonPath('data.travel_request.expense_report.total_claimed', 400000)
            ->assertJsonCount(1, 'data.travel_request.expense_report.expenses');
    });

    it("returns 404 for another employee's trip", function () {
        $travelRequest = TravelRequest::factory()->approved()->create();
        Sanctum::actingAs(User::factory()->employee()->create());

        $this->getJson("/api/employee/requests/{$travelRequest->id}/expenses")->assertNotFound();
    });
});

describe('store', function () {
    it('starts a draft report with expenses and stores their receipts privately', function () {
        Storage::fake('local');
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(3), 2)->create();
        Sanctum::actingAs($travelRequest->user);

        $response = $this->post("/api/employee/requests/{$travelRequest->id}/expenses", [
            'expenses' => [
                [
                    'category' => 'transportation',
                    'expense_date' => today()->subDays(3)->toDateString(),
                    'description' => 'Return flight',
                    'amount' => 1_800_000,
                    'receipt' => UploadedFile::fake()->image('ticket.jpg'),
                ],
                [
                    'category' => 'daily_allowance',
                    'expense_date' => today()->subDays(2)->toDateString(),
                    'description' => 'Daily allowance, 2 days',
                    'amount' => 300_000,
                ],
            ],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total_claimed', 2100000)
            ->assertJsonPath('data.expenses.1.receipt', null)
            ->assertJsonPath('message', 'Expenses saved.');
        $receiptPath = Expense::query()->where('category', 'transportation')->value('receipt_path');
        Storage::disk('local')->assertExists($receiptPath);
        expect($response->json('data.expenses.0.receipt.url'))->toBeString();
    });

    it('requires a receipt for every category except the daily allowance', function () {
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(3), 2)->create();
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", [
            'expenses' => [[
                'category' => 'accommodation',
                'expense_date' => today()->subDays(3)->toDateString(),
                'description' => 'Hotel',
                'amount' => 900_000,
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'expenses.0.receipt' => 'A receipt is required for accommodation expenses.',
        ]);

        expect(Expense::query()->count())->toBe(0);
    });

    it('submits the report to finance', function () {
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(3), 2)->create();
        $expenseReport = ExpenseReport::factory()->for($travelRequest)->returned()->create(['summary' => null]);
        Expense::factory()->for($expenseReport)->create();
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", [
            'summary' => 'Met the client and signed the contract.',
            'submit' => true,
        ])->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.verification_note', null)
            ->assertJsonPath('message', 'Expense report submitted to finance for verification.');

        expect($expenseReport->fresh())
            ->status->toBe(ExpenseReportStatus::Submitted)
            ->summary->toBe('Met the client and signed the contract.')
            ->submitted_at->not->toBeNull();
    });

    it('refuses to submit a report without expenses or a summary', function () {
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->subDays(3), 2)->create();
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", ['submit' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'summary' => 'Write a short summary of the trip before submitting the report.',
                'expenses' => 'Add at least one expense before submitting the report.',
            ]);
    });

    it('refuses to submit before the trip has started', function () {
        $travelRequest = TravelRequest::factory()->approved()->departingOn(today()->addDays(5), 2)->create();
        $expenseReport = ExpenseReport::factory()->for($travelRequest)->create();
        Expense::factory()->for($expenseReport)->create();
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", ['submit' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['submit' => 'The expense report can be submitted once the trip has started.']);
    });

    it('returns 422 when the travel request is not approved', function () {
        $travelRequest = TravelRequest::factory()->submitted()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", ['summary' => 'Too early'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Expenses can only be filed for approved travel requests.']);

        expect(ExpenseReport::query()->count())->toBe(0);
    });

    it('returns 422 when the report is already waiting for verification', function () {
        $travelRequest = TravelRequest::factory()->approved()->create();
        ExpenseReport::factory()->for($travelRequest)->submitted()->create();
        Sanctum::actingAs($travelRequest->user);

        $this->postJson("/api/employee/requests/{$travelRequest->id}/expenses", ['summary' => 'Changed my mind'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'The expense report is "Waiting for verification" and can no longer be changed.']);
    });
});

describe('destroy', function () {
    it('removes an expense and its receipt', function () {
        Storage::fake('local');
        Storage::disk('local')->put('expense-reports/receipt.jpg', 'image');
        $travelRequest = TravelRequest::factory()->approved()->create();
        $expense = Expense::factory()
            ->for(ExpenseReport::factory()->for($travelRequest))
            ->create(['receipt_path' => 'expense-reports/receipt.jpg']);
        Sanctum::actingAs($travelRequest->user);

        $this->deleteJson("/api/employee/requests/{$travelRequest->id}/expenses/{$expense->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Expense removed.');

        $this->assertModelMissing($expense);
        Storage::disk('local')->assertMissing('expense-reports/receipt.jpg');
    });

    it("returns 404 for an expense that belongs to another of the employee's trips", function () {
        $employee = User::factory()->employee()->create();
        $travelRequest = TravelRequest::factory()->for($employee, 'user')->approved()->create();
        $otherTrip = TravelRequest::factory()->for($employee, 'user')->approved()->create();
        $expense = Expense::factory()->for(ExpenseReport::factory()->for($otherTrip))->create();
        Sanctum::actingAs($employee);

        $this->deleteJson("/api/employee/requests/{$travelRequest->id}/expenses/{$expense->id}")->assertNotFound();

        $this->assertModelExists($expense);
    });

    it('returns 422 when the report is already waiting for verification', function () {
        $travelRequest = TravelRequest::factory()->approved()->create();
        $expense = Expense::factory()->for(ExpenseReport::factory()->for($travelRequest)->submitted())->create();
        Sanctum::actingAs($travelRequest->user);

        $this->deleteJson("/api/employee/requests/{$travelRequest->id}/expenses/{$expense->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrorFor('status');

        $this->assertModelExists($expense);
    });
});
