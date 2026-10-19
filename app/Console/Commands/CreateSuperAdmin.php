<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'superadmin:create 
                            {--email= : The email address of the Super Admin}
                            {--name= : The name of the Super Admin}
                            {--password= : The password for the Super Admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create or promote an account to Super Admin with root access';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('===============================================');
        $this->info('  VAMA INVOICE - SUPER ADMIN SETUP UTILITY     ');
        $this->info('===============================================');

        $email = $this->option('email') ?: $this->ask('Enter Super Admin Email address');
        $email = strtolower(trim($email));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address format.');
            return 1;
        }

        $existingUser = User::where('email', $email)->first();

        if ($existingUser) {
            $this->warn("A user with email [{$email}] already exists.");
            if ($this->confirm("Do you want to promote this user to Super Admin?", true)) {
                $existingUser->role = 'super_admin';
                $existingUser->is_locked = false;
                $existingUser->trial_ends_at = null;

                if ($this->confirm("Do you also want to change their password?", false)) {
                    $newPassword = $this->secret('Enter new password (min 6 characters)');
                    if (strlen($newPassword) < 6) {
                        $this->error('Password must be at least 6 characters.');
                        return 1;
                    }
                    $existingUser->password = Hash::make($newPassword);
                }

                $existingUser->save();
                $this->info("SUCCESS: User [{$existingUser->name}] ({$email}) is now a Super Admin!");
                return 0;
            }

            $this->info('Operation cancelled.');
            return 0;
        }

        $name = $this->option('name') ?: $this->ask('Enter Super Admin Name', 'Super Admin');
        $password = $this->option('password') ?: $this->secret('Enter Super Admin Password (min 6 characters)');

        if (strlen($password) < 6) {
            $this->error('Password must be at least 6 characters.');
            return 1;
        }

        $user = User::create([
            'name' => trim($name),
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'super_admin',
            'is_locked' => false,
            'trial_ends_at' => null,
        ]);

        $this->newLine();
        $this->info("SUCCESS: Super Admin [{$user->name}] ({$user->email}) created successfully!");
        $this->info("You can now log in at your live URL: /login");
        return 0;
    }
}
