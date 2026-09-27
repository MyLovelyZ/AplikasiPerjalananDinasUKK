<?php

namespace Database\Factories;

use App\Enums\DocumentType;
use App\Models\SupportingDocument;
use App\Models\TravelRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupportingDocument>
 */
class SupportingDocumentFactory extends Factory
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
            'type' => fake()->randomElement(DocumentType::cases()),
            'original_name' => fake()->word().'.pdf',
            'path' => 'travel-requests/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'size' => fake()->numberBetween(20_000, 900_000),
        ];
    }
}
