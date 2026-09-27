<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * Each role-only area, checked with every role that must be refused.
 */
dataset('refused roles', [
    'admin area as supervisor' => ['/api/admin/dashboard', 'supervisor'],
    'admin area as finance' => ['/api/admin/dashboard', 'finance'],
    'admin area as employee' => ['/api/admin/dashboard', 'employee'],
    'employee area as super admin' => ['/api/employee/dashboard', 'superAdmin'],
    'employee area as supervisor' => ['/api/employee/dashboard', 'supervisor'],
    'employee area as finance' => ['/api/employee/dashboard', 'finance'],
    'supervisor area as super admin' => ['/api/supervisor/dashboard', 'superAdmin'],
    'supervisor area as finance' => ['/api/supervisor/dashboard', 'finance'],
    'supervisor area as employee' => ['/api/supervisor/dashboard', 'employee'],
    'finance area as super admin' => ['/api/finance/dashboard', 'superAdmin'],
    'finance area as supervisor' => ['/api/finance/dashboard', 'supervisor'],
    'finance area as employee' => ['/api/finance/dashboard', 'employee'],
]);

it('returns 403 to a role that does not own the area', function (string $uri, string $role) {
    Sanctum::actingAs(User::factory()->{$role}()->create());

    $this->getJson($uri)
        ->assertForbidden()
        ->assertJsonPath('message', 'Your role is not allowed to access this resource.');
})->with('refused roles');

it('lets each role into its own area', function (string $uri, string $role) {
    Sanctum::actingAs(User::factory()->{$role}()->create());

    $this->getJson($uri)->assertOk();
})->with([
    'super admin' => ['/api/admin/dashboard', 'superAdmin'],
    'employee' => ['/api/employee/dashboard', 'employee'],
    'supervisor' => ['/api/supervisor/dashboard', 'supervisor'],
    'finance' => ['/api/finance/dashboard', 'finance'],
]);

it('returns 401 to a guest in any role area', function (string $uri) {
    $this->getJson($uri)->assertUnauthorized();
})->with([
    '/api/admin/dashboard',
    '/api/employee/dashboard',
    '/api/supervisor/dashboard',
    '/api/finance/dashboard',
]);
