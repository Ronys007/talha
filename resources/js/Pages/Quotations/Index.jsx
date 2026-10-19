import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useForm, router } from "@inertiajs/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AppLayout from "@/Layouts/AppLayout";
import {
    Plus,
    Search,
    Trash2,
    X,
    FileText,
    Printer,
    FileCheck,
    Truck,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    Phone,
    User,
    Edit2,
    Layers,
    Share2,
    Receipt,
    Loader2,
    Download,
} from "lucide-react";
import TableActionDropdown, { ActionItem } from "@/Components/TableActionDropdown";

function toMoney(val) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.toString().slice(0, 10).split("-");
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (!isNaN(day) && month >= 0 && month < 12 && !isNaN(year)) {
            return `${day} ${months[month]} ${year}`;
        }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Debounced Inventory Autocomplete for Quotation Lines
// ─────────────────────────────────────────────────────────────────────────────
function DebouncedInventoryInput({
    value = "",
    onChange,
    onSelect,
    initialItems = [],
    placeholder = "Product or service description",
    required = false,
}) {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverResults, setServerResults] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState(null);

    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const debounceTimerRef = useRef(null);

    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    const updatePosition = useCallback(() => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 250 && rect.top > 250;

        setDropdownPosition({
            top: openUpwards ? Math.max(10, rect.top - 245) : rect.bottom + 4,
            left: Math.max(10, rect.left),
            width: Math.max(rect.width, 320),
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        const handleScrollOrResize = () => {
            if (!inputRef.current) return;
            const rect = inputRef.current.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                setIsOpen(false);
            } else {
                updatePosition();
            }
        };

        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (
                inputRef.current &&
                !inputRef.current.contains(e.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const performDebouncedSearch = useCallback((searchStr) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                const res = await axios.get("/invoices/search-inventory", {
                    params: { q: searchStr.trim() },
                });
                if (res.data) {
                    setServerResults(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch inventory suggestions:", err);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, []);

    const handleChange = (e) => {
        const text = e.target.value;
        setInputValue(text);
        onChange(text);
        setIsOpen(true);
        updatePosition();
        performDebouncedSearch(text);
    };

    const handleFocus = () => {
        setIsOpen(true);
        updatePosition();
        if (serverResults === null) {
            performDebouncedSearch(inputValue);
        }
    };

    const handleSelectItem = (item) => {
        const name = item.item || item.name || "";
        setInputValue(name);
        setIsOpen(false);
        onSelect(item);
    };

    const displayItems = useMemo(() => {
        if (serverResults !== null) {
            return serverResults;
        }
        if (!inputValue || !inputValue.trim()) {
            return initialItems.slice(0, 10);
        }
        const q = inputValue.toLowerCase().trim();
        return initialItems
            .filter((it) => (it.item || it.name || "").toLowerCase().includes(q))
            .slice(0, 10);
    }, [serverResults, initialItems, inputValue]);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                    ref={inputRef}
                    className="form-input"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    required={required}
                />
                {loading && (
                    <div style={{ position: "absolute", right: 8, pointerEvents: "none", color: "var(--accent)" }}>
                        <Loader2 size={14} className="animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && dropdownPosition && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: "fixed",
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        maxHeight: 240,
                        zIndex: 99999,
                        background: "var(--bg-elevated, #ffffff)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
                        overflowY: "auto",
                    }}
                >
                    <div
                        style={{
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            borderBottom: "1px solid var(--border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--bg-surface)",
                        }}
                    >
                        <span>Inventory Items ({displayItems.length})</span>
                        {loading && <span style={{ fontSize: 10, color: "var(--accent)", textTransform: "none" }}>Searching...</span>}
                    </div>

                    {displayItems.length === 0 ? (
                        <div style={{ padding: "12px 10px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                            {loading ? "Searching..." : "No matching inventory (You can type custom item)"}
                        </div>
                    ) : (
                        displayItems.map((inv) => (
                            <div
                                key={inv.id}
                                onMouseDown={() => handleSelectItem(inv)}
                                style={{
                                    padding: "8px 10px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid var(--border)",
                                    fontSize: 12.5,
                                    transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover, rgba(0,0,0,0.05))")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.item || inv.name}</span>
                                    {(inv.code || inv.barcode) && (
                                        <span style={{ fontSize: 10.5, color: "var(--text-muted)", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4 }}>
                                            {inv.code || inv.barcode}
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text-muted)",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginTop: 3,
                                    }}
                                >
                                    <span>
                                        Stock:{" "}
                                        <strong style={{ color: parseFloat(inv.qty) > 0 ? "#10b981" : "#ef4444" }}>
                                            {inv.qty ?? 0} {inv.unit || "PCS"}
                                        </strong>
                                    </span>
                                    <span>
                                        Price:{" "}
                                        <strong style={{ color: "var(--accent)" }}>
                                            ₹{parseFloat(inv.selling_price || inv.price || 0).toFixed(2)}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

// ── Quotation Create / Edit Modal ───────────────────────────────────────────
function QuotationModal({ quotation, customers = [], inventoryList = [], onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        quotation_number: quotation?.quotation_number || ("QT-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000)),
        quotation_date: quotation?.quotation_date ? quotation.quotation_date.slice(0, 10) : new Date().toISOString().split("T")[0],
        valid_until: quotation?.valid_until ? quotation.valid_until.slice(0, 10) : "",
        customer_name: quotation?.customer_name || "",
        customer_phone: quotation?.customer_phone || "",
        customer_email: quotation?.customer_email || "",
        customer_address: quotation?.customer_address || "",
        customer_gst: quotation?.customer_gst || "",
        gross_discount: quotation?.gross_discount !== undefined && quotation?.gross_discount !== null ? quotation.gross_discount : "",
        status: quotation?.status || "Pending",
        notes: quotation?.notes || "Thank you for your business. Please contact us for any clarifications.",
        terms: quotation?.terms || "1. Prices are valid for 30 days.\n2. Goods delivery subject to stock availability.",
        items: (quotation?.items || []).length > 0
            ? quotation.items.map((it) => ({
                  description: it.description || "",
                  hsn_sac: it.hsn_sac || "",
                  quantity: it.quantity ?? 1,
                  unit: it.unit || "PCS",
                  rate: it.rate ?? 0,
                  discount_percent: it.discount_percent ?? 0,
                  tax_rate: it.tax_rate ?? 0,
                  amount: it.amount ?? 0,
              }))
            : [
                  {
                      description: "",
                      hsn_sac: "",
                      quantity: 1,
                      unit: "PCS",
                      rate: 0,
                      discount_percent: 0,
                      tax_rate: 0,
                      amount: 0,
                  },
              ],
    });

    const [formError, setFormError] = useState("");

    // Calculate subtotal, gross discount, tax, total
    const computed = useMemo(() => {
        let sub = 0;
        let tax = 0;
        data.items.forEach((it) => {
            const q = parseFloat(it.quantity) || 1;
            const r = parseFloat(it.rate) || 0;
            const discP = parseFloat(it.discount_percent) || 0;
            const base = q * r;
            const discAmt = discP > 0 ? (base * discP) / 100 : 0;
            const taxable = Math.max(0, base - discAmt);
            const taxAmt = (taxable * (parseFloat(it.tax_rate) || 0)) / 100;
            sub += taxable;
            tax += taxAmt;
        });

        const grossDisc = parseFloat(data.gross_discount) || 0;
        const taxableAfterGross = Math.max(0, sub - grossDisc);
        const adjustedTax = sub > 0 && grossDisc > 0 ? (tax * (taxableAfterGross / sub)) : tax;

        return {
            subtotal: sub,
            gross_discount: grossDisc,
            taxable_amount: taxableAfterGross,
            total_tax: adjustedTax,
            total_amount: Math.round(taxableAfterGross + adjustedTax),
        };
    }, [data.items, data.gross_discount]);

    function handleCustomerSelect(name) {
        const found = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (found) {
            setData((prev) => ({
                ...prev,
                customer_name: found.name,
                customer_phone: found.phone || prev.customer_phone,
                customer_email: found.email || prev.customer_email,
                customer_address: found.address || prev.customer_address,
                customer_gst: found.gst_number || prev.customer_gst,
            }));
        } else {
            setData("customer_name", name);
        }
    }

    function addItem() {
        setData("items", [
            ...data.items,
            {
                description: "",
                hsn_sac: "",
                quantity: 1,
                unit: "PCS",
                rate: 0,
                discount_percent: 0,
                tax_rate: 0,
                amount: 0,
            },
        ]);
    }

    function removeItem(idx) {
        if (data.items.length <= 1) return;
        setData("items", data.items.filter((_, i) => i !== idx));
    }

    function handleSelectInventory(idx, inv) {
        const next = [...data.items];
        const name = inv.item || inv.name || "";
        const price = inv.selling_price || inv.price || 0;
        const unit = inv.unit || next[idx].unit || "PCS";

        next[idx] = {
            ...next[idx],
            description: name,
            rate: price > 0 ? price : next[idx].rate,
            unit: unit,
        };

        const q = parseFloat(next[idx].quantity) || 1;
        const r = parseFloat(next[idx].rate) || 0;
        const discP = parseFloat(next[idx].discount_percent) || 0;
        const taxable = Math.max(0, q * r - ((q * r * discP) / 100));
        const tax = (taxable * (parseFloat(next[idx].tax_rate) || 0)) / 100;
        next[idx].amount = taxable + tax;

        setData("items", next);
    }

    function updateItem(idx, field, val) {
        const next = [...data.items];
        next[idx] = { ...next[idx], [field]: val };

        if (field === "description") {
            const inv = inventoryList.find((i) => (i.item || i.name || "").toLowerCase() === val.toLowerCase());
            if (inv) {
                next[idx].rate = inv.selling_price || inv.price || next[idx].rate;
                if (inv.unit) next[idx].unit = inv.unit;
            }
        }

        const q = parseFloat(next[idx].quantity) || 1;
        const r = parseFloat(next[idx].rate) || 0;
        const discP = parseFloat(next[idx].discount_percent) || 0;
        const taxable = Math.max(0, q * r - ((q * r * discP) / 100));
        const tax = (taxable * (parseFloat(next[idx].tax_rate) || 0)) / 100;
        next[idx].amount = taxable + tax;

        setData("items", next);
    }

    function handleSubmit(e) {
        e.preventDefault();
        setFormError("");

        if (!data.customer_name.trim()) {
            setFormError("Customer name is required.");
            return;
        }

        const payload = {
            ...data,
            customer_email: data.customer_email?.trim() || null,
            valid_until: data.valid_until || null,
            gross_discount: data.gross_discount !== "" ? parseFloat(data.gross_discount) : 0,
            subtotal: computed.subtotal,
            taxable_amount: computed.taxable_amount,
            total_tax: computed.total_tax,
            total_amount: computed.total_amount,
        };

        const url = quotation ? `/quotations/${quotation.id}` : "/quotations";
        router.post(url, payload, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs) => setFormError(Object.values(errs)[0] || "Failed to save quotation."),
        });
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: 12 }}>
            <div className="modal-box modal-lg" style={{ maxWidth: 960, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <FileCheck size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{quotation ? "Edit Quotation" : "Create Quotation / Estimate"}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{data.quotation_number} &bull; Quotation &amp; Pricing Estimate</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: 18, overflowY: "auto", flex: 1 }}>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {formError && (
                            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                <AlertCircle size={16} />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, background: "var(--bg-base)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
                            <div className="form-group">
                                <label className="form-label">Quotation #</label>
                                <input className="form-input" value={data.quotation_number} onChange={(e) => setData("quotation_number", e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Customer Name *</label>
                                <input
                                    className="form-input"
                                    list="q-customers"
                                    value={data.customer_name}
                                    onChange={(e) => handleCustomerSelect(e.target.value)}
                                    placeholder="Client or Business name"
                                    required
                                />
                                <datalist id="q-customers">
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Customer Mobile</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    pattern="[0-9]{10}"
                                    className="form-input"
                                    value={data.customer_phone}
                                    onChange={(e) => setData("customer_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    placeholder="10-digit mobile number"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Quotation Date *</span>
                                    {data.quotation_date && (
                                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, background: "rgba(99, 102, 241, 0.08)", padding: "1px 6px", borderRadius: 4 }}>
                                            {formatDate(data.quotation_date)}
                                        </span>
                                    )}
                                </label>
                                <input type="date" className="form-input" value={data.quotation_date} onChange={(e) => setData("quotation_date", e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Valid Until</span>
                                    {data.valid_until && (
                                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, background: "rgba(99, 102, 241, 0.08)", padding: "1px 6px", borderRadius: 4 }}>
                                            {formatDate(data.valid_until)}
                                        </span>
                                    )}
                                </label>
                                <input type="date" className="form-input" value={data.valid_until} onChange={(e) => setData("valid_until", e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-input" value={data.status} onChange={(e) => setData("status", e.target.value)}>
                                    <option value="Pending">Pending</option>
                                    <option value="Accepted">Accepted</option>
                                    <option value="Converted">Converted</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>Estimate Items &amp; Pricing</span>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                                    <Plus size={14} /> Add Line Item
                                </button>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table className="custom-table" style={{ margin: 0, minWidth: 680 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}>#</th>
                                            <th>Description *</th>
                                            <th style={{ width: 90 }}>Qty</th>
                                            <th style={{ width: 80 }}>Unit</th>
                                            <th style={{ width: 110 }}>Rate (₹)</th>
                                            <th style={{ width: 80 }}>Disc %</th>
                                            <th style={{ width: 80 }}>Tax %</th>
                                            <th style={{ width: 110, textAlign: "right" }}>Amount (₹)</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                                                <td style={{ minWidth: 220 }}>
                                                    <DebouncedInventoryInput
                                                        value={it.description}
                                                        onChange={(val) => updateItem(idx, "description", val)}
                                                        onSelect={(inv) => handleSelectInventory(idx, inv)}
                                                        initialItems={inventoryList}
                                                        placeholder="Type or select inventory item..."
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        className="form-input"
                                                        value={it.quantity}
                                                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input className="form-input" value={it.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-input"
                                                        value={it.rate}
                                                        onChange={(e) => updateItem(idx, "rate", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="form-input"
                                                        value={it.discount_percent}
                                                        onChange={(e) => updateItem(idx, "discount_percent", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <select className="form-input" value={it.tax_rate} onChange={(e) => updateItem(idx, "tax_rate", e.target.value)}>
                                                        <option value={0}>0%</option>
                                                        <option value={5}>5%</option>
                                                        <option value={12}>12%</option>
                                                        <option value={18}>18%</option>
                                                        <option value={28}>28%</option>
                                                    </select>
                                                </td>
                                                <td style={{ textAlign: "right", fontWeight: 700 }}>₹{toMoney(it.amount)}</td>
                                                <td style={{ textAlign: "center" }}>
                                                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(idx)}>
                                                        <Trash2 size={14} color="var(--danger)" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bottom Summary */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Terms &amp; Notes</label>
                                <textarea className="form-input" rows={3} value={data.terms} onChange={(e) => setData("terms", e.target.value)} />
                            </div>

                            <div style={{ background: "var(--bg-base)", padding: 14, borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Subtotal:</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(computed.subtotal)}</span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "4px 6px", background: "var(--bg-surface)", borderRadius: 6, border: "1px dashed var(--border)" }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Gross Discount (₹):</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-input"
                                        placeholder="0.00"
                                        style={{ width: 100, padding: "3px 6px", textAlign: "right", fontWeight: 700, color: "var(--danger)" }}
                                        value={data.gross_discount}
                                        onChange={(e) => setData("gross_discount", e.target.value)}
                                    />
                                </div>

                                {computed.gross_discount > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--danger)" }}>
                                        <span>Discount Deducted:</span>
                                        <span>- ₹{toMoney(computed.gross_discount)}</span>
                                    </div>
                                )}

                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Total Tax (GST):</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(computed.total_tax)}</span>
                                </div>
                                <div style={{ borderTop: "1px dashed var(--border)", margin: "4px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}>
                                    <span>Quotation Total:</span>
                                    <span style={{ color: "var(--accent)" }}>₹{toMoney(computed.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? "Saving..." : quotation ? "Update Quotation" : "Save Quotation"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ── Driver Delivery Challan Modal ───────────────────────────────────────────
function ChallanModal({ challan, invoices = [], onClose }) {
    const [selectedBillId, setSelectedBillId] = useState("");
    const { data, setData, post, processing, errors } = useForm({
        challan_number: challan?.challan_number || ("DC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000)),
        challan_date: challan?.challan_date ? challan.challan_date.slice(0, 10) : new Date().toISOString().split("T")[0],
        customer_name: challan?.customer_name || "",
        customer_phone: challan?.customer_phone || "",
        delivery_address: challan?.delivery_address || "",
        driver_name: challan?.driver_name || "",
        driver_phone: challan?.driver_phone || "",
        vehicle_number: challan?.vehicle_number || "",
        transporter_name: challan?.transporter_name || "",
        eway_bill_no: challan?.eway_bill_no || "",
        dispatch_time: challan?.dispatch_time || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        status: challan?.status || "Dispatched",
        notes: challan?.notes || "Goods dispatched in good condition. Driver copy.",
        items: (challan?.items || []).length > 0
            ? challan.items.map((it) => ({
                  description: it.description || "",
                  quantity: it.quantity ?? 1,
                  unit: it.unit || "PCS",
                  packages: it.packages || 1,
                  remarks: it.remarks || "",
              }))
            : [
                  {
                      description: "",
                      quantity: 1,
                      unit: "PCS",
                      packages: 1,
                      remarks: "",
                  },
              ],
    });

    const [formErr, setFormErr] = useState("");

    function handleSelectBill(billId) {
        setSelectedBillId(billId);
        if (!billId) return;

        const inv = (invoices || []).find((b) => String(b.id) === String(billId));
        if (!inv) return;

        const mappedItems = (inv.items && inv.items.length > 0)
            ? inv.items.map((it) => ({
                  description: it.item_name || it.description || "",
                  quantity: parseFloat(it.quantity) || 1,
                  unit: it.unit || "PCS",
                  packages: 1,
                  remarks: it.hsn_sac ? `HSN: ${it.hsn_sac}` : "",
              }))
            : [
                  {
                      description: `Invoice #${inv.invoice_number} Goods`,
                      quantity: 1,
                      unit: "LOT",
                      packages: 1,
                      remarks: "",
                  },
              ];

        setData((prev) => ({
            ...prev,
            customer_name: inv.customer_name || prev.customer_name,
            customer_phone: inv.customer_phone || prev.customer_phone,
            delivery_address: inv.customer_address || inv.place_of_supply || prev.delivery_address,
            notes: `Dispatched against Tax Invoice #${inv.invoice_number}. Driver copy.`,
            items: mappedItems,
        }));
    }

    function addItem() {
        setData("items", [...data.items, { description: "", quantity: 1, unit: "PCS", packages: 1, remarks: "" }]);
    }

    function removeItem(idx) {
        if (data.items.length <= 1) return;
        setData("items", data.items.filter((_, i) => i !== idx));
    }

    function updateItem(idx, field, val) {
        const next = [...data.items];
        next[idx] = { ...next[idx], [field]: val };
        setData("items", next);
    }

    function handleSubmit(e) {
        e.preventDefault();
        setFormErr("");
        if (!data.customer_name.trim()) {
            setFormErr("Consignee / Customer name is required.");
            return;
        }

        const url = challan ? `/delivery-challans/${challan.id}` : "/delivery-challans";
        router.post(url, data, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs) => setFormErr(Object.values(errs)[0] || "Failed to save delivery challan."),
        });
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: 12 }}>
            <div className="modal-box modal-lg" style={{ maxWidth: 940, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Truck size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{challan ? "Edit Delivery Challan" : "Create Driver Delivery Challan"}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{data.challan_number} &bull; Goods Transport &amp; Gate Pass</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: 18, overflowY: "auto", flex: 1 }}>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {formErr && (
                            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                                {formErr}
                            </div>
                        )}

                        {/* Bill / Invoice Quick Auto-fill Banner */}
                        <div
                            style={{
                                background: "linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)",
                                border: "1px solid #c7d2fe",
                                borderRadius: 10,
                                padding: "12px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 12,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 6, background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Receipt size={17} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1e1b4b" }}>
                                        Auto-fill from Sales Bill / Invoice
                                    </div>
                                    <div style={{ fontSize: 11.5, color: "#64748b" }}>
                                        Select any bill to instantly load consignee details and all item lines
                                    </div>
                                </div>
                            </div>
                            <div style={{ minWidth: 260, flex: "0 1 320px" }}>
                                <select
                                    className="form-input"
                                    style={{ background: "#fff", borderColor: "#818cf8", fontSize: 13, fontWeight: 500 }}
                                    value={selectedBillId}
                                    onChange={(e) => handleSelectBill(e.target.value)}
                                >
                                    <option value="">-- Choose Existing Bill --</option>
                                    {(invoices || []).map((inv) => (
                                        <option key={inv.id} value={inv.id}>
                                            #{inv.invoice_number} &bull; {inv.customer_name} (₹{toMoney(inv.total_amount)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Consignee / Customer Info */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, background: "var(--bg-base)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
                            <div className="form-group">
                                <label className="form-label">Challan #</label>
                                <input className="form-input" value={data.challan_number} onChange={(e) => setData("challan_number", e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Challan Date *</span>
                                    {data.challan_date && (
                                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, background: "rgba(99, 102, 241, 0.08)", padding: "1px 6px", borderRadius: 4 }}>
                                            {formatDate(data.challan_date)}
                                        </span>
                                    )}
                                </label>
                                <input type="date" className="form-input" value={data.challan_date} onChange={(e) => setData("challan_date", e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Consignee / Customer *</label>
                                <input className="form-input" value={data.customer_name} onChange={(e) => setData("customer_name", e.target.value)} placeholder="Recipient name" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Consignee Mobile</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    pattern="[0-9]{10}"
                                    className="form-input"
                                    value={data.customer_phone}
                                    onChange={(e) => setData("customer_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    placeholder="10-digit mobile number"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Delivery Destination</label>
                                <input className="form-input" value={data.delivery_address} onChange={(e) => setData("delivery_address", e.target.value)} placeholder="Delivery location / city" />
                            </div>
                        </div>

                        {/* Driver & Transport Info (Vyapar style) */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #cbd5e1" }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, color: "#1e1b4b" }}>Driver Name</label>
                                <input className="form-input" value={data.driver_name} onChange={(e) => setData("driver_name", e.target.value)} placeholder="Driver / Carrier name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, color: "#1e1b4b" }}>Driver Contact Phone</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    pattern="[0-9]{10}"
                                    className="form-input"
                                    value={data.driver_phone}
                                    onChange={(e) => setData("driver_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    placeholder="10-digit mobile number"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, color: "#1e1b4b" }}>Vehicle / Truck Number</label>
                                <input className="form-input" value={data.vehicle_number} onChange={(e) => setData("vehicle_number", e.target.value.toUpperCase())} placeholder="DL 01 AB 1234" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Transporter / Transport Co.</label>
                                <input className="form-input" value={data.transporter_name} onChange={(e) => setData("transporter_name", e.target.value)} placeholder="e.g. VRL / SafeX" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">E-Way Bill / LR No.</label>
                                <input className="form-input" value={data.eway_bill_no} onChange={(e) => setData("eway_bill_no", e.target.value)} placeholder="E-way bill number" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Dispatch Status</label>
                                <select className="form-input" value={data.status} onChange={(e) => setData("status", e.target.value)}>
                                    <option value="Dispatched">Dispatched</option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Returned">Returned</option>
                                </select>
                            </div>
                        </div>

                        {/* Dispatched Items */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>Items Loaded for Dispatch</span>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table className="custom-table" style={{ margin: 0, minWidth: 600 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}>#</th>
                                            <th>Item Description *</th>
                                            <th style={{ width: 100 }}>Quantity</th>
                                            <th style={{ width: 90 }}>Unit</th>
                                            <th style={{ width: 100 }}>Packages / Boxes</th>
                                            <th>Remarks</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                                                <td>
                                                    <input className="form-input" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Product name" required />
                                                </td>
                                                <td>
                                                    <input type="number" step="0.001" min="0.001" className="form-input" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                                                </td>
                                                <td>
                                                    <input className="form-input" value={it.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                                                </td>
                                                <td>
                                                    <input type="number" min="1" className="form-input" value={it.packages} onChange={(e) => updateItem(idx, "packages", e.target.value)} />
                                                </td>
                                                <td>
                                                    <input className="form-input" value={it.remarks} onChange={(e) => updateItem(idx, "remarks", e.target.value)} placeholder="Seal / Batch" />
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(idx)}>
                                                        <Trash2 size={14} color="var(--danger)" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Driver Instructions &amp; Gate Notes</label>
                            <textarea className="form-input" rows={2} value={data.notes} onChange={(e) => setData("notes", e.target.value)} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>
                                {processing ? "Saving..." : challan ? "Update Challan" : "Save Driver Challan"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ── Print Driver Challan Modal ──────────────────────────────────────────────
function PrintChallanModal({ challan, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, padding: 12 }}>
            <div className="modal-box modal-lg" style={{ maxWidth: 800, width: "100%", maxHeight: "94vh", display: "flex", flexDirection: "column", padding: 0 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: "12px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Driver Delivery Challan / Gate Pass Preview</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                            <Printer size={15} /> Print Challan
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: 30, overflowY: "auto", background: "#ffffff", color: "#0f172a", fontFamily: "sans-serif" }}>
                    <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 12 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.04em" }}>DELIVERY CHALLAN &amp; GATE PASS</div>
                        <div style={{ fontSize: 13, color: "#475569" }}>Driver / Transporter Copy</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, fontSize: 12 }}>
                        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6 }}>
                            <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Challan Info</div>
                            <div><strong>Challan No:</strong> {challan.challan_number}</div>
                            <div><strong>Date:</strong> {challan.challan_date}</div>
                            <div><strong>Status:</strong> {challan.status}</div>
                            {challan.eway_bill_no && <div><strong>E-Way Bill:</strong> {challan.eway_bill_no}</div>}
                        </div>
                        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6 }}>
                            <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Consignee / Destination</div>
                            <div><strong>Customer:</strong> {challan.customer_name}</div>
                            <div><strong>Address:</strong> {challan.delivery_address || "As per order"}</div>
                            {challan.customer_phone && <div><strong>Phone:</strong> {challan.customer_phone}</div>}
                        </div>
                    </div>

                    <div style={{ background: "#eef2ff", padding: 12, borderRadius: 6, marginTop: 12, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#4338ca", marginBottom: 4 }}>🚛 Transporter &amp; Driver Details</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                            <div><strong>Vehicle No:</strong> {challan.vehicle_number || "N/A"}</div>
                            <div><strong>Driver Name:</strong> {challan.driver_name || "N/A"}</div>
                            <div><strong>Driver Phone:</strong> {challan.driver_phone || "N/A"}</div>
                            <div><strong>Transporter:</strong> {challan.transporter_name || "Self / Own Vehicle"}</div>
                        </div>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>#</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Description of Goods</th>
                                <th style={{ padding: "8px 10px", textAlign: "center" }}>Qty</th>
                                <th style={{ padding: "8px 10px", textAlign: "center" }}>Unit</th>
                                <th style={{ padding: "8px 10px", textAlign: "center" }}>Packages</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(challan.items || []).map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                    <td style={{ padding: "8px 10px" }}>{idx + 1}</td>
                                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{it.description}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.quantity}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.unit}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.packages || 1}</td>
                                    <td style={{ padding: "8px 10px", color: "#64748b" }}>{it.remarks || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", paddingTop: 20 }}>
                        <div style={{ textAlign: "center", width: 180, borderTop: "1px solid #94a3b8", paddingTop: 8, fontSize: 12 }}>
                            Driver / Carrier Signature
                        </div>
                        <div style={{ textAlign: "center", width: 180, borderTop: "1px solid #94a3b8", paddingTop: 8, fontSize: 12 }}>
                            Receiver's Signature &amp; Stamp
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Print / Download Quotation Modal (Official Admin Format) ─────────────────
function PrintQuotationModal({ quotation, businessProfile = {}, onClose }) {
    const printRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    const sellerName = businessProfile?.business_name || "Vama Invoice Admin";
    const sellerAddress = businessProfile?.address || "";
    const sellerGst = businessProfile?.gst_number || "";
    const sellerPhone = businessProfile?.phone || "";
    const sellerEmail = businessProfile?.email || "";

    const handleDownloadPDF = async () => {
        if (!printRef.current || downloading) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            const pdf = new jsPDF("p", "pt", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Quotation_${quotation.quotation_number}_${sellerName.replace(/\s+/g, "_")}.pdf`);
        } catch (err) {
            console.error("Failed to generate Quotation PDF", err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, padding: 12 }}>
            <div className="modal-box modal-lg" style={{ maxWidth: 840, width: "100%", maxHeight: "94vh", display: "flex", flexDirection: "column", padding: 0 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: "12px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                        Quotation #{quotation.quotation_number} Preview &bull; {sellerName}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF} disabled={downloading}>
                            <Download size={14} /> {downloading ? "Downloading..." : "Download PDF"}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: 20, overflowY: "auto", background: "#f1f5f9", flex: 1 }}>
                    <div
                        ref={printRef}
                        style={{
                            maxWidth: 780,
                            margin: "0 auto",
                            background: "#ffffff",
                            padding: "28px 32px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            fontFamily: "sans-serif",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        }}
                    >
                        {/* Header: Admin / Business Details */}
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: "#1e1b4b" }}>{sellerName}</div>
                                {sellerAddress && <div style={{ fontSize: 12, color: "#475569", maxWidth: 320, marginTop: 2 }}>{sellerAddress}</div>}
                                {sellerGst && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}><strong>GSTIN:</strong> {sellerGst}</div>}
                                {sellerPhone && <div style={{ fontSize: 12, color: "#475569" }}><strong>Phone:</strong> {sellerPhone}</div>}
                                {sellerEmail && <div style={{ fontSize: 12, color: "#475569" }}><strong>Email:</strong> {sellerEmail}</div>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 24, fontWeight: 900, color: "#4338ca", letterSpacing: "0.03em" }}>QUOTATION</div>
                                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>#{quotation.quotation_number}</div>
                                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Date: {quotation.quotation_date}</div>
                                {quotation.valid_until && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 2 }}>Valid Until: {quotation.valid_until}</div>}
                                <div style={{ marginTop: 6 }}>
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: quotation.status === "Converted" ? "#e0e7ff" : quotation.status === "Accepted" ? "#ecfdf5" : "#fef3c7", color: quotation.status === "Converted" ? "#3730a3" : quotation.status === "Accepted" ? "#047857" : "#b45309" }}>
                                        {quotation.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div style={{ marginTop: 16, background: "#f8fafc", padding: "12px 16px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Quotation Prepared For:</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{quotation.customer_name}</div>
                            {quotation.customer_address && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{quotation.customer_address}</div>}
                            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#475569", marginTop: 4, flexWrap: "wrap" }}>
                                {quotation.customer_phone && <span><strong>Mobile:</strong> {quotation.customer_phone}</span>}
                                {quotation.customer_email && <span><strong>Email:</strong> {quotation.customer_email}</span>}
                                {quotation.customer_gst && <span><strong>GSTIN:</strong> {quotation.customer_gst}</span>}
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                                    <th style={{ padding: "8px 10px", textAlign: "left", width: 30 }}>#</th>
                                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                                    <th style={{ padding: "8px 10px", textAlign: "center", width: 70 }}>Qty</th>
                                    <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>Unit</th>
                                    <th style={{ padding: "8px 10px", textAlign: "right", width: 90 }}>Rate (₹)</th>
                                    <th style={{ padding: "8px 10px", textAlign: "right", width: 60 }}>Disc %</th>
                                    <th style={{ padding: "8px 10px", textAlign: "right", width: 60 }}>GST %</th>
                                    <th style={{ padding: "8px 10px", textAlign: "right", width: 100 }}>Total (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(quotation.items || []).map((it, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{idx + 1}</td>
                                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                                            {it.description}
                                            {it.hsn_sac && <span style={{ fontSize: 10.5, color: "#64748b", marginLeft: 6 }}>(HSN: {it.hsn_sac})</span>}
                                        </td>
                                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.quantity}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.unit || "PCS"}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right" }}>₹{toMoney(it.rate)}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right" }}>{parseFloat(it.discount_percent || 0) > 0 ? `${it.discount_percent}%` : "-"}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right" }}>{parseFloat(it.tax_rate || 0) > 0 ? `${it.tax_rate}%` : "0%"}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹{toMoney(it.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary Block */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 20, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 260, fontSize: 12 }}>
                                {quotation.notes && (
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 2 }}>Notes:</div>
                                        <div style={{ color: "#334155" }}>{quotation.notes}</div>
                                    </div>
                                )}
                                {quotation.terms && (
                                    <div>
                                        <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 2 }}>Terms &amp; Conditions:</div>
                                        <div style={{ color: "#334155", whiteSpace: "pre-line" }}>{quotation.terms}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ width: 280, background: "#f8fafc", padding: "12px 16px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                                    <span style={{ color: "#64748b" }}>Subtotal:</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(quotation.subtotal)}</span>
                                </div>
                                {parseFloat(quotation.gross_discount || 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#dc2626" }}>
                                        <span>Gross Discount:</span>
                                        <span>- ₹{toMoney(quotation.gross_discount)}</span>
                                    </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                                    <span style={{ color: "#64748b" }}>Taxable Amount:</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(quotation.taxable_amount || quotation.subtotal)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                                    <span style={{ color: "#64748b" }}>Total Tax (GST):</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(quotation.total_tax)}</span>
                                </div>
                                <div style={{ borderTop: "2px solid #0f172a", margin: "6px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 15, fontWeight: 900 }}>
                                    <span>Total Amount:</span>
                                    <span style={{ color: "#4338ca" }}>₹{toMoney(quotation.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sign-off */}
                        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 16 }}>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                                This is a computer-generated quotation issued by <strong>{sellerName}</strong>.
                            </div>
                            <div style={{ textAlign: "center", width: 200, borderTop: "1px solid #94a3b8", paddingTop: 8, fontSize: 12 }}>
                                Authorized Signatory<br />
                                <strong>{sellerName}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Quotations & Challan Page ──────────────────────────────────────────
export default function QuotationsIndex({ quotations = [], challans = [], customers = [], inventoryList = [], invoices = [], businessProfile = {} }) {
    const [activeTab, setActiveTab] = useState("quotations"); // 'quotations' | 'challans'
    const [search, setSearch] = useState("");

    const [qModalOpen, setQModalOpen] = useState(false);
    const [editingQ, setEditingQ] = useState(null);
    const [printingQ, setPrintingQ] = useState(null);

    const [cModalOpen, setCModalOpen] = useState(false);
    const [editingC, setEditingC] = useState(null);
    const [printingC, setPrintingC] = useState(null);

    const filteredQuotations = useMemo(() => {
        if (!search.trim()) return quotations;
        const q = search.toLowerCase();
        return quotations.filter((item) =>
            (item.quotation_number || "").toLowerCase().includes(q) ||
            (item.customer_name || "").toLowerCase().includes(q)
        );
    }, [quotations, search]);

    const filteredChallans = useMemo(() => {
        if (!search.trim()) return challans;
        const q = search.toLowerCase();
        return challans.filter((item) =>
            (item.challan_number || "").toLowerCase().includes(q) ||
            (item.customer_name || "").toLowerCase().includes(q) ||
            (item.driver_name || "").toLowerCase().includes(q) ||
            (item.vehicle_number || "").toLowerCase().includes(q)
        );
    }, [challans, search]);

    function handleDeleteQ(id, num) {
        if (!confirm(`Delete Quotation #${num}?`)) return;
        router.delete(`/quotations/${id}`);
    }

    function handleConvertToInvoice(id, num) {
        if (!confirm(`Convert Quotation #${num} into a live Tax Invoice?`)) return;
        router.post(`/quotations/${id}/convert-to-invoice`);
    }

    function handleDeleteC(id, num) {
        if (!confirm(`Delete Delivery Challan #${num}?`)) return;
        router.delete(`/delivery-challans/${id}`);
    }

    return (
        <AppLayout title="Quotations & Driver Challans">
            <div className="page-full-card">
                {/* Top Header / Switcher Tabs */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 8, background: "var(--bg-surface)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
                        <button
                            className={`btn btn-sm ${activeTab === "quotations" ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setActiveTab("quotations")}
                            style={{ gap: 6, fontSize: 13 }}
                        >
                            <FileCheck size={16} /> Quotations &amp; Estimates ({quotations.length})
                        </button>
                        <button
                            className={`btn btn-sm ${activeTab === "challans" ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setActiveTab("challans")}
                            style={{ gap: 6, fontSize: 13 }}
                        >
                            <Truck size={16} /> Driver Delivery Challans ({challans.length})
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {activeTab === "quotations" ? (
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setEditingQ(null);
                                    setQModalOpen(true);
                                }}
                            >
                                <Plus size={16} /> New Quotation
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setEditingC(null);
                                    setCModalOpen(true);
                                }}
                            >
                                <Plus size={16} /> New Driver Challan
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="search-input-wrap" style={{ width: "100%", maxWidth: 360 }}>
                        <Search size={16} />
                        <input
                            className="search-input"
                            placeholder={activeTab === "quotations" ? "Search quotation #, customer..." : "Search challan #, driver, vehicle..."}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="btn-icon" onClick={() => setSearch("")}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab 1: Quotations List */}
                {activeTab === "quotations" && (
                    <div className="table-wrap">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Quotation #</th>
                                    <th>Date</th>
                                    <th>Valid Until</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th style={{ textAlign: "right" }}>Total Amount</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "center", width: 170 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuotations.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                                            <FileCheck size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                                            <div style={{ fontWeight: 600 }}>No quotations found.</div>
                                            <div style={{ fontSize: 12 }}>Create an estimate to send to prospective clients.</div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuotations.map((q) => (
                                        <tr key={q.id}>
                                            <td style={{ fontWeight: 700, color: "var(--accent)" }}>{q.quotation_number}</td>
                                            <td style={{ fontSize: 12 }}>{formatDate(q.quotation_date)}</td>
                                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(q.valid_until)}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{q.customer_name}</div>
                                                {q.customer_phone && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📞 {q.customer_phone}</div>}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{(q.items || []).length} items</td>
                                            <td style={{ textAlign: "right", fontWeight: 700 }}>₹{toMoney(q.total_amount)}</td>
                                            <td>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        background: q.status === "Converted" ? "#e0e7ff" : q.status === "Accepted" ? "#ecfdf5" : "#fef3c7",
                                                        color: q.status === "Converted" ? "#3730a3" : q.status === "Accepted" ? "#047857" : "#b45309",
                                                    }}
                                                >
                                                    {q.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <TableActionDropdown label="Actions">
                                                    <ActionItem
                                                        icon={Download}
                                                        label="Download PDF"
                                                        onClick={() => setPrintingQ(q)}
                                                        primary
                                                    />
                                                    {q.status !== "Converted" && (
                                                        <ActionItem
                                                            icon={Receipt}
                                                            label="Convert to Invoice"
                                                            onClick={() => handleConvertToInvoice(q.id, q.quotation_number)}
                                                        />
                                                    )}
                                                    <ActionItem
                                                        icon={Edit2}
                                                        label="Edit Quotation"
                                                        onClick={() => {
                                                            setEditingQ(q);
                                                            setQModalOpen(true);
                                                        }}
                                                    />
                                                    <ActionItem
                                                        icon={Trash2}
                                                        label="Delete Quotation"
                                                        onClick={() => handleDeleteQ(q.id, q.quotation_number)}
                                                        danger
                                                    />
                                                </TableActionDropdown>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab 2: Driver Delivery Challans List */}
                {activeTab === "challans" && (
                    <div className="table-wrap">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Challan #</th>
                                    <th>Date</th>
                                    <th>Consignee / Destination</th>
                                    <th>Driver &amp; Vehicle</th>
                                    <th>Transporter / LR</th>
                                    <th>Items</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "center", width: 140 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredChallans.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                                            <Truck size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                                            <div style={{ fontWeight: 600 }}>No driver delivery challans found.</div>
                                            <div style={{ fontSize: 12 }}>Create a delivery challan for goods dispatch.</div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChallans.map((c) => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 700, color: "var(--accent)" }}>{c.challan_number}</td>
                                            <td style={{ fontSize: 12 }}>{formatDate(c.challan_date)}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                                                {c.delivery_address && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📍 {c.delivery_address}</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>🚛 {c.vehicle_number || "No vehicle #"}</div>
                                                {c.driver_name && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>👤 {c.driver_name} ({c.driver_phone || "No phone"})</div>}
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                <div>{c.transporter_name || "Self Delivery"}</div>
                                                {c.eway_bill_no && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>E-way: {c.eway_bill_no}</div>}
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                                    {(c.items || []).reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0)} Total Qty
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                    {(c.items || []).length} line items
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        background: c.status === "Delivered" ? "#ecfdf5" : c.status === "In Transit" ? "#e0e7ff" : "#fef3c7",
                                                        color: c.status === "Delivered" ? "#047857" : c.status === "In Transit" ? "#4338ca" : "#b45309",
                                                    }}
                                                >
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <TableActionDropdown label="Actions">
                                                    <ActionItem
                                                        icon={Printer}
                                                        label="Print Challan"
                                                        onClick={() => setPrintingC(c)}
                                                        primary
                                                    />
                                                    <ActionItem
                                                        icon={Edit2}
                                                        label="Edit Challan"
                                                        onClick={() => {
                                                            setEditingC(c);
                                                            setCModalOpen(true);
                                                        }}
                                                    />
                                                    <ActionItem
                                                        icon={Trash2}
                                                        label="Delete Challan"
                                                        onClick={() => handleDeleteC(c.id, c.challan_number)}
                                                        danger
                                                    />
                                                </TableActionDropdown>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modals */}
                {qModalOpen && (
                    <QuotationModal
                        quotation={editingQ}
                        customers={customers}
                        inventoryList={inventoryList}
                        onClose={() => {
                            setQModalOpen(false);
                            setEditingQ(null);
                        }}
                    />
                )}

                {cModalOpen && (
                    <ChallanModal
                        challan={editingC}
                        invoices={invoices}
                        onClose={() => {
                            setCModalOpen(false);
                            setEditingC(null);
                        }}
                    />
                )}

                {printingC && (
                    <PrintChallanModal
                        challan={printingC}
                        onClose={() => setPrintingC(null)}
                    />
                )}

                {printingQ && (
                    <PrintQuotationModal
                        quotation={printingQ}
                        businessProfile={businessProfile}
                        onClose={() => setPrintingQ(null)}
                    />
                )}
            </div>
        </AppLayout>
    );
}
