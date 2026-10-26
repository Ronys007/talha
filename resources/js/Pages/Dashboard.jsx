import AppLayout from "@/Layouts/AppLayout";
import { Link, usePage, router } from "@inertiajs/react";
import TableActionDropdown, { ActionItem } from "@/Components/TableActionDropdown";
import {
    ShoppingCart,
    Package,
    FileText,
    TrendingUp,
    AlertCircle,
    Users,
    UserCheck,
    UserX,
    UserPlus,
    Clock,
    Lock,
    Unlock,
    Key,
    Trash2,
    Calendar,
    Shield,
    CheckCircle2,
    AlertTriangle,
    Search,
    RefreshCw,
    X,
    Eye,
    ArrowRightLeft,
    Edit3,
    Store,
    Receipt,
    RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

// ─── Modal: Create Admin Account (Hours-based trial) ──────────────────────────
function CreateAdminModal({ onClose, onSuccess }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [trialPreset, setTrialPreset] = useState("24"); // 1, 6, 12, 24, 48, 72, custom, unlimited
    const [customHours, setCustomHours] = useState("24");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        setProcessing(true);

        let trial_hours = null;
        if (trialPreset === "unlimited") {
            trial_hours = null;
        } else if (trialPreset === "custom") {
            trial_hours = parseFloat(customHours) || null;
        } else {
            trial_hours = parseFloat(trialPreset) || null;
        }

        router.post(
            "/super-admin/admin",
            {
                name,
                email,
                password,
                trial_hours,
            },
            {
                onSuccess: () => {
                    setProcessing(false);
                    onClose();
                    if (onSuccess) onSuccess();
                },
                onError: (errs) => {
                    setProcessing(false);
                    const firstErr = Object.values(errs)[0];
                    setError(firstErr || "Failed to create admin account.");
                },
            }
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div
                className="modal-box"
                style={{ maxWidth: 520, width: "100%", padding: "24px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: "rgba(37, 99, 235, 0.12)",
                                color: "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <UserPlus size={22} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Create Admin Account</h3>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                Assign trial period in hours — automatically locks when hours end
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            fontSize: 13,
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Admin / Client Name <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="e.g. Rahul Sharma"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Email Address (Login Username) <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="email"
                            required
                            className="form-control"
                            placeholder="admin@clientstore.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Temporary Password <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="form-control"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                            Trial Duration in Hours <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                            {[
                                { id: "1", label: "1 Hour" },
                                { id: "6", label: "6 Hours" },
                                { id: "12", label: "12 Hours" },
                                { id: "24", label: "24 Hours (1 Day)" },
                                { id: "48", label: "48 Hours (2 Days)" },
                                { id: "72", label: "72 Hours (3 Days)" },
                                { id: "168", label: "168 Hours (7 Days)" },
                                { id: "unlimited", label: "Unlimited" },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                        background: trialPreset === opt.id ? "#2563eb" : "var(--bg-base)",
                                        color: trialPreset === opt.id ? "#fff" : "var(--text-primary)",
                                        borderColor: trialPreset === opt.id ? "#2563eb" : "var(--border)",
                                        fontWeight: 600,
                                        fontSize: 11.5,
                                        padding: "8px 2px",
                                    }}
                                    onClick={() => setTrialPreset(opt.id)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                            <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <input
                                    type="radio"
                                    name="trialChoice"
                                    checked={trialPreset === "custom"}
                                    onChange={() => setTrialPreset("custom")}
                                />
                                Custom Number of Hours:
                            </label>
                            {trialPreset === "custom" && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <input
                                        type="number"
                                        min={0.1}
                                        step={0.5}
                                        className="form-control"
                                        style={{ width: 110, padding: "4px 8px", fontSize: 13 }}
                                        value={customHours}
                                        onChange={(e) => setCustomHours(e.target.value)}
                                        placeholder="e.g. 5"
                                    />
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>hours</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? "Creating..." : "Create Admin Account"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal: Manage Trial Duration in Hours ────────────────────────────────────
function ManageTrialModal({ admin, onClose, onSuccess }) {
    const [actionType, setActionType] = useState("hours"); // hours, date, unlimited
    const [hours, setHours] = useState(24);
    const [customHoursInput, setCustomHoursInput] = useState("");
    const [customDate, setCustomDate] = useState("");
    const [unlockAccount, setUnlockAccount] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        setProcessing(true);

        const payload = {
            unlock_account: unlockAccount,
        };

        if (actionType === "hours") {
            const h = customHoursInput ? parseFloat(customHoursInput) : hours;
            if (!h || h <= 0) {
                setError("Please enter valid trial hours.");
                setProcessing(false);
                return;
            }
            payload.trial_hours = h;
        } else if (actionType === "date") {
            if (!customDate) {
                setError("Please select a target expiry date and time.");
                setProcessing(false);
                return;
            }
            payload.trial_ends_at = customDate;
        } else if (actionType === "unlimited") {
            payload.trial_hours = null;
            payload.trial_ends_at = null;
        }

        router.post(`/super-admin/trial/${admin.id}`, payload, {
            onSuccess: () => {
                setProcessing(false);
                onClose();
                if (onSuccess) onSuccess();
            },
            onError: (errs) => {
                setProcessing(false);
                const firstErr = Object.values(errs)[0];
                setError(firstErr || "Failed to update trial duration.");
            },
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div
                className="modal-box"
                style={{ maxWidth: 500, width: "100%", padding: "24px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: "rgba(245, 158, 11, 0.12)",
                                color: "#f59e0b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Clock size={22} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Manage Trial Period</h3>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                Set or extend trial hours for <strong>{admin.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            fontSize: 13,
                            marginBottom: 16,
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "var(--bg-base)",
                        border: "1px solid var(--border)",
                        fontSize: 12.5,
                        marginBottom: 16,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>Current Status:</span>
                        <span style={{ fontWeight: 600 }}>
                            {admin.is_locked ? "🔒 Locked" : admin.is_trial_expired ? "⏳ Trial Expired" : "✅ Active"}
                        </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Time Remaining:</span>
                        <span style={{ fontWeight: 600 }}>
                            {admin.trial_remaining_text || (admin.trial_ends_at ? `${admin.hours_left ?? 0}h left` : "Unlimited / Lifetime")}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                            Trial Mode
                        </label>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    flex: 1,
                                    background: actionType === "hours" ? "#2563eb" : "var(--bg-base)",
                                    color: actionType === "hours" ? "#fff" : "var(--text-primary)",
                                    borderColor: actionType === "hours" ? "#2563eb" : "var(--border)",
                                }}
                                onClick={() => setActionType("hours")}
                            >
                                Set Hours From Now
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    flex: 1,
                                    background: actionType === "date" ? "#2563eb" : "var(--bg-base)",
                                    color: actionType === "date" ? "#fff" : "var(--text-primary)",
                                    borderColor: actionType === "date" ? "#2563eb" : "var(--border)",
                                }}
                                onClick={() => setActionType("date")}
                            >
                                Exact Expiry Date
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    flex: 1,
                                    background: actionType === "unlimited" ? "#2563eb" : "var(--bg-base)",
                                    color: actionType === "unlimited" ? "#fff" : "var(--text-primary)",
                                    borderColor: actionType === "unlimited" ? "#2563eb" : "var(--border)",
                                }}
                                onClick={() => setActionType("unlimited")}
                            >
                                Unlimited
                            </button>
                        </div>

                        {actionType === "hours" && (
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                                    {[1, 6, 12, 24, 48, 72].map((h) => (
                                        <button
                                            key={h}
                                            type="button"
                                            className="btn btn-sm"
                                            style={{
                                                background: hours === h && !customHoursInput ? "#16a34a" : "var(--bg-base)",
                                                color: hours === h && !customHoursInput ? "#fff" : "var(--text-primary)",
                                                borderColor: hours === h && !customHoursInput ? "#16a34a" : "var(--border)",
                                                fontWeight: 600,
                                            }}
                                            onClick={() => {
                                                setHours(h);
                                                setCustomHoursInput("");
                                            }}
                                        >
                                            {h} {h === 1 ? "Hour" : "Hours"}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                    <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Or specify hours:</span>
                                    <input
                                        type="number"
                                        min={0.1}
                                        step={0.5}
                                        placeholder="e.g. 10"
                                        className="form-control"
                                        style={{ width: 110, padding: "4px 8px", fontSize: 13 }}
                                        value={customHoursInput}
                                        onChange={(e) => setCustomHoursInput(e.target.value)}
                                    />
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>hours</span>
                                </div>
                            </div>
                        )}

                        {actionType === "date" && (
                            <div style={{ marginTop: 10 }}>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {actionType === "unlimited" && (
                            <p style={{ fontSize: 12.5, color: "#16a34a", marginTop: 8, margin: 0, fontWeight: 500 }}>
                                Account will never lock automatically due to trial expiration.
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={unlockAccount}
                                onChange={(e) => setUnlockAccount(e.target.checked)}
                            />
                            <span>Automatically unlock account right now</span>
                        </label>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? "Updating..." : "Save Trial Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal: Change Admin Password ────────────────────────────────────────────
function ChangePasswordModal({ admin, onClose, onSuccess }) {
    const [password, setPassword] = useState("");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        setProcessing(true);

        router.post(
            `/super-admin/password/${admin.id}`,
            { password },
            {
                onSuccess: () => {
                    setProcessing(false);
                    onClose();
                    if (onSuccess) onSuccess();
                },
                onError: (errs) => {
                    setProcessing(false);
                    const firstErr = Object.values(errs)[0];
                    setError(firstErr || "Failed to update password.");
                },
            }
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div
                className="modal-box"
                style={{ maxWidth: 420, width: "100%", padding: "24px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: "rgba(99, 102, 241, 0.12)",
                                color: "#6366f1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Key size={22} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Reset Admin Password</h3>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                For <strong>{admin.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            fontSize: 13,
                            marginBottom: 16,
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            New Password <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="form-control"
                            placeholder="Enter new password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal: Edit Admin Details (Name & Email) ─────────────────────────────────
function EditAdminModal({ admin, onClose, onSuccess }) {
    const [name, setName] = useState(admin?.name || "");
    const [email, setEmail] = useState(admin?.email || "");
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        setProcessing(true);

        router.put(
            `/super-admin/admin/${admin.id}`,
            { name, email },
            {
                onSuccess: () => {
                    setProcessing(false);
                    onClose();
                    if (onSuccess) onSuccess();
                },
                onError: (errs) => {
                    setProcessing(false);
                    const firstErr = Object.values(errs)[0];
                    setError(firstErr || "Failed to update admin details.");
                },
            }
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div
                className="modal-box"
                style={{ maxWidth: 440, width: "100%", padding: "24px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: "rgba(99, 102, 241, 0.12)",
                                color: "#6366f1",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Edit3 size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Edit Admin Profile</h3>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                Update organization name or email address
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            fontSize: 13,
                            marginBottom: 16,
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Admin / Store Name <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Email Address <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="email"
                            required
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────
export default function Dashboard({
    stats: initialStats = {},
    dateRange = { from: "", to: "" },
    earliestDate: propEarliestDate = "",
    adminData = null,
    isSuperAdmin = false,
    switchedAdmin = null,
    recentPurchases = [],
    recentInventory = [],
    recentInvoices = [],
}) {
    const { auth, switchedAdmin: pageSwitchedAdmin } = usePage().props;
    const effectiveSwitchedAdmin = switchedAdmin || pageSwitchedAdmin;
    const isStaff = auth?.user?.is_staff || auth?.user?.role === "staff";
    const userIsSuper = isSuperAdmin || auth?.user?.role === "super_admin";

    const [currentStats, setCurrentStats] = useState(initialStats);
    const [loading, setLoading] = useState(false);
    const [statsError, setStatsError] = useState("");
    const [fromDate, setFromDate] = useState(dateRange.from || "");
    const [toDate, setToDate] = useState(dateRange.to || "");
    const [datePreset, setDatePreset] = useState(
        dateRange.from && dateRange.from === `${dateRange.from.slice(0, 7)}-01`
            ? "ThisMonth"
            : dateRange.from || dateRange.to ? "Custom" : "All"
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuperAdminHub, setShowSuperAdminHub] = useState(!effectiveSwitchedAdmin);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const effectiveEarliestDate = propEarliestDate || initialStats?.earliestDate || currentStats?.earliestDate || `${currentMonth}-01`;

    useEffect(() => {
        setShowSuperAdminHub(!effectiveSwitchedAdmin);
    }, [effectiveSwitchedAdmin?.id]);

    // Super Admin Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [trialModalAdmin, setTrialModalAdmin] = useState(null);
    const [passwordModalAdmin, setPasswordModalAdmin] = useState(null);
    const [editAdminModal, setEditAdminModal] = useState(null);

    useEffect(() => {
        if (initialStats && Object.keys(initialStats).length > 0) {
            setCurrentStats(initialStats);
        }
    }, [initialStats]);

    useEffect(() => {
        let isMounted = true;
        if (fromDate && toDate && fromDate > toDate) {
            setStatsError("The start date must be on or before the end date.");
            return () => {
                isMounted = false;
            };
        }

        setLoading(true);
        setStatsError("");
        axios
            .get("/dashboard/stats", {
                params: {
                    mode: "standard",
                    from: datePreset === "All" ? undefined : (fromDate || undefined),
                    to: datePreset === "All" ? undefined : (toDate || undefined),
                    all: datePreset === "All" ? 1 : undefined,
                },
            })
            .then((res) => {
                if (isMounted) {
                    setCurrentStats(res.data);
                }
            })
            .catch((error) => {
                if (isMounted) {
                    setStatsError(error?.response?.data?.message || "Unable to load dashboard metrics. Please try again.");
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [effectiveSwitchedAdmin?.id, auth?.user?.id, fromDate, toDate, datePreset]);

    const handleSwitchAdmin = (adminId) => {
        router.post("/super-admin/switch-admin", { admin_id: adminId }, { preserveScroll: true });
    };

    const handleToggleLock = (admin) => {
        const action = admin.is_locked ? "unlock" : "lock";
        if (window.confirm(`Are you sure you want to ${action} ${admin.name}'s account?`)) {
            router.post(`/super-admin/lock/${admin.id}`, {}, { preserveScroll: true });
        }
    };

    const handleDeleteAdmin = (admin) => {
        if (window.confirm(`Are you sure you want to permanently delete admin account "${admin.name}" (${admin.email})?`)) {
            router.delete(`/super-admin/admin/${admin.id}`, { preserveScroll: true });
        }
    };

    // Filter admins based on search input
    const adminsList = adminData?.admins || [];
    const filteredAdmins = adminsList.filter((a) => {
        const q = searchQuery.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    });

    // ─── Stats Grid Cards (Purchase Box added BEFORE Inventory) ───
    const standardCards = [
        {
            label: "Total Purchases",
            value: Number(currentStats.totalPurchases ?? 0).toLocaleString("en-IN"),
            icon: <ShoppingCart size={20} />,
            color: "#0284c7",
            bg: "rgba(2, 132, 199, 0.15)",
            href: "/purchase",
            adminOnly: true,
        },
        {
            label: "Inventory Items",
            value: Number(currentStats.totalItems ?? 0).toLocaleString("en-IN"),
            icon: <Package size={20} />,
            color: "#6366f1",
            bg: "rgba(99,102,241,0.15)",
            href: "/inventory",
            adminOnly: true,
        },
        {
            label: "Total Sales",
            value: Number(currentStats.totalSalesCount ?? currentStats.totalOrders ?? 0).toLocaleString("en-IN"),
            icon: <FileText size={20} />,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.15)",
            href: "/invoices",
            adminOnly: false,
        },
        {
            label: "Total Revenue",
            value: `₹${Number(currentStats.totalRevenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <TrendingUp size={20} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.15)",
            href: "/invoices",
            adminOnly: true,
        },
        {
            label: "Pending Balance",
            value: `₹${Number(currentStats.pendingBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <AlertCircle size={20} />,
            color: "#ef4444",
            bg: "rgba(239,68,68,0.15)",
            href: "/invoices",
            adminOnly: true,
        },
    ];

    const cards = isStaff
        ? standardCards.filter((c) => !c.adminOnly)
        : standardCards;

    return (
        <AppLayout title={effectiveSwitchedAdmin ? `Store Dashboard: ${effectiveSwitchedAdmin.name}` : "Dashboard"}>
            {/* ─── Active Store Management Hero Banner (When switched to an Admin) ─── */}
            {effectiveSwitchedAdmin && (
                <div
                    className="responsive-banner"
                    style={{
                        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
                        borderRadius: 16,
                        padding: "clamp(14px, 2.2vw, 22px)",
                        color: "#fff",
                        marginBottom: 20,
                        boxShadow: "0 8px 24px rgba(49, 46, 129, 0.2)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 280px" }}>
                        <div
                            className="responsive-banner-icon"
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 12,
                                background: "rgba(255, 255, 255, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backdropFilter: "blur(8px)",
                                flexShrink: 0,
                            }}
                        >
                            <Store size={24} color="#facc15" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: "clamp(15px, 2vw, 18px)", fontWeight: 800 }}>
                                    🏪 Store Dashboard: {effectiveSwitchedAdmin.name}
                                </span>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 20,
                                        background: "rgba(250, 204, 21, 0.2)",
                                        color: "#fde047",
                                        border: "1px solid rgba(250, 204, 21, 0.3)",
                                    }}
                                >
                                    Managing Store
                                </span>
                            </div>
                            <div className="superadmin-banner-subtitle" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                                You are viewing and managing inventory, sales invoices, and purchases for <strong>{effectiveSwitchedAdmin.email}</strong>.
                            </div>
                        </div>
                    </div>

                    <div className="superadmin-banner-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <Link
                            href="/inventory"
                            className="btn"
                            style={{
                                background: "#fff",
                                color: "#312e81",
                                fontWeight: 700,
                                fontSize: 12.5,
                                padding: "8px 14px",
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                textDecoration: "none",
                            }}
                        >
                            <Package size={15} /> Inventory
                        </Link>
                        <Link
                            href="/invoices"
                            className="btn"
                            style={{
                                background: "#fff",
                                color: "#312e81",
                                fontWeight: 700,
                                fontSize: 12.5,
                                padding: "8px 14px",
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                textDecoration: "none",
                            }}
                        >
                            <FileText size={15} /> Invoices
                        </Link>
                        <Link
                            href="/purchase"
                            className="btn"
                            style={{
                                background: "#fff",
                                color: "#312e81",
                                fontWeight: 700,
                                fontSize: 12.5,
                                padding: "8px 14px",
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                textDecoration: "none",
                            }}
                        >
                            <ShoppingCart size={15} /> Purchases
                        </Link>
                        {userIsSuper && (
                            <button
                                type="button"
                                onClick={() => setShowSuperAdminHub(!showSuperAdminHub)}
                                className="btn"
                                style={{
                                    background: showSuperAdminHub ? "#facc15" : "rgba(255, 255, 255, 0.2)",
                                    color: showSuperAdminHub ? "#1e1b4b" : "#fff",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: "none",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <Shield size={14} /> {showSuperAdminHub ? "Hide Admin Table" : "Manage Client Admins"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleSwitchAdmin(0)}
                            className="btn"
                            style={{
                                background: "rgba(239, 68, 68, 0.2)",
                                color: "#fca5a5",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                fontWeight: 600,
                                fontSize: 12,
                                padding: "8px 12px",
                                borderRadius: 8,
                                cursor: "pointer",
                            }}
                        >
                            Exit Store
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Super Admin Control Hub (Rendered when toggled or in root mode) ─── */}
            {userIsSuper && showSuperAdminHub && (
                <div style={{ marginBottom: 30 }}>
                    {/* Super Admin Hero Banner */}
                    <div
                        className="responsive-banner superadmin-banner"
                        style={{
                            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
                            borderRadius: 16,
                            padding: "clamp(14px, 2.2vw, 22px)",
                            color: "#fff",
                            marginBottom: 20,
                            boxShadow: "0 10px 25px rgba(49, 46, 129, 0.25)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 280px" }}>
                            <div
                                className="responsive-banner-icon"
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(255, 255, 255, 0.15)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backdropFilter: "blur(8px)",
                                    flexShrink: 0,
                                }}
                            >
                                <Shield size={26} color="#facc15" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "clamp(15px, 2vw, 18px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
                                        Super Admin Command Center
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: "2px 8px",
                                            borderRadius: 20,
                                            background: "rgba(250, 204, 21, 0.2)",
                                            color: "#fde047",
                                            border: "1px solid rgba(250, 204, 21, 0.3)",
                                        }}
                                    >
                                        Root Access
                                    </span>
                                </div>
                                <div className="superadmin-banner-subtitle" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                                    Switch between any client store to check inventory, bills &amp; purchases, and manage hourly trials.
                                </div>
                            </div>
                        </div>

                        {/* Top Action Buttons & Store Switcher Dropdown */}
                        <div className="superadmin-banner-actions" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            {/* Fast Store Switcher */}
                            <div className="superadmin-store-switcher-box" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 10, backdropFilter: "blur(8px)" }}>
                                <ArrowRightLeft size={16} color="#facc15" />
                                <span className="superadmin-switcher-label" style={{ fontSize: 12.5, fontWeight: 600 }}>Viewing Store:</span>
                                <select
                                    value={switchedAdmin?.id || 0}
                                    onChange={(e) => handleSwitchAdmin(e.target.value)}
                                    style={{
                                        background: "#fff",
                                        color: "#1e1b4b",
                                        fontWeight: 700,
                                        fontSize: 12.5,
                                        padding: "6px 10px",
                                        borderRadius: 8,
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    <option value={0}>👑 Super Admin Root Store</option>
                                    {adminsList.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            🏪 {a.name} ({a.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                className="btn superadmin-create-admin-btn"
                                onClick={() => setCreateModalOpen(true)}
                                style={{
                                    background: "#fff",
                                    color: "#312e81",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    padding: "9px 18px",
                                    borderRadius: 10,
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <UserPlus size={16} /> + Create Admin
                            </button>
                        </div>
                    </div>

                    {/* Super Admin Metric Cards */}
                    <div className="stats-grid" style={{ marginBottom: 16 }}>
                        <div className="stat-card">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <div className="stat-label">
                                        Total Client Admins
                                    </div>
                                    <div className="stat-value">
                                        {adminData?.totalAdmins ?? 0}
                                    </div>
                                </div>
                                <div
                                    className="stat-icon"
                                    style={{
                                        background: "rgba(37, 99, 235, 0.12)",
                                        color: "#2563eb",
                                    }}
                                >
                                    <Users size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
                                Total administrator accounts registered
                            </div>
                        </div>

                        <div className="stat-card">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <div className="stat-label">
                                        Active Accounts
                                    </div>
                                    <div className="stat-value" style={{ color: "#16a34a" }}>
                                        {adminData?.activeAdmins ?? 0}
                                    </div>
                                </div>
                                <div
                                    className="stat-icon"
                                    style={{
                                        background: "rgba(22, 163, 74, 0.12)",
                                        color: "#16a34a",
                                    }}
                                >
                                    <UserCheck size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
                                Active trial hours or lifetime access
                            </div>
                        </div>

                        <div className="stat-card">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <div className="stat-label">
                                        Locked / Expired Trials
                                    </div>
                                    <div className="stat-value" style={{ color: "#dc2626" }}>
                                        {adminData?.lockedAdmins ?? 0}
                                    </div>
                                </div>
                                <div
                                    className="stat-icon"
                                    style={{
                                        background: "rgba(220, 38, 38, 0.12)",
                                        color: "#dc2626",
                                    }}
                                >
                                    <UserX size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
                                Auto-locked due to expired hours or manual lock
                            </div>
                        </div>
                    </div>

                    {/* Admin Management Table */}
                    <div className="card responsive-card" style={{ overflow: "hidden" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 14,
                                marginBottom: 18,
                            }}
                        >
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                                    Administrator Accounts ({filteredAdmins.length})
                                </h3>
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "3px 0 0" }}>
                                    Switch into any admin store, manage hourly trials, or control login locking
                                </p>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ position: "relative", minWidth: 220 }}>
                                    <Search
                                        size={15}
                                        style={{
                                            position: "absolute",
                                            left: 10,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            color: "var(--text-muted)",
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="form-control"
                                        style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
                                    />
                                </div>
                            </div>
                        </div>

                        {filteredAdmins.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "36px 16px",
                                    color: "var(--text-muted)",
                                    background: "var(--bg-base)",
                                    borderRadius: 12,
                                    border: "1px dashed var(--border)",
                                }}
                            >
                                <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                    {searchQuery ? "No matching admins found" : "No client admin accounts yet"}
                                </div>
                                <div style={{ fontSize: 12.5, marginTop: 4 }}>
                                    {searchQuery
                                        ? "Try adjusting your search terms."
                                        : "Click '+ Create Admin' above to set up your first client admin with hourly trial."}
                                </div>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                                            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>ADMIN / CLIENT</th>
                                            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>CREATED</th>
                                            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>TRIAL TIME LEFT</th>
                                            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>STATUS</th>
                                            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAdmins.map((admin) => {
                                            const isLocked = admin.is_locked || admin.is_trial_expired;
                                            const isCurrentlyViewing = switchedAdmin?.id === admin.id;

                                            return (
                                                <tr
                                                    key={admin.id}
                                                    style={{
                                                        borderBottom: "1px solid var(--border)",
                                                        background: isCurrentlyViewing
                                                            ? "rgba(49, 46, 129, 0.05)"
                                                            : isLocked
                                                            ? "rgba(239, 68, 68, 0.02)"
                                                            : "transparent",
                                                    }}
                                                >
                                                    <td style={{ padding: "12px 12px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                            <div
                                                                style={{
                                                                    width: 36,
                                                                    height: 36,
                                                                    borderRadius: 10,
                                                                    background: isCurrentlyViewing
                                                                        ? "#312e81"
                                                                        : isLocked
                                                                        ? "rgba(239, 68, 68, 0.12)"
                                                                        : "rgba(37, 99, 235, 0.12)",
                                                                    color: isCurrentlyViewing
                                                                        ? "#fff"
                                                                        : isLocked
                                                                        ? "#ef4444"
                                                                        : "#2563eb",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontWeight: 700,
                                                                    fontSize: 14,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                {admin.name?.[0]?.toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                    <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)" }}>
                                                                        {admin.name}
                                                                    </span>
                                                                    {isCurrentlyViewing && (
                                                                        <span
                                                                            style={{
                                                                                fontSize: 10.5,
                                                                                fontWeight: 700,
                                                                                background: "#312e81",
                                                                                color: "#fde047",
                                                                                padding: "1px 6px",
                                                                                borderRadius: 4,
                                                                            }}
                                                                        >
                                                                            Active Store
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                                                    {admin.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td style={{ padding: "12px 12px", fontSize: 12.5, color: "var(--text-muted)" }}>
                                                        {admin.created_at || "—"}
                                                    </td>

                                                    <td style={{ padding: "12px 12px" }}>
                                                        {admin.trial_ends_at ? (
                                                            <div>
                                                                {admin.is_trial_expired ? (
                                                                    <span
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: 4,
                                                                            padding: "3px 8px",
                                                                            borderRadius: 6,
                                                                            background: "#fee2e2",
                                                                            color: "#b91c1c",
                                                                            fontSize: 11.5,
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        <AlertTriangle size={13} /> Expired Lock
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: 4,
                                                                            padding: "3px 8px",
                                                                            borderRadius: 6,
                                                                            background: "#e0e7ff",
                                                                            color: "#3730a3",
                                                                            fontSize: 11.5,
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        <Clock size={13} /> {admin.trial_remaining_text || `${admin.hours_left ?? 0}h left`}
                                                                    </span>
                                                                )}
                                                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                                                                    Ends: {admin.trial_ends_at}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    padding: "3px 8px",
                                                                    borderRadius: 6,
                                                                    background: "#dcfce7",
                                                                    color: "#15803d",
                                                                    fontSize: 11.5,
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <CheckCircle2 size={13} /> Unlimited / Lifetime
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td style={{ padding: "12px 12px" }}>
                                                        {admin.is_locked ? (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    padding: "3px 8px",
                                                                    borderRadius: 6,
                                                                    background: "#fee2e2",
                                                                    color: "#b91c1c",
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <Lock size={12} /> Locked
                                                            </span>
                                                        ) : admin.is_trial_expired ? (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    padding: "3px 8px",
                                                                    borderRadius: 6,
                                                                    background: "#fef3c7",
                                                                    color: "#b45309",
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <Clock size={12} /> Hours Expired
                                                            </span>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    padding: "3px 8px",
                                                                    borderRadius: 6,
                                                                    background: "#dcfce7",
                                                                    color: "#15803d",
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <CheckCircle2 size={12} /> Active
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                                        <TableActionDropdown label="Actions" align="right">
                                                            {isCurrentlyViewing ? (
                                                                <ActionItem
                                                                    icon={X}
                                                                    label="Exit Store"
                                                                    onClick={() => handleSwitchAdmin(0)}
                                                                    primary
                                                                />
                                                            ) : (
                                                                <ActionItem
                                                                    icon={Eye}
                                                                    label="View Store"
                                                                    onClick={() => handleSwitchAdmin(admin.id)}
                                                                    primary
                                                                />
                                                            )}

                                                            <ActionItem
                                                                icon={admin.is_locked ? Unlock : Lock}
                                                                label={admin.is_locked ? "Unlock Account" : "Lock Account"}
                                                                onClick={() => handleToggleLock(admin)}
                                                            />

                                                            <ActionItem
                                                                icon={Clock}
                                                                label="Manage Hours"
                                                                onClick={() => setTrialModalAdmin(admin)}
                                                            />

                                                            <ActionItem
                                                                icon={Edit3}
                                                                label="Edit Admin"
                                                                onClick={() => setEditAdminModal(admin)}
                                                            />

                                                            <ActionItem
                                                                icon={Key}
                                                                label="Change Password"
                                                                onClick={() => setPasswordModalAdmin(admin)}
                                                            />

                                                            <ActionItem
                                                                icon={Trash2}
                                                                label="Delete Account"
                                                                onClick={() => handleDeleteAdmin(admin)}
                                                                danger
                                                            />
                                                        </TableActionDropdown>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Store Performance Stats Grid ─── */}
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                        {effectiveSwitchedAdmin ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#312e81" }}>
                                🏪 Store Metrics: <u>{effectiveSwitchedAdmin.name}</u>
                            </span>
                        ) : (
                            "Store Metrics Overview"
                        )}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                        {effectiveSwitchedAdmin
                            ? `Showing data exclusively for admin: ${effectiveSwitchedAdmin.email}`
                            : "Summary of inventory, sales invoices, and supplier purchases"}
                    </p>
                </div>
                {effectiveSwitchedAdmin && (
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSwitchAdmin(0)}
                        style={{ fontSize: 12 }}
                    >
                        Switch Back to Root Super Admin
                    </button>
                )}
            </div>

            <div className="purchase-date-filter-bar" style={{ marginBottom: 14 }}>
                <div className="date-filter-left">
                    <span className="date-filter-label">
                        <Calendar size={13} /> Date:
                    </span>
                    <div className="date-presets-wrap">
                        {[
                            ["All", "All Time"],
                            ["Today", "Today"],
                            ["Yesterday", "Yesterday"],
                            ["ThisWeek", "Last 7 Days"],
                            ["ThisMonth", "This Month"],
                        ].map(([preset, label]) => (
                            <button
                                key={preset}
                                type="button"
                                className={`date-preset-btn ${datePreset === preset ? "active" : ""}`}
                                onClick={() => {
                                    const today = getLocalDateString(new Date());
                                    if (preset === "All") {
                                        setFromDate(effectiveEarliestDate);
                                        setToDate(today);
                                    } else if (preset === "Today") {
                                        setFromDate(today);
                                        setToDate(today);
                                    } else if (preset === "Yesterday") {
                                        const yesterday = new Date();
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        const date = getLocalDateString(yesterday);
                                        setFromDate(date);
                                        setToDate(date);
                                    } else if (preset === "ThisWeek") {
                                        const lastWeek = new Date();
                                        lastWeek.setDate(lastWeek.getDate() - 6);
                                        setFromDate(getLocalDateString(lastWeek));
                                        setToDate(today);
                                    } else {
                                        setFromDate(`${currentMonth}-01`);
                                        setToDate(today);
                                    }
                                    setDatePreset(preset);
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="date-filter-right">
                    <div className="date-range-inputs">
                        <div className="date-input-group">
                            <span className="date-input-label">Month:</span>
                            <input
                                aria-label="Select dashboard month"
                                type="month"
                                className="form-input date-picker-input"
                                value={fromDate && toDate && fromDate.slice(0, 7) === toDate.slice(0, 7) ? fromDate.slice(0, 7) : currentMonth}
                                onChange={(event) => {
                                    const month = event.target.value;
                                    if (!month) return;
                                    const [year, monthNumber] = month.split("-").map(Number);
                                    const lastDay = new Date(year, monthNumber, 0).getDate();
                                    const endDate = month === currentMonth
                                        ? getLocalDateString(now)
                                        : `${month}-${String(lastDay).padStart(2, "0")}`;
                                    setFromDate(`${month}-01`);
                                    setToDate(endDate);
                                    setDatePreset(month === currentMonth ? "ThisMonth" : "Custom");
                                }}
                            />
                        </div>
                        <div className="date-input-group">
                            <span className="date-input-label">From:</span>
                            <input
                                type="date"
                                className="form-input date-picker-input"
                                value={fromDate}
                                onChange={(event) => {
                                    setFromDate(event.target.value);
                                    setDatePreset("Custom");
                                }}
                            />
                        </div>
                        <div className="date-input-group">
                            <span className="date-input-label">To:</span>
                            <input
                                type="date"
                                className="form-input date-picker-input"
                                value={toDate}
                                onChange={(event) => {
                                    setToDate(event.target.value);
                                    setDatePreset("Custom");
                                }}
                            />
                        </div>
                        {(fromDate || toDate) && (
                            <button
                                type="button"
                                className="btn btn-secondary date-reset-btn"
                                onClick={() => {
                                    setFromDate(`${currentMonth}-01`);
                                    setToDate(getLocalDateString(now));
                                    setDatePreset("ThisMonth");
                                }}
                                title="Reset date filter to current month"
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {(fromDate || toDate) && (
                <div className="date-filter-indicator-bar">
                    <div className="date-filter-indicator-text">
                        <Calendar size={13} />
                        <span>
                            Dashboard period:{" "}
                            <strong>
                                {datePreset === "All"
                                    ? `All Time (${fromDate ? new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Start"} — ${toDate ? new Date(`${toDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"})`
                                    : `${fromDate ? new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Start"} — ${toDate ? new Date(`${toDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}`}
                            </strong>
                            {" • "}
                            <span>{Number(currentStats.totalSalesCount || 0).toLocaleString("en-IN")} sale{Number(currentStats.totalSalesCount || 0) === 1 ? "" : "s"}</span>
                            {" • "}
                            <span>
                                Period Sales:{" "}
                                <strong>₹{Number(currentStats.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </span>
                        </span>
                    </div>
                </div>
            )}
            {loading && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Updating totals…</div>}
            {statsError && (
                <div role="alert" style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
                    {statsError}
                </div>
            )}

            <div className="stats-grid">
                {cards.map((card) => (
                    <Link
                        href={card.href}
                        key={card.label}
                        style={{ textDecoration: "none" }}
                    >
                        <div
                            className="stat-card"
                            style={{
                                cursor: "pointer",
                                transition: "transform 0.15s",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.transform = "translateY(-2px)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.transform = "")
                            }
                        >
                            <div
                                className="stat-icon"
                                style={{
                                    background: card.bg,
                                    color: card.color,
                                }}
                            >
                                {card.icon}
                            </div>
                            <div className="stat-value">{card.value}</div>
                            {card.breakdown ? (
                                <div className="stat-breakdown-wrap">
                                    {card.breakdown.map(([label, value]) => (
                                        <div key={label} className="stat-breakdown-row">
                                            <span>{label}</span>
                                            <strong>
                                                {card.label === "Total Purchases" || card.label === "Total Sales"
                                                    ? Number(value).toLocaleString("en-IN")
                                                    : `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <div className="stat-label">{card.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ─── Store Quick Previews (When Managing a Switched Admin Store) ─── */}
            {effectiveSwitchedAdmin && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginBottom: 24, marginTop: 16 }}>
                    {/* Recent Purchases of this Store */}
                    <div className="card responsive-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99, 102, 241, 0.12)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <ShoppingCart size={16} />
                                </div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                                    Store Purchase Invoices ({recentPurchases?.length ?? 0})
                                </h3>
                            </div>
                            <Link href="/purchase" className="btn btn-secondary btn-sm" style={{ fontSize: 11.5, padding: "3px 8px" }}>
                                Manage All &rarr;
                            </Link>
                        </div>

                        {(!recentPurchases || recentPurchases.length === 0) ? (
                            <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)", fontSize: 12.5 }}>
                                No purchase invoices uploaded yet for this store.
                                <div style={{ marginTop: 8 }}>
                                    <Link href="/purchase" className="btn btn-primary btn-sm" style={{ fontSize: 11.5 }}>
                                        + Upload First Invoice
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ maxHeight: 250, overflowY: "auto" }}>
                                <table className="table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Supplier</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentPurchases.map((p) => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600 }}>
                                                    <Link href="/purchase" style={{ color: "var(--accent)", textDecoration: "none" }}>
                                                        {p.po_number}
                                                    </Link>
                                                </td>
                                                <td>{p.supplier_name}</td>
                                                <td style={{ fontWeight: 600 }}>₹{parseFloat(p.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                <td>
                                                    <span style={{
                                                        fontSize: 10.5,
                                                        fontWeight: 700,
                                                        padding: "2px 7px",
                                                        borderRadius: 12,
                                                        background: p.status === "Received" ? "#dcfce7" : p.status === "Approved" ? "#e0e7ff" : "#fef3c7",
                                                        color: p.status === "Received" ? "#15803d" : p.status === "Approved" ? "#4338ca" : "#b45309",
                                                    }}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Inventory Items of this Store */}
                    <div className="card responsive-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Package size={16} />
                                </div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                                    Store Inventory Snapshot ({recentInventory?.length ?? 0})
                                </h3>
                            </div>
                            <Link href="/inventory" className="btn btn-secondary btn-sm" style={{ fontSize: 11.5, padding: "3px 8px" }}>
                                Manage All &rarr;
                            </Link>
                        </div>

                        {(!recentInventory || recentInventory.length === 0) ? (
                            <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)", fontSize: 12.5 }}>
                                No items in inventory yet for this store.
                                <div style={{ marginTop: 8 }}>
                                    <Link href="/inventory" className="btn btn-primary btn-sm" style={{ fontSize: 11.5 }}>
                                        + Add Inventory Item
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ maxHeight: 250, overflowY: "auto" }}>
                                <table className="table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th>Item Name</th>
                                            <th>Code</th>
                                            <th>Stock</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentInventory.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600 }}>
                                                    <Link href="/inventory" style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                                                        {item.item}
                                                    </Link>
                                                </td>
                                                <td><span className="badge badge-secondary" style={{ fontSize: 11 }}>{item.code}</span></td>
                                                <td style={{ fontWeight: 600, color: item.qty <= 5 ? "#ef4444" : "var(--text-primary)" }}>
                                                    {item.qty} {item.unit || "PCS"}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>₹{parseFloat(item.selling_price || 0).toLocaleString("en-IN")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent sales invoices */}
                    <div className="card responsive-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <FileText size={16} />
                                </div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                                    Recent Invoices ({recentInvoices?.length ?? 0})
                                </h3>
                            </div>
                            <Link href="/invoices" className="btn btn-secondary btn-sm" style={{ fontSize: 11.5, padding: "3px 8px" }}>
                                Manage All &rarr;
                            </Link>
                        </div>

                        {(!recentInvoices || recentInvoices.length === 0) ? (
                            <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)", fontSize: 12.5 }}>
                                No sales invoices created yet for this store.
                                <div style={{ marginTop: 8 }}>
                                    <Link href="/invoices" className="btn btn-primary btn-sm" style={{ fontSize: 11.5 }}>
                                        + Create First Invoice
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ maxHeight: 250, overflowY: "auto" }}>
                                <table className="table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Customer</th>
                                            <th>Total</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentInvoices.map((invoice) => (
                                            <tr key={invoice.id}>
                                                <td style={{ fontWeight: 600 }}>
                                                    <Link href="/invoices" style={{ color: "var(--accent)", textDecoration: "none" }}>
                                                        {invoice.invoice_number}
                                                    </Link>
                                                </td>
                                                <td>{invoice.customer_name || "Walk-in"}</td>
                                                <td style={{ fontWeight: 600 }}>₹{parseFloat(invoice.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                                    {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("en-IN") : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Lower Grid ─── */}
            <div className="dashboard-grid">
                <div className="card responsive-card">
                    <h3
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 12,
                        }}
                    >
                        Quick Actions
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        {userIsSuper && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ justifyContent: "flex-start", background: "#312e81", borderColor: "#312e81" }}
                                onClick={() => setCreateModalOpen(true)}
                            >
                                <UserPlus size={15} /> Create Admin Account
                            </button>
                        )}
                        <Link
                            href="/invoices"
                            className="btn btn-secondary"
                            style={{ justifyContent: "flex-start" }}
                        >
                            <Receipt size={15} /> Invoices / Generate GST Bill
                        </Link>
                        <Link
                            href="/purchase"
                            className="btn btn-secondary"
                            style={{ justifyContent: "flex-start" }}
                        >
                            <ShoppingCart size={15} /> Purchase Bills / Upload
                        </Link>
                        {!isStaff && (
                            <Link
                                href="/inventory"
                                className="btn btn-secondary"
                                style={{ justifyContent: "flex-start" }}
                            >
                                <Package size={15} /> View Inventory
                            </Link>
                        )}
                        <Link
                            href="/invoices"
                            className="btn btn-secondary"
                            style={{ justifyContent: "flex-start" }}
                        >
                            <FileText size={15} /> View Invoices
                        </Link>
                    </div>
                </div>

                <div className="card responsive-card">
                    <h3
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 12,
                        }}
                    >
                        System Info
                    </h3>
                    <div
                        style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            lineHeight: 1.8,
                        }}
                    >
                        <div>
                            🗓️{" "}
                            {new Date().toLocaleDateString("en-IN", {
                                dateStyle: "full",
                            })}
                        </div>
                        <div>⚡ Vama Invoice &middot; Powered by Vama labs</div>
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Active View:</span>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: effectiveSwitchedAdmin ? "#fef3c7" : userIsSuper ? "#e0e7ff" : "#dcfce7",
                                    color: effectiveSwitchedAdmin ? "#b45309" : userIsSuper ? "#3730a3" : "#15803d",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                }}
                            >
                                {effectiveSwitchedAdmin
                                    ? `Viewing Admin: ${effectiveSwitchedAdmin.name}`
                                    : userIsSuper
                                    ? "👑 Super Admin (Root)"
                                    : isStaff
                                    ? "Staff Member"
                                    : "Store Admin"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Modals ─── */}
            {createModalOpen && (
                <CreateAdminModal
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => {}}
                />
            )}

            {trialModalAdmin && (
                <ManageTrialModal
                    admin={trialModalAdmin}
                    onClose={() => setTrialModalAdmin(null)}
                    onSuccess={() => {}}
                />
            )}

            {passwordModalAdmin && (
                <ChangePasswordModal
                    admin={passwordModalAdmin}
                    onClose={() => setPasswordModalAdmin(null)}
                    onSuccess={() => {}}
                />
            )}

            {editAdminModal && (
                <EditAdminModal
                    admin={editAdminModal}
                    onClose={() => setEditAdminModal(null)}
                    onSuccess={() => {}}
                />
            )}
        </AppLayout>
    );
}
