<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            'IT' => 'Information Technology',
            'FIN' => 'Finance',
            'HR' => 'Human Resources',
            'MKT' => 'Marketing',
            'OPS' => 'Operations',
        ];

        foreach ($departments as $code => $name) {
            Department::factory()->create(['code' => $code, 'name' => $name]);
        }
    }
}
