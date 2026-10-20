import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Link, router, usePage } from "@inertiajs/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AppLayout from "@/Layouts/AppLayout";
import ApplicationLogo from "@/Components/ApplicationLogo";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Printer,
    FileText,
    Receipt,
    Building2,
    User,
    Calendar,
    IndianRupee,
    CheckCircle2,
    AlertCircle,
    Clock,
    X,
    ExternalLink,
    Percent,
    Layers,
    Sparkles,
    Download,
    Loader2,
    FileUp,
    ScanLine,
    Zap,
    RotateCcw,
    CalendarRange,
    MessageSquare,
    Send,
} from "lucide-react";
import { StrongNumericInput, DimensionInput } from "@/Components/InvoiceStrongInputs";
import TableActionDropdown, { ActionItem } from "@/Components/TableActionDropdown";
import { downloadTallyVouchers } from "@/utils/tallyExport";

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

const GST_RATES = [0, 5, 12, 18, 28];
const STANDARD_UNITS = ["PCS", "KG", "M", "BOX", "SET", "LTR", "PKT", "NOS"];

function getInvoiceItemGstRate(item) {
    const savedRate = parseFloat(item.gst_rate);
    if (Number.isFinite(savedRate) && savedRate > 0) return savedRate;

    const componentRate = parseFloat(item.igst_rate || 0) +
        parseFloat(item.cgst_rate || 0) +
        parseFloat(item.sgst_rate || 0);
    if (componentRate > 0) return componentRate;

    const componentTax = parseFloat(item.igst_amount || 0) +
        parseFloat(item.cgst_amount || 0) +
        parseFloat(item.sgst_amount || 0);
    const taxableAmount = parseFloat(item.taxable_value) ||
        Math.max(0, (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) - (parseFloat(item.discount_amount) || 0));
    if (componentTax > 0 && taxableAmount > 0) {
        return (componentTax / taxableAmount) * 100;
    }

    return Number.isFinite(savedRate) ? savedRate : 0;
}

function SalesDateSummaryModal({ breakdown, onClose, onSelectDate }) {
    const totals = breakdown.reduce(
        (sum, row) => ({
            invoices: sum.invoices + row.invoiceCount,
            withoutGst: sum.withoutGst + row.salesWithoutGst,
            gst: sum.gst + row.totalGst,
            withGst: sum.withGst + row.salesWithGst,
        }),
        { invoices: 0, withoutGst: 0, gst: 0, withGst: 0 }
    );
    const money = (value) =>
        `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const exportSummaryToCSV = () => {
        const headers = ["Invoice Date", "Invoices", "Customers", "Sales from No-GST Bills (INR)", "GST Collected (INR)", "Sales from GST Bills (INR)"];
        const rows = breakdown.map((row) => [
            `"${row.date}"`,
            row.invoiceCount,
            `"${Array.from(row.customers).join(", ").replace(/"/g, '""')}"`,
            row.salesWithoutGst.toFixed(2),
            row.totalGst.toFixed(2),
            row.salesWithGst.toFixed(2),
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sales_daily_summary_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 200);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-box" style={{ maxWidth: 920, width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <CalendarRange size={18} color="var(--accent)" />
                            Date-wise Sales Summary
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                            Bill totals are grouped by GST status; each invoice is counted in only one sales column.
                        </p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                    {breakdown.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
                            No sales invoices found for the selected period.
                        </div>
                    ) : (
                        <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                            <table className="custom-table" style={{ width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Invoices</th>
                                        <th>Customers</th>
                                        <th style={{ textAlign: "right" }}>Sales from No-GST Bills</th>
                                        <th style={{ textAlign: "right" }}>GST Collected</th>
                                        <th style={{ textAlign: "right" }}>Sales from GST Bills</th>
                                        <th style={{ textAlign: "center" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {breakdown.map((row) => (
                                        <tr key={row.date}>
                                            <td style={{ fontWeight: 600 }}>
                                                {row.date !== "Unknown"
                                                    ? new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", {
                                                          weekday: "short",
                                                          day: "numeric",
                                                          month: "short",
                                                          year: "numeric",
                                                      })
                                                    : "Unknown Date"}
                                            </td>
                                            <td>{row.invoiceCount}</td>
                                            <td style={{ maxWidth: 190, fontSize: 11, color: "var(--text-secondary)" }}>
                                                {Array.from(row.customers).slice(0, 3).join(", ")}
                                                {row.customers.size > 3 ? ` +${row.customers.size - 3} more` : ""}
                                            </td>
                                            <td style={{ textAlign: "right" }}>{money(row.salesWithoutGst)}</td>
                                            <td style={{ textAlign: "right", color: "#8b5cf6" }}>{money(row.totalGst)}</td>
                                            <td style={{ textAlign: "right", fontWeight: 700 }}>{money(row.salesWithGst)}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ fontSize: 11, padding: "2px 8px" }}
                                                    onClick={() => onSelectDate(row.date)}
                                                >
                                                    View Invoices
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: "var(--bg-elevated)", fontWeight: 700 }}>
                                        <td>Total ({breakdown.length} days)</td>
                                        <td>{totals.invoices}</td>
                                        <td>—</td>
                                        <td style={{ textAlign: "right" }}>{money(totals.withoutGst)}</td>
                                        <td style={{ textAlign: "right", color: "#8b5cf6" }}>{money(totals.gst)}</td>
                                        <td style={{ textAlign: "right", color: "var(--accent)" }}>{money(totals.withGst)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button type="button" className="btn btn-secondary" onClick={exportSummaryToCSV}>
                        <Download size={14} /> Export Date Summary CSV
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function InvoicesIndex({
    invoices = [],
    businessProfile = {},
    inventoryItems = [],
    customers = [],
    nextInvoiceNumber = "",
    scanUsage: initialScanUsage = null,
}) {
    const { auth, switchedAdmin } = usePage().props;
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [deleteInvoice, setDeleteInvoice] = useState(null);
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [showDateSummaryModal, setShowDateSummaryModal] = useState(false);
    const [toast, setToast] = useState(null);

    // AI Scan Quota state
    const [scanUsage, setScanUsage] = useState(
        initialScanUsage || {
            used: 0,
            limit: 100,
            remaining: 100,
            isSuperAdmin: Boolean(auth?.user?.role === "super_admin"),
            hasReachedLimit: false,
            monthName: "",
        }
    );

    useEffect(() => {
        if (initialScanUsage) {
            setScanUsage(initialScanUsage);
        }
    }, [initialScanUsage]);

    // Vama Lab AI Auto-fill state
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgressPercent, setOcrProgressPercent] = useState(0);
    const [ocrStatusText, setOcrStatusText] = useState("");
    const [initialAutoData, setInitialAutoData] = useState(null);
    const mainFileInputRef = useRef(null);

    const handleUploadBillClick = () => {
        if (!scanUsage?.isSuperAdmin && scanUsage?.hasReachedLimit) {
            alert(
                `⚠️ Monthly AI Scan Limit Reached!\n\nYou have used all ${scanUsage.limit} scans for this month (${scanUsage.monthName}).\n\nSuperAdmin has unlimited scanning capacity. You can still generate invoices manually using the "Generate Invoice" button, or contact SuperAdmin to upgrade quota.`
            );
            showToast(`AI Scan limit of ${scanUsage.limit} reached for ${scanUsage.monthName}.`, "error");
            return;
        }
        mainFileInputRef.current?.click();
    };

    const optimizeImageForOcr = async (file) => {
        if (!file || !file.type.startsWith("image/")) return file;
        if (file.size <= 600 * 1024) return file;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const maxDim = 1800;
                    let width = img.width;
                    let height = img.height;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob && blob.size < file.size) {
                                const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                    type: "image/jpeg",
                                    lastModified: Date.now(),
                                });
                                resolve(optimizedFile);
                            } else {
                                resolve(file);
                            }
                        },
                        "image/jpeg",
                        0.85
                    );
                };
                img.onerror = () => resolve(file);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    };

    const processFileForScan = async (file) => {
        if (!file) return;

        if (!scanUsage?.isSuperAdmin && scanUsage?.hasReachedLimit) {
            alert(
                `⚠️ Monthly AI Scan Limit Reached!\n\nYou have reached the limit of ${scanUsage.limit} scans for ${scanUsage.monthName}.\n\nSuperAdmin has unlimited scanning capacity. You can still generate invoices manually using "Generate Invoice", or contact SuperAdmin.`
            );
            showToast(`AI Scan limit of ${scanUsage.limit} reached for ${scanUsage.monthName}.`, "error");
            return;
        }

        if (file.type.startsWith("image/") || file.type.includes("pdf")) {
            setOcrLoading(true);
            setOcrProgressPercent(15);
            setOcrStatusText("Preparing invoice for high-speed scan...");

            let currentPct = 15;
            const timer = setInterval(() => {
                if (currentPct < 90) {
                    const step = currentPct < 50 ? 10 : (currentPct < 75 ? 6 : 3);
                    currentPct = Math.min(90, currentPct + step);
                    setOcrProgressPercent(currentPct);

                    if (currentPct >= 70) {
                        setOcrStatusText("Extracting items, GST taxes & buyer details...");
                    } else if (currentPct >= 35) {
                        setOcrStatusText("Analyzing invoice layout with Vama Lab AI...");
                    }
                }
            }, 120);

            try {
                const fileToUpload = await optimizeImageForOcr(file);

                const formData = new FormData();
                formData.append("bill_file", fileToUpload);

                const response = await axios.post("/invoices/scan", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                clearInterval(timer);
                setOcrProgressPercent(100);
                setOcrStatusText("Invoice extracted successfully!");

                if (response.data?.success && response.data?.data) {
                    if (response.data.scan_usage) {
                        setScanUsage(response.data.scan_usage);
                    }

                    const parsed = response.data.data;
                    setInitialAutoData(parsed);
                    setEditingInvoice(null);
                    setModalOpen(true);
                    showToast("Sales invoice scanned successfully! Verify details below.");
                } else {
                    throw new Error(response.data?.message || "Failed to scan document");
                }
            } catch (err) {
                clearInterval(timer);
                console.error("AI Scan Failed:", err);
                if (err.response?.status === 429) {
                    if (err.response.data?.scan_usage) {
                        setScanUsage(err.response.data.scan_usage);
                    }
                    const limitMsg = err.response.data?.message || "Monthly AI scan limit reached (100 scans).";
                    alert(`⚠️ Scan Limit Reached:\n\n${limitMsg}`);
                    showToast(limitMsg, "error");
                    return;
                }
                const errMsg = err.response?.data?.message || err.message || "Could not analyze bill.";
                showToast(`AI Scan Notice: ${errMsg}`, "error");
                setInitialAutoData(null);
                setModalOpen(true);
            } finally {
                setOcrLoading(false);
                setOcrProgressPercent(0);
                setOcrStatusText("");
            }
        } else {
            setInitialAutoData(null);
            setModalOpen(true);
        }
    };

    const handleMainFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFileForScan(e.target.files[0]);
            e.target.value = "";
        }
    };

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Date-wise filtering state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [datePreset, setDatePreset] = useState("All");

    const getLocalDateString = (d = new Date()) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const applyDatePreset = (preset) => {
        setDatePreset(preset);
        if (preset === "All") {
            setStartDate("");
            setEndDate("");
        } else if (preset === "Today") {
            const today = getLocalDateString(new Date());
            setStartDate(today);
            setEndDate(today);
        } else if (preset === "Yesterday") {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            const yStr = getLocalDateString(y);
            setStartDate(yStr);
            setEndDate(yStr);
        } else if (preset === "ThisWeek") {
            const past7 = new Date();
            past7.setDate(past7.getDate() - 6);
            setStartDate(getLocalDateString(past7));
            setEndDate(getLocalDateString(new Date()));
        } else if (preset === "ThisMonth") {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            setStartDate(getLocalDateString(firstDay));
            setEndDate(getLocalDateString(now));
        }
    };

    // Invoices filtered by date range
    const dateFilteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const invDate = inv.invoice_date ? inv.invoice_date.slice(0, 10) : "";
            if (startDate && invDate < startDate) return false;
            if (endDate && invDate > endDate) return false;
            return true;
        });
    }, [invoices, startDate, endDate]);

    // Filtered Invoices (date + search + status)
    const filteredInvoices = useMemo(() => {
        return dateFilteredInvoices.filter((inv) => {
            const matchesSearch =
                (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
                (inv.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
                (inv.customer_gst_number || "").toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [dateFilteredInvoices, search, statusFilter]);

    // KPI Metrics (reflects date filtering)
    const metrics = useMemo(() => {
        const targetList = (startDate || endDate) ? dateFilteredInvoices : invoices;
        const totalCount = targetList.length;
        const gstInvoices = targetList.filter((invoice) => parseFloat(invoice.total_tax || 0) > 0);
        const nonGstInvoices = targetList.filter((invoice) => parseFloat(invoice.total_tax || 0) <= 0);
        const totalSales = gstInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount || 0), 0);
        const totalSalesWithoutGst = nonGstInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount || 0), 0);
        const totalTax = targetList.reduce((sum, i) => sum + parseFloat(i.total_tax || 0), 0);
        const paidCount = targetList.filter((i) => i.status === "Paid").length;
        const partialPaidCount = targetList.filter((i) => i.status === "Partially Paid").length;
        const unpaidCount = targetList.filter((i) => i.status === "Unpaid").length;
        return {
            totalCount,
            totalSales,
            totalSalesWithoutGst,
            totalTax,
            paidCount,
            partialPaidCount,
            unpaidCount,
            isDateFiltered: Boolean(startDate || endDate),
        };
    }, [invoices, dateFilteredInvoices, startDate, endDate]);

    const dateBreakdown = useMemo(() => {
        const groups = {};
        dateFilteredInvoices.forEach((invoice) => {
            const date = invoice.invoice_date ? invoice.invoice_date.slice(0, 10) : "Unknown";
            if (!groups[date]) {
                groups[date] = {
                    date,
                    invoiceCount: 0,
                    salesWithoutGst: 0,
                    totalGst: 0,
                    salesWithGst: 0,
                    customers: new Set(),
                };
            }
            groups[date].invoiceCount += 1;
            const invoiceTotal = parseFloat(invoice.total_amount || 0);
            const invoiceTax = parseFloat(invoice.total_tax || 0);
            if (invoiceTax > 0) {
                groups[date].salesWithGst += invoiceTotal;
                groups[date].totalGst += invoiceTax;
            } else {
                groups[date].salesWithoutGst += invoiceTotal;
            }
            if (invoice.customer_name) groups[date].customers.add(invoice.customer_name);
        });

        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [dateFilteredInvoices]);

    const exportToTally = () => {
        if (!filteredInvoices || filteredInvoices.length === 0) {
            showToast("No sales invoices available to export to Tally.", "error");
            return;
        }

        try {
            downloadTallyVouchers("sales", filteredInvoices, "Tally_Sales_Vouchers", { startDate, endDate });
            showToast(`Downloaded a readable sales spreadsheet for ${filteredInvoices.length} invoices.`);
        } catch (error) {
            showToast(error.message || "Unable to create the sales spreadsheet.", "error");
        }
    };

    function handleDelete() {
        if (!deleteInvoice) return;
        router.delete(`/invoices/${deleteInvoice.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteInvoice(null);
                showToast("Invoice deleted successfully.");
            },
            onError: () => showToast("Failed to delete invoice.", "error"),
        });
    }

    return (
        <AppLayout title="Sales Invoices">
            {auth?.user?.role === "super_admin" && !switchedAdmin && (
                <div style={{ padding: "12px 16px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "gap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4338ca" }}>
                        <span>🛡️</span>
                        <span>You are currently in <strong>Super Admin Root View</strong>. Use the store dropdown in the top bar to select an admin store and view its sales invoices.</span>
                    </div>
                </div>
            )}
            {/* Toast Notice */}
            {toast && (
                <div className={`toast-notice ${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertCircle size={18} color="var(--danger)" />}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{toast.message}</span>
                </div>
            )}

            {/* AI OCR Loading Dialog */}
            {ocrLoading && (
                <div className="modal-overlay" style={{ zIndex: 99999 }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 18,
                        background: "var(--bg-surface, #ffffff)",
                        padding: "36px 32px",
                        borderRadius: 16,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                        maxWidth: 420,
                        width: "90%",
                        textAlign: "center"
                    }}>
                        <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 14px",
                            borderRadius: 20,
                            background: "rgba(99, 102, 241, 0.1)",
                            color: "#6366f1",
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase"
                        }}>
                            <ScanLine size={16} /> Vama Lab AI
                        </div>

                        <div style={{ position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div className="loading-ring" style={{ width: 84, height: 84, borderWidth: 4 }}></div>
                            <div style={{
                                position: "absolute",
                                fontWeight: 800,
                                fontSize: 18,
                                color: "var(--text-primary)"
                            }}>
                                {ocrProgressPercent}%
                            </div>
                        </div>

                        <div style={{ width: "100%" }}>
                            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
                                Scanning Invoice with Vama Lab AI
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)", minHeight: 20 }}>
                                {ocrStatusText}
                            </div>

                            <div style={{
                                width: "100%",
                                height: 8,
                                background: "var(--bg-elevated, #f1f5f9)",
                                borderRadius: 999,
                                overflow: "hidden",
                                marginTop: 14
                            }}>
                                <div style={{
                                    width: `${ocrProgressPercent}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #6366f1, #3b82f6)",
                                    borderRadius: 999,
                                    transition: "width 0.2s ease-out"
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Metrics */}
            <div className="purchase-stats-grid">
                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--accent)" }}>
                        <IndianRupee size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Total Sales <span style={{ textTransform: "none", fontSize: 10, color: "var(--text-muted)" }}>(With GST)</span>
                            {metrics.isDateFiltered && <span style={{ textTransform: "none", color: "var(--accent)" }}> (Period)</span>}
                        </span>
                        <span className="purchase-stat-num">
                            ₹{metrics.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(5, 150, 105, 0.1)", color: "var(--success)" }}>
                        <IndianRupee size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Total Sales <span style={{ textTransform: "none", fontSize: 10, color: "var(--text-muted)" }}>(Without GST)</span>
                            {metrics.isDateFiltered && <span style={{ textTransform: "none", color: "var(--accent)" }}> (Period)</span>}
                        </span>
                        <span className="purchase-stat-num">
                            ₹{metrics.totalSalesWithoutGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                        <Percent size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Total GST Tax</span>
                        <span className="purchase-stat-num">
                            ₹{metrics.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(2, 132, 199, 0.1)", color: "var(--info)" }}>
                        <Receipt size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Total Invoices</span>
                        <span className="purchase-stat-num">{metrics.totalCount}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(5, 150, 105, 0.1)", color: "var(--success)" }}>
                        <CheckCircle2 size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Received Bills</span>
                        <span className="purchase-stat-num">{metrics.paidCount}</span>
                    </div>
                </div>

                <div 
                    className="purchase-stat-compact" 
                    style={{ cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
                    onClick={() => setStatusFilter(statusFilter === "Partially Paid" ? "All" : "Partially Paid")}
                    title="Click to filter Partially Received invoices"
                >
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#d97706" }}>
                        <Clock size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Partially Paid
                            {statusFilter === "Partially Paid" && <span style={{ color: "#d97706", fontWeight: 700 }}> (Filtered)</span>}
                        </span>
                        <span className="purchase-stat-num" style={{ color: "#d97706" }}>{metrics.partialPaidCount}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
                        <AlertCircle size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Unpaid / Due</span>
                        <span className="purchase-stat-num">{metrics.unpaidCount}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="card page-full-card">
                {/* Search & Actions Toolbar */}
                <div className="table-toolbar">
                    <div className="toolbar-left" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div className="search-input-wrap">
                            <Search size={15} />
                            <input
                                className="form-input search-input"
                                placeholder="Search by Invoice #, Customer or GSTIN..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status Filter buttons */}
                        <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", padding: 3, borderRadius: 8 }}>
                            {["All", "Paid", "Unpaid", "Partially Paid"].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: "4px 10px",
                                        borderRadius: 6,
                                        border: "none",
                                        background: statusFilter === st ? "var(--bg-surface)" : "transparent",
                                        color: statusFilter === st ? "var(--text-primary)" : "var(--text-muted)",
                                        boxShadow: statusFilter === st ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    {st === "Paid" ? "Received" : st === "Partially Paid" ? "Partially Received" : st}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {/* Live AI Scan Counter Pill */}
                        {scanUsage.isSuperAdmin ? (
                            <div
                                title="SuperAdmin has unlimited AI invoice scanning power"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    background: "rgba(99, 102, 241, 0.1)",
                                    color: "#6366f1",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: "1px solid rgba(99, 102, 241, 0.25)",
                                }}
                            >
                                <Sparkles size={13} />
                                <span>AI Scans: <strong>Unlimited</strong> (SuperAdmin)</span>
                            </div>
                        ) : (
                            <div
                                title={`Monthly quota: ${scanUsage.limit} scans. Used: ${scanUsage.used}. Left: ${scanUsage.remaining}.`}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    background: scanUsage.hasReachedLimit ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                                    color: scanUsage.hasReachedLimit ? "#ef4444" : "#059669",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: scanUsage.hasReachedLimit ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.25)",
                                }}
                            >
                                <ScanLine size={13} />
                                <span>
                                    AI Scans: <strong>{scanUsage.used}/{scanUsage.limit}</strong> {scanUsage.hasReachedLimit ? "(Quota Full)" : `(${scanUsage.remaining} left)`}
                                </span>
                            </div>
                        )}

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={exportToTally}
                            title="Download a readable, itemized sales spreadsheet"
                        >
                            <Download size={15} /> Export Tally (CSV)
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleUploadBillClick}
                            title={!scanUsage.isSuperAdmin && scanUsage.hasReachedLimit ? `Scan limit reached (${scanUsage.limit}/${scanUsage.limit})` : "Upload invoice document to scan with AI"}
                            style={!scanUsage.isSuperAdmin && scanUsage.hasReachedLimit ? { borderColor: "rgba(239, 68, 68, 0.4)", color: "var(--danger)" } : {}}
                        >
                            <FileUp size={16} /> Upload Invoice
                        </button>
                        <input
                            type="file"
                            style={{ display: "none" }}
                            ref={mainFileInputRef}
                            onChange={handleMainFileUpload}
                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setInitialAutoData(null);
                                setEditingInvoice(null);
                                setModalOpen(true);
                            }}
                        >
                            <Plus size={16} /> Generate Invoice (GST Bill)
                        </button>
                    </div>
                </div>

                {/* Date-wise Filter & Presets Bar */}
                <div className="purchase-date-filter-bar">
                    <div className="date-filter-left">
                        <span className="date-filter-label">
                            <Calendar size={13} /> Date:
                        </span>
                        <div className="date-presets-wrap">
                            <button
                                type="button"
                                className={`date-preset-btn ${datePreset === "All" ? "active" : ""}`}
                                onClick={() => applyDatePreset("All")}
                            >
                                All Time
                            </button>
                            <button
                                type="button"
                                className={`date-preset-btn ${datePreset === "Today" ? "active" : ""}`}
                                onClick={() => applyDatePreset("Today")}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                className={`date-preset-btn ${datePreset === "Yesterday" ? "active" : ""}`}
                                onClick={() => applyDatePreset("Yesterday")}
                            >
                                Yesterday
                            </button>
                            <button
                                type="button"
                                className={`date-preset-btn ${datePreset === "ThisWeek" ? "active" : ""}`}
                                onClick={() => applyDatePreset("ThisWeek")}
                            >
                                Last 7 Days
                            </button>
                            <button
                                type="button"
                                className={`date-preset-btn ${datePreset === "ThisMonth" ? "active" : ""}`}
                                onClick={() => applyDatePreset("ThisMonth")}
                            >
                                This Month
                            </button>
                        </div>
                    </div>

                    <div className="date-filter-right">
                        <div className="date-range-inputs">
                            <div className="date-input-group">
                                <span className="date-input-label">From:</span>
                                <input
                                    type="date"
                                    className="form-input date-picker-input"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setDatePreset("Custom");
                                    }}
                                />
                            </div>
                            <div className="date-input-group">
                                <span className="date-input-label">To:</span>
                                <input
                                    type="date"
                                    className="form-input date-picker-input"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setDatePreset("Custom");
                                    }}
                                />
                            </div>
                            {(startDate || endDate) && (
                                <button
                                    type="button"
                                    className="btn btn-secondary date-reset-btn"
                                    onClick={() => applyDatePreset("All")}
                                    title="Reset date filter"
                                >
                                    <RotateCcw size={12} /> Reset
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary date-report-btn"
                            onClick={() => setShowDateSummaryModal(true)}
                            title="Open date-wise sales summary"
                        >
                            <CalendarRange size={13} /> Date-wise Summary
                        </button>
                    </div>
                </div>

                {/* Date Filter Indicator Bar if active */}
                {(startDate || endDate) && (
                    <div className="date-filter-indicator-bar">
                        <div className="date-filter-indicator-text">
                            <Calendar size={13} />
                            <span>
                                Checking Sales Invoices for:{" "}
                                <strong>
                                    {startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Start"}
                                    {" — "}
                                    {endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}
                                </strong>
                                {" • "}
                                <span>{filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"}</span>
                                {" • "}
                                <span>Period Total: <strong>₹{metrics.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => applyDatePreset("All")}
                            style={{ fontSize: 11, padding: "2px 8px", color: "#1e40af" }}
                            title="Clear date filter"
                        >
                            <RotateCcw size={11} /> Clear Filter
                        </button>
                    </div>
                )}

                {/* Invoices Table */}
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 50 }}>#</th>
                                <th>Invoice No</th>
                                <th>Date</th>
                                <th>Customer Name</th>
                                <th>Customer GSTIN</th>
                                <th>Items</th>
                                <th>Taxable Amt</th>
                                <th>GST Tax</th>
                                <th>Grand Total</th>
                                <th>Status</th>
                                <th style={{ width: 140, textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={11} style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                                        <Receipt size={40} style={{ opacity: 0.3, display: "block", margin: "0 auto 10px" }} />
                                        No invoices found. Click <strong>Generate Invoice</strong> to create your first GST bill.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv, idx) => (
                                    <tr key={inv.id}>
                                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                                        <td>
                                            <strong style={{ color: "var(--text-primary)" }}>{inv.invoice_number}</strong>
                                        </td>
                                        <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                            {formatDate(inv.invoice_date)}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
                                            {inv.customer_address && (
                                                <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {inv.customer_address}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {inv.customer_gst_number ? (
                                                <code style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                                                    {inv.customer_gst_number}
                                                </code>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Unregistered</span>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                                {inv.items?.length || 0} item{inv.items?.length === 1 ? "" : "s"}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13 }}>
                                                ₹{parseFloat(inv.taxable_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13, color: "#8b5cf6", fontWeight: 600 }}>
                                                ₹{parseFloat(inv.total_tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ fontSize: 14, color: "var(--text-primary)" }}>
                                                ₹{parseFloat(inv.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    inv.status === "Paid"
                                                        ? "badge-success"
                                                        : inv.status === "Partially Paid"
                                                        ? "badge-warning"
                                                        : "badge-danger"
                                                }`}
                                            >
                                                {inv.status === "Paid" ? "Received" : inv.status === "Partially Paid" ? "Partially Received" : inv.status}
                                            </span>
                                            {inv.status === "Partially Paid" && inv.paid_amount > 0 && (
                                                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                                                    Received: ₹{parseFloat(inv.paid_amount).toFixed(2)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <TableActionDropdown label="Actions">
                                                <ActionItem
                                                    icon={Printer}
                                                    label="Print GST Bill"
                                                    onClick={() => setPreviewInvoice(inv)}
                                                    primary
                                                />
                                                <ActionItem
                                                    icon={MessageSquare}
                                                    label="Send on WhatsApp"
                                                    onClick={() => {
                                                        router.post(`/whatsapp/send-invoice/${inv.id}`, {}, { preserveScroll: true });
                                                    }}
                                                />
                                                {inv.status !== "Paid" && (
                                                    <ActionItem
                                                        icon={Send}
                                                        label="Send WhatsApp Reminder"
                                                        onClick={() => {
                                                            router.post(`/whatsapp/send-reminder/${inv.id}`, {}, { preserveScroll: true });
                                                        }}
                                                    />
                                                )}
                                                <ActionItem
                                                    icon={Edit2}
                                                    label="Edit Invoice"
                                                    onClick={() => {
                                                        setEditingInvoice(inv);
                                                        setModalOpen(true);
                                                    }}
                                                />
                                                <ActionItem
                                                    icon={Trash2}
                                                    label="Delete Invoice"
                                                    onClick={() => setDeleteInvoice(inv)}
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
            </div>

            {/* In-Page Invoice Print & Preview Modal */}
            {previewInvoice && (
                <InvoicePrintPreviewModal
                    invoice={previewInvoice}
                    businessProfile={businessProfile}
                    onClose={() => setPreviewInvoice(null)}
                />
            )}

            {/* Invoice Creation / Edit Modal */}
            {modalOpen && (
                <InvoiceFormModal
                    key={editingInvoice ? `invoice-edit-${editingInvoice.id}` : (initialAutoData ? `invoice-auto-${initialAutoData.invoice_number || 'new'}` : 'invoice-new')}
                    invoice={editingInvoice}
                    initialAutoData={initialAutoData}
                    defaultBusinessProfile={businessProfile}
                    inventoryItems={inventoryItems}
                    customers={customers}
                    nextInvoiceNumber={nextInvoiceNumber}
                    onClose={() => {
                        setInitialAutoData(null);
                        setEditingInvoice(null);
                        setModalOpen(false);
                    }}
                    onSuccess={(msg) => {
                        setInitialAutoData(null);
                        setEditingInvoice(null);
                        setModalOpen(false);
                        showToast(msg);
                    }}
                />
            )}

            {/* Confirm Delete Modal */}
            {deleteInvoice && (
                <div className="modal-overlay" onClick={() => setDeleteInvoice(null)}>
                    <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Delete Tax Invoice</span>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteInvoice(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                                Are you sure you want to permanently delete Invoice <strong>#{deleteInvoice.invoice_number}</strong> for <strong>{deleteInvoice.customer_name}</strong>?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteInvoice(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showDateSummaryModal && (
                <SalesDateSummaryModal
                    breakdown={dateBreakdown}
                    onClose={() => setShowDateSummaryModal(false)}
                    onSelectDate={(date) => {
                        setShowDateSummaryModal(false);
                        if (date !== "Unknown") {
                            setStartDate(date);
                            setEndDate(date);
                            setDatePreset("Custom");
                        }
                    }}
                />
            )}
        </AppLayout>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Debounced Inventory Autocomplete Input (Portal-based floating dropdown)
// ─────────────────────────────────────────────────────────────────────────────
function InventoryAutocompleteInput({
    value = "",
    onChange,
    onSelect,
    initialItems = [],
    placeholder = "Type item name...",
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

    // Sync input value when parent prop changes
    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    // Calculate fixed viewport coordinates for portal dropdown
    const updatePosition = useCallback(() => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 250 && rect.top > 250;

        setDropdownPosition({
            top: openUpwards ? Math.max(10, rect.top - 245) : rect.bottom + 4,
            left: Math.max(10, rect.left),
            width: Math.max(rect.width, 340),
        });
    }, []);

    // Update position on window/modal scroll and resize
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

    // Close on click outside
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

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Debounced search (300ms pause prevents overloading the server)
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
        }, 300); // 300ms debounce
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
        setInputValue(item.item);
        setIsOpen(false);
        onSelect(item);
    };

    // Determine items to display:
    // If server results have returned, use them.
    // Otherwise filter from initialItems for immediate snappy feedback.
    const displayItems = useMemo(() => {
        if (serverResults !== null) {
            return serverResults;
        }
        if (!inputValue || !inputValue.trim()) {
            return initialItems.slice(0, 10);
        }
        const q = inputValue.toLowerCase().trim();
        return initialItems
            .filter((it) => it.item && it.item.toLowerCase().includes(q))
            .slice(0, 10);
    }, [serverResults, initialItems, inputValue]);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                    ref={inputRef}
                    className="form-input"
                    style={{ padding: "7px 9px", fontSize: 13, width: "100%" }}
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
                        background: "var(--bg-elevated)",
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
                            {loading ? "Searching inventory..." : "No matching inventory found (You can type custom item name)"}
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
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.item}</span>
                                    {inv.code && (
                                        <span style={{ fontSize: 10.5, color: "var(--text-muted)", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>
                                            {inv.code}
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
                                            {inv.qty} {inv.unit || "PCS"}
                                        </strong>
                                    </span>
                                    <span>
                                        Rate:{" "}
                                        <strong style={{ color: "var(--accent)" }}>
                                            ₹{parseFloat(inv.selling_price || 0).toFixed(2)}
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

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Form Modal (Generation & Editing)
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceFormModal({
    invoice,
    initialAutoData = null,
    defaultBusinessProfile = {},
    inventoryItems = [],
    customers = [],
    nextInvoiceNumber = "",
    onClose,
    onSuccess,
}) {
    const { auth } = usePage().props;
    const isEdit = Boolean(invoice);

    // Seller State - strictly defaults to logged in merchant's username
    const currentUserName = auth?.user?.name || "";
    const [sellerName, setSellerName] = useState(
        invoice?.seller_name || currentUserName || defaultBusinessProfile?.business_name || ""
    );
    const [sellerAddress, setSellerAddress] = useState(invoice?.seller_address || defaultBusinessProfile?.address || "");
    const [sellerGstNumber, setSellerGstNumber] = useState(invoice?.seller_gst_number || defaultBusinessProfile?.gst_number || "");
    const [sellerPhone, setSellerPhone] = useState(invoice?.seller_phone || defaultBusinessProfile?.phone || "");
    const [sellerState, setSellerState] = useState(invoice?.seller_state || defaultBusinessProfile?.state || "");

    // Customer State & Suggestions
    const [customerName, setCustomerName] = useState(
        invoice?.customer_name || initialAutoData?.customer_name || initialAutoData?.supplier_name || ""
    );
    const [customerAddress, setCustomerAddress] = useState(
        invoice?.customer_address || initialAutoData?.customer_address || ""
    );
    const [customerGstNumber, setCustomerGstNumber] = useState(
        invoice?.customer_gst_number || initialAutoData?.customer_gst || initialAutoData?.gst_number || ""
    );
    const [customerPhone, setCustomerPhone] = useState(invoice?.customer_phone || "");
    const [customerState, setCustomerState] = useState(invoice?.customer_state || "");
    const [placeOfSupply, setPlaceOfSupply] = useState(invoice?.place_of_supply || "");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);

    // Filter saved customers matching name, phone, or GST
    const filteredCustomers = useMemo(() => {
        if (!customerName || !customerName.trim()) return customers.slice(0, 8);
        const q = customerName.toLowerCase().trim();
        return customers.filter((c) =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.gst_number && c.gst_number.toLowerCase().includes(q))
        ).slice(0, 8);
    }, [customers, customerName]);

    const handleSelectCustomer = (cust) => {
        setCustomerName(cust.name || "");
        setCustomerAddress(cust.address || "");
        setCustomerGstNumber(cust.gst_number || "");
        setCustomerPhone(cust.phone || "");
        if (cust.state) {
            setCustomerState(cust.state);
            setPlaceOfSupply(cust.state);
        }
        setShowCustomerDropdown(false);
    };

    // Invoice Meta
    const [invoiceNumber, setInvoiceNumber] = useState(
        invoice?.invoice_number || initialAutoData?.invoice_number || initialAutoData?.po_number || nextInvoiceNumber || "INV-001"
    );
    const [invoiceDate, setInvoiceDate] = useState(
        invoice?.invoice_date
            ? invoice.invoice_date.slice(0, 10)
            : (initialAutoData?.order_date || initialAutoData?.invoice_date || new Date().toISOString().split("T")[0])
    );
    const [dueDate, setDueDate] = useState(invoice?.due_date ? invoice.due_date.slice(0, 10) : "");
    const [status, setStatus] = useState(invoice?.status || "Paid");
    const [paidAmount, setPaidAmount] = useState(() => {
        if (invoice?.status === "Paid") {
            return invoice?.total_amount ? String(invoice.total_amount) : "";
        }
        if (invoice?.paid_amount !== undefined && invoice?.paid_amount !== null && invoice.paid_amount !== "") {
            return String(invoice.paid_amount);
        }
        return "";
    });
    const [taxType, setTaxType] = useState(() => {
        if (invoice?.tax_type) return invoice.tax_type;
        if (initialAutoData && parseFloat(initialAutoData.igst) > 0) return "inter_state";
        return "intra_state";
    });
    const [notes, setNotes] = useState(invoice?.notes || "");
    const [terms, setTerms] = useState(
        invoice?.terms || defaultBusinessProfile?.terms_and_conditions || "1. Goods once sold will not be returned.\n2. Subject to local jurisdiction."
    );
    const [grossDiscount, setGrossDiscount] = useState(() => {
        if (invoice?.gross_discount !== undefined && invoice?.gross_discount !== null && parseFloat(invoice.gross_discount) > 0) {
            return invoice.gross_discount;
        }
        if (initialAutoData?.gross_discount !== undefined && initialAutoData?.gross_discount !== null && parseFloat(initialAutoData.gross_discount) > 0) {
            return initialAutoData.gross_discount;
        }
        return "";
    });

    // Helper to get original item quantity from this invoice (for accurate edit stock calculation)
    const getOriginalItemQty = useCallback((invId, itemName) => {
        if (!invoice?.items || invoice.items.length === 0) return 0;
        const match = invoice.items.find((it) => {
            if (invId && it.inventory_id && Number(it.inventory_id) === Number(invId)) return true;
            if (itemName && it.item_name && it.item_name.toLowerCase().trim() === itemName.toLowerCase().trim()) return true;
            return false;
        });
        return match ? (parseFloat(match.quantity) || 0) : 0;
    }, [invoice]);

    const selectInventoryItem = (idx, inv) => {
        setItems((prev) => {
            const updated = [...prev];
            const currentQty = parseFloat(updated[idx].quantity) || 1;
            const rawStock = inv.qty !== undefined && inv.qty !== null ? parseFloat(inv.qty) : null;
            const unit = inv.unit || updated[idx].unit || "PCS";
            const origQty = getOriginalItemQty(inv.id, inv.item);
            const effectiveStock = rawStock !== null ? rawStock + origQty : null;

            let stockErr = null;
            if (effectiveStock !== null && currentQty > effectiveStock) {
                stockErr = `Only ${effectiveStock} ${unit} available (${rawStock} in inventory${origQty > 0 ? ` + ${origQty} in this invoice` : ""})`;
            }

            updated[idx] = {
                ...updated[idx],
                inventory_id: inv.id,
                item_name: inv.item,
                rate: inv.selling_price || updated[idx].rate || "",
                unit: unit,
                available_stock: rawStock,
                original_quantity: origQty,
                effective_stock: effectiveStock,
                stock_error: stockErr,
            };
            return updated;
        });
    };

    // Line Items State
    const [items, setItems] = useState(() => {
        if (invoice?.items && invoice.items.length > 0) {
            return invoice.items.map((it) => {
                const matchingInv = inventoryItems.find(
                    (inv) => inv.id === it.inventory_id || (inv.item && inv.item.toLowerCase() === (it.item_name || "").toLowerCase())
                );
                const rawStock = matchingInv ? parseFloat(matchingInv.qty ?? 0) : null;
                const origQty = parseFloat(it.quantity) || 0;
                // Since this invoice already has origQty deducted from the inventory,
                // the effective available stock limit for this invoice is rawStock + origQty.
                const effectiveStock = rawStock !== null ? rawStock + origQty : null;
                const unit = it.unit || (matchingInv ? matchingInv.unit : "PCS");
                const hasStockError = effectiveStock !== null && origQty > effectiveStock;
                return {
                    inventory_id: it.inventory_id || (matchingInv ? matchingInv.id : ""),
                    item_name: it.item_name || "",
                    hsn_sac: it.hsn_sac || "",
                    dimension: it.dimension || "",
                    quantity: it.quantity || 1,
                    unit: unit,
                    rate: it.rate || "",
                    discount_percent: it.discount_percent || "",
                    gst_rate: getInvoiceItemGstRate(it),
                    available_stock: rawStock,
                    original_quantity: origQty,
                    effective_stock: effectiveStock,
                    stock_error: hasStockError ? `Only ${effectiveStock} ${unit} available (${rawStock} in inventory + ${origQty} in this invoice)` : null,
                };
            });
        }
        if (initialAutoData?.items && initialAutoData.items.length > 0) {
            return initialAutoData.items.map((it) => {
                const desc = it.description || it.item_name || "";
                const matchingInv = inventoryItems.find(
                    (inv) => inv.item && desc && inv.item.toLowerCase().trim() === desc.toLowerCase().trim()
                );
                const rawStock = matchingInv ? parseFloat(matchingInv.qty ?? 0) : null;
                const unit = (it.unit || it.per || (matchingInv ? matchingInv.unit : "PCS")).toString().toUpperCase().trim();
                const gstRateVal = parseFloat(it.tax_rate ?? initialAutoData.tax_rate ?? 18) || 18;
                const validGst = [0, 5, 12, 18, 28].includes(gstRateVal) ? gstRateVal : 18;
                const qty = it.quantity !== null && it.quantity !== undefined ? parseFloat(it.quantity) : 1;
                const rate = it.rate !== null && it.rate !== undefined ? parseFloat(it.rate) : "";
                const disc = it.discount_percent !== null && it.discount_percent !== undefined ? parseFloat(it.discount_percent) : "";
                return {
                    inventory_id: matchingInv ? matchingInv.id : "",
                    item_name: desc,
                    hsn_sac: it.hsn_sac || "",
                    dimension: it.dimension || "",
                    quantity: qty || 1,
                    unit: unit || "PCS",
                    rate: rate,
                    discount_percent: disc,
                    gst_rate: validGst,
                    available_stock: rawStock,
                    original_quantity: 0,
                    effective_stock: rawStock,
                    stock_error: null,
                };
            });
        }
        return [
            {
                inventory_id: "",
                item_name: "",
                hsn_sac: "",
                dimension: "",
                quantity: 1,
                unit: "PCS",
                rate: "",
                discount_percent: "",
                gst_rate: 18,
                available_stock: null,
                original_quantity: 0,
                effective_stock: null,
                stock_error: null,
            },
        ];
    });

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Calculate Totals Live
    const summary = useMemo(() => {
        let subtotal = 0;
        let lineDiscount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        items.forEach((it) => {
            const qty = parseFloat(it.quantity) || 0;
            const rate = parseFloat(it.rate) || 0;
            const discPct = parseFloat(it.discount_percent) || 0;
            const gst = parseFloat(it.gst_rate) || 0;

            const rowGross = qty * rate;
            const rowDisc = (rowGross * discPct) / 100;
            const rowTaxable = Math.max(0, rowGross - rowDisc);

            subtotal += rowGross;
            lineDiscount += rowDisc;

            if (taxType === "inter_state") {
                igstAmount += (rowTaxable * gst) / 100;
            } else {
                cgstAmount += (rowTaxable * (gst / 2)) / 100;
                sgstAmount += (rowTaxable * (gst / 2)) / 100;
            }
        });

        const grossDiscNum = parseFloat(grossDiscount) || 0;
        const totalDiscount = lineDiscount + grossDiscNum;
        const taxableAmount = Math.max(0, subtotal - totalDiscount);

        // Adjust GST proportionally if gross discount is applied post item discount
        if (grossDiscNum > 0 && (subtotal - lineDiscount) > 0) {
            const ratio = Math.max(0, 1 - (grossDiscNum / (subtotal - lineDiscount)));
            cgstAmount = cgstAmount * ratio;
            sgstAmount = sgstAmount * ratio;
            igstAmount = igstAmount * ratio;
        }

        const totalTax = cgstAmount + sgstAmount + igstAmount;
        const rawTotal = taxableAmount + totalTax;
        const roundedTotal = Math.round(rawTotal);
        const roundOff = (roundedTotal - rawTotal);

        return {
            subtotal,
            lineDiscount,
            grossDiscount: grossDiscNum,
            totalDiscount,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalTax,
            roundOff,
            grandTotal: roundedTotal,
            words: numberToWordsINR(roundedTotal),
        };
    }, [items, taxType, grossDiscount]);

    const handleItemChange = (idx, field, value) => {
        setItems((prev) => {
            const updated = [...prev];
            const current = { ...updated[idx], [field]: value };

            if (field === "item_name") {
                if (!value || !value.trim()) {
                    current.inventory_id = "";
                    current.available_stock = null;
                    current.original_quantity = 0;
                    current.effective_stock = null;
                    current.stock_error = null;
                } else {
                    const matched = inventoryItems.find(
                        (inv) => inv.item && inv.item.toLowerCase().trim() === value.toLowerCase().trim()
                    );
                    if (matched) {
                        current.inventory_id = matched.id;
                        const rawStock = parseFloat(matched.qty ?? 0);
                        const origQty = getOriginalItemQty(matched.id, matched.item);
                        const effectiveStock = rawStock + origQty;

                        current.available_stock = rawStock;
                        current.original_quantity = origQty;
                        current.effective_stock = effectiveStock;

                        if (!current.rate && matched.selling_price) {
                            current.rate = matched.selling_price;
                        }
                        if (matched.unit) current.unit = matched.unit;
                        const qty = parseFloat(current.quantity) || 0;
                        if (effectiveStock !== null && qty > effectiveStock) {
                            current.stock_error = `Only ${effectiveStock} ${current.unit || "PCS"} available (${rawStock} in inventory${origQty > 0 ? ` + ${origQty} in this invoice` : ""})`;
                        } else {
                            current.stock_error = null;
                        }
                    } else if (current.inventory_id) {
                        current.inventory_id = "";
                        current.available_stock = null;
                        current.original_quantity = 0;
                        current.effective_stock = null;
                        current.stock_error = null;
                    }
                }
            }

            if (field === "dimension") {
                current.dimension = value;
                const limit = current.effective_stock !== undefined && current.effective_stock !== null 
                    ? current.effective_stock 
                    : current.available_stock;
                if (limit !== undefined && limit !== null) {
                    const qty = parseFloat(current.quantity) || 0;
                    if (qty > limit) {
                        current.stock_error = `Only ${limit} ${current.unit || "PCS"} available (${current.available_stock ?? 0} in inventory${current.original_quantity > 0 ? ` + ${current.original_quantity} in this invoice` : ""})`;
                    } else {
                        current.stock_error = null;
                    }
                }
            }

            if (field === "quantity") {
                const qty = parseFloat(value) || 0;
                const limit = current.effective_stock !== undefined && current.effective_stock !== null 
                    ? current.effective_stock 
                    : current.available_stock;
                if (limit !== undefined && limit !== null) {
                    if (qty > limit) {
                        current.stock_error = `Only ${limit} ${current.unit || "PCS"} available (${current.available_stock ?? 0} in inventory${current.original_quantity > 0 ? ` + ${current.original_quantity} in this invoice` : ""})`;
                    } else {
                        current.stock_error = null;
                    }
                } else {
                    current.stock_error = null;
                }
            }

            updated[idx] = current;
            return updated;
        });
    };

    const addItemRow = () => {
        setItems((prev) => [
            ...prev,
            {
                inventory_id: "",
                item_name: "",
                hsn_sac: "",
                dimension: "",
                quantity: 1,
                unit: "PCS",
                rate: "",
                discount_percent: "",
                gst_rate: 18,
                available_stock: null,
                original_quantity: 0,
                effective_stock: null,
                stock_error: null,
            },
        ]);
    };

    const removeItemRow = (idx) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!sellerName.trim()) {
            setErrorMsg("Please enter your Seller / Business Name.");
            return;
        }
        if (!customerName.trim()) {
            setErrorMsg("Please enter Customer / Client Name.");
            return;
        }
        if (items.some((it) => !it.item_name.trim() || !(parseFloat(it.rate) >= 0))) {
            setErrorMsg("Please provide item description and rate for all line items.");
            return;
        }

        // Stock validation: prevent submit if any item exceeds actual available stock in inventory (accounting for original quantities in this invoice)
        const stockErrRow = items.find((it) => {
            if (it.stock_error) return true;
            const limit = it.effective_stock !== undefined && it.effective_stock !== null ? it.effective_stock : it.available_stock;
            if (limit !== undefined && limit !== null) {
                return (parseFloat(it.quantity) || 0) > limit;
            }
            return false;
        });
        if (stockErrRow) {
            const limit = stockErrRow.effective_stock !== undefined && stockErrRow.effective_stock !== null 
                ? stockErrRow.effective_stock 
                : (stockErrRow.available_stock ?? 0);
            const u = stockErrRow.unit || "PCS";
            setErrorMsg(`Cannot save invoice: Item "${stockErrRow.item_name}" quantity exceeds available inventory stock (Available: ${limit} ${u}).`);
            return;
        }

        setSubmitting(true);

        const payload = {
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            due_date: dueDate,
            status,
            paid_amount: status === "Paid" 
                ? summary.grandTotal 
                : (status === "Partially Paid" ? (parseFloat(paidAmount) || 0) : 0),
            tax_type: taxType,
            seller_name: sellerName,
            seller_address: sellerAddress,
            seller_gst_number: sellerGstNumber,
            seller_phone: sellerPhone,
            seller_state: sellerState,
            customer_name: customerName,
            customer_address: customerAddress,
            customer_gst_number: customerGstNumber,
            customer_phone: customerPhone,
            customer_state: customerState,
            place_of_supply: placeOfSupply || customerState,
            gross_discount: grossDiscount !== "" ? parseFloat(grossDiscount) : 0,
            notes,
            terms,
            items,
            notify_whatsapp: notifyWhatsapp,
        };

        if (isEdit) {
            router.post(`/invoices/${invoice.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setSubmitting(false);
                    onSuccess("Invoice updated successfully!");
                },
                onError: (errs) => {
                    setSubmitting(false);
                    setErrorMsg(Object.values(errs)[0] || "Failed to update invoice.");
                },
            });
        } else {
            router.post("/invoices", payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setSubmitting(false);
                    onSuccess("Tax invoice generated successfully!");
                },
                onError: (errs) => {
                    setSubmitting(false);
                    setErrorMsg(Object.values(errs)[0] || "Failed to create invoice.");
                },
            });
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div
                className="modal-box invoice-modal-box"
                style={{
                    maxWidth: 1320,
                    width: "96vw",
                    maxHeight: "92vh",
                    display: "flex",
                    flexDirection: "column",
                    padding: 0,
                    overflow: "hidden",
                }}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--bg-elevated)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Receipt size={20} color="var(--accent)" />
                        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                            {isEdit ? `Edit Tax Invoice #${invoice.invoice_number}` : "Generate New Tax Invoice (GST Bill)"}
                        </h2>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                    <div className="invoice-modal-body">
                        {errorMsg && (
                            <div className="toast-notice error" style={{ position: "relative", marginBottom: 6 }}>
                                <AlertCircle size={16} />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Top 2 Columns: Seller (Billed By) & Customer (Billed To) */}
                        <div className="invoice-form-grid-2">
                            {/* Seller Box */}
                            <div
                                style={{
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 12,
                                    padding: 16,
                                    background: "var(--bg-surface)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13.5, color: "var(--accent)" }}>
                                        <Building2 size={16} /> Seller Details (Billed By)
                                    </div>
                                    <span style={{ fontSize: 11, background: "rgba(16, 185, 129, 0.1)", color: "#059669", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                                        ✓ Saved for future
                                    </span>
                                </div>

                                <div className="form-group" style={{ marginBottom: 10 }}>
                                    <label className="form-label">Seller / Username *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Username / Seller Name"
                                        value={sellerName}
                                        onChange={(e) => setSellerName(e.target.value)}
                                        required
                                    />
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                                        Defaults to your account username: <strong>{currentUserName || "Logged in User"}</strong>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 10 }}>
                                    <label className="form-label">Seller Address</label>
                                    <input
                                        className="form-input"
                                        placeholder="Street, City, Pincode"
                                        value={sellerAddress}
                                        onChange={(e) => setSellerAddress(e.target.value)}
                                    />
                                </div>

                                <div className="invoice-form-grid-3">
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            className="form-input"
                                            placeholder="10-digit mobile number"
                                            value={sellerPhone}
                                            onChange={(e) => setSellerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Seller GSTIN</label>
                                        <input
                                            className="form-input"
                                            placeholder="24ABCDE1234F1Z5"
                                            value={sellerGstNumber}
                                            onChange={(e) => setSellerGstNumber(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">State</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Gujarat (24)"
                                            value={sellerState}
                                            onChange={(e) => setSellerState(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Buyer Box */}
                            <div
                                style={{
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 12,
                                    padding: 16,
                                    background: "var(--bg-surface)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13.5, color: "var(--info)" }}>
                                        <User size={16} /> Buyer Details (Billed To)
                                    </div>
                                    <span style={{ fontSize: 11, background: "rgba(59, 130, 246, 0.1)", color: "var(--info)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                                        ✓ Saved for future
                                    </span>
                                </div>

                                <div className="form-group" style={{ marginBottom: 10, position: "relative" }}>
                                    <label className="form-label">Customer / Client Name *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Type customer name or pick saved..."
                                        value={customerName}
                                        onChange={(e) => {
                                            setCustomerName(e.target.value);
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                        required
                                    />
                                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "100%",
                                                left: 0,
                                                right: 0,
                                                zIndex: 3000,
                                                background: "var(--bg-elevated)",
                                                border: "1px solid var(--border)",
                                                borderRadius: 8,
                                                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                                                maxHeight: 220,
                                                overflowY: "auto",
                                                marginTop: 4,
                                            }}
                                        >
                                            <div style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
                                                Saved Customers ({filteredCustomers.length})
                                            </div>
                                            {filteredCustomers.map((c) => (
                                                <div
                                                    key={c.id}
                                                    onMouseDown={() => handleSelectCustomer(c)}
                                                    style={{
                                                        padding: "8px 12px",
                                                        cursor: "pointer",
                                                        borderBottom: "1px solid var(--border)",
                                                        fontSize: 13,
                                                        transition: "background 0.15s ease",
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                >
                                                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</div>
                                                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: 10, marginTop: 2 }}>
                                                        {c.phone && <span>📞 {c.phone}</span>}
                                                        {c.gst_number && <span>GST: {c.gst_number}</span>}
                                                        {c.state && <span>📍 {c.state}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group" style={{ marginBottom: 10 }}>
                                    <label className="form-label">Customer Address</label>
                                    <input
                                        className="form-input"
                                        placeholder="Delivery / Billing Address"
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                    />
                                </div>

                                <div className="invoice-form-grid-3">
                                    <div className="form-group">
                                        <label className="form-label">Customer Phone</label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            className="form-input"
                                            placeholder="10-digit mobile number"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Customer GSTIN</label>
                                        <input
                                            className="form-input"
                                            placeholder="Optional (if registered)"
                                            value={customerGstNumber}
                                            onChange={(e) => setCustomerGstNumber(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">State / Supply</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g. Gujarat"
                                            value={placeOfSupply}
                                            onChange={(e) => {
                                                setPlaceOfSupply(e.target.value);
                                                setCustomerState(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Metadata Row */}
                        <div className="invoice-meta-grid">
                            <div className="form-group">
                                <label className="form-label">Invoice Number *</label>
                                <input
                                    className="form-input"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Invoice Date *</span>
                                    {invoiceDate && (
                                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, background: "rgba(99, 102, 241, 0.08)", padding: "1px 6px", borderRadius: 4 }}>
                                            {formatDate(invoiceDate)}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Due Date</span>
                                    {dueDate && (
                                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, background: "rgba(99, 102, 241, 0.08)", padding: "1px 6px", borderRadius: 4 }}>
                                            {formatDate(dueDate)}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tax Type</label>
                                <select
                                    className="form-select"
                                    value={taxType}
                                    onChange={(e) => setTaxType(e.target.value)}
                                >
                                    <option value="intra_state">Intra-State (CGST + SGST)</option>
                                    <option value="inter_state">Inter-State (IGST)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Status</label>
                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setStatus(newStatus);
                                        if (newStatus === "Paid") {
                                            setPaidAmount(summary.grandTotal ? String(summary.grandTotal) : "");
                                        } else if (newStatus === "Unpaid") {
                                            setPaidAmount("0");
                                        } else if (newStatus === "Partially Paid") {
                                            if (!paidAmount || paidAmount === "0" || parseFloat(paidAmount) >= summary.grandTotal) {
                                                setPaidAmount(summary.grandTotal ? String(Math.round(summary.grandTotal / 2)) : "");
                                            }
                                        }
                                    }}
                                >
                                    <option value="Paid">Received (Fully Paid)</option>
                                    <option value="Unpaid">Unpaid (Balance Due)</option>
                                    <option value="Partially Paid">Partially Received</option>
                                </select>
                            </div>

                            {status === "Partially Paid" && (
                                <div className="form-group">
                                    <label className="form-label" style={{ color: "#d97706", fontWeight: 700 }}>
                                        Partial Received Amount (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={summary.grandTotal || undefined}
                                        className="form-input"
                                        style={{ borderColor: "#f59e0b", background: "#fffbeb", fontWeight: 700, color: "#b45309" }}
                                        placeholder={`e.g. ${(summary.grandTotal ? (summary.grandTotal / 2).toFixed(2) : "0.00")}`}
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(e.target.value)}
                                        required
                                    />
                                    {summary.grandTotal > 0 && paidAmount !== "" && (
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                                            Balance Due: <strong>₹{Math.max(0, summary.grandTotal - (parseFloat(paidAmount) || 0)).toFixed(2)}</strong>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Items Table Grid */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                                    <Layers size={16} /> Invoice Line Items
                                </h3>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
                                    <Plus size={14} /> Add Row
                                </button>
                            </div>

                            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflowX: "auto" }}>
                                <table className="data-table" style={{ fontSize: 13, minWidth: 1100, width: "100%" }}>
                                    <thead style={{ background: "var(--bg-elevated)" }}>
                                        <tr>
                                            <th style={{ width: 36, textAlign: "center" }}>#</th>
                                            <th style={{ minWidth: 220 }}>Item Description</th>
                                            <th style={{ width: 85, textAlign: "center" }}>HSN/SAC</th>
                                            <th style={{ width: 140 }}>
                                                Dimension
                                                <span style={{ display: "block", fontSize: 9.5, fontWeight: 400, color: "var(--text-muted)" }}>
                                                    Optional
                                                </span>
                                            </th>
                                            <th style={{ width: 125, textAlign: "right" }}>
                                                Qty
                                                <span style={{ display: "block", fontSize: 9.5, fontWeight: 400, color: "var(--text-muted)" }}>
                                                    Required
                                                </span>
                                            </th>
                                            <th style={{ width: 75, textAlign: "center" }}>Unit</th>
                                            <th style={{ width: 105, textAlign: "right" }}>Rate (₹)</th>
                                            <th style={{ width: 75, textAlign: "right" }}>Disc %</th>
                                            <th style={{ width: 85, textAlign: "center" }}>GST %</th>
                                            <th style={{ width: 110, textAlign: "right" }}>Amount (₹)</th>
                                            <th style={{ width: 44, textAlign: "center" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row, idx) => {
                                            const qty = parseFloat(row.quantity) || 0;
                                            const rate = parseFloat(row.rate) || 0;
                                            const disc = parseFloat(row.discount_percent) || 0;
                                            const gst = parseFloat(row.gst_rate) || 0;
                                            const gross = qty * rate;
                                            const discAmt = (gross * disc) / 100;
                                            const taxable = Math.max(0, gross - discAmt);
                                            const tax = (taxable * gst) / 100;
                                            const lineTotal = taxable + tax;

                                            return (
                                                <tr key={idx} style={{ verticalAlign: "top" }}>
                                                    <td style={{ color: "var(--text-muted)", textAlign: "center", paddingTop: 14 }}>{idx + 1}</td>
                                                    <td>
                                                        <InventoryAutocompleteInput
                                                            value={row.item_name}
                                                            onChange={(val) => handleItemChange(idx, "item_name", val)}
                                                            onSelect={(inv) => selectInventoryItem(idx, inv)}
                                                            initialItems={inventoryItems}
                                                            placeholder="Type item name..."
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            className="form-input"
                                                            style={{ padding: "7px 6px", fontSize: 13, textAlign: "center" }}
                                                            placeholder="HSN"
                                                            value={row.hsn_sac}
                                                            onChange={(e) => handleItemChange(idx, "hsn_sac", e.target.value.replace(/\D/g, ""))}
                                                        />
                                                    </td>
                                                    <td>
                                                        <DimensionInput
                                                            value={row.dimension}
                                                            onChange={(val) => handleItemChange(idx, "dimension", val)}
                                                            placeholder="e.g. 10x12 ft"
                                                        />
                                                        {row.dimension ? (
                                                            <div style={{ fontSize: 9.5, color: "var(--accent)", marginTop: 2, fontWeight: 600 }}>
                                                                📐 Custom size (Qty hidden on PDF)
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>
                                                                Optional (Skip to use Qty)
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ position: "relative" }}>
                                                            <StrongNumericInput
                                                                min={0.001}
                                                                step="any"
                                                                placeholder="1"
                                                                value={row.quantity}
                                                                onChange={(val) => handleItemChange(idx, "quantity", val)}
                                                                hasError={Boolean(row.stock_error)}
                                                                required
                                                            />
                                                            {row.stock_error ? (
                                                                <div style={{ fontSize: 10, color: "#ef4444", marginTop: 3, fontWeight: 600, textAlign: "right", lineHeight: 1.2 }}>
                                                                    ⚠️ {row.stock_error}
                                                                </div>
                                                            ) : row.dimension ? (
                                                                <div style={{ fontSize: 9.5, color: "#10b981", marginTop: 2, textAlign: "right", fontWeight: 600 }}>
                                                                    ✓ Ask qty for order
                                                                </div>
                                                            ) : (row.available_stock !== undefined && row.available_stock !== null) ? (
                                                                <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2, textAlign: "right" }}>
                                                                    {row.original_quantity > 0 ? (
                                                                        <span>Stock: {row.available_stock} + {row.original_quantity} in bill ({row.effective_stock} avail)</span>
                                                                    ) : (
                                                                        <span>Stock: {row.available_stock} {row.unit || "PCS"} (will deduct)</span>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            className="form-input"
                                                            style={{ padding: "7px 6px", fontSize: 13, textAlign: "center" }}
                                                            placeholder="PCS"
                                                            value={row.unit}
                                                            onChange={(e) => handleItemChange(idx, "unit", e.target.value.toUpperCase())}
                                                        />
                                                    </td>
                                                    <td>
                                                        <StrongNumericInput
                                                            min={0}
                                                            step="any"
                                                            placeholder="0.00"
                                                            value={row.rate}
                                                            onChange={(val) => handleItemChange(idx, "rate", val)}
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <StrongNumericInput
                                                            min={0}
                                                            max={100}
                                                            step="any"
                                                            placeholder="0"
                                                            value={row.discount_percent}
                                                            onChange={(val) => handleItemChange(idx, "discount_percent", val)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select"
                                                            style={{ padding: "7px 6px", fontSize: 13 }}
                                                            value={row.gst_rate}
                                                            onChange={(e) => handleItemChange(idx, "gst_rate", e.target.value)}
                                                        >
                                                            {GST_RATES.map((r) => (
                                                                <option key={r} value={r}>
                                                                    {r}%
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>
                                                        ₹{lineTotal.toFixed(2)}
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ color: "var(--danger)", padding: 4 }}
                                                            onClick={() => removeItemRow(idx)}
                                                            disabled={items.length <= 1}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bottom Section: Notes & Live Financial Calculation */}
                        <div className="invoice-bottom-grid">
                            {/* Terms & Notes */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label">Invoice Notes</label>
                                    <input
                                        className="form-input"
                                        placeholder="Thanks for doing business with us!"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Terms and Conditions</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Financial Summary Card */}
                            <div
                                style={{
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 12,
                                    padding: "16px 20px",
                                    background: "var(--bg-elevated)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    fontSize: 13,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                                    <span>Subtotal:</span>
                                    <span>₹{summary.subtotal.toFixed(2)}</span>
                                </div>

                                {summary.lineDiscount > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}>
                                        <span>Item Discounts:</span>
                                        <span>- ₹{summary.lineDiscount.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Gross / Bill-Level Discount Input */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "6px 8px",
                                    background: "var(--bg-surface)",
                                    borderRadius: 8,
                                    border: "1px dashed var(--border)",
                                }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>
                                        Gross Discount (₹):
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-input"
                                        placeholder="0.00"
                                        style={{ width: 110, padding: "4px 8px", textAlign: "right", fontWeight: 700, color: "var(--danger)" }}
                                        value={grossDiscount}
                                        onChange={(e) => setGrossDiscount(e.target.value)}
                                    />
                                </div>

                                {summary.grossDiscount > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}>
                                        <span>Total Discount:</span>
                                        <span>- ₹{summary.totalDiscount.toFixed(2)}</span>
                                    </div>
                                )}

                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                    <span>Taxable Value:</span>
                                    <span>₹{summary.taxableAmount.toFixed(2)}</span>
                                </div>

                                {taxType === "inter_state" ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#8b5cf6" }}>
                                        <span>Integrated Tax (IGST):</span>
                                        <span>+ ₹{summary.igstAmount.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "#8b5cf6" }}>
                                            <span>Central Tax (CGST):</span>
                                            <span>+ ₹{summary.cgstAmount.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "#8b5cf6" }}>
                                            <span>State Tax (SGST):</span>
                                            <span>+ ₹{summary.sgstAmount.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12 }}>
                                    <span>Round Off:</span>
                                    <span>{summary.roundOff >= 0 ? `+ ₹${summary.roundOff.toFixed(2)}` : `- ₹${Math.abs(summary.roundOff).toFixed(2)}`}</span>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginTop: 6,
                                        paddingTop: 8,
                                        borderTop: "2px solid var(--border)",
                                        fontSize: 16,
                                        fontWeight: 800,
                                        color: "var(--text-primary)",
                                    }}
                                >
                                    <span>Grand Total:</span>
                                    <span style={{ color: "var(--accent)" }}>₹{summary.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>
                                    {summary.words}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer Actions */}
                    <div
                        style={{
                            padding: "14px 24px",
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            background: "var(--bg-elevated)",
                        }}
                    >
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
                            <input
                                type="checkbox"
                                checked={notifyWhatsapp}
                                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                                style={{ accentColor: "#10b981", width: 16, height: 16, cursor: "pointer" }}
                            />
                            <span style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                                <MessageSquare size={14} color="#10b981" />
                                {isEdit ? "Notify customer of updated bill on WhatsApp" : "Send bill to customer on WhatsApp"}
                            </span>
                        </label>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                <Receipt size={16} />
                                {submitting ? "Saving Invoice..." : isEdit ? "Update Invoice" : "Generate Invoice (GST Bill)"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Page Invoice Print & Preview Modal
// ─────────────────────────────────────────────────────────────────────────────
function InvoicePrintPreviewModal({ invoice, businessProfile = {}, onClose }) {
    const printRef = useRef(null);
    const [downloading, setDownloading] = useState(false);
    const isInterState = invoice?.tax_type === "inter_state";

    const amountInWords = useMemo(() => {
        return numberToWordsINR(invoice?.total_amount);
    }, [invoice?.total_amount]);

    // HSN Summary Grouping
    const hsnSummary = useMemo(() => {
        const groups = {};
        (invoice?.items || []).forEach((it) => {
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
    }, [invoice?.items]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
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

            const fileName = `GST_Invoice_${invoice?.invoice_number || "bill"}.pdf`;
            pdf.save(fileName);
        } catch (e) {
            console.error("PDF generation failed:", e);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 11000 }} onClick={onClose}>
            <div
                className="modal-box"
                style={{
                    maxWidth: 960,
                    width: "95vw",
                    maxHeight: "94vh",
                    display: "flex",
                    flexDirection: "column",
                    padding: 0,
                    overflow: "hidden",
                    background: "#0f172a",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Toolbar (Header) */}
                <div
                    className="no-print"
                    style={{
                        padding: "12px 20px",
                        background: "#1e293b",
                        borderBottom: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
                            Invoice #{invoice?.invoice_number}
                        </span>
                        <span
                            className={`badge ${
                                invoice?.status === "Paid"
                                    ? "badge-success"
                                    : invoice?.status === "Partially Paid"
                                    ? "badge-warning"
                                    : "badge-danger"
                            }`}
                        >
                            {invoice?.status === "Paid" ? "Received" : invoice?.status === "Partially Paid" ? "Partially Received" : invoice?.status}
                        </span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            ({invoice?.customer_name})
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            className="btn btn-secondary btn-sm"
                            style={{ background: "#334155", color: "#f8fafc", border: "1px solid #475569" }}
                        >
                            <Download size={14} />
                            {downloading ? "Saving PDF..." : "Download PDF"}
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="btn btn-primary btn-sm"
                            style={{ background: "#4f46e5", color: "#ffffff", border: "none" }}
                        >
                            <Printer size={14} /> Print Now
                        </button>

                        <a
                            href={`/invoices/${invoice?.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            title="Open Fullscreen in New Window"
                            style={{ color: "#94a3b8" }}
                        >
                            <ExternalLink size={14} />
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: "#94a3b8" }}
                            title="Close Preview"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Modal Body / Scrollable Printable Area */}
                <div
                    style={{
                        padding: "16px 10px",
                        overflowX: "auto",
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch",
                        background: "#f1f5f9",
                        flex: 1,
                    }}
                >
                    <div
                        ref={printRef}
                        id="invoice-modal-print-sheet"
                        style={{
                            maxWidth: 820,
                            minWidth: 700,
                            margin: "0 auto",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: 4,
                            padding: "24px 28px",
                            color: "#0f172a",
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: 12,
                            lineHeight: 1.5,
                            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                        }}
                    >
                        {/* 1. Header */}
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
                                        Invoice No: {invoice?.invoice_number}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Seller, Buyer, Invoice Info Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr", gap: 14, marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, background: "#f8fafc" }}>
                            {/* Seller */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                    Billed By (Seller):
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                                    {invoice?.seller_name}
                                </div>
                                {invoice?.seller_address && (
                                    <div style={{ color: "#334155", fontSize: 11.5, marginTop: 2, whiteSpace: "pre-line" }}>
                                        {invoice?.seller_address}
                                    </div>
                                )}
                                {invoice?.seller_gst_number && (
                                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                                        GSTIN: <span style={{ fontFamily: "monospace" }}>{invoice.seller_gst_number}</span>
                                    </div>
                                )}
                                {invoice?.seller_state && (
                                    <div style={{ fontSize: 11, color: "#475569" }}>
                                        State: {invoice.seller_state}
                                    </div>
                                )}
                                {invoice?.seller_phone && (
                                    <div style={{ fontSize: 11, color: "#475569" }}>
                                        Phone: {invoice.seller_phone}
                                    </div>
                                )}
                            </div>

                            {/* Buyer */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                    Billed To (Buyer):
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                                    {invoice?.customer_name}
                                </div>
                                {invoice?.customer_address && (
                                    <div style={{ color: "#334155", fontSize: 11.5, marginTop: 2, whiteSpace: "pre-line" }}>
                                        {invoice?.customer_address}
                                    </div>
                                )}
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                                    GSTIN: <span style={{ fontFamily: "monospace" }}>{invoice?.customer_gst_number || "Unregistered"}</span>
                                </div>
                                {invoice?.customer_state && (
                                    <div style={{ fontSize: 11, color: "#475569" }}>
                                        State: {invoice.customer_state}
                                    </div>
                                )}
                                {invoice?.customer_phone && (
                                    <div style={{ fontSize: 11, color: "#475569" }}>
                                        Phone: {invoice.customer_phone}
                                    </div>
                                )}
                            </div>

                            {/* Invoice Details */}
                            <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                                    Invoice Details:
                                </div>
                                <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                                    <span style={{ color: "#64748b" }}>Date:</span> <strong>{formatDate(invoice?.invoice_date)}</strong>
                                </div>
                                {invoice?.due_date && (
                                    <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                                        <span style={{ color: "#64748b" }}>Due Date:</span> <strong>{formatDate(invoice.due_date)}</strong>
                                    </div>
                                )}
                                <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                                    <span style={{ color: "#64748b" }}>Place of Supply:</span> <strong>{invoice?.place_of_supply || invoice?.customer_state || "-"}</strong>
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
                                    {(invoice?.items || []).map((it, idx) => (
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
                                            <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>{parseFloat(it.rate || 0).toFixed(2)}</td>
                                            <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                                {parseFloat(it.discount_percent || 0) > 0 ? `${parseFloat(it.discount_percent)}%` : "-"}
                                            </td>
                                            <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600, border: "1px solid #e2e8f0" }}>
                                                {parseFloat(it.taxable_value || 0).toFixed(2)}
                                            </td>
                                            {isInterState ? (
                                                <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>
                                                    {parseFloat(it.igst_amount || 0).toFixed(2)}
                                                    <div style={{ fontSize: 9.5, color: "#64748b" }}>({parseFloat(it.igst_rate || 0)}%)</div>
                                                </td>
                                            ) : (
                                                <>
                                                    <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>
                                                        {parseFloat(it.cgst_amount || 0).toFixed(2)}
                                                        <div style={{ fontSize: 9.5, color: "#64748b" }}>({parseFloat(it.cgst_rate || 0)}%)</div>
                                                    </td>
                                                    <td style={{ padding: "7px 8px", textAlign: "right", border: "1px solid #e2e8f0" }}>
                                                        {parseFloat(it.sgst_amount || 0).toFixed(2)}
                                                        <div style={{ fontSize: 9.5, color: "#64748b" }}>({parseFloat(it.sgst_rate || 0)}%)</div>
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

                        {/* 4. Tax Breakdown & Financial Totals */}
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

                            {/* Financial Summary */}
                            <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 5 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b" }}>Sub Total:</span>
                                    <span>₹{parseFloat(invoice?.subtotal || 0).toFixed(2)}</span>
                                </div>
                                {parseFloat(invoice?.gross_discount || 0) > 0 ? (
                                    <>
                                        {parseFloat(invoice?.total_discount || 0) - parseFloat(invoice?.gross_discount || 0) > 0 && (
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                                                <span>Item Discounts:</span>
                                                <span>- ₹{(parseFloat(invoice.total_discount) - parseFloat(invoice.gross_discount)).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                                            <span>Gross Discount:</span>
                                            <span>- ₹{parseFloat(invoice.gross_discount).toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    parseFloat(invoice?.total_discount || 0) > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                                            <span>Discount:</span>
                                            <span>- ₹{parseFloat(invoice.total_discount).toFixed(2)}</span>
                                        </div>
                                    )
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                    <span>Taxable Amount:</span>
                                    <span>₹{parseFloat(invoice?.taxable_amount || 0).toFixed(2)}</span>
                                </div>
                                {isInterState ? (
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>IGST:</span>
                                        <span>₹{parseFloat(invoice?.igst_amount || 0).toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span>CGST:</span>
                                            <span>₹{parseFloat(invoice?.cgst_amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span>SGST:</span>
                                            <span>₹{parseFloat(invoice?.sgst_amount || 0).toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                                {parseFloat(invoice?.round_off || 0) !== 0 && (
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
                                    <span>₹{parseFloat(invoice?.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                        {invoice?.terms || "1. Goods once sold will not be returned.\n2. Subject to local jurisdiction."}
                                    </div>
                                </div>
                            </div>

                            {/* Signatory */}
                            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                                    For {invoice?.seller_name}
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
                </div>

                {/* Scoped Print Style */}
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #invoice-modal-print-sheet, #invoice-modal-print-sheet * {
                            visibility: visible !important;
                        }
                        #invoice-modal-print-sheet {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 10px 15px !important;
                            border: none !important;
                            box-shadow: none !important;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
