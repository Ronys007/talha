import { useForm, Link } from "@inertiajs/react";
import AuthLayout from "@/Layouts/AuthLayout";

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });

    function submit(e) {
        e.preventDefault();
        post("/register");
    }

    return (
        <AuthLayout>
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">T</div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">
                        Start managing your inventory
                    </p>
                </div>

                <form
                    onSubmit={submit}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                    }}
                >
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Talha Ahmed"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            autoFocus
                        />
                        {errors.name && (
                            <span className="form-error">{errors.name}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={data.email}
                            onChange={(e) => setData("email", e.target.value)}
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
                            placeholder="Minimum 8 characters"
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

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Repeat password"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData("password_confirmation", e.target.value)
                            }
                        />
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
                        {processing ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <div
                    style={{
                        textAlign: "center",
                        marginTop: 16,
                        fontSize: 13,
                        color: "var(--text-muted)",
                    }}
                >
                    Already have an account?{" "}
                    <Link href="/login" className="auth-link">
                        Sign in
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
