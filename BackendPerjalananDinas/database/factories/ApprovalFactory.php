<?php

namespace Database\Factories;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalStage;
use App\Models\Approval;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Approval>
 */
class ApprovalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'travel_request_id' => TravelRequest::factory(),
            'approver_id' => User::factory()->supervisor(),
            'stage' => ApprovalStage::Supervisor,
            'decision' => ApprovalDecision::Approved,
            'note' => null,
        ];
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'decision' => ApprovalDecision::Rejected,
            'note' => fake()->sentence(),
        ]);
    }
}
