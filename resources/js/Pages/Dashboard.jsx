import AppLayout from "@/Layouts/AppLayout";
import { Link, usePage } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import {
    Package,
    FileText,
    TrendingUp,
    AlertCircle,
    Barcode,
    Camera,
    Percent,
    X,
    Trash2,
    CheckCircle2,
    Sparkles,
    Flashlight,
    Printer,
    Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMode } from "@/Context/ModeContext";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import axios from "axios";
import BarcodeSheetModal from "./BarcodeSheetModal";

// ─── Enhanced POS Scanner Sound & Vibration Engine ───────────────────────────
let globalAudioCtx = null;
function getAudioContext() {
    try {
        if (!globalAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) globalAudioCtx = new AudioCtx();
        }
        if (globalAudioCtx && globalAudioCtx.state === "suspended") {
            globalAudioCtx.resume().catch(() => {});
        }
    } catch {}
    return globalAudioCtx;
}

function playScanBeep(isSuccess = true) {
    try {
        // Physical vibration feedback on supported smartphones
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(isSuccess ? 70 : [50, 50, 50]);
        }

        const ctx = getAudioContext();
        if (!ctx) return;

        if (isSuccess) {
            // Bright, crisp retail POS electronic beep (2000Hz -> 2600Hz)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(2000, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } else {
            // Low error warning buzz for not-found items
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(320, ctx.currentTime);

            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        }
    } catch {}
}

// ─── Step 1: Pre-Scan Discount Selection Modal ──────────────────────────────
function DiscountSelectModal({ onSelectOption, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div
                className="modal-box"
                style={{ maxWidth: 440, textAlign: "center", padding: "24px 20px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "rgba(22, 163, 74, 0.15)",
                                color: "#16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Percent size={20} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                                Select Discount Option
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                Choose formula before scanning barcodes
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {/* Price with 2 Card */}
                    <button
                        type="button"
                        onClick={() => onSelectOption(2)}
                        style={{
                            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                            border: "2px solid #3b82f6",
                            borderRadius: 12,
                            padding: "16px 18px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "transform 0.15s, box-shadow 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(59, 130, 246, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: "#2563eb", color: "#fff", padding: "3px 9px", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                                    2
                                </span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a" }}>
                                    Price with 2 (÷ 2)
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 4, fontWeight: 500 }}>
                                Example: ₹200 ➔ <strong>₹100</strong>, ₹300 ➔ <strong>₹150</strong>
                            </div>
                        </div>
                        <div style={{ fontSize: 20, color: "#2563eb", fontWeight: 800 }}>➔</div>
                    </button>

                    {/* Price with 3 Card */}
                    <button
                        type="button"
                        onClick={() => onSelectOption(3)}
                        style={{
                            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                            border: "2px solid #16a34a",
                            borderRadius: 12,
                            padding: "16px 18px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "transform 0.15s, box-shadow 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(22, 163, 74, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: "#16a34a", color: "#fff", padding: "3px 9px", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                                    3
                                </span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>
                                    Price with 3 (÷ 3)
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: "#16a34a", marginTop: 4, fontWeight: 500 }}>
                                Example: ₹300 ➔ <strong>₹100</strong>, ₹600 ➔ <strong>₹200</strong>
                            </div>
                        </div>
                        <div style={{ fontSize: 20, color: "#16a34a", fontWeight: 800 }}>➔</div>
                    </button>

                    {/* Normal (No Disc) */}
                    <button
                        type="button"
                        onClick={() => onSelectOption(1)}
                        style={{
                            background: "var(--bg-base)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "12px 18px",
                            textAlign: "left",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                Standard Price (No Discount)
                            </span>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                View full original selling price
                            </div>
                        </div>
                        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>➔</div>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Step 2: Live Price Checker Camera Scanner ──────────────────────────────
function DashboardPriceScannerModal({ initialDivisor = 2, onClose }) {
    const [divisor, setDivisor] = useState(initialDivisor);
    const [customPercent, setCustomPercent] = useState("");
    const [scannedItems, setScannedItems] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [manualCode, setManualCode] = useState("");
    const [cameraError, setCameraError] = useState(null);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const lastScannedRef = useRef({ code: "", time: 0 });

    // Calculate effective discounted price with divisor (/2, /3, /1) and custom %
    function calculateDiscountedPrice(originalPrice, div, percent) {
        const orig = parseFloat(originalPrice || 0);
        const divisorVal = div === 2 || div === 3 ? div : 1;
        const basePrice = divisorVal > 1 ? orig / divisorVal : orig;
        const pct = parseFloat(percent) || 0;
        if (pct > 0) {
            return Math.max(0, basePrice - (basePrice * pct) / 100);
        }
        return basePrice;
    }

    function renderDiscountBadge(div, pct) {
        const p = parseFloat(pct) || 0;
        const hasDiv = div === 2 || div === 3;
        if (!hasDiv && p <= 0) return null;

        let text = "";
        if (hasDiv && p > 0) {
            text = `÷${div} & -${p}%`;
        } else if (hasDiv) {
            text = `÷ ${div}`;
        } else {
            text = `-${p}% OFF`;
        }

        return (
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: div === 2 ? "#dbeafe" : "#dcfce7",
                    color: div === 2 ? "#1d4ed8" : "#15803d",
                    padding: "1px 6px",
                    borderRadius: 4,
                    display: "inline-block",
                    marginTop: 2,
                }}
            >
                {text}
            </span>
        );
    }

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {}
            scannerRef.current = null;
        }
    };

    const startScanner = async () => {
        setCameraError(null);
        getAudioContext();

        const scannerId = "dashboard-price-barcode-reader";
        const element = document.getElementById(scannerId);
        if (!element) {
            setTimeout(startScanner, 100);
            return;
        }

        try {
            await stopScanner();
            element.innerHTML = "";

            const formatsToSupport = [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.CODABAR,
                Html5QrcodeSupportedFormats.QR_CODE,
            ];

            const scanner = new Html5Qrcode(scannerId, {
                formatsToSupport,
                verbose: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true,
                },
            });
            scannerRef.current = scanner;

            const config = {
                fps: 25,
                disableFlip: false,
            };

            const onScanSuccess = async (decodedText) => {
                const code = decodedText ? decodedText.trim() : "";
                if (!code) return;

                const now = Date.now();
                if (
                    code === lastScannedRef.current.code &&
                    now - lastScannedRef.current.time < 1200
                ) {
                    return;
                }
                if (isProcessingRef.current) return;

                lastScannedRef.current = { code, time: now };
                isProcessingRef.current = true;
                setIsProcessing(true);

                try {
                    await lookupBarcode(code);
                } catch (err) {
                    console.error(err);
                } finally {
                    setTimeout(() => {
                        isProcessingRef.current = false;
                        setIsProcessing(false);
                    }, 400);
                }
            };

            // Attempt 1: Rear / Environment camera (standard for mobile)
            try {
                await scanner.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
            } catch (envErr) {
                // Attempt 2: User/front camera fallback
                try {
                    await scanner.start({ facingMode: "user" }, config, onScanSuccess, () => {});
                } catch (fallbackErr) {
                    throw fallbackErr || envErr;
                }
            }

            setCameraError(null);

            try {
                const capabilities = scanner.getRunningTrackCapabilities?.();
                if (capabilities && capabilities.torch) {
                    setTorchSupported(true);
                }
            } catch {}
        } catch (err) {
            console.error("Barcode camera start error:", err);

            if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
                setCameraError("Camera permission denied. Tap 'Allow' in your browser address bar.");
            } else if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
                setCameraError("Camera requires HTTPS on live websites. Please ensure your site URL starts with https://");
            } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
                setCameraError("No camera found on this device. You can enter barcode code below.");
            } else {
                setCameraError("Camera unavailable. Tap 'Retry Camera' or enter code below.");
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            startScanner();
        }, 120);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, []);

    const toggleTorch = async () => {
        if (!scannerRef.current) return;
        try {
            const next = !torchOn;
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: next }],
            });
            setTorchOn(next);
        } catch {}
    };

    async function lookupBarcode(code) {
        if (!code) return;
        try {
            const res = await axios.get(`/billing/search?mode=barcode&query=${encodeURIComponent(code)}`);
            const items = res.data || [];
            const matched =
                items.find((i) => String(i.code).toLowerCase() === code.toLowerCase()) ||
                items[0];

            if (matched) {
                playScanBeep(true);
                setScannedItems((prev) => {
                    const clean = prev.filter((p) => p.id !== matched.id);
                    return [matched, ...clean];
                });
                setFeedback({
                    success: true,
                    item: matched,
                    text: `✓ Scanned "${matched.item}" (#${matched.code})`,
                });
            } else {
                playScanBeep(false);
                setFeedback({ success: false, text: `Item #${code} not found in inventory.` });
            }
        } catch (e) {
            playScanBeep(false);
            setFeedback({ success: false, text: `Error finding barcode #${code}` });
        }
        setTimeout(() => setFeedback(null), 3000);
    }

    function handleManual(e) {
        e.preventDefault();
        if (!manualCode.trim()) return;
        lookupBarcode(manualCode.trim());
        setManualCode("");
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, padding: 10 }}>
            <div
                className="modal-box"
                style={{
                    maxWidth: 540,
                    width: "100%",
                    maxHeight: "94vh",
                    display: "flex",
                    flexDirection: "column",
                    padding: 0,
                    overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header" style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Barcode size={22} color="#16a34a" />
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                                Barcode Price Scanner
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                Continuous Multi-Item Scanner &amp; Calculator
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {torchSupported && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{
                                    padding: "4px 8px",
                                    fontSize: 11,
                                    gap: 4,
                                    color: torchOn ? "#f59e0b" : "inherit",
                                }}
                                onClick={toggleTorch}
                                title="Toggle Flashlight"
                            >
                                <Flashlight size={14} /> {torchOn ? "Torch On" : "Torch"}
                            </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                    {/* Active Option Switcher Bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                            background: "var(--bg-base)",
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--border)",
                            marginBottom: 10,
                        }}
                    >
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Percent size={14} color="#3b82f6" /> Price / Discount:
                        </span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    background: divisor === 1 ? "#fff" : "transparent",
                                    borderColor: divisor === 1 ? "#94a3b8" : "transparent",
                                    color: divisor === 1 ? "#1e293b" : "var(--text-muted)",
                                    boxShadow: divisor === 1 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                }}
                                onClick={() => setDivisor(1)}
                            >
                                Standard (÷1)
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    background: divisor === 2 ? "#2563eb" : "#fff",
                                    color: divisor === 2 ? "#fff" : "#2563eb",
                                    borderColor: "#2563eb",
                                    boxShadow: divisor === 2 ? "0 2px 6px rgba(37,99,235,0.3)" : "none",
                                }}
                                onClick={() => setDivisor(2)}
                            >
                                Price with 2
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    background: divisor === 3 ? "#16a34a" : "#fff",
                                    color: divisor === 3 ? "#fff" : "#16a34a",
                                    borderColor: "#16a34a",
                                    boxShadow: divisor === 3 ? "0 2px 6px rgba(22,163,74,0.3)" : "none",
                                }}
                                onClick={() => setDivisor(3)}
                            >
                                Price with 3
                            </button>

                            {/* Custom Percentage Input Area */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                    background: "#fff",
                                    border: customPercent && parseFloat(customPercent) > 0 ? "1.5px solid #16a34a" : "1px solid var(--border)",
                                    borderRadius: 6,
                                    padding: "3px 8px",
                                    boxShadow: customPercent && parseFloat(customPercent) > 0 ? "0 0 0 2px rgba(22,163,74,0.18)" : "none",
                                }}
                            >
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: customPercent && parseFloat(customPercent) > 0 ? "#16a34a" : "#64748b" }}>%</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    placeholder="Disc %"
                                    value={customPercent}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                                            setCustomPercent(val);
                                        }
                                    }}
                                    style={{
                                        width: 58,
                                        border: "none",
                                        outline: "none",
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: customPercent && parseFloat(customPercent) > 0 ? "#16a34a" : "var(--text-primary)",
                                        padding: 0,
                                        background: "transparent",
                                    }}
                                />
                                {customPercent !== "" && (
                                    <button
                                        type="button"
                                        onClick={() => setCustomPercent("")}
                                        title="Clear %"
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0,
                                            color: "#94a3b8",
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Camera Scanner View — div is ALWAYS rendered so scanner never unmounts */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            minHeight: "160px",
                            maxHeight: "175px",
                            borderRadius: 10,
                            overflow: "hidden",
                            border: "2px solid #16a34a",
                            background: "#000",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                            marginBottom: 10,
                            display: cameraError ? "none" : "block",
                        }}
                    >
                        <div
                            id="dashboard-price-barcode-reader"
                            style={{ width: "100%", minHeight: "160px" }}
                        />
                    </div>

                    {/* Camera error shown below — never removes scanner div from DOM */}
                    {cameraError && (
                        <div
                            style={{
                                padding: 14,
                                background: "#fee2e2",
                                borderRadius: 10,
                                marginBottom: 10,
                                textAlign: "center",
                            }}
                        >
                            <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                                ⚠️ {cameraError}
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={startScanner}
                                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                            >
                                🔄 Retry Camera Access
                            </button>
                        </div>
                    )}

                    {/* Live Scanned Product Photo & Details Banner */}
                    {feedback && (
                        <div
                            style={{
                                marginTop: 10,
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: feedback.success ? "#f0fdf4" : "#fee2e2",
                                border: `1.5px solid ${feedback.success ? "#86efac" : "#fca5a5"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                animation: "slideDown 0.2s ease",
                            }}
                        >
                            {feedback.success && feedback.item ? (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                        {feedback.item.image ? (
                                            <img
                                                src={feedback.item.image}
                                                alt={feedback.item.item}
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 8,
                                                    objectFit: "cover",
                                                    border: "1.5px solid #16a34a",
                                                    flexShrink: 0,
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 8,
                                                    background: "#dcfce7",
                                                    color: "#16a34a",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 800,
                                                    fontSize: 18,
                                                    border: "1.5px solid #86efac",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {feedback.item.item?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                ✓ Scanned Successfully
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {feedback.item.item}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                #{feedback.item.code} &middot; Stock: {feedback.item.qty}
                                            </div>
                                        </div>
                                    </div>

                                    {(() => {
                                        const origPrice = parseFloat(feedback.item.selling_price || 0);
                                        const finalPrice = calculateDiscountedPrice(origPrice, divisor, customPercent);
                                        const isDiscounted = divisor > 1 || (parseFloat(customPercent) > 0);

                                        return (
                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                {isDiscounted ? (
                                                    <>
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>
                                                            ₹{origPrice.toFixed(2)}
                                                        </div>
                                                        <div style={{ fontSize: 17, fontWeight: 800, color: "#16a34a" }}>
                                                            ₹{finalPrice.toFixed(2)}
                                                        </div>
                                                        {renderDiscountBadge(divisor, customPercent)}
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                                                        ₹{origPrice.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            ) : (
                                <div style={{ color: "#dc2626", fontWeight: 600, fontSize: 13 }}>
                                    {feedback.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Code Entry */}
                    <form onSubmit={handleManual} style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <input
                            className="form-input"
                            placeholder="Type barcode or scan with USB gun..."
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ background: "#16a34a", borderColor: "#16a34a", flexShrink: 0 }}
                        >
                            Check Price
                        </button>
                    </form>

                    {/* Continuous Scanned Items Price List */}
                    <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                Scanned Products ({scannedItems.length})
                            </span>
                            {scannedItems.length > 0 && (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: 11, color: "var(--danger)", padding: "2px 6px" }}
                                    onClick={() => setScannedItems([])}
                                >
                                    <Trash2 size={12} /> Clear List
                                </button>
                            )}
                        </div>

                        {scannedItems.length === 0 ? (
                            <div
                                style={{
                                    padding: "16px",
                                    textAlign: "center",
                                    background: "var(--bg-base)",
                                    borderRadius: 10,
                                    border: "1px dashed var(--border)",
                                    color: "var(--text-muted)",
                                    fontSize: 12.5,
                                }}
                            >
                                <Camera size={24} style={{ opacity: 0.3, margin: "0 auto 6px", display: "block" }} />
                                Point your camera at any product barcode to instantly check its photo &amp; price with your active discount formula. You can scan multiple items continuously!
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {scannedItems.map((prod) => {
                                    const origPrice = parseFloat(prod.selling_price || 0);
                                    const finalPrice = calculateDiscountedPrice(origPrice, divisor, customPercent);
                                    const isDiscounted = divisor > 1 || (parseFloat(customPercent) > 0);

                                    return (
                                        <div
                                            key={prod.id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                background: "var(--bg-base)",
                                                border: "1px solid var(--border)",
                                                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                                {prod.image ? (
                                                    <img
                                                        src={prod.image}
                                                        alt={prod.item}
                                                        style={{
                                                            width: 46,
                                                            height: 46,
                                                            borderRadius: 8,
                                                            objectFit: "cover",
                                                            border: "1px solid var(--border)",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: 46,
                                                            height: 46,
                                                            borderRadius: 8,
                                                            background: "rgba(22,163,74,0.1)",
                                                            color: "#16a34a",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontWeight: 700,
                                                            fontSize: 16,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {prod.item?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {prod.item}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                        #{prod.code} &middot; Stock: {prod.qty}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                                                {isDiscounted ? (
                                                    <>
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>
                                                            ₹{origPrice.toFixed(2)}
                                                        </div>
                                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>
                                                            ₹{finalPrice.toFixed(2)}
                                                        </div>
                                                        {renderDiscountBadge(divisor, customPercent)}
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                                                        ₹{origPrice.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: "10px 16px" }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────
export default function Dashboard({ stats: initialStats = {} }) {
    const { mode } = useMode();
    const isBarcode = mode === "barcode";
    const { data: currentStats = initialStats } = useQuery({
        queryKey: ["dashboard-stats", mode],
        queryFn: async () => {
            const response = await axios.get(`/dashboard/stats?mode=${mode}`);
            return response.data;
        },
        initialData: initialStats.mode === mode ? initialStats : undefined,
        staleTime: 1000 * 30,
    });

    // Scanner state
    const [optionModalOpen, setOptionModalOpen] = useState(false);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [selectedDivisor, setSelectedDivisor] = useState(2);
    const [barcodeSheetOpen, setBarcodeSheetOpen] = useState(false);

    function handleStartScanner() {
        setOptionModalOpen(true);
    }

    function handleOptionChosen(div) {
        setSelectedDivisor(div);
        setOptionModalOpen(false);
        setScannerModalOpen(true);
    }

    const { auth } = usePage().props;
    const isStaff = auth?.user?.is_staff || auth?.user?.role === "staff";

    const allCards = [
        {
            label: `${isBarcode ? "Barcode " : ""}Inventory Items`,
            value: currentStats.totalItems ?? "0",
            icon: <Package size={20} />,
            color: isBarcode ? "#10b981" : "#6366f1",
            bg: isBarcode ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)",
            href: "/inventory",
            adminOnly: true,
        },
        {
            label: `${isBarcode ? "Barcode " : ""}Total Bills`,
            value: currentStats.totalOrders ?? "0",
            icon: <FileText size={20} />,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.15)",
            href: "/billing",
            adminOnly: false,
        },
        {
            label: `${isBarcode ? "Barcode " : ""}Total Revenue`,
            value: currentStats.totalRevenue
                ? `₹${parseFloat(currentStats.totalRevenue).toLocaleString("en-IN")}`
                : "₹0",
            icon: <TrendingUp size={20} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.15)",
            href: "/billing",
            adminOnly: true,
        },
        {
            label: `${isBarcode ? "Barcode " : ""}Pending Balance`,
            value: currentStats.pendingBalance
                ? `₹${parseFloat(currentStats.pendingBalance).toLocaleString("en-IN")}`
                : "₹0",
            icon: <AlertCircle size={20} />,
            color: "#ef4444",
            bg: "rgba(239,68,68,0.15)",
            href: "/billing",
            adminOnly: true,
        },
    ];

    const cards = isStaff
        ? allCards.filter((c) => !c.adminOnly)
        : allCards;

    return (
        <AppLayout title="Dashboard">
            {/* Barcode Price Scanner Hero Banner with Formula Presets */}
            <div
                className="scanner-hero-banner"
                style={{
                    background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    color: "#fff",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 16,
                    boxShadow: "0 10px 25px rgba(22, 163, 74, 0.25)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backdropFilter: "blur(8px)",
                            flexShrink: 0,
                        }}
                    >
                        <Barcode size={26} color="#fff" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
                            Barcode Price Scanner &amp; Formula Discount
                        </div>
                        <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>
                            Scan products with ÷2 / ÷3 / Standard formulas or print/download generated barcodes.
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                        type="button"
                        className="scanner-hero-btn"
                        onClick={() => setBarcodeSheetOpen(true)}
                        style={{
                            background: "rgba(255, 255, 255, 0.2)",
                            color: "#fff",
                            border: "1px solid rgba(255, 255, 255, 0.4)",
                            backdropFilter: "blur(6px)",
                            fontWeight: 700,
                            fontSize: 13,
                            padding: "10px 16px",
                            borderRadius: 10,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            transition: "transform 0.15s, background 0.15s",
                            flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                        }}
                    >
                        <Download size={17} /> Download Barcode
                    </button>

                    <button
                        type="button"
                        className="scanner-hero-btn"
                        onClick={handleStartScanner}
                        style={{
                            background: "#fff",
                            color: "#15803d",
                            fontWeight: 700,
                            fontSize: 13.5,
                            padding: "10px 20px",
                            borderRadius: 10,
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                            transition: "transform 0.15s, box-shadow 0.15s",
                            flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                        }}
                    >
                        <Camera size={18} /> Open Price Scanner
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
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
                                (e.currentTarget.style.transform =
                                    "translateY(-2px)")
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
                            <div className="stat-label">{card.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Dashboard Lower Grid */}
            <div className="dashboard-grid">
                <div className="card" style={{ padding: 24 }}>
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
                        {(isBarcode || isStaff) && (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{
                                        justifyContent: "flex-start",
                                        background: "#16a34a",
                                        borderColor: "#16a34a",
                                    }}
                                    onClick={handleStartScanner}
                                >
                                    <Camera size={15} /> Barcode Price Scanner
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                        justifyContent: "flex-start",
                                        color: "#15803d",
                                        borderColor: "#86efac",
                                        background: "#f0fdf4",
                                        fontWeight: 600,
                                    }}
                                    onClick={() => setBarcodeSheetOpen(true)}
                                >
                                    <Download size={15} /> Download Barcode
                                </button>
                            </>
                        )}
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
                            href="/billing"
                            className="btn btn-secondary"
                            style={{ justifyContent: "flex-start" }}
                        >
                            <FileText size={15} /> View Bills / New Bill
                        </Link>
                    </div>
                </div>
                <div className="card" style={{ padding: 24 }}>
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
                        <div>⚡ Inventory Management System v2.0</div>
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Active Mode:</span>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: isBarcode ? "#dcfce7" : "#dbeafe",
                                    color: isBarcode ? "#15803d" : "#1d4ed8",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                }}
                            >
                                {isBarcode ? "Barcode Scanner Mode" : "Standard Mode"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Option Selection Modal (Before Camera Opens) */}
            {optionModalOpen && (
                <DiscountSelectModal
                    onSelectOption={handleOptionChosen}
                    onClose={() => setOptionModalOpen(false)}
                />
            )}

            {/* Live Camera Price Scanner Modal */}
            {scannerModalOpen && (
                <DashboardPriceScannerModal
                    initialDivisor={selectedDivisor}
                    onClose={() => setScannerModalOpen(false)}
                />
            )}

            {/* A4 Barcode Sheet Modal */}
            {barcodeSheetOpen && (
                <BarcodeSheetModal
                    onClose={() => setBarcodeSheetOpen(false)}
                />
            )}
        </AppLayout>
    );
}
