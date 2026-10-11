import { useForm, Link } from "@inertiajs/react";
import AuthLayout from "@/Layouts/AuthLayout";

export default function Login({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    function submit(e) {
        e.preventDefault();
        post("/login");
    }

    return (
        <AuthLayout>
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">T</div>
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">
                        Sign in to Inventory Management System
                    </p>
                </div>

                {status && (
                    <div
                        className="toast toast-success"
                        style={{ marginBottom: 16 }}
                    >
                        {status}
                    </div>
                )}

                <form
                    onSubmit={submit}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                    }}
                >
                    <div className="form-group">
                        <label className="form-label">Email Address or Username</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="talha@gmail.com or Talha"
                            value={data.email}
                            onChange={(e) => setData("email", e.target.value)}
                            autoFocus
                        />
                        {errors.email && (
                            <span className="form-error">{errors.email}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={data.password}
                            onChange={(e) =>
                                setData("password", e.target.value)
                            }
                        />
                        {errors.password && (
                            <span className="form-error">
                                {errors.password}
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <input
                            type="checkbox"
                            id="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData("remember", e.target.checked)
                            }
                            style={{ accentColor: "var(--accent)" }}
                        />
                        <label
                            htmlFor="remember"
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Remember me
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={processing}
                        style={{
                            width: "100%",
                            justifyContent: "center",
                            padding: "11px",
                        }}
                    >
                        {processing ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="auth-divider">
                    <Link href="/forgot-password" className="auth-link">
                        Forgot your password?
                    </Link>
                </div>
                <div
                    style={{
                        textAlign: "center",
                        fontSize: 13,
                        color: "var(--text-muted)",
                    }}
                >
                    Don't have an account?{" "}
                    <Link href="/register" className="auth-link">
                        Register
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
