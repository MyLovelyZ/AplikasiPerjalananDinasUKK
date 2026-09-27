<?php

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(LazilyRefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * A valid body for POST /api/employee/requests. Its cost lines total 3,350,000.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function travelRequestPayload(array $overrides = []): array
{
    return array_replace([
        'purpose' => 'Client meeting and contract negotiation',
        'destination' => 'Surabaya',
        'trip_type' => 'domestic',
        'transportation' => 'plane',
        'departure_date' => today()->addDays(7)->toDateString(),
        'return_date' => today()->addDays(9)->toDateString(),
        'advance_requested' => 1_000_000,
        'costs' => [
            ['category' => 'transportation', 'description' => 'Return flight', 'quantity' => 1, 'unit_price' => 2_000_000],
            ['category' => 'accommodation', 'description' => 'Hotel', 'quantity' => 2, 'unit_price' => 675_000],
        ],
    ], $overrides);
}
