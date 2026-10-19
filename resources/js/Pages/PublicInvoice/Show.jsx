import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Printer,
    ExternalLink,
    Star,
    QrCode,
    Copy,
    Check,
    Phone,
    MapPin,
    Building2,
    ShieldCheck,
    ArrowUpRight,
    Sparkles
} from "lucide-react";

export default function PublicInvoiceShow({ invoice, businessProfile, summary }) {
    const [copiedUpi, setCopiedUpi] = useState(false);

    const isPaid = (summary.balance_due <= 0.01);
    const isPartial = !isPaid && summary.paid_amount > 0;

    const handleCopyUpi = () => {
        if (!summary.upi_id) return;
        navigator.clipboard.writeText(summary.upi_id);
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2500);
    };

    // Construct UPI QR Image URL via high-performance SVG/image QR generator
    const upiQrUrl = summary.upi_pay_url
        ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(summary.upi_pay_url)}`
        : null;

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12 antialiased selection:bg-indigo-600 selection:text-white font-sans">
            <Head title={`Invoice #${invoice.invoice_number} - ${summary.shop_name}`} />

            {/* Top Brand Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-2xs font-extrabold text-sm">
                            {summary.shop_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 text-sm leading-tight">
                                {summary.shop_name}
                            </h1>
                            <p className="text-[11px] text-slate-500 font-medium">Official Digital Bill & Tax Invoice</p>
                        </div>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Print Bill</span>
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
                {/* Status Hero Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-6 text-center border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/40">
                        <div className="inline-flex items-center justify-center mb-3">
                            {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Paid in Full
                                </span>
                            ) : isPartial ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    Partially Paid
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                    Payment Pending
                                </span>
                            )}
                        </div>

                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Bill Amount</p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                            ₹{Number(summary.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </h2>

                        {!isPaid && (
                            <div className="mt-3 inline-block px-4 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm">
                                Balance Due: ₹{Number(summary.balance_due).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-500">
                            <div>
                                <span className="text-slate-400">Invoice No: </span>
                                <strong className="text-slate-800 font-mono">{invoice.invoice_number}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Date: </span>
                                <strong className="text-slate-800">
                                    {new Date(invoice.invoice_date).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                    })}
                                </strong>
                            </div>
                            {invoice.due_date && (
                                <div>
                                    <span className="text-slate-400">Due Date: </span>
                                    <strong className="text-slate-800">
                                        {new Date(invoice.due_date).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric"
                                        })}
                                    </strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instant UPI Payment Section */}
                    {!isPaid && summary.upi_id && (
                        <div className="p-5 sm:p-6 bg-gradient-to-b from-emerald-50/50 to-white border-t border-emerald-100">
                            <div className="text-center max-w-md mx-auto space-y-4">
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                        Pay Instantly via UPI (₹0 Surcharge)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Tap below to launch Google Pay, PhonePe, Paytm, or scan the QR code.
                                    </p>
                                </div>

                                {summary.upi_pay_url && (
                                    <a
                                        href={summary.upi_pay_url}
                                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-md shadow-emerald-600/20 transition cursor-pointer"
                                    >
                                        Pay ₹{Number(summary.balance_due).toLocaleString("en-IN", { minimumFractionDigits: 2 })} via UPI
                                        <ArrowUpRight className="w-4 h-4 ml-1" />
                                    </a>
                                )}

                                {upiQrUrl && (
                                    <div className="inline-block p-3.5 bg-white rounded-2xl shadow-xs border border-slate-200">
                                        <img
                                            src={upiQrUrl}
                                            alt="Scan UPI QR"
                                            className="w-44 h-44 object-contain mx-auto"
                                        />
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Accepted via GPay • PhonePe • Paytm • BHIM
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                                    <span className="text-slate-500">Merchant UPI ID:</span>
                                    <code className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-slate-900 font-bold">
                                        {summary.upi_id}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={handleCopyUpi}
                                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                        title="Copy UPI ID"
                                    >
                                        {copiedUpi ? (
                                            <Check className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Seller & Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Billed By */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            Billed By (Seller)
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{summary.shop_name}</h3>
                        {invoice.seller_address && (
                            <p className="text-xs text-slate-600 flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{invoice.seller_address}</span>
                            </p>
                        )}
                        {invoice.seller_phone && (
                            <p className="text-xs text-slate-600 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{invoice.seller_phone}</span>
                            </p>
                        )}
                        {invoice.seller_gst_number && (
                            <p className="text-xs text-slate-500 font-mono">
                                GSTIN: <strong className="text-slate-800">{invoice.seller_gst_number}</strong>
                            </p>
                        )}
                    </div>

                    {/* Billed To */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            Billed To (Customer)
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">
                            {invoice.customer_name || "Valued Customer"}
                        </h3>
                        {invoice.customer_address && (
                            <p className="text-xs text-slate-600 flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{invoice.customer_address}</span>
                            </p>
                        )}
                        {invoice.customer_phone && (
                            <p className="text-xs text-slate-600 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{invoice.customer_phone}</span>
                            </p>
                        )}
                        {invoice.customer_gst_number && (
                            <p className="text-xs text-slate-500 font-mono">
                                GSTIN: <strong className="text-slate-800">{invoice.customer_gst_number}</strong>
                            </p>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm">Item Breakdown</h3>
                        <span className="text-xs text-slate-500 font-mono">{invoice.items?.length || 0} Items</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-4">#</th>
                                    <th className="py-2.5 px-4">Item Details</th>
                                    <th className="py-2.5 px-3 text-right">Qty</th>
                                    <th className="py-2.5 px-3 text-right">Rate</th>
                                    <th className="py-2.5 px-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items?.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition">
                                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-900">{item.item_name}</p>
                                            {item.dimension && (
                                                <span className="text-[11px] text-slate-400 font-mono">Dimension: {item.dimension}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                                            {item.quantity} {item.unit || "PCS"}
                                        </td>
                                        <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap font-mono">
                                            ₹{Number(item.rate).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                                            ₹{Number(item.total_amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Totals */}
                    <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100 flex flex-col items-end space-y-1.5 text-xs">
                        <div className="flex justify-between w-full max-w-xs text-slate-600">
                            <span>Subtotal:</span>
                            <span className="font-mono">₹{Number(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(invoice.total_discount) > 0 && (
                            <div className="flex justify-between w-full max-w-xs text-emerald-600 font-medium">
                                <span>Discount:</span>
                                <span className="font-mono">-₹{Number(invoice.total_discount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.total_tax) > 0 && (
                            <div className="flex justify-between w-full max-w-xs text-slate-600">
                                <span>Tax (GST):</span>
                                <span className="font-mono">₹{Number(invoice.total_tax).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.round_off) !== 0 && (
                            <div className="flex justify-between w-full max-w-xs text-slate-400 text-[11px]">
                                <span>Round Off:</span>
                                <span className="font-mono">{Number(invoice.round_off) > 0 ? `+${invoice.round_off}` : invoice.round_off}</span>
                            </div>
                        )}
                        <div className="flex justify-between w-full max-w-xs pt-2 border-t border-slate-200 font-extrabold text-slate-900 text-sm">
                            <span>Grand Total:</span>
                            <span className="font-mono text-indigo-600">₹{Number(invoice.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between w-full max-w-xs text-slate-600">
                            <span>Paid Amount:</span>
                            <span className="font-mono">₹{Number(invoice.paid_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between w-full max-w-xs font-bold text-rose-600">
                            <span>Balance Due:</span>
                            <span className="font-mono">₹{Number(summary.balance_due).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Google Review Prompt */}
                {summary.google_review_url && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Enjoyed your experience with us?</h4>
                                <p className="text-[11px] text-slate-600">
                                    Take 5 seconds to leave a 5-star Google review for <strong>{summary.shop_name}</strong>!
                                </p>
                            </div>
                        </div>
                        <a
                            href={summary.google_review_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition"
                        >
                            <span>Rate on Google</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}

                {/* Footer */}
                <footer className="text-center text-[11px] text-slate-400 pt-4 space-y-1">
                    <p>Computer-generated tax invoice issued via Vama Invoice.</p>
                    <p>Thank you for shopping with us!</p>
                </footer>
            </main>
        </div>
    );
}
