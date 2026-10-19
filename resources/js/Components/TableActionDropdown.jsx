import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export default function TableActionDropdown({ label = "Actions", children, align = "right" }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    const toggleOpen = (e) => {
        e.stopPropagation();
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 175;
            let leftPos = align === "right" ? rect.right - menuWidth : rect.left;
            if (leftPos + menuWidth > window.innerWidth - 8) {
                leftPos = window.innerWidth - menuWidth - 8;
            }
            if (leftPos < 8) leftPos = 8;

            setCoords({
                top: rect.bottom + 4,
                left: leftPos,
            });
            setOpen(true);
        } else {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (buttonRef.current && !buttonRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleScroll = () => {
            setOpen(false);
        };

        window.addEventListener("click", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);

        return () => {
            window.removeEventListener("click", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [open]);

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <button
                ref={buttonRef}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={toggleOpen}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                }}
            >
                <span>{label}</span>
                <ChevronDown
                    size={13}
                    style={{
                        transform: open ? "rotate(180deg)" : "none",
                        transition: "transform 0.15s ease",
                    }}
                />
            </button>

            {open &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            top: coords.top,
                            left: coords.left,
                            width: 175,
                            zIndex: 99999,
                            background: "var(--bg-elevated, #ffffff)",
                            border: "1px solid var(--border, #cbd5e1)",
                            borderRadius: 8,
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                            padding: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                        }}
                    >
                        {children}
                    </div>,
                    document.body
                )}
        </div>
    );
}

export function ActionItem({
    icon: Icon,
    label,
    onClick,
    href,
    target,
    download,
    danger,
    primary,
    disabled,
    style = {},
}) {
    const itemStyle = {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 10px",
        fontSize: 12,
        fontWeight: 500,
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderRadius: 5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: danger
            ? "var(--danger, #ef4444)"
            : primary
            ? "var(--accent, #6366f1)"
            : "var(--text-primary, #0f172a)",
        textDecoration: "none",
        boxSizing: "border-box",
        transition: "background 0.12s",
        ...style,
    };

    if (href && !disabled) {
        return (
            <a
                href={href}
                target={target}
                download={download}
                style={itemStyle}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.background = danger
                        ? "#fee2e2"
                        : "var(--bg-hover, rgba(0,0,0,0.05))")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                }
            >
                {Icon && (
                    <Icon
                        size={14}
                        color={danger ? "#ef4444" : primary ? "var(--accent)" : "currentColor"}
                    />
                )}
                <span>{label}</span>
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={itemStyle}
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.currentTarget.style.background = danger
                        ? "#fee2e2"
                        : "var(--bg-hover, rgba(0,0,0,0.05))";
                }
            }}
            onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
            }
        >
            {Icon && (
                <Icon
                    size={14}
                    color={danger ? "#ef4444" : primary ? "var(--accent)" : "currentColor"}
                />
            )}
            <span>{label}</span>
        </button>
    );
}
