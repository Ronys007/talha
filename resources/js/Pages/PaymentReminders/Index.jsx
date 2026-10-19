import { useMemo, useState, useRef } from "react";
import { useForm, router } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
    BellRing,
    Search,
    IndianRupee,
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Phone,
    Copy,
    Check,
    MessageCircle,
    ExternalLink,
    Filter,
    X,
    CreditCard,
    Send,
    Receipt,
    ShoppingBag,
    Download,
    FileText,
    Printer,
    Loader2
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

// ── PDF Reminder Modal Component ──────────────────────────────────────────
function PrintBillReminderModal({ bill, business = {}, onClose }) {
    const printRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    const bizName = (bill.seller_name && bill.seller_name !== "Super Admin")
        ? bill.seller_name
        : (business.name && business.name !== "Super Admin" ? business.name : "Admin");
    const bizAddress = bill.seller_address || business.address || "";
    const bizGst = bill.seller_gst || business.gstin || "";
    const bizPhone = bill.seller_phone || business.phone || "";
    const bizEmail = business.email || "";

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
            const prefix = bill.is_paid ? "Payment_Receipt" : "Payment_Reminder";
            pdf.save(`${prefix}_${bill.bill_number}_${(bill.customer_name || "Customer").replace(/\s+/g, "_")}.pdf`);
        } catch (err) {
            console.error("Failed to generate PDF", err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, padding: 12 }}>
            <div
                className="modal-box modal-lg"
                style={{ maxWidth: 840, width: "100%", maxHeight: "94vh", display: "flex", flexDirection: "column", padding: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: "12px 18px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {bill.is_paid ? "Payment Receipt Statement" : "Payment Reminder"} &bull; Bill #{bill.bill_number} &bull; {bill.customer_name}
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
                        {/* Header: Admin Business Info */}
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: "#1e1b4b" }}>{bizName}</div>
                                {bizAddress && <div style={{ fontSize: 12, color: "#475569", maxWidth: 320, marginTop: 2 }}>{bizAddress}</div>}
                                {bizGst && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}><strong>GSTIN:</strong> {bizGst}</div>}
                                {bizPhone && <div style={{ fontSize: 12, color: "#475569" }}><strong>Phone:</strong> {bizPhone}</div>}
                                {bizEmail && <div style={{ fontSize: 12, color: "#475569" }}><strong>Email:</strong> {bizEmail}</div>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 22, fontWeight: 900, color: bill.is_paid ? "#047857" : "#dc2626", letterSpacing: "0.02em" }}>
                                    {bill.is_paid ? "PAYMENT RECEIPT" : "PAYMENT REMINDER"}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Bill #{bill.bill_number}</div>
                                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Bill Date: {formatDate(bill.bill_date)}</div>
                                {bill.is_paid ? (
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#047857", marginTop: 2 }}>
                                        Received Date: {formatDate(bill.paid_at || bill.bill_date)}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#b91c1c", marginTop: 2 }}>
                                        Payment Due Date: {formatDate(bill.due_date)}
                                    </div>
                                )}
                                <div style={{ marginTop: 6 }}>
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: bill.is_paid ? "#ecfdf5" : bill.overdue_days > 0 ? "#fef2f2" : "#fffbeb", color: bill.is_paid ? "#047857" : bill.overdue_days > 0 ? "#dc2626" : "#b45309" }}>
                                        {bill.is_paid ? `Payment Received (${formatDate(bill.paid_at || bill.bill_date)})` : bill.overdue_days > 0 ? `Overdue by ${bill.overdue_days} Days` : "Payment Due"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Customer / Billed To */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0", padding: 12, background: "#f8fafc", borderRadius: 6 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Billed To (Customer):</div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{bill.customer_name}</div>
                                {bill.customer_phone && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Phone: {bill.customer_phone}</div>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Payment Status:</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: bill.is_paid ? "#047857" : "#dc2626", marginTop: 2 }}>
                                    {bill.is_paid ? "FULL RECEIVED" : `PENDING BALANCE: ₹${toMoney(bill.balance_due)}`}
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        {(bill.items || []).length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                                        <th style={{ padding: "8px 10px", textAlign: "left" }}>#</th>
                                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Item Description</th>
                                        <th style={{ padding: "8px 10px", textAlign: "center" }}>Qty</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate (₹)</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bill.items.map((it, idx) => (
                                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "8px 10px" }}>{idx + 1}</td>
                                            <td style={{ padding: "8px 10px", fontWeight: 600 }}>{it.item_name}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.quantity} {it.unit || "PCS"}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right" }}>₹{toMoney(it.rate)}</td>
                                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>₹{toMoney(it.total_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Financial Settlement Box */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 16 }}>
                            <div style={{ flex: 1, background: "#f8fafc", padding: 12, borderRadius: 6, fontSize: 12 }}>
                                <div style={{ fontWeight: 700, color: "#1e1b4b", marginBottom: 6 }}>Bank &amp; Payment Transfer Details:</div>
                                {business.bank_name && <div><strong>Bank:</strong> {business.bank_name}</div>}
                                {business.upi_id && <div><strong>A/C No / UPI:</strong> {business.upi_id}</div>}
                                {business.ifsc && <div><strong>IFSC:</strong> {business.ifsc}</div>}
                                <div style={{ marginTop: 8, color: "#64748b", fontStyle: "italic" }}>
                                    Kindly make the payment before the due date and share transaction reference.
                                </div>
                            </div>

                            <div style={{ width: 280, background: "#f1f5f9", padding: 14, borderRadius: 6, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b" }}>Total Bill Amount:</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(bill.total_amount)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#047857" }}>
                                    <span>Amount Received:</span>
                                    <span style={{ fontWeight: 600 }}>- ₹{toMoney(bill.paid_amount)}</span>
                                </div>
                                <div style={{ borderTop: "2px dashed #94a3b8", margin: "4px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 900, color: "#dc2626" }}>
                                    <span>Balance Due:</span>
                                    <span>₹{toMoney(bill.balance_due)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signatory Footer */}
                        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div style={{ fontSize: 11, color: "#64748b", maxWidth: 360 }}>
                                This is a computer generated payment reminder statement. For any billing queries, please contact {bizPhone || bizEmail || bizName}.
                            </div>
                            <div style={{ textAlign: "center", width: 200, borderTop: "1px solid #64748b", paddingTop: 6, fontSize: 12 }}>
                                <div><strong>For {bizName}</strong></div>
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Authorized Signatory</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentRemindersIndex({ bills = [], summary = {}, business = {} }) {
    const [search, setSearch] = useState("");
    const [filterTab, setFilterTab] = useState("unpaid"); // 'all' | 'unpaid' | 'overdue' | 'today' | 'paid'
    const [copiedId, setCopiedId] = useState(null);
    const [updatingDueDateId, setUpdatingDueDateId] = useState(null);
    const [previewBill, setPreviewBill] = useState(null);
    const [generatingPdfId, setGeneratingPdfId] = useState(null);

    // Hidden container ref for off-screen PDF capture on WhatsApp click
    const offscreenPdfRef = useRef(null);
    const [activeOffscreenBill, setActiveOffscreenBill] = useState(null);

    // Record Payment Modal
    const [paymentModalBill, setPaymentModalBill] = useState(null);
    const { data, setData, post, processing, reset } = useForm({
        source: "",
        id: "",
        amount: "",
    });

    const filteredBills = useMemo(() => {
        return bills.filter((b) => {
            // Tab filter
            if (filterTab === "unpaid" && b.is_paid) return false;
            if (filterTab === "overdue" && (b.is_paid || b.overdue_days <= 0)) return false;
            if (filterTab === "today" && (b.is_paid || b.overdue_days !== 0)) return false;
            if (filterTab === "paid" && !b.is_paid) return false;

            // Search filter
            if (search.trim()) {
                const q = search.toLowerCase();
                const num = (b.bill_number || "").toLowerCase();
                const cust = (b.customer_name || "").toLowerCase();
                const ph = (b.customer_phone || "").toLowerCase();
                if (!num.includes(q) && !cust.includes(q) && !ph.includes(q)) return false;
            }

            return true;
        });
    }, [bills, filterTab, search]);

    // Build WhatsApp Reminder Message
    function buildReminderMessage(bill) {
        const bName = (bill.seller_name && bill.seller_name !== "Super Admin")
            ? bill.seller_name
            : (business.name && business.name !== "Super Admin" ? business.name : "Admin");
        const phone = (bill.seller_phone || business.phone) ? ` (${bill.seller_phone || business.phone})` : "";
        const upi = business.upi_id ? `\nUPI / Bank: ${business.upi_id}` : "";

        return `Dear ${bill.customer_name}, greetings from ${bName}!

This is a payment reminder regarding Bill #${bill.bill_number} dated ${formatDate(bill.bill_date)} for total ₹${toMoney(bill.total_amount)}.

• Total Amount: ₹${toMoney(bill.total_amount)}
• Amount Received: ₹${toMoney(bill.paid_amount)}
• Pending Balance Due: ₹${toMoney(bill.balance_due)}
• Payment Due Date: ${formatDate(bill.due_date)}

Please find the official statement PDF attached. Kindly clear the pending balance at your earliest convenience.${upi}

Thank you,
${bName}${phone}`;
    }

    // Direct PDF generator helper
    async function generateAndDownloadBillPDF(bill) {
        const pdf = new jsPDF("p", "pt", "a4");
        const bName = (bill.seller_name && bill.seller_name !== "Super Admin")
            ? bill.seller_name
            : (business.name && business.name !== "Super Admin" ? business.name : "Admin");
        const bAddress = bill.seller_address || business.address || "";
        const bGst = bill.seller_gst || business.gstin || "";
        const bPhone = bill.seller_phone || business.phone || "";
        const pageWidth = pdf.internal.pageSize.getWidth();

        // Top banner
        pdf.setFillColor(15, 23, 42); // slate-900
        pdf.rect(0, 0, pageWidth, 55, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(bName, 30, 32);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(bill.is_paid ? "PAYMENT RECEIPT STATEMENT" : "PAYMENT REMINDER STATEMENT", pageWidth - 30, 32, { align: "right" });

        // Business info below banner
        pdf.setTextColor(30, 41, 59);
        let currY = 75;
        if (bAddress) {
            pdf.text(bAddress, 30, currY);
            currY += 14;
        }
        if (bGst) {
            pdf.text(`GSTIN: ${bGst}`, 30, currY);
            currY += 14;
        }
        if (bPhone) {
            pdf.text(`Phone: ${bPhone}`, 30, currY);
            currY += 14;
        }

        // Bill details box
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.roundedRect(pageWidth - 230, 70, 200, 75, 4, 4, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`Bill No: #${bill.bill_number}`, pageWidth - 220, 88);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Bill Date: ${formatDate(bill.bill_date)}`, pageWidth - 220, 104);
        if (bill.is_paid) {
            pdf.setTextColor(4, 120, 87);
            pdf.setFont("helvetica", "bold");
            pdf.text(`Received: ${formatDate(bill.paid_at || bill.bill_date)}`, pageWidth - 220, 120);
            pdf.text("Status: Received", pageWidth - 220, 136);
        } else {
            pdf.setTextColor(220, 38, 38);
            pdf.setFont("helvetica", "bold");
            pdf.text(`Due Date: ${formatDate(bill.due_date)}`, pageWidth - 220, 120);
            pdf.text(`Status: ${bill.status}`, pageWidth - 220, 136);
        }

        // Customer details box
        currY = Math.max(currY + 15, 160);
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(30, currY, pageWidth - 60, 45, 4, 4, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 41, 59);
        pdf.text("BILLED TO / CUSTOMER:", 42, currY + 18);
        pdf.setFontSize(12);
        pdf.text(bill.customer_name || "Customer", 42, currY + 34);

        if (bill.customer_phone) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.text(`Contact: ${bill.customer_phone}`, pageWidth - 42, currY + 26, { align: "right" });
        }

        currY += 60;

        // Line Items Table (if any)
        if (bill.items && bill.items.length > 0) {
            pdf.setFillColor(30, 41, 59);
            pdf.rect(30, currY, pageWidth - 60, 22, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.text("#", 38, currY + 15);
            pdf.text("Item Description", 60, currY + 15);
            pdf.text("Qty", 320, currY + 15, { align: "center" });
            pdf.text("Rate (₹)", 420, currY + 15, { align: "right" });
            pdf.text("Total (₹)", pageWidth - 40, currY + 15, { align: "right" });

            currY += 22;
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(15, 23, 42);

            bill.items.forEach((it, idx) => {
                pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
                pdf.rect(30, currY, pageWidth - 60, 20, "F");
                pdf.setDrawColor(226, 232, 240);
                pdf.line(30, currY + 20, pageWidth - 30, currY + 20);

                pdf.text(String(idx + 1), 38, currY + 14);
                pdf.text(it.item_name || "Item", 60, currY + 14);
                pdf.text(`${it.quantity} ${it.unit || "PCS"}`, 320, currY + 14, { align: "center" });
                pdf.text(toMoney(it.rate), 420, currY + 14, { align: "right" });
                pdf.text(toMoney(it.total_amount), pageWidth - 40, currY + 14, { align: "right" });
                currY += 20;
            });
            currY += 15;
        }

        // Summary & Payment details
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(30, currY, 250, 85, 4, 4, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Bank & Settlement Details:", 40, currY + 18);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        if (business.bank_name) pdf.text(`Bank: ${business.bank_name}`, 40, currY + 34);
        if (business.upi_id) pdf.text(`A/C / UPI: ${business.upi_id}`, 40, currY + 48);
        if (business.ifsc) pdf.text(`IFSC: ${business.ifsc}`, 40, currY + 62);
        pdf.text("Please clear pending dues on or before due date.", 40, currY + 76);

        // Balance Due Summary Box
        pdf.setFillColor(254, 242, 242);
        pdf.setDrawColor(239, 68, 68);
        pdf.roundedRect(pageWidth - 250, currY, 220, 85, 4, 4, "FD");

        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text("Total Bill Amount:", pageWidth - 240, currY + 20);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        pdf.text(`₹${toMoney(bill.total_amount)}`, pageWidth - 40, currY + 20, { align: "right" });

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(4, 120, 87);
        pdf.text("Received Amount:", pageWidth - 240, currY + 40);
        pdf.setFont("helvetica", "bold");
        pdf.text(`₹${toMoney(bill.paid_amount)}`, pageWidth - 40, currY + 40, { align: "right" });

        pdf.setDrawColor(220, 38, 38);
        pdf.line(pageWidth - 240, currY + 52, pageWidth - 40, currY + 52);

        pdf.setFontSize(12);
        pdf.setTextColor(220, 38, 38);
        pdf.text("Outstanding Balance:", pageWidth - 240, currY + 70);
        pdf.text(`₹${toMoney(bill.balance_due)}`, pageWidth - 40, currY + 70, { align: "right" });

        // Footer note and authorized signatory
        currY += 120;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Generated on ${new Date().toLocaleDateString("en-IN")}. Contact: ${business.phone || business.email || ""}`, 30, currY);

        pdf.setDrawColor(148, 163, 184);
        pdf.line(pageWidth - 190, currY - 14, pageWidth - 30, currY - 14);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`For ${bName}`, pageWidth - 110, currY, { align: "center" });

        const prefix = bill.is_paid ? "Payment_Receipt" : "Payment_Reminder";
        const fileName = `${prefix}_${bill.bill_number}_${(bill.customer_name || "Customer").replace(/\s+/g, "_")}.pdf`;
        pdf.save(fileName);
        return fileName;
    }

    // 1-Click WhatsApp reminder
    function handleSendWhatsApp(bill) {
        if (bill.source === "invoice") {
            router.post(`/whatsapp/send-reminder/${bill.id}`, {}, {
                preserveScroll: true,
            });
            return;
        }

        // For direct bills
        router.post(`/whatsapp/send-reminder/${bill.id}`, {}, {
            preserveScroll: true,
        });
    }

    // Handle user changing payment due date
    function handleDueDateChange(bill, newDate) {
        if (!newDate || newDate === bill.due_date) return;
        setUpdatingDueDateId(bill.id);
        router.post(
            "/payment-reminders/update-due-date",
            { id: bill.id, due_date: newDate },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingDueDateId(null),
            }
        );
    }

    function handleCopyReminder(bill) {
        const text = buildReminderMessage(bill);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }

        setCopiedId(bill.id);
        setTimeout(() => setCopiedId(null), 2500);
    }

    function openPaymentModal(bill) {
        setPaymentModalBill(bill);
        setData({
            source: bill.source,
            id: bill.id,
            amount: bill.balance_due,
            payment_date: new Date().toISOString().slice(0, 10),
        });
    }

    function handleRecordPaymentSubmit(e) {
        e.preventDefault();
        post("/payment-reminders/record-payment", {
            onSuccess: () => {
                setPaymentModalBill(null);
                reset();
            },
        });
    }

    return (
        <AppLayout title="Sales Reminders">
            <div className="page-full-card" style={{ gap: 14 }}>
                {/* Metric Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
                    <div className="stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
                        <div className="stat-label">Total Receivable Dues</div>
                        <div className="stat-value" style={{ color: "var(--danger)" }}>₹{toMoney(summary.total_receivable)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Pending customer payments</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid #dc2626", background: "#fef2f2" }}>
                        <div className="stat-label" style={{ color: "#991b1b" }}>Overdue Invoices</div>
                        <div className="stat-value" style={{ color: "#991b1b" }}>₹{toMoney(summary.total_overdue)}</div>
                        <div style={{ fontSize: 11, color: "#991b1b" }}>{summary.overdue_count} bills past due date</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid var(--warning)" }}>
                        <div className="stat-label">Due Today</div>
                        <div className="stat-value" style={{ color: "var(--warning)" }}>{summary.due_today_count}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Bills due today</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid var(--accent)" }}>
                        <div className="stat-label">Total Tracked Bills</div>
                        <div className="stat-value">{summary.total_bills}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sales invoices &amp; orders</div>
                    </div>
                </div>

                {/* Toolbar & Filter Tabs */}
                <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div className="search-input-wrap" style={{ width: "100%", maxWidth: 360 }}>
                            <Search size={16} />
                            <input
                                className="search-input"
                                placeholder="Search by bill #, customer, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button className="btn-icon" onClick={() => setSearch("")}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {[
                                { id: "unpaid", label: "All Pending" },
                                { id: "overdue", label: `Overdue (${summary.overdue_count})` },
                                { id: "today", label: `Due Today (${summary.due_today_count})` },
                                { id: "paid", label: "Received History" },
                                { id: "all", label: "All Bills" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`btn btn-sm ${filterTab === tab.id ? "btn-primary" : "btn-secondary"}`}
                                    onClick={() => setFilterTab(tab.id)}
                                    style={{ fontSize: 12 }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table of Bills */}
                <div className="table-wrap">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Bill #</th>
                                <th>Type</th>
                                <th>Customer</th>
                                <th>Bill Date</th>
                                {filterTab === "paid" ? (
                                    <th style={{ minWidth: 140 }}>Received Date</th>
                                ) : (
                                    <th style={{ minWidth: 150 }}>Due Date (Click to edit)</th>
                                )}
                                <th style={{ textAlign: "right" }}>Bill Amount</th>
                                <th style={{ textAlign: "right" }}>Amount Received</th>
                                <th style={{ textAlign: "right" }}>Balance Due</th>
                                <th>Due Status</th>
                                <th style={{ textAlign: "center", width: 140 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                                        <BellRing size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600 }}>No bills found in this filter.</div>
                                        <div style={{ fontSize: 12 }}>All customer payments are up to date!</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((b) => (
                                    <tr key={`${b.source}-${b.id}`}>
                                        <td style={{ fontWeight: 700, color: "var(--accent)" }}>
                                            {b.bill_number}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                                {b.source === "invoice" ? "Sales Invoice" : "Sales Order"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                                            {b.customer_phone ? (
                                                <a href={`tel:${b.customer_phone}`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
                                                    📞 {b.customer_phone}
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No phone</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 12 }}>{formatDate(b.bill_date)}</td>

                                        {/* Due Date or Received Date */}
                                        {filterTab === "paid" ? (
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>
                                                        {formatDate(b.paid_at || b.bill_date)}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                                        Received Date
                                                    </span>
                                                </div>
                                            </td>
                                        ) : (
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                                                        {formatDate(b.due_date)}
                                                    </div>
                                                    {b.is_paid ? (
                                                        <div style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>
                                                            Received on {formatDate(b.paid_at || b.bill_date)}
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <input
                                                                type="date"
                                                                className="form-input"
                                                                style={{ width: 130, padding: "2px 6px", fontSize: 11, borderRadius: 6, fontWeight: 500 }}
                                                                defaultValue={b.due_date}
                                                                onChange={(e) => handleDueDateChange(b, e.target.value)}
                                                                title="Click to change payment due date"
                                                            />
                                                            {updatingDueDateId === b.id && (
                                                                <Loader2 size={13} className="animate-spin" color="var(--accent)" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        <td style={{ textAlign: "right", fontWeight: 600 }}>₹{toMoney(b.total_amount)}</td>
                                        <td style={{ textAlign: "right", color: "var(--success)" }}>₹{toMoney(b.paid_amount)}</td>
                                        <td style={{ textAlign: "right", fontWeight: 800, color: b.is_paid ? "var(--success)" : "var(--danger)" }}>
                                            {b.is_paid ? "Received" : `₹${toMoney(b.balance_due)}`}
                                        </td>
                                        <td>
                                            {b.is_paid ? (
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                    <span style={{ fontSize: 11, background: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                                                        Received
                                                    </span>
                                                    <span style={{ fontSize: 10, color: "#047857", fontWeight: 600 }}>
                                                        {formatDate(b.paid_at || b.bill_date)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                                    {b.is_partially_paid && (
                                                        <span style={{ fontSize: 10, background: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                                            Partially Received
                                                        </span>
                                                    )}
                                                    {b.overdue_days > 0 ? (
                                                        <span style={{ fontSize: 11, background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                                                            Overdue ({b.overdue_days}d)
                                                        </span>
                                                    ) : b.overdue_days === 0 ? (
                                                        <span style={{ fontSize: 11, background: "#fffbeb", color: "#b45309", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                                                            Due Today
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 11, background: "var(--bg-elevated)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                                                            Due in {Math.abs(b.overdue_days)}d
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Grouped Actions Column */}
                                        <td style={{ textAlign: "center" }}>
                                            {!b.is_paid ? (
                                                <TableActionDropdown label="Actions">
                                                    <ActionItem
                                                        icon={CreditCard}
                                                        label="Record Payment"
                                                        onClick={() => openPaymentModal(b)}
                                                        primary
                                                    />
                                                    <ActionItem
                                                        icon={CheckCircle2}
                                                        label="Mark as Received"
                                                        onClick={() => openPaymentModal(b)}
                                                    />
                                                    <ActionItem
                                                        icon={MessageCircle}
                                                        label="WhatsApp Reminder"
                                                        onClick={() => handleSendWhatsApp(b)}
                                                    />
                                                    <ActionItem
                                                        icon={FileText}
                                                        label="Statement PDF"
                                                        onClick={() => setPreviewBill(b)}
                                                    />
                                                    <ActionItem
                                                        icon={copiedId === b.id ? Check : Copy}
                                                        label={copiedId === b.id ? "Reminder Copied!" : "Copy Reminder Text"}
                                                        onClick={() => handleCopyReminder(b)}
                                                    />
                                                </TableActionDropdown>
                                            ) : (
                                                <TableActionDropdown label="Actions">
                                                    <ActionItem
                                                        icon={FileText}
                                                        label="Receipt Statement"
                                                        onClick={() => setPreviewBill(b)}
                                                        primary
                                                    />
                                                </TableActionDropdown>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PDF Statement Preview & Download Modal */}
                {previewBill && (
                    <PrintBillReminderModal
                        bill={previewBill}
                        business={business}
                        onClose={() => setPreviewBill(null)}
                    />
                )}

                {/* Record Payment Modal */}
                {paymentModalBill && (
                    <div className="modal-overlay" onClick={() => setPaymentModalBill(null)} style={{ zIndex: 1000, padding: 12 }}>
                        <div className="modal-box" style={{ maxWidth: 420, width: "100%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Record Payment Received</div>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPaymentModalBill(null)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleRecordPaymentSubmit} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ background: "var(--bg-base)", padding: 12, borderRadius: 8, fontSize: 13 }}>
                                    <div><strong>Bill:</strong> {paymentModalBill.bill_number}</div>
                                    <div><strong>Customer:</strong> {paymentModalBill.customer_name}</div>
                                    <div><strong>Already Received:</strong> ₹{toMoney(paymentModalBill.paid_amount)}</div>
                                    <div><strong>Current Pending Balance:</strong> ₹{toMoney(paymentModalBill.balance_due)}</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Payment Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={data.payment_date || ""}
                                        onChange={(e) => setData("payment_date", e.target.value)}
                                        required
                                    />
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                        This date is saved to Received History once payment is settled.
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Amount Received Now (₹)</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            className="form-input"
                                            value={data.amount}
                                            onChange={(e) => setData("amount", e.target.value)}
                                            max={paymentModalBill.balance_due}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setData("amount", paymentModalBill.balance_due)}
                                            title="Receive full remaining balance"
                                        >
                                            Full
                                        </button>
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                                        This payment is added to the paid total and deducted from the pending balance.
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                                        Balance after this payment: ₹{toMoney(
                                            Math.max(0, paymentModalBill.balance_due - (parseFloat(data.amount) || 0))
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setPaymentModalBill(null)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={processing}>
                                        {processing ? "Saving..." : "Confirm Payment"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
