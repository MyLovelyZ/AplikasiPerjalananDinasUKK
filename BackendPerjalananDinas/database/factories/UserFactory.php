<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_number' => fake()->unique()->numerify('EMP-#####'),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => Role::Employee,
            'position' => fake()->randomElement(['Staff', 'Senior Staff', 'Analyst', 'Officer']),
            'phone' => fake()->numerify('08##########'),
            'department_id' => Department::factory(),
            'supervisor_id' => null,
            'bank_name' => fake()->randomElement(['BCA', 'BNI', 'BRI', 'Mandiri']),
            'bank_account_number' => fake()->numerify('##########'),
            'bank_account_name' => fn (array $attributes) => $attributes['name'],
            'is_active' => true,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::SuperAdmin,
            'position' => 'System Administrator',
            'department_id' => null,
        ]);
    }

    public function supervisor(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::Supervisor,
            'position' => 'Supervisor',
        ]);
    }

    public function finance(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::Finance,
            'position' => 'Finance Manager',
        ]);
    }

    /**
     * An employee who reports to a supervisor from the same department, so they can submit requests.
     */
    public function employee(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::Employee,
            'supervisor_id' => fn (array $attributes) => User::factory()->supervisor()->create([
                'department_id' => $attributes['department_id'],
            ])->id,
        ]);
    }

    /**
     * Make the user report to the given supervisor, in the supervisor's department.
     */
    public function supervisedBy(User $supervisor): static
    {
        return $this->state(fn (array $attributes) => [
            'supervisor_id' => $supervisor->id,
            'department_id' => $supervisor->department_id,
        ]);
    }

    /**
     * Indicate that the account has been deactivated.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
