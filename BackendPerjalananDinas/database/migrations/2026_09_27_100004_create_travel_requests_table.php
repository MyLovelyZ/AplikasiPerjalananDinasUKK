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
        Schema::create('travel_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number', 30)->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('department_id')->constrained()->restrictOnDelete();
            $table->foreignId('budget_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('purpose', 200);
            $table->text('description')->nullable();
            $table->string('destination', 150);
            $table->string('trip_type', 20);
            $table->string('transportation', 30);
            $table->date('departure_date');
            $table->date('return_date');
            $table->decimal('estimated_cost', 15, 2)->default(0);
            $table->decimal('advance_requested', 15, 2)->default(0);
            $table->decimal('advance_approved', 15, 2)->nullable();
            $table->string('status', 30)->default('draft');
            $table->text('notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'departure_date']);
            $table->index(['department_id', 'departure_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('travel_requests');
    }
};
