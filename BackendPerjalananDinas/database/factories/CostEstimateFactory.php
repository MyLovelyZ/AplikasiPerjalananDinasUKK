<?php

namespace Database\Factories;

use App\Enums\ExpenseCategory;
use App\Models\CostEstimate;
use App\Models\TravelRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CostEstimate>
 */
class CostEstimateFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 3);
        $unitPrice = fake()->randomElement([250_000, 500_000, 750_000]);

        return [
            'travel_request_id' => TravelRequest::factory(),
            'category' => fake()->randomElement(ExpenseCategory::cases()),
            'description' => fake()->sentence(4),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'subtotal' => $quantity * $unitPrice,
        ];
    }
}
