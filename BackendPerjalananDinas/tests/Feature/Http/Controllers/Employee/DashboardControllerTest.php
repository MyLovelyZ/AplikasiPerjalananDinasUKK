<?php

use App\Models\Disbursement;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it("summarizes the employee's own trips", function () {
    $this->travelTo(now()->setDate(2026, 6, 15)->setTime(10, 0));
    $employee = User::factory()->employee()->create();
    $ongoing = TravelRequest::factory()->for($employee, 'user')->approved()->departingOn(today()->subDay(), 3)->create();
    $upcoming = TravelRequest::factory()->for($employee, 'user')->approved()->departingOn(today()->addDays(4), 2)->create();
    $needsReport = TravelRequest::factory()->for($employee, 'user')->approved()->departingOn(today()->subDays(10), 2)->create();
    $reported = TravelRequest::factory()->for($employee, 'user')->approved()->departingOn(today()->subDays(10), 2)->create();
    ExpenseReport::factory()->for($reported)->submitted()->create();
    TravelRequest::factory()->for($employee, 'user')->create();
    TravelRequest::factory()->approved()->departingOn(today()->addDays(4), 2)->create();
    Disbursement::factory()->for($upcoming)->create(['amount' => 750_000]);
    Sanctum::actingAs($employee);

    $response = $this->getJson('/api/employee/dashboard')->assertOk();

    $response
        ->assertJsonPath('data.current_trip.id', $ongoing->id)
        ->assertJsonCount(1, 'data.upcoming_trips')
        ->assertJsonPath('data.upcoming_trips.0.id', $upcoming->id)
        ->assertJsonCount(1, 'data.expense_reports_due')
        ->assertJsonPath('data.expense_reports_due.0.id', $needsReport->id)
        ->assertJsonPath('data.pending_disbursements.0.amount', 750000)
        ->assertJsonCount(5, 'data.recent_requests');
    expect(collect($response->json('data.requests_by_status'))->pluck('total', 'status')->only(['draft', 'approved'])->all())
        ->toBe(['draft' => 1, 'approved' => 4]);
});
