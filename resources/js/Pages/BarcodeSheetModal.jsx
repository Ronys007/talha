import { useState, useEffect } from "react";
import {
    X,
    Printer,
    Download,
    Search,
    Plus,
    Minus,
    Check,
    Menu,
    Tag,
    ShieldCheck,
    AlertCircle,
} from "lucide-react";
import axios from "axios";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";

// Exact Physical Thermal Sticker Dimensions: 2" × 1" (50.8mm × 25.4mm)
const LABEL_WIDTH_MM = 50.8;
const LABEL_HEIGHT_MM = 25.4;
const MAX_BARCODES_LIMIT = 400; // Capped at maximum 400 barcodes per batch/print

// Configured Margins:
// Upper (Top): 5.0mm | Lower (Bottom): 5.0mm | Left: 2.5mm | Right: 2.5mm
const MARGIN_TOP_MM = 5.0;
const MARGIN_BOTTOM_MM = 5.0;
const MARGIN_LEFT_MM = 2.5;
const MARGIN_RIGHT_MM = 2.5;
const USABLE_WIDTH_MM = LABEL_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM; // 45.8mm

// ─── Helper: Generate Single Barcode Image Data URL via in-memory canvas ─────
function generateBarcodeDataUrl(code) {
    if (!code) return null;
    try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, String(code), {
            format: "CODE128",
            width: 2.0,
            height: 36,
            displayValue: true,
            fontSize: 13,
            font: "monospace",
            textMargin: 3.5, // Generous clean margin between barcode bars and code numbers
            margin: 2,
            background: "#ffffff",
            lineColor: "#000000",
        });
        return canvas.toDataURL("image/png");
    } catch (e) {
        console.error("Barcode generation failed for code:", code, e);
        return null;
    }
}

// ─── Single 2" × 1" Thermal Sticker Card (5mm Upper & Lower Margins) ────────
function ThermalLabelCard({ item, borderStyle, index }) {
    const [dataUrl, setDataUrl] = useState(null);

    useEffect(() => {
        if (item?.code) {
            const url = generateBarcodeDataUrl(item.code);
            setDataUrl(url);
        }
    }, [item?.code]);

    const borderCss =
        borderStyle === "dashed"
            ? "1px dashed #94a3b8"
            : borderStyle === "solid"
              ? "1px solid #cbd5e1"
              : "1px solid rgba(226, 232, 240, 0.9)";

    const formattedPrice = Number(item.selling_price || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <div
            className="thermal-label-card"
            style={{
                width: "100%",
                maxWidth: 290,
                aspectRatio: "2 / 1",
                border: borderCss,
                borderRadius: 6,
                padding: "6px 8px 6px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
                boxSizing: "border-box",
                overflow: "hidden",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                position: "relative",
            }}
        >
            {/* Small Index Tag at Top Left */}
            <span
                style={{
                    position: "absolute",
                    top: 2,
                    left: 5,
                    fontSize: "8.5px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    pointerEvents: "none",
                }}
            >
                #{index + 1}
            </span>

            {/* 1. Product Name at Top with clean margin to barcode */}
            <div
                style={{
                    fontSize: "10.5px",
                    fontWeight: "700",
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                    lineHeight: "1.2",
                    padding: "0 10px",
                    marginBottom: "3px", // Good margin from name to barcode
                    flexShrink: 0,
                }}
            >
                {item.item || "Product"}
            </div>

            {/* 2. Full Barcode Image with Code# Numbers */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    flex: 1,
                    minHeight: 0,
                    padding: "0",
                }}
            >
                {dataUrl ? (
                    <img
                        src={dataUrl}
                        alt={item.code}
                        style={{
                            maxWidth: "96%",
                            maxHeight: "100%",
                            height: "auto",
                            display: "block",
                            margin: "0 auto",
                            objectFit: "contain",
                        }}
                    />
                ) : (
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>#{item.code}</div>
                )}
            </div>

            {/* 3. Price at Bottom with clean margin from barcode number */}
            <div
                style={{
                    fontSize: "11.5px",
                    fontWeight: "800",
                    color: "#0f172a",
                    lineHeight: "1.1",
                    letterSpacing: "0.02em",
                    width: "100%",
                    textAlign: "center",
                    marginTop: "3px", // Good margin from barcode number to price
                    flexShrink: 0,
                }}
            >
                ₹{formattedPrice}
            </div>
        </div>
    );
}

// ─── Direct 2" × 1" (50.8mm × 25.4mm) PDF Generator (5mm Top/Bottom Margins)
async function generateDirectThermalPdf(labelList, borderStyle) {
    const listToPrint = labelList.slice(0, MAX_BARCODES_LIMIT);

    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM],
    });

    const barcodeCache = {};
    for (const item of listToPrint) {
        if (!barcodeCache[item.code]) {
            barcodeCache[item.code] = generateBarcodeDataUrl(item.code);
        }
    }

    for (let idx = 0; idx < listToPrint.length; idx++) {
        if (idx > 0) {
            pdf.addPage([LABEL_WIDTH_MM, LABEL_HEIGHT_MM], "landscape");
        }

        const item = listToPrint[idx];

        // Optional sticker outline border
        if (borderStyle === "dashed") {
            pdf.setDrawColor(148, 163, 184);
            pdf.setLineWidth(0.2);
            pdf.setLineDashPattern([1, 1], 0);
            pdf.roundedRect(0.6, 0.6, LABEL_WIDTH_MM - 1.2, LABEL_HEIGHT_MM - 1.2, 1.2, 1.2);
        } else if (borderStyle === "solid") {
            pdf.setDrawColor(203, 213, 225);
            pdf.setLineWidth(0.2);
            pdf.setLineDashPattern([], 0);
            pdf.roundedRect(0.6, 0.6, LABEL_WIDTH_MM - 1.2, LABEL_HEIGHT_MM - 1.2, 1.2, 1.2);
        }

        // 1. Barcode Image with Numbers (Rendered with balanced margins)
        const imgData = barcodeCache[item.code];
        if (imgData) {
            const imgX = MARGIN_LEFT_MM;
            const imgY = 5.4; // Good margin below name
            const imgW = USABLE_WIDTH_MM; // 45.8mm
            const imgH = 13.0; // Barcode + numbers
            pdf.addImage(imgData, "PNG", imgX, imgY, imgW, imgH, undefined, "FAST");
        }

        // 2. Product Title (Drawn on top at Y = 4.2mm with clean margin to barcode)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(0, 0, 0);
        const itemTitle = (item.item || "").length > 30 ? (item.item || "").slice(0, 28) + "..." : (item.item || "");
        pdf.text(itemTitle, LABEL_WIDTH_MM / 2, 4.2, {
            align: "center",
            maxWidth: USABLE_WIDTH_MM,
        });

        // 3. Selling Price at Bottom (Drawn on top at Y = 22.8mm with clean margin from code numbers)
        const formattedPrice = Number(item.selling_price || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Rs. ${formattedPrice}`, LABEL_WIDTH_MM / 2, 22.8, {
            align: "center",
        });
    }

    return pdf;
}

// ─── Main Barcode Modal ──────────────────────────────────────────────────────
export default function BarcodeSheetModal({ onClose }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState({});
    const [copies, setCopies] = useState({});
    const [borderStyle, setBorderStyle] = useState("dashed"); // "dashed", "solid", "none"
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [limitWarning, setLimitWarning] = useState(false);
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    );
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // Track viewport size
    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth < 768);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Fetch all barcode inventory items
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        axios
            .get("/dashboard/barcode-items")
            .then((res) => {
                if (!isMounted) return;
                const data = res.data || [];
                setItems(data);

                // Default: Select items up to 400 limit
                const initialSelected = {};
                const initialCopies = {};
                let count = 0;
                data.forEach((item) => {
                    if (count < MAX_BARCODES_LIMIT) {
                        initialSelected[item.id] = true;
                        initialCopies[item.id] = 1;
                        count++;
                    } else {
                        initialSelected[item.id] = false;
                        initialCopies[item.id] = 1;
                    }
                });
                setSelectedIds(initialSelected);
                setCopies(initialCopies);
            })
            .catch((err) => {
                console.error("Failed to load barcode items:", err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Search filter
    const filteredItems = items.filter((item) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (item.item || "").toLowerCase().includes(q) ||
            (item.code || "").toLowerCase().includes(q)
        );
    });

    // Flatten selected items with copy counts (capped at MAX_BARCODES_LIMIT)
    const rawLabelList = [];
    items.forEach((item) => {
        if (selectedIds[item.id]) {
            const count = Math.max(1, parseInt(copies[item.id]) || 1);
            for (let i = 0; i < count; i++) {
                rawLabelList.push({ ...item, keyId: `${item.id}-${i}` });
            }
        }
    });

    const isExceedingLimit = rawLabelList.length >= MAX_BARCODES_LIMIT;
    const labelList = rawLabelList.slice(0, MAX_BARCODES_LIMIT);
    const totalLabels = labelList.length;

    // Toggle item selection with 400 check
    function toggleItem(id) {
        if (!selectedIds[id]) {
            const currentTotal = rawLabelList.length;
            const itemCopies = Math.max(1, parseInt(copies[id]) || 1);
            if (currentTotal + itemCopies > MAX_BARCODES_LIMIT) {
                setLimitWarning(true);
                setTimeout(() => setLimitWarning(false), 3500);
            }
        }
        setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    // Select / Deselect All
    function handleSelectAll() {
        const nextSelected = {};
        const nextCopies = { ...copies };
        let count = 0;
        items.forEach((it) => {
            const desired = nextCopies[it.id] || 1;
            if (count + desired <= MAX_BARCODES_LIMIT) {
                nextSelected[it.id] = true;
                count += desired;
            } else if (count < MAX_BARCODES_LIMIT) {
                nextSelected[it.id] = true;
                nextCopies[it.id] = MAX_BARCODES_LIMIT - count;
                count = MAX_BARCODES_LIMIT;
            } else {
                nextSelected[it.id] = false;
            }
        });
        setSelectedIds(nextSelected);
        setCopies(nextCopies);
        if (items.length > MAX_BARCODES_LIMIT) {
            setLimitWarning(true);
            setTimeout(() => setLimitWarning(false), 3500);
        }
    }

    function handleDeselectAll() {
        setSelectedIds({});
    }

    function handleSetAllCopies(count) {
        const nextCopies = { ...copies };
        let runningTotal = 0;
        items.forEach((it) => {
            if (selectedIds[it.id]) {
                if (runningTotal + count <= MAX_BARCODES_LIMIT) {
                    nextCopies[it.id] = count;
                    runningTotal += count;
                } else if (runningTotal < MAX_BARCODES_LIMIT) {
                    nextCopies[it.id] = Math.max(1, MAX_BARCODES_LIMIT - runningTotal);
                    runningTotal = MAX_BARCODES_LIMIT;
                }
            } else {
                nextCopies[it.id] = count;
            }
        });
        setCopies(nextCopies);
        if (runningTotal >= MAX_BARCODES_LIMIT) {
            setLimitWarning(true);
            setTimeout(() => setLimitWarning(false), 3500);
        }
    }

    function updateItemCopies(id, val) {
        const targetVal = Math.max(1, parseInt(val) || 1);
        setCopies((prev) => ({ ...prev, [id]: targetVal }));
    }

    // ─── Direct 2" × 1" PDF Download ─────────────────────────────────────────
    async function handleDownloadPdf() {
        if (totalLabels === 0) return;
        setIsGeneratingPdf(true);

        try {
            const pdf = await generateDirectThermalPdf(labelList, borderStyle);
            const fileName = `Barcodes_2x1inch_${totalLabels}Labels_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(fileName);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try Print.");
        } finally {
            setIsGeneratingPdf(false);
        }
    }

    // ─── 5mm Margin Continuous Thermal Print Handler ─────────────────────────
    function handlePrint() {
        if (totalLabels === 0) return;

        const borderCss =
            borderStyle === "dashed"
                ? "1px dashed #64748b"
                : borderStyle === "solid"
                  ? "1px solid #94a3b8"
                  : "none";

        let labelsHtml = "";
        labelList.forEach((it) => {
            const dataUrl = generateBarcodeDataUrl(it.code);
            const price = Number(it.selling_price || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            const title = (it.item || "").length > 30 ? (it.item || "").slice(0, 28) + "..." : (it.item || "");

            labelsHtml += `
                <div class="thermal-label">
                    <div class="label-title">${title}</div>
                    <div class="bcode-wrap">
                        <img src="${dataUrl}" class="bcode-img" />
                    </div>
                    <div class="price">Rs. ${price}</div>
                </div>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Print 2" x 1" Barcodes</title>
                <style>
                    @page {
                        size: 50.8mm 25.4mm;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    html, body {
                        background: #fff;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .thermal-label {
                        width: 50.8mm;
                        height: 25.4mm;
                        max-width: 50.8mm;
                        max-height: 25.4mm;
                        page-break-inside: avoid;
                        page-break-after: always;
                        break-after: page;
                        box-sizing: border-box;
                        padding: 3.5mm 2.5mm 2.5mm 2.5mm;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: space-between;
                        text-align: center;
                        overflow: hidden;
                        background: #fff;
                        border: ${borderCss};
                    }
                    .thermal-label:last-child {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .label-title {
                        font-size: 7.5pt;
                        font-weight: 700;
                        color: #000;
                        line-height: 1.15;
                        max-height: 3.5mm;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        width: 100%;
                        margin-bottom: 0.8mm; /* Clean margin between name and barcode */
                        flex-shrink: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    .bcode-wrap {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        flex: 1;
                        min-height: 0;
                    }
                    .bcode-img {
                        max-width: 96%;
                        max-height: 13.0mm;
                        height: auto;
                        display: block;
                        margin: 0 auto;
                    }
                    .price {
                        font-size: 8.5pt;
                        font-weight: 800;
                        color: #000;
                        line-height: 1.1;
                        margin-top: 1.0mm; /* Clean margin between barcode numbers and price */
                        flex-shrink: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                </style>
            </head>
            <body>
                ${labelsHtml}
            </body>
            </html>
        `;

        let iframe = document.getElementById("barcode-print-frame");
        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.id = "barcode-print-frame";
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                const w = window.open("", "_blank");
                if (w) {
                    w.document.open();
                    w.document.write(html);
                    w.document.close();
                    w.onload = () => w.print();
                }
            }
        }, 250);
    }

    // ─── Reusable Items Selector Panel Component ─────────────────────────────
    const itemsSelectorContent = (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#f8fafc",
                overflow: "hidden",
            }}
        >
            {/* Format & Cut Border Bar */}
            <div
                style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Tag size={15} color={totalLabels >= MAX_BARCODES_LIMIT ? "#ea580c" : "#16a34a"} />
                    <span
                        style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: totalLabels >= MAX_BARCODES_LIMIT ? "#ea580c" : "#16a34a",
                        }}
                    >
                        {totalLabels}/{MAX_BARCODES_LIMIT} Max
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Border:</span>
                    {["dashed", "solid", "none"].map((style) => (
                        <button
                            key={style}
                            type="button"
                            onClick={() => setBorderStyle(style)}
                            style={{
                                padding: "3px 7px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: borderStyle === style ? 700 : 500,
                                background: borderStyle === style ? "#0f172a" : "#f1f5f9",
                                color: borderStyle === style ? "#ffffff" : "#475569",
                                border: "1px solid #cbd5e1",
                                textTransform: "capitalize",
                                cursor: "pointer",
                            }}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>

            {/* Limit Warning Notice if at limit */}
            {(limitWarning || isExceedingLimit) && (
                <div
                    style={{
                        background: "#fff7ed",
                        borderBottom: "1px solid #ffedd5",
                        padding: "6px 12px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#c2410c",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                    }}
                >
                    <AlertCircle size={14} color="#ea580c" />
                    <span>Capped at maximum {MAX_BARCODES_LIMIT} barcodes per batch print.</span>
                </div>
            )}

            {/* Batch Action Shortcuts */}
            <div
                style={{
                    padding: "8px 14px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                }}
            >
                <div style={{ display: "flex", gap: 6 }}>
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        style={{
                            padding: "4px 9px",
                            borderRadius: 5,
                            fontSize: 11.5,
                            fontWeight: 600,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            color: "#0f172a",
                            cursor: "pointer",
                        }}
                    >
                        Select All (≤400)
                    </button>
                    <button
                        type="button"
                        onClick={handleDeselectAll}
                        style={{
                            padding: "4px 9px",
                            borderRadius: 5,
                            fontSize: 11.5,
                            fontWeight: 600,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            color: "#64748b",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                </div>

                <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3, 5].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleSetAllCopies(num)}
                            style={{
                                padding: "3px 6px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                border: "1px solid #e2e8f0",
                                background: "#f1f5f9",
                                color: "#334155",
                                cursor: "pointer",
                            }}
                        >
                            {num}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Filter */}
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", flexShrink: 0 }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search size={14} style={{ position: "absolute", left: 10, color: "#94a3b8" }} />
                    <input
                        type="text"
                        placeholder="Search items by name or code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            height: 34,
                            paddingLeft: 30,
                            paddingRight: 10,
                            fontSize: 12.5,
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            outline: "none",
                        }}
                    />
                </div>
            </div>

            {/* Scrollable Products List */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "10px 12px",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {loading && (
                    <div style={{ textAlign: "center", padding: 30, color: "#64748b", fontSize: 12.5 }}>
                        Loading products...
                    </div>
                )}

                {!loading && filteredItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>
                        No products found.
                    </div>
                )}

                {!loading &&
                    filteredItems.map((item) => {
                        const isSelected = !!selectedIds[item.id];
                        const qty = copies[item.id] || 1;
                        const formattedPrice = Number(item.selling_price || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        });

                        return (
                            <div
                                key={item.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "9px 11px",
                                    borderRadius: 8,
                                    marginBottom: 6,
                                    background: isSelected ? "#ffffff" : "#f1f5f9",
                                    border: `1.5px solid ${isSelected ? "#16a34a" : "#e2e8f0"}`,
                                    transition: "all 0.15s",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        cursor: "pointer",
                                        flex: 1,
                                        minWidth: 0,
                                    }}
                                    onClick={() => toggleItem(item.id)}
                                >
                                    <div
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 5,
                                            border: `2px solid ${isSelected ? "#16a34a" : "#94a3b8"}`,
                                            background: isSelected ? "#16a34a" : "#ffffff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            color: "#ffffff",
                                        }}
                                    >
                                        {isSelected && <Check size={13} strokeWidth={3} />}
                                    </div>

                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: isSelected ? "#0f172a" : "#64748b",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {item.item}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                                            <span>#{item.code}</span>
                                            <span>•</span>
                                            <span style={{ fontWeight: 800, color: "#16a34a" }}>₹{formattedPrice}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stepper */}
                                <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0, marginLeft: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => updateItemCopies(item.id, qty - 1)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 5,
                                            border: "1px solid #cbd5e1",
                                            background: "#ffffff",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#0f172a",
                                        }}
                                        disabled={!isSelected || qty <= 1}
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => updateItemCopies(item.id, e.target.value)}
                                        disabled={!isSelected}
                                        style={{
                                            width: 36,
                                            height: 28,
                                            textAlign: "center",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            borderRadius: 5,
                                            border: "1px solid #cbd5e1",
                                            background: isSelected ? "#ffffff" : "#f1f5f9",
                                            color: "#0f172a",
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateItemCopies(item.id, qty + 1)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 5,
                                            border: "1px solid #cbd5e1",
                                            background: "#ffffff",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#0f172a",
                                        }}
                                        disabled={!isSelected || totalLabels >= MAX_BARCODES_LIMIT}
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Mobile Drawer Bottom Close CTA */}
            {isMobile && (
                <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", background: "#ffffff", flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(false)}
                        style={{
                            width: "100%",
                            background: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            padding: "10px",
                            borderRadius: 8,
                            fontSize: 13.5,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            cursor: "pointer",
                        }}
                    >
                        <Check size={16} />
                        <span>Done (View {totalLabels} Labels)</span>
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
                padding: "0",
                overflow: "hidden",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 1420,
                    height: "100%",
                    maxHeight: "100dvh",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Top Header Bar ────────────────────────────────────────── */}
                <div
                    style={{
                        padding: isMobile ? "8px 10px" : "10px 16px",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#ffffff",
                        flexShrink: 0,
                        gap: 6,
                    }}
                >
                    {/* Left: Mobile Hamburger Button OR Desktop Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {isMobile && (
                            <button
                                type="button"
                                onClick={() => setMobileDrawerOpen(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "7px 10px",
                                    borderRadius: 7,
                                    border: "1.5px solid #16a34a",
                                    background: "rgba(22, 163, 74, 0.08)",
                                    color: "#16a34a",
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                                title="Open items and settings panel"
                            >
                                <Menu size={16} strokeWidth={2.5} />
                                <span>Items ({totalLabels})</span>
                            </button>
                        )}

                        {!isMobile && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: "#dcfce7",
                                        color: "#16a34a",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 15.5, fontWeight: 700, color: "#0f172a" }}>
                                        Download 2″ × 1″ Barcode Labels
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>2″ × 1″ (50.8mm × 25.4mm)</span>
                                        <span>•</span>
                                        <span style={{ color: "#16a34a", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                            <ShieldCheck size={13} /> Upper &amp; Lower 5mm Margins
                                        </span>
                                        <span>•</span>
                                        <span>Max {MAX_BARCODES_LIMIT} Barcodes</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Download PDF, Print, Close */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={loading || totalLabels === 0 || isGeneratingPdf}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: isMobile ? 12 : 13,
                                fontWeight: 700,
                                padding: isMobile ? "7px 10px" : "8px 14px",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                background: "#f8fafc",
                                color: "#0f172a",
                                cursor: "pointer",
                            }}
                            title="Download 2″ × 1″ PDF document"
                        >
                            <Download size={14} />
                            <span>{isGeneratingPdf ? "Creating..." : isMobile ? `PDF (${totalLabels})` : "Download PDF"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={loading || totalLabels === 0 || isGeneratingPdf}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: isMobile ? 12 : 13,
                                fontWeight: 700,
                                padding: isMobile ? "7px 12px" : "8px 18px",
                                borderRadius: 6,
                                border: "none",
                                background: "#16a34a",
                                color: "#ffffff",
                                cursor: "pointer",
                            }}
                            title="Continuous thermal print"
                        >
                            <Printer size={15} />
                            <span>Print</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                width: isMobile ? 32 : 36,
                                height: isMobile ? 32 : 36,
                                borderRadius: 6,
                                border: "1px solid #e2e8f0",
                                background: "#f8fafc",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "#475569",
                                marginLeft: 2,
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ─── Main Content Body ───────────────────────────────────── */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "row",
                        minHeight: 0,
                        width: "100%",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    {/* ─── Desktop Left Panel: Select Items ─── */}
                    {!isMobile && (
                        <div
                            style={{
                                width: "360px",
                                borderRight: "1.5px solid #e2e8f0",
                                height: "100%",
                                flexShrink: 0,
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {itemsSelectorContent}
                        </div>
                    )}

                    {/* ─── Continuous Thermal Roll Preview Ribbon ────────────── */}
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            background: "#475569",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            height: "100%",
                            overflowY: "auto",
                            WebkitOverflowScrolling: "touch",
                            padding: isMobile ? "8px 6px 24px" : "12px 14px",
                            width: "100%",
                        }}
                    >
                        {/* Top Info Banner */}
                        <div
                            style={{
                                width: "100%",
                                maxWidth: 360,
                                background: "#ffffff",
                                padding: "7px 12px",
                                borderRadius: 7,
                                marginBottom: 10,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                                <Tag size={14} color="#16a34a" />
                                <span>2″ × 1″ Roll ({totalLabels} Stickers)</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                <ShieldCheck size={13} /> Upper/Lower 5mm Margin
                            </div>
                        </div>

                        {/* Rendered One-By-One Continuous Strip on Roll Backing */}
                        {totalLabels === 0 ? (
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 360,
                                    minHeight: 220,
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#94a3b8",
                                    padding: 20,
                                    textAlign: "center",
                                }}
                            >
                                <Download size={34} style={{ opacity: 0.3, marginBottom: 6 }} />
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>
                                    No Labels Selected
                                </div>
                                <div style={{ fontSize: 11.5, marginTop: 3 }}>
                                    {isMobile ? "Tap 'Items' above to pick products." : "Select items on the left to generate stickers."}
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 340,
                                    background: "rgba(255, 255, 255, 0.2)",
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 5,
                                    paddingBottom: 24,
                                }}
                            >
                                {labelList.map((it, idx) => (
                                    <ThermalLabelCard
                                        key={it.keyId}
                                        item={it}
                                        index={idx}
                                        borderStyle={borderStyle}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─── Mobile Slide-in Sidepanel (Off-canvas Drawer) ─────── */}
                    {isMobile && mobileDrawerOpen && (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 1000,
                                display: "flex",
                            }}
                        >
                            {/* Backdrop overlay */}
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(15, 23, 42, 0.6)",
                                    backdropFilter: "blur(2px)",
                                }}
                                onClick={() => setMobileDrawerOpen(false)}
                            />

                            {/* Sliding Sidepanel Drawer */}
                            <div
                                style={{
                                    position: "relative",
                                    width: "85%",
                                    maxWidth: 340,
                                    height: "100%",
                                    background: "#ffffff",
                                    boxShadow: "4px 0 25px rgba(0,0,0,0.3)",
                                    display: "flex",
                                    flexDirection: "column",
                                    zIndex: 1001,
                                }}
                            >
                                {/* Drawer Header */}
                                <div
                                    style={{
                                        padding: "10px 14px",
                                        borderBottom: "1px solid #e2e8f0",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        background: "#ffffff",
                                        flexShrink: 0,
                                    }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                        Select Items &amp; Copies
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMobileDrawerOpen(false)}
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 6,
                                            border: "1px solid #e2e8f0",
                                            background: "#f8fafc",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            color: "#475569",
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Drawer Content */}
                                <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                    {itemsSelectorContent}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
