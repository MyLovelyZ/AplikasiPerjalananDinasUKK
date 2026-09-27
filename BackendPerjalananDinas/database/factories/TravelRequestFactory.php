<?php

namespace Database\Factories;

use App\Enums\ExpenseCategory;
use App\Enums\Transportation;
use App\Enums\TravelRequestStatus;
use App\Enums\TripType;
use App\Models\CostEstimate;
use App\Models\TravelRequest;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<TravelRequest>
 */
class TravelRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $departureDate = Carbon::instance(fake()->dateTimeBetween('+5 days', '+40 days'))->startOfDay();

        return [
            // Factory numbers start at 5000 so they never collide with numbers the app hands out.
            'request_number' => sprintf('PD-%d-%04d', now()->year, fake()->unique()->numberBetween(5000, 9999)),
            'user_id' => User::factory()->employee(),
            'department_id' => fn (array $attributes) => User::query()->whereKey($attributes['user_id'])->value('department_id'),
            'purpose' => fake()->randomElement([
                'Client meeting and contract negotiation',
                'Regional sales coordination',
                'Branch office system audit',
                'Industry conference attendance',
                'Vendor site inspection',
                'Technical training for branch staff',
            ]),
            'description' => fake()->sentence(12),
            'destination' => fake()->randomElement([
                'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Makassar', 'Denpasar', 'Yogyakarta', 'Semarang', 'Balikpapan',
            ]),
            'trip_type' => TripType::Domestic,
            'transportation' => fake()->randomElement([Transportation::Plane, Transportation::Train, Transportation::OfficeVehicle]),
            'departure_date' => $departureDate,
            'return_date' => $departureDate->copy()->addDays(fake()->numberBetween(0, 4)),
            'estimated_cost' => fake()->randomElement([1_500_000, 2_750_000, 4_200_000, 6_000_000]),
            'advance_requested' => 0,
            'advance_approved' => null,
            'status' => TravelRequestStatus::Draft,
            'notes' => null,
            'submitted_at' => null,
            'completed_at' => null,
        ];
    }

    /**
     * Give the request a cost breakdown whose total matches `estimated_cost`.
     */
    public function withCostEstimates(): static
    {
        return $this->afterCreating(function (TravelRequest $travelRequest) {
            $lodging = round((float) $travelRequest->estimated_cost * 0.4, 2);

            CostEstimate::factory()->for($travelRequest)->create([
                'category' => ExpenseCategory::Transportation,
                'quantity' => 1,
                'unit_price' => (float) $travelRequest->estimated_cost - $lodging,
                'subtotal' => (float) $travelRequest->estimated_cost - $lodging,
            ]);

            CostEstimate::factory()->for($travelRequest)->create([
                'category' => ExpenseCategory::Accommodation,
                'quantity' => 1,
                'unit_price' => $lodging,
                'subtotal' => $lodging,
            ]);
        });
    }

    public function departingOn(CarbonInterface $departureDate, int $days = 1): static
    {
        return $this->state(fn (array $attributes) => [
            'departure_date' => $departureDate->copy()->startOfDay(),
            'return_date' => $departureDate->copy()->startOfDay()->addDays($days - 1),
        ]);
    }

    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TravelRequestStatus::Submitted,
            'submitted_at' => now()->subDay(),
        ]);
    }

    public function supervisorApproved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TravelRequestStatus::SupervisorApproved,
            'submitted_at' => now()->subDays(2),
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TravelRequestStatus::Approved,
            'submitted_at' => now()->subDays(3),
            'advance_approved' => fn (array $attributes) => $attributes['advance_requested'],
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TravelRequestStatus::Rejected,
            'submitted_at' => now()->subDays(2),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TravelRequestStatus::Cancelled,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TravelRequestStatus::Completed,
            'submitted_at' => now()->subDays(10),
            'advance_approved' => fn (array $attributes) => $attributes['advance_requested'],
            'completed_at' => now(),
        ]);
    }
}
