import { Link, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Package,
    Building2,
    LogOut,
    Menu,
    Barcode,
    List,
    ShoppingCart,
    TrendingUp,
    Receipt,
    Headphones,
    Phone,
    Mail,
    Copy,
    Check,
    X,
    ShoppingBag,
    FileCheck,
    Truck,
    Percent,
    BellRing,
    ChevronDown,
    ChevronRight,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
} from "lucide-react";
import { useMode } from "@/Context/ModeContext";
import ApplicationLogo from "@/Components/ApplicationLogo";

const navigationConfig = [
    {
        type: "item",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        type: "group",
        id: "sales",
        label: "Sales",
        icon: Receipt,
        children: [
            { label: "Sales Invoices", href: "/invoices", icon: Receipt },
            { label: "Sales Reminders", href: "/sales-reminders", altHrefs: ["/payment-reminders"], icon: BellRing },
            { label: "Quotations & Challan", href: "/quotations", icon: FileCheck },
        ],
    },
    {
        type: "group",
        id: "purchase",
        label: "Purchase",
        icon: ShoppingCart,
        children: [
            { label: "Purchase Invoices", href: "/purchase", icon: ShoppingCart },
            { label: "Purchase Reminders", href: "/purchase-reminders", icon: BellRing },
        ],
    },
    {
        type: "item",
        label: "Inventory",
        href: "/inventory",
        icon: Package,
        hideForStaff: true,
    },
    {
        type: "item",
        label: "Bill Margin",
        href: "/margin",
        icon: Percent,
    },
    {
        type: "item",
        label: "WhatsApp Hub",
        href: "/whatsapp",
        icon: MessageSquare,
    },
];

function Toast({ flash }) {
    const [visible, setVisible] = useState(false);
    const [msg, setMsg] = useState("");
    const [type, setType] = useState("success");

    useEffect(() => {
        const m = flash?.success || flash?.delete;
        const w = flash?.warning;
        const e = flash?.error;
        if (flash?.wa_me_url) {
            try {
                window.open(flash.wa_me_url, "_blank");
            } catch (err) {}
        }
        if (m) {
            setMsg(m);
            setType("success");
            setVisible(true);
            const t = setTimeout(() => setVisible(false), flash?.wa_me_url ? 8000 : 3500);
            return () => clearTimeout(t);
        }
        if (w) {
            setMsg(w);
            setType("warning");
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 4500);
            return () => clearTimeout(t);
        }
        if (e) {
            setMsg(e);
            setType("error");
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(t);
        }
    }, [flash]);

    if (!visible) return null;
    const isWaPrompt = msg && (msg.includes("WhatsApp") || msg.includes("WhatsApp Hub"));
    const Icon = type === "success" ? CheckCircle2 : AlertCircle;
    const iconColor = type === "success" ? "#10b981" : type === "warning" ? "#f59e0b" : "#ef4444";

    return (
        <div className="toast-container">
            <div className={`toast toast-${type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <Icon size={16} color={iconColor} style={{ flexShrink: 0 }} />
                    <span style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>{msg}</span>
                </div>
                {flash?.wa_me_url && (
                    <a
                        href={flash.wa_me_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            background: '#25D366',
                            color: '#ffffff',
                            borderRadius: 6,
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: 11.5,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <span>Open WhatsApp</span>
                        <ExternalLink size={12} />
                    </a>
                )}
                {isWaPrompt && !flash?.wa_me_url && (type === 'error' || type === 'warning') && (
                    <a
                        href="/whatsapp"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            background: '#4f46e5',
                            color: '#ffffff',
                            borderRadius: 5,
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: 11,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        WhatsApp Hub →
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => setVisible(false)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted, #94a3b8)',
                        cursor: 'pointer',
                        padding: 2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        marginLeft: 4,
                        flexShrink: 0,
                    }}
                    title="Dismiss"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

export default function AppLayout({ children, title = "" }) {
    const { url } = usePage();
    const { auth, flash, switchedAdmin, adminStores } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const { mode, setMode } = useMode();
    const currentPath = url.split("?")[0];

    function copyToClipboard(text, field) {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2500);
    }

    const [expandedGroups, setExpandedGroups] = useState({ sales: true, purchase: true });

    const isStaff = auth?.user?.is_staff || auth?.user?.role === "staff";

    // Auto-expand group if current path matches any of its children
    useEffect(() => {
        navigationConfig.forEach((item) => {
            if (item.type === "group" && item.children) {
                const isChildActive = item.children.some(
                    (child) =>
                        currentPath === child.href ||
                        currentPath.startsWith(child.href + "/") ||
                        (child.altHrefs && child.altHrefs.some((alt) => currentPath === alt || currentPath.startsWith(alt + "/")))
                );
                if (isChildActive) {
                    setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
                }
            }
        });
    }, [currentPath]);

    const toggleGroup = (groupId) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

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

    function handleLogout() {
        router.post("/logout");
    }

    return (
        <div className="app-shell">
            {sidebarOpen && (
                <div
                    className="drawer-overlay"
                    style={{ zIndex: 1040 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-logo">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src="/images/vama-mark.svg" alt="Vama" width={34} height={34} style={{ borderRadius: 8, display: "block" }} />
                        <div>
                            <div className="sidebar-logo-text" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                                Vama Invoice
                            </div>
                            <div className="sidebar-logo-sub" style={{ color: "var(--accent)", fontWeight: 500 }}>
                                {isStaff ? "Staff Portal" : "powered by Vama labs"}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost btn-icon sidebar-close-btn"
                        onClick={() => setSidebarOpen(false)}
                        title="Close navigation menu"
                        aria-label="Close navigation menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Main Menu</div>
                    {navigationConfig.map((item) => {
                        if (item.hideForStaff && isStaff) {
                            return null;
                        }

                        if (item.type === "item") {
                            const Icon = item.icon;
                            const isActive = currentPath === item.href || currentPath.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-link ${isActive ? "active" : ""}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon size={16} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        }

                        if (item.type === "group") {
                            const GroupIcon = item.icon;
                            const isExpanded = !!expandedGroups[item.id];
                            const hasActiveChild = item.children.some(
                                (c) =>
                                    currentPath === c.href ||
                                    currentPath.startsWith(c.href + "/") ||
                                    (c.altHrefs && c.altHrefs.some((alt) => currentPath === alt || currentPath.startsWith(alt + "/")))
                            );

                            return (
                                <div key={item.id} className="nav-group-container" style={{ marginBottom: 4 }}>
                                    <button
                                        type="button"
                                        className={`nav-group-header ${hasActiveChild ? "group-has-active" : ""}`}
                                        onClick={() => toggleGroup(item.id)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            width: "100%",
                                            padding: "8px 12px",
                                            borderRadius: "var(--radius-sm, 6px)",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: hasActiveChild ? "var(--accent)" : "var(--text-secondary)",
                                            background: hasActiveChild ? "rgba(99, 102, 241, 0.05)" : "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <GroupIcon size={16} />
                                            <span>{item.label}</span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown size={14} style={{ opacity: 0.7 }} />
                                        ) : (
                                            <ChevronRight size={14} style={{ opacity: 0.7 }} />
                                        )}
                                    </button>

                                    {isExpanded && (
                                        <div
                                            className="nav-group-children"
                                            style={{
                                                paddingLeft: 16,
                                                marginTop: 2,
                                                marginBottom: 4,
                                                borderLeft: "2px solid var(--border)",
                                                marginLeft: 18,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 2,
                                            }}
                                        >
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const isChildActive =
                                                    currentPath === child.href ||
                                                    currentPath.startsWith(child.href + "/") ||
                                                    (child.altHrefs && child.altHrefs.some((alt) => currentPath === alt || currentPath.startsWith(alt + "/")));

                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={`nav-link nav-child-link ${isChildActive ? "active" : ""}`}
                                                        onClick={() => setSidebarOpen(false)}
                                                        style={{
                                                            fontSize: 12.5,
                                                            padding: "6px 10px",
                                                        }}
                                                    >
                                                        <ChildIcon size={14} />
                                                        <span>{child.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return null;
                    })}

                    <div className="nav-section-label" style={{ marginTop: 14 }}>Support</div>
                    <button
                        type="button"
                        className="nav-link"
                        onClick={() => {
                            setShowSupportModal(true);
                            setSidebarOpen(false);
                        }}
                        style={{
                            color: "var(--accent)",
                            fontWeight: 600,
                        }}
                    >
                        <Headphones size={16} />
                        Customer Care
                    </button>
                </nav>

                <div className="sidebar-footer">
                    {switchedAdmin ? (
                        <div style={{ padding: "8px 10px", marginBottom: 8, background: "#f8fafc", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#4338ca", textTransform: "uppercase" }}>
                                    🏪 Active Store
                                </div>
                                <span style={{ fontSize: 9.5, background: "#fef08a", color: "#854d0e", fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>
                                    Super Admin
                                </span>
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                                {switchedAdmin.name}
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                                {switchedAdmin.email}
                            </div>
                        </div>
                    ) : (
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
                    )}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <button
                            className="btn btn-ghost btn-icon menu-btn"
                            onClick={() => setSidebarOpen(true)}
                            id="menu-btn"
                            aria-label="Toggle navigation menu"
                            title="Menu"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="topbar-brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <img src="/images/vama-mark.svg" alt="Vama" width={26} height={26} style={{ borderRadius: 6, display: "block" }} />
                            <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                                Vama Invoice
                            </span>
                        </div>
                        {title && (
                            <div className="topbar-title-wrap" style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                <span className="topbar-divider" style={{ color: "var(--border)" }}>/</span>
                                <span className="topbar-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13, fontWeight: 700 }}>
                                    {title}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="topbar-actions">
                        {auth?.user?.role === "super_admin" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <select
                                    className="form-input"
                                    style={{
                                        fontSize: 12,
                                        padding: "4px 8px",
                                        height: 32,
                                        background: switchedAdmin ? "#e0e7ff" : "var(--bg-elevated)",
                                        color: switchedAdmin ? "#312e81" : "var(--text-primary)",
                                        borderColor: switchedAdmin ? "#6366f1" : "var(--border)",
                                        fontWeight: 600,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        maxWidth: 220,
                                    }}
                                    value={switchedAdmin?.id || 0}
                                    onChange={(e) => {
                                        router.post("/super-admin/switch-admin", { admin_id: Number(e.target.value) });
                                    }}
                                    title="Switch Store View"
                                >
                                    <option value={0}>🛡️ Root View (No Store)</option>
                                    {adminStores?.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            🏪 {s.name} ({s.email})
                                        </option>
                                    ))}
                                </select>
                                {switchedAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => router.post("/super-admin/switch-admin", { admin_id: 0 })}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: "#fee2e2",
                                            color: "#b91c1c",
                                            border: "1px solid #fca5a5",
                                            borderRadius: 6,
                                            padding: "3px 8px",
                                            cursor: "pointer",
                                            height: 32,
                                            display: "inline-flex",
                                            alignItems: "center",
                                        }}
                                        title="Return to Super Admin root view"
                                    >
                                        Exit Store
                                    </button>
                                )}
                            </div>
                        ) : switchedAdmin ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#312e81", background: "#e0e7ff", padding: "4px 10px", borderRadius: 20 }}>
                                    🏪 {switchedAdmin.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => router.post("/super-admin/switch-admin", { admin_id: 0 })}
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: "#fee2e2",
                                        color: "#b91c1c",
                                        border: "1px solid #fca5a5",
                                        borderRadius: 6,
                                        padding: "3px 8px",
                                        cursor: "pointer"
                                    }}
                                    title="Return to Super Admin root view"
                                >
                                    Exit Store
                                </button>
                            </div>
                        ) : (
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                {auth?.user?.name}
                            </span>
                        )}
                    </div>
                </div>

                {switchedAdmin && (
                    <div
                        style={{
                            background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
                            color: "#fff",
                            padding: "10px 20px",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 12,
                            borderBottom: "1px solid rgba(255,255,255,0.15)",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16 }}>🏪</span>
                                <span>
                                    <strong>Managing Store:</strong> <span style={{ color: "#facc15", fontWeight: 700 }}>{switchedAdmin.name}</span> ({switchedAdmin.email})
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                                <Link
                                    href="/invoices"
                                    style={{
                                        background: currentPath === "/invoices" ? "#4f46e5" : "rgba(255,255,255,0.15)",
                                        color: "#fff",
                                        padding: "4px 10px",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <Receipt size={13} /> Invoices
                                </Link>
                                <Link
                                    href="/inventory"
                                    style={{
                                        background: currentPath === "/inventory" ? "#4f46e5" : "rgba(255,255,255,0.15)",
                                        color: "#fff",
                                        padding: "4px 10px",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <Package size={13} /> Inventory
                                </Link>
                                <Link
                                    href="/purchase"
                                    style={{
                                        background: currentPath === "/purchase" ? "#4f46e5" : "rgba(255,255,255,0.15)",
                                        color: "#fff",
                                        padding: "4px 10px",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <ShoppingCart size={13} /> Purchase
                                </Link>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.post("/super-admin/switch-admin", { admin_id: 0 })}
                            style={{
                                background: "#facc15",
                                color: "#1e1b4b",
                                fontWeight: 700,
                                fontSize: 12,
                                padding: "5px 14px",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                            }}
                        >
                            Exit Store &amp; Return to Super Admin
                        </button>
                    </div>
                )}

                <div className="page-content">{children}</div>

                <footer className="app-footer">
                    &copy; {new Date().getFullYear()} <strong>Vama Invoice</strong> &middot; Powered by{" "}
                    <a href="https://vamalabs.in" target="_blank" rel="noopener noreferrer" className="footer-link">
                        Vama labs
                    </a>
                </footer>
            </div>

            <Toast flash={flash} />

            {/* ─── Customer Care Support Modal ─── */}
            {showSupportModal && (
                <div
                    className="modal-overlay"
                    style={{ zIndex: 99999, padding: "16px" }}
                    onClick={() => setShowSupportModal(false)}
                >
                    <div
                        className="modal-box"
                        style={{
                            maxWidth: 440,
                            width: "100%",
                            padding: 0,
                            overflow: "hidden",
                            borderRadius: 16,
                            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Banner */}
                        <div
                            style={{
                                padding: "20px 22px 18px",
                                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: "rgba(255, 255, 255, 0.2)",
                                        backdropFilter: "blur(4px)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#ffffff",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Headphones size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                                        Customer Care & Support
                                    </h3>
                                    <p style={{ fontSize: 12, opacity: 0.85, margin: "3px 0 0", fontWeight: 400 }}>
                                        Vama Labs Assistance Desk
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSupportModal(false)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.15)",
                                    border: "none",
                                    color: "#ffffff",
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div
                            style={{
                                padding: "20px 22px",
                                background: "var(--bg-surface)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 14,
                            }}
                        >
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                                Need help with invoices, inventory, or your account? Get in touch with our support team:
                            </p>

                            {/* Phone Card */}
                            <div
                                style={{
                                    padding: "12px 14px",
                                    borderRadius: 12,
                                    background: "var(--bg-base)",
                                    border: "1px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 10,
                                            background: "#ecfdf5",
                                            color: "#059669",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Phone size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                            Customer Care Number
                                        </div>
                                        <a
                                            href="tel:+917982825289"
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "var(--text-primary)",
                                                textDecoration: "none",
                                                letterSpacing: "0.02em",
                                            }}
                                        >
                                            +91 7982825289
                                        </a>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => copyToClipboard("+917982825289", "phone")}
                                        title="Copy phone number"
                                        style={{ padding: "6px 9px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                                    >
                                        {copiedField === "phone" ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                                        {copiedField === "phone" ? "Copied" : "Copy"}
                                    </button>
                                    <a
                                        href="tel:+917982825289"
                                        className="btn btn-sm btn-primary"
                                        style={{ padding: "6px 12px", fontSize: 12, textDecoration: "none" }}
                                    >
                                        Call
                                    </a>
                                </div>
                            </div>

                            {/* Email Card */}
                            <div
                                style={{
                                    padding: "12px 14px",
                                    borderRadius: 12,
                                    background: "var(--bg-base)",
                                    border: "1px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 10,
                                            background: "#eef2ff",
                                            color: "#4f46e5",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Mail size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                            Customer Care Email
                                        </div>
                                        <a
                                            href="mailto:support@vamalabs.in"
                                            style={{
                                                fontSize: 13.5,
                                                fontWeight: 700,
                                                color: "var(--text-primary)",
                                                textDecoration: "none",
                                                display: "block",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            support@vamalabs.in
                                        </a>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => copyToClipboard("support@vamalabs.in", "email")}
                                        title="Copy email address"
                                        style={{ padding: "6px 9px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                                    >
                                        {copiedField === "email" ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                                        {copiedField === "email" ? "Copied" : "Copy"}
                                    </button>
                                    <a
                                        href="mailto:support@vamalabs.in?subject=Support%20Request%20-%20Vama%20Invoice"
                                        className="btn btn-sm btn-primary"
                                        style={{ padding: "6px 12px", fontSize: 12, textDecoration: "none" }}
                                    >
                                        Email
                                    </a>
                                </div>
                            </div>

                            {/* Helpdesk Notice */}
                            <div
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    background: "#fffbeb",
                                    border: "1px solid #fef3c7",
                                    fontSize: 11.5,
                                    color: "#92400e",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    lineHeight: 1.4,
                                }}
                            >
                                <span>⏰</span>
                                <span>Support Desk: <strong>Mon &ndash; Sat (10:00 AM &ndash; 7:00 PM IST)</strong></span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                padding: "12px 22px",
                                background: "var(--bg-elevated)",
                                borderTop: "1px solid var(--border)",
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowSupportModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
