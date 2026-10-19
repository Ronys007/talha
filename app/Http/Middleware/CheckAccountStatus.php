<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckAccountStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();

            if (! $user->isSuperAdmin()) {
                if ($user->is_locked || $user->isTrialExpired()) {
                    if ($user->isTrialExpired() && ! $user->is_locked) {
                        $user->is_locked = true;
                        $user->save();
                    }

                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    return redirect()->route('login')->with('status', 'Your account has been locked or your trial period has expired. Please contact the Super Admin.');
                }
            }
        }

        return $next($request);
    }
}
