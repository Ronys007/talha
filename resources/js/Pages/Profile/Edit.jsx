import { useForm } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import { User, Mail, Lock, Trash2 } from "lucide-react";

export default function ProfileEdit({ user, status }) {
    const profileForm = useForm({
        name: user.name ?? "",
        email: user.email ?? "",
    });

    const passwordForm = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const deleteForm = useForm({ password: "" });

    function updateProfile(e) {
        e.preventDefault();
        profileForm.patch("/profile");
    }

    function updatePassword(e) {
        e.preventDefault();
        passwordForm.put("/password", {
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

    return (
        <AppLayout title="Profile Settings">
            <div
                style={{
                    maxWidth: 600,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    paddingBottom: 40,
                }}
            >
                {/* Profile Info */}
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
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>
                            Profile Information
                        </h2>
                    </div>

                    {status === "profile-updated" && (
                        <div
                            className="toast toast-success"
                            style={{ marginBottom: 16 }}
                        >
                            ✓ Profile updated successfully.
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

                {/* Update Password */}
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
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>
                            Update Password
                        </h2>
                    </div>

                    {status === "password-updated" && (
                        <div
                            className="toast toast-success"
                            style={{ marginBottom: 16 }}
                        >
                            ✓ Password updated successfully.
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
                                required
                            />
                            {passwordForm.errors.current_password && (
                                <span className="form-error">
                                    {passwordForm.errors.current_password}
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
                            {passwordForm.errors.password && (
                                <span className="form-error">
                                    {passwordForm.errors.password}
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
                                value={passwordForm.data.password_confirmation}
                                onChange={(e) =>
                                    passwordForm.setData(
                                        "password_confirmation",
                                        e.target.value,
                                    )
                                }
                                required
                            />
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
                                disabled={passwordForm.processing}
                            >
                                {passwordForm.processing
                                    ? "Updating..."
                                    : "Update Password"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Danger Zone */}
                <div
                    className="card"
                    style={{ padding: 24, borderColor: "rgba(239,68,68,0.3)" }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 16,
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
                        Once your account is deleted, all data will be
                        permanently removed. This action cannot be undone.
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
                                : "Delete My Account"}
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
