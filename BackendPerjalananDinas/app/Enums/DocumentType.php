<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum DocumentType: string
{
    use HasOptions;

    case Invitation = 'invitation';
    case TermsOfReference = 'terms_of_reference';
    case AssignmentLetter = 'assignment_letter';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Invitation => __('Invitation'),
            self::TermsOfReference => __('Terms of reference'),
            self::AssignmentLetter => __('Assignment letter'),
            self::Other => __('Other'),
        };
    }
}
