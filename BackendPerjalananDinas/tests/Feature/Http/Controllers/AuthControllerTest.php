<?php

use App\Enums\AuditAction;
use App\Models\User;

describe('login form', function () {
    it('describes the fields the login request needs', function () {
        $this->getJson('/api/login')
            ->assertOk()
            ->assertJsonPath('data.fields.0.name', 'email')
            ->assertJsonPath('data.fields.1.name', 'password');
    });
});

describe('login', function () {
    it('returns a bearer token and records the sign-in', function () {
        $user = User::factory()->employee()->create(['email' => 'andi@example.com']);

        $response = $this->postJson('/api/login', [
            'email' => 'andi@example.com',
            'password' => 'password',
            'device_name' => 'Pixel 8',
            'platform' => 'mobile',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonMissingPath('data.user.password');
        expect($response->json('data.token'))->toBeString()->not->toBeEmpty();
        expect($user->tokens()->sole()->name)->toBe('Pixel 8');
        expect($user->fresh()->last_login_at)->not->toBeNull();
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => AuditAction::Login->value,
            'subject_type' => 'user',
        ]);
    });

    it('issues a token that authenticates later requests', function () {
        $user = User::factory()->supervisor()->create();

        $token = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->json('data.token');

        $this->withToken($token)->getJson('/api/profile')->assertOk()->assertJsonPath('data.id', $user->id);
    });

    it('rejects a wrong password with 422', function () {
        $user = User::factory()->create();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'not-the-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'These credentials do not match our records.']);

        expect($user->tokens()->count())->toBe(0);
    });

    it('requires an email and a password', function () {
        $this->postJson('/api/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    });

    it('returns 403 for a deactivated account', function () {
        $user = User::factory()->inactive()->create();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account is inactive. Please contact the administrator.');

        expect($user->tokens()->count())->toBe(0);
    });

    it('returns 403 when a non-employee signs in to the mobile app', function (string $state) {
        $user = User::factory()->{$state}()->create();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password', 'platform' => 'mobile'])
            ->assertForbidden()
            ->assertJsonPath('message', 'The mobile app is only available for employees. Please use the web app.');

        expect($user->tokens()->count())->toBe(0);
    })->with([
        'super admin' => 'superAdmin',
        'supervisor' => 'supervisor',
        'finance' => 'finance',
    ]);

    it('returns 429 after five attempts in a minute', function () {
        $user = User::factory()->create();

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])->assertUnprocessable();
        }

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertTooManyRequests();
    });
});

describe('logout', function () {
    it('revokes only the token used for the request', function () {
        $user = User::factory()->create();
        $webToken = $user->createToken('web')->plainTextToken;
        $user->createToken('phone');

        $this->withToken($webToken)->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Signed out successfully.');

        expect($user->tokens()->pluck('name')->all())->toBe(['phone']);
        $this->assertDatabaseHas('audit_logs', ['user_id' => $user->id, 'action' => AuditAction::Logout->value]);
    });

    it('returns 401 without a token', function () {
        $this->postJson('/api/logout')->assertUnauthorized();
    });
});

it('answers 401 in JSON even when the client does not ask for JSON', function () {
    $this->get('/api/profile')
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'Unauthenticated.']);
});

it('stops accepting the token of an account deactivated after signing in', function () {
    $user = User::factory()->create();
    $token = $user->createToken('web')->plainTextToken;
    $user->update(['is_active' => false]);

    $this->withToken($token)->getJson('/api/profile')->assertUnauthorized();
});
