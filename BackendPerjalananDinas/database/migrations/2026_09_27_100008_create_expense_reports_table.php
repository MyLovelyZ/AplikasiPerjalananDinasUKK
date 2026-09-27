<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('expense_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('travel_request_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('summary')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->decimal('total_approved', 15, 2)->nullable();
            $table->decimal('advance_amount', 15, 2)->nullable();
            $table->decimal('difference', 15, 2)->nullable();
            $table->string('settlement_type', 20)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_reports');
    }
};
