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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_report_id')->constrained()->cascadeOnDelete();
            $table->string('category', 30);
            $table->date('expense_date');
            $table->string('description', 200);
            $table->decimal('amount', 15, 2);
            $table->decimal('approved_amount', 15, 2)->nullable();
            $table->string('status', 30)->default('pending');
            $table->string('receipt_path')->nullable();
            $table->string('receipt_name', 150)->nullable();
            $table->string('receipt_mime_type', 100)->nullable();
            $table->unsignedInteger('receipt_size')->nullable();
            $table->text('verification_note')->nullable();
            $table->timestamps();

            $table->index(['expense_date', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
