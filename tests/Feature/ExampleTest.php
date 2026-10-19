<?php

it('redirects unauthenticated visitors to login', function () {
    $response = $this->get('/');

    $response->assertRedirect('/login');
});
