<?php

namespace App\Models;

use App\Enums\DocumentType;
use Database\Factories\SupportingDocumentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['travel_request_id', 'type', 'original_name', 'path', 'mime_type', 'size'])]
class SupportingDocument extends Model
{
    /** @use HasFactory<SupportingDocumentFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DocumentType::class,
            'size' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<TravelRequest, $this>
     */
    public function travelRequest(): BelongsTo
    {
        return $this->belongsTo(TravelRequest::class);
    }

    /**
     * A short-lived signed link to the private file, handed only to users who may view the request.
     */
    public function temporaryUrl(): string
    {
        return Storage::disk('local')->temporaryUrl($this->path, now()->addMinutes(30));
    }
}
