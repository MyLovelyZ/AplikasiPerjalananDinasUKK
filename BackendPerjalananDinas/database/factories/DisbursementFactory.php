<?php

namespace Database\Factories;

use App\Enums\DisbursementStatus;
use App\Enums\DisbursementType;
use App\Enums\PaymentMethod;
use App\Models\Disbursement;
use App\Models\TravelRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Disbursement>
 */
class DisbursementFactory extends Factory
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
            'type' => DisbursementType::Advance,
            'amount' => fake()->randomElement([500_000, 1_000_000, 2_000_000]),
            'status' => DisbursementStatus::Pending,
            'method' => null,
            'bank_name' => 'BCA',
            'bank_account_number' => fake()->numerify('##########'),
            'bank_account_name' => fake()->name(),
        ];
    }

    public function reimbursement(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => DisbursementType::Reimbursement,
        ]);
    }

    public function refund(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => DisbursementType::Refund,
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DisbursementStatus::Paid,
            'method' => PaymentMethod::Transfer,
            'reference_number' => fake()->bothify('TRF-########'),
            'paid_at' => now()->subDay(),
        ]);
    }
}
