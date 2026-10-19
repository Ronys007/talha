<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\WhatsappTemplate;

class WhatsappTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereNull('parent_id')->orWhere('role', 'admin')->get();
        $defaults = WhatsappTemplate::getDefaultTemplates();

        foreach ($users as $user) {
            foreach ($defaults as $type => $data) {
                WhatsappTemplate::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'type' => $type,
                    ],
                    [
                        'title' => $data['title'],
                        'message' => $data['message'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
