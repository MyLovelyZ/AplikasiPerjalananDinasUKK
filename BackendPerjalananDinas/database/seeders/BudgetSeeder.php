<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Budget;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

class BudgetSeeder extends Seeder
{
    /**
     * An annual budget for every department this year, plus one monthly budget to show
     * that a monthly allocation takes precedence over the annual one for its month.
     */
    public function run(): void
    {
        $financeManager = User::query()->where('role', Role::Finance)->firstOrFail();
        $annualAmounts = ['IT' => 250_000_000, 'FIN' => 100_000_000, 'HR' => 120_000_000, 'MKT' => 300_000_000, 'OPS' => 200_000_000];

        foreach (Department::query()->get() as $department) {
            Budget::factory()->for($department)->create([
                'year' => now()->year,
                'amount' => $annualAmounts[$department->code] ?? 150_000_000,
                'notes' => 'Annual business travel budget.',
                'created_by' => $financeManager->id,
            ]);
        }

        Budget::factory()
            ->for(Department::query()->where('code', 'MKT')->firstOrFail())
            ->forMonth(now()->month, now()->year)
            ->create([
                'amount' => 50_000_000,
                'notes' => 'Extra allocation for the product launch campaign.',
                'created_by' => $financeManager->id,
            ]);
    }
}
