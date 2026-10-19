import React, { useState, useEffect } from "react";
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
    Eye
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
    const [copiedPlaceholder, setCopiedPlaceholder] = useState(null);
    const [selectedTemplateTab, setSelectedTemplateTab] = useState("bill_created");

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
                title: templates?.bill_updated?.title || "Bill Updated",
                message: templates?.bill_updated?.message || "",
            },
            payment_reminder: {
                title: templates?.payment_reminder?.title || "Payment Reminder",
                message: templates?.payment_reminder?.message || "",
            },
            custom: {
                title: templates?.custom?.title || "Customer Broadcast",
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
        if (!confirm("Are you sure you want to disconnect WhatsApp? You can reconnect anytime by scanning QR.")) return;
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
        setCopiedPlaceholder(tag);
        setTimeout(() => setCopiedPlaceholder(null), 1800);
    };

    const availablePlaceholders = [
        { tag: "{customer_name}", desc: "Customer Name" },
        { tag: "{shop_name}", desc: "Shop/Business Name" },
        { tag: "{invoice_no}", desc: "Invoice Number" },
        { tag: "{total_amount}", desc: "Grand Total" },
        { tag: "{paid_amount}", desc: "Amount Paid" },
        { tag: "{balance_due}", desc: "Pending Balance" },
        { tag: "{invoice_link}", desc: "Public Web Invoice URL" },
        { tag: "{upi_link}", desc: "Instant UPI Pay Link" },
        { tag: "{google_review_link}", desc: "Google Review URL" },
    ];

    const currentTemplateMessage = templatesForm.data.templates[selectedTemplateTab]?.message || "";

    // Live preview generator for templates
    const previewMessage = currentTemplateMessage
        .replace(/{customer_name}/g, "Rahul Sharma")
        .replace(/{shop_name}/g, profile?.business_name || "Vama Enterprises")
        .replace(/{invoice_no}/g, "INV-2026-0042")
        .replace(/{total_amount}/g, "4,500.00")
        .replace(/{paid_amount}/g, "1,000.00")
        .replace(/{balance_due}/g, "3,500.00")
        .replace(/{invoice_link}/g, "https://vamainvoice.com/i/sample88")
        .replace(/{upi_link}/g, "upi://pay?pa=store@upi&am=3500.00")
        .replace(/{google_review_link}/g, profile?.google_review_url || "https://g.page/r/sample/review")
        .replace(/{greeting}/g, "Namaste");

    return (
        <AppLayout title="WhatsApp Hub">
            <Head title="WhatsApp Automation Hub - Vama Invoice" />

            <div className="max-w-7xl mx-auto space-y-5 pb-10">
                {/* ── Top Header & KPI Bar ── */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                    WhatsApp Automation Hub
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                    100% Free • ₹0 Cost
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Automated invoice dispatches, instant UPI payment links, and safe anti-ban broadcasts.
                            </p>
                        </div>
                    </div>

                    {/* KPI Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Live Status Chip */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                            status === "connected"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : status === "qr_ready"
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                status === "connected"
                                    ? "bg-emerald-500 animate-pulse"
                                    : status === "qr_ready"
                                    ? "bg-amber-500 animate-ping"
                                    : "bg-slate-400"
                            }`} />
                            <span>
                                {status === "connected"
                                    ? `Connected (+${phone || "Active"})`
                                    : status === "qr_ready"
                                    ? "Scan QR Code"
                                    : "Disconnected"}
                            </span>
                        </div>

                        {/* Daily Quota Chip */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Anti-Ban Safety Cap:</span>
                            <strong className="text-slate-900 font-mono">
                                {quota?.used_today || 0}/{quota?.daily_limit || 150}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* ── Segmented Navigation Tabs ── */}
                <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs gap-1 overflow-x-auto">
                    {[
                        { id: "connect", label: "Device Link & QR Scanner", icon: QrCode },
                        { id: "templates", label: "Billing & UPI Templates", icon: Sliders },
                        { id: "broadcasts", label: "Broadcast Campaigns", icon: Send, badge: broadcasts.some(b => b.status === "processing") },
                        { id: "logs", label: "Transmission Logs", icon: Clock },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── TAB 1: CONNECT & PAIRING ── */}
                {activeTab === "connect" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Live Scanner Card */}
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-emerald-600" />
                                        WhatsApp Device Pairing
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Connect your merchant phone number once to enable zero-cost automated delivery.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleConnect}
                                        disabled={status === "connecting"}
                                        className="btn btn-primary"
                                        style={{ background: "#4f46e5", color: "#fff", padding: "6px 14px", fontSize: "12px", borderRadius: "8px" }}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
                                        <span>{status === "connected" ? "Refresh Connection" : "Generate QR Code"}</span>
                                    </button>

                                    {status === "connected" && (
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="btn btn-secondary text-rose-600 hover:bg-rose-50"
                                            style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "8px" }}
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>Disconnect</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Viewport Box */}
                            <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/75 flex flex-col items-center justify-center text-center min-h-[340px]">
                                {status === "connected" ? (
                                    <div className="space-y-4 max-w-sm">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-extrabold text-slate-900">Direct Delivery Active</h3>
                                            <p className="text-xs text-slate-600 mt-1">
                                                Connected Number: <strong className="font-mono text-slate-900">+{phone}</strong>
                                            </p>
                                            <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                                                <p className="font-semibold text-slate-700">✓ Silent Headless Transmission</p>
                                                <p>Invoices, payment reminders, and broadcasts land directly in your customer's chat in the background.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (qrCode && status === "qr_ready") ? (
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-white rounded-2xl shadow-md border-2 border-slate-800/80 inline-block relative">
                                            <img
                                                src={qrCode}
                                                alt="WhatsApp QR Code"
                                                className="w-56 h-56 object-contain rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                                                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                                                Point phone camera to scan...
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                WhatsApp &gt; Linked Devices &gt; Link a Device &gt; Scan this QR.
                                            </p>
                                        </div>
                                    </div>
                                ) : status === "connecting" ? (
                                    <div className="space-y-3">
                                        <RefreshCw className="w-9 h-9 text-indigo-600 animate-spin mx-auto" />
                                        <p className="text-sm font-bold text-slate-800">Initializing Baileys Socket...</p>
                                        <p className="text-xs text-slate-400 max-w-xs">
                                            Generating encrypted session and securing local token keystore.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-xs">
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 mx-auto flex items-center justify-center shadow-2xs">
                                            <QrCode className="w-7 h-7 text-slate-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900">No Active WhatsApp Session</h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Click below to generate a QR code and link your phone for 100% free direct sending.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleConnect}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
                                        >
                                            <QrCode className="w-4 h-4" />
                                            <span>Scan QR to Connect</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Info Callout */}
                            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-950">
                                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Persistent Session Memory: </span>
                                    Once paired, your session is saved locally. Even when your server reboots or restarts, it automatically reconnects without requiring another scan.
                                </div>
                            </div>
                        </div>

                        {/* Test Message & Pairing Help */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* Send Live Test Box */}
                            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-indigo-600" />
                                        Send Live Test Message
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Verify direct background delivery to your personal phone number.
                                    </p>
                                </div>

                                <form onSubmit={handleSendTest} className="space-y-3.5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Recipient Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 9876543210 (10-digit number)"
                                            value={testForm.data.phone}
                                            onChange={(e) => testForm.setData("phone", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 font-mono"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Message Content
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={testForm.data.message}
                                            onChange={(e) => testForm.setData("message", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-2.5 leading-relaxed font-sans"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={testForm.processing}
                                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                                    >
                                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{testForm.processing ? "Transmitting..." : "Send Test to Phone"}</span>
                                    </button>
                                </form>
                            </div>

                            {/* Step-by-Step Instructions */}
                            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                                    How to Pair on Mobile:
                                </h4>
                                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
                                    <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                                    <li>Go to <strong>Settings</strong> (or 3-dots menu) &gt; <strong>Linked Devices</strong>.</li>
                                    <li>Tap <strong>Link a Device</strong> and authenticate with fingerprint/face ID.</li>
                                    <li>Scan the QR code shown on this screen.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 2: BILLING & PAYMENT TEMPLATES ── */}
                {activeTab === "templates" && (
                    <form onSubmit={handleSaveTemplates} className="space-y-5">
                        {/* Merchant UPI ID & Google Review Setting */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                                    Merchant UPI ID & Google Reviews URL
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    These links are automatically attached into every invoice summary and WhatsApp payment reminder.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Merchant UPI ID (e.g. Google Pay / PhonePe / Paytm VPA)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. shopname@okhdfcbank or 9876543210@paytm"
                                        value={templatesForm.data.upi_id}
                                        onChange={(e) => templatesForm.setData("upi_id", e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 font-mono"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Customers tap this link to launch their UPI app with the exact bill balance pre-filled!
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Google Maps Review URL
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="e.g. https://g.page/r/your-shop/review"
                                        value={templatesForm.data.google_review_url}
                                        onChange={(e) => templatesForm.setData("google_review_url", e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Included on new bills to turn delighted customers into 5-star Google ratings.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Template Workspace */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                            {/* Template Selector Tabs */}
                            <div className="flex border-b border-slate-200 gap-2 pb-2 overflow-x-auto">
                                {[
                                    { key: "bill_created", label: "1. New Bill Created" },
                                    { key: "bill_updated", label: "2. Bill Revised / Edited" },
                                    { key: "payment_reminder", label: "3. Payment Reminder (Vasooli)" },
                                    { key: "custom", label: "4. Festival & Broadcast" },
                                ].map((t) => (
                                    <button
                                        type="button"
                                        key={t.key}
                                        onClick={() => setSelectedTemplateTab(t.key)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            selectedTemplateTab === t.key
                                                ? "bg-indigo-600 text-white shadow-2xs"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Clickable Placeholders Toolbar */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="font-semibold text-slate-700 uppercase tracking-wider">
                                        Click to Insert Dynamic Tag:
                                    </span>
                                    {copiedPlaceholder && (
                                        <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Inserted {copiedPlaceholder}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {availablePlaceholders.map((p) => (
                                        <button
                                            type="button"
                                            key={p.tag}
                                            onClick={() => insertPlaceholder(p.tag)}
                                            className="px-2 py-0.5 rounded-md bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-[11px] font-mono text-slate-700 transition shadow-2xs cursor-pointer"
                                            title={p.desc}
                                        >
                                            {p.tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Split Editor & Live Mobile Preview */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                                {/* Editor */}
                                <div className="lg:col-span-7 space-y-2">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Template Message Body ({selectedTemplateTab.replace("_", " ")})
                                    </label>
                                    <textarea
                                        rows={12}
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
                                        className="w-full text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 leading-relaxed"
                                    />
                                </div>

                                {/* Live Customer Chat Preview */}
                                <div className="lg:col-span-5">
                                    <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                        Live WhatsApp Preview (How Customer Sees It)
                                    </label>
                                    <div className="rounded-2xl border border-slate-200 bg-[#efeae2] p-4 shadow-inner min-h-[280px]">
                                        <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-xs max-w-[280px] space-y-2 text-xs text-slate-800 leading-relaxed font-sans">
                                            <div className="whitespace-pre-line break-words text-[11.5px]">
                                                {previewMessage}
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right">
                                                Just now • ✓✓
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Action Bar */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={templatesForm.processing}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                            >
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>{templatesForm.processing ? "Saving..." : "Save Templates & Settings"}</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* ── TAB 3: BROADCAST CAMPAIGNS ── */}
                {activeTab === "broadcasts" && (
                    <div className="space-y-5">
                        {/* Anti-Ban Safety Alert Card */}
                        <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/70 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        Anti-Ban Safety Engine Active
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                            Zero Ban Risk
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                        Broadcasts are throttled with a <strong>randomized 18 to 45 seconds gap</strong> between each recipient, greetings are auto-varied (`Namaste`, `Hello`, `Dear`), and daily volume is safely capped to protect your WhatsApp number.
                                    </p>
                                </div>
                            </div>

                            {/* Daily Quota Meter */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs text-center shrink-0 min-w-[190px]">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Daily Safety Cap</p>
                                <p className="text-lg font-extrabold text-slate-900 mt-0.5 font-mono">
                                    {quota?.used_today || 0} / {quota?.daily_limit || 150}
                                </p>
                                <p className="text-[11px] text-emerald-600 font-semibold">
                                    {quota?.remaining || 150} messages left today
                                </p>
                            </div>
                        </div>

                        {/* Campaign Creator Form */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-emerald-600" />
                                    Launch Customer Broadcast Campaign
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Select your target segment and send festival discounts or balance recovery reminders.
                                </p>
                            </div>

                            <form onSubmit={handleCreateBroadcast} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Campaign Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Diwali Dhamaka Offers / Pending Vasooli Drive"
                                            value={broadcastForm.data.title}
                                            onChange={(e) => broadcastForm.setData("title", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Recipient Filter Segment
                                        </label>
                                        <select
                                            value={broadcastForm.data.filter_type}
                                            onChange={(e) => broadcastForm.setData("filter_type", e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 bg-white"
                                        >
                                            <option value="all">
                                                All Customers ({customerStats?.total_customers || 0} Saved Parties)
                                            </option>
                                            <option value="pending_balance">
                                                Customers with Pending Balance &gt; ₹0 ({customerStats?.pending_bills_count || 0} Bills)
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
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Broadcast Message Template
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={broadcastForm.data.message_template}
                                        onChange={(e) => broadcastForm.setData("message_template", e.target.value)}
                                        className="w-full text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 leading-relaxed"
                                        required
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Tags: <code>{'{customer_name}'}</code>, <code>{'{shop_name}'}</code>, <code>{'{balance_due}'}</code>, <code>{'{greeting}'}</code>.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={broadcastForm.processing}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                                    >
                                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{broadcastForm.processing ? "Queueing Campaign..." : "Queue Broadcast in Background"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Recent Campaigns Table */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 text-sm">
                                    Broadcast Campaign History
                                </h3>
                                <span className="text-xs text-slate-500 font-mono">{broadcasts.length} Campaigns</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-4">Campaign</th>
                                            <th className="py-2.5 px-4">Segment Filter</th>
                                            <th className="py-2.5 px-4">Status</th>
                                            <th className="py-2.5 px-4">Progress</th>
                                            <th className="py-2.5 px-4">Date</th>
                                            <th className="py-2.5 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {broadcasts.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                                                    No broadcast campaigns launched yet. Create your first campaign above!
                                                </td>
                                            </tr>
                                        ) : (
                                            broadcasts.map((b) => {
                                                const pct = b.total_recipients > 0
                                                    ? Math.round(((b.sent_count + b.failed_count) / b.total_recipients) * 100)
                                                    : 0;
                                                return (
                                                    <tr key={b.id} className="hover:bg-slate-50/50 transition">
                                                        <td className="py-3 px-4 font-semibold text-slate-900">
                                                            {b.title}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 capitalize">
                                                            {b.filter_type.replace("_", " ")}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {b.status === "completed" ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    Completed
                                                                </span>
                                                            ) : b.status === "processing" ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                                                    Sending...
                                                                </span>
                                                            ) : b.status === "paused" ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                                                                    Paused
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                                                    {b.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 min-w-[140px]">
                                                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
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
                                                        <td className="py-3 px-4 text-slate-500 text-xs">
                                                            {new Date(b.created_at).toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </td>
                                                        <td className="py-3 px-4 text-right space-x-1">
                                                            {b.status === "processing" && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handlePauseBroadcast(b.id)}
                                                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                                        title="Pause"
                                                                    >
                                                                        <Pause className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCancelBroadcast(b.id)}
                                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                                        title="Cancel"
                                                                    >
                                                                        <XCircle className="w-3.5 h-3.5" />
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

                {/* ── TAB 4: TRANSMISSION LOGS ── */}
                {activeTab === "logs" && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">
                                    WhatsApp Transmission Logs
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Audit trail of background automated dispatches and fallback links.
                                </p>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">
                                Total: {logs?.total || 0}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                                    <tr>
                                        <th className="py-2.5 px-4">Recipient</th>
                                        <th className="py-2.5 px-4">Trigger</th>
                                        <th className="py-2.5 px-4">Status</th>
                                        <th className="py-2.5 px-4">Message Snippet</th>
                                        <th className="py-2.5 px-4">Timestamp</th>
                                        <th className="py-2.5 px-4 text-right">Quick Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!logs?.data || logs.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                                                No message logs recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.data.map((l) => (
                                            <tr key={l.id} className="hover:bg-slate-50/50 transition">
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-slate-900">{l.recipient_name || "Customer"}</p>
                                                    <p className="text-[11px] text-slate-500 font-mono">+{l.recipient_phone}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase font-mono">
                                                        {l.trigger_type.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {l.status === "sent" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Delivered
                                                        </span>
                                                    ) : l.status === "fallback_link" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                            <ExternalLink className="w-3 h-3 text-amber-600" />
                                                            1-Click Link
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                                            <XCircle className="w-3 h-3 text-rose-600" />
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-xs">
                                                    {l.message}
                                                </td>
                                                <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                                                    {new Date(l.created_at).toLocaleString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {l.wa_me_url ? (
                                                        <a
                                                            href={l.wa_me_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-medium transition cursor-pointer"
                                                        >
                                                            <span>Open wa.me</span>
                                                            <ExternalLink className="w-3 h-3" />
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
