<?php

namespace Database\Factories;

use App\Models\Budget;
use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Budget>
 */
class BudgetFactory extends Factory
{
    /**
     * Define the model's default state: an annual budget for the current year.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'department_id' => Department::factory(),
            'year' => now()->year,
            'month' => null,
            'amount' => fake()->randomElement([100_000_000, 150_000_000, 250_000_000]),
            'notes' => null,
            'created_by' => null,
        ];
    }

    public function forMonth(int $month, ?int $year = null): static
    {
        return $this->state(fn (array $attributes) => [
            'year' => $year ?? $attributes['year'],
            'month' => $month,
        ]);
    }
}
