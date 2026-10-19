<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/profile');

    $response->assertOk();
});

test('non-superadmin cannot update profile name and email', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'New Name',
            'email' => 'new@example.com',
        ]);

    $response->assertRedirect('/profile');
    $this->assertNotSame('New Name', $user->fresh()->name);
});

test('super admin can update profile information', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'Super Admin Updated',
            'email' => 'super_updated@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    $this->assertSame('Super Admin Updated', $user->name);
    $this->assertSame('super_updated@example.com', $user->email);
    $this->assertNull($user->email_verified_at);
});

test('super admin can delete their account', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this
        ->actingAs($user)
        ->delete('/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    $this->assertNull($user->fresh());
});

test('non-superadmin cannot delete their account', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $response = $this
        ->actingAs($user)
        ->delete('/profile', [
            'password' => 'password',
        ]);

    $response->assertRedirect();
    $this->assertNotNull($user->fresh());
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->delete('/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrorsIn('userDeletion', 'password')
        ->assertRedirect('/profile');

    $this->assertNotNull($user->fresh());
});
