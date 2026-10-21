import React, { useState, useEffect, useMemo, useRef } from "react";
import { Head, useForm, router, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import {
    QrCode,
    MessageSquare,
    Send,
    RefreshCw,
    LogOut,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Shield,
    Sparkles,
    Copy,
    Check,
    ExternalLink,
    Play,
    Pause,
    Users,
    Receipt,
    Sliders,
    HelpCircle,
    ChevronRight,
    Star,
    IndianRupee,
    Phone,
    ShieldCheck,
    Zap,
    Smartphone,
    Eye,
    Search,
    Filter,
    FileText,
    Share2,
    Info,
    CheckCheck,
    X,
    ShoppingBag,
    ImageIcon,
    Upload,
    RotateCcw,
    Download,
    Paperclip,
    AlertCircle,
} from "lucide-react";

export default function WhatsAppHub({
    sessionStatus,
    templates,
    profile,
    broadcasts = [],
    logs,
    quota,
    customerStats,
}) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.user?.role === "super_admin";
    const broadcastList = Array.isArray(broadcasts) ? broadcasts : (broadcasts?.data || []);

    const [activeTab, setActiveTab] = useState("connect");
    const [status, setStatus] = useState(sessionStatus?.status || "disconnected");
    const [phone, setPhone] = useState(sessionStatus?.phone || null);
    const [qrCode, setQrCode] = useState(sessionStatus?.qr || null);
    const [isPolling, setIsPolling] = useState(false);
    const [connectionError, setConnectionError] = useState(sessionStatus?.error || null);
    const [connectingMessage, setConnectingMessage] = useState("");
    const [copiedTag, setCopiedTag] = useState(null);
    const [selectedTemplateTab, setSelectedTemplateTab] = useState("bill_created");
    const [logSearch, setLogSearch] = useState("");
    const [logStatusFilter, setLogStatusFilter] = useState("all");
    const [recallingId, setRecallingId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // Test message form
    const testForm = useForm({
        phone: "",
        message: "Namaste! This is a test notification from Vama Invoice WhatsApp system. ✅",
    });

    // Templates form
    const templatesForm = useForm({
        upi_id: profile?.upi_id || "",
        google_review_url: profile?.google_review_url || "",
        templates: {
            bill_created: {
                title: templates?.bill_created?.title || "New Invoice (Partial / Unpaid)",
                message: templates?.bill_created?.message || "",
            },
            bill_paid: {
                title: templates?.bill_paid?.title || "Payment Received Receipt (Paid)",
                message: templates?.bill_paid?.message || "",
            },
            bill_updated: {
                title: templates?.bill_updated?.title || "Revised Invoice (Updated)",
                message: templates?.bill_updated?.message || "",
            },
            partial_payment: {
                title: templates?.partial_payment?.title || "Partial Payment Received & Balance Due",
                message: templates?.partial_payment?.message || "",
            },
            payment_reminder: {
                title: templates?.payment_reminder?.title || "Payment Reminder (Due / Vasooli)",
                message: templates?.payment_reminder?.message || "",
            },
            purchase_reminder: {
                title: templates?.purchase_reminder?.title || "Purchase Bill Due Reminder (To Pay Supplier)",
                message: templates?.purchase_reminder?.message || "",
            },
            custom: {
                title: templates?.custom?.title || "Customer Broadcast & Offers",
                message: templates?.custom?.message || "",
            },
        },
    });

    // Broadcast form
    const broadcastForm = useForm({
        title: "",
        recipient_mode: "filter", // "filter" or "custom"
        filter_type: "all",
        custom_numbers: "",
        image: null,
        message_template: templates?.custom?.message || "Namaste {customer_name}! Special festive offer from {shop_name}.\n\nVisit us or reply to this message to know more!",
    });

    // Count unique valid mobile numbers parsed from custom_numbers
    const parsedCustomCount = useMemo(() => {
        if (!broadcastForm.data.custom_numbers) return 0;
        const items = broadcastForm.data.custom_numbers.split(/[\r\n,;]+/);
        const set = new Set();
        items.forEach((item) => {
            const c = item.replace(/\D/g, "");
            if (c.length >= 10 && c.length <= 15) {
                set.add(c);
            }
        });
        return set.size;
    }, [broadcastForm.data.custom_numbers]);

    // Auto-poll status when QR is waiting or connecting
    useEffect(() => {
        let interval = null;
        let pollAttempts = 0;
        if (status === "qr_ready" || status === "connecting") {
            setIsPolling(true);
            interval = setInterval(async () => {
                pollAttempts++;
                try {
                    const res = await fetch("/whatsapp/session/status");
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            setStatus(data.status);
                            setPhone(data.phone);
                            if (data.qr) {
                                setQrCode(data.qr);
                                setConnectionError(null);
                            }
                            if (data.status === "connected") {
                                clearInterval(interval);
                                setIsPolling(false);
                                router.reload({ only: ["sessionStatus"] });
                            }
                        } else if (pollAttempts >= 4 && data.status === "disconnected") {
                            // If sidecar repeatedly fails or returns error
                            setStatus("disconnected");
                            setConnectionError(data.error || "Unable to reach WhatsApp sidecar.");
                            setQrCode(null);
                        }
                    }
                } catch (e) {
                    console.error("Polling status error:", e);
                }
            }, 3000);
        } else {
            setIsPolling(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status]);

    // Auto-step & poll broadcasts when any campaign is processing or scheduled
    useEffect(() => {
        const activeCampaign = broadcastList.find((b) => b.status === "processing" || b.status === "scheduled");
        let interval = null;
        let isStepping = false;

        if (activeCampaign) {
            interval = setInterval(async () => {
                if (isStepping) return;
                isStepping = true;
                try {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                    await fetch(`/whatsapp/broadcasts/${activeCampaign.id}/step`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "X-CSRF-TOKEN": csrfToken || "",
                        },
                    });
                    router.reload({ only: ["broadcasts", "quota", "logs"] });
                } catch (e) {
                    router.reload({ only: ["broadcasts", "quota", "logs"] });
                } finally {
                    isStepping = false;
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [broadcastList]);

    const handleConnect = async () => {
        setStatus("connecting");
        setConnectionError(null);
        setConnectingMessage("Contacting WhatsApp server...");

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
            const res = await fetch("/whatsapp/session/connect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": csrfToken || "",
                },
            });

            const data = await res.json();

            if (data.success) {
                setStatus(data.status);
                setPhone(data.phone || null);
                if (data.qr) {
                    setQrCode(data.qr);
                    setConnectingMessage("");
                } else if (data.status === "connecting") {
                    setConnectingMessage("Session started. Generating WhatsApp QR code...");
                }
            } else {
                setStatus("disconnected");
                setConnectionError(data.error || "Failed to connect to WhatsApp sidecar.");
                setConnectingMessage("");
            }
        } catch (err) {
            console.error("Connect error:", err);
            setStatus("disconnected");
            setConnectionError("Network error: Could not reach the WhatsApp server.");
            setConnectingMessage("");
        }
    };

    const handleLogout = () => {
        if (!confirm("Are you sure you want to disconnect WhatsApp? You can reconnect anytime by scanning the QR code.")) return;
        router.delete("/whatsapp/session/logout", {
            preserveScroll: true,
            onSuccess: () => {
                setStatus("disconnected");
                setPhone(null);
                setQrCode(null);
            },
        });
    };

    const handleRecallMessage = (log) => {
        if (!confirm(`Recall this message sent to ${log.recipient_name || log.recipient_phone}?\n\nThis will trigger "Delete for Everyone" on WhatsApp so the recipient cannot view it.`)) {
            return;
        }

        setRecallingId(log.id);
        router.post(`/whatsapp/messages/${log.id}/recall`, {}, {
            preserveScroll: true,
            onFinish: () => setRecallingId(null),
        });
    };

    const handleSendTest = (e) => {
        e.preventDefault();
        testForm.post("/whatsapp/session/test", {
            preserveScroll: true,
        });
    };

    const handleSaveTemplates = (e) => {
        e.preventDefault();
        templatesForm.post("/whatsapp/templates", {
            preserveScroll: true,
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            broadcastForm.setData("image", file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        broadcastForm.setData("image", null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCreateBroadcast = (e) => {
        e.preventDefault();
        broadcastForm.post("/whatsapp/broadcasts", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                broadcastForm.reset("title", "custom_numbers", "image");
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setActiveTab("broadcasts");
            },
        });
    };

    const handlePauseBroadcast = (id) => {
        router.post(`/whatsapp/broadcasts/${id}/pause`, {}, { preserveScroll: true });
    };

    const handleResumeBroadcast = (id) => {
        router.post(`/whatsapp/broadcasts/${id}/resume`, {}, { preserveScroll: true });
    };

    const handleCancelBroadcast = (id) => {
        if (!confirm("Are you sure you want to cancel this campaign? Pending messages will be cancelled.")) return;
        router.post(`/whatsapp/broadcasts/${id}/cancel`, {}, { preserveScroll: true });
    };

    const insertPlaceholder = (tag) => {
        const currentMsg = templatesForm.data.templates[selectedTemplateTab]?.message || "";
        templatesForm.setData("templates", {
            ...templatesForm.data.templates,
            [selectedTemplateTab]: {
                ...templatesForm.data.templates[selectedTemplateTab],
                message: currentMsg + " " + tag + " ",
            },
        });
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(null), 1800);
    };

    const availablePlaceholders = selectedTemplateTab === "purchase_reminder" ? [
        { tag: "{user_name}", desc: "Your Merchant / Business Name" },
        { tag: "{supplier_name}", desc: "Supplier / Vendor Name" },
        { tag: "{bill_number}", desc: "Supplier Invoice #" },
        { tag: "{purchase_number}", desc: "Purchase Order Ref (PUR-XXXX)" },
        { tag: "{total_amount}", desc: "Total Bill Amount" },
        { tag: "{paid_amount}", desc: "Amount Already Paid" },
        { tag: "{balance_due}", desc: "Pending Balance Due to Supplier" },
        { tag: "{due_date}", desc: "Payment Due Date" },
        { tag: "{days_left_text}", desc: "e.g. 3 days left / Due Today!" },
    ] : [
        { tag: "{customer_name}", desc: "Customer Name" },
        { tag: "{shop_name}", desc: "Shop / Business Name" },
        { tag: "{invoice_no}", desc: "Invoice #" },
        { tag: "{due_date}", desc: "Payment Due Date" },
        { tag: "{total_amount}", desc: "Grand Total" },
        { tag: "{paid_amount}", desc: "Amount Paid" },
        { tag: "{balance_due}", desc: "Pending Balance" },
        { tag: "{payment_section}", desc: "Dynamic UPI Link (Shows only if balance due & UPI configured)" },
        { tag: "{review_section}", desc: "Google Review Link (Shows only if configured in profile)" },
    ];

    const currentTemplateMessage = templatesForm.data.templates?.[selectedTemplateTab]?.message || "";

    // Simulated phone message preview
    const previewMessage = useMemo(() => {
        const hasUpi = Boolean(templatesForm.data.upi_id || profile?.upi_id);
        const hasReview = Boolean(templatesForm.data.google_review_url || profile?.google_review_url);

        const dummyPaymentSection = hasUpi ? "\n\n⚡ *Quick UPI Pay:* \nupi://pay?pa=store@upi&am=3500.00" : "";
        const dummyReviewSection = hasReview ? "\n\n⭐ *Review Us on Google:* \n" + (templatesForm.data.google_review_url || profile?.google_review_url || "https://g.page/r/sample/review") : "";

        if (selectedTemplateTab === "purchase_reminder") {
            return (currentTemplateMessage || "No message template specified.")
                .replace(/{user_name}/g, profile?.business_name || "Merchant")
                .replace(/{supplier_name}/g, "Apex Wholesale Dist.")
                .replace(/{bill_number}/g, "SUPP-INV-992")
                .replace(/{purchase_number}/g, "PUR-000042")
                .replace(/{due_date}/g, "25 Oct 2026")
                .replace(/{days_left_text}/g, "3 days left")
                .replace(/{total_amount}/g, "15,000.00")
                .replace(/{paid_amount}/g, "5,000.00")
                .replace(/{balance_due}/g, "10,000.00");
        }

        return (currentTemplateMessage || "No message template specified.")
            .replace(/{customer_name}/g, "Rahul Sharma")
            .replace(/{shop_name}/g, profile?.business_name || "Vama Enterprises")
            .replace(/{invoice_no}/g, "INV-2026-0042")
            .replace(/{due_date}/g, "25 Oct 2026")
            .replace(/{total_amount}/g, "4,500.00")
            .replace(/{paid_amount}/g, selectedTemplateTab === "bill_paid" ? "4,500.00" : "1,000.00")
            .replace(/{balance_due}/g, selectedTemplateTab === "bill_paid" ? "0.00" : "3,500.00")
            .replace(/{invoice_link}/g, "")
            .replace(/{payment_section}/g, selectedTemplateTab === "bill_paid" ? "" : dummyPaymentSection)
            .replace(/{review_section}/g, dummyReviewSection)
            .replace(/{upi_link}/g, hasUpi ? "upi://pay?pa=store@upi&am=3500.00" : "")
            .replace(/{google_review_link}/g, hasReview ? (templatesForm.data.google_review_url || profile?.google_review_url) : "");
    }, [currentTemplateMessage, profile, selectedTemplateTab, templatesForm.data.upi_id, templatesForm.data.google_review_url]);

    const formatLogPhone = (raw) => {
        if (!raw) return "-";
        const clean = String(raw).replace(/\D/g, "");
        if (clean.length === 10) {
            return `+91 ${clean}`;
        }
        if (clean.length === 12 && clean.startsWith("91")) {
            return `+91 ${clean.slice(2)}`;
        }
        if (clean.length === 11 && clean.startsWith("0")) {
            return `+91 ${clean.slice(1)}`;
        }
        return clean ? `+${clean}` : "-";
    };

    // Filtered logs
    const filteredLogs = useMemo(() => {
        if (!logs?.data) return [];
        return logs.data.filter((item) => {
            const matchesSearch =
                !logSearch ||
                (item.recipient_name && item.recipient_name.toLowerCase().includes(logSearch.toLowerCase())) ||
                (item.recipient_phone && (
                    item.recipient_phone.includes(logSearch) ||
                    formatLogPhone(item.recipient_phone).includes(logSearch)
                )) ||
                (item.message && item.message.toLowerCase().includes(logSearch.toLowerCase()));

            const matchesStatus =
                logStatusFilter === "all" ||
                item.status === logStatusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [logs, logSearch, logStatusFilter]);

    const dailyLimit = quota?.daily_limit || 150;
    const usedToday = quota?.used_today || 0;
    const remainingQuota = quota?.remaining || Math.max(0, dailyLimit - usedToday);

    return (
        <AppLayout title="WhatsApp Automation Hub">
            <Head title="WhatsApp Automation Hub - Vama Invoice" />

            {/* ── KPI Metrics Bar (Matching exact purchase-stats-grid of Invoices & Purchase) ── */}
            <div className="purchase-stats-grid cols-5">
                <div className="purchase-stat-compact">
                    <div
                        className="purchase-stat-icon-wrap"
                        style={{
                            background: status === "connected" ? "rgba(5, 150, 105, 0.1)" : "rgba(217, 119, 6, 0.1)",
                            color: status === "connected" ? "var(--success)" : "var(--warning)",
                        }}
                    >
                        <Smartphone size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Connection Status</span>
                        <span
                            className="purchase-stat-num"
                            style={{
                                color: status === "connected" ? "var(--success)" : "var(--warning)",
                                fontSize: 12,
                                lineHeight: 1.25,
                            }}
                            title={status === "connected" ? `Active (+${phone || "Linked"})` : status === "qr_ready" ? "Scan QR Code" : "Disconnected"}
                        >
                            {status === "connected" ? (
                                <>
                                    Active{" "}
                                    <span style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
                                        (+{phone || "Linked"})
                                    </span>
                                </>
                            ) : status === "qr_ready" ? (
                                "Scan QR Code"
                            ) : (
                                "Disconnected"
                            )}
                        </span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--accent)" }}>
                        <ShieldCheck size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Daily Anti-Ban Quota</span>
                        <span className="purchase-stat-num">
                            {usedToday} / {dailyLimit} <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>({remainingQuota} left)</span>
                        </span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(2, 132, 199, 0.1)", color: "var(--info)" }}>
                        <Users size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Total Customer Base</span>
                        <span className="purchase-stat-num">{customerStats?.total_customers || 0}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
                        <IndianRupee size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Pending Vasooli Dues</span>
                        <span className="purchase-stat-num" style={{ color: "var(--danger)" }}>
                            ₹{Number(customerStats?.pending_balance_sum || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                        <Send size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Messages Dispatched</span>
                        <span className="purchase-stat-num">{quota?.total_sent ?? logs?.total ?? 0}</span>
                    </div>
                </div>
            </div>

            {/* ── Main Content Card (Matching exact '.card.page-full-card' structure of Invoices and Inventory) ── */}
            <div className="card page-full-card">
                {/* ── Table Toolbar with Tabs on Left and Actions on Right ── */}
                <div className="table-toolbar">
                    <div className="toolbar-left" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {[
                            { id: "connect", label: "Device Link & QR", icon: Smartphone },
                            ...(isSuperAdmin ? [{ id: "templates", label: "Billing & UPI Templates", icon: Sliders }] : []),
                            { id: "broadcasts", label: "Broadcast Campaigns", icon: Send, badge: broadcastList.some((b) => b.status === "processing") },
                            { id: "logs", label: `Message Logs (${logs?.total || 0})`, icon: Clock },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isSel = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: "5px 12px",
                                        borderRadius: 6,
                                        border: "none",
                                        background: isSel ? "var(--bg-elevated)" : "transparent",
                                        color: isSel ? "var(--accent)" : "var(--text-secondary)",
                                        boxShadow: isSel ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        transition: "all var(--transition)",
                                    }}
                                >
                                    <Icon size={14} />
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: status === "connected" ? "var(--success-bg)" : status === "qr_ready" ? "var(--warning-bg)" : "var(--danger-bg)",
                                color: status === "connected" ? "var(--success)" : status === "qr_ready" ? "var(--warning)" : "var(--danger)",
                                fontSize: 11.5,
                                fontWeight: 600,
                                border: status === "connected" ? "1px solid #a7f3d0" : status === "qr_ready" ? "1px solid #fde68a" : "1px solid #fecdd3",
                            }}
                        >
                            <span
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: status === "connected" ? "var(--success)" : status === "qr_ready" ? "var(--warning)" : "var(--danger)",
                                }}
                            />
                            <span>
                                {status === "connected"
                                    ? `Direct Active (+${phone || "Linked"})`
                                    : status === "qr_ready"
                                    ? "Scan QR Code"
                                    : "Gateway Offline"}
                            </span>
                        </div>

                        {status === "connected" ? (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleLogout}
                                style={{ color: "var(--danger)", borderColor: "#fecdd3" }}
                            >
                                <LogOut size={13} /> Disconnect
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    setActiveTab("connect");
                                    handleConnect();
                                }}
                                disabled={status === "connecting"}
                            >
                                <QrCode size={13} /> {status === "connecting" ? "Generating..." : "Connect WhatsApp"}
                            </button>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    TAB 1: DEVICE LINK & QR SCANNER
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "connect" && (
                    <div style={{ padding: 18, flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                        {/* Left Card: QR Viewport / Connection Status */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                        <Smartphone size={16} color="var(--accent)" /> WhatsApp Gateway Connection
                                    </div>
                                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                                        Link your phone once to enable automated zero-cost WhatsApp messaging.
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleConnect}
                                    disabled={status === "connecting"}
                                >
                                    <RefreshCw size={12} className={status === "connecting" ? "animate-spin" : ""} />
                                    <span>{status === "connected" ? "Refresh Sync" : "Generate QR"}</span>
                                </button>
                            </div>

                            {/* Viewport Box */}
                            <div
                                style={{
                                    border: "2px dashed var(--border)",
                                    borderRadius: "var(--radius-sm)",
                                    background: "var(--bg-base)",
                                    padding: "24px 16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    minHeight: 280,
                                }}
                            >
                                {status === "connected" ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 52,
                                                height: 52,
                                                borderRadius: "50%",
                                                background: "var(--success-bg)",
                                                color: "var(--success)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                border: "1px solid #a7f3d0",
                                            }}
                                        >
                                            <CheckCircle2 size={28} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                                                WhatsApp Connected &amp; Ready
                                            </div>
                                            <div style={{ fontSize: 13, fontFamily: "monospace", color: "var(--text-secondary)", marginTop: 4, fontWeight: 600 }}>
                                                +{phone || "Active"}
                                            </div>
                                            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, maxWidth: 320 }}>
                                                Direct background transmission is active. Invoices, bill edits, and reminders will send silently to customers.
                                            </p>
                                        </div>

                                        <div style={{ marginTop: 4 }}>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={handleLogout}
                                            >
                                                <LogOut size={13} /> Disconnect WhatsApp
                                            </button>
                                        </div>
                                    </div>
                                ) : (qrCode && status === "qr_ready") ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                background: "#fff",
                                                padding: 10,
                                                borderRadius: 10,
                                                border: "2px solid var(--border)",
                                                boxShadow: "var(--shadow-sm)",
                                            }}
                                        >
                                            <img
                                                src={qrCode}
                                                alt="Scan WhatsApp QR"
                                                style={{ width: 190, height: 190, display: "block" }}
                                            />
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                            <RefreshCw size={13} className="animate-spin" color="var(--accent)" />
                                            <span>Point phone camera to scan this QR code</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={handleConnect}
                                            style={{ marginTop: 4, fontSize: 11.5 }}
                                        >
                                            <RefreshCw size={12} /> Regenerate QR Code
                                        </button>
                                    </div>
                                ) : status === "connecting" ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                        <RefreshCw size={26} className="animate-spin" color="var(--accent)" />
                                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                                            {connectingMessage || "Initializing Baileys Socket..."}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", maxWidth: 280 }}>
                                            Connecting to WhatsApp server and negotiating encrypted session keys (takes 3–8 seconds).
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                setStatus("disconnected");
                                                setConnectingMessage("");
                                            }}
                                            style={{ marginTop: 4, fontSize: 11 }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                        {connectionError && (
                                            <div
                                                style={{
                                                    background: "rgba(239, 68, 68, 0.08)",
                                                    color: "#dc2626",
                                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                                    borderRadius: 8,
                                                    padding: "10px 14px",
                                                    fontSize: 12,
                                                    maxWidth: 380,
                                                    textAlign: "left",
                                                    display: "flex",
                                                    gap: 10,
                                                    alignItems: "flex-start",
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <AlertCircle size={18} style={{ shrink: 0, marginTop: 2, color: "#ef4444" }} />
                                                <div style={{ flex: 1 }}>
                                                    <strong style={{ display: "block", marginBottom: 3, fontSize: 12.5, color: "#b91c1c" }}>
                                                        WhatsApp Service Unreachable
                                                    </strong>
                                                    <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "#374151" }}>
                                                        {connectionError.includes("127.0.0.1:3001") ? (
                                                            <span>
                                                                Your live site is trying to connect to <code>127.0.0.1:3001</code> (localhost).
                                                                On live hosting (like Hostinger), you must add your deployed cloud service URL in your <code>.env</code> file:
                                                                <br />
                                                                <code style={{ display: "block", margin: "6px 0", padding: "4px 6px", background: "#f3f4f6", borderRadius: 4, color: "#111827", fontSize: 11 }}>
                                                                    WHATSAPP_SIDECAR_URL=https://your-app.koyeb.app
                                                                </code>
                                                                Then click below to reload your configuration:
                                                                <a
                                                                    href="/clear-cache"
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ display: "inline-block", marginTop: 4, fontWeight: 600, color: "var(--accent)", textDecoration: "underline" }}
                                                                >
                                                                    Click here to clear cache &amp; reload config &rarr;
                                                                </a>
                                                            </span>
                                                        ) : (
                                                            <span>{connectionError}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: "50%",
                                                background: "var(--bg-elevated)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            <QrCode size={22} />
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                                            No Active WhatsApp Session
                                        </div>
                                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", maxWidth: 300, textAlign: "center" }}>
                                            Click below to generate a QR code and connect your merchant phone number in 10 seconds.
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={handleConnect}
                                            style={{ marginTop: 6 }}
                                        >
                                            <QrCode size={13} /> Generate QR Code
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "10px 12px", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <ShieldCheck size={16} color="var(--accent)" style={{ shrink: 0, marginTop: 1 }} />
                                <div>
                                    <strong style={{ color: "var(--text-primary)" }}>Persistent Session: </strong>
                                    Your WhatsApp session is stored locally on your server. Even if the server reboots or restarts, it auto-reconnects automatically without asking you to scan again.
                                </div>
                            </div>
                        </div>

                        {/* Right Card: Send Test Message & Pairing Help */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {/* Test Send Card */}
                            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 10 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                        <Zap size={16} color="var(--warning)" /> Send Live Test Message
                                    </div>
                                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                                        Verify direct delivery to your mobile phone number.
                                    </div>
                                </div>

                                <form onSubmit={handleSendTest} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div className="form-group">
                                        <label className="form-label">Recipient Mobile Number</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. 9876543210 (10 digits)"
                                            value={testForm.data.phone}
                                            onChange={(e) => testForm.setData("phone", e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <label className="form-label">Message Content</label>
                                            <button
                                                type="button"
                                                onClick={() => testForm.setData("message", "Namaste! This is a test notification from Vama Invoice WhatsApp system. ✅")}
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: 11, padding: "0 4px", color: "var(--accent)" }}
                                            >
                                                Reset
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            className="form-input"
                                            value={testForm.data.message}
                                            onChange={(e) => testForm.setData("message", e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={testForm.processing}
                                        className="btn btn-primary"
                                        style={{ justifyContent: "center" }}
                                    >
                                        <Send size={14} />
                                        <span>{testForm.processing ? "Sending..." : "Send Test to Phone"}</span>
                                    </button>
                                </form>
                            </div>

                            {/* Mobile Instructions Card */}
                            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <HelpCircle size={14} color="var(--accent)" /> How to Link on Mobile:
                                </div>
                                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.4 }}>
                                    <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                                    <li>Tap Menu (3 dots) or Settings &gt; <strong>Linked Devices</strong>.</li>
                                    <li>Tap <strong>Link a Device</strong> and authenticate.</li>
                                    <li>Scan the QR code shown on the screen.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 2: BILLING & UPI TEMPLATES (Super Admin Only)
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "templates" && isSuperAdmin && (
                    <form onSubmit={handleSaveTemplates} style={{ padding: 18, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* Top Card: Merchant UPI & Google Review Settings */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <IndianRupee size={16} color="var(--success)" /> Merchant UPI &amp; Google Review Configuration
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                                    These links are automatically attached into invoice notifications and payment reminders for instant customer collection.
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>
                                        Merchant UPI ID (GPay / PhonePe / Paytm VPA)
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. shopname@okhdfcbank or 9876543210@paytm"
                                        value={templatesForm.data.upi_id}
                                        onChange={(e) => templatesForm.setData("upi_id", e.target.value)}
                                    />
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        Customers tap this link to open their UPI app with the exact invoice balance pre-filled.
                                    </span>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600 }}>
                                        Google Maps Review URL
                                    </label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="e.g. https://g.page/r/your-shop/review"
                                        value={templatesForm.data.google_review_url}
                                        onChange={(e) => templatesForm.setData("google_review_url", e.target.value)}
                                    />
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        Included on paid bills so happy customers can rate your business on Google in 1 click.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Template Studio Card */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 14 }}>
                            {/* Template Category Switcher */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--border-light)", paddingBottom: 10 }}>
                                {[
                                    { key: "bill_created", label: "1. New Invoice (Unpaid / Partial)", icon: Receipt },
                                    { key: "bill_paid", label: "2. Payment Receipt (Paid)", icon: CheckCircle2 },
                                    { key: "bill_updated", label: "3. Revised Invoice", icon: FileText },
                                    { key: "partial_payment", label: "4. Partial Payment Received", icon: IndianRupee },
                                    { key: "payment_reminder", label: "5. Customer Reminder", icon: Clock },
                                    { key: "purchase_reminder", label: "6. Purchase Due (To Pay Supplier)", icon: ShoppingBag },
                                    { key: "custom", label: "7. Broadcast & Offers", icon: Sparkles },
                                ].map((t) => {
                                    const Icon = t.icon;
                                    const isSel = selectedTemplateTab === t.key;
                                    return (
                                        <button
                                            type="button"
                                            key={t.key}
                                            className={`btn btn-sm ${isSel ? "btn-primary" : "btn-secondary"}`}
                                            onClick={() => setSelectedTemplateTab(t.key)}
                                            style={{ fontSize: 12, padding: "5px 12px" }}
                                        >
                                            <Icon size={13} />
                                            <span>{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tag Insertion Toolbar */}
                            <div style={{ background: "var(--bg-elevated)", padding: "10px 12px", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                                        Click to Insert Dynamic Tag into Message:
                                    </span>
                                    {copiedTag && (
                                        <span style={{ fontWeight: 600, color: "var(--success)" }}>
                                            ✓ Inserted {copiedTag}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {availablePlaceholders.map((p) => (
                                        <button
                                            type="button"
                                            key={p.tag}
                                            onClick={() => insertPlaceholder(p.tag)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ fontFamily: "monospace", fontSize: 11, padding: "3px 8px" }}
                                            title={p.desc}
                                        >
                                            {p.tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Split Editor and Preview */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                                {/* Left: Message Textarea */}
                                <div className="form-group">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>
                                            Template Body ({selectedTemplateTab.replace("_", " ").toUpperCase()})
                                        </label>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            {currentTemplateMessage.length} characters
                                        </span>
                                    </div>
                                    <textarea
                                        rows={10}
                                        className="form-input"
                                        style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.5 }}
                                        value={currentTemplateMessage}
                                        onChange={(e) =>
                                            templatesForm.setData("templates", {
                                                ...templatesForm.data.templates,
                                                [selectedTemplateTab]: {
                                                    ...templatesForm.data.templates[selectedTemplateTab],
                                                    message: e.target.value,
                                                },
                                            })
                                        }
                                    />
                                </div>

                                {/* Right: Clean WhatsApp Chat Bubble Preview */}
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                        <Eye size={13} color="var(--accent)" /> Customer WhatsApp Preview
                                    </label>
                                    <div
                                        style={{
                                            border: "1px solid var(--border)",
                                            borderRadius: "var(--radius)",
                                            background: "#efeae2",
                                            overflow: "hidden",
                                            display: "flex",
                                            flexDirection: "column",
                                            height: 250,
                                        }}
                                    >
                                        {/* WhatsApp Header */}
                                        <div
                                            style={{
                                                background: "#075e54",
                                                color: "#ffffff",
                                                padding: "8px 12px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: "50%",
                                                    background: "#128c7e",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 11,
                                                }}
                                            >
                                                {(profile?.business_name || "V")[0]}
                                            </div>
                                            <div>
                                                <div>{profile?.business_name || "Vama Enterprises"}</div>
                                                <div style={{ fontSize: 9.5, opacity: 0.8 }}>online</div>
                                            </div>
                                        </div>

                                        {/* Chat Area */}
                                        <div style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                            <div
                                                style={{
                                                    background: "#ffffff",
                                                    borderRadius: 8,
                                                    borderTopLeftRadius: 0,
                                                    padding: "8px 10px",
                                                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                                    fontSize: 11.5,
                                                    color: "#0f172a",
                                                    maxWidth: "88%",
                                                    lineHeight: 1.45,
                                                    whiteSpace: "pre-line",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {previewMessage}
                                                <div style={{ textAlign: "right", fontSize: 9.5, color: "#94a3b8", marginTop: 4, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3 }}>
                                                    <span>12:45 PM</span>
                                                    <span style={{ color: "#38bdf8" }}>✓✓</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Save Action */}
                            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
                                <button
                                    type="submit"
                                    disabled={templatesForm.processing}
                                    className="btn btn-primary"
                                >
                                    <Check size={14} />
                                    <span>{templatesForm.processing ? "Saving..." : "Save Templates & Settings"}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 3: BROADCAST CAMPAIGNS (ANTI-BAN ENGINE)
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "broadcasts" && (
                    <div style={{ padding: 18, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* Anti-Ban Safety Notice */}
                        <div style={{ padding: "12px 16px", borderLeft: "4px solid var(--success)", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <ShieldCheck size={20} color="var(--success)" style={{ shrink: 0, marginTop: 2 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                                        Anti-Ban Protection Engine Active
                                    </div>
                                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                                        Broadcasts are queued with a <strong>randomized delay of 18 to 45 seconds</strong> between each recipient. Greetings are varied (<em>Namaste</em>, <em>Hello</em>, <em>Dear</em>) and capped at 150/day to prevent number blocking.
                                    </div>
                                </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>Daily Quota Used:</span>
                                <strong style={{ fontSize: 14, color: "var(--text-primary)" }}>{usedToday} / {dailyLimit}</strong>
                            </div>
                        </div>

                        {/* Campaign Launcher Form */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <Send size={16} color="var(--accent)" /> Launch New Broadcast Campaign
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                                    Send announcements, promotional offers with images, or recovery reminders directly to your customers' WhatsApp.
                                </div>
                            </div>

                            <form onSubmit={handleCreateBroadcast} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Campaign Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Diwali Dhamaka Offers / New Collection Arrival"
                                            value={broadcastForm.data.title}
                                            onChange={(e) => broadcastForm.setData("title", e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Recipient Audience Mode</label>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => broadcastForm.setData("recipient_mode", "filter")}
                                                style={{
                                                    flex: 1,
                                                    padding: "7px 10px",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    borderRadius: "var(--radius)",
                                                    border: broadcastForm.data.recipient_mode === "filter" ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                                                    background: broadcastForm.data.recipient_mode === "filter" ? "rgba(79, 70, 229, 0.08)" : "var(--bg-card)",
                                                    color: broadcastForm.data.recipient_mode === "filter" ? "var(--accent)" : "var(--text-secondary)",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <Users size={14} /> Saved Customer Segment
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => broadcastForm.setData("recipient_mode", "custom")}
                                                style={{
                                                    flex: 1,
                                                    padding: "7px 10px",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    borderRadius: "var(--radius)",
                                                    border: broadcastForm.data.recipient_mode === "custom" ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                                                    background: broadcastForm.data.recipient_mode === "custom" ? "rgba(79, 70, 229, 0.08)" : "var(--bg-card)",
                                                    color: broadcastForm.data.recipient_mode === "custom" ? "var(--accent)" : "var(--text-secondary)",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <Phone size={14} /> Custom Numbers (Up to 150)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {broadcastForm.data.recipient_mode === "filter" ? (
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Recipient Segment Filter</label>
                                        <select
                                            className="form-input"
                                            value={broadcastForm.data.filter_type}
                                            onChange={(e) => broadcastForm.setData("filter_type", e.target.value)}
                                        >
                                            <option value="all">
                                                All Registered Customers ({customerStats?.total_customers || 0} Saved Parties)
                                            </option>
                                            <option value="pending_balance">
                                                Customers with Pending Dues &gt; ₹0 ({customerStats?.pending_bills_count || 0} Bills • ₹{Number(customerStats?.pending_balance_sum || 0).toLocaleString("en-IN")})
                                            </option>
                                            <option value="inactive_30">
                                                Inactive Customers (No purchase in last 30 days)
                                            </option>
                                            <option value="inactive_60">
                                                Inactive Customers (No purchase in last 60 days)
                                            </option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                            <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                                                Enter Custom Mobile Numbers
                                            </label>
                                            <span style={{
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                color: parsedCustomCount > 150 ? "var(--danger)" : parsedCustomCount > 0 ? "var(--success)" : "var(--text-muted)",
                                                background: parsedCustomCount > 150 ? "rgba(239, 68, 68, 0.1)" : "var(--bg-elevated)",
                                                padding: "2px 8px",
                                                borderRadius: 999,
                                            }}>
                                                {parsedCustomCount} / 150 numbers entered
                                            </span>
                                        </div>
                                        <textarea
                                            rows={4}
                                            className="form-input"
                                            style={{ fontFamily: "monospace", fontSize: 12.5 }}
                                            placeholder={`Paste or enter up to 150 mobile numbers separated by newlines, commas, or spaces:
9876543210
919876543210
+91 98123 45678`}
                                            value={broadcastForm.data.custom_numbers}
                                            onChange={(e) => broadcastForm.setData("custom_numbers", e.target.value)}
                                            required={broadcastForm.data.recipient_mode === "custom"}
                                        />
                                        {parsedCustomCount > 150 ? (
                                            <div style={{ color: "var(--danger)", fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                                                ⚠️ Maximum limit exceeded: You entered {parsedCustomCount} numbers. Please limit to at most 150 numbers per campaign.
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                                Enter any mobile numbers (10 digits or with 91/+91 country code). Invalid or duplicate numbers will be automatically filtered out.
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Attach Campaign File / Image / Document */}
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                        <Paperclip size={14} color="var(--accent)" /> Attach File / Image / Document (Downloadable in Exact Format)
                                    </label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                                            onChange={handleImageChange}
                                            style={{ display: "none" }}
                                            id="broadcast-image-input"
                                        />
                                        <label
                                            htmlFor="broadcast-image-input"
                                            className="btn btn-secondary"
                                            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
                                        >
                                            <Upload size={14} />
                                            <span>{imagePreview ? "Change File" : "Choose File to Attach (Images, PDF, Documents up to 15MB)"}</span>
                                        </label>

                                        {imagePreview && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elevated)", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                                                {broadcastForm.data.image?.type?.startsWith("image/") ? (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }}
                                                    />
                                                ) : (
                                                    <FileText size={28} color="var(--accent)" />
                                                )}
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>
                                                        {broadcastForm.data.image?.name || "file"}
                                                    </span>
                                                    <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                                                        {(broadcastForm.data.image?.size ? (broadcastForm.data.image.size / 1024).toFixed(0) : 0)} KB • Exact downloadable file
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    style={{ border: "none", background: "transparent", color: "var(--danger)", cursor: "pointer", padding: 2, marginLeft: 6 }}
                                                    title="Remove File"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                        Sent as an exact downloadable file share in WhatsApp chats so recipients can download the original file in its exact same format.
                                    </span>
                                </div>

                                {/* Enlarge Broadcast Message Body */}
                                <div className="form-group">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                                            Broadcast Message Body
                                        </label>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            Supports WhatsApp formatting: *bold*, _italic_, ~strikethrough~
                                        </span>
                                    </div>
                                    <textarea
                                        rows={8}
                                        className="form-input"
                                        style={{ fontSize: 13, minHeight: 180, lineHeight: 1.5, fontFamily: "inherit" }}
                                        value={broadcastForm.data.message_template}
                                        onChange={(e) => broadcastForm.setData("message_template", e.target.value)}
                                        placeholder="Type your broadcast announcement or festival offer here..."
                                        required
                                    />
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Insert Tags:</span>
                                        {[
                                            { tag: "{customer_name}", label: "Customer Name" },
                                            { tag: "{shop_name}", label: "Shop Name" },
                                            { tag: "{greeting}", label: "Random Greeting" },
                                            { tag: "{balance_due}", label: "Pending Balance" },
                                        ].map((t) => (
                                            <button
                                                key={t.tag}
                                                type="button"
                                                onClick={() => {
                                                    const cur = broadcastForm.data.message_template || "";
                                                    broadcastForm.setData("message_template", cur + " " + t.tag + " ");
                                                }}
                                                style={{
                                                    fontSize: 11,
                                                    padding: "2px 8px",
                                                    borderRadius: 6,
                                                    border: "1px solid var(--border)",
                                                    background: "var(--bg-elevated)",
                                                    color: "var(--text-primary)",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <code>{t.tag}</code> ({t.label})
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                                    <button
                                        type="submit"
                                        disabled={broadcastForm.processing || (broadcastForm.data.recipient_mode === "custom" && (parsedCustomCount === 0 || parsedCustomCount > 150))}
                                        className="btn btn-primary"
                                        style={{ padding: "8px 18px", fontSize: 13 }}
                                    >
                                        <Play size={14} />
                                        <span>{broadcastForm.processing ? "Launching Campaign..." : "Launch Broadcast Campaign"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Broadcast Campaign History Table */}
                        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-surface)", overflow: "hidden" }}>
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                                    Broadcast Campaign History
                                </div>
                                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{broadcastList.length} Campaigns</span>
                            </div>

                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Target Audience</th>
                                            <th>Status</th>
                                            <th>Progress</th>
                                            <th>Date</th>
                                            <th style={{ textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {broadcastList.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                                                    No broadcast campaigns launched yet. Create your first campaign above.
                                                </td>
                                            </tr>
                                        ) : (
                                            broadcastList.map((b) => {
                                                const pct = b.total_recipients > 0
                                                    ? Math.round(((b.sent_count + b.failed_count) / b.total_recipients) * 100)
                                                    : 0;
                                                const isDoc = b.image_url && !b.image_url.match(/\.(jpeg|jpg|png|webp|gif)$/i);
                                                return (
                                                    <tr key={b.id}>
                                                        <td>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                {b.image_url && !isDoc ? (
                                                                    <img
                                                                        src={b.image_url}
                                                                        alt=""
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                        style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }}
                                                                    />
                                                                ) : b.image_url && isDoc ? (
                                                                    <div style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                                                                        <Paperclip size={14} />
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ width: 28, height: 28, borderRadius: 4, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                                                        <MessageSquare size={13} />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <strong style={{ color: "var(--text-primary)", display: "block", fontSize: 12.5 }}>{b.title}</strong>
                                                                    {b.image_url && (
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                                                            <a
                                                                                href={b.image_url}
                                                                                download={b.file_name || "attachment"}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                style={{
                                                                                    fontSize: 11,
                                                                                    color: "var(--accent)",
                                                                                    fontWeight: 600,
                                                                                    textDecoration: "none",
                                                                                    display: "inline-flex",
                                                                                    alignItems: "center",
                                                                                    gap: 3,
                                                                                }}
                                                                                title="Download exact original file"
                                                                            >
                                                                                <Download size={11} /> {b.file_name || "Download Attached File"}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                                                            {b.recipient_mode === "custom" || b.custom_numbers ? (
                                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                                    <Phone size={12} color="var(--accent)" /> Custom List ({b.total_recipients || "Up to 150"})
                                                                </span>
                                                            ) : (
                                                                <span style={{ textTransform: "capitalize", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                                    <Users size={12} color="var(--info)" /> {b.filter_type ? b.filter_type.replace("_", " ") : "All Customers"}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {b.status === "completed" ? (
                                                                <span style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                                                    Completed
                                                                </span>
                                                            ) : b.status === "processing" ? (
                                                                <span style={{ background: "var(--info-bg)", color: "var(--info)", border: "1px solid #bae6fd", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                                    <RefreshCw size={10} className="spin" /> Sending ({pct}%)
                                                                </span>
                                                            ) : b.status === "paused" ? (
                                                                <span style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                                                    Paused
                                                                </span>
                                                            ) : (
                                                                <span style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
                                                                    {b.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ minWidth: 140 }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                                                                <span>{b.sent_count} / {b.total_recipients}</span>
                                                                <span>{pct}%</span>
                                                            </div>
                                                            <div style={{ width: "100%", background: "var(--border-light)", borderRadius: 99, height: 5, overflow: "hidden" }}>
                                                                <div style={{ width: `${pct}%`, background: "var(--success)", height: "100%" }} />
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                                                            {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                        </td>
                                                        <td style={{ textAlign: "right" }}>
                                                            <div style={{ display: "inline-flex", gap: 4 }}>
                                                                {b.status === "processing" && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={() => handlePauseBroadcast(b.id)}
                                                                        title="Pause Campaign"
                                                                    >
                                                                        <Pause size={12} />
                                                                    </button>
                                                                )}
                                                                {(b.status === "paused" || b.status === "scheduled") && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={() => handleResumeBroadcast(b.id)}
                                                                        title="Resume / Send Now"
                                                                        style={{ color: "var(--success)", borderColor: "var(--success)" }}
                                                                    >
                                                                        <Play size={12} /> Send Now
                                                                    </button>
                                                                )}
                                                                {b.status !== "completed" && b.status !== "cancelled" && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-danger btn-sm"
                                                                        onClick={() => handleCancelBroadcast(b.id)}
                                                                        title="Cancel Campaign"
                                                                    >
                                                                        <XCircle size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 4: TRANSMISSION AUDIT LOGS
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "logs" && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                        {/* Search and Filter Sub-toolbar (matching Invoices/Index.jsx search-input-wrap) */}
                        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "var(--bg-surface)" }}>
                            <div className="search-input-wrap" style={{ width: "100%", maxWidth: 360 }}>
                                <Search size={15} />
                                <input
                                    className="form-input search-input"
                                    placeholder="Search by customer, phone or message..."
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                />
                                {logSearch && (
                                    <button className="btn-icon" onClick={() => setLogSearch("")} style={{ border: "none", background: "none", cursor: "pointer" }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Chips */}
                            <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", padding: 3, borderRadius: 8 }}>
                                {[
                                    { id: "all", label: "All Logs" },
                                    { id: "sent", label: "Delivered" },
                                    { id: "recalled", label: "Recalled" },
                                    { id: "fallback_link", label: "Fallback Link" },
                                    { id: "failed", label: "Failed" },
                                ].map((st) => (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setLogStatusFilter(st.id)}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            padding: "4px 10px",
                                            borderRadius: 6,
                                            border: "none",
                                            background: logStatusFilter === st.id ? "var(--bg-surface)" : "transparent",
                                            color: logStatusFilter === st.id ? "var(--text-primary)" : "var(--text-muted)",
                                            boxShadow: logStatusFilter === st.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full-width Data Table inside page-full-card table-wrap */}
                        <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50 }}>#</th>
                                        <th>Recipient</th>
                                        <th>Trigger Action</th>
                                        <th>Status</th>
                                        <th>Message Snippet</th>
                                        <th>Timestamp</th>
                                        <th style={{ textAlign: "right" }}>Quick Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                                                No message logs match your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((l, idx) => (
                                            <tr key={l.id}>
                                                <td style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{idx + 1}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{l.recipient_name || "Customer"}</div>
                                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{formatLogPhone(l.recipient_phone)}</div>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: 11, background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                                                        {l.trigger_type.replace("_", " ")}
                                                    </code>
                                                </td>
                                                <td>
                                                    {l.status === "sent" ? (
                                                        <span style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                                            Delivered
                                                        </span>
                                                    ) : l.status === "recalled" ? (
                                                        <span style={{ background: "rgba(107, 114, 128, 0.15)", color: "#4b5563", border: "1px solid #d1d5db", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            <RotateCcw size={10} /> Recalled
                                                        </span>
                                                    ) : l.status === "fallback_link" ? (
                                                        <span style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                                            1-Click Link
                                                        </span>
                                                    ) : (
                                                        <span style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #fecdd3", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11.5, color: "var(--text-secondary)" }}>
                                                    {l.status === "recalled" ? (
                                                        <span style={{ fontStyle: "italic", color: "var(--text-muted)", textDecoration: "line-through" }}>
                                                            {l.message}
                                                        </span>
                                                    ) : (
                                                        l.message
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                    {new Date(l.created_at).toLocaleString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                                        {l.status === "sent" && l.message_id && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleRecallMessage(l)}
                                                                disabled={recallingId === l.id}
                                                                title="Recall message (Delete for Everyone on WhatsApp)"
                                                                style={{ fontSize: 11, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                                                            >
                                                                {recallingId === l.id ? (
                                                                    <RefreshCw size={11} className="animate-spin" />
                                                                ) : (
                                                                    <RotateCcw size={11} />
                                                                )}
                                                                <span>Recall</span>
                                                            </button>
                                                        )}
                                                        {l.wa_me_url && (
                                                            <a
                                                                href={l.wa_me_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-secondary btn-sm"
                                                                style={{ fontSize: 11, padding: "2px 8px" }}
                                                            >
                                                                <span>wa.me</span>
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        )}
                                                        {!l.wa_me_url && (!l.message_id || l.status !== "sent") && (
                                                            <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                                                                {l.status === "recalled" ? "Deleted" : "-"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
