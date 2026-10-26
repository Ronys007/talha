<?php

use App\Models\User;

test('user role identification works correctly', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $defaultUser = User::factory()->create();
    $staff = User::factory()->create(['role' => 'staff']);
    $superAdmin = User::factory()->create(['role' => 'super_admin']);

    expect($admin->isAdmin())->toBeTrue();
    expect($defaultUser->isAdmin())->toBeTrue();
    expect($staff->isStaff())->toBeTrue();
    expect($staff->isAdmin())->toBeFalse();
    expect($superAdmin->isSuperAdmin())->toBeTrue();
    expect($superAdmin->isStaff())->toBeFalse();
});

test('effective store owner ID resolution works for standalone and staff users', function () {
    $owner = User::factory()->create(['role' => 'admin']);
    $staff = User::factory()->create([
        'role' => 'staff',
        'parent_id' => $owner->id,
    ]);

    expect($owner->getEffectiveOwnerId())->toBe($owner->id);
    expect($staff->getEffectiveOwnerId())->toBe($owner->id);
    expect($staff->store_owner_id)->toBe($owner->id);
});

test('trial expiration logic operates correctly', function () {
    $activeUser = User::factory()->create([
        'role' => 'admin',
        'trial_ends_at' => now()->addDays(7),
    ]);

    $expiredUser = User::factory()->create([
        'role' => 'admin',
        'trial_ends_at' => now()->subDay(),
    ]);

    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'trial_ends_at' => now()->subDay(),
    ]);

    expect($activeUser->isTrialExpired())->toBeFalse();
    expect($activeUser->days_left_in_trial)->toBeGreaterThan(0);

    expect($expiredUser->isTrialExpired())->toBeTrue();
    expect($expiredUser->days_left_in_trial)->toBe(0);

    // Super Admin never expires regardless of trial date
    expect($superAdmin->isTrialExpired())->toBeFalse();
});
