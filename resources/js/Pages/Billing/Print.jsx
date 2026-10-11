import { useState, useRef } from "react";
import { Link } from "@inertiajs/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Print({ order: initialOrder, ledger: initialLedger }) {
    const [showLedger, setShowLedger] = useState(false);
    const [isHindi, setIsHindi] = useState(false);
    const [order, setOrder] = useState(initialOrder);
    const [ledger, setLedger] = useState(initialLedger);
    const [loadingTranslations, setLoadingTranslations] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showRemarks, setShowRemarks] = useState(false);
    const [remarks, setRemarks] = useState("");
    const printRef = useRef(null);

    function handlePrint() {
        window.print();
    }

    async function handleSharePDF() {
        if (!printRef.current) return;
        setIsSharing(true);
        try {
            // Capture the full content (including what is off-screen)
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                // Capture the full scrollable height, not just the viewport
                windowWidth: printRef.current.scrollWidth,
                windowHeight: printRef.current.scrollHeight,
            });

            const pdf = new jsPDF("p", "pt", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfPageHeight = pdf.internal.pageSize.getHeight();

            // Reserve a fixed bottom margin (24pt) so content never touches the page edge
            const bottomMargin = 24;
            const contentHeight = pdfPageHeight - bottomMargin;

            // How many canvas pixels correspond to one usable page content area
            const canvasPageHeight = (contentHeight * canvas.width) / pdfWidth;
            const totalPages = Math.ceil(canvas.height / canvasPageHeight);

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                if (pageIndex > 0) pdf.addPage();

                // Create a temporary canvas for this page's slice
                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                // Last page might be shorter
                const sliceHeight = Math.min(
                    canvasPageHeight,
                    canvas.height - pageIndex * canvasPageHeight,
                );
                sliceCanvas.height = sliceHeight;

                const ctx = sliceCanvas.getContext("2d");
                // Fill white so the bottom margin area stays clean
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                ctx.drawImage(
                    canvas,
                    0,
                    pageIndex * canvasPageHeight, // source y offset
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    canvas.width,
                    sliceHeight,
                );

                const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
                const slicePdfHeight = (sliceHeight * pdfWidth) / canvas.width;
                // Place image at top; white bottom margin fills the remaining space
                pdf.addImage(sliceData, "JPEG", 0, 0, pdfWidth, slicePdfHeight);
            }

            // Format Filename
            const fileName = `Invoice_#${order.id}.pdf`;

            // Try using the Native Web Share API first
            const blob = pdf.output("blob");
            const file = new File([blob], fileName, {
                type: "application/pdf",
            });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Invoice #${order.id}`,
                    text: "Here is your invoice copy.",
                });
            } else {
                // Fallback to auto-downloading if unsupported
                pdf.save(fileName);
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to share PDF.");
        } finally {
            setIsSharing(false);
        }
    }

    const divisor = parseInt(order.discount_divisor) || 1;
    const hasDivisor = divisor > 1;
    const hasItemDiscounts = order.items?.some(
        (i) => (parseFloat(i.discount_percent) || 0) > 0
    );

    const subtotalMRP =
        order.items?.reduce(
            (s, i) =>
                s +
                (parseFloat(i.selling_price) || 0) *
                    (parseFloat(i.quantity) || 0),
            0
        ) ?? 0;

    const dividedSubtotal =
        order.items?.reduce((s, i) => {
            const sp = parseFloat(i.selling_price) || 0;
            const dsp = hasDivisor ? sp / divisor : sp;
            return s + dsp * (parseFloat(i.quantity) || 0);
        }, 0) ?? 0;

    const formulaDiscount = hasDivisor ? subtotalMRP - dividedSubtotal : 0;

    const netSubtotal =
        order.items?.reduce((s, i) => {
            const sp = parseFloat(i.selling_price) || 0;
            const dsp = hasDivisor ? sp / divisor : sp;
            const disc = parseFloat(i.discount_percent) || 0;
            const netPrice = disc > 0 ? dsp * (1 - disc / 100) : dsp;
            return s + netPrice * (parseFloat(i.quantity) || 0);
        }, 0) ?? 0;

    const itemDiscountTotal =
        (hasDivisor ? dividedSubtotal : subtotalMRP) - netSubtotal;
    const total = parseFloat(order.total_price) || netSubtotal;
    const totalQty =
        order.items?.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0) ?? 0;
    const discount = subtotalMRP - total;

    const numExtraCols =
        (hasDivisor ? 1 : 0) + (hasDivisor || hasItemDiscounts ? 2 : 0);

    const t = {
        INVOICE: isHindi ? "चालान" : "INVOICE",
        "Bill No": isHindi ? "बिल नं." : "Bill #",
        "GST No": isHindi ? "जीएसटी क्र." : "GST No",
        "Billed To": isHindi ? "बिल प्राप्तकर्ता" : "Billed To",
        "Invoice Status": isHindi ? "चालान की स्थिति" : "Invoice Status",
        "Add Status": isHindi ? "स्थिति जोड़ें" : "Add Status",
        Item: isHindi ? "आइटम" : "Item",
        Qty: isHindi ? "मात्रा" : "Qty",
        Price: isHindi ? "मुल्य" : "Price",
        "Price ÷ 2": isHindi ? "मुल्य ÷ 2" : "Price ÷ 2",
        "Price ÷ 3": isHindi ? "मुल्य ÷ 3" : "Price ÷ 3",
        "Disc %": isHindi ? "छूट %" : "Disc %",
        "Net Price": isHindi ? "शुद्ध मुल्य" : "Net Price",
        Total: isHindi ? "कुल" : "Total",
        Subtotal: isHindi ? "उप-योग" : "Subtotal",
        "Total Discount": isHindi ? "कुल छूट" : "Total Discount",
        "Total Bill Amount": isHindi ? "कुल बिल राशि" : "Total Bill Amount",
        "Customer Ledger —": isHindi ? "बहीखाता —" : "Customer Ledger —",
        "All bills as of": isHindi ? "के अनुसार सभी बिल" : "All bills as of",
        Date: isHindi ? "दिनांक" : "Date",
        "Bill Amount": isHindi ? "बिल राशि" : "Bill Amount",
        Received: isHindi ? "प्राप्त" : "Received",
        "Balance Due": isHindi ? "बकाया राशि" : "Balance Due",
        current: isHindi ? "वर्तमान" : "current",
        "Previous Balance": isHindi ? "पिछला बकाया" : "Previous Balance",
        "This Bill (": isHindi ? "यह बिल (" : "This Bill (",
        "Total Outstanding": isHindi ? "कुल बकाया" : "Total Outstanding",
        "Thank you for your business!": isHindi
            ? "आपके व्यापार के लिए धन्यवाद!"
            : "Thank you for your business!",
        "Print Invoice": isHindi ? "चालान प्रिंट करें" : "🖨️ Print Invoice",
        "Include Customer Ledger": isHindi
            ? "ग्राहक बहीखाता शामिल करें"
            : "Include Customer Ledger",
        "S.No": isHindi ? "क्र.सं." : "S.No",
        "Total Qty": isHindi ? "कुल मात्रा" : "Total Qty",
    };

    // Ledger: previous bills (not current) + current bill balance
    const prevBills = ledger?.filter((r) => !r.is_current) ?? [];
    const currentRow = ledger?.find((r) => r.is_current);
    const prevBalance = prevBills.reduce(
        (s, r) => s + parseFloat(r.bill_balance),
        0
    );
    const thisBill = parseFloat(currentRow?.bill_balance ?? total);
    const totalOutstanding = prevBalance + thisBill;

    function fmt(n) {
        return "₹" + parseFloat(n ?? 0).toFixed(2);
    }
    function fmtDate(d) {
        return new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" });
    }

    let totalDiscountLabel = t["Total Discount"];
    if (hasDivisor && formulaDiscount > 0.005 && itemDiscountTotal > 0.005) {
        totalDiscountLabel = isHindi
            ? `कुल छूट (मुल्य ÷ ${divisor}: -${fmt(formulaDiscount)} + आइटम छूट: -${fmt(itemDiscountTotal)})`
            : `Total Discount (Price ÷ ${divisor}: -${fmt(formulaDiscount)} + Item Disc: -${fmt(itemDiscountTotal)})`;
    } else if (hasDivisor && formulaDiscount > 0.005) {
        totalDiscountLabel = isHindi
            ? `कुल छूट (मुल्य ÷ ${divisor}: -${fmt(formulaDiscount)})`
            : `Total Discount (Price ÷ ${divisor}: -${fmt(formulaDiscount)})`;
    } else if (itemDiscountTotal > 0.005) {
        totalDiscountLabel = isHindi
            ? `कुल छूट (आइटम छूट: -${fmt(itemDiscountTotal)})`
            : `Total Discount (Item Disc: -${fmt(itemDiscountTotal)})`;
    }

    const TH = ({ children, right }) => (
        <th
            style={{
                padding: "9px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: ".04em",
                textAlign: right ? "right" : "left",
                borderBottom: "2px solid #e5e7eb",
                background: "#f9fafb",
            }}
        >
            {children}
        </th>
    );

    async function translateText(text) {
        if (!text || !text.trim()) return text;
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const json = await res.json();
            return json[0].map((item) => item[0]).join("");
        } catch (error) {
            console.error("Translation error:", error);
            return text;
        }
    }

    async function handleLanguageToggle() {
        if (isHindi) {
            // Revert to English (original data)
            setIsHindi(false);
            setOrder(initialOrder);
            setLedger(initialLedger);
            return;
        }

        // Switch to Hindi and translate dynamically
        setLoadingTranslations(true);
        setIsHindi(true);
        try {
            // Deep copy objects
            let newOrder = JSON.parse(JSON.stringify(initialOrder));
            let newLedger = JSON.parse(JSON.stringify(initialLedger));

            // Translate Customer Name
            newOrder.customer = await translateText(initialOrder.customer);

            // Translate Ledger Customers
            for (let i = 0; i < newLedger.length; i++) {
                if (newLedger[i].customer) {
                    newLedger[i].customer = await translateText(
                        initialLedger[i].customer,
                    );
                }
            }

            // Translate Items
            if (newOrder.items) {
                for (let i = 0; i < newOrder.items.length; i++) {
                    const itemName =
                        initialOrder.items[i].item_name ||
                        initialOrder.items[i].code;
                    newOrder.items[i].item_name = await translateText(itemName);
                }
            }

            setOrder(newOrder);
            setLedger(newLedger);
        } catch (error) {
            console.error("Translation failed:", error);
        } finally {
            setLoadingTranslations(false);
        }
    }

    return (
        <>
            {/* ── Screen-only action bar ── */}
            <div
                className="no-print print-toolbar"
                style={{
                    padding: "10px 24px",
                    background: "var(--bg-surface)",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
            >
                {/* Left: Back button */}
                <Link
                    href="/billing"
                    className="print-toolbar-back"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-secondary)",
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: "none",
                    }}
                >
                    ← Back
                </Link>

                {/* Right: Action buttons */}
                <div
                    className="print-toolbar-actions"
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                    {/* Ledger toggle switch */}
                    <div
                        onClick={() => setShowLedger(!showLedger)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            color: showLedger
                                ? "#0ea5e9"
                                : "var(--text-secondary)",
                            userSelect: "none",
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: `1px solid ${showLedger ? "#bae6fd" : "var(--border)"}`,
                            background: showLedger
                                ? "#e0f2fe"
                                : "var(--bg-card)",
                            transition: "all 0.2s",
                            fontWeight: 500,
                        }}
                    >
                        <span
                            style={{
                                display: "inline-flex",
                                width: 32,
                                height: 16,
                                borderRadius: 8,
                                background: showLedger ? "#0ea5e9" : "#d1d5db",
                                position: "relative",
                                transition: "background 0.2s",
                                flexShrink: 0,
                            }}
                        >
                            <span
                                style={{
                                    position: "absolute",
                                    top: 2,
                                    left: showLedger ? 16 : 2,
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left 0.2s",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                                }}
                            />
                        </span>
                        📋 Ledger
                    </div>

                    {/* Divider */}
                    <div
                        style={{
                            width: 1,
                            height: 26,
                            background: "var(--border)",
                        }}
                    />

                    {/* Language button */}
                    <button
                        onClick={handleLanguageToggle}
                        disabled={loadingTranslations || isSharing}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 14px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: isHindi ? "#fef9c3" : "var(--bg-card)",
                            color: "var(--text-primary)",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: loadingTranslations
                                ? "not-allowed"
                                : "pointer",
                            opacity: loadingTranslations ? 0.65 : 1,
                        }}
                    >
                        {loadingTranslations
                            ? "⏳ Translating..."
                            : isHindi
                              ? "🔤 English"
                              : "🇮🇳 हिंदी"}
                    </button>

                    {/* Share PDF button - icon only with tooltip */}
                    <div
                        style={{ position: "relative", display: "inline-flex" }}
                        onMouseEnter={(e) => {
                            const tip =
                                e.currentTarget.querySelector(".share-tooltip");
                            if (tip) tip.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                            const tip =
                                e.currentTarget.querySelector(".share-tooltip");
                            if (tip) tip.style.opacity = "0";
                        }}
                    >
                        <button
                            onClick={handleSharePDF}
                            disabled={loadingTranslations || isSharing}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                border: "none",
                                background: isSharing ? "#7dd3fc" : "#38bdf8",
                                color: "#fff",
                                fontSize: 16,
                                cursor: isSharing ? "not-allowed" : "pointer",
                                boxShadow: "0 1px 4px rgba(56,189,248,0.35)",
                            }}
                        >
                            {isSharing ? "⏳" : "📤"}
                        </button>
                        {/* Tooltip */}
                        <span
                            className="share-tooltip"
                            style={{
                                position: "absolute",
                                bottom: "calc(100% + 6px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "#1f2937",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 500,
                                padding: "3px 8px",
                                borderRadius: 5,
                                whiteSpace: "nowrap",
                                opacity: 0,
                                transition: "opacity 0.15s",
                                pointerEvents: "none",
                                zIndex: 10,
                            }}
                        >
                            {isSharing ? "Generating..." : "Share PDF"}
                        </span>
                    </div>

                    {/* Print button */}
                    <button
                        onClick={handlePrint}
                        disabled={loadingTranslations || isSharing}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: "#0ea5e9",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 1px 4px rgba(14,165,233,0.4)",
                        }}
                    >
                        🖨️ Print
                    </button>
                </div>
            </div>

            {/* ── Invoice ── */}
            <div
                ref={printRef}
                className={`print-page${order.mode === "barcode" ? " barcode-print" : ""}`}
                style={{
                    padding: "16px 20px",
                    maxWidth: 780,
                    margin: "0 auto",
                    background: "#fff",
                    fontFamily: "Inter, system-ui, sans-serif",
                    color: "#111827",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                }}
            >
                {/* Header */}
                <div
                    className="invoice-header-3col"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: "2px solid #e5e7eb",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            textAlign: "left",
                            fontSize: 13,
                            color: "#374151",
                        }}
                    >
                        {t["Bill No"]} {order.id}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#0ea5e9",
                        }}
                    >
                        {t["INVOICE"]}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            textAlign: "right",
                            fontSize: 13,
                            color: "#374151",
                        }}
                    >
                        {fmtDate(order.created_at)}
                    </div>
                </div>
                {/* Billed To */}
                <div className="invoice-customer-details" style={{ marginBottom: 16 }}>
                    <div
                        style={{
                            fontSize: 10,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: ".08em",
                            marginBottom: 4,
                        }}
                    >
                        {t["Billed To"]}
                    </div>
                    <div
                        className="invoice-customer-name"
                        style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}
                    >
                        {order.customer}
                    </div>
                </div>

                {/* Items Table */}
                <div className="invoice-table-wrap">
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            marginBottom: 16,
                            border: "1px solid #e5e7eb",
                            borderRadius: 6,
                            overflow: "hidden",
                        }}
                    >
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                <TH>{t["S.No"]}</TH>
                                <TH>{t["Item"]}</TH>
                                <TH right>{t["Qty"]}</TH>
                                <TH right>{t["Price"]}</TH>
                                {hasDivisor && (
                                    <TH right>
                                        <span style={{ color: "#0284c7" }}>
                                            {divisor === 2
                                                ? t["Price ÷ 2"] || "Price ÷ 2"
                                                : divisor === 3
                                                  ? t["Price ÷ 3"] || "Price ÷ 3"
                                                  : `Price ÷ ${divisor}`}
                                        </span>
                                    </TH>
                                )}
                                {(hasDivisor || hasItemDiscounts) && (
                                    <TH right>{t["Disc %"]}</TH>
                                )}
                                {(hasDivisor || hasItemDiscounts) && (
                                    <TH right>{t["Net Price"]}</TH>
                                )}
                                <TH right>{t["Total"]}</TH>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item, index) => {
                                const origPrice =
                                    parseFloat(item.selling_price) || 0;
                                const dividedPrice = hasDivisor
                                    ? origPrice / divisor
                                    : origPrice;
                                const discPercent =
                                    parseFloat(item.discount_percent) || 0;
                                const netPrice =
                                    discPercent > 0
                                        ? dividedPrice * (1 - discPercent / 100)
                                        : dividedPrice;
                                const lineTotal =
                                    (parseFloat(item.quantity) || 0) * netPrice;

                                return (
                                    <tr
                                        key={item.id ?? item.code ?? index}
                                        style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            background: index % 2 === 1 ? "#fafafa" : "#ffffff",
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "9px 10px",
                                                fontSize: 12.5,
                                                color: "#64748b",
                                                textAlign: "center",
                                                width: 40,
                                            }}
                                        >
                                            {index + 1}
                                        </td>
                                        <td style={{ padding: "9px 10px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                }}
                                            >
                                                {item.image_url && (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.item_name}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 6,
                                                            objectFit: "cover",
                                                            border: "1px solid #e2e8f0",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            fontSize: 13,
                                                            color: "#0f172a",
                                                        }}
                                                    >
                                                        {item.item_name ||
                                                            item.code}
                                                    </div>
                                                    {item.code && (
                                                        <div
                                                            style={{
                                                                fontSize: 10.5,
                                                                color: "#94a3b8",
                                                                marginTop: 1,
                                                            }}
                                                        >
                                                            #{item.code}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: "9px 10px",
                                                textAlign: "right",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: "#1e293b",
                                            }}
                                        >
                                            {parseFloat(item.quantity || 0) % 1 === 0 ? parseInt(item.quantity) : parseFloat(item.quantity)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "9px 10px",
                                                textAlign: "right",
                                                fontSize: 12.5,
                                                color: hasDivisor
                                                    ? "#94a3b8"
                                                    : "#1e293b",
                                                textDecoration: hasDivisor
                                                    ? "line-through"
                                                    : "none",
                                            }}
                                        >
                                            {fmt(origPrice)}
                                        </td>
                                        {hasDivisor && (
                                            <td
                                                style={{
                                                    padding: "9px 10px",
                                                    textAlign: "right",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#0284c7",
                                                }}
                                            >
                                                {fmt(dividedPrice)}
                                            </td>
                                        )}
                                        {(hasDivisor || hasItemDiscounts) && (
                                            <td
                                                style={{
                                                    padding: "9px 10px",
                                                    textAlign: "right",
                                                    fontSize: 12.5,
                                                }}
                                            >
                                                {discPercent > 0 ? (
                                                    <span
                                                        style={{
                                                            background: "#fef2f2",
                                                            color: "#dc2626",
                                                            fontWeight: 700,
                                                            padding: "2px 6px",
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            border: "1px solid #fecaca",
                                                        }}
                                                    >
                                                        {discPercent}%
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#cbd5e1" }}>—</span>
                                                )}
                                            </td>
                                        )}
                                        {(hasDivisor || hasItemDiscounts) && (
                                            <td
                                                style={{
                                                    padding: "9px 10px",
                                                    textAlign: "right",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                {fmt(netPrice)}
                                            </td>
                                        )}
                                        <td
                                            style={{
                                                padding: "9px 10px",
                                                textAlign: "right",
                                                fontWeight: 800,
                                                fontSize: 13.5,
                                                color: "#0f172a",
                                            }}
                                        >
                                            {fmt(lineTotal)}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Summary Rows inside Table */}
                            <tr
                                style={{
                                    borderTop: "2px solid #cbd5e1",
                                    background: "#f8fafc",
                                }}
                            >
                                <td
                                    colSpan={2}
                                    style={{
                                        padding: "10px 12px",
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: "#475569",
                                        textAlign: "right",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {t["Total Qty"]}:
                                </td>
                                <td
                                    style={{
                                        padding: "10px 12px",
                                        textAlign: "right",
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: "#0f172a",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {totalQty % 1 === 0 ? totalQty : parseFloat(totalQty.toFixed(2))}
                                </td>
                                {numExtraCols > 0 && (
                                    <td colSpan={numExtraCols}></td>
                                )}
                                <td
                                    style={{
                                        padding: "10px 12px",
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: "#475569",
                                        textAlign: "right",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {t["Subtotal"]}:
                                </td>
                                <td
                                    style={{
                                        padding: "10px 12px",
                                        textAlign: "right",
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: "#0f172a",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {fmt(subtotalMRP)}
                                </td>
                            </tr>

                            {/* Breakdown: Formula Discount (when both formula and item discounts exist) */}
                            {hasDivisor && formulaDiscount > 0.005 && itemDiscountTotal > 0.005 && (
                                <tr
                                    style={{
                                        borderTop: "1px solid #f1f5f9",
                                        background: "#ffffff",
                                    }}
                                >
                                    <td colSpan={2 + numExtraCols}></td>
                                    <td
                                        colSpan={2}
                                        style={{
                                            padding: "7px 12px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#dc2626",
                                            textAlign: "right",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {divisor === 2
                                            ? isHindi ? "मुल्य ÷ 2 छूट:" : "Price ÷ 2 Discount:"
                                            : divisor === 3
                                              ? isHindi ? "मुल्य ÷ 3 छूट:" : "Price ÷ 3 Discount:"
                                              : `Price ÷ ${divisor} Discount:`}
                                    </td>
                                    <td
                                        style={{
                                            padding: "7px 12px",
                                            textAlign: "right",
                                            fontSize: 12.5,
                                            fontWeight: 700,
                                            color: "#dc2626",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        -{fmt(formulaDiscount)}
                                    </td>
                                </tr>
                            )}

                            {/* Breakdown: Item Discount (when both formula and item discounts exist) */}
                            {hasDivisor && formulaDiscount > 0.005 && itemDiscountTotal > 0.005 && (
                                <tr
                                    style={{
                                        borderTop: "1px solid #f1f5f9",
                                        background: "#ffffff",
                                    }}
                                >
                                    <td colSpan={2 + numExtraCols}></td>
                                    <td
                                        colSpan={2}
                                        style={{
                                            padding: "7px 12px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#dc2626",
                                            textAlign: "right",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {isHindi ? "आइटम छूट:" : "Item Discount:"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "7px 12px",
                                            textAlign: "right",
                                            fontSize: 12.5,
                                            fontWeight: 700,
                                            color: "#dc2626",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        -{fmt(itemDiscountTotal)}
                                    </td>
                                </tr>
                            )}

                            {/* Total Discount Row */}
                            {discount > 0.005 && (
                                <tr
                                    style={{
                                        borderTop: "1px solid #fecaca",
                                        background: "#fef2f2",
                                    }}
                                >
                                    <td colSpan={2 + numExtraCols}></td>
                                    <td
                                        colSpan={2}
                                        style={{
                                            padding: "9px 12px",
                                            fontSize: 12.5,
                                            fontWeight: 700,
                                            color: "#dc2626",
                                            textAlign: "right",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {hasDivisor && !itemDiscountTotal
                                            ? divisor === 2
                                                ? isHindi ? "कुल छूट (मुल्य ÷ 2):" : "Total Discount (Price ÷ 2):"
                                                : divisor === 3
                                                  ? isHindi ? "कुल छूट (मुल्य ÷ 3):" : "Total Discount (Price ÷ 3):"
                                                  : `Total Discount (Price ÷ ${divisor}):`
                                            : `${t["Total Discount"]}:`}
                                    </td>
                                    <td
                                        style={{
                                            padding: "9px 12px",
                                            textAlign: "right",
                                            fontSize: 13,
                                            fontWeight: 800,
                                            color: "#dc2626",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        -{fmt(discount)}
                                    </td>
                                </tr>
                            )}

                            {/* Total Bill Amount */}
                            <tr
                                style={{
                                    borderTop: "2px solid #bae6fd",
                                    background: "#f0f9ff",
                                }}
                            >
                                <td colSpan={2 + numExtraCols}></td>
                                <td
                                    colSpan={2}
                                    style={{
                                        padding: "11px 12px",
                                        fontSize: 13.5,
                                        fontWeight: 800,
                                        color: "#0369a1",
                                        textAlign: "right",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {t["Total Bill Amount"]}:
                                </td>
                                <td
                                    style={{
                                        padding: "11px 12px",
                                        textAlign: "right",
                                        fontSize: 15,
                                        fontWeight: 900,
                                        color: "#0284c7",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {fmt(total)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {/* ── Remark Feature (Screen Only) ── */}
                <div
                    className="no-print"
                    style={{
                        marginTop: 16,
                        padding: 12,
                        background: "#f9fafb",
                        borderRadius: 8,
                        border: "1px dashed #d1d5db",
                    }}
                >
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#374151",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={showRemarks}
                            onChange={(e) => setShowRemarks(e.target.checked)}
                            style={{
                                width: 18,
                                height: 18,
                                cursor: "pointer",
                                accentColor: "#0ea5e9",
                            }}
                        />
                        {t["Invoice Status"]}
                    </label>
                    {showRemarks && (
                        <div style={{ marginTop: 10 }}>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder={t["Add Status"] + "..."}
                                style={{
                                    width: "100%",
                                    minHeight: 60,
                                    padding: 10,
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    fontSize: 13,
                                    color: "#374151",
                                    outline: "none",
                                    resize: "vertical",
                                    background: "white",
                                }}
                            />
                        </div>
                    )}
                </div>
                {/* ── Invoice Status Display (Printable) ── */}
                {showRemarks && (remarks || "").trim().length > 0 && (
                    <div
                        style={{
                            marginTop: 16,
                            padding: "8px 0",
                            borderTop: "1px solid #f3f4f6",
                            display: "flex",
                            alignItems: "baseline",
                            gap: 10,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                flexShrink: 0,
                            }}
                        >
                            {t["Invoice Status"]}:
                        </span>
                        <span
                            style={{
                                fontSize: 13,
                                color: "#111827",
                                whiteSpace: "pre-wrap",
                                fontStyle: "italic",
                                lineBreak: "anywhere",
                            }}
                        >
                            {remarks}
                        </span>
                    </div>
                )}
                {/* ── Ledger Section ── */}
                {showLedger && ledger && ledger.length > 0 && (
                    <div style={{ marginTop: 40 }}>
                        <div
                            style={{
                                borderTop: "2px solid #e5e7eb",
                                paddingTop: 24,
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    marginBottom: 2,
                                }}
                            >
                                {t["Customer Ledger —"]} {order.customer}
                            </div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                {t["All bills as of"]} {fmtDate(new Date())}
                            </div>
                        </div>

                        {/* Bills table */}
                        <div className="invoice-table-wrap">
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 13,
                                    marginBottom: 16,
                                }}
                            >
                                <thead>
                                    <tr>
                                        <TH>{t["Date"]}</TH>
                                        <TH>{t["Bill No"]}</TH>
                                        <TH right>{t["Bill Amount"]}</TH>
                                        <TH right>{t["Received"]}</TH>
                                        <TH right>{t["Balance Due"]}</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger.map((row) => (
                                        <tr
                                            key={row.id}
                                            style={{
                                                borderBottom: "1px solid #f3f4f6",
                                                background: row.is_current
                                                    ? "#eff6ff"
                                                    : undefined,
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: "9px 12px",
                                                    color: "#374151",
                                                }}
                                            >
                                                {fmtDate(row.created_at)}
                                            </td>
                                            <td style={{ padding: "9px 12px" }}>
                                                <span
                                                    style={{
                                                        fontWeight: row.is_current
                                                            ? 700
                                                            : 400,
                                                    }}
                                                >
                                                    #{row.id}
                                                </span>
                                                {row.is_current && (
                                                    <span
                                                        style={{
                                                            marginLeft: 6,
                                                            fontSize: 10,
                                                            color: "#0ea5e9",
                                                            fontWeight: 600,
                                                            background: "#e0f2fe",
                                                            padding: "1px 5px",
                                                            borderRadius: 3,
                                                        }}
                                                    >
                                                        {t["current"]}
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "9px 12px",
                                                    textAlign: "right",
                                                }}
                                            >
                                                {fmt(row.total_price)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "9px 12px",
                                                    textAlign: "right",
                                                    color:
                                                        parseFloat(row.received) < 0
                                                            ? "#dc2626"
                                                            : "#16a34a",
                                                }}
                                            >
                                                {parseFloat(row.received) !== 0
                                                    ? fmt(row.received)
                                                    : "—"}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "9px 12px",
                                                    textAlign: "right",
                                                    fontWeight: 600,
                                                    color:
                                                        parseFloat(
                                                            row.bill_balance,
                                                        ) > 0
                                                            ? "#dc2626"
                                                            : "#16a34a",
                                                }}
                                            >
                                                {fmt(row.bill_balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary box: Prev Balance + This Bill = Total Outstanding */}
                        <div
                            className="ledger-summary-box"
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 320,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 6,
                                    overflow: "hidden",
                                }}
                            >
                                {prevBalance > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            padding: "9px 14px",
                                            fontSize: 13,
                                            color: "#374151",
                                            borderBottom: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <span>{t["Previous Balance"]}</span>
                                        <span
                                            style={{
                                                color: "#dc2626",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {fmt(prevBalance)}
                                        </span>
                                    </div>
                                )}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "9px 14px",
                                        fontSize: 13,
                                        color: "#374151",
                                        borderBottom: "1px solid #e5e7eb",
                                        background: "#eff6ff",
                                    }}
                                >
                                    <span>
                                        {t["This Bill ("]}#{order.id})
                                    </span>
                                    <span style={{ fontWeight: 500 }}>
                                        {fmt(thisBill)}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "8px 14px",
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color:
                                            totalOutstanding > 0
                                                ? "#dc2626"
                                                : "#16a34a",
                                        background: "#f9fafb",
                                    }}
                                >
                                    <span>{t["Total Outstanding"]}</span>
                                    <span>{fmt(totalOutstanding)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Responsive + Print styles */}
            <style>{`
                .barcode-print,
                .barcode-print * {
                    font-size: 8px !important;
                }
                .barcode-print .invoice-table-wrap table th,
                .barcode-print .invoice-table-wrap table tr,
                .barcode-print .invoice-table-wrap table td,
                .barcode-print .invoice-table-wrap table th *,
                .barcode-print .invoice-table-wrap table tr *,
                .barcode-print .invoice-table-wrap table td * {
                    font-size: 8px !important;
                    line-height: 1.1 !important;
                }
                .barcode-print .invoice-table-wrap table th,
                .barcode-print .invoice-table-wrap table td {
                    padding: 3px 4px !important;
                }
                .barcode-print .invoice-customer-details,
                .barcode-print .invoice-customer-details * {
                    font-size: 8px !important;
                    line-height: 1.1 !important;
                }

                /* ── Responsive: Tablet (≤768px) ── */
                @media (max-width: 768px) {
                    .print-toolbar {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 10px !important;
                        padding: 10px 14px !important;
                    }
                    .print-toolbar-actions {
                        flex-wrap: wrap !important;
                        justify-content: flex-end !important;
                        gap: 8px !important;
                    }
                    .print-page {
                        margin: 8px !important;
                        padding: 14px 12px !important;
                        border-radius: 6px !important;
                        font-size: 12px !important;
                    }
                    .invoice-table-wrap {
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
                    .invoice-table-wrap table td,
                    .invoice-table-wrap table th {
                        font-size: 11px !important;
                        padding: 6px 7px !important;
                    }
                    .invoice-totals {
                        width: 100% !important;
                    }
                    .invoice-totals > div {
                        font-size: 11px !important;
                        max-width: 100% !important;
                    }
                    .ledger-summary-box {
                        width: 100% !important;
                    }
                    .ledger-summary-box div {
                        font-size: 11px !important;
                    }
                }

                /* ── Responsive: Mobile (≤480px) ── */
                @media (max-width: 480px) {
                    .print-toolbar {
                        padding: 6px 8px !important;
                        gap: 6px !important;
                    }
                    .print-toolbar button,
                    .print-toolbar a {
                        font-size: 11px !important;
                        padding: 5px 10px !important;
                    }
                    .print-toolbar-back {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    .print-toolbar-actions {
                        width: 100% !important;
                        justify-content: space-between !important;
                    }
                    .print-page {
                        margin: 2px !important;
                        padding: 8px 6px !important;
                        font-size: 10px !important;
                    }
                    /* Invoice header: Bill # | INVOICE | Date */
                    .invoice-header-3col > div {
                        font-size: 10px !important;
                    }
                    /* Customer name */
                    .invoice-customer-name {
                        font-size: 10px !important;
                    }
                    /* Table header & cells */
                    .invoice-table-wrap table td,
                    .invoice-table-wrap table th {
                        font-size: 9px !important;
                        padding: 4px 5px !important;
                    }
                    /* Totals block */
                    .invoice-totals {
                        width: 100% !important;
                    }
                    .invoice-totals > div,
                    .invoice-totals span {
                        font-size: 10px !important;
                        max-width: 100% !important;
                        padding: 4px 6px !important;
                    }
                    /* Ledger table */
                    .ledger-summary-box,
                    .ledger-summary-box div,
                    .ledger-summary-box span {
                        font-size: 10px !important;
                        max-width: 100% !important;
                    }
                    /* Generic invoice text */
                    .print-page div,
                    .print-page span,
                    .print-page td,
                    .print-page th {
                        font-size: 10px !important;
                    }
                }

                /* ── Print Media ── */
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-page {
                        margin: 0 !important;
                        border: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                        padding: 16px 20px !important;
                    }
                    .invoice-table-wrap {
                        overflow: visible !important;
                    }
                }
            `}</style>
        </>
    );
}
