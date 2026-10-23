import { useMemo, useState, useRef, useEffect } from "react";
import { useForm, router, usePage } from "@inertiajs/react";
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
    Loader2,
    Truck,
    Building2,
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

// ── PDF Supplier Reminder / Voucher Modal Component ──────────────────────────
function PrintPurchaseReminderModal({ bill, business = {}, onClose }) {
    const printRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    const bizName = (business.name && business.name !== "Super Admin") ? business.name : "Admin";
    const bizAddress = business.address || "";
    const bizGst = business.gstin || "";
    const bizPhone = business.phone || "";
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
            pdf.save(`Purchase_Payment_Voucher_${bill.bill_number}_${(bill.supplier_name || "Supplier").replace(/\s+/g, "_")}.pdf`);
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
                        Purchase Payment Statement &bull; Ref {bill.purchase_number} &bull; Supplier Invoice #{bill.bill_number} &bull; {bill.supplier_name}
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
                                <div style={{ fontSize: 22, fontWeight: 900, color: "#4338ca", letterSpacing: "0.02em" }}>PURCHASE PAYMENT STATEMENT</div>
                                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Purchase Ref {bill.purchase_number}</div>
                                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Supplier Invoice #{bill.bill_number}</div>
                                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Order Date: {formatDate(bill.bill_date)}</div>
                                {bill.is_paid ? (
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#047857", marginTop: 2 }}>
                                        Paid Date: {formatDate(bill.paid_at || bill.bill_date)}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#b91c1c", marginTop: 2 }}>
                                        Payment Due Date: {formatDate(bill.due_date)}
                                    </div>
                                )}
                                <div style={{ marginTop: 6 }}>
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: bill.is_paid ? "#ecfdf5" : bill.overdue_days > 0 ? "#fef2f2" : "#fffbeb", color: bill.is_paid ? "#047857" : bill.overdue_days > 0 ? "#dc2626" : "#b45309" }}>
                                        {bill.is_paid ? `Full Paid to Supplier (${formatDate(bill.paid_at || bill.bill_date)})` : bill.overdue_days > 0 ? `Payable Overdue by ${bill.overdue_days} Days` : "Payment Due to Supplier"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier / Vendor Info */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0", padding: 12, background: "#f8fafc", borderRadius: 6 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Supplier / Vendor Details:</div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{bill.supplier_name}</div>
                                {bill.supplier_phone && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Phone: {bill.supplier_phone}</div>}
                                {bill.supplier_gst && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>GSTIN: {bill.supplier_gst}</div>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Payment Status:</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: bill.is_paid ? "#047857" : "#dc2626", marginTop: 2 }}>
                                    {bill.is_paid ? "FULL SETTLED" : `OUTSTANDING PAYABLE: ₹${toMoney(bill.balance_due)}`}
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
                                <div style={{ fontWeight: 700, color: "#1e1b4b", marginBottom: 6 }}>Payment &amp; Disbursement Notice:</div>
                                <div style={{ color: "#475569" }}>
                                    This statement certifies the recorded purchase order balance and payments cleared towards supplier <strong>{bill.supplier_name}</strong>.
                                </div>
                            </div>

                            <div style={{ width: 280, background: "#f1f5f9", padding: 14, borderRadius: 6, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b" }}>Total Bill Amount:</span>
                                    <span style={{ fontWeight: 600 }}>₹{toMoney(bill.total_amount)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#047857" }}>
                                    <span>Amount Paid to Vendor:</span>
                                    <span style={{ fontWeight: 600 }}>- ₹{toMoney(bill.paid_amount)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #cbd5e1", paddingTop: 8, marginTop: 4, fontWeight: 800, fontSize: 15, color: bill.is_paid ? "#047857" : "#dc2626" }}>
                                    <span>Pending Payable:</span>
                                    <span>₹{toMoney(bill.balance_due)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 20, borderTop: "1px dashed #cbd5e1", fontSize: 11, color: "#64748b" }}>
                            <div>
                                Verified By: <strong>{bizName}</strong>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                Authorized Signatory
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PurchaseRemindersIndex({ bills = [], summary = {}, business = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState("");
    const [filterTab, setFilterTab] = useState("unpaid"); // 'all' | 'unpaid' | 'overdue' | 'today' | 'paid'
    const [updatingDueDateId, setUpdatingDueDateId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [previewBill, setPreviewBill] = useState(null);
    const [paymentModalBill, setPaymentModalBill] = useState(null);
    const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
    const [sendingAllDue, setSendingAllDue] = useState(false);

    // Auto-open wa.me link if fallback was triggered
    useEffect(() => {
        if (flash?.wa_me_url) {
            window.open(flash.wa_me_url, "_blank");
        }
    }, [flash?.wa_me_url]);

    function handleSendAllDueReminders() {
        if (!confirm("Send WhatsApp payment reminders for all supplier purchase bills due within 3 days or overdue to your WhatsApp number?")) return;
        setSendingAllDue(true);
        router.post("/purchase-reminders/send-all-due", {}, {
            preserveScroll: true,
            onFinish: () => setSendingAllDue(false),
        });
    }

    const { data, setData, post, processing, reset } = useForm({
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
                const supp = (b.supplier_name || "").toLowerCase();
                const ph = (b.supplier_phone || "").toLowerCase();
                if (!num.includes(q) && !supp.includes(q) && !ph.includes(q)) return false;
            }

            return true;
        });
    }, [bills, filterTab, search]);

    // Build Reminder Message for Merchant Self-Reminder
    function buildReminderMessage(bill) {
        const bName = (business.name && business.name !== "Super Admin") ? business.name : "Admin";

        let daysText = "Due soon";
        if (bill.overdue_days > 0) {
            daysText = `${bill.overdue_days} days overdue`;
        } else if (bill.overdue_days === 0) {
            daysText = "Due Today!";
        } else {
            daysText = `${Math.abs(bill.overdue_days)} days left`;
        }

        return `🔔 *Purchase Payment Reminder*

Hello *${bName}*,
This is a reminder that payment for supplier bill *#${bill.bill_number}* (${bill.supplier_name}) is due soon.

📦 *Purchase Bill Details:*
• Supplier / Vendor: *${bill.supplier_name}*
• Supplier Invoice: *#${bill.bill_number}*
• Purchase Ref: *${bill.purchase_number}*
• Total Bill Amount: *₹${toMoney(bill.total_amount)}*
• Amount Paid: *₹${toMoney(bill.paid_amount)}*
• Balance Due to Supplier: *₹${toMoney(bill.balance_due)}*
• Payment Due Date: *${formatDate(bill.due_date)}* (${daysText})

Please ensure this payment is fulfilled to ${bill.supplier_name} on or before the due date. The purchase payment statement is attached above.`;
    }

    // Direct PDF generator helper
    async function generateAndDownloadBillPDF(bill) {
        const pdf = new jsPDF("p", "pt", "a4");
        const bName = (business.name && business.name !== "Super Admin") ? business.name : "Admin";
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
        pdf.text("PURCHASE PAYMENT STATEMENT", pageWidth - 30, 32, { align: "right" });

        // Business info below banner
        pdf.setTextColor(30, 41, 59);
        let currY = 75;
        if (business.address) {
            pdf.text(business.address, 30, currY);
            currY += 14;
        }
        if (business.gstin) {
            pdf.text(`GSTIN: ${business.gstin}`, 30, currY);
            currY += 14;
        }
        if (business.phone) {
            pdf.text(`Phone: ${business.phone}`, 30, currY);
            currY += 14;
        }

        // Bill details box
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.roundedRect(pageWidth - 230, 70, 200, 75, 4, 4, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`Purchase Ref: ${bill.purchase_number}`, pageWidth - 220, 88);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Supplier Invoice: #${bill.bill_number}`, pageWidth - 220, 104);
        pdf.setTextColor(220, 38, 38);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Due Date: ${formatDate(bill.due_date)}`, pageWidth - 220, 120);
        pdf.text(`Status: ${bill.status}`, pageWidth - 220, 136);

        // Supplier details box
        currY = Math.max(currY + 15, 160);
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(30, currY, pageWidth - 60, 45, 4, 4, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text("SUPPLIER / VENDOR DETAILS:", 40, currY + 16);
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(bill.supplier_name, 40, currY + 32);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(bill.is_paid ? 4 : 220, bill.is_paid ? 120 : 38, bill.is_paid ? 87 : 38);
        pdf.text(
            bill.is_paid ? "FULL SETTLED" : `OUTSTANDING: ₹${toMoney(bill.balance_due)}`,
            pageWidth - 40,
            currY + 26,
            { align: "right" }
        );

        currY += 60;

        // Items table header
        pdf.setFillColor(15, 23, 42);
        pdf.rect(30, currY, pageWidth - 60, 22, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("#", 38, currY + 15);
        pdf.text("Item Description", 60, currY + 15);
        pdf.text("Qty", 320, currY + 15, { align: "center" });
        pdf.text("Rate (₹)", 420, currY + 15, { align: "right" });
        pdf.text("Amount (₹)", pageWidth - 40, currY + 15, { align: "right" });

        currY += 22;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 41, 59);

        (bill.items || []).forEach((it, idx) => {
            if (currY > 740) {
                pdf.addPage();
                currY = 40;
            }
            pdf.text(String(idx + 1), 38, currY + 14);
            pdf.text(it.item_name.substring(0, 42), 60, currY + 14);
            pdf.text(`${it.quantity} ${it.unit || ""}`, 320, currY + 14, { align: "center" });
            pdf.text(toMoney(it.rate), 420, currY + 14, { align: "right" });
            pdf.text(toMoney(it.total_amount), pageWidth - 40, currY + 14, { align: "right" });

            pdf.setDrawColor(226, 232, 240);
            pdf.line(30, currY + 20, pageWidth - 30, currY + 20);
            currY += 20;
        });

        // Financial totals box
        currY += 15;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.roundedRect(pageWidth - 260, currY, 230, 85, 4, 4, "FD");

        pdf.setFont("helvetica", "normal");
        pdf.text("Total Order Amount:", pageWidth - 245, currY + 22);
        pdf.setFont("helvetica", "bold");
        pdf.text(`₹${toMoney(bill.total_amount)}`, pageWidth - 45, currY + 22, { align: "right" });

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(4, 120, 87);
        pdf.text("Amount Paid to Supplier:", pageWidth - 245, currY + 42);
        pdf.text(`- ₹${toMoney(bill.paid_amount)}`, pageWidth - 45, currY + 42, { align: "right" });

        pdf.setDrawColor(203, 213, 225);
        pdf.line(pageWidth - 250, currY + 52, pageWidth - 40, currY + 52);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(bill.is_paid ? 4 : 220, bill.is_paid ? 120 : 38, bill.is_paid ? 87 : 38);
        pdf.text("Pending Payable:", pageWidth - 245, currY + 70);
        pdf.text(`₹${toMoney(bill.balance_due)}`, pageWidth - 45, currY + 70, { align: "right" });

        // Save PDF
        pdf.save(`Purchase_Payment_Voucher_${bill.bill_number}_${(bill.supplier_name || "Supplier").replace(/\s+/g, "_")}.pdf`);
    }

    // Direct WhatsApp Sharing
    function handleSendWhatsApp(bill) {
        if (sendingWhatsAppId) return;
        setSendingWhatsAppId(bill.id);
        router.post(`/whatsapp/send-purchase-reminder/${bill.id}`, {}, {
            preserveScroll: true,
            onFinish: () => setSendingWhatsAppId(null),
        });
    }

    // Quick Change Due Date
    function handleDueDateChange(bill, newDate) {
        if (!newDate || newDate === bill.due_date) return;
        setUpdatingDueDateId(bill.id);
        router.post(
            "/purchase-reminders/update-due-date",
            {
                id: bill.id,
                due_date: newDate,
            },
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
            id: bill.id,
            amount: bill.balance_due,
            payment_date: new Date().toISOString().slice(0, 10),
        });
    }

    function handleRecordPaymentSubmit(e) {
        e.preventDefault();
        post("/purchase-reminders/record-payment", {
            onSuccess: () => {
                setPaymentModalBill(null);
                reset();
            },
        });
    }

    return (
        <AppLayout title="Purchase Reminders">
            <div className="page-full-card" style={{ gap: 14 }}>
                {/* Metric Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
                    <div className="stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
                        <div className="stat-label">Total Payable to Suppliers</div>
                        <div className="stat-value" style={{ color: "var(--danger)" }}>₹{toMoney(summary.total_payable)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Outstanding supplier dues</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid #dc2626", background: "#fef2f2" }}>
                        <div className="stat-label" style={{ color: "#991b1b" }}>Overdue Supplier Bills</div>
                        <div className="stat-value" style={{ color: "#991b1b" }}>₹{toMoney(summary.total_overdue)}</div>
                        <div style={{ fontSize: 11, color: "#991b1b" }}>{summary.overdue_count} bills past credit terms</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid var(--warning)" }}>
                        <div className="stat-label">Payable Today</div>
                        <div className="stat-value" style={{ color: "var(--warning)" }}>{summary.due_today_count}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Bills due for payout today</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid var(--accent)" }}>
                        <div className="stat-label">Total Purchase Orders</div>
                        <div className="stat-value">{summary.total_bills}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Supplier bills tracked</div>
                    </div>
                </div>

                {/* Toolbar & Filter Tabs */}
                <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1, minWidth: 280 }}>
                            <div className="search-input-wrap" style={{ width: "100%", maxWidth: 340 }}>
                                <Search size={16} />
                                <input
                                    className="search-input"
                                    placeholder="Search by PO #, supplier, phone..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button className="btn-icon" onClick={() => setSearch("")}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    background: "#25D366",
                                    borderColor: "#128C7E",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    fontSize: 12,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
                                }}
                                onClick={handleSendAllDueReminders}
                                disabled={sendingAllDue}
                                title="Send WhatsApp purchase reminders with statement PDFs to your WhatsApp for all supplier bills due within 3 days or overdue"
                            >
                                {sendingAllDue ? <Loader2 size={13} className="spin" /> : <MessageCircle size={13} />}
                                {sendingAllDue ? "Dispatching..." : "Send Due Reminders (To My WhatsApp)"}
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {[
                                { id: "unpaid", label: "All Pending" },
                                { id: "overdue", label: `Overdue (${summary.overdue_count})` },
                                { id: "today", label: `Due Today (${summary.due_today_count})` },
                                { id: "paid", label: "Paid History" },
                                { id: "all", label: "All Orders" },
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
                                <th>PO / Bill #</th>
                                <th>Supplier</th>
                                <th>Bill Date</th>
                                {filterTab === "paid" ? (
                                    <th style={{ minWidth: 140 }}>Paid Date</th>
                                ) : (
                                    <th style={{ minWidth: 150 }}>Due Date (Click to edit)</th>
                                )}
                                <th style={{ textAlign: "right" }}>Bill Amount</th>
                                <th style={{ textAlign: "right" }}>Paid</th>
                                <th style={{ textAlign: "right" }}>Balance Due</th>
                                <th>Status</th>
                                <th style={{ textAlign: "center", width: 140 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                                        <BellRing size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600 }}>No purchase bills found in this filter.</div>
                                        <div style={{ fontSize: 12 }}>All supplier payments are up to date!</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((b) => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 700, color: "var(--accent)" }}>
                                            {b.purchase_number}
                                            <div style={{ marginTop: 3, color: "var(--text-muted)", fontSize: 10, fontWeight: 500 }}>
                                                Supplier invoice: {b.bill_number}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{b.supplier_name}</div>
                                            {b.supplier_phone ? (
                                                <a href={`tel:${b.supplier_phone}`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
                                                    📞 {b.supplier_phone}
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No phone</span>
                                            )}
                                            {b.supplier_gst && (
                                                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                                                    GST: {b.supplier_gst}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 12 }}>{formatDate(b.bill_date)}</td>

                                        {/* Due Date or Paid Date */}
                                        {filterTab === "paid" ? (
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>
                                                        {formatDate(b.paid_at || b.bill_date)}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                                        Settled Date
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
                                                            Paid on {formatDate(b.paid_at || b.bill_date)}
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
                                            {b.is_paid ? "Paid" : `₹${toMoney(b.balance_due)}`}
                                        </td>
                                        <td>
                                            {b.is_paid ? (
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                    <span style={{ fontSize: 11, background: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                                                        Paid
                                                    </span>
                                                    <span style={{ fontSize: 10, color: "#047857", fontWeight: 600 }}>
                                                        {formatDate(b.paid_at || b.bill_date)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                                    {b.is_partially_paid && (
                                                        <span style={{ fontSize: 10, background: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                                            Partially Paid
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

                                        {/* Actions Column */}
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
                                                        label="Mark as Fully Paid"
                                                        onClick={() => openPaymentModal(b)}
                                                    />
                                                    <ActionItem
                                                        icon={sendingWhatsAppId === b.id ? Loader2 : MessageCircle}
                                                        label={sendingWhatsAppId === b.id ? "Sending Reminder..." : "WhatsApp Reminder (To Me)"}
                                                        onClick={() => handleSendWhatsApp(b)}
                                                        disabled={sendingWhatsAppId === b.id}
                                                    />
                                                    <ActionItem
                                                        icon={FileText}
                                                        label="Statement PDF"
                                                        onClick={() => setPreviewBill(b)}
                                                    />
                                                    <ActionItem
                                                        icon={copiedId === b.id ? Check : Copy}
                                                        label={copiedId === b.id ? "Message Copied!" : "Copy Payment Text"}
                                                        onClick={() => handleCopyReminder(b)}
                                                    />
                                                </TableActionDropdown>
                                            ) : (
                                                <TableActionDropdown label="Actions">
                                                    <ActionItem
                                                        icon={FileText}
                                                        label="Payment Voucher PDF"
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
                    <PrintPurchaseReminderModal
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
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Record Payment to Supplier</div>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPaymentModalBill(null)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleRecordPaymentSubmit} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ background: "var(--bg-base)", padding: 12, borderRadius: 8, fontSize: 13 }}>
                                    <div><strong>PO:</strong> {paymentModalBill.bill_number}</div>
                                    <div><strong>Supplier:</strong> {paymentModalBill.supplier_name}</div>
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
                                        This date is saved to Paid History once the bill is settled.
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Amount Paid Now (₹)</label>
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
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setData("amount", paymentModalBill.balance_due)}
                                            title="Pay full remaining balance"
                                        >
                                            Full
                                        </button>
                                    </div>
                                    <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Remaining Balance After Payment:</span>
                                            <span style={{
                                                fontSize: 14,
                                                fontWeight: 800,
                                                color: Math.max(0, paymentModalBill.balance_due - (parseFloat(data.amount) || 0)) <= 0 ? "#047857" : "#dc2626"
                                            }}>
                                                ₹{toMoney(Math.max(0, paymentModalBill.balance_due - (parseFloat(data.amount) || 0)))}
                                                {Math.max(0, paymentModalBill.balance_due - (parseFloat(data.amount) || 0)) <= 0 ? " (Full Paid)" : " (Partial Due)"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#4f46e5", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
                                            <MessageCircle size={13} />
                                            <span>Automatic payment voucher &amp; statement will be sent to your WhatsApp</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setPaymentModalBill(null)}
                                        style={{ flex: 1 }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={processing}
                                        style={{ flex: 1 }}
                                    >
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
