import { Link, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
    LayoutDashboard,
    Package,
    FileText,
    Building2,
    LogOut,
    Menu,
    Barcode,
    List,
} from "lucide-react";
import { useMode } from "@/Context/ModeContext";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Package },
    { label: "Billing", href: "/billing", icon: FileText },
];

function Toast({ flash }) {
    const [visible, setVisible] = useState(false);
    const [msg, setMsg] = useState("");
    const [type, setType] = useState("success");

    useEffect(() => {
        const m = flash?.success || flash?.delete;
        const e = flash?.error;
        if (m) {
            setMsg(m);
            setType("success");
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 3500);
            return () => clearTimeout(t);
        }
        if (e) {
            setMsg(e);
            setType("error");
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 3500);
            return () => clearTimeout(t);
        }
    }, [flash]);

    if (!visible) return null;
    return (
        <div className="toast-container">
            <div className={`toast toast-${type}`}>
                {msg}
            </div>
        </div>
    );
}

export default function AppLayout({ children, title = "" }) {
    const { url } = usePage();
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const queryClient = useQueryClient();
    const { mode, setMode } = useMode();
    const currentPath = url.split("?")[0];

    const isStaff = auth?.user?.is_staff || auth?.user?.role === "staff";
    const visibleNavItems = isStaff
        ? navItems.filter((item) => item.href !== "/inventory")
        : navItems;

    // Auto-lock staff users strictly to Barcode mode
    useEffect(() => {
        if (isStaff && mode !== "barcode") {
            setMode("barcode");
        }
    }, [isStaff, mode]);

    function handleSetMode(newMode) {
        if (isStaff) return; // Disallow switching for staff
        setMode(newMode);
    }

    function prefetchModeData(targetMode) {
        if (targetMode === mode) return;

        if (currentPath === "/inventory") {
            queryClient.prefetchInfiniteQuery({
                queryKey: ["inventory", targetMode, ""],
                queryFn: async ({ pageParam = null }) => {
                    const params = new URLSearchParams({ mode: targetMode });
                    if (pageParam) params.set("cursor", pageParam);
                    const response = await axios.get(`/inventory/data?${params}`);
                    return response.data;
                },
                initialPageParam: null,
                getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
                staleTime: 1000 * 30,
            });
        } else if (currentPath === "/billing") {
            queryClient.prefetchInfiniteQuery({
                queryKey: ["billing", targetMode, ""],
                queryFn: async ({ pageParam = null }) => {
                    const params = new URLSearchParams({ mode: targetMode });
                    if (pageParam) params.set("cursor", pageParam);
                    const response = await axios.get(`/billing/data?${params}`);
                    return response.data;
                },
                initialPageParam: null,
                getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
                staleTime: 1000 * 30,
            });
        } else if (currentPath === "/dashboard") {
            queryClient.prefetchQuery({
                queryKey: ["dashboard-stats", targetMode],
                queryFn: async () => {
                    const response = await axios.get(
                        `/dashboard/stats?mode=${targetMode}`,
                    );
                    return response.data;
                },
                staleTime: 1000 * 30,
            });
        }
    }

    function handleLogout() {
        router.post("/logout");
    }

    return (
        <div className="app-shell">
            {sidebarOpen && (
                <div
                    className="drawer-overlay"
                    style={{ zIndex: 49 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">T</div>
                    <div>
                        <div className="sidebar-logo-text">Inventory Management System</div>
                        <div className="sidebar-logo-sub">
                            {isStaff ? "Staff Portal" : "v2.0"}
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Main Menu</div>
                    {visibleNavItems.map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-link ${currentPath === href || currentPath.startsWith(href + "/") ? "active" : ""}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Icon />
                            {label}
                        </Link>
                    ))}

                    {/* Workspace Mode switcher (Admin Only — Staff is locked to Barcode mode) */}
                    {!isStaff && (
                        <>
                            <div className="nav-section-label" style={{ marginTop: 16 }}>
                                Workspace Mode
                            </div>
                            <div className="inv-mode-cards">
                                <button
                                    type="button"
                                    className={`inv-mode-card ${mode === "standard" ? "inv-mode-card--active-blue" : ""}`}
                                    onPointerEnter={() => prefetchModeData("standard")}
                                    onFocus={() => prefetchModeData("standard")}
                                    onClick={() => { handleSetMode("standard"); setSidebarOpen(false); }}
                                >
                                    <div className={`inv-mode-card-icon ${mode === "standard" ? "inv-mode-card-icon--blue" : "inv-mode-card-icon--muted"}`}>
                                        <List size={15} />
                                    </div>
                                    <div className="inv-mode-card-body">
                                        <span className="inv-mode-card-title">Standard</span>
                                        <span className="inv-mode-card-sub">Manual Entry</span>
                                    </div>
                                    {mode === "standard" && (
                                        <div className="inv-mode-dot inv-mode-dot--blue" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className={`inv-mode-card ${mode === "barcode" ? "inv-mode-card--active-green" : ""}`}
                                    onPointerEnter={() => prefetchModeData("barcode")}
                                    onFocus={() => prefetchModeData("barcode")}
                                    onClick={() => { handleSetMode("barcode"); setSidebarOpen(false); }}
                                >
                                    <div className={`inv-mode-card-icon ${mode === "barcode" ? "inv-mode-card-icon--green" : "inv-mode-card-icon--muted"}`}>
                                        <Barcode size={15} />
                                    </div>
                                    <div className="inv-mode-card-body">
                                        <span className="inv-mode-card-title">Barcode Scanner</span>
                                        <span className="inv-mode-card-sub">Scan &amp; Track</span>
                                    </div>
                                    {mode === "barcode" && (
                                        <div className="inv-mode-dot inv-mode-dot--green" />
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ padding: "8px 12px", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                {auth?.user?.name}
                            </div>
                            {isStaff && (
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: "#e0e7ff",
                                        color: "#4338ca",
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Staff
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {auth?.user?.email}
                        </div>
                    </div>
                    <Link href="/profile" className="nav-link" style={{ marginBottom: 4 }}>
                        <Building2 />
                        Profile Settings
                    </Link>
                    <button className="nav-link" onClick={handleLogout} style={{ color: "var(--danger)" }}>
                        <LogOut />
                        Logout
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <div className="topbar">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                            className="btn btn-ghost btn-icon menu-btn"
                            onClick={() => setSidebarOpen(true)}
                            id="menu-btn"
                        >
                            <Menu size={18} />
                        </button>
                        <span className="topbar-title">{title}</span>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: mode === "barcode" ? "#dcfce7" : "#dbeafe",
                                color: mode === "barcode" ? "#15803d" : "#1d4ed8",
                                border: `1px solid ${mode === "barcode" ? "#86efac" : "#bfdbfe"}`,
                            }}
                        >
                            {mode === "barcode" ? <Barcode size={13} /> : <List size={12} />}
                            {mode === "barcode" ? "Barcode Mode" : "Standard Mode"}
                        </span>
                    </div>
                    <div className="topbar-actions">
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            {auth?.user?.name}
                        </span>
                    </div>
                </div>

                <div className="page-content">{children}</div>

                <footer className="app-footer">
                    © {new Date().getFullYear()} Copyright{" "}
                    <a href="https://vamalabs.in" target="_blank" rel="noopener noreferrer" className="footer-link">
                        vamalabs.in
                    </a>
                </footer>
            </div>

            <Toast flash={flash} />
        </div>
    );
}
