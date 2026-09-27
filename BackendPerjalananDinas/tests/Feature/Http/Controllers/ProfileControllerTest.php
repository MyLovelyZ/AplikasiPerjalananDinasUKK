<?php

use App\Enums\AuditAction;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

describe('show', function () {
    it('returns the signed-in user with their department and supervisor', function () {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('data.id', $employee->id)
            ->assertJsonPath('data.role', 'employee')
            ->assertJsonPath('data.department.id', $employee->department_id)
            ->assertJsonPath('data.supervisor.id', $employee->supervisor_id)
            ->assertJsonPath('data.bank_account_number', $employee->bank_account_number);
    });
});

describe('update', function () {
    it('updates the name and phone number', function () {
        $user = User::factory()->create(['name' => 'Old Name']);
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'New Name', 'phone' => '081234567890'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('message', 'Profile updated successfully.');

        expect($user->fresh())->name->toBe('New Name')->phone->toBe('081234567890');
        $this->assertDatabaseHas('audit_logs', ['user_id' => $user->id, 'action' => AuditAction::Updated->value]);
    });

    it('replaces the profile photo through a multipart request with _method=PUT', function () {
        Storage::fake('public');
        Storage::disk('public')->put('profile-photos/old.jpg', 'old photo');
        $user = User::factory()->create(['profile_photo_path' => 'profile-photos/old.jpg']);
        Sanctum::actingAs($user);

        $response = $this->post('/api/profile', [
            '_method' => 'PUT',
            'photo' => UploadedFile::fake()->image('me.jpg', 400, 400),
        ], ['Accept' => 'application/json']);

        $newPath = $user->fresh()->profile_photo_path;
        $response->assertOk()->assertJsonPath('data.profile_photo_url', Storage::disk('public')->url($newPath));
        Storage::disk('public')->assertExists($newPath);
        Storage::disk('public')->assertMissing('profile-photos/old.jpg');
    });

    it('rejects a photo that is not an image', function () {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());

        $this->post('/api/profile', [
            '_method' => 'PUT',
            'photo' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo' => 'The photo field must be an image.']);
    });

    it('changes the password and signs out every other device', function () {
        $user = User::factory()->create();
        $webToken = $user->createToken('web')->plainTextToken;
        $user->createToken('phone');

        $this->withToken($webToken)->putJson('/api/profile', [
            'current_password' => 'password',
            'password' => 'a-new-password',
            'password_confirmation' => 'a-new-password',
        ])->assertOk();

        expect(Hash::check('a-new-password', $user->fresh()->password))->toBeTrue();
        expect($user->tokens()->pluck('name')->all())->toBe(['web']);
    });

    it('requires the current password before changing the password', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'current_password' => 'a-wrong-guess',
            'password' => 'a-new-password',
            'password_confirmation' => 'a-new-password',
        ])->assertUnprocessable()->assertJsonValidationErrors(['current_password' => 'The password is incorrect.']);

        expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
    });
});
