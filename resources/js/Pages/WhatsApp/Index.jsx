import React, { useState, useEffect, useMemo } from "react";
import { Head, useForm, router } from "@inertiajs/react";
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
    Percent,
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
    ArrowUpRight,
    FileText,
    Share2,
    Info,
    CheckCheck,
    TrendingUp,
    Lock
} from "lucide-react";

export default function WhatsAppHub({
    sessionStatus,
    templates,
    profile,
    broadcasts = [],
    logs,
    quota,
    customerStats
}) {
    const [activeTab, setActiveTab] = useState("connect");
    const [status, setStatus] = useState(sessionStatus?.status || "disconnected");
    const [phone, setPhone] = useState(sessionStatus?.phone || null);
    const [qrCode, setQrCode] = useState(sessionStatus?.qr || null);
    const [isPolling, setIsPolling] = useState(false);
    const [copiedTag, setCopiedTag] = useState(null);
    const [selectedTemplateTab, setSelectedTemplateTab] = useState("bill_created");
    const [logSearch, setLogSearch] = useState("");
    const [logStatusFilter, setLogStatusFilter] = useState("all");

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
                title: templates?.bill_created?.title || "New Bill Created",
                message: templates?.bill_created?.message || "",
            },
            bill_updated: {
                title: templates?.bill_updated?.title || "Bill Revised / Edited",
                message: templates?.bill_updated?.message || "",
            },
            payment_reminder: {
                title: templates?.payment_reminder?.title || "Payment Reminder (Vasooli)",
                message: templates?.payment_reminder?.message || "",
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
        filter_type: "all",
        message_template: templates?.custom?.message || "Namaste {customer_name} ji! Vishesh offer from {shop_name}.",
    });

    // Auto-poll status when QR is waiting or connecting
    useEffect(() => {
        let interval = null;
        if (status === "qr_ready" || status === "connecting") {
            setIsPolling(true);
            interval = setInterval(async () => {
                try {
                    const res = await fetch("/whatsapp/session/status");
                    if (res.ok) {
                        const data = await res.json();
                        setStatus(data.status);
                        setPhone(data.phone);
                        setQrCode(data.qr);
                        if (data.status === "connected") {
                            clearInterval(interval);
                            setIsPolling(false);
                            router.reload({ only: ["sessionStatus"] });
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

    const handleConnect = () => {
        setStatus("connecting");
        router.post("/whatsapp/session/connect", {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const s = page.props?.sessionStatus;
                if (s) {
                    setStatus(s.status);
                    setPhone(s.phone);
                    setQrCode(s.qr);
                }
            }
        });
    };

    const handleLogout = () => {
        if (!confirm("Are you sure you want to disconnect WhatsApp? You can reconnect anytime by scanning the QR code.")) return;
        router.delete("/whatsapp/session/logout", {
            preserveScroll: true,
            onSuccess: () => {
                setStatus("disconnected");
                setPhone(null);
                setQrCode(null);
            }
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

    const handleCreateBroadcast = (e) => {
        e.preventDefault();
        broadcastForm.post("/whatsapp/broadcasts", {
            preserveScroll: true,
            onSuccess: () => {
                broadcastForm.reset("title");
                setActiveTab("broadcasts");
            }
        });
    };

    const handlePauseBroadcast = (id) => {
        router.post(`/whatsapp/broadcasts/${id}/pause`, {}, { preserveScroll: true });
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
            }
        });
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(null), 1800);
    };

    const availablePlaceholders = [
        { tag: "{customer_name}", desc: "Customer Name", preview: "Rahul Sharma" },
        { tag: "{shop_name}", desc: "Your Store Name", preview: profile?.business_name || "Vama Enterprises" },
        { tag: "{invoice_no}", desc: "Invoice Number", preview: "INV-2026-0089" },
        { tag: "{total_amount}", desc: "Bill Total (₹)", preview: "₹4,500.00" },
        { tag: "{paid_amount}", desc: "Amount Paid (₹)", preview: "₹1,000.00" },
        { tag: "{balance_due}", desc: "Pending Balance (₹)", preview: "₹3,500.00" },
        { tag: "{invoice_link}", desc: "Public Digital Bill Link", preview: "https://vamainvoice.com/i/sample88" },
        { tag: "{upi_link}", desc: "Instant UPI Pay Link", preview: "upi://pay?pa=store@upi&am=3500.00" },
        { tag: "{google_review_link}", desc: "Google Review Link", preview: profile?.google_review_url || "https://g.page/r/sample/review" },
    ];

    const currentTemplateMessage = templatesForm.data.templates[selectedTemplateTab]?.message || "";

    // Simulated phone message preview
    const previewMessage = useMemo(() => {
        return (currentTemplateMessage || "No template message written yet.")
            .replace(/{customer_name}/g, "Rahul Sharma")
            .replace(/{shop_name}/g, profile?.business_name || "Vama Enterprises")
            .replace(/{invoice_no}/g, "INV-2026-0089")
            .replace(/{total_amount}/g, "4,500.00")
            .replace(/{paid_amount}/g, "1,000.00")
            .replace(/{balance_due}/g, "3,500.00")
            .replace(/{invoice_link}/g, "https://vamainvoice.com/i/sample88")
            .replace(/{upi_link}/g, "upi://pay?pa=store@upi&am=3500.00")
            .replace(/{google_review_link}/g, profile?.google_review_url || "https://g.page/r/sample/review")
            .replace(/{greeting}/g, "Namaste");
    }, [currentTemplateMessage, profile]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        if (!logs?.data) return [];
        return logs.data.filter((item) => {
            const matchesSearch =
                !logSearch ||
                (item.recipient_name && item.recipient_name.toLowerCase().includes(logSearch.toLowerCase())) ||
                (item.recipient_phone && item.recipient_phone.includes(logSearch)) ||
                (item.message && item.message.toLowerCase().includes(logSearch.toLowerCase()));

            const matchesStatus =
                logStatusFilter === "all" ||
                item.status === logStatusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [logs, logSearch, logStatusFilter]);

    const dailyLimit = quota?.daily_limit || 150;
    const usedToday = quota?.used_today || 0;
    const quotaPct = Math.min(100, Math.round((usedToday / dailyLimit) * 100));

    return (
        <AppLayout title="WhatsApp Hub">
            <Head title="WhatsApp Automation Hub - Vama Invoice" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* ── TOP HERO HEADER & REAL-TIME STATUS BAR ── */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
                    {/* Background Decorative Rings */}
                    <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute right-40 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span>100% Free • ₹0 Per Message • Direct Baileys Microservice</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                                <span>WhatsApp Automation Hub</span>
                            </h1>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                                Deliver real-time GST invoices, automated payment reminders (Vasooli), instant UPI deep-links, and anti-ban customer broadcast campaigns directly from your own WhatsApp number.
                            </p>
                        </div>

                        {/* Gateway Status Badge & Quick CTA */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-semibold backdrop-blur-md transition shadow-sm ${
                                status === "connected"
                                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                                    : status === "qr_ready"
                                    ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                                    : "bg-rose-500/20 border-rose-400/40 text-rose-200"
                            }`}>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                        status === "connected"
                                            ? "bg-emerald-400"
                                            : status === "qr_ready"
                                            ? "bg-amber-400"
                                            : "bg-rose-400"
                                    }`} />
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                        status === "connected"
                                            ? "bg-emerald-400"
                                            : status === "qr_ready"
                                            ? "bg-amber-400"
                                            : "bg-rose-400"
                                    }`} />
                                </span>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Gateway Status</p>
                                    <p className="text-xs font-bold">
                                        {status === "connected"
                                            ? `Direct Active (+${phone || "Connected"})`
                                            : status === "qr_ready"
                                            ? "Waiting for QR Scan"
                                            : "Disconnected"}
                                    </p>
                                </div>
                            </div>

                            {status === "connected" ? (
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/30 text-white hover:text-rose-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                                    title="Unlink WhatsApp session"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Disconnect</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("connect");
                                        handleConnect();
                                    }}
                                    disabled={status === "connecting"}
                                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>{status === "connecting" ? "Generating..." : "Pair Phone Now"}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Executive Metric Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/10">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/5">
                            <div className="flex items-center gap-2 text-slate-300 text-xs">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                <span>Engine Mode</span>
                            </div>
                            <p className="text-base font-extrabold text-white mt-1">
                                {status === "connected" ? "Direct Background" : "Waiting for Pairing"}
                            </p>
                            <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">
                                ₹0 / Message • No Per-SMS Cost
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/5">
                            <div className="flex items-center justify-between text-slate-300 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Anti-Ban Safety Cap</span>
                                </span>
                                <span className="font-mono text-emerald-300 font-bold">{usedToday}/{dailyLimit}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        quotaPct > 85 ? "bg-rose-400" : quotaPct > 60 ? "bg-amber-400" : "bg-emerald-400"
                                    }`}
                                    style={{ width: `${quotaPct}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                {quota?.remaining || dailyLimit} messages safe remaining today
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/5">
                            <div className="flex items-center gap-2 text-slate-300 text-xs">
                                <Users className="w-3.5 h-3.5 text-blue-400" />
                                <span>Audience Reach</span>
                            </div>
                            <p className="text-base font-extrabold text-white mt-1 font-mono">
                                {customerStats?.total_customers || 0} Customers
                            </p>
                            <p className="text-[11px] text-indigo-300 mt-0.5">
                                {customerStats?.pending_bills_count || 0} with overdue balance
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/5">
                            <div className="flex items-center gap-2 text-slate-300 text-xs">
                                <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                                <span>Total Dispatches</span>
                            </div>
                            <p className="text-base font-extrabold text-white mt-1 font-mono">
                                {quota?.total_sent ?? logs?.total ?? 0} Delivered
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Instant auto-triggers on bills
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── TAB NAVIGATION BAR ── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
                    {[
                        { id: "connect", label: "Device Link & QR Pairing", icon: Smartphone, subtitle: "Connect merchant WhatsApp" },
                        { id: "templates", label: "Billing & UPI Templates", icon: Sliders, subtitle: "Customize triggers & UPI" },
                        { id: "broadcasts", label: "Anti-Ban Broadcasts", icon: Send, badge: broadcasts.some(b => b.status === "processing"), subtitle: "Customer campaigns" },
                        { id: "logs", label: "Transmission History", icon: Clock, count: logs?.total || 0, subtitle: "Full delivery logs" },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[200px] flex items-center gap-3 px-4 py-3 rounded-xl text-left transition cursor-pointer select-none ${
                                    isActive
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                                    isActive
                                        ? "bg-white/10 text-emerald-400"
                                        : "bg-slate-100 text-slate-500"
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold truncate">{tab.label}</span>
                                        {tab.badge && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                        )}
                                        {tab.count !== undefined && !isActive && (
                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-bold">
                                                {tab.count}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                                        {tab.subtitle}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ══════════════════════════════════════════════════════════
                    TAB 1: DEVICE LINK & QR PAIRING
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "connect" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Live Gateway Pairing Console */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-7 shadow-xs space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Smartphone className="w-5 h-5 text-emerald-600" />
                                            <span>WhatsApp Merchant Gateway</span>
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Self-hosted Baileys socket. Runs on your server with zero third-party dependency.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleConnect}
                                            disabled={status === "connecting"}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
                                            <span>{status === "connected" ? "Refresh Sync" : "Generate Fresh QR"}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* QR Viewport / Active Session Status */}
                                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 flex flex-col items-center justify-center text-center min-h-[360px] relative overflow-hidden">
                                    {status === "connected" ? (
                                        <div className="space-y-4 max-w-md animate-fade-in">
                                            <div className="w-20 h-20 rounded-3xl bg-emerald-100 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/10">
                                                <CheckCircle2 className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    Direct Transmission Active
                                                </span>
                                                <h3 className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
                                                    +{phone || "Active"}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                                    Your merchant WhatsApp is connected. All invoices, bill edits, and reminders will be dispatched directly in the background.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Socket Protocol</p>
                                                    <p className="text-xs font-semibold text-slate-800 mt-0.5">Multi-Device WebSockets</p>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Reconnection</p>
                                                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">Auto-Heals On Restart</p>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    type="button"
                                                    onClick={handleLogout}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
                                                    <span>Disconnect Phone & Remove Session</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (qrCode && status === "qr_ready") ? (
                                        <div className="space-y-5 max-w-md animate-fade-in">
                                            {/* Crisp QR Container */}
                                            <div className="relative inline-block p-4 bg-white rounded-3xl shadow-xl border-4 border-slate-900">
                                                <img
                                                    src={qrCode}
                                                    alt="Scan WhatsApp QR"
                                                    className="w-56 h-56 md:w-60 md:h-60 object-contain rounded-xl"
                                                />
                                                <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-white shadow-sm">
                                                        Scan with WhatsApp
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-sm font-extrabold text-slate-800 flex items-center justify-center gap-2">
                                                    <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                                                    Point Phone Camera to Scan
                                                </p>
                                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                                    Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device.
                                                </p>
                                            </div>
                                        </div>
                                    ) : status === "connecting" ? (
                                        <div className="space-y-4 max-w-xs animate-fade-in">
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                                                <RefreshCw className="w-8 h-8 animate-spin" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800">Initializing Baileys Socket...</h3>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Generating high-entropy crypto keys and establishing WebSocket gateway on port 3001.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-5 max-w-sm animate-fade-in">
                                            <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 text-slate-400 mx-auto flex items-center justify-center shadow-sm">
                                                <QrCode className="w-10 h-10 text-slate-700" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-extrabold text-slate-900">No Active WhatsApp Session</h3>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    Link your phone once to enable automated zero-cost WhatsApp billing, payment reminders, and customer broadcasts.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleConnect}
                                                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                                            >
                                                <QrCode className="w-4 h-4" />
                                                <span>Generate WhatsApp QR Code</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Persistent Security Note */}
                                <div className="bg-gradient-to-r from-indigo-50/60 to-slate-50 border border-indigo-100/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-slate-700">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">End-to-End Encrypted & Persistent Session</p>
                                        <p className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">
                                            Your session keys are stored locally on your server in <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">whatsapp-service/auth_sessions</code>. Even if your computer or VPS reboots, the connection auto-reconnects seamlessly without needing another scan.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Direct Live Test Dispatch & Illustrated Guide */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Live Test Message Card */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
                                <div className="border-b border-slate-100 pb-3">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span>Send Live Test Message</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Verify direct background delivery without opening WhatsApp Web.
                                    </p>
                                </div>

                                <form onSubmit={handleSendTest} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Recipient Mobile Number
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">
                                                +91
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="9876543210 (10-digit number)"
                                                value={testForm.data.phone}
                                                onChange={(e) => testForm.setData("phone", e.target.value)}
                                                className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 pl-11 pr-3 font-mono font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-semibold text-slate-700">
                                                Test Message Body
                                            </label>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => testForm.setData("message", "Namaste! This is a test notification from Vama Invoice WhatsApp system. ✅")}
                                                    className="text-[10px] text-indigo-600 hover:underline font-semibold"
                                                >
                                                    [Reset]
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={testForm.data.message}
                                            onChange={(e) => testForm.setData("message", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 leading-relaxed font-sans"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={testForm.processing}
                                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md shadow-slate-900/10 disabled:opacity-50 cursor-pointer"
                                    >
                                        <Send className="w-4 h-4 text-emerald-400" />
                                        <span>{testForm.processing ? "Transmitting via Baileys..." : "Dispatch Direct Test Message"}</span>
                                    </button>
                                </form>
                            </div>

                            {/* 3-Step Illustrated Mobile Guide */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                                    <span>How to Link Your WhatsApp in 10s:</span>
                                </h4>

                                <div className="space-y-3 pt-1">
                                    {[
                                        { step: "1", title: "Open WhatsApp on Phone", desc: "Open your personal or business WhatsApp app." },
                                        { step: "2", title: "Go to Linked Devices", desc: "Tap Menu (⋮ on Android) or Settings (iPhone) ➔ Linked Devices." },
                                        { step: "3", title: "Tap Link a Device", desc: "Scan the QR code shown on the left screen with your camera." },
                                    ].map((s) => (
                                        <div key={s.step} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                {s.step}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{s.title}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 2: BILLING & PAYMENT TEMPLATES + SIMULATOR
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "templates" && (
                    <form onSubmit={handleSaveTemplates} className="space-y-6">
                        {/* Global Merchant UPI ID & Google Review Setting */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                                    <span>Merchant UPI & Google Review Settings</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    These credentials dynamically populate your UPI payment links and customer review triggers across all invoices.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Merchant UPI ID / VPA</span>
                                        </label>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                            GPay • PhonePe • Paytm • BHIM
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="e.g. yourstore@okhdfcbank or 9876543210@paytm"
                                        value={templatesForm.data.upi_id}
                                        onChange={(e) => templatesForm.setData("upi_id", e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 font-mono font-bold"
                                    />
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Generates a 1-tap <code className="bg-white px-1 py-0.5 rounded border text-[10px]">upi://pay</code> link where the exact invoice balance is automatically filled for customers.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                            <span>Google Maps Review URL</span>
                                        </label>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                            5-Star Boost
                                        </span>
                                    </div>
                                    <input
                                        type="url"
                                        placeholder="e.g. https://g.page/r/your-shop/review"
                                        value={templatesForm.data.google_review_url}
                                        onChange={(e) => templatesForm.setData("google_review_url", e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3"
                                    />
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Included on paid bills so satisfied customers can rate your shop in 1-click on Google Maps.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Template Studio with Split Mobile Simulator */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-7 shadow-xs space-y-6">
                            {/* Template Category Selector */}
                            <div className="flex flex-wrap border-b border-slate-200 gap-2 pb-3">
                                {[
                                    { key: "bill_created", label: "1. New Bill Created", icon: Receipt },
                                    { key: "bill_updated", label: "2. Bill Revised / Edited", icon: FileText },
                                    { key: "payment_reminder", label: "3. Payment Reminder (Vasooli)", icon: IndianRupee },
                                    { key: "custom", label: "4. Festival & Broadcast", icon: Sparkles },
                                ].map((t) => {
                                    const Icon = t.icon;
                                    const isSel = selectedTemplateTab === t.key;
                                    return (
                                        <button
                                            type="button"
                                            key={t.key}
                                            onClick={() => setSelectedTemplateTab(t.key)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                isSel
                                                    ? "bg-slate-900 text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${isSel ? "text-emerald-400" : "text-slate-500"}`} />
                                            <span>{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Clickable Placeholders Tag Toolbar */}
                            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Click to Insert Dynamic Tag into Message:</span>
                                    </span>
                                    {copiedTag && (
                                        <span className="font-bold text-emerald-600 inline-flex items-center gap-1 text-[11px] animate-pulse">
                                            <Check className="w-3 h-3" /> Inserted {copiedTag}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {availablePlaceholders.map((p) => (
                                        <button
                                            type="button"
                                            key={p.tag}
                                            onClick={() => insertPlaceholder(p.tag)}
                                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-xs font-mono font-medium text-slate-700 transition shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
                                            title={`${p.desc} (e.g. ${p.preview})`}
                                        >
                                            <span>{p.tag}</span>
                                            <span className="text-[10px] text-slate-400 font-sans">({p.desc})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Split Editor and WhatsApp Phone Simulator */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2 items-start">
                                {/* Left (7 cols): Full-Height Textarea Editor */}
                                <div className="lg:col-span-7 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800">
                                            Message Template ({selectedTemplateTab.replace("_", " ").toUpperCase()})
                                        </label>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            {currentTemplateMessage.length} characters
                                        </span>
                                    </div>
                                    <textarea
                                        rows={14}
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
                                        className="w-full text-xs font-mono rounded-2xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-4 leading-relaxed shadow-inner"
                                        placeholder="Type your message template here using tags like {customer_name}, {total_amount}, {invoice_link}..."
                                    />
                                </div>

                                {/* Right (5 cols): WhatsApp Smartphone Chat Mockup */}
                                <div className="lg:col-span-5 space-y-3">
                                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Customer WhatsApp Simulator (Live Preview)</span>
                                    </label>

                                    {/* Phone Bezel */}
                                    <div className="w-full max-w-[340px] mx-auto rounded-[38px] border-4 border-slate-800 bg-slate-900 p-2.5 shadow-2xl">
                                        {/* Phone Notch / Speaker */}
                                        <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2" />

                                        {/* WhatsApp App Screen */}
                                        <div className="rounded-[28px] overflow-hidden bg-[#EFEAE2] flex flex-col h-[460px] border border-slate-700/50 relative shadow-inner">
                                            {/* WhatsApp Header Bar */}
                                            <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold">
                                                        {(profile?.business_name || "V")[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold leading-tight truncate max-w-[150px]">
                                                            {profile?.business_name || "Vama Enterprises"}
                                                        </p>
                                                        <p className="text-[9px] text-emerald-200 leading-tight">online</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Phone className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            {/* WhatsApp Chat Body */}
                                            <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
                                                <div className="text-center">
                                                    <span className="px-2 py-0.5 rounded-md bg-white/70 text-[9px] text-slate-500 font-semibold shadow-2xs">
                                                        TODAY
                                                    </span>
                                                </div>

                                                {/* Chat Bubble */}
                                                <div className="self-start max-w-[88%] bg-white rounded-2xl rounded-tl-none p-3 shadow-sm text-xs text-slate-900 space-y-2 relative">
                                                    <div className="whitespace-pre-line break-words text-[11px] leading-relaxed font-sans">
                                                        {previewMessage}
                                                    </div>

                                                    {/* Simulated Dynamic Action Buttons inside WhatsApp */}
                                                    <div className="pt-1 space-y-1.5 border-t border-slate-100">
                                                        <div className="w-full py-1.5 px-2 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-1 border border-emerald-200">
                                                            <IndianRupee className="w-3 h-3" />
                                                            <span>Instant UPI Pay: ₹3,500.00</span>
                                                        </div>
                                                        <div className="w-full py-1.5 px-2 bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-1 border border-slate-200">
                                                            <FileText className="w-3 h-3" />
                                                            <span>Download Signed PDF</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                                                        <span>12:45 PM</span>
                                                        <CheckCheck className="w-3 h-3 text-sky-500" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* WhatsApp Chat Input Footer */}
                                            <div className="p-2 bg-[#F0F2F5] flex items-center gap-2 shrink-0 border-t border-slate-200/50">
                                                <div className="flex-1 bg-white rounded-full py-1.5 px-3 text-[10px] text-slate-400">
                                                    Message...
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-[#00A884] text-white flex items-center justify-center">
                                                    <Send className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Save Button */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-xs text-slate-500">
                                    Changes take effect immediately across all automated billing triggers.
                                </span>
                                <button
                                    type="submit"
                                    disabled={templatesForm.processing}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/15 transition disabled:opacity-50 cursor-pointer"
                                >
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span>{templatesForm.processing ? "Saving Templates..." : "Save All Templates & Settings"}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 3: ANTI-BAN BROADCAST CAMPAIGNS
                   ══════════════════════════════════════════════════════════ */}
                {activeTab === "broadcasts" && (
                    <div className="space-y-6">
                        {/* Anti-Ban Safety Architecture Card */}
                        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                                        Anti-Ban Intelligent Safety Engine Active
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                            Zero Ban Risk
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                                        Bulk messages are queued and sent one-by-one with a <strong>randomized delay of 18 to 45 seconds</strong> between each message. Salutations are automatically rotated (<em>Namaste</em>, <em>Hello</em>, <em>Dear</em>) so no two messages share the same hash.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm shrink-0 min-w-[210px] text-center">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Daily Safe Limit</p>
                                <p className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono">
                                    {usedToday} / {dailyLimit}
                                </p>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-1.5 rounded-full"
                                        style={{ width: `${quotaPct}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-emerald-600 font-bold mt-1.5">
                                    {quota?.remaining || dailyLimit} messages safe remaining
                                </p>
                            </div>
                        </div>

                        {/* Broadcast Creator Studio */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-7 shadow-xs space-y-5">
                            <div className="border-b border-slate-100 pb-3">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-emerald-600" />
                                    <span>Launch Customer Broadcast Campaign</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Broadcast festival greetings, special clearance offers, or mass balance recovery reminders.
                                </p>
                            </div>

                            <form onSubmit={handleCreateBroadcast} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Campaign Title
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Diwali Dhamaka Offers / Overdue Vasooli Drive"
                                            value={broadcastForm.data.title}
                                            onChange={(e) => broadcastForm.setData("title", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 font-semibold"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Target Audience Filter
                                        </label>
                                        <select
                                            value={broadcastForm.data.filter_type}
                                            onChange={(e) => broadcastForm.setData("filter_type", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-white font-medium"
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
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Broadcast Message Body
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={broadcastForm.data.message_template}
                                        onChange={(e) => broadcastForm.setData("message_template", e.target.value)}
                                        className="w-full text-xs font-mono rounded-2xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-3.5 leading-relaxed"
                                        placeholder="Namaste {customer_name}! Vishesh Diwali offer from {shop_name}..."
                                        required
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Supported tags: <code className="text-slate-600 font-mono">{'{customer_name}'}</code>, <code className="text-slate-600 font-mono">{'{shop_name}'}</code>, <code className="text-slate-600 font-mono">{'{balance_due}'}</code>, <code className="text-slate-600 font-mono">{'{greeting}'}</code>.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={broadcastForm.processing}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                                    >
                                        <Play className="w-4 h-4 text-emerald-400" />
                                        <span>{broadcastForm.processing ? "Queueing Safe Campaign..." : "Queue Broadcast in Background"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Campaign History Table */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Broadcast Campaign History
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Monitor queued delivery progress, pause active jobs, or review completion rates.
                                    </p>
                                </div>
                                <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {broadcasts.length} Campaigns
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10.5px] tracking-wider">
                                        <tr>
                                            <th className="py-3 px-5">Campaign Title</th>
                                            <th className="py-3 px-5">Audience Segment</th>
                                            <th className="py-3 px-5">Status</th>
                                            <th className="py-3 px-5">Progress</th>
                                            <th className="py-3 px-5">Launch Date</th>
                                            <th className="py-3 px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {broadcasts.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                                                    No broadcast campaigns launched yet. Create your first campaign above!
                                                </td>
                                            </tr>
                                        ) : (
                                            broadcasts.map((b) => {
                                                const pct = b.total_recipients > 0
                                                    ? Math.round(((b.sent_count + b.failed_count) / b.total_recipients) * 100)
                                                    : 0;
                                                return (
                                                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                                                        <td className="py-3.5 px-5 font-bold text-slate-900">
                                                            {b.title}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-slate-600 capitalize">
                                                            {b.filter_type.replace("_", " ")}
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            {b.status === "completed" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    Completed
                                                                </span>
                                                            ) : b.status === "processing" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                                                    Sending Throttled...
                                                                </span>
                                                            ) : b.status === "paused" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                                                                    Paused
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                                                    {b.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-5 min-w-[150px]">
                                                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
                                                                <span>{b.sent_count} / {b.total_recipients}</span>
                                                                <span>{pct}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-5 text-slate-500 text-xs">
                                                            {new Date(b.created_at).toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right space-x-1">
                                                            {b.status === "processing" && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handlePauseBroadcast(b.id)}
                                                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                                                        title="Pause Campaign"
                                                                    >
                                                                        <Pause className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCancelBroadcast(b.id)}
                                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                                        title="Cancel Campaign"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
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
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
                        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">
                                    WhatsApp Transmission Logs
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Complete audit trail of background automated transmissions and fallback links.
                                </p>
                            </div>

                            {/* Search and Filter Ribbon */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="Search customer, phone, text..."
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 w-52 md:w-64"
                                    />
                                </div>

                                <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                                    {["all", "sent", "fallback_link", "failed"].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setLogStatusFilter(f)}
                                            className={`px-2.5 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                                                logStatusFilter === f
                                                    ? "bg-white text-slate-900 shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-900"
                                            }`}
                                        >
                                            {f === "fallback_link" ? "Fallback" : f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10.5px] tracking-wider">
                                    <tr>
                                        <th className="py-3 px-5">Recipient</th>
                                        <th className="py-3 px-5">Trigger Action</th>
                                        <th className="py-3 px-5">Status</th>
                                        <th className="py-3 px-5">Message Snippet</th>
                                        <th className="py-3 px-5">Timestamp</th>
                                        <th className="py-3 px-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                                                No message logs match your filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((l) => (
                                            <tr key={l.id} className="hover:bg-slate-50/60 transition">
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                            {(l.recipient_name || "C")[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{l.recipient_name || "Customer"}</p>
                                                            <p className="text-[11px] text-slate-500 font-mono">+{l.recipient_phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-slate-100 text-slate-700 uppercase font-mono">
                                                        {l.trigger_type.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    {l.status === "sent" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            Direct Delivered
                                                        </span>
                                                    ) : l.status === "fallback_link" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                            <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                                                            Fallback Link
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate text-xs font-sans">
                                                    {l.message}
                                                </td>
                                                <td className="py-3.5 px-5 text-slate-500 text-xs whitespace-nowrap">
                                                    {new Date(l.created_at).toLocaleString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    {l.wa_me_url ? (
                                                        <a
                                                            href={l.wa_me_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
                                                        >
                                                            <span>wa.me</span>
                                                            <ArrowUpRight className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
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
