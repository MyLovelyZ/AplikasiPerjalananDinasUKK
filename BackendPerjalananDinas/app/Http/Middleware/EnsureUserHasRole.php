<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restrict a route group to one or more roles, e.g. `->middleware('role:finance')`.
 */
class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $allowedRoles = array_map(fn (string $role): Role => Role::from($role), $roles);

        abort_unless(
            $request->user()?->hasRole(...$allowedRoles),
            Response::HTTP_FORBIDDEN,
            __('Your role is not allowed to access this resource.'),
        );

        return $next($request);
    }
}
