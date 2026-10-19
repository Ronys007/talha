import { useForm, Head } from "@inertiajs/react";
import { useState } from "react";
import {
    FileText,
    Package,
    ShieldCheck,
    CheckCircle2,
    Eye,
    EyeOff,
    Lock,
    Mail,
    ArrowRight,
    Sparkles,
    Zap,
    TrendingUp,
} from "lucide-react";
import ApplicationLogo from "@/Components/ApplicationLogo";

export default function Login({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    function submit(e) {
        e.preventDefault();
        post("/login");
    }

    return (
        <>
            <Head title="Vama Invoice" />

            <div className="saas-login-container">
                {/* ─── Left Hero Brand Panel ─── */}
                <div className="saas-login-hero">
                    {/* Top Branding Header */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <img
                                src="/images/vama-mark.svg"
                                alt="Vama Invoice"
                                width={44}
                                height={44}
                                style={{
                                    boxShadow: "0 8px 24px rgba(79, 70, 229, 0.45)",
                                    borderRadius: 12,
                                    display: "block",
                                }}
                            />
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                                    Vama Invoice
                                </div>
                                <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                                    <span>powered by</span>
                                    <strong style={{ color: "#e2e8f0" }}>Vama labs</strong>
                                </div>
                            </div>
                        </div>

                        <div className="saas-brand-badge" style={{ marginBottom: 36 }}>
                            <span className="saas-brand-pulse"></span>
                            <span>Next-Gen Enterprise Billing &amp; Inventory</span>
                        </div>

                        <h1
                            style={{
                                fontSize: 36,
                                fontWeight: 800,
                                lineHeight: 1.25,
                                color: "#ffffff",
                                letterSpacing: "-0.03em",
                                maxWidth: 520,
                                marginBottom: 16,
                            }}
                        >
                            Intelligent Invoicing &amp; Real-Time Inventory for Modern Businesses.
                        </h1>
                        <p
                            style={{
                                fontSize: 15,
                                lineHeight: 1.6,
                                color: "#94a3b8",
                                maxWidth: 480,
                                marginBottom: 36,
                            }}
                        >
                            Streamline supplier purchase orders with AI vision OCR, automate customer accounts, and synchronize store inventory across multiple administrators.
                        </p>

                        {/* Feature Highlights */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 460 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "rgba(79, 70, 229, 0.2)",
                                        color: "#818cf8",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                                        AI Vision Invoice OCR
                                    </div>
                                    <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
                                        Upload invoice images or PDFs; auto-extract items, rates, and sync stock in seconds.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "rgba(14, 165, 233, 0.2)",
                                        color: "#38bdf8",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Package size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                                        Real-Time Inventory &amp; Billing
                                    </div>
                                    <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
                                        Instant thermal invoice generation, customer balance ledgers, and fast stock adjustments.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "rgba(16, 185, 129, 0.2)",
                                        color: "#34d399",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                                        Multi-Admin &amp; Automated Trial Protection
                                    </div>
                                    <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
                                        Hours-based client trials with instant auto-locking and root Super Admin oversight.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Mock Invoice Glass Widget */}
                    <div
                        style={{
                            marginTop: 40,
                            padding: "18px 22px",
                            borderRadius: 16,
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            backdropFilter: "blur(12px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            maxWidth: 480,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: "rgba(16, 185, 129, 0.15)",
                                    color: "#10b981",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <CheckCircle2 size={22} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                                    Invoice #VI-2026-894 &middot; ₹64,800.00
                                </div>
                                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                                    Automated Ledger Sync &middot; Status: Paid
                                </div>
                            </div>
                        </div>
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: 20,
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "#34d399",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                            }}
                        >
                            Verified
                        </span>
                    </div>

                    {/* Bottom Security / Credit line */}
                    <div style={{ marginTop: 32, fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 16 }}>
                        <span>🔒 256-bit SSL Encrypted</span>
                        <span>&bull;</span>
                        <span>99.9% Cloud Uptime</span>
                        <span>&bull;</span>
                        <a href="https://vamalabs.in" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", textDecoration: "none" }}>
                            vamalabs.in
                        </a>
                    </div>
                </div>

                {/* ─── Right Form Panel ─── */}
                <div className="saas-login-form-panel">
                    <div style={{ width: "100%", maxWidth: 420 }}>
                        {/* Mobile and Tablet Brand Header */}
                        <div style={{ textAlign: "center", marginBottom: 28 }}>
                            <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                                <img
                                    src="/images/vama-mark.svg"
                                    alt="Vama Invoice"
                                    width={56}
                                    height={56}
                                    style={{
                                        borderRadius: 14,
                                        boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
                                        display: "block",
                                    }}
                                />
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
                                Vama Invoice
                            </h2>
                            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                                powered by <strong style={{ color: "var(--accent)" }}>Vama labs</strong>
                            </div>
                        </div>

                        {/* Title and Subtitle */}
                        <div style={{ marginBottom: 24, textAlign: "left" }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                Sign in to your account
                            </h3>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                                Enter your credentials to access your store portal
                            </p>
                        </div>

                        {/* Flash Status (e.g., account locked message) */}
                        {status && (
                            <div
                                style={{
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    color: "#b91c1c",
                                    fontSize: 13,
                                    marginBottom: 18,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <Lock size={16} /> {status}
                            </div>
                        )}

                        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Email / Username Field */}
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                    Email Address or Username
                                </label>
                                <div style={{ position: "relative" }}>
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 12,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            color: "var(--text-muted)",
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: 38, height: 42, fontSize: 13.5 }}
                                        placeholder="admin@vamalabs.in or Username"
                                        value={data.email}
                                        onChange={(e) => setData("email", e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                {errors.email && (
                                    <div style={{ marginTop: 6 }}>
                                        <span className="form-error" style={{ fontSize: 12.5, color: "#dc2626", display: "block" }}>
                                            {errors.email}
                                        </span>
                                        <a
                                            href="mailto:support@vamalabs.in?subject=Vama%20Invoice%20Trial%20Support%20Request"
                                            style={{
                                                display: "inline-block",
                                                marginTop: 6,
                                                fontSize: 12.5,
                                                fontWeight: 700,
                                                color: "#4f46e5",
                                                textDecoration: "underline",
                                            }}
                                        >
                                            [Contact Vama Labs IT Support ]
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="form-group">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <label className="form-label" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                        Password
                                    </label>
                                </div>
                                <div style={{ position: "relative" }}>
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 12,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            color: "var(--text-muted)",
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-input"
                                        style={{ paddingLeft: 38, paddingRight: 40, height: 42, fontSize: 13.5 }}
                                        placeholder="••••••••••••"
                                        value={data.password}
                                        onChange={(e) => setData("password", e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: "absolute",
                                            right: 10,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            color: "var(--text-muted)",
                                            cursor: "pointer",
                                            padding: 4,
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                        tabIndex={-1}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="form-error" style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>
                                        {errors.password}
                                    </span>
                                )}
                            </div>

                            {/* Remember Me */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 6px" }}>
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData("remember", e.target.checked)}
                                    style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        accentColor: "var(--accent)",
                                    }}
                                />
                                <label
                                    htmlFor="remember"
                                    style={{
                                        fontSize: 13,
                                        color: "var(--text-secondary)",
                                        cursor: "pointer",
                                        userSelect: "none",
                                    }}
                                >
                                    Keep me signed in on this device
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={processing}
                                style={{
                                    height: 44,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    borderRadius: 10,
                                    justifyContent: "center",
                                    background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                                    marginTop: 4,
                                }}
                            >
                                {processing ? (
                                    <span>Verifying credentials...</span>
                                ) : (
                                    <>
                                        Sign in to Dashboard <ArrowRight size={16} />
                                    </>
                                )}
                            </button>

                            <div style={{ textAlign: "center", marginTop: 12 }}>
                                <a
                                    href="mailto:support@vamalabs.in?subject=Vama%20Invoice%20IT%20Support%20Request"
                                    style={{
                                        color: "#4f46e5",
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        textDecoration: "none",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                >
                                    [Contact Vama Labs IT Support]
                                </a>
                            </div>
                        </form>

                        {/* Security Notice Box */}
                        <div
                            style={{
                                marginTop: 24,
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border)",
                                fontSize: 12,
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <ShieldCheck size={18} color="#4f46e5" style={{ flexShrink: 0 }} />
                            <span>
                                Authorized portal access only. Managed &amp; monitored by Vama labs Security Engine.
                            </span>
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                marginTop: 32,
                                textAlign: "center",
                                fontSize: 12,
                                color: "var(--text-muted)",
                            }}
                        >
                            &copy; {new Date().getFullYear()} <strong>Vama Invoice</strong> &middot; Powered by{" "}
                            <a
                                href="https://vamalabs.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                            >
                                Vama labs
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
