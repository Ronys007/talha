import React from "react";

/**
 * Official Application Logo for Vama Invoice
 * Supports 'mark' (icon badge only), 'full' (with SaaS typography), and 'invoice' (optimized for printable invoices).
 */
export default function ApplicationLogo({
    size = 40,
    variant = "mark",
    theme = "dark", // 'dark' (for dark sidebars/backgrounds) or 'light' (for light cards/pages)
    showTagline = true,
    tagline = "powered by Vama labs",
    className = "",
    style = {},
}) {
    // Generate unique ID suffix per instance to prevent SVG gradient collision across multiple logos or hidden containers
    const reactId = React.useId ? React.useId().replace(/[^a-zA-Z0-9]/g, "") : "";
    const idSuffix = reactId ? `v-${reactId}` : "v1";

    const markSvg = (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, display: "block" }}
        >
            <defs>
                <linearGradient
                    id={`vama-bg-${idSuffix}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop offset="0%" stopColor="#312e81" />
                    <stop offset="45%" stopColor="#4338ca" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient
                    id={`vama-v-${idSuffix}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#c7d2fe" />
                </linearGradient>
                <linearGradient
                    id={`vama-acc-${idSuffix}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
            </defs>

            {/* Squircle Background */}
            <rect
                width="64"
                height="64"
                rx="16"
                fill={`url(#vama-bg-${idSuffix})`}
            />
            <rect
                x="1"
                y="1"
                width="62"
                height="62"
                rx="15"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.5"
            />

            {/* Invoice Sheet Silhouette */}
            <rect
                x="18"
                y="12"
                width="28"
                height="38"
                rx="4"
                fill="rgba(255,255,255,0.1)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.2"
            />

            {/* Folded Document Corner */}
            <path
                d="M38 12 L46 20 H40 C38.9 20 38 19.1 38 18 V12 Z"
                fill="rgba(255,255,255,0.25)"
            />

            {/* Invoice Item Lines */}
            <line
                x1="23"
                y1="21"
                x2="34"
                y2="21"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <line
                x1="23"
                y1="26"
                x2="41"
                y2="26"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.8"
                strokeLinecap="round"
            />

            {/* Overlapping Sharp "V" + Velocity Flow */}
            <path
                d="M16 22 L31.2 46.5 C31.6 47.1 32.4 47.1 32.8 46.5 L48 22"
                stroke={`url(#vama-v-${idSuffix})`}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M22 25 L32 41 L42 25"
                stroke={`url(#vama-acc-${idSuffix})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Data Spark Nodes */}
            <circle cx="16" cy="22" r="2.8" fill="#38bdf8" />
            <circle cx="48" cy="22" r="2.8" fill="#ffffff" />
            <circle cx="32" cy="46" r="2.2" fill="#38bdf8" />
        </svg>
    );

    if (variant === "mark") {
        return (
            <div
                className={`vama-logo-mark ${className}`}
                style={{ display: "inline-flex", alignItems: "center", ...style }}
            >
                {markSvg}
            </div>
        );
    }

    if (variant === "invoice") {
        return (
            <div
                className={`vama-invoice-logo ${className}`}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    ...style,
                }}
            >
                {markSvg}
                <div>
                    <div
                        style={{
                            fontSize: Math.round(size * 0.44),
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.15,
                            color: "#1e1b4b",
                        }}
                    >
                        Vama <span style={{ color: "#4f46e5" }}>Invoice</span>
                    </div>
                    {showTagline && (
                        <div
                            style={{
                                fontSize: Math.max(10, Math.round(size * 0.22)),
                                color: "#64748b",
                                fontWeight: 500,
                                marginTop: 2,
                            }}
                        >
                            {tagline}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default 'full' variant
    const isDark = theme === "dark";
    return (
        <div
            className={`vama-logo-full ${className}`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: Math.round(size * 0.26),
                textDecoration: "none",
                ...style,
            }}
        >
            {markSvg}
            <div style={{ lineHeight: 1.2 }}>
                <div
                    style={{
                        fontSize: Math.round(size * 0.42),
                        fontWeight: 800,
                        letterSpacing: "-0.025em",
                        color: isDark ? "#ffffff" : "#1e1b4b",
                    }}
                >
                    Vama <span style={{ color: "#6366f1" }}>Invoice</span>
                </div>
                {showTagline && (
                    <div
                        style={{
                            fontSize: Math.max(10, Math.round(size * 0.24)),
                            color: isDark ? "#94a3b8" : "#64748b",
                            fontWeight: 500,
                            marginTop: 1,
                        }}
                    >
                        {tagline}
                    </div>
                )}
            </div>
        </div>
    );
}
