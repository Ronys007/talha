<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Inventrix</title>

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">

    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">

    <!-- jQuery UI CSS -->
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">

    <!-- jQuery and jQuery UI JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous">
    </script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css" rel="stylesheet" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js"></script>

    <style>
        body,
        html {
            height: 100%;
            background: radial-gradient(circle at 50% 0%, #1a2436 0%, #0d1117 100%);
            background-attachment: fixed;
        }

        body {
            display: flex;
            flex-direction: column;
        }

        /* Glassmorphism Header - Brand Color */
        .glass-header {
            background: #0d6efd;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.5rem 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .navbar-brand img {
            height: 40px;
            width: auto;
            transition: transform 0.2s;
        }

        .navbar-brand:hover img {
            transform: scale(1.05);
        }

        /* Navigation Buttons */
        .nav-btn {
            color: rgba(255, 255, 255, 0.9) !important;
            border-radius: 12px;
            padding: 8px 16px;
            transition: all 0.2s ease;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid transparent;
        }

        .nav-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            color: #fff !important;
            transform: translateY(-1px);
        }

        .nav-btn.active,
        .active-btn {
            background: #fff;
            color: #0d6efd !important;
            border-color: #fff;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .active-btn {
            /* Overriding footer script style */
            color: #0d6efd !important;
        }

        /* Search Input */
        .search-container {
            position: relative;
            max-width: 400px;
            width: 100%;
        }

        .search-input {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #fff;
            border-radius: 20px;
            padding: 8px 16px 8px 40px;
            width: 100%;
            transition: all 0.3s ease;
        }

        .search-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        .search-input:focus {
            background: rgba(255, 255, 255, 0.95);
            border-color: #fff;
            outline: none;
            color: #333;
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.8);
        }

        /* Change icon color on focus */
        .search-input:focus~.search-icon {
            color: #333;
        }

        /* Dropdown Styling */
        .dropdown-menu {
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .dropdown-item {
            color: #333;
            padding: 8px 16px;
        }

        .dropdown-item:hover {
            background: #f8f9fa;
            color: #0d6efd;
        }

        .dropdown-divider {
            border-top-color: #e9ecef;
        }

        /* Mobile Optimization */
        @media (max-width: 768px) {
            .mobile-hide-text {
                display: none;
            }

            .nav-btn {
                padding: 8px;
                /* Square interactions */
                justify-content: center;
            }

            .card-text {
                font-size: 1rem;
            }
        }
    </style>
</head>

<body class="bg-dark text-light">
    <!-- Header -->
    <nav class="navbar fixed-top glass-header">
        <div class="container-fluid d-flex align-items-center justify-content-between">

            <!-- Left: Logo -->
            <a class="navbar-brand me-3" href="/">
                <img src="{{ asset('storage/images/Inventrix-logo.png') }}" alt="Inventrix">
            </a>

            <!-- Center: Search (Desktop) / Mobile Search Below -->
            <div class="d-none d-md-block flex-grow-1 mx-4">
                <form onsubmit="return false;" class="search-container mx-auto">
                    <input type="search" class="search-input" id="search-desktop"
                        placeholder="Search bills, items, customers..."
                        oninput="document.getElementById('search').value = this.value; $('#search').trigger('input');">
                    <i class="bi bi-search search-icon" style="pointer-events: none;"></i>
                </form>
            </div>

            <!-- Right: Navigation Ions (No Hamburger) -->
            <div class="d-flex align-items-center gap-2">
                <a href="/" class="nav-btn" id="home-btn" title="Home">
                    <i class="bi bi-grid-fill"></i>
                    <span class="mobile-hide-text">Dashboard</span>
                </a>

                <a href="/billing" class="nav-btn" id="bills-btn" title="Billing">
                    <i class="bi bi-receipt-cutoff"></i>
                    <span class="mobile-hide-text">Billing</span>
                </a>

                <!-- User Dropdown -->
                <div class="dropdown">
                    <a href="#" class="nav-btn" id="userDropdown" role="button" data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <i class="bi bi-person-circle"></i>
                        <span class="mobile-hide-text">{{ Auth::check() ? Auth::user()->name : '' }}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item" href="/profile">
                                <i class="bi bi-person-gear me-2"></i> Profile
                            </a>
                        </li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li>
                            <form id="logout-form" action="{{ route('logout') }}" method="POST" class="d-none">
                                @csrf
                            </form>
                            <a class="dropdown-item text-danger" href="#" onclick="logout()">
                                <i class="bi bi-box-arrow-right me-2"></i> Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Mobile Search Bar (Only visible on narrow screens) -->
        <div class="container-fluid mt-2 d-md-none">
            <form onsubmit="return false;" class="search-container w-100">
                <input type="search" class="search-input" id="search" placeholder="Search...">
                <i class="bi bi-search search-icon" style="pointer-events: none;"></i>
            </form>
        </div>
    </nav>

    <!-- Spacer for Fixed Header -->
    <div class="d-none d-md-block" style="height: 80px;"></div>
    <div class="d-md-none" style="height: 140px;"></div>

    <!-- Global Alert Container -->
    <div class="container mt-3">
        <!-- Success -->
        @if (session('success'))
            <div class="alert alert-success alert-dismissible fade show bg-success text-white border-0 shadow-sm"
                role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-check-circle-fill me-2 fs-5"></i>
                    <div>{{ session('success') }}</div>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"
                    aria-label="Close"></button>
            </div>
        @endif

        <!-- Error -->
        @if (session('error'))
            <div class="alert alert-danger alert-dismissible fade show bg-danger text-white border-0 shadow-sm"
                role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                    <div>{{ session('error') }}</div>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"
                    aria-label="Close"></button>
            </div>
        @endif

        <!-- Delete (Red) -->
        @if (session('delete'))
            <div class="alert alert-danger alert-dismissible fade show bg-danger text-white border-0 shadow-sm"
                role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-trash-fill me-2 fs-5"></i>
                    <div>{{ session('delete') }}</div>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"
                    aria-label="Close"></button>
            </div>
        @endif
    </div>

    <!-- Note: Scripts are now in footer.blade.php -->
