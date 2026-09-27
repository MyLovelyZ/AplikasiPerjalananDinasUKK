<?php

namespace Database\Factories;

use App\Enums\ExpenseCategory;
use App\Enums\ExpenseStatus;
use App\Models\Expense;
use App\Models\ExpenseReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'expense_report_id' => ExpenseReport::factory(),
            'category' => ExpenseCategory::Transportation,
            'expense_date' => now()->subDays(fake()->numberBetween(1, 10))->startOfDay(),
            'description' => fake()->sentence(4),
            'amount' => fake()->randomElement([150_000, 450_000, 1_200_000]),
            'approved_amount' => null,
            'status' => ExpenseStatus::Pending,
            'receipt_path' => 'expense-reports/'.fake()->uuid().'.jpg',
            'receipt_name' => 'receipt.jpg',
            'receipt_mime_type' => 'image/jpeg',
            'receipt_size' => fake()->numberBetween(50_000, 900_000),
        ];
    }

    /**
     * Indicate that finance approved the full claimed amount.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'approved_amount' => fn (array $attributes) => $attributes['amount'],
            'status' => ExpenseStatus::Approved,
        ]);
    }
}
