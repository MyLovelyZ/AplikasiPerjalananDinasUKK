<?php

namespace App\Http\Controllers;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    /**
     * Describe the login form. Named `login` so Laravel can resolve its guest redirect for API routes.
     */
    public function loginForm(): JsonResponse
    {
        return response()->json([
            'message' => __('Send your email and password to this URL with a POST request to receive an API token.'),
            'data' => [
                'app_name' => config('app.name'),
                'fields' => [
                    ['name' => 'email', 'type' => 'email', 'required' => true],
                    ['name' => 'password', 'type' => 'password', 'required' => true],
                    ['name' => 'device_name', 'type' => 'text', 'required' => false],
                    ['name' => 'platform', 'type' => 'select', 'required' => false, 'options' => ['web', 'mobile']],
                ],
            ],
        ]);
    }

    /**
     * Exchange credentials for a Sanctum API token. The mobile app is for employees only.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if ($user === null || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        abort_unless($user->is_active, Response::HTTP_FORBIDDEN, __('Your account is inactive. Please contact the administrator.'));

        $platform = $request->input('platform', 'web');

        abort_if(
            $platform === 'mobile' && $user->role !== Role::Employee,
            Response::HTTP_FORBIDDEN,
            __('The mobile app is only available for employees. Please use the web app.'),
        );

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($request->input('device_name') ?: $platform)->plainTextToken;

        AuditLog::record($request, AuditAction::Login, $user, __(':name signed in (:platform).', [
            'name' => $user->name,
            'platform' => $platform,
        ]), user: $user);

        return response()->json([
            'message' => __('Signed in successfully.'),
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => UserResource::make($user->load(['department', 'supervisor'])),
            ],
        ]);
    }

    /**
     * Revoke the token used for this request.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->currentAccessToken()->delete();

        AuditLog::record($request, AuditAction::Logout, $user, __(':name signed out.', ['name' => $user->name]));

        return response()->json(['message' => __('Signed out successfully.')]);
    }
}
