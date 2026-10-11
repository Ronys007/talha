import { useForm, Link } from "@inertiajs/react";
import AuthLayout from "@/Layouts/AuthLayout";

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: "" });

    function submit(e) {
        e.preventDefault();
        post("/forgot-password");
    }

    return (
        <AuthLayout>
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">T</div>
                    <h1 className="auth-title">Forgot Password?</h1>
                    <p className="auth-subtitle">
                        Enter your email to receive a reset link
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
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={data.email}
                            onChange={(e) => setData("email", e.target.value)}
                            autoFocus
                        />
                        {errors.email && (
                            <span className="form-error">{errors.email}</span>
                        )}
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
                        {processing ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                    <Link href="/login" className="auth-link">
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
