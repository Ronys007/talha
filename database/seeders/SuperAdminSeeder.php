<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadminEmail = env('SUPERADMIN_EMAIL', 'ronysinghb2b@vamalabs.in');
        $superadminPassword = env('SUPERADMIN_PASSWORD', 'Bhaii@0075');

        $user = User::updateOrCreate(
            ['email' => $superadminEmail],
            [
                'name' => 'Super Admin',
                'password' => Hash::make($superadminPassword),
                'role' => 'super_admin',
                'is_locked' => false,
                'trial_ends_at' => null,
            ]
        );

        $this->command->info("Super Admin seeded: {$user->email} (Password: {$superadminPassword})");
    }
}
