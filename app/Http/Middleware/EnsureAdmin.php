<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->isStaff()) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['error' => 'Access restricted to store admin.'], 403);
            }
            return redirect()->route('dashboard')->with('error', 'Access restricted to store admin.');
        }

        return $next($request);
    }
}
