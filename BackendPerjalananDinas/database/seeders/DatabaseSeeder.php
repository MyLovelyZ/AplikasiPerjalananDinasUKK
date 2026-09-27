<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Every seeded account uses the password "password":
     *  - admin@citramandiri.test       (super admin)
     *  - finance@citramandiri.test     (finance manager)
     *  - supervisor@citramandiri.test  (IT supervisor)
     *  - employee@citramandiri.test    (IT employee with a trip in every stage)
     */
    public function run(): void
    {
        $this->call([
            DepartmentSeeder::class,
            UserSeeder::class,
            BudgetSeeder::class,
            TravelRequestSeeder::class,
        ]);
    }
}
