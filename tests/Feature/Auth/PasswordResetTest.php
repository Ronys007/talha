<?php

test('forgot password is disabled and redirects to login', function () {
    $response = $this->get('/forgot-password');

    $response->assertRedirect(route('login'));
});

test('reset password route is disabled and redirects to login', function () {
    $response = $this->get('/reset-password/sample-token');

    $response->assertRedirect(route('login'));
});
