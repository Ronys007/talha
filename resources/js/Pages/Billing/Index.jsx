import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Printer,
    BookOpen,
    Barcode,
    Camera,
    Percent,
    Flashlight,
} from "lucide-react";
import { useMode } from "@/Context/ModeContext";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import axios from "axios";

// ─── Enhanced POS Scanner Sound & Vibration Engine ───────────────────────────
let globalBillingAudioCtx = null;
function getBillingAudioContext() {
    try {
        if (!globalBillingAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) globalBillingAudioCtx = new AudioCtx();
        }
        if (globalBillingAudioCtx && globalBillingAudioCtx.state === "suspended") {
            globalBillingAudioCtx.resume().catch(() => {});
        }
    } catch {}
    return globalBillingAudioCtx;
}

function playScanBeep(isSuccess = true) {
    try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(isSuccess ? 70 : [50, 50, 50]);
        }

        const ctx = getBillingAudioContext();
        if (!ctx) return;

        if (isSuccess) {
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

// ─── Fetch paginated bills ───────────────────────────────────────────────────
async function fetchBills({ pageParam = null, queryKey }) {
    const [, mode, search] = queryKey;
    const params = new URLSearchParams();
    if (pageParam) params.set("cursor", pageParam);
    if (search) params.set("search", search);
    if (mode) params.set("mode", mode);
    const res = await axios.get(`/billing/data?${params}`);
    return res.data;
}

// ─── Item search autocomplete (Standard Mode) ────────────────────────────────
function StandardItemSearch({ value, onChange, onSelect }) {
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef(null);
    const skipSearchRef = useRef(false);
    const isMountedRef = useRef(false);

    useEffect(() => {
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            return;
        }
        if (skipSearchRef.current) {
            skipSearchRef.current = false;
            return;
        }
        if (!value || value.length < 1) {
            setResults([]);
            setOpen(false);
            setActiveIdx(-1);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await axios.get(
                    `/billing/search?mode=standard&query=${encodeURIComponent(value)}`
                );
                setResults(res.data);
                setActiveIdx(-1);
                if (res.data.length > 0) {
                    const rect = inputRef.current?.getBoundingClientRect();
                    if (rect) {
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const dropHeight = Math.min(res.data.length * 52, 260);
                        const top =
                            spaceBelow < dropHeight
                                ? rect.top - dropHeight - 4
                                : rect.bottom + 4;
                        setDropPos({ top, left: rect.left, width: rect.width });
                    }
                    setOpen(true);
                } else {
                    setOpen(false);
                }
            } catch {}
        }, 220);
        return () => clearTimeout(t);
    }, [value]);

    useEffect(() => {
        if (!open) return;
        function handler(e) {
            if (!inputRef.current?.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    function handleSelect(r) {
        skipSearchRef.current = true;
        onSelect(r);
        setOpen(false);
        setResults([]);
        setActiveIdx(-1);
    }

    function handleKeyDown(e) {
        if (!open || results.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((idx) => Math.min(idx + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((idx) => Math.max(idx - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIdx >= 0 && activeIdx < results.length) {
                handleSelect(results[activeIdx]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIdx(-1);
        }
    }

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <input
                ref={inputRef}
                className="form-input"
                placeholder="Item name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => results.length && setOpen(true)}
                onKeyDown={handleKeyDown}
                required
                style={{ width: "100%" }}
                autoComplete="off"
            />
            {open && results.length > 0 && (
                <div
                    style={{
                        position: "fixed",
                        top: dropPos.top,
                        left: dropPos.left,
                        width: dropPos.width,
                        zIndex: 9999,
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        maxHeight: 260,
                        overflowY: "auto",
                        boxShadow: "var(--shadow-lg)",
                    }}
                >
                    {results.map((r, idx) => (
                        <div
                            key={r.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(r);
                            }}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onMouseLeave={() => setActiveIdx(-1)}
                            style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                fontSize: 13.5,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderBottom: "1px solid var(--border-light)",
                                background:
                                    activeIdx === idx
                                        ? "var(--bg-base)"
                                        : "transparent",
                                transition: "background 0.1s",
                            }}
                        >
                            <span style={{ fontWeight: 500 }}>{r.item}</span>
                            <span
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: 11,
                                }}
                            >
                                #{r.code} &middot; stock: {r.qty}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Standard Bill Modal (Original UI & Form) ────────────────────────────────
function StandardBillModal({ bill, onClose, onSaved }) {
    const [customer, setCustomer] = useState(bill?.customer || "");
    const [items, setItems] = useState(
        (bill?.items || []).length > 0
            ? (bill?.items || []).map((i) => ({
                  ...i,
                  uid: i.id || Math.random().toString(36).substr(2, 9),
                  item_name: i.item_name || i.item || "",
                  selling_price: i.selling_price || "",
                  discount_percent: i.discount_percent || 0,
                  maxQty: (i.inventory_qty ?? 0) + (i.quantity ?? 1) || 999999,
                  stockErr: null,
              }))
            : [
                  {
                      uid: Math.random().toString(36).substr(2, 9),
                      item_name: "",
                      quantity: "",
                      selling_price: "",
                      discount_percent: "",
                      maxQty: 999999,
                      stockErr: null,
                  },
              ]
    );
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [visibleErrors, setVisibleErrors] = useState({});

    useEffect(() => {
        setVisibleErrors(errors);
    }, [errors]);

    function addEmptyItem() {
        setItems([
            {
                uid: Math.random().toString(36).substr(2, 9),
                item_name: "",
                quantity: "",
                selling_price: "",
                discount_percent: "",
                maxQty: 999999,
                stockErr: null,
            },
            ...items,
        ]);
    }

    function removeItem(uid) {
        setItems(items.filter((i) => i.uid !== uid));
    }

    function updateItem(uid, field, val) {
        setItems(
            items.map((i) => {
                if (i.uid !== uid) return i;
                const updated = { ...i, [field]: val };
                if (field === "quantity") {
                    const qty = parseFloat(val) || 0;
                    updated.stockErr =
                        qty > i.maxQty
                            ? `Only ${i.maxQty} in stock`
                            : null;
                }
                return updated;
            })
        );
    }

    const hasStockError = items.some((i) => i.stockErr);

    const subtotal = items.reduce(
        (s, i) =>
            s +
            (parseFloat(i.selling_price) || 0) * (parseFloat(i.quantity) || 0),
        0
    );
    const total = items.reduce((s, i) => {
        const qty = parseFloat(i.quantity) || 0;
        const price = parseFloat(i.selling_price) || 0;
        const disc = parseFloat(i.discount_percent) || 0;
        const lineTot = qty * price;
        const discAmt = disc > 0 ? (lineTot * disc) / 100 : 0;
        return s + (lineTot - discAmt);
    }, 0);

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Filter out completely blank rows that the user left unfilled
        const filledItems = items.filter(
            (i) => (i.item_name && i.item_name.trim()) || i.code || (parseFloat(i.selling_price) > 0)
        );

        const validationErrors = {};
        if (!customer.trim()) {
            validationErrors.customer = ["Customer name is required."];
        }
        if (filledItems.length === 0) {
            validationErrors.general = ["Please add at least one item with valid details."];
        }
        filledItems.forEach((item, index) => {
            if (!item.quantity || parseFloat(item.quantity) <= 0) {
                validationErrors[`quantity-${index}`] = "Quantity is required and must be greater than 0.";
            } else if (item.stockErr) {
                validationErrors[`quantity-${index}`] = item.stockErr;
            }
            if (!item.selling_price || parseFloat(item.selling_price) <= 0) {
                validationErrors[`price-${index}`] = "Price is required and must be greater than 0.";
            }
        });

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setLoading(false);
            return;
        }

        const url = bill ? `/billing/${bill.id}` : "/billing";
        const payload = {
            mode: "standard",
            customer: customer.trim(),
            discount_divisor: null,
            total_price: total.toFixed(2),
            items: filledItems.map((i) => ({
                code: i.code || null,
                item_name: i.item_name || i.code || "Item",
                quantity: parseFloat(i.quantity) || 0,
                selling_price: parseFloat(i.selling_price) || 0,
                discount_percent: parseFloat(i.discount_percent) || 0,
            })),
        };

        try {
            if (bill) payload._method = "POST";
            const res = await axios.post(url, payload);
            if (res.data && res.data.success) {
                onSaved();
                onClose();
            } else {
                setErrors({ general: [res.data?.error || "Error saving bill"] });
            }
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors) {
                setErrors(errData.errors);
            } else {
                setErrors({ general: [errData?.error || err.message || "Failed to save bill. Please try again."] });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div
                className="modal-box"
                style={{
                    width: "100vw",
                    height: "100dvh",
                    maxWidth: "none",
                    maxHeight: "none",
                    borderRadius: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <div className="modal-header">
                    <span className="modal-title">
                        {bill ? "Edit Bill" : "New Bill"}
                    </span>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
                <form
                    className="modal-body"
                    style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
                    onSubmit={submit}
                >
                    {errors.general && (
                        <div
                            style={{
                                padding: "10px 14px",
                                background: "#fee2e2",
                                border: "1px solid #f87171",
                                borderRadius: 8,
                                color: "#b91c1c",
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 16,
                            }}
                        >
                            ⚠️ {errors.general[0]}
                        </div>
                    )}
                    <div className="form-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                        <div className="form-group" style={{ maxWidth: 400, flex: "1 1 300px", marginBottom: 0 }}>
                            <label className="form-label">
                                Customer Name *
                            </label>
                            <input
                                className="form-input"
                                placeholder="Customer"
                                value={customer}
                                onChange={(e) => setCustomer(e.target.value)}
                                required
                            />
                            {errors.customer && (
                                <span className="form-error">
                                    {errors.customer[0]}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 16,
                            }}
                        >
                            <h3
                                className="form-label"
                                style={{ fontSize: 14, margin: 0 }}
                            >
                                Items
                            </h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addEmptyItem}
                                style={{ padding: "5px 12px", fontSize: 13 }}
                            >
                                <Plus size={14} style={{ marginRight: 5 }} />
                                Add Item
                            </button>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                            }}
                        >
                            {items.map((it, idx) => {
                                const qty = parseInt(it.quantity) || 0;
                                const price = parseFloat(it.selling_price) || 0;
                                const discPercent =
                                    parseFloat(it.discount_percent) || 0;
                                const lineTotal = qty * price;
                                const discAmt =
                                    discPercent > 0 ? (lineTotal * discPercent) / 100 : 0;
                                const finalLineTotal = lineTotal - discAmt;

                                return (
                                    <div
                                        key={it.uid}
                                        className="bill-item-card"
                                        style={{
                                            display: "flex",
                                            gap: 16,
                                            alignItems: "flex-start",
                                            background: "var(--bg-base)",
                                            padding: 16,
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border)",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div
                                            className="form-group bill-item-name-field"
                                            style={{
                                                flex: "3 1 200px",
                                                marginBottom: 0,
                                            }}
                                        >
                                            <label className="form-label">
                                                Item / Description
                                            </label>
                                            <StandardItemSearch
                                                value={it.item_name}
                                                onChange={(val) =>
                                                    updateItem(
                                                        it.uid,
                                                        "item_name",
                                                        val
                                                    )
                                                }
                                                onSelect={(selected) => {
                                                    setItems(
                                                        items.map((i) => {
                                                            if (
                                                                i.uid !== it.uid
                                                            )
                                                                return i;
                                                            return {
                                                                ...i,
                                                                item_name:
                                                                    selected.item,
                                                                code: selected.code,
                                                                selling_price:
                                                                    selected.price ||
                                                                    i.selling_price,
                                                                maxQty:
                                                                    parseFloat(
                                                                        selected.qty
                                                                    ) || 0,
                                                                stockErr:
                                                                    (parseFloat(i.quantity) || 0) >
                                                                    (parseFloat(selected.qty) || 0)
                                                                        ? `Only ${selected.qty} in stock`
                                                                        : null,
                                                            };
                                                        })
                                                    );
                                                }}
                                            />
                                            {it.code && (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "var(--text-muted)",
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    Linked to Inventory: #
                                                    {it.code}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="form-group"
                                            style={{
                                                flex: "1 1 80px",
                                                marginBottom: 0,
                                            }}
                                        >
                                            <label className="form-label">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input hide-arrows"
                                                value={
                                                    it.quantity === 0
                                                        ? ""
                                                        : it.quantity
                                                }
                                                onChange={(e) =>
                                                    updateItem(
                                                        it.uid,
                                                        "quantity",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Qty"
                                                min="0.001"
                                                step="any"
                                                required
                                                style={{
                                                    borderColor:
                                                        it.stockErr ||
                                                        visibleErrors[`quantity-${idx}`]
                                                            ? "var(--danger)"
                                                            : undefined,
                                                }}
                                            />
                                            {(it.stockErr ||
                                                visibleErrors[`quantity-${idx}`]) && (
                                                <div
                                                    className="error-text"
                                                    style={{
                                                        color: "var(--danger)",
                                                        fontSize: 10,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    ⚠{" "}
                                                    {it.stockErr ||
                                                        visibleErrors[`quantity-${idx}`]}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="form-group"
                                            style={{
                                                flex: "1 1 100px",
                                                marginBottom: 0,
                                            }}
                                        >
                                            <label className="form-label">
                                                Price
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input hide-arrows"
                                                value={it.selling_price}
                                                onChange={(e) =>
                                                    updateItem(
                                                        it.uid,
                                                        "selling_price",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Price"
                                                min="0"
                                                step="any"
                                                required
                                                style={{
                                                    borderColor:
                                                        visibleErrors[`price-${idx}`]
                                                            ? "var(--danger)"
                                                            : undefined,
                                                }}
                                            />
                                            {visibleErrors[`price-${idx}`] && (
                                                <div
                                                    className="error-text"
                                                    style={{
                                                        color: "var(--danger)",
                                                        fontSize: 10,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    ⚠{" "}
                                                    {visibleErrors[`price-${idx}`]}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="form-group"
                                            style={{
                                                flex: "1 1 80px",
                                                marginBottom: 0,
                                            }}
                                        >
                                            <label className="form-label">
                                                Discount (%)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input hide-arrows"
                                                value={it.discount_percent}
                                                onChange={(e) =>
                                                    updateItem(
                                                        it.uid,
                                                        "discount_percent",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                step="any"
                                            />
                                        </div>
                                        <div
                                            className="form-group"
                                            style={{
                                                flex: "1 1 100px",
                                                marginBottom: 0,
                                            }}
                                        >
                                            <label className="form-label">
                                                Total
                                            </label>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: "center",
                                                    minHeight: 38,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: 15,
                                                        color: "var(--text-primary)",
                                                    }}
                                                >
                                                    ₹{finalLineTotal.toFixed(2)}
                                                </div>
                                                {discAmt > 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: 10,
                                                            color: "var(--danger)",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        -₹{discAmt.toFixed(2)} ({discPercent}%)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                paddingTop: 24,
                                                marginBottom: 0,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-icon btn-sm"
                                                onClick={() =>
                                                    removeItem(it.uid)
                                                }
                                                disabled={items.length === 1}
                                                title="Remove Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </form>
                <div
                    className="modal-footer"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexShrink: 0,
                    }}
                >
                    {items.length > 0 ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                alignItems: "flex-start",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-muted)",
                                    display: "flex",
                                    gap: 16,
                                }}
                            >
                                <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
                                {subtotal - total > 0 && (
                                    <span style={{ color: "var(--danger)" }}>
                                        Total Discount: -₹
                                        {(subtotal - total).toFixed(2)}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 700 }}>
                                Total: ₹{total.toFixed(2)}
                            </span>
                        </div>
                    ) : (
                        <div />
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={submit}
                            disabled={
                                loading || items.length === 0 || hasStockError
                            }
                            title={
                                hasStockError
                                    ? "Fix stock errors before saving"
                                    : undefined
                            }
                        >
                            {loading
                                ? "Saving..."
                                : bill
                                  ? "Update Bill"
                                  : "Save Bill"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Barcode Item Search Autocomplete ────────────────────────────────────────
function BarcodeItemSearch({ value, onChange, onSelect }) {
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef(null);
    const skipSearchRef = useRef(false);
    const isMountedRef = useRef(false);

    useEffect(() => {
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            return;
        }
        if (skipSearchRef.current) {
            skipSearchRef.current = false;
            return;
        }
        if (!value || value.length < 1) {
            setResults([]);
            setOpen(false);
            setActiveIdx(-1);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await axios.get(
                    `/billing/search?mode=barcode&query=${encodeURIComponent(value)}`
                );
                setResults(res.data);
                setActiveIdx(-1);
                if (res.data.length > 0) {
                    const rect = inputRef.current?.getBoundingClientRect();
                    if (rect) {
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const dropHeight = Math.min(res.data.length * 52, 260);
                        const top =
                            spaceBelow < dropHeight
                                ? rect.top - dropHeight - 4
                                : rect.bottom + 4;
                        setDropPos({ top, left: rect.left, width: rect.width });
                    }
                    setOpen(true);
                } else {
                    setOpen(false);
                }
            } catch {}
        }, 220);
        return () => clearTimeout(t);
    }, [value]);

    useEffect(() => {
        if (!open) return;
        function handler(e) {
            if (!inputRef.current?.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    function handleSelect(r) {
        skipSearchRef.current = true;
        onSelect(r);
        setOpen(false);
        setResults([]);
        setActiveIdx(-1);
    }

    function handleKeyDown(e) {
        if (!open || results.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((idx) => Math.min(idx + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((idx) => Math.max(idx - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIdx >= 0 && activeIdx < results.length) {
                handleSelect(results[activeIdx]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIdx(-1);
        }
    }

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <input
                ref={inputRef}
                className="form-input"
                placeholder="Item name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => results.length && setOpen(true)}
                onKeyDown={handleKeyDown}
                required
                style={{ width: "100%" }}
                autoComplete="off"
            />
            {open && results.length > 0 && (
                <div
                    style={{
                        position: "fixed",
                        top: dropPos.top,
                        left: dropPos.left,
                        width: dropPos.width,
                        zIndex: 9999,
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        maxHeight: 260,
                        overflowY: "auto",
                        boxShadow: "var(--shadow-lg)",
                    }}
                >
                    {results.map((r, idx) => (
                        <div
                            key={r.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(r);
                            }}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onMouseLeave={() => setActiveIdx(-1)}
                            style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                fontSize: 13.5,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderBottom: "1px solid var(--border-light)",
                                background:
                                    activeIdx === idx
                                        ? "var(--bg-base)"
                                        : "transparent",
                                transition: "background 0.1s",
                            }}
                        >
                            <span style={{ fontWeight: 500 }}>{r.item}</span>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                {r.selling_price > 0 && (
                                    <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 12 }}>
                                        ₹{parseFloat(r.selling_price).toFixed(2)}
                                    </span>
                                )}
                                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                    #{r.code} &middot; stock: {r.qty}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Camera Barcode Scanner Modal (1D & 2D Formats) ──────────────────────────
function CameraBarcodeScannerModal({ onScanItem, onClose }) {
    const [scannedFeedback, setScannedFeedback] = useState(null);
    const [manualCode, setManualCode] = useState("");
    const [cameraError, setCameraError] = useState(null);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const lastScannedRef = useRef({ code: "", time: 0 });

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
        getBillingAudioContext();

        const scannerId = "html5barcode-reader";
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
                    await handleLookupCode(code);
                } catch (err) {
                    console.error(err);
                } finally {
                    setTimeout(() => {
                        isProcessingRef.current = false;
                        setIsProcessing(false);
                    }, 400);
                }
            };

            // Attempt 1: Rear / Environment camera
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
            console.error("Billing barcode camera start error:", err);

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

    async function handleLookupCode(code) {
        if (!code) return;
        try {
            const res = await axios.get(`/billing/search?mode=barcode&query=${encodeURIComponent(code)}`);
            const items = res.data || [];
            const matched =
                items.find((i) => String(i.code).toLowerCase() === code.toLowerCase()) ||
                items[0];

            if (matched) {
                playScanBeep(true);
                onScanItem(matched);
                setScannedFeedback({
                    success: true,
                    item: matched,
                    text: `✓ Added "${matched.item}" (#${matched.code})`,
                });
            } else {
                playScanBeep(false);
                setScannedFeedback({
                    success: false,
                    text: `Barcode #${code} not found in inventory.`,
                });
            }
        } catch (e) {
            playScanBeep(false);
            setScannedFeedback({ success: false, text: `Error finding barcode #${code}` });
        }
        setTimeout(() => setScannedFeedback(null), 3000);
    }

    function submitManual(e) {
        e.preventDefault();
        if (!manualCode.trim()) return;
        handleLookupCode(manualCode.trim());
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
                                Barcode Scanner
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                Continuous Multi-Item Scanner for Bill
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
                    {/* Camera scanner div — ALWAYS in DOM so scanner never unmounts on state change */}
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
                        <div id="html5barcode-reader" style={{ width: "100%", minHeight: "160px" }} />
                    </div>

                    {/* Camera error — shown below, never removes scanner div */}
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

                    {/* Scanned Product Photo & Details Banner in Billing Modal */}
                    {scannedFeedback && (
                        <div
                            style={{
                                marginTop: 10,
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: scannedFeedback.success ? "#f0fdf4" : "#fee2e2",
                                border: `1.5px solid ${scannedFeedback.success ? "#86efac" : "#fca5a5"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                textAlign: "left",
                                animation: "slideDown 0.2s ease",
                            }}
                        >
                            {scannedFeedback.success && scannedFeedback.item ? (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                                        {scannedFeedback.item.image ? (
                                            <img
                                                src={scannedFeedback.item.image}
                                                alt={scannedFeedback.item.item}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 8,
                                                    objectFit: "cover",
                                                    border: "1.5px solid #16a34a",
                                                    flexShrink: 0,
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 8,
                                                    background: "#dcfce7",
                                                    color: "#16a34a",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 800,
                                                    fontSize: 16,
                                                    border: "1.5px solid #86efac",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {scannedFeedback.item.item?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                                                ✓ Added To Bill
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {scannedFeedback.item.item}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                #{scannedFeedback.item.code}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>
                                            ₹{parseFloat(scannedFeedback.item.selling_price || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ color: "#dc2626", fontWeight: 600, fontSize: 13 }}>
                                    {scannedFeedback.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Code Input Form */}
                    <form onSubmit={submitManual} style={{ marginTop: 10, display: "flex", gap: 8 }}>
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
                            Add
                        </button>
                    </form>

                    <div
                        style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 8,
                            textAlign: "center",
                        }}
                    >
                        💡 Point camera horizontally at barcode label. You can scan multiple items continuously!
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: "10px 16px" }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
                        Done Scanning
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Barcode Bill Modal (With Scanner) ───────────────────────────────────────
function BarcodeBillModal({ bill, onClose, onSaved }) {
    const [customer, setCustomer] = useState(bill?.customer || "");
    const [divisor, setDivisor] = useState(
        bill?.discount_divisor ? parseInt(bill.discount_divisor) : 1
    );
    const [scannerOpen, setScannerOpen] = useState(false);
    const [items, setItems] = useState(
        (bill?.items || []).length > 0
            ? (bill?.items || []).map((i) => ({
                  ...i,
                  uid: i.id || Math.random().toString(36).substr(2, 9),
                  item_name: i.item_name || i.item || "",
                  selling_price: i.selling_price || "",
                  discount_percent: i.discount_percent ?? "",
                  maxQty: (i.inventory_qty ?? 0) + (i.quantity ?? 1) || 999999,
                  stockErr: null,
              }))
            : [
                  {
                      uid: Math.random().toString(36).substr(2, 9),
                      code: "",
                      item_name: "",
                      quantity: 1,
                      selling_price: "",
                      discount_percent: "",
                      maxQty: 999999,
                      stockErr: null,
                  },
              ]
    );
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [visibleErrors, setVisibleErrors] = useState({});

    useEffect(() => {
        setVisibleErrors(errors);
    }, [errors]);

    function addEmptyItem() {
        setItems([
            {
                uid: Math.random().toString(36).substr(2, 9),
                code: "",
                item_name: "",
                quantity: 1,
                selling_price: "",
                discount_percent: "",
                maxQty: 999999,
                stockErr: null,
            },
            ...items,
        ]);
    }

    function removeItem(uid) {
        setItems(items.filter((i) => i.uid !== uid));
    }

    function updateItem(uid, field, val) {
        setItems(
            items.map((i) => {
                if (i.uid !== uid) return i;
                const updated = { ...i, [field]: val };
                if (field === "quantity") {
                    const qty = parseFloat(val) || 0;
                    updated.stockErr =
                        qty > i.maxQty
                            ? `Only ${i.maxQty} in stock`
                            : null;
                }
                return updated;
            })
        );
    }

    function handleScannedItem(scannedItem) {
        setItems((prev) => {
            const existingIdx = prev.findIndex(
                (i) => String(i.code).toLowerCase() === String(scannedItem.code).toLowerCase()
            );

            if (existingIdx >= 0) {
                return prev.map((item, idx) => {
                    if (idx !== existingIdx) return item;
                    const newQty = (parseFloat(item.quantity) || 0) + 1;
                    return {
                        ...item,
                        quantity: newQty,
                        stockErr: newQty > item.maxQty ? `Only ${item.maxQty} in stock` : null,
                    };
                });
            }

            const cleanPrev = prev.filter(
                (item) => Boolean((item.item_name && item.item_name.trim()) || item.code || parseFloat(item.selling_price) > 0)
            );

            const maxStock = parseFloat(scannedItem.qty) || 0;
            const newItem = {
                uid: Math.random().toString(36).substr(2, 9),
                code: scannedItem.code,
                item_name: scannedItem.item,
                selling_price: scannedItem.selling_price || 0,
                discount_percent: "",
                quantity: 1,
                maxQty: maxStock,
                stockErr: 1 > maxStock ? `Only ${maxStock} in stock` : null,
            };

            return [newItem, ...cleanPrev];
        });
    }

    const hasStockError = items.some((i) => i.stockErr);

    const subtotal = items.reduce((s, i) => {
        const qty = parseFloat(i.quantity) || 0;
        const price = parseFloat(i.selling_price) || 0;
        return s + qty * price;
    }, 0);

    const total = items.reduce((s, i) => {
        const qty = parseFloat(i.quantity) || 0;
        const price = parseFloat(i.selling_price) || 0;
        const effPrice = divisor > 1 ? price / divisor : price;
        const disc = parseFloat(i.discount_percent) || 0;
        const lineTot = qty * effPrice;
        const discAmt = disc > 0 ? (lineTot * disc) / 100 : 0;
        return s + (lineTot - discAmt);
    }, 0);

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Filter out completely blank rows that the user left unfilled
        const filledItems = items.filter(
            (i) => (i.item_name && i.item_name.trim()) || i.code || (parseFloat(i.selling_price) > 0)
        );

        const validationErrors = {};
        if (!customer.trim()) {
            validationErrors.customer = ["Customer name is required."];
        }
        if (filledItems.length === 0) {
            validationErrors.general = ["Please add or scan at least one item."];
        }
        filledItems.forEach((item, index) => {
            if (!item.quantity || parseFloat(item.quantity) <= 0) {
                validationErrors[`quantity-${index}`] = "Quantity is required and must be greater than 0.";
            } else if (item.stockErr) {
                validationErrors[`quantity-${index}`] = item.stockErr;
            }
            if (!item.selling_price || parseFloat(item.selling_price) <= 0) {
                validationErrors[`price-${index}`] = "Price is required and must be greater than 0.";
            }
        });

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setLoading(false);
            return;
        }

        try {
            const url = bill ? `/billing/${bill.id}` : "/billing";
            const payload = {
                mode: "barcode",
                customer: customer.trim(),
                discount_divisor: divisor > 1 ? divisor : null,
                total_price: total.toFixed(2),
                items: filledItems.map((i) => ({
                    code: i.code || null,
                    item_name: i.item_name || i.code || "Item",
                    quantity: parseFloat(i.quantity) || 0,
                    selling_price: parseFloat(i.selling_price) || 0,
                    discount_percent: parseFloat(i.discount_percent) || 0,
                })),
            };
            if (bill) payload._method = "POST";
            const res = await axios.post(url, payload);
            if (res.data && res.data.success) {
                onSaved();
                onClose();
            } else {
                setErrors({ general: [res.data?.error || "Error saving barcode bill"] });
            }
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors) {
                setErrors(errData.errors);
            } else {
                setErrors({ general: [errData?.error || err.message || "Failed to save bill. Please try again."] });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="modal-overlay">
                <div
                    className="modal-box"
                    style={{
                        width: "100vw",
                        height: "100dvh",
                        maxWidth: "none",
                        maxHeight: "none",
                        borderRadius: 0,
                        margin: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <div className="modal-header">
                        <span className="modal-title">
                            {bill ? "Edit Barcode Bill" : "New Barcode Bill"}
                        </span>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>

                    <form
                        className="modal-body"
                        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
                        onSubmit={submit}
                    >
                        {errors.general && (
                            <div
                                style={{
                                    padding: "10px 14px",
                                    background: "#fee2e2",
                                    border: "1px solid #f87171",
                                    borderRadius: 8,
                                    color: "#b91c1c",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    marginBottom: 16,
                                }}
                            >
                                ⚠️ {errors.general[0]}
                            </div>
                        )}
                        <div className="form-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                            <div className="form-group" style={{ maxWidth: 400, flex: "1 1 300px", marginBottom: 0 }}>
                                <label className="form-label">
                                    Customer Name *
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="Customer"
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                    required
                                />
                                {errors.customer && (
                                    <span className="form-error">
                                        {errors.customer[0]}
                                    </span>
                                )}
                            </div>

                            {/* Price Formula Divisor Selector */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label className="form-label" style={{ margin: 0, fontSize: 12 }}>
                                    Price Formula (Discount)
                                </label>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        background: "var(--bg-base)",
                                        padding: 3,
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                        gap: 2,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setDivisor(1)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: divisor === 1 ? 700 : 500,
                                            border: "none",
                                            cursor: "pointer",
                                            background: divisor === 1 ? "#fff" : "transparent",
                                            color: divisor === 1 ? "#1e293b" : "var(--text-muted)",
                                            boxShadow: divisor === 1 ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        None (100%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDivisor(2)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: divisor === 2 ? 700 : 500,
                                            border: "none",
                                            cursor: "pointer",
                                            background: divisor === 2 ? "#2563eb" : "transparent",
                                            color: divisor === 2 ? "#fff" : "#2563eb",
                                            boxShadow: divisor === 2 ? "0 1px 3px rgba(37,99,235,0.3)" : "none",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        ÷ 2 (Half)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDivisor(3)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: divisor === 3 ? 700 : 500,
                                            border: "none",
                                            cursor: "pointer",
                                            background: divisor === 3 ? "#16a34a" : "transparent",
                                            color: divisor === 3 ? "#fff" : "#16a34a",
                                            boxShadow: divisor === 3 ? "0 1px 3px rgba(22,163,74,0.3)" : "none",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        ÷ 3 (1/3rd)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 20 }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 16,
                                }}
                            >
                                <h3
                                    className="form-label"
                                    style={{ fontSize: 14, margin: 0 }}
                                >
                                    Items
                                </h3>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                            background: "#16a34a",
                                            borderColor: "#16a34a",
                                            color: "#fff",
                                            padding: "5px 12px",
                                            fontSize: 13,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                        onClick={() => setScannerOpen(true)}
                                    >
                                        <Camera size={14} /> Scan Barcode
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={addEmptyItem}
                                        style={{ padding: "5px 12px", fontSize: 13 }}
                                    >
                                        <Plus size={14} style={{ marginRight: 5 }} />
                                        Add Item
                                    </button>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 16,
                                }}
                            >
                                {items.map((it, idx) => {
                                    const qty = parseFloat(it.quantity) || 0;
                                    const price = parseFloat(it.selling_price) || 0;
                                    const effPrice = divisor > 1 ? price / divisor : price;
                                    const disc = parseFloat(it.discount_percent) || 0;
                                    const lineTotal = qty * effPrice;
                                    const discAmt = disc > 0 ? (lineTotal * disc) / 100 : 0;
                                    const finalLineTotal = lineTotal - discAmt;

                                    return (
                                        <div
                                            key={it.uid}
                                            className="bill-item-card"
                                            style={{
                                                display: "flex",
                                                gap: 16,
                                                alignItems: "center",
                                                background: "var(--bg-base)",
                                                padding: 16,
                                                borderRadius: "var(--radius-sm)",
                                                border: "1px solid var(--border)",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <div
                                                className="form-group bill-item-name-field"
                                                style={{
                                                    flex: "3 1 200px",
                                                    marginBottom: 0,
                                                }}
                                            >
                                                <label className="form-label">
                                                    Item / Description
                                                </label>
                                                <BarcodeItemSearch
                                                    value={it.item_name}
                                                    onChange={(val) =>
                                                        updateItem(
                                                            it.uid,
                                                            "item_name",
                                                            val
                                                        )
                                                    }
                                                    onSelect={(selected) => {
                                                        setItems(
                                                            items.map((i) => {
                                                                if (
                                                                    i.uid !== it.uid
                                                                )
                                                                    return i;
                                                                return {
                                                                    ...i,
                                                                    item_name:
                                                                        selected.item,
                                                                    code: selected.code,
                                                                    selling_price:
                                                                        selected.selling_price ||
                                                                        i.selling_price,
                                                                    maxQty:
                                                                        parseFloat(
                                                                            selected.qty
                                                                        ) || 0,
                                                                    stockErr:
                                                                        (parseFloat(i.quantity) || 0) >
                                                                        (parseFloat(selected.qty) || 0)
                                                                            ? `Only ${selected.qty} in stock`
                                                                            : null,
                                                                };
                                                            })
                                                        );
                                                    }}
                                                />
                                                {it.code && (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: "var(--text-muted)",
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        Linked to Inventory: #
                                                        {it.code}
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                className="form-group"
                                                style={{
                                                    flex: "1 1 80px",
                                                    marginBottom: 0,
                                                }}
                                            >
                                                <label className="form-label">
                                                    Quantity
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-input hide-arrows"
                                                    value={
                                                        it.quantity === 0
                                                            ? ""
                                                            : it.quantity
                                                    }
                                                    onChange={(e) =>
                                                        updateItem(
                                                            it.uid,
                                                            "quantity",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Qty"
                                                    min="0.001"
                                                    step="any"
                                                    required
                                                    style={{
                                                        borderColor:
                                                            it.stockErr ||
                                                            visibleErrors[`quantity-${idx}`]
                                                                ? "var(--danger)"
                                                                : undefined,
                                                    }}
                                                />
                                                {(it.stockErr ||
                                                    visibleErrors[`quantity-${idx}`]) && (
                                                    <div
                                                        className="error-text"
                                                        style={{
                                                            color: "var(--danger)",
                                                            fontSize: 10,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        ⚠{" "}
                                                        {it.stockErr ||
                                                            visibleErrors[`quantity-${idx}`]}
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                className="form-group"
                                                style={{
                                                    flex: "1 1 100px",
                                                    marginBottom: 0,
                                                }}
                                            >
                                                <label className="form-label">
                                                    Price
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-input hide-arrows"
                                                    value={it.selling_price}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            it.uid,
                                                            "selling_price",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Price"
                                                    min="0"
                                                    step="any"
                                                    required
                                                    style={{
                                                        borderColor:
                                                            visibleErrors[`price-${idx}`]
                                                                ? "var(--danger)"
                                                                : undefined,
                                                    }}
                                                />
                                                {divisor > 1 && parseFloat(it.selling_price) > 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: divisor === 2 ? "#2563eb" : "#16a34a",
                                                            fontWeight: 700,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        ÷{divisor}: ₹{effPrice.toFixed(2)}
                                                    </div>
                                                )}
                                                {visibleErrors[`price-${idx}`] && (
                                                    <div
                                                        className="error-text"
                                                        style={{
                                                            color: "var(--danger)",
                                                            fontSize: 10,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        ⚠{" "}
                                                        {visibleErrors[`price-${idx}`]}
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                className="form-group"
                                                style={{
                                                    flex: "1 1 80px",
                                                    marginBottom: 0,
                                                }}
                                            >
                                                <label className="form-label">
                                                    Discount (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-input hide-arrows"
                                                    value={it.discount_percent}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            it.uid,
                                                            "discount_percent",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    step="any"
                                                />
                                            </div>

                                            <div
                                                className="form-group"
                                                style={{
                                                    flex: "1 1 100px",
                                                    marginBottom: 0,
                                                }}
                                            >
                                                <label className="form-label">
                                                    Total
                                                </label>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent: "center",
                                                        minHeight: 38,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            fontSize: 15,
                                                            color: "var(--text-primary)",
                                                        }}
                                                    >
                                                        ₹{finalLineTotal.toFixed(2)}
                                                    </div>
                                                    {discAmt > 0 && (
                                                        <div
                                                            style={{
                                                                fontSize: 10,
                                                                color: "var(--danger)",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            -₹{discAmt.toFixed(2)} ({disc}%)
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    paddingTop: 24,
                                                    marginBottom: 0,
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-icon btn-sm"
                                                    onClick={() =>
                                                        removeItem(it.uid)
                                                    }
                                                    disabled={items.length === 1}
                                                    title="Remove Item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Totals Summary */}
                        <div
                            style={{
                                marginTop: 24,
                                borderTop: "2px solid var(--border)",
                                paddingTop: 16,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: 6,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-muted)",
                                    display: "flex",
                                    gap: 16,
                                }}
                            >
                                <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
                                {subtotal - total > 0 && (
                                    <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                                        Total Discount: -₹{(subtotal - total).toFixed(2)}
                                    </span>
                                )}
                            </div>
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                }}
                            >
                                Grand Total:{" "}
                                <span style={{ color: "#16a34a" }}>
                                    ₹{total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 10,
                                marginTop: 24,
                                paddingBottom: 16,
                            }}
                        >
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ background: "#16a34a", borderColor: "#16a34a" }}
                                disabled={
                                    loading || items.length === 0 || hasStockError
                                }
                                title={
                                    hasStockError
                                        ? "Fix stock errors before saving"
                                        : undefined
                                }
                            >
                                {loading
                                    ? "Saving..."
                                    : bill
                                      ? "Update Bill"
                                      : "Save Bill"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {scannerOpen && (
                <CameraBarcodeScannerModal
                    onScanItem={handleScannedItem}
                    onClose={() => setScannerOpen(false)}
                />
            )}
        </>
    );
}

// ─── Confirm Delete ──────────────────────────────────────────────────────────
function ConfirmDelete({ bill, onClose, onConfirm }) {
    function confirm() {
        onConfirm();
        onClose();
    }
    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 380 }}>
                <div className="modal-header">
                    <span className="modal-title">Delete Bill</span>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="modal-body">
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Delete bill for{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                            {bill?.customer}
                        </strong>
                        ? This will restore inventory quantities.
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-danger" onClick={confirm}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Billing Index Page ────────────────────────────────────────────────
export default function BillingIndex() {
    const { auth } = usePage().props;
    const isStaff = auth?.user?.is_staff || auth?.user?.role === "staff";
    const { mode } = useMode();
    const effectiveMode = isStaff ? "barcode" : mode;
    const isBarcode = effectiveMode === "barcode";

    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editBill, setEditBill] = useState(null);
    const [deleteBill, setDeleteBill] = useState(null);
    const loadMoreRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        useInfiniteQuery({
            queryKey: ["billing", effectiveMode, debouncedSearch],
            queryFn: fetchBills,
            getNextPageParam: (last) => last.nextCursor ?? undefined,
            staleTime: 1000 * 30,
        });

    useEffect(() => {
        if (!loadMoreRef.current) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" }
        );
        obs.observe(loadMoreRef.current);
        return () => obs.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const bills = data?.pages.flatMap((p) => p.data) ?? [];

    function invalidate() {
        qc.invalidateQueries({ queryKey: ["billing"] });
        qc.refetchQueries({ queryKey: ["billing", effectiveMode] });
        qc.invalidateQueries({ queryKey: ["inventory", effectiveMode] });
    }

    function handleDelete() {
        const id = deleteBill.id;
        qc.setQueryData(["billing", effectiveMode, debouncedSearch], (old) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    data: page.data.filter((b) => b.id !== id),
                })),
            };
        });
        axios
            .delete(`/billing/${id}`, {
                headers: {
                    "X-CSRF-TOKEN": document.querySelector("meta[name=csrf-token]")?.content || "",
                },
            })
            .then(() => {
                qc.removeQueries({ queryKey: ["inventory", effectiveMode] });
            })
            .catch(() => invalidate());
    }

    return (
        <AppLayout title={isBarcode ? "Barcode Billing" : "Billing"}>
            <div className="card page-full-card">
                {/* Toolbar */}
                <div className="table-toolbar">
                    <div className="toolbar-left">
                        <div className="search-input-wrap">
                            <Search size={15} />
                            <input
                                className="form-input search-input"
                                placeholder={`Search ${isBarcode ? "barcode " : ""}customers...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditBill(null);
                            setModalOpen(true);
                        }}
                    >
                        <Plus size={15} /> New {isBarcode ? "Barcode " : ""}Bill
                    </button>
                </div>

                {/* Table */}
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            {isBarcode ? (
                                <tr>
                                    <th>#</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Discount</th>
                                    <th>Total</th>
                                    <th>Balance</th>
                                    <th>Date</th>
                                    {!isStaff && <th>Actions</th>}
                                </tr>
                            ) : (
                                <tr>
                                    <th>#</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Balance</th>
                                    <th>Date</th>
                                    {!isStaff && <th>Actions</th>}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={isBarcode ? (isStaff ? 7 : 8) : (isStaff ? 6 : 7)}
                                        style={{
                                            textAlign: "center",
                                            padding: 40,
                                        }}
                                    >
                                        <div className="loading-ring" />
                                    </td>
                                </tr>
                            )}
                            {!isLoading && bills.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={isBarcode ? (isStaff ? 7 : 8) : (isStaff ? 6 : 7)}
                                        style={{
                                            textAlign: "center",
                                            padding: 60,
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        No {isBarcode ? "barcode " : ""}bills found
                                    </td>
                                </tr>
                            )}
                            {bills.map((bill, idx) => {
                                const isPaid =
                                    parseFloat(bill.updated_balance) <= 0;
                                return (
                                    <tr key={bill.id}>
                                        <td
                                            style={{
                                                color: "var(--text-muted)",
                                                fontSize: 12,
                                            }}
                                        >
                                            {idx + 1}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {bill.customer}
                                        </td>
                                        <td>
                                            <span className="badge badge-info">
                                                {bill.items_count ??
                                                    bill.items?.length ??
                                                    "—"}
                                            </span>
                                        </td>
                                        {isBarcode && (
                                            <td>
                                                {bill.discount_divisor ? (
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: "#dcfce7",
                                                            color: "#15803d",
                                                            padding: "2px 7px",
                                                            borderRadius: 6,
                                                            border: "1px solid #86efac",
                                                        }}
                                                    >
                                                        ÷ {bill.discount_divisor}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                                                )}
                                            </td>
                                        )}
                                        <td style={{ fontWeight: 600 }}>
                                            ₹{parseFloat(bill.total_price || 0).toFixed(2)}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${isPaid ? "badge-success" : "badge-danger"}`}
                                            >
                                                ₹{parseFloat(bill.updated_balance ?? bill.total_price ?? 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {new Date(
                                                bill.created_at
                                            ).toLocaleDateString("en-IN")}
                                        </td>
                                        {!isStaff && (
                                            <td>
                                                <div className="action-btns">
                                                    <a
                                                        href={`/billing/${bill.id}/print`}
                                                        target="_blank"
                                                        className="btn btn-ghost btn-icon btn-sm"
                                                        title="Print"
                                                    >
                                                        <Printer size={13} />
                                                    </a>
                                                    <Link
                                                        href={`/account/${bill.id}`}
                                                        className="btn btn-ghost btn-icon btn-sm"
                                                        title="Account"
                                                    >
                                                        <BookOpen size={13} />
                                                    </Link>
                                                    <button
                                                        className="btn btn-ghost btn-icon btn-sm"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setEditBill(bill);
                                                            setModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-icon btn-sm"
                                                        title="Delete"
                                                        onClick={() =>
                                                            setDeleteBill(bill)
                                                        }
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div ref={loadMoreRef} className="scroll-sentinel" />
                    {isFetchingNextPage && <div className="loading-ring" />}
                    {!hasNextPage && bills.length > 0 && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: 16,
                                color: "var(--text-muted)",
                                fontSize: 12,
                            }}
                        >
                            All {bills.length} {isBarcode ? "barcode " : ""}bills loaded
                        </div>
                    )}
                </div>
            </div>

            {modalOpen && (
                isBarcode ? (
                    <BarcodeBillModal
                        bill={editBill}
                        onClose={() => {
                            setModalOpen(false);
                            setEditBill(null);
                        }}
                        onSaved={invalidate}
                    />
                ) : (
                    <StandardBillModal
                        bill={editBill}
                        onClose={() => {
                            setModalOpen(false);
                            setEditBill(null);
                        }}
                        onSaved={invalidate}
                    />
                )
            )}

            {deleteBill && (
                <ConfirmDelete
                    bill={deleteBill}
                    onClose={() => setDeleteBill(null)}
                    onConfirm={handleDelete}
                />
            )}
        </AppLayout>
    );
}
