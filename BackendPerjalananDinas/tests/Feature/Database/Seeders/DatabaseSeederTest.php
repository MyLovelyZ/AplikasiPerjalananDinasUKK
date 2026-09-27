<?php

use App\Enums\TravelRequestStatus;
use App\Models\TravelRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Storage;

it('seeds an account per role that can sign in with the password "password"', function (string $email, string $role) {
    Storage::fake('local');
    $this->seed(DatabaseSeeder::class);

    $this->postJson('/api/login', ['email' => $email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.user.role', $role);
})->with([
    ['admin@citramandiri.test', 'super_admin'],
    ['finance@citramandiri.test', 'finance'],
    ['supervisor@citramandiri.test', 'supervisor'],
    ['employee@citramandiri.test', 'employee'],
]);

it('seeds the demo employee a trip in every status', function () {
    Storage::fake('local');
    $this->seed(DatabaseSeeder::class);

    $statuses = User::query()->where('email', 'employee@citramandiri.test')->sole()
        ->travelRequests()->pluck('status')->unique();

    expect($statuses->map->value->sort()->values()->all())
        ->toBe(collect(TravelRequestStatus::cases())->map->value->sort()->values()->all());
    expect(TravelRequest::query()->where('status', TravelRequestStatus::Completed)->count())->toBeGreaterThan(5);
});
