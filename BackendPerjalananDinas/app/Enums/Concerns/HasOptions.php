<?php

namespace App\Enums\Concerns;

/**
 * Lets a backed enum describe itself as select options for form endpoints.
 *
 * The enum using this trait must define a `label(): string` method.
 */
trait HasOptions
{
    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
