<?php

namespace Database\Factories;

use App\Enums\ExpenseReportStatus;
use App\Enums\SettlementType;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseReport>
 */
class ExpenseReportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'travel_request_id' => TravelRequest::factory()->approved(),
            'summary' => fake()->paragraph(),
            'status' => ExpenseReportStatus::Draft,
        ];
    }

    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ExpenseReportStatus::Submitted,
            'submitted_at' => now()->subDay(),
        ]);
    }

    public function returned(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ExpenseReportStatus::Returned,
            'submitted_at' => now()->subDays(2),
            'verification_note' => 'Please attach a readable hotel receipt.',
        ]);
    }

    /**
     * A verified report whose verified total equals the advance, so nothing is left to settle.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ExpenseReportStatus::Verified,
            'submitted_at' => now()->subDays(2),
            'verified_at' => now()->subDay(),
            'total_approved' => 0,
            'advance_amount' => 0,
            'difference' => 0,
            'settlement_type' => SettlementType::None,
        ]);
    }
}
