<?php

namespace App\Providers;

use App\Models\Approval;
use App\Models\Budget;
use App\Models\Department;
use App\Models\Disbursement;
use App\Models\Expense;
use App\Models\ExpenseReport;
use App\Models\TravelRequest;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->environment('production'));

        // Store short, stable names (e.g. "travel_request") in polymorphic columns such as
        // audit_logs.subject_type and personal_access_tokens.tokenable_type instead of class names.
        Relation::enforceMorphMap([
            'user' => User::class,
            'department' => Department::class,
            'budget' => Budget::class,
            'travel_request' => TravelRequest::class,
            'approval' => Approval::class,
            'expense_report' => ExpenseReport::class,
            'expense' => Expense::class,
            'disbursement' => Disbursement::class,
        ]);

        Password::defaults(fn (): Password => Password::min(8));

        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(5)->by(
            $request->string('email')->lower().'|'.$request->ip(),
        ));

        // Tokens stop working as soon as an account is deactivated, even before they are revoked.
        Sanctum::authenticateAccessTokensUsing(
            fn (PersonalAccessToken $token, bool $isValid): bool => $isValid && $token->tokenable?->is_active === true,
        );
    }
}
