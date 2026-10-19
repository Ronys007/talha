<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Handle the incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = parent::handle($request, $next);

        // Prevent browser/proxy cache from displaying raw JSON when returning to sleeping/inactive tabs
        $response->headers->set('Vary', 'X-Inertia, Accept', false);
        $response->headers->set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        return $response;
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $switchedAdmin = null;
        $adminStores = [];

        if ($user && $user->isSuperAdmin()) {
            $switchedId = (int) ($request->session()->get('view_as_admin_id') ?? session('view_as_admin_id'));
            if ($switchedId > 0) {
                $admin = \App\Models\User::find($switchedId);
                if ($admin) {
                    $switchedAdmin = [
                        'id' => $admin->id,
                        'name' => $admin->name,
                        'email' => $admin->email,
                    ];
                }
            }

            $adminStores = \App\Models\User::where(function ($query) {
                $query->where('role', 'admin')->orWhereNull('role');
            })->where('id', '!=', $user->id)
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'email'])
            ->toArray();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'       => $user->id,
                    'name'     => $user->name,
                    'email'    => $user->email,
                    'role'     => $user->role ?? 'admin',
                    'is_staff' => $user->isStaff(),
                ] : null,
            ],
            'switchedAdmin' => $switchedAdmin,
            'adminStores'   => $adminStores,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'delete'  => $request->session()->get('delete'),
                'wa_me_url' => $request->session()->get('wa_me_url'),
            ],
        ];
    }
}
