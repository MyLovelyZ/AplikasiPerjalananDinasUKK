<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * One account per role with a predictable email, plus a supervisor and three employees per department.
     */
    public function run(): void
    {
        $departmentIds = Department::query()->pluck('id', 'code');

        User::factory()->superAdmin()->create([
            'name' => 'Super Admin',
            'email' => 'admin@citramandiri.test',
            'employee_number' => 'EMP-00001',
        ]);

        User::factory()->finance()->create([
            'name' => 'Siti Rahmawati',
            'email' => 'finance@citramandiri.test',
            'employee_number' => 'EMP-00002',
            'department_id' => $departmentIds['FIN'],
        ]);

        $itSupervisor = User::factory()->supervisor()->create([
            'name' => 'Budi Santoso',
            'email' => 'supervisor@citramandiri.test',
            'employee_number' => 'EMP-00003',
            'department_id' => $departmentIds['IT'],
        ]);

        User::factory()->supervisedBy($itSupervisor)->create([
            'name' => 'Andi Pratama',
            'email' => 'employee@citramandiri.test',
            'employee_number' => 'EMP-00004',
            'position' => 'Software Engineer',
        ]);

        User::factory()->count(3)->supervisedBy($itSupervisor)->create();

        foreach (['HR', 'MKT', 'OPS'] as $code) {
            $supervisor = User::factory()->supervisor()->create([
                'email' => 'supervisor.'.Str::lower($code).'@citramandiri.test',
                'department_id' => $departmentIds[$code],
            ]);

            User::factory()->count(3)->supervisedBy($supervisor)->create();
        }
    }
}
