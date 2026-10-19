import { useState, useRef, useMemo, useEffect } from "react";
import { Link } from "@inertiajs/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ApplicationLogo from "@/Components/ApplicationLogo";
import { ArrowLeft, Printer, Download, Share2, Check } from "lucide-react";

function numberToWordsINR(amount) {
    if (!amount || isNaN(amount)) return "Zero Rupees Only";
    const num = Math.floor(Math.abs(amount));
    const paise = Math.round((Math.abs(amount) - num) * 100);

    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convertSection(n) {
        if (n < 20) return units[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + units[n % 10] : "");
        return units[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertSection(n % 100) : "");
    }

    if (num === 0 && paise === 0) return "Zero Rupees Only";

    let words = "";
    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    if (crores > 0) words += convertSection(crores) + " Crore ";
    if (lakhs > 0) words += convertSection(lakhs) + " Lakh ";
    if (thousands > 0) words += convertSection(thousands) + " Thousand ";
    if (remainder > 0) words += convertSection(remainder) + " ";

    words = words.trim() ? words.trim() + " Rupees" : "";
    if (paise > 0) {
        words += (words ? " and " : "") + convertSection(paise) + " Paise";
    }
    return words + " Only";
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function InvoicePrint({ invoice = {}, businessProfile = {} }) {
    const printRef = useRef(null);
    const [downloading, setDownloading] = useState(false);
    const isInterState = invoice?.tax_type === "inter_state";

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get("autoprint") === "1" || params.get("print") === "1") {
                const timer = setTimeout(() => {
                    window.print();
                }, 500);
                return () => clearTimeout(timer);
            }
        } catch {}
    }, []);

    const amountInWords = useMemo(() => {
        return numberToWordsINR(invoice?.total_amount);
    }, [invoice?.total_amount]);

    // HSN Summary Grouping
    const hsnSummary = useMemo(() => {
        const groups = {};
        (invoice.items || []).forEach((it) => {
            const hsn = it.hsn_sac || "General";
            if (!groups[hsn]) {
                groups[hsn] = {
                    hsn,
                    taxable: 0,
                    cgstRate: it.cgst_rate || 0,
                    cgstAmt: 0,
                    sgstRate: it.sgst_rate || 0,
                    sgstAmt: 0,
                    igstRate: it.igst_rate || 0,
                    igstAmt: 0,
                    totalTax: 0,
                };
            }
            groups[hsn].taxable += parseFloat(it.taxable_value || 0);
            groups[hsn].cgstAmt += parseFloat(it.cgst_amount || 0);
            groups[hsn].sgstAmt += parseFloat(it.sgst_amount || 0);
            groups[hsn].igstAmt += parseFloat(it.igst_amount || 0);
            groups[hsn].totalTax +=
                parseFloat(it.cgst_amount || 0) +
                parseFloat(it.sgst_amount || 0) +
                parseFloat(it.igst_amount || 0);
        });
        return Object.values(groups);
    }, [invoice.items]);

    function handlePrint() {
        window.print();
    }

    async function handleDownloadPDF() {
        if (!printRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                windowWidth: printRef.current.scrollWidth,
                windowHeight: printRef.current.scrollHeight,
            });

            const pdf = new jsPDF("p", "pt", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfPageHeight = pdf.internal.pageSize.getHeight();
            const bottomMargin = 20;
            const contentHeight = pdfPageHeight - bottomMargin;
            const canvasPageHeight = (contentHeight * canvas.width) / pdfWidth;
            const totalPages = Math.ceil(canvas.height / canvasPageHeight);

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                if (pageIndex > 0) pdf.addPage();
                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                const sliceHeight = Math.min(
                    canvasPageHeight,
                    canvas.height - pageIndex * canvasPageHeight
                );
                sliceCanvas.height = sliceHeight;

                const ctx = sliceCanvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                ctx.drawImage(
                    canvas,
                    0,
                    pageIndex * canvasPageHeight,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    canvas.width,
                    sliceHeight
                );

                const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
                const slicePdfHeight = (sliceHeight * pdfWidth) / canvas.width;
                pdf.addImage(sliceData, "JPEG", 0, 0, pdfWidth, slicePdfHeight);
            }

            const fileName = `GST_Invoice_${invoice.invoice_number}.pdf`;
            pdf.save(fileName);
        } catch (e) {
            console.error("PDF generation failed:", e);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "20px 10px", overflowX: "auto" }}>
            {/* Top Toolbar (Hidden on Print) */}
            <div
                className="no-print"
                style={{
                    maxWidth: 820,
                    margin: "0 auto 16px auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                }}
            >
                <Link
                    href="/invoices"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#475569",
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                    }}
                >
                    <ArrowLeft size={16} /> Back to Invoices
                </Link>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#1e293b",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        <Download size={15} />
                        {downloading ? "Preparing PDF..." : "Download PDF"}
                    </button>

                    <button
                        onClick={handlePrint}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: "#4f46e5",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                        }}
                    >
                        <Printer size={15} /> Print Invoice
                    </button>
                </div>
            </div>

            {/* Official GST Tax Invoice Sheet */}
            <div
                ref={printRef}
                id="printable-gst-invoice"
                style={{
                    maxWidth: 820,
                    margin: "0 auto",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    padding: "24px 28px",
                    color: "#0f172a",
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: 12,
                    lineHeight: 1.5,
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                }}
            >
                {/* 1. Tax Invoice Header */}
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <ApplicationLogo size={42} variant="invoice" tagline="GST Registered Enterprise" />
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#1e1b4b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                TAX INVOICE
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: 2 }}>
                                Original for Recipient
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", marginTop: 4 }}>
                                Invoice No: {invoice.invoice_number}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Top Info Grid: Seller, Buyer, Invoice Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr", gap: 14, marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, background: "#f8fafc" }}>
                    {/* Billed By (Seller) */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                            Billed By (Seller):
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                            {invoice.seller_name}
                        </div>
                        {invoice.seller_address && (
                            <div style={{ color: "#334155", fontSize: 11.5, marginTop: 2, whiteSpace: "pre-line" }}>
                                {invoice.seller_address}
                            </div>
                        )}
                        {invoice.seller_gst_number && (
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                                GSTIN: <span style={{ fontFamily: "monospace" }}>{invoice.seller_gst_number}</span>
                            </div>
                        )}
                        {invoice.seller_state && (
                            <div style={{ fontSize: 11, color: "#475569" }}>
                                State: {invoice.seller_state}
                            </div>
                        )}
                        {invoice.seller_phone && (
                            <div style={{ fontSize: 11, color: "#475569" }}>
                                Phone: {invoice.seller_phone}
                            </div>
                        )}
                    </div>

                    {/* Billed To (Buyer) */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                            Billed To (Buyer):
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                            {invoice.customer_name}
                        </div>
                        {invoice.customer_address && (
                            <div style={{ color: "#334155", fontSize: 11.5, marginTop: 2, whiteSpace: "pre-line" }}>
                                {invoice.customer_address}
                            </div>
                        )}
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                            GSTIN: <span style={{ fontFamily: "monospace" }}>{invoice.customer_gst_number || "Unregistered"}</span>
                        </div>
                        {invoice.customer_state && (
                            <div style={{ fontSize: 11, color: "#475569" }}>
                                State: {invoice.customer_state}
                            </div>
                        )}
                        {invoice.customer_phone && (
                            <div style={{ fontSize: 11, color: "#475569" }}>
                                Phone: {invoice.customer_phone}
                            </div>
                        )}
                    </div>

                    {/* Invoice Meta */}
                    <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                            Invoice Details:
                        </div>
                        <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                            <span style={{ color: "#64748b" }}>Date:</span> <strong>{formatDate(invoice.invoice_date)}</strong>
                        </div>
                        {invoice.due_date && (
                            <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                                <span style={{ color: "#64748b" }}>Due Date:</span> <strong>{formatDate(invoice.due_date)}</strong>
                            </div>
                        )}
                        <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                            <span style={{ color: "#64748b" }}>Place of Supply:</span> <strong>{invoice.place_of_supply || invoice.customer_state || "-"}</strong>
                        </div>
                        <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                            <span style={{ color: "#64748b" }}>Tax Type:</span> <strong>{isInterState ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}</strong>
                        </div>
                        <div style={{ fontSize: 11.5 }}>
                            <span style={{ color: "#64748b" }}>Reverse Charge:</span> <strong>No</strong>
                        </div>
                    </div>
                </div>

                {/* 3. Line Items Table */}
                <div style={{ marginBottom: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ background: "#0f172a", color: "#ffffff", textAlign: "left" }}>
                                <th style={{ padding: "7px 8px", width: 30, border: "1px solid #0f172a" }}>#</th>
                                <th style={{ padding: "7px 8px", border: "1px solid #0f172a" }}>Item Description</th>
                                <th style={{ padding: "7px 8px", width: 65, border: "1px solid #0f172a" }}>HSN/SAC</th>
                                <th style={{ padding: "7px 8px", width: 85, textAlign: "center", border: "1px solid #0f172a" }}>Qty / Dimension</th>
                                <th style={{ padding: "7px 8px", width: 45, border: "1px solid #0f172a" }}>Unit</th>
                                <th style={{ padding: "7px 8px", width: 65, textAlign: "right", border: "1px solid #0f172a" }}>Rate (₹)</th>
                                <th style={{ padding: "7px 8px", width: 50, textAlign: "right", border: "1px solid #0f172a" }}>Disc%</th>
                                <th style={{ padding: "7px 8px", width: 75, textAlign: "right", border: "1px solid #0f172a" }}>Taxable (₹)</th>
                                {isInterState ? (
                                    <th style={{ padding: "7px 8px", width: 80, textAlign: "right", border: "1px solid #0f172a" }}>IGST</th>
                                ) : (
                                    <>
                                        <th style={{ padding: "7px 8px", width: 70, textAlign: "right", border: "1px solid #0f172a" }}>CGST</th>
                                        <th style={{ padding: "7px 8px", width: 70, textAlign: "right", border: "1px solid #0f172a" }}>SGST</th>
                                    </>
                                )}
                                <th style={{ padding: "7px 8px", width: 85, textAlign: "right", border: "1px solid #0f172a" }}>Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.items || []).map((it, idx) => (
                                <tr key={it.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                    <td style={{ padding: "7px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>{idx + 1}</td>
                                    <td style={{ padding: "7px 8px", fontWeight: 600, border: "1px solid #e2e8f0" }}>{it.item_name}</td>
                                    <td style={{ padding: "7px 8px", color: "#64748b", border: "1px solid #e2e8f0" }}>{it.hsn_sac || "-"}</td>
                                    <td style={{ padding: "7px 8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                        {it.dimension ? (
                                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{it.dimension}</span>
                                        ) : (
                                            <span>{parseFloat(it.quantity)}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "7px 8px", color: "#64748b", border: "1px solid #e2e8f0" }}>{it.dimension ? "-" : (it.unit || "PCS")}</td>
                                    <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>{parseFloat(it.rate).toFixed(2)}</td>
                                    <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                        {parseFloat(it.discount_percent || 0) > 0 ? `${parseFloat(it.discount_percent)}%` : "-"}
                                    </td>
                                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600, border: "1px solid #e2e8f0" }}>
                                        {parseFloat(it.taxable_value || 0).toFixed(2)}
                                    </td>
                                    {isInterState ? (
                                        <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>
                                            {parseFloat(it.igst_amount || 0).toFixed(2)}
                                            <div style={{ fontSize: 9.5, color: "#64748b" }}>({parseFloat(it.igst_rate)}%)</div>
                                        </td>
                                    ) : (
                                        <>
                                            <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>
                                                {parseFloat(it.cgst_amount || 0).toFixed(2)}
                                                <div style={{ fontSize: 9.5, color: "#64748b" }}>({parseFloat(it.cgst_rate)}%)</div>
                                            </td>
                                            <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>
                                                {parseFloat(it.sgst_amount || 0).toFixed(2)}
                                                <div style={{ fontSize: 9.5, color: "#64748b" }}>({parseFloat(it.sgst_rate)}%)</div>
                                            </td>
                                        </>
                                    )}
                                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, border: "1px solid #e2e8f0" }}>
                                        {parseFloat(it.total_amount || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Tax Breakdown & Financial Totals Block */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 16 }}>
                    {/* HSN Summary */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                            GST Tax Computation Summary:
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, border: "1px solid #cbd5e1" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                                    <th style={{ padding: "4px 6px", border: "1px solid #cbd5e1" }}>HSN/SAC</th>
                                    <th style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Taxable (₹)</th>
                                    {isInterState ? (
                                        <th style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>IGST (₹)</th>
                                    ) : (
                                        <>
                                            <th style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>CGST (₹)</th>
                                            <th style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>SGST (₹)</th>
                                        </>
                                    )}
                                    <th style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>Tax Total (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hsnSummary.map((h, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: "4px 6px", border: "1px solid #cbd5e1" }}>{h.hsn}</td>
                                        <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>{h.taxable.toFixed(2)}</td>
                                        {isInterState ? (
                                            <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>{h.igstAmt.toFixed(2)}</td>
                                        ) : (
                                            <>
                                                <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>{h.cgstAmt.toFixed(2)}</td>
                                                <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cbd5e1" }}>{h.sgstAmt.toFixed(2)}</td>
                                            </>
                                        )}
                                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                                            {h.totalTax.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Amount in Words */}
                        <div style={{ marginTop: 12, padding: "8px 10px", background: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Total Amount in Words:
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                                {amountInWords}
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary Box */}
                    <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Sub Total:</span>
                            <span>₹{parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {parseFloat(invoice.total_discount || 0) > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                                <span>Discount:</span>
                                <span>- ₹{parseFloat(invoice.total_discount).toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                            <span>Taxable Amount:</span>
                            <span>₹{parseFloat(invoice.taxable_amount || 0).toFixed(2)}</span>
                        </div>
                        {isInterState ? (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>IGST:</span>
                                <span>₹{parseFloat(invoice.igst_amount || 0).toFixed(2)}</span>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>CGST:</span>
                                    <span>₹{parseFloat(invoice.cgst_amount || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>SGST:</span>
                                    <span>₹{parseFloat(invoice.sgst_amount || 0).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        {parseFloat(invoice.round_off || 0) !== 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 11 }}>
                                <span>Round Off:</span>
                                <span>{parseFloat(invoice.round_off) > 0 ? `+ ₹${parseFloat(invoice.round_off).toFixed(2)}` : `- ₹${Math.abs(parseFloat(invoice.round_off)).toFixed(2)}`}</span>
                            </div>
                        )}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderTop: "2px solid #0f172a",
                                marginTop: 6,
                                paddingTop: 6,
                                fontSize: 15,
                                fontWeight: 900,
                                color: "#0f172a",
                            }}
                        >
                            <span>Grand Total:</span>
                            <span>₹{parseFloat(invoice.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Bank Details, Terms & Signatures */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                    <div>
                        {businessProfile?.bank_name && (
                            <div style={{ marginBottom: 8, fontSize: 11 }}>
                                <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#64748b", fontSize: 9.5 }}>
                                    Bank Payment Details:
                                </div>
                                <div>Bank: <strong>{businessProfile.bank_name}</strong> {businessProfile.bank_branch ? `(${businessProfile.bank_branch})` : ""}</div>
                                <div>A/C No: <strong>{businessProfile.bank_account_number}</strong></div>
                                <div>IFSC: <strong>{businessProfile.bank_ifsc}</strong></div>
                            </div>
                        )}

                        <div style={{ fontSize: 10.5, color: "#64748b" }}>
                            <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 9.5, marginBottom: 2 }}>
                                Terms & Conditions:
                            </div>
                            <div style={{ whiteSpace: "pre-line" }}>
                                {invoice.terms || "1. Goods once sold will not be returned.\n2. Subject to local jurisdiction."}
                            </div>
                        </div>
                    </div>

                    {/* Authorized Signatory Box */}
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                            For {invoice.seller_name}
                        </div>
                        <div style={{ height: 45 }}></div>
                        <div>
                            <div style={{ borderTop: "1px solid #94a3b8", width: 160, marginBottom: 2 }}></div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                                Authorized Signatory
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Stylesheet */}
            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #printable-gst-invoice {
                        border: none !important;
                        box-shadow: none !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        padding: 10px 15px !important;
                        margin: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
