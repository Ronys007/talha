@extends('layouts.main')

@section('main-section')
    <div class="container py-5 mt-5" style="max-width: 1000px;">
        <!-- Page Header -->
        <div class="mb-5">
            <h2 class="text-white fw-bold">
                <i class="bi bi-person-circle me-2"></i> Profile Management
            </h2>
            <p class="text-secondary">Manage your account information and security settings.</p>
        </div>

        <div class="row g-4">
            <!-- Profile Information -->
            <div class="col-lg-6">
                <div class="card bg-dark text-white border-secondary h-100 shadow-sm">
                    <div class="card-header bg-transparent border-secondary py-3 px-4">
                        <h5 class="card-title mb-0 text-primary">
                            <i class="bi bi-person-vcard me-2"></i> Profile Information
                        </h5>
                    </div>
                    <div class="card-body p-4">
                        <p class="small text-secondary mb-4">
                            Update your account's profile information and email address.
                        </p>

                        <form method="post" action="{{ route('profile.update') }}">
                            @csrf
                            @method('patch')

                            <div class="mb-3">
                                <label for="name" class="form-label text-secondary">Name</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-secondary border-secondary text-white"><i
                                            class="bi bi-person"></i></span>
                                    <input type="text"
                                        class="form-control bg-dark text-white border-secondary @error('name', 'userDeletion') is-invalid @enderror"
                                        id="name" name="name" value="{{ old('name', $user->name) }}" required
                                        autofocus autocomplete="name">
                                </div>
                                <x-input-error class="text-danger small mt-1" :messages="$errors->get('name')" />
                            </div>

                            <div class="mb-4">
                                <label for="email" class="form-label text-secondary">Email</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-secondary border-secondary text-white"><i
                                            class="bi bi-envelope"></i></span>
                                    <input type="email"
                                        class="form-control bg-dark text-white border-secondary @error('email', 'userDeletion') is-invalid @enderror"
                                        id="email" name="email" value="{{ old('email', $user->email) }}" required
                                        autocomplete="username">
                                </div>
                                <x-input-error class="text-danger small mt-1" :messages="$errors->get('email')" />

                                @if ($user instanceof \Illuminate\Contracts\Auth\MustVerifyEmail && !$user->hasVerifiedEmail())
                                    <div class="mt-2">
                                        <p class="small text-warning">
                                            Your email address is unverified.
                                            <button form="send-verification"
                                                class="btn btn-link btn-sm p-0 align-baseline">Click here to re-send the
                                                verification email.</button>
                                        </p>
                                        @if (session('status') === 'verification-link-sent')
                                            <p class="small text-success">
                                                A new verification link has been sent to your email address.
                                            </p>
                                        @endif
                                    </div>
                                @endif
                            </div>

                            <div class="d-flex align-items-center gap-3">
                                <button type="submit" class="btn btn-primary px-4">
                                    <i class="bi bi-save me-1"></i> Save Changes
                                </button>

                                @if (session('status') === 'profile-updated')
                                    <span class="text-success fade-in-out">
                                        <i class="bi bi-check-circle"></i> Saved
                                    </span>
                                @endif
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Update Password -->
            <div class="col-lg-6">
                <div class="card bg-dark text-white border-secondary h-100 shadow-sm">
                    <div class="card-header bg-transparent border-secondary py-3 px-4">
                        <h5 class="card-title mb-0 text-warning">
                            <i class="bi bi-shield-lock me-2"></i> Security
                        </h5>
                    </div>
                    <div class="card-body p-4">
                        <p class="small text-secondary mb-4">
                            Ensure your account is using a long, random password to stay secure.
                        </p>

                        <form method="post" action="{{ route('password.update') }}">
                            @csrf
                            @method('put')

                            <div class="mb-3">
                                <label for="current_password" class="form-label text-secondary">Current Password</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-secondary border-secondary text-white"><i
                                            class="bi bi-key"></i></span>
                                    <input type="password" class="form-control bg-dark text-white border-secondary"
                                        id="current_password" name="current_password" autocomplete="current-password">
                                </div>
                                <x-input-error :messages="$errors->updatePassword->get('current_password')" class="text-danger small mt-1" />
                            </div>

                            <div class="mb-3">
                                <label for="password" class="form-label text-secondary">New Password</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-secondary border-secondary text-white"><i
                                            class="bi bi-incognito"></i></span>
                                    <input type="password" class="form-control bg-dark text-white border-secondary"
                                        id="password" name="password" autocomplete="new-password">
                                </div>
                                <x-input-error :messages="$errors->updatePassword->get('password')" class="text-danger small mt-1" />
                            </div>

                            <div class="mb-4">
                                <label for="password_confirmation" class="form-label text-secondary">Confirm
                                    Password</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-secondary border-secondary text-white"><i
                                            class="bi bi-check2-circle"></i></span>
                                    <input type="password" class="form-control bg-dark text-white border-secondary"
                                        id="password_confirmation" name="password_confirmation" autocomplete="new-password">
                                </div>
                                <x-input-error :messages="$errors->updatePassword->get('password_confirmation')" class="text-danger small mt-1" />
                            </div>

                            <div class="d-flex align-items-center gap-3">
                                <button type="submit" class="btn btn-warning px-4">
                                    <i class="bi bi-arrow-repeat me-1"></i> Update Password
                                </button>

                                @if (session('status') === 'password-updated')
                                    <span class="text-success fade-in-out">
                                        <i class="bi bi-check-circle"></i> Saved
                                    </span>
                                @endif
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Danger Zone (Delete Account) -->
            <div class="col-12">
                <div class="card bg-dark text-white border-danger shadow-sm mt-3">
                    <div class="card-header bg-danger bg-opacity-10 border-danger py-3 px-4">
                        <h5 class="card-title mb-0 text-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i> Danger Zone
                        </h5>
                    </div>
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <h6 class="fw-bold mb-1">Delete Account</h6>
                                <p class="text-secondary small mb-0">
                                    Once your account is deleted, all of its resources and data will be permanently deleted.
                                </p>
                            </div>
                            <button type="button" class="btn btn-outline-danger" data-bs-toggle="modal"
                                data-bs-target="#deleteAccountModal">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Account Modal -->
    <div class="modal fade" id="deleteAccountModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white border-secondary">
                <form method="post" action="{{ route('profile.destroy') }}">
                    @csrf
                    @method('delete')

                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-danger">Delete Account</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-secondary">
                            Are you sure you want to delete your account? This action cannot be undone.
                            Please enter your password to confirm you would like to permanently delete your account.
                        </p>
                        <div class="mt-3">
                            <label for="password" class="form-label visually-hidden">Password</label>
                            <input type="password" class="form-control bg-dark text-white border-secondary"
                                id="password" name="password" placeholder="Password" required>
                            <x-input-error :messages="$errors->userDeletion->get('password')" class="text-danger small mt-1" />
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger">Delete Account</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Hidden Form for Email Verification -->
    <form id="send-verification" method="post" action="{{ route('verification.send') }}">
        @csrf
    </form>
@endsection
