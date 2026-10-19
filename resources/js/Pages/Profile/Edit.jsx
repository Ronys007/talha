import { useForm, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import { User, Mail, Lock, Trash2, Shield, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react";

export default function ProfileEdit({ user, status, isSuperAdmin }) {
    const { flash } = usePage().props;
    const isSuper = isSuperAdmin || user?.role === "super_admin";

    const profileForm = useForm({
        name: user?.name ?? "",
        email: user?.email ?? "",
    });

    const passwordForm = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const deleteForm = useForm({ password: "" });

    function updateProfile(e) {
        e.preventDefault();
        profileForm.patch("/profile", {
            preserveScroll: true,
        });
    }

    function updatePassword(e) {
        e.preventDefault();
        passwordForm.put("/password", {
            errorBag: "updatePassword",
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    }

    function deleteAccount(e) {
        e.preventDefault();
        if (
            confirm(
                "Are you absolutely sure you want to delete your account? This cannot be undone.",
            )
        ) {
            deleteForm.delete("/profile");
        }
    }

    const pwErrors = passwordForm.errors;
    const currentPasswordError = pwErrors.current_password || pwErrors["updatePassword.current_password"];
    const passwordError = pwErrors.password || pwErrors["updatePassword.password"];
    const passwordConfirmationError = pwErrors.password_confirmation || pwErrors["updatePassword.password_confirmation"];

    return (
        <AppLayout title="Profile Settings">
            <div
                style={{
                    maxWidth: 640,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    paddingBottom: 40,
                }}
            >
                {/* Header Title */}
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                        {isSuper ? "Super Admin Account Settings" : "Account Settings"}
                    </h1>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                        {isSuper
                            ? "Manage your Super Admin profile details, credentials, and authentication password."
                            : "Manage your administrator account security and update your login password."}
                    </p>
                </div>

                {/* Status / Flash messages */}
                {(flash?.error) && (
                    <div className="toast toast-danger" style={{ marginBottom: 4 }}>
                        {flash.error}
                    </div>
                )}
                {(flash?.success) && (
                    <div className="toast toast-success" style={{ marginBottom: 4 }}>
                        {flash.success}
                    </div>
                )}

                {/* ─── For Super Admin: Full Profile Information Edit Form ─── */}
                {isSuper ? (
                    <div className="card" style={{ padding: 24 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 20,
                            }}
                        >
                            <div
                                className="stat-icon"
                                style={{
                                    background: "rgba(99,102,241,0.15)",
                                    color: "var(--accent)",
                                }}
                            >
                                <User size={18} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                                    Super Admin Profile Information
                                </h2>
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                    You can update your Super Admin name and primary email address.
                                </p>
                            </div>
                        </div>

                        {status === "profile-updated" && (
                            <div
                                className="toast toast-success"
                                style={{ marginBottom: 16 }}
                            >
                                ✓ Profile details updated successfully.
                            </div>
                        )}

                        <form
                            onSubmit={updateProfile}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 14,
                            }}
                        >
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    className="form-input"
                                    value={profileForm.data.name}
                                    onChange={(e) =>
                                        profileForm.setData("name", e.target.value)
                                    }
                                    required
                                />
                                {profileForm.errors.name && (
                                    <span className="form-error">
                                        {profileForm.errors.name}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={profileForm.data.email}
                                    onChange={(e) =>
                                        profileForm.setData("email", e.target.value)
                                    }
                                    required
                                />
                                {profileForm.errors.email && (
                                    <span className="form-error">
                                        {profileForm.errors.email}
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                }}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={profileForm.processing}
                                >
                                    {profileForm.processing
                                        ? "Saving..."
                                        : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* ─── For Admin: Read-only Account Profile (Email & Name cannot be edited here) ─── */
                    <div className="card" style={{ padding: 22 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 12,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: "linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(99, 102, 241, 0.25) 100%)",
                                        color: "#4338ca",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: 18,
                                        border: "1px solid rgba(99, 102, 241, 0.2)",
                                    }}
                                >
                                    {user?.name?.[0]?.toUpperCase() || "A"}
                                </div>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                                        {user?.name || "Administrator"}
                                    </div>
                                    <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                                        <Mail size={13} /> {user?.email}
                                    </div>
                                </div>
                            </div>

                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 12px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: "rgba(79, 70, 229, 0.1)",
                                    color: "#4338ca",
                                    border: "1px solid rgba(79, 70, 229, 0.2)",
                                }}
                            >
                                <Shield size={13} /> Client Administrator
                            </span>
                        </div>

                        <div
                            style={{
                                marginTop: 16,
                                padding: "10px 14px",
                                background: "rgba(100, 116, 139, 0.06)",
                                borderRadius: 8,
                                fontSize: 12.5,
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                border: "1px solid var(--border)",
                            }}
                        >
                            <span>🔒 Your account email and organization details are managed centrally by the Super Admin. You can change your password below.</span>
                        </div>
                    </div>
                )}

                {/* ─── Update Password Form (Available for both Admin & Super Admin) ─── */}
                <div className="card" style={{ padding: 24 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 20,
                        }}
                    >
                        <div
                            className="stat-icon"
                            style={{
                                background: "rgba(34,197,94,0.15)",
                                color: "var(--success)",
                            }}
                        >
                            <Lock size={18} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                                Update Password
                            </h2>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                                Ensure your account is using a long, random password to stay secure.
                            </p>
                        </div>
                    </div>

                    {status === "password-updated" && (
                        <div
                            className="toast toast-success"
                            style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
                        >
                            <CheckCircle2 size={16} /> Password has been updated successfully.
                        </div>
                    )}

                    <form
                        onSubmit={updatePassword}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        <div className="form-group">
                            <label className="form-label">
                                Current Password
                            </label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordForm.data.current_password}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "current_password",
                                        e.target.value,
                                    )
                                }
                                placeholder="Enter current password"
                                required
                            />
                            {currentPasswordError && (
                                <span className="form-error">
                                    {currentPasswordError}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Min. 8 characters"
                                value={passwordForm.data.password}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "password",
                                        e.target.value,
                                    )
                                }
                                required
                            />
                            {passwordError && (
                                <span className="form-error">
                                    {passwordError}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Re-enter new password"
                                value={passwordForm.data.password_confirmation}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "password_confirmation",
                                        e.target.value,
                                    )
                                }
                                required
                            />
                            {passwordConfirmationError && (
                                <span className="form-error">
                                    {passwordConfirmationError}
                                </span>
                            )}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 6,
                            }}
                        >
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={passwordForm.processing}
                            >
                                <KeyRound size={15} />
                                {passwordForm.processing
                                    ? "Updating..."
                                    : "Update Password"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ─── Delete Account: Only shown for Super Admin (Completely REMOVED for Admin) ─── */}
                {isSuper && (
                    <div
                        className="card"
                        style={{ padding: 24, borderColor: "rgba(239,68,68,0.3)" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                className="stat-icon"
                                style={{
                                    background: "rgba(239,68,68,0.15)",
                                    color: "var(--danger)",
                                }}
                            >
                                <Trash2 size={18} />
                            </div>
                            <h2
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "var(--danger)",
                                    margin: 0,
                                }}
                            >
                                Delete Account
                            </h2>
                        </div>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--text-muted)",
                                marginBottom: 16,
                            }}
                        >
                            Once your Super Admin account is deleted, all associated platform records will be permanently removed.
                        </p>
                        <form onSubmit={deleteAccount}>
                            <div
                                className="form-group"
                                style={{ marginBottom: 14 }}
                            >
                                <label className="form-label">
                                    Confirm your password to delete
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={deleteForm.data.password}
                                    onChange={(e) =>
                                        deleteForm.setData(
                                            "password",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter your password"
                                    required
                                />
                                {deleteForm.errors.password && (
                                    <span className="form-error">
                                        {deleteForm.errors.password}
                                    </span>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="btn btn-danger"
                                disabled={deleteForm.processing}
                            >
                                {deleteForm.processing
                                    ? "Deleting..."
                                    : "Delete Account"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
