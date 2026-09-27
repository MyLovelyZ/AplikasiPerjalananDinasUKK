<?php

namespace App\Http\Controllers;

use App\Enums\AuditAction;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Show the signed-in user's profile.
     */
    public function show(Request $request): UserResource
    {
        return UserResource::make($request->user()->load(['department', 'supervisor']));
    }

    /**
     * Update the signed-in user's name, phone, photo, or password.
     *
     * Photo uploads must be sent as multipart/form-data. PHP does not parse multipart bodies
     * on PUT requests, so clients send POST with a `_method=PUT` field instead.
     */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $previousPhotoPath = $user->profile_photo_path;
        $changesPassword = $request->filled('password');

        $user->fill($request->safe()->only(['name', 'phone']));

        if ($changesPassword) {
            $user->password = $request->validated('password');
        }

        if ($request->hasFile('photo')) {
            $user->profile_photo_path = $request->file('photo')->store('profile-photos', 'public');
        }

        [$oldValues, $newValues] = AuditLog::changesOf($user);

        DB::transaction(function () use ($request, $user, $changesPassword, $oldValues, $newValues): void {
            $user->save();

            if ($changesPassword) {
                // Sign out every other device; the one making this request stays signed in.
                $user->tokens()->whereKeyNot($user->currentAccessToken()->getKey())->delete();
            }

            AuditLog::record(
                $request,
                AuditAction::Updated,
                $user,
                __(':name updated their profile.', ['name' => $user->name]),
                oldValues: $oldValues,
                newValues: $changesPassword ? [...$newValues, 'password' => '(changed)'] : $newValues,
            );
        });

        if ($request->hasFile('photo') && $previousPhotoPath !== null) {
            Storage::disk('public')->delete($previousPhotoPath);
        }

        return UserResource::make($user->load(['department', 'supervisor']))
            ->additional(['message' => __('Profile updated successfully.')]);
    }
}
