<?php

test('registration is disabled and redirects to login', function () {
    $response = $this->get('/register');

    $response->assertRedirect(route('login'));
});

