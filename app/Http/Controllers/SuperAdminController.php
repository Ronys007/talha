<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class SuperAdminController extends Controller
{
    private function ensureSuperAdmin(): void
    {
        if (!auth()->user() || !auth()->user()->isSuperAdmin()) {
            abort(403, 'Unauthorized. Super Admin access only.');
        }
    }

    public function index()
    {
        $this->ensureSuperAdmin();
        $admins = User::where(function ($query) {
            $query->where('role', 'admin')->orWhereNull('role');
        })->where('id', '!=', auth()->id())->orderBy('id', 'desc')->get();

        $adminsData = $admins->map(fn ($admin) => [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role ?? 'admin',
            'is_locked' => (bool) $admin->is_locked,
            'trial_ends_at' => $admin->trial_ends_at ? $admin->trial_ends_at->format('Y-m-d H:i') : null,
            'is_trial_expired' => $admin->isTrialExpired(),
            'days_left' => $admin->days_left_in_trial,
            'hours_left' => $admin->hours_left_in_trial,
            'trial_remaining_text' => $admin->trial_remaining_formatted,
            'created_at' => $admin->created_at ? $admin->created_at->format('Y-m-d') : null,
        ]);

        return Inertia::render('SuperAdmin/Dashboard', [
            'admins' => $adminsData,
        ]);
    }

    public function switchAdmin(Request $request)
    {
        $this->ensureSuperAdmin();
        $adminId = $request->input('admin_id');

        if (empty($adminId) || $adminId == 0 || $adminId == auth()->id()) {
            $request->session()->forget('view_as_admin_id');
            $request->session()->save();
            return back()->with('success', 'Switched back to Super Admin root view.');
        }

        $admin = User::findOrFail($adminId);
        $request->session()->put('view_as_admin_id', (int) $admin->id);
        $request->session()->save();

        return back()->with('success', "Now viewing store data as Admin: {$admin->name} ({$admin->email})");
    }

    public function storeAdmin(Request $request)
    {
        $this->ensureSuperAdmin();
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'trial_hours' => 'nullable|numeric|min:0.01',
            'trial_days' => 'nullable|numeric|min:0.01',
        ]);

        $trialEndsAt = null;
        if ($request->filled('trial_hours')) {
            $hours = (float) $request->trial_hours;
            $trialEndsAt = now()->addMinutes((int) round($hours * 60));
        } elseif ($request->filled('trial_days')) {
            $days = (float) $request->trial_days;
            $trialEndsAt = now()->addMinutes((int) round($days * 24 * 60));
        }

        User::create([
            'name' => trim($request->name),
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'role' => 'admin',
            'parent_id' => null,
            'is_locked' => false,
            'trial_ends_at' => $trialEndsAt,
        ]);

        return back()->with('success', 'Admin account created successfully.');
    }

    public function toggleLock(Request $request, $id)
    {
        $this->ensureSuperAdmin();
        $admin = User::findOrFail($id);
        
        if ($admin->isSuperAdmin()) {
            return back()->with('error', 'Cannot lock Super Admin');
        }

        $admin->is_locked = ! $admin->is_locked;
        
        // If unlocking and trial was expired, extend by default 24 hours
        if (! $admin->is_locked && $admin->isTrialExpired()) {
            $admin->trial_ends_at = now()->addHours(24);
        }

        $admin->save();

        return back()->with('success', 'Admin status updated to ' . ($admin->is_locked ? 'Locked' : 'Unlocked'));
    }

    public function updateTrial(Request $request, $id)
    {
        $this->ensureSuperAdmin();
        $request->validate([
            'trial_hours' => 'nullable|numeric|min:0',
            'trial_days' => 'nullable|numeric|min:0',
            'trial_ends_at' => 'nullable|date',
            'unlock_account' => 'nullable|boolean',
        ]);

        $admin = User::findOrFail($id);
        if ($admin->isSuperAdmin()) {
            return back()->with('error', 'Cannot set trial for Super Admin');
        }

        if ($request->filled('trial_ends_at')) {
            $admin->trial_ends_at = \Carbon\Carbon::parse($request->trial_ends_at);
        } elseif ($request->filled('trial_hours')) {
            $hours = (float) $request->trial_hours;
            $admin->trial_ends_at = $hours > 0 ? now()->addMinutes((int) round($hours * 60)) : null;
        } elseif ($request->filled('trial_days')) {
            $days = (float) $request->trial_days;
            $admin->trial_ends_at = $days > 0 ? now()->addMinutes((int) round($days * 24 * 60)) : null;
        } else {
            // No trial limitation / lifetime
            $admin->trial_ends_at = null;
        }

        if ($request->boolean('unlock_account') || ! $admin->isTrialExpired()) {
            $admin->is_locked = false;
        }

        $admin->save();

        return back()->with('success', 'Admin trial period updated successfully.');
    }

    public function updatePassword(Request $request, $id)
    {
        $this->ensureSuperAdmin();
        $request->validate([
            'password' => ['required', 'string', 'min:6'],
        ]);

        $admin = User::findOrFail($id);
        
        if ($admin->isSuperAdmin()) {
            return back()->with('error', 'Cannot change Super Admin password');
        }

        $admin->password = Hash::make($request->password);
        $admin->save();

        return back()->with('success', 'Admin password updated');
    }

    public function updateAdmin(Request $request, $id)
    {
        $this->ensureSuperAdmin();
        $admin = User::findOrFail($id);
        
        if ($admin->isSuperAdmin()) {
            return back()->with('error', 'Cannot edit Super Admin through this action.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $admin->id,
        ]);

        $admin->name = trim($request->name);
        $admin->email = strtolower(trim($request->email));
        $admin->save();

        return back()->with('success', "Admin details updated for {$admin->name}.");
    }

    public function destroy($id)
    {
        $this->ensureSuperAdmin();
        $admin = User::findOrFail($id);
        if ($admin->isSuperAdmin()) {
            return back()->with('error', 'Cannot delete Super Admin');
        }

        $admin->delete();

        return back()->with('success', 'Admin account deleted successfully.');
    }
}
