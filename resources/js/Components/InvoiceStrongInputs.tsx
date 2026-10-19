import React from "react";

interface StrongNumericInputProps {
    value: number | string;
    onChange: (val: string) => void;
    min?: number;
    max?: number;
    step?: string | number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    hasError?: boolean;
    title?: string;
}

/**
 * Strongly typed numeric input that sanitizes raw input and prevents NaN or string invalid states.
 */
export const StrongNumericInput: React.FC<StrongNumericInputProps> = ({
    value,
    onChange,
    min = 0,
    max,
    step = "any",
    placeholder = "0",
    required = false,
    disabled = false,
    className = "form-input",
    style = {},
    hasError = false,
    title,
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow control / navigation keys
        if (
            [
                "Backspace",
                "Tab",
                "Enter",
                "Delete",
                "Escape",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
            ].includes(e.key)
        ) {
            return;
        }

        // Allow shortcut keys (Ctrl/Cmd + A, C, V, X, Z)
        if (e.ctrlKey || e.metaKey) {
            return;
        }

        // Allow single decimal point
        if (e.key === ".") {
            const currentStr = String(value ?? "");
            if (currentStr.includes(".")) {
                e.preventDefault();
            }
            return;
        }

        // Strictly allow ONLY numeric digits 0-9; block everything else (e, E, letters, symbols, +, -)
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;
        if (raw === "") {
            onChange("");
            return;
        }

        // Strip any alphabetical characters or disallowed symbols strictly
        raw = raw.replace(/[^0-9.]/g, "");

        // Keep only single decimal point
        const parts = raw.split(".");
        if (parts.length > 2) {
            raw = parts[0] + "." + parts.slice(1).join("");
        }

        const num = parseFloat(raw);
        if (!isNaN(num) && max !== undefined && num > max) {
            onChange(String(max));
            return;
        }
        onChange(raw);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasteData = e.clipboardData.getData("text");
        // Sanitize paste data to only numbers and single decimal
        if (/[^0-9.]/.test(pasteData)) {
            e.preventDefault();
            const clean = pasteData.replace(/[^0-9.]/g, "");
            const parts = clean.split(".");
            const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : clean;
            if (sanitized) {
                onChange(sanitized);
            }
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={placeholder}
            value={value ?? ""}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onPaste={handlePaste}
            required={required}
            disabled={disabled}
            title={title}
            className={className}
            style={{
                textAlign: "right",
                borderColor: hasError ? "#ef4444" : undefined,
                backgroundColor: hasError ? "rgba(239, 68, 68, 0.08)" : undefined,
                ...style,
            }}
        />
    );
};

interface DimensionInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
}

/**
 * Dimension input placed near Quantity for optional dimension specifications (e.g., 10x12 ft, 4x8, etc.).
 */
export const DimensionInput: React.FC<DimensionInputProps> = ({
    value,
    onChange,
    placeholder = "e.g. 10x12 ft",
    style = {},
}) => {
    return (
        <input
            type="text"
            className="form-input"
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            style={{
                fontSize: 12.5,
                padding: "7px 8px",
                borderColor: value ? "var(--accent)" : undefined,
                backgroundColor: value ? "rgba(99, 102, 241, 0.04)" : undefined,
                ...style,
            }}
            title="Optional Dimension (e.g., 10x12 ft). When set, Qty will not be shown on the final invoice download."
        />
    );
};
