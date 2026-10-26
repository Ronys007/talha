import { useMemo, useState } from "react";
import { useForm, router } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import {
    Percent,
    Calculator,
    IndianRupee,
    TrendingUp,
    FileCheck,
    Receipt,
    ShoppingBag,
    Plus,
    Check,
    Printer,
    ArrowRight,
    Sparkles,
    AlertCircle,
    PackageCheck,
    ExternalLink
} from "lucide-react";

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

const PRESET_MARGINS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function MarginIndex({ invoices = [], purchases = [], inventoryList = [], businessProfile = {} }) {
    const [sourceType, setSourceType] = useState("purchase"); // 'purchase' | 'invoice' | 'manual'
    const [selectedBillId, setSelectedBillId] = useState("");
    const [manualCost, setManualCost] = useState("10000");

    const [marginMode, setMarginMode] = useState("percent"); // 'percent' | 'fixed'
    const [marginPercent, setMarginPercent] = useState(20);
    const [marginFixed, setMarginFixed] = useState(2000);
    const [grossDiscount, setGrossDiscount] = useState("");

    // Customer target for quotation conversion
    const [quotationCustomer, setQuotationCustomer] = useState("");
    const [quotationPhone, setQuotationPhone] = useState("");
    const [isConverting, setIsConverting] = useState(false);

    // Get active bill based on selection
    const activeBill = useMemo(() => {
        if (sourceType === "purchase") {
            return purchases.find((p) => p.id === Number(selectedBillId)) || purchases[0] || null;
        } else if (sourceType === "invoice") {
            return invoices.find((i) => i.id === Number(selectedBillId)) || invoices[0] || null;
        }
        return null;
    }, [sourceType, selectedBillId, purchases, invoices]);

    // Compute raw bill cost
    const rawCost = useMemo(() => {
        if (sourceType === "manual") {
            return parseFloat(manualCost) || 0;
        }
        if (activeBill) {
            return parseFloat(activeBill.subtotal || activeBill.total_amount) || 0;
        }
        return 0;
    }, [sourceType, manualCost, activeBill]);

    // Base cost after gross discount
    const baseCost = useMemo(() => {
        const disc = parseFloat(grossDiscount) || 0;
        return Math.max(0, rawCost - disc);
    }, [rawCost, grossDiscount]);

    // Compute added margin and final price
    const { marginAmount, finalSellingPrice, grossMarginPercent, markupPercent } = useMemo(() => {
        let added = 0;
        if (marginMode === "percent") {
            added = (baseCost * (parseFloat(marginPercent) || 0)) / 100;
        } else {
            added = parseFloat(marginFixed) || 0;
        }

        const finalPrice = baseCost + added;
        const gMargin = finalPrice > 0 ? (added / finalPrice) * 100 : 0;
        const mUp = baseCost > 0 ? (added / baseCost) * 100 : 0;

        return {
            marginAmount: added,
            finalSellingPrice: finalPrice,
            grossMarginPercent: gMargin,
            markupPercent: mUp,
        };
    }, [baseCost, marginMode, marginPercent, marginFixed]);

    // Item-level breakdown with applied margin
    const itemBreakdown = useMemo(() => {
        if (sourceType === "manual" || !activeBill || !activeBill.items || activeBill.items.length === 0) {
            return [];
        }

        const pct = marginMode === "percent" ? (parseFloat(marginPercent) || 0) : baseCost > 0 ? (marginAmount / baseCost) * 100 : 0;

        return activeBill.items.map((it) => {
            const costRate = parseFloat(it.rate) || 0;
            const qty = parseFloat(it.quantity) || 1;
            const itemMargin = (costRate * pct) / 100;
            const sellingRate = Math.round((costRate + itemMargin) * 100) / 100;
            const lineCost = costRate * qty;
            const lineSelling = sellingRate * qty;

            return {
                id: it.id,
                description: it.description || it.item_name || "Item",
                quantity: qty,
                unit: it.unit || "PCS",
                costRate: costRate,
                sellingRate: sellingRate,
                marginPerUnit: itemMargin,
                lineCost: lineCost,
                lineSelling: lineSelling,
                taxRate: parseFloat(it.tax_rate || it.gst_rate) || 0,
            };
        });
    }, [sourceType, activeBill, marginMode, marginPercent, marginAmount, baseCost]);

    function handlePreset(p) {
        setMarginMode("percent");
        setMarginPercent(p);
    }

    // 1-Click Create Quotation with Marked-up Prices
    function handleCreateQuotation() {
        if (!quotationCustomer.trim()) {
            alert("Please enter a customer name for the quotation.");
            return;
        }

        const itemsPayload = itemBreakdown.length > 0
            ? itemBreakdown.map((it) => ({
                  description: it.description,
                  quantity: it.quantity,
                  unit: it.unit,
                  cost_price: it.costRate,
                  rate: it.sellingRate,
                  tax_rate: it.taxRate,
                  amount: it.lineSelling,
                  margin_percent: marginPercent,
              }))
            : [
                  {
                      description: `Goods / Bill (${activeBill ? activeBill.po_number || activeBill.invoice_number : "Markup Bill"})`,
                      quantity: 1,
                      unit: "LOT",
                      cost_price: baseCost,
                      rate: finalSellingPrice,
                      tax_rate: 0,
                      amount: finalSellingPrice,
                      margin_percent: marginPercent,
                  },
              ];

        setIsConverting(true);
        router.post("/margin/create-quotation", {
            customer_name: quotationCustomer,
            customer_phone: quotationPhone,
            applied_margin_percent: marginPercent,
            applied_margin_amount: marginAmount,
            subtotal: finalSellingPrice,
            total_tax: 0,
            total_amount: finalSellingPrice,
            notes: `Calculated from ${sourceType === "purchase" ? "Purchase Bill" : "Invoice"} with +${marginPercent}% profit markup.`,
            items: itemsPayload,
        }, {
            onFinish: () => setIsConverting(false),
        });
    }

    function handleUpdateItemInventory(itemName, newPrice) {
        router.post("/margin/update-item-price", {
            item_name: itemName,
            new_price: newPrice,
        });
    }

    return (
        <AppLayout title="Bill Margin & Profit Calculator">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", paddingBottom: 60 }}>
                {/* Header Banner */}
                <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", color: "#ffffff", padding: "clamp(14px, 2.2vw, 22px)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Percent size={22} color="#818cf8" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "clamp(15px, 2vw, 18px)", fontWeight: 800 }}>Vama Invoice Bill Margin &amp; Price Markup</div>
                            <div style={{ fontSize: "clamp(11px, 1.3vw, 12.5px)", opacity: 0.85 }}>Add markup percentage or profit margin to your bills to calculate selling price and quotations.</div>
                        </div>
                    </div>
                </div>

                {/* Top Controls: Choose Bill Source & Margin Settings */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 14 }}>
                    {/* Panel 1: Bill Selector */}
                    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                            <Receipt size={17} color="var(--accent)" />
                            <span>1. Select Bill or Enter Amount</span>
                        </div>

                        {/* Source Switcher */}
                        <div style={{ display: "flex", gap: 6, background: "var(--bg-base)", padding: 4, borderRadius: 8 }}>
                            <button
                                className={`btn btn-sm ${sourceType === "purchase" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setSourceType("purchase")}
                                style={{ flex: 1, fontSize: 12 }}
                            >
                                Purchase Bill ({purchases.length})
                            </button>
                            <button
                                className={`btn btn-sm ${sourceType === "invoice" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setSourceType("invoice")}
                                style={{ flex: 1, fontSize: 12 }}
                            >
                                Sales Invoice ({invoices.length})
                            </button>
                            <button
                                className={`btn btn-sm ${sourceType === "manual" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setSourceType("manual")}
                                style={{ flex: 1, fontSize: 12 }}
                            >
                                Manual Amount
                            </button>
                        </div>

                        {sourceType === "purchase" && (
                            <div className="form-group">
                                <label className="form-label">Select Purchase Bill</label>
                                <select
                                    className="form-input"
                                    value={selectedBillId}
                                    onChange={(e) => setSelectedBillId(e.target.value)}
                                >
                                    {purchases.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.po_number} &bull; {p.supplier_name} (₹{toMoney(p.total_amount)}) &bull; {formatDate(p.order_date)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {sourceType === "invoice" && (
                            <div className="form-group">
                                <label className="form-label">Select Tax Invoice</label>
                                <select
                                    className="form-input"
                                    value={selectedBillId}
                                    onChange={(e) => setSelectedBillId(e.target.value)}
                                >
                                    {invoices.map((i) => (
                                        <option key={i.id} value={i.id}>
                                            {i.invoice_number} &bull; {i.customer_name} (₹{toMoney(i.total_amount)}) &bull; {formatDate(i.invoice_date)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {sourceType === "manual" && (
                            <div className="form-group">
                                <label className="form-label">Enter Base Bill / Cost Amount (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={manualCost}
                                    onChange={(e) => setManualCost(e.target.value)}
                                    placeholder="e.g. 25000"
                                />
                            </div>
                        )}

                        {activeBill && sourceType !== "manual" && (
                            <div style={{ background: "var(--bg-base)", padding: 10, borderRadius: 8, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ color: "var(--text-muted)" }}>Party / Name:</div>
                                    <div style={{ fontWeight: 700 }}>{activeBill.supplier_name || activeBill.customer_name}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ color: "var(--text-muted)" }}>Original Bill Total:</div>
                                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>₹{toMoney(activeBill.total_amount)}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel 2: Margin Controls */}
                    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                            <Calculator size={17} color="var(--accent)" />
                            <span>2. Configure Profit Margin</span>
                        </div>

                        {/* Mode Switcher */}
                        <div style={{ display: "flex", gap: 6 }}>
                            <button
                                className={`btn btn-sm ${marginMode === "percent" ? "btn-primary" : "btn-secondary"}`}
                                onClick={() => setMarginMode("percent")}
                                style={{ flex: 1, fontSize: 12 }}
                            >
                                Margin in Percentage (%)
                            </button>
                            <button
                                className={`btn btn-sm ${marginMode === "fixed" ? "btn-primary" : "btn-secondary"}`}
                                onClick={() => setMarginMode("fixed")}
                                style={{ flex: 1, fontSize: 12 }}
                            >
                                Fixed Profit (₹)
                            </button>
                        </div>

                        {/* Preset Margin Pills */}
                        {marginMode === "percent" && (
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
                                    QUICK PRESET MARGINS:
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {PRESET_MARGINS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`btn btn-sm ${marginPercent === p ? "btn-primary" : "btn-secondary"}`}
                                            onClick={() => handlePreset(p)}
                                            style={{ padding: "4px 9px", fontSize: 12 }}
                                        >
                                            +{p}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Gross Discount on Bill Amount */}
                        <div className="form-group" style={{ background: "var(--bg-base)", padding: "10px 12px", borderRadius: 8, border: "1px dashed var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: 12.5, color: "var(--text-primary)" }}>
                                        Gross Discount on Bill (₹)
                                    </label>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        Reduce cost base before applying profit margin
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={rawCost || undefined}
                                    className="form-input"
                                    style={{ width: 110, padding: "5px 8px", fontSize: 13, textAlign: "right", fontWeight: 700, color: "var(--danger)" }}
                                    value={grossDiscount}
                                    onChange={(e) => setGrossDiscount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Slider / Numeric Input */}
                        {marginMode === "percent" ? (
                            <div className="form-group">
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600 }}>Adjust Margin Percentage:</span>
                                    <span style={{ fontWeight: 800, color: "var(--accent)" }}>{marginPercent}%</span>
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={marginPercent}
                                        onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: 80, padding: "4px 8px", fontSize: 13, textAlign: "right" }}
                                        value={marginPercent}
                                        onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Fixed Profit Amount (₹)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={marginFixed}
                                    onChange={(e) => setMarginFixed(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter profit amount"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Profit Analytics Cards */}
                <div className="stats-grid" style={{ marginBottom: 14 }}>
                    <div className="stat-card">
                        <div className="stat-label">Base Cost / Bill Price</div>
                        <div className="stat-value">₹{toMoney(baseCost)}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Original bill cost</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
                        <div className="stat-label">Profit Added (+Margin)</div>
                        <div className="stat-value" style={{ color: "var(--success)" }}>+₹{toMoney(marginAmount)}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Total profit earned</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid var(--accent)", background: "var(--accent-muted)" }}>
                        <div className="stat-label" style={{ color: "var(--accent)" }}>Final Marked-Up Price</div>
                        <div className="stat-value" style={{ color: "var(--accent)" }}>₹{toMoney(finalSellingPrice)}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Customer quote / selling price</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid #8b5cf6" }}>
                        <div className="stat-label">Gross Margin %</div>
                        <div className="stat-value" style={{ color: "#7c3aed" }}>{grossMarginPercent.toFixed(1)}%</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Profit &divide; Selling Price</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid #0284c7" }}>
                        <div className="stat-label">Markup %</div>
                        <div className="stat-value" style={{ color: "#0284c7" }}>{markupPercent.toFixed(1)}%</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Profit &divide; Cost Price</div>
                    </div>
                </div>

                {/* Item-Wise Breakdown Table */}
                {itemBreakdown.length > 0 && (
                    <div className="card responsive-card">
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Itemized Markup Breakdown &amp; Inventory Sync</span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{itemBreakdown.length} items calculated with +{marginPercent}% margin</span>
                        </div>

                        <div className="table-wrap">
                            <table className="custom-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th style={{ textAlign: "right" }}>Qty</th>
                                        <th style={{ textAlign: "right" }}>Cost Price</th>
                                        <th style={{ textAlign: "right" }}>Margin (+₹)</th>
                                        <th style={{ textAlign: "right" }}>Marked-Up Selling Price</th>
                                        <th style={{ textAlign: "right" }}>Total Selling (₹)</th>
                                        <th style={{ textAlign: "center" }}>Inventory Sync</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemBreakdown.map((it, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 600 }}>{it.description}</td>
                                            <td style={{ textAlign: "right" }}>{it.quantity} {it.unit}</td>
                                            <td style={{ textAlign: "right", color: "var(--text-muted)" }}>₹{toMoney(it.costRate)}</td>
                                            <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>+₹{toMoney(it.marginPerUnit)}</td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>₹{toMoney(it.sellingRate)}</td>
                                            <td style={{ textAlign: "right", fontWeight: 800 }}>₹{toMoney(it.lineSelling)}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ fontSize: 11, padding: "3px 8px" }}
                                                    onClick={() => handleUpdateItemInventory(it.description, it.sellingRate)}
                                                    title="Set this marked-up selling price in your inventory"
                                                >
                                                    <PackageCheck size={13} /> Update in Stock
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 1-Click Convert to Quotation Action Card (Vyapar style) */}
                <div className="card" style={{ padding: 18, background: "var(--bg-base)", border: "1px solid var(--accent-border)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent-muted)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <FileCheck size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Create Client Quotation with this Markup</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                Instantly convert these calculated prices into an official estimate ready to email, WhatsApp, or print.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "flex-end" }}>
                        <div className="form-group">
                            <label className="form-label">Client / Customer Name *</label>
                            <input
                                className="form-input"
                                value={quotationCustomer}
                                onChange={(e) => setQuotationCustomer(e.target.value)}
                                placeholder="e.g. Acme Enterprises"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Client Mobile (Optional)</label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                pattern="[0-9]{10}"
                                className="form-input"
                                value={quotationPhone}
                                onChange={(e) => setQuotationPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile number"
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreateQuotation}
                            disabled={isConverting || !quotationCustomer.trim()}
                            style={{ height: 38 }}
                        >
                            <FileCheck size={16} /> {isConverting ? "Creating Quotation..." : `Create Quotation (₹${toMoney(finalSellingPrice)})`}
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
