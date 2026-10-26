import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, router, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import {
    Plus,
    Search,
    Trash2,
    X,
    FileText,
    FileImage,
    UploadCloud,
    FileUp,
    ScanLine,
    ExternalLink,
    Download,
    Eye,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShoppingBag,
    IndianRupee,
    Layers,
    Check,
    Calendar,
    CalendarRange,
    RotateCcw,
    ArrowUpDown,
    Filter,
    Edit2,
    Receipt,
    Sparkles,
    Zap
} from "lucide-react";
import axios from "axios";
import TableActionDropdown, { ActionItem } from "@/Components/TableActionDropdown";
import { downloadTallyVouchers } from "@/utils/tallyExport";
import DataImportModal from "@/Components/DataImportModal";

function normalizeNumber(value) {
    if (value === null || value === undefined) return 0;
    const cleaned = value.toString().replace(/[₹,\s]/g, "").replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value) {
    return normalizeNumber(value).toFixed(2);
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

function getPurchaseReference(order) {
    return order.purchase_number || `PUR-${String(order.id).padStart(6, "0")}`;
}

const PURCHASE_STANDARD_UNITS = ["PCS", "KG", "CM", "MM", "M"];

function PurchaseModal({ order, initialData, existingOrders = [], onClose, onSaved }) {
    const fileInputRef = useRef(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState("");
    const [isPdf, setIsPdf] = useState(false);
    const [modalError, setModalError] = useState("");
    const [manualFile, setManualFile] = useState(
        initialData?.bill_file instanceof File ? initialData.bill_file : null
    );

    const initialStatus = initialData?.status || order?.status || "Pending";

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        po_number: initialData?.po_number || order?.po_number || "",
        supplier_name: initialData?.supplier_name || order?.supplier_name || "",
        gst_number: initialData?.gst_number || order?.gst_number || "",
        order_date: initialData?.order_date || (order?.order_date ? order.order_date.slice(0, 10) : new Date().toISOString().split("T")[0]),
        status: initialStatus,
        sync_inventory: order ? Boolean(order.is_inventory_synced) : (initialStatus === "Received"),
        tax_rate: initialData?.tax_rate ?? (order?.tax_rate ?? ""),
        subtotal: initialData?.subtotal ?? (order?.subtotal ?? ""),
        gross_discount: initialData?.gross_discount ?? (order?.gross_discount ?? ""),
        cgst: initialData?.cgst ?? (order?.cgst ?? ""),
        sgst: initialData?.sgst ?? (order?.sgst ?? ""),
        igst: initialData?.igst ?? (order?.igst ?? ""),
        total_gst: initialData?.total_gst ?? (order?.total_gst ?? ""),
        round_off: initialData?.round_off ?? (order?.round_off ?? ""),
        total_amount: initialData?.total_amount || order?.total_amount || "",
        notes: order?.notes || "",
        bill_file: initialData?.bill_file || (order?.bill_file ? order.bill_file : null),
        items: (initialData?.items || order?.items || []).map((it) => {
            const rawUnit = (it.unit || it.per || "PCS").toString().toUpperCase().trim();
            return {
                description: it.description || "",
                hsn_sac: it.hsn_sac || "",
                quantity: it.quantity ?? 1,
                rate: it.rate ?? "",
                per: rawUnit || "PCS",
                isCustomUnit: rawUnit ? !PURCHASE_STANDARD_UNITS.includes(rawUnit) : false,
                discount_percent: it.discount_percent ?? "",
                discount_amount: it.discount_amount ?? "",
                amount: it.amount ?? 0,
            };
        }),
    });

    const duplicateInvoiceMatch = useMemo(() => {
        if (!data.po_number || !data.po_number.trim()) return null;
        const cleanNum = data.po_number.trim().toLowerCase();
        return existingOrders.find(
            (o) => o.po_number && o.po_number.trim().toLowerCase() === cleanNum && (!order || o.id !== order.id)
        );
    }, [data.po_number, existingOrders, order]);

    useEffect(() => {
        if (order) {
            setData({
                po_number: order.po_number || "",
                supplier_name: order.supplier_name || "",
                gst_number: order.gst_number || "",
                order_date: order.order_date ? order.order_date.slice(0, 10) : new Date().toISOString().split("T")[0],
                status: order.status || "Pending",
                sync_inventory: Boolean(order.is_inventory_synced),
                tax_rate: order.tax_rate !== null && order.tax_rate !== undefined ? order.tax_rate : "",
                subtotal: order.subtotal !== null && order.subtotal !== undefined ? order.subtotal : "",
                gross_discount: order.gross_discount !== null && order.gross_discount !== undefined ? order.gross_discount : "",
                cgst: order.cgst !== null && order.cgst !== undefined ? order.cgst : "",
                sgst: order.sgst !== null && order.sgst !== undefined ? order.sgst : "",
                igst: order.igst !== null && order.igst !== undefined ? order.igst : "",
                total_gst: order.total_gst !== null && order.total_gst !== undefined ? order.total_gst : "",
                round_off: order.round_off !== null && order.round_off !== undefined ? order.round_off : "",
                total_amount: order.total_amount || "",
                notes: order.notes || "",
                bill_file: order.bill_file || null,
                items: (order.items || []).map((it) => {
                    const rawUnit = (it.per || it.unit || "PCS").toString().toUpperCase().trim();
                    return {
                        description: it.description || "",
                        hsn_sac: it.hsn_sac || "",
                        quantity: it.quantity ?? 1,
                        rate: it.rate ?? "",
                        per: rawUnit || "PCS",
                        isCustomUnit: rawUnit ? !PURCHASE_STANDARD_UNITS.includes(rawUnit) : false,
                        discount_percent: it.discount_percent ?? "",
                        discount_amount: it.discount_amount ?? "",
                        amount: it.amount ?? 0,
                    };
                }),
            });
        } else if (initialData) {
            if (initialData.po_number) setData("po_number", initialData.po_number);
            if (initialData.supplier_name) setData("supplier_name", initialData.supplier_name);
            if (initialData.gst_number) setData("gst_number", initialData.gst_number);
            if (initialData.order_date) setData("order_date", initialData.order_date);
            if (initialData.tax_rate !== undefined) setData("tax_rate", initialData.tax_rate);
            if (initialData.subtotal !== undefined) setData("subtotal", initialData.subtotal);
            if (initialData.gross_discount !== undefined) setData("gross_discount", initialData.gross_discount);
            if (initialData.cgst !== undefined) setData("cgst", initialData.cgst);
            if (initialData.sgst !== undefined) setData("sgst", initialData.sgst);
            if (initialData.igst !== undefined) setData("igst", initialData.igst);
            if (initialData.total_gst !== undefined) setData("total_gst", initialData.total_gst);
            if (initialData.round_off !== undefined) setData("round_off", initialData.round_off);
            if (initialData.total_amount) setData("total_amount", initialData.total_amount);
            if (initialData.items) setData("items", initialData.items);
            if (initialData.bill_file) setData("bill_file", initialData.bill_file);
        }
    }, [order, initialData]);

    const handleGrossDiscountChange = (val) => {
        setData((prev) => {
            const sub = (prev.items || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            const gDisc = parseFloat(val) || 0;
            const taxable = Math.max(0, sub - gDisc);
            const rate = parseFloat(prev.tax_rate) || 0;
            let newCgst = prev.cgst;
            let newSgst = prev.sgst;
            let newIgst = prev.igst;
            let newTotalGst = parseFloat(prev.total_gst) || 0;

            if (rate > 0 && taxable >= 0) {
                const totalGstCalc = parseFloat(((taxable * rate) / 100).toFixed(2));
                const isIgst = parseFloat(prev.igst) > 0 && parseFloat(prev.cgst) === 0 && parseFloat(prev.sgst) === 0;
                newTotalGst = totalGstCalc;
                if (isIgst) {
                    newIgst = totalGstCalc.toFixed(2);
                    newCgst = "0.00";
                    newSgst = "0.00";
                } else {
                    const half = parseFloat((totalGstCalc / 2).toFixed(2));
                    newCgst = half.toFixed(2);
                    newSgst = parseFloat((totalGstCalc - half).toFixed(2));
                    newIgst = "0.00";
                }
            }

            const rOff = parseFloat(prev.round_off) || 0;
            const newTotal = (taxable + newTotalGst + rOff).toFixed(2);

            return {
                ...prev,
                gross_discount: val,
                subtotal: sub.toFixed(2),
                cgst: newCgst,
                sgst: newSgst,
                igst: newIgst,
                total_gst: newTotalGst > 0 ? newTotalGst.toFixed(2) : prev.total_gst,
                total_amount: newTotal,
            };
        });
    };

    const handleRoundOffChange = (val) => {
        setData((prev) => {
            const sub = (prev.items || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            const gDisc = parseFloat(prev.gross_discount) || 0;
            const taxable = Math.max(0, sub - gDisc);
            const gst = parseFloat(prev.total_gst) || 0;
            const rOff = parseFloat(val) || 0;
            return {
                ...prev,
                round_off: val,
                total_amount: (taxable + gst + rOff).toFixed(2),
            };
        });
    };

    const handleGstFieldChange = (field, val) => {
        setData((prev) => {
            const next = { ...prev, [field]: val };
            const c = parseFloat(field === "cgst" ? val : next.cgst) || 0;
            const s = parseFloat(field === "sgst" ? val : next.sgst) || 0;
            const i = parseFloat(field === "igst" ? val : next.igst) || 0;
            const sum = c + s + i;
            const newTotalGst = sum > 0 ? sum.toFixed(2) : next.total_gst;
            const subtotal = (next.items || []).reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
            const gDisc = parseFloat(next.gross_discount) || 0;
            const rOff = parseFloat(next.round_off) || 0;
            const taxable = Math.max(0, subtotal - gDisc);
            return {
                ...next,
                total_gst: newTotalGst,
                subtotal: subtotal.toFixed(2),
                total_amount: subtotal > 0 ? (taxable + (parseFloat(newTotalGst) || 0) + rOff).toFixed(2) : next.total_amount,
            };
        });
    };

    const handleTaxRateChange = (rateVal) => {
        setData((prev) => {
            const rate = parseFloat(rateVal) || 0;
            const subtotal = (prev.items || []).reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
            const gDisc = parseFloat(prev.gross_discount) || 0;
            const taxable = Math.max(0, subtotal - gDisc);
            const rOff = parseFloat(prev.round_off) || 0;
            if (rate > 0 && taxable >= 0) {
                const totalGst = parseFloat(((taxable * rate) / 100).toFixed(2));
                const isIgst = parseFloat(prev.igst) > 0 && parseFloat(prev.cgst) === 0 && parseFloat(prev.sgst) === 0;
                if (isIgst) {
                    return {
                        ...prev,
                        tax_rate: rateVal,
                        subtotal: subtotal.toFixed(2),
                        igst: totalGst.toFixed(2),
                        cgst: "0.00",
                        sgst: "0.00",
                        total_gst: totalGst.toFixed(2),
                        total_amount: (taxable + totalGst + rOff).toFixed(2),
                    };
                } else {
                    const half = parseFloat((totalGst / 2).toFixed(2));
                    const otherHalf = parseFloat((totalGst - half).toFixed(2));
                    return {
                        ...prev,
                        tax_rate: rateVal,
                        subtotal: subtotal.toFixed(2),
                        cgst: half.toFixed(2),
                        sgst: otherHalf.toFixed(2),
                        igst: "0.00",
                        total_gst: totalGst.toFixed(2),
                        total_amount: (taxable + totalGst + rOff).toFixed(2),
                    };
                }
            }
            return { ...prev, tax_rate: rateVal, subtotal: subtotal.toFixed(2) };
        });
    };

    useEffect(() => {
        if (!data.bill_file) {
            setFilePreviewUrl("");
            setIsPdf(false);
            return undefined;
        }

        if (typeof data.bill_file === "string") {
            const url = `/storage/${data.bill_file}`;
            setFilePreviewUrl(url);
            setIsPdf(data.bill_file.toLowerCase().endsWith(".pdf"));
            return undefined;
        }

        if (data.bill_file instanceof File || data.bill_file instanceof Blob) {
            const isFilePdf = data.bill_file.type?.includes("pdf") || data.bill_file.name?.toLowerCase().endsWith(".pdf");
            setIsPdf(!!isFilePdf);
            const nextUrl = URL.createObjectURL(data.bill_file);
            setFilePreviewUrl(nextUrl);
            return () => URL.revokeObjectURL(nextUrl);
        }

        setFilePreviewUrl("");
        setIsPdf(false);
        return undefined;
    }, [data.bill_file]);

    const scannedRows = useMemo(() => data.items.length, [data.items]);

    const addItem = () => {
        setData("items", [...data.items, {
            description: "",
            hsn_sac: "",
            quantity: 1,
            rate: "",
            per: "PCS",
            isCustomUnit: false,
            discount_percent: "",
            discount_amount: "",
            amount: 0
        }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;

        // Auto-calculate amount
        if (field === 'quantity' || field === 'rate' || field === 'discount_percent') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            const disc = parseFloat(newItems[index].discount_percent) || 0;

            let amt = qty * rate;
            if (disc > 0) amt = amt - (amt * (disc / 100));
            newItems[index].amount = amt.toFixed(2);
        }

        setData("items", newItems);
        recalculateTotal(newItems);
    };

    const removeItem = (index) => {
        const newItems = data.items.filter((_, i) => i !== index);
        setData("items", newItems);
        recalculateTotal(newItems);
    };

    const recalculateTotal = (items, gstOverride, grossDiscOverride, roundOffOverride) => {
        const currentItems = items || data.items || [];
        const subtotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const gDisc = parseFloat(grossDiscOverride !== undefined ? grossDiscOverride : data.gross_discount) || 0;
        const gst = parseFloat(gstOverride !== undefined ? gstOverride : data.total_gst) || 0;
        const rOff = parseFloat(roundOffOverride !== undefined ? roundOffOverride : data.round_off) || 0;
        const taxable = Math.max(0, subtotal - gDisc);
        setData((prev) => ({
            ...prev,
            subtotal: subtotal.toFixed(2),
            total_amount: (taxable + gst + rOff).toFixed(2),
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setManualFile(f);
            setData("bill_file", f);
        }
    };

    const removeFile = () => {
        setManualFile(null);
        setData("bill_file", null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleStatusSelect = (newStatus) => {
        setData((prev) => ({
            ...prev,
            status: newStatus,
            sync_inventory: newStatus === "Received" ? true : prev.sync_inventory
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setModalError("");

        if (!data.po_number || !data.po_number.trim()) {
            setModalError("Please enter the Invoice Number written on the invoice sheet/file.");
            return;
        }

        if (duplicateInvoiceMatch) {
            const dupMsg = `⚠️ Duplicate Bill Error: Invoice #${data.po_number} has already been added in your purchase records (Supplier: ${duplicateInvoiceMatch.supplier_name}, Date: ${duplicateInvoiceMatch.order_date ? new Date(duplicateInvoiceMatch.order_date).toLocaleDateString("en-IN") : "earlier"}, Total: ₹${parseFloat(duplicateInvoiceMatch.total_amount || 0).toFixed(2)})!\n\nThe same invoice cannot be added twice.`;
            alert(dupMsg);
            setModalError(dupMsg);
            return;
        }

        if (!data.supplier_name) {
            setModalError("Please enter the Supplier / Billed To name.");
            return;
        }
        if (!data.order_date) {
            setModalError("Please select the Date.");
            return;
        }
        if (!data.total_amount || isNaN(parseFloat(data.total_amount))) {
            setModalError("Please enter a valid Total Amount.");
            return;
        }

        if (data.items.length === 0) {
            setModalError("Please add at least one item to the invoice.");
            return;
        }
        for (let i = 0; i < data.items.length; i++) {
            if (!data.items[i].description) {
                setModalError(`Item ${i + 1} is missing a description.`);
                return;
            }

            const qty = parseFloat(data.items[i].quantity);
            if (isNaN(qty) || qty <= 0) {
                setModalError(`Item ${i + 1} has an invalid quantity.`);
                return;
            }

            const rate = parseFloat(data.items[i].rate);
            if (isNaN(rate) || rate <= 0) {
                setModalError(`Item ${i + 1} has an invalid rate.`);
                return;
            }
        }

        transform((currentData) => {
            const itemsSub = currentData.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
            const grossDisc = currentData.gross_discount !== "" && !isNaN(parseFloat(currentData.gross_discount)) ? parseFloat(currentData.gross_discount) : 0;
            const roundOff = currentData.round_off !== "" && !isNaN(parseFloat(currentData.round_off)) ? parseFloat(currentData.round_off) : 0;
            return {
                ...currentData,
                po_number: currentData.po_number ? currentData.po_number.trim() : "",
                supplier_name: currentData.supplier_name ? currentData.supplier_name.trim() : "",
                bill_file: (manualFile instanceof File || manualFile instanceof Blob)
                    ? manualFile
                    : (currentData.bill_file instanceof File || currentData.bill_file instanceof Blob)
                        ? currentData.bill_file
                        : (typeof currentData.bill_file === "string" && currentData.bill_file.trim())
                            ? currentData.bill_file.trim()
                            : (typeof initialData?.bill_file === "string" && initialData.bill_file.trim())
                                ? initialData.bill_file.trim()
                                : null,
                tax_rate: currentData.tax_rate !== "" && !isNaN(parseFloat(currentData.tax_rate)) ? parseFloat(currentData.tax_rate) : 0,
                subtotal: currentData.subtotal !== "" && !isNaN(parseFloat(currentData.subtotal)) ? parseFloat(currentData.subtotal) : itemsSub,
                gross_discount: grossDisc,
                round_off: roundOff,
                cgst: currentData.cgst !== "" && !isNaN(parseFloat(currentData.cgst)) ? parseFloat(currentData.cgst) : 0,
                sgst: currentData.sgst !== "" && !isNaN(parseFloat(currentData.sgst)) ? parseFloat(currentData.sgst) : 0,
                igst: currentData.igst !== "" && !isNaN(parseFloat(currentData.igst)) ? parseFloat(currentData.igst) : 0,
                total_gst: currentData.total_gst !== "" && !isNaN(parseFloat(currentData.total_gst)) ? parseFloat(currentData.total_gst) : 0,
                total_amount: currentData.total_amount ? parseFloat(currentData.total_amount.toString().replace(/[₹,\s]/g, "")) : 0,
                items: currentData.items.map(item => ({
                    ...item,
                    description: item.description ? item.description.trim() : "Item",
                    hsn_sac: item.hsn_sac ? item.hsn_sac.trim() : "",
                    quantity: parseFloat(item.quantity) || 1,
                    rate: parseFloat(item.rate) || 0,
                    per: item.per ? item.per.trim() : "PC",
                    amount: parseFloat(item.amount) || ((parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0)),
                    discount_percent: (item.discount_percent && !isNaN(parseFloat(item.discount_percent))) ? parseFloat(item.discount_percent) : "",
                    discount_amount: (item.discount_amount && !isNaN(parseFloat(item.discount_amount))) ? parseFloat(item.discount_amount) : null
                }))
            };
        });

        const submitUrl = order ? `/purchase/${order.id}` : "/purchase";

        post(submitUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSaved();
                onClose();
            },
            onError: (errs) => {
                console.error("Failed to save:", errs);
                const errMsg = errs.po_number || Object.values(errs).join(" | ");
                alert("⚠️ Error: " + errMsg);
                setModalError("Validation Error: " + errMsg);
            }
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div
                className="modal-box purchase-modal"
                style={{ maxWidth: "min(1180px, 98vw)", width: "100%", display: "flex", flexDirection: "column", padding: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header" style={{ padding: "14px 18px", flexWrap: "wrap", gap: 10 }}>
                    <span className="modal-title">
                        {order ? "Edit Purchase Invoice" : initialData?.scan_summary ? "Review Scanned Invoice" : "Create Purchase Invoice"}
                    </span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {modalError && (
                            <div className="modal-alert-box danger">
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>{modalError}</span>
                            </div>
                        )}

                        {duplicateInvoiceMatch && (
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: 8 }}>
                                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: "#dc2626" }} />
                                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                                    <strong>Duplicate Invoice Notice:</strong> An invoice with number <strong>"{data.po_number}"</strong> has already been added in purchase on {duplicateInvoiceMatch.order_date ? formatDate(duplicateInvoiceMatch.order_date) : "a previous date"} from supplier <strong>"{duplicateInvoiceMatch.supplier_name}"</strong> (Total: ₹{parseFloat(duplicateInvoiceMatch.total_amount || 0).toFixed(2)}). Same invoice cannot be added twice.
                                </div>
                            </div>
                        )}

                        {initialData?.scan_summary && (
                            <div className="scan-summary">
                                <div className="scan-summary-icon"><ScanLine size={18} /></div>
                                <div>
                                    <div className="scan-summary-title">Invoice scan completed</div>
                                    <div className="scan-summary-text">{initialData.scan_summary} Please review the values before saving.</div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <div className="form-group" style={{ flex: "1 1 220px" }}>
                                <label className="form-label">Supplier Invoice Number</label>
                                <input
                                    className="form-input"
                                    value={data.po_number}
                                    onChange={(e) => setData("po_number", e.target.value)}
                                    placeholder="Invoice # on supplier bill"
                                    style={{ fontWeight: 600 }}
                                />
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                                    A separate purchase reference number is generated automatically when saved.
                                </div>
                                {errors.po_number && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errors.po_number}</div>}
                            </div>
                            <div className="form-group" style={{ flex: "1 1 180px" }}>
                                <label className="form-label">Supplier / Billed To</label>
                                <input
                                    className="form-input"
                                    value={data.supplier_name}
                                    onChange={(e) => setData("supplier_name", e.target.value)}
                                    placeholder="Vendor or Supplier name"
                                />
                                {errors.supplier_name && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errors.supplier_name}</div>}
                            </div>
                            <div className="form-group" style={{ flex: "1 1 180px" }}>
                                <label className="form-label">Supplier GST Number</label>
                                <input
                                    className="form-input"
                                    value={data.gst_number}
                                    onChange={(e) => setData("gst_number", e.target.value.toUpperCase())}
                                    placeholder="GSTIN (Optional)"
                                />
                                {errors.gst_number && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errors.gst_number}</div>}
                            </div>
                            <div className="form-group" style={{ flex: "1 1 200px" }}>
                                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Date</span>
                                    {data.order_date && (
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "rgba(99, 102, 241, 0.1)", padding: "1px 6px", borderRadius: 4 }}>
                                            {formatDate(data.order_date)}
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={data.order_date}
                                    onChange={(e) => setData("order_date", e.target.value)}
                                />
                                {errors.order_date && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errors.order_date}</div>}
                            </div>
                        </div>

                        <div className="purchase-review-layout">
                            <div className="purchase-items-panel">
                                <div className="purchase-panel-head">
                                    <div>
                                        <div className="purchase-panel-title">Goods table</div>
                                        <div className="purchase-panel-sub">{scannedRows ? `${scannedRows} row${scannedRows === 1 ? "" : "s"} ready` : "Add the goods from the bill"}</div>
                                    </div>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} style={{ fontSize: 12 }}>
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>
                                <div className="purchase-items-scroll">
                                    <table className="custom-table purchase-items-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 46 }}>Sl</th>
                                                <th>Description of Goods</th>
                                                <th style={{ width: 108 }}>HSN/SAC</th>
                                                <th style={{ width: 92 }}>Qty</th>
                                                <th style={{ width: 108 }}>Rate</th>
                                                <th style={{ width: 85 }}>Unit</th>
                                                <th style={{ width: 86 }}>Disc %</th>
                                                <th style={{ width: 122 }}>Amount</th>
                                                <th style={{ width: 50 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="purchase-empty-row">
                                                        No goods found yet. Upload a clearer image or add rows manually.
                                                    </td>
                                                </tr>
                                            ) : (
                                                data.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                                                        <td><input className="form-input purchase-desc-input" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} /></td>
                                                        <td><input className="form-input" value={item.hsn_sac || ""} onChange={(e) => updateItem(idx, "hsn_sac", e.target.value)} /></td>
                                                        <td><input type="number" min="0.001" step="0.001" className="form-input" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} /></td>
                                                        <td><input type="number" step="0.01" className="form-input" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} /></td>
                                                        <td>
                                                            <select
                                                                className="form-input"
                                                                value={
                                                                    item.isCustomUnit || !PURCHASE_STANDARD_UNITS.includes((item.per || "PCS").toUpperCase())
                                                                        ? "OTHER"
                                                                        : (item.per || "PCS").toUpperCase()
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === "OTHER") {
                                                                        updateItem(idx, "isCustomUnit", true);
                                                                        if (PURCHASE_STANDARD_UNITS.includes((item.per || "").toUpperCase())) {
                                                                            updateItem(idx, "per", "");
                                                                        }
                                                                    } else {
                                                                        updateItem(idx, "isCustomUnit", false);
                                                                        updateItem(idx, "per", val);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="PCS">PCS</option>
                                                                <option value="KG">KG</option>
                                                                <option value="CM">CM</option>
                                                                <option value="MM">MM</option>
                                                                <option value="M">M</option>
                                                                <option value="OTHER">Other</option>
                                                            </select>
                                                            {(item.isCustomUnit || !PURCHASE_STANDARD_UNITS.includes((item.per || "PCS").toUpperCase())) && (
                                                                <input
                                                                    className="form-input"
                                                                    style={{ marginTop: 4 }}
                                                                    placeholder="Custom"
                                                                    value={item.per || ""}
                                                                    onChange={(e) => updateItem(idx, "per", e.target.value.toUpperCase())}
                                                                    autoFocus
                                                                />
                                                            )}
                                                        </td>
                                                        <td><input type="number" step="0.01" className="form-input" value={item.discount_percent || ""} onChange={(e) => updateItem(idx, "discount_percent", e.target.value)} /></td>
                                                        <td className="purchase-amount-cell">₹{toMoney(item.amount)}</td>
                                                        <td>
                                                            <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Remove item" onClick={() => removeItem(idx)}>
                                                                <Trash2 size={14} color="var(--danger)" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <aside className="purchase-scan-panel">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div className="purchase-panel-title">Bill file</div>
                                    {filePreviewUrl && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <a
                                                href={filePreviewUrl}
                                                download={data.po_number ? `Invoice_${data.po_number}.${isPdf ? "pdf" : "jpg"}` : `Invoice_Uploaded.${isPdf ? "pdf" : "jpg"}`}
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: 11, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                                                title="Download the uploaded invoice file"
                                            >
                                                <Download size={12} /> Download
                                            </a>
                                            <a
                                                href={filePreviewUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--info)", textDecoration: "none" }}
                                            >
                                                <ExternalLink size={12} /> Full view
                                            </a>
                                        </div>
                                    )}
                                </div>
                                {filePreviewUrl ? (
                                    isPdf ? (
                                        <iframe
                                            src={filePreviewUrl}
                                            title="Bill PDF Preview"
                                            className="purchase-bill-preview"
                                            style={{ width: "100%", height: 380, border: "none", borderRadius: 8 }}
                                        />
                                    ) : (
                                        <img className="purchase-bill-preview" src={filePreviewUrl} alt="Uploaded purchase bill preview" style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain" }} />
                                    )
                                ) : (
                                    <div className="purchase-file-placeholder">
                                        <FileImage size={28} />
                                        <span>Upload an invoice image or PDF to preview it here while checking scanned rows.</span>
                                    </div>
                                )}
                            </aside>
                        </div>

                        {/* Financial Breakdown & Tax Section */}
                        <div style={{ background: "var(--bg-elevated)", padding: "14px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                                    Financial Summary & Taxes
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                    Items Subtotal: <strong style={{ color: "var(--text-primary)" }}>₹{toMoney(data.subtotal || data.items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0))}</strong>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))", gap: 10 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>
                                        Gross Discount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-input"
                                        value={data.gross_discount}
                                        onChange={(e) => handleGrossDiscountChange(e.target.value)}
                                        placeholder="0.00"
                                        style={{ fontWeight: 600, borderColor: data.gross_discount > 0 ? "#10b981" : undefined }}
                                    />
                                    {errors.gross_discount && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.gross_discount}</div>}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.tax_rate}
                                        onChange={(e) => handleTaxRateChange(e.target.value)}
                                        placeholder="e.g. 18"
                                    />
                                    {errors.tax_rate && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.tax_rate}</div>}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>CGST (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.cgst}
                                        onChange={(e) => handleGstFieldChange("cgst", e.target.value)}
                                        placeholder="0.00"
                                    />
                                    {errors.cgst && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.cgst}</div>}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>SGST (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.sgst}
                                        onChange={(e) => handleGstFieldChange("sgst", e.target.value)}
                                        placeholder="0.00"
                                    />
                                    {errors.sgst && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.sgst}</div>}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>IGST (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.igst}
                                        onChange={(e) => handleGstFieldChange("igst", e.target.value)}
                                        placeholder="0.00"
                                    />
                                    {errors.igst && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.igst}</div>}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>Total GST (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.total_gst}
                                        onChange={(e) => setData("total_gst", e.target.value)}
                                        placeholder="0.00"
                                        style={{ fontWeight: 700 }}
                                    />
                                    {errors.total_gst && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.total_gst}</div>}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11 }}>Round Off (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={data.round_off}
                                        onChange={(e) => handleRoundOffChange(e.target.value)}
                                        placeholder="+/- 0.00"
                                    />
                                    {errors.round_off && <div style={{ color: "var(--danger)", fontSize: 11 }}>{errors.round_off}</div>}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
                            <div className="form-group" style={{ flex: "1 1 200px" }}>
                                <label className="form-label">Total Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={data.total_amount}
                                    onChange={(e) => setData("total_amount", e.target.value)}
                                    style={{ fontWeight: "bold", fontSize: 18 }}
                                />
                                {errors.total_amount && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errors.total_amount}</div>}
                            </div>
                            <div className="form-group" style={{ flex: "1 1 200px" }}>
                                <label className="form-label">Status</label>
                                <select className="form-input" value={data.status} onChange={(e) => handleStatusSelect(e.target.value)}>
                                    <option value="Pending">Pending (Draft / Ordered)</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Received">Received (Goods In Stock)</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: "1 1 300px" }}>
                                <label className="form-label">Upload Bill/Receipt (Optional)</label>
                                {!data.bill_file ? (
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, justifyContent: "center" }}>
                                            <UploadCloud size={16} /> Attach Bill Image
                                        </button>
                                        <input
                                            type="file"
                                            style={{ display: "none" }}
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                        />
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                                            {isPdf ? <FileText size={18} color="var(--accent)" /> : <FileImage size={18} color="var(--accent)" />}
                                            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }} title={typeof data.bill_file === "string" ? data.bill_file.split("/").pop() : data.bill_file?.name}>
                                                    {typeof data.bill_file === "string" ? data.bill_file.split("/").pop() : (data.bill_file?.name || "Invoice Document")}
                                                </span>
                                                {typeof data.bill_file === "string" && (
                                                    <span style={{ fontSize: 10.5, color: "var(--success)", fontWeight: 500 }}>
                                                        ✓ Existing attached invoice
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{ fontSize: 11, padding: "2px 8px" }}
                                                title="Replace with new file"
                                            >
                                                Replace
                                            </button>
                                            <input
                                                type="file"
                                                style={{ display: "none" }}
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                            />
                                            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={removeFile} title="Remove attached file">
                                                <X size={14} color="var(--danger)" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {errors.bill_file && <div style={{ color: "var(--danger)", fontSize: 12 }}>{errors.bill_file}</div>}
                            </div>
                        </div>

                        {/* Inventory Sync Option */}
                        <div style={{ padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                                <input
                                    type="checkbox"
                                    checked={data.sync_inventory}
                                    onChange={(e) => setData("sync_inventory", e.target.checked)}
                                    style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
                                />
                                <span>
                                    <strong>Auto-add items to Store Inventory</strong> (Increases in-stock quantities immediately)
                                </span>
                            </label>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={processing}>{processing ? "Saving..." : (order ? "Update Invoice" : "Save Invoice")}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function OrderDetailsModal({ order, onClose, onStatusChange, onEdit }) {
    if (!order) return null;

    const items = order.items || [];
    const isPdf = order.bill_file?.toLowerCase().endsWith(".pdf");

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
            <div
                className="modal-box"
                style={{ maxWidth: "min(1060px, 98vw)", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FileText size={18} color="var(--accent)" /> Purchase {getPurchaseReference(order)} · Supplier Invoice {order.po_number}
                        </span>
                        <div className="status-select-wrap">
                            <select
                                className={`status-select ${order.status}`}
                                value={order.status}
                                onChange={(e) => onStatusChange(order, e.target.value)}
                                title="Change status"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Received">Received (In Stock)</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <span className={`stock-sync-indicator ${order.is_inventory_synced ? "synced" : "unsynced"}`} style={{ margin: 0 }}>
                            {order.is_inventory_synced ? "✓ Stock Synced" : "Stock Pending"}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {onEdit && (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    onClose();
                                    onEdit(order);
                                }}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
                                title="Edit this Invoice"
                            >
                                <Edit2 size={13} color="var(--accent)" /> Edit Invoice
                            </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="modal-body" style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Header info strip */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, background: "var(--bg-base)", padding: "14px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Supplier / Vendor</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{order.supplier_name}</div>
                            {order.gst_number && (
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>GSTIN: {order.gst_number}</div>
                            )}
                        </div>
                        <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Invoice Date</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                                {formatDate(order.order_date)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Subtotal</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                                ₹{parseFloat(order.subtotal || (items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0))).toFixed(2)}
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>{items.length} goods items</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Gross Discount</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: parseFloat(order.gross_discount || 0) > 0 ? "#059669" : "var(--text-muted)", marginTop: 2 }}>
                                {parseFloat(order.gross_discount || 0) > 0 ? `-₹${parseFloat(order.gross_discount).toFixed(2)}` : "₹0.00"}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>GST Tax ({order.tax_rate !== null && order.tax_rate !== undefined && parseFloat(order.tax_rate) > 0 ? `${parseFloat(order.tax_rate)}%` : "0%"})</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                                ₹{parseFloat(order.total_gst || 0).toFixed(2)}
                            </div>
                            {(parseFloat(order.cgst || 0) > 0 || parseFloat(order.sgst || 0) > 0 || parseFloat(order.igst || 0) > 0) && (
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                    {parseFloat(order.cgst || 0) > 0 && `CGST: ₹${parseFloat(order.cgst).toFixed(2)} `}
                                    {parseFloat(order.sgst || 0) > 0 && `SGST: ₹${parseFloat(order.sgst).toFixed(2)} `}
                                    {parseFloat(order.igst || 0) > 0 && `IGST: ₹${parseFloat(order.igst).toFixed(2)}`}
                                </div>
                            )}
                        </div>
                        {parseFloat(order.round_off || 0) !== 0 && (
                            <div>
                                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Round Off</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginTop: 2 }}>
                                    {parseFloat(order.round_off) > 0 ? `+₹${parseFloat(order.round_off).toFixed(2)}` : `-₹${Math.abs(parseFloat(order.round_off)).toFixed(2)}`}
                                </div>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Grand Total</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>₹{parseFloat(order.total_amount || 0).toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Goods line items table */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                                Purchased Goods Breakdown ({items.length})
                            </h4>
                        </div>
                        <div className="table-container" style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                            <table className="custom-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 44 }}>#</th>
                                        <th>Description</th>
                                        <th style={{ width: 110 }}>HSN/SAC</th>
                                        <th style={{ width: 80 }}>Qty</th>
                                        <th style={{ width: 90 }}>Rate</th>
                                        <th style={{ width: 70 }}>Unit</th>
                                        <th style={{ width: 80 }}>Disc %</th>
                                        <th style={{ width: 110, textAlign: "right" }}>Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                                                No specific item rows saved for this purchase invoice.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((it, idx) => (
                                            <tr key={it.id || idx}>
                                                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{it.description}</td>
                                                <td style={{ color: "var(--text-secondary)" }}>{it.hsn_sac || "—"}</td>
                                                <td style={{ fontWeight: 600 }}>{it.quantity}</td>
                                                <td>₹{parseFloat(it.rate || 0).toFixed(2)}</td>
                                                <td style={{ color: "var(--text-muted)" }}>{it.per || "PC"}</td>
                                                <td>{it.discount_percent ? `${it.discount_percent}%` : "—"}</td>
                                                <td style={{ fontWeight: 700, textAlign: "right" }}>₹{parseFloat(it.amount || 0).toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Attached invoice bill preview */}
                    {order.bill_file ? (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                                    Attached Invoice Document
                                </h4>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <a
                                        href={`/storage/${order.bill_file}`}
                                        download={`Invoice_${order.po_number || "Bill"}.${isPdf ? "pdf" : "jpg"}`}
                                        className="btn btn-primary btn-sm"
                                        style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
                                        title="Download Invoice Document"
                                    >
                                        <Download size={13} /> Download Invoice
                                    </a>
                                    <a
                                        href={`/storage/${order.bill_file}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
                                    >
                                        <ExternalLink size={13} /> Open Full Window
                                    </a>
                                </div>
                            </div>
                            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "center" }}>
                                {isPdf ? (
                                    <iframe
                                        src={`/storage/${order.bill_file}`}
                                        title="Bill PDF"
                                        style={{ width: "100%", height: 350, border: "none", borderRadius: 6 }}
                                    />
                                ) : (
                                    <img
                                        src={`/storage/${order.bill_file}`}
                                        alt="Bill"
                                        style={{ maxWidth: "100%", maxHeight: 350, objectFit: "contain", borderRadius: 6 }}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: "14px 18px", background: "var(--bg-base)", borderRadius: 8, border: "1px dashed var(--border)", color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                            <FileText size={16} /> No scanned bill file attached (Manual purchase invoice).
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    <div style={{ display: "flex", gap: 8 }}>
                        {order.bill_file && (
                            <a
                                href={`/storage/${order.bill_file}`}
                                download={`Invoice_${order.po_number || "Bill"}.${isPdf ? "pdf" : "jpg"}`}
                                className="btn btn-secondary"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                title="Download attached invoice document"
                            >
                                <Download size={14} /> Download Invoice
                            </a>
                        )}
                        {onEdit && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    onClose();
                                    onEdit(order);
                                }}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                                <Edit2 size={15} /> Edit Invoice
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfirmDelete({ order, onClose, onConfirm }) {
    function confirm() {
        onConfirm();
        onClose();
    }
    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 380 }}>
                <div className="modal-header">
                    <span className="modal-title">Delete Invoice</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body">
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Delete purchase invoice <strong style={{ color: "var(--text-primary)" }}>{order.po_number}</strong>?
                        {order.is_inventory_synced && (
                            <span style={{ display: "block", marginTop: 8, color: "var(--warning)", fontSize: 12 }}>
                                ⚠️ Note: Since this invoice was marked Received, stocked quantities will be reverted from inventory.
                            </span>
                        )}
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" onClick={confirm}>Delete</button>
                </div>
            </div>
        </div>
    );
}

function DateSummaryModal({ breakdown, onClose, onSelectDate }) {
    const totalOrders = breakdown.reduce((sum, b) => sum + b.orderCount, 0);
    const totalItems = breakdown.reduce((sum, b) => sum + b.itemCount, 0);
    const totalGst = breakdown.reduce((sum, b) => sum + (b.totalGst || 0), 0);
    const totalAmount = breakdown.reduce((sum, b) => sum + b.totalAmount, 0);

    const exportSummaryToCSV = () => {
        const headers = ["Order Date", "Total Orders", "Total Items", "Suppliers", "Total GST (INR)", "Total Amount (INR)"];
        const rows = breakdown.map((b) => [
            `"${b.date}"`,
            b.orderCount,
            b.itemCount,
            `"${Array.from(b.suppliers).join(", ").replace(/"/g, '""')}"`,
            (b.totalGst || 0).toFixed(2),
            b.totalAmount.toFixed(2),
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `purchase_daily_summary_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 200);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-box" style={{ maxWidth: 880, width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <CalendarRange size={18} color="var(--accent)" />
                            Date-wise Purchase Summary
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                            Review day-by-day purchase activity, orders, items, GST, and total expenses.
                        </p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                    {breakdown.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: 13 }}>
                            No purchase records found for the selected period.
                        </div>
                    ) : (
                        <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                            <table className="custom-table" style={{ width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Orders</th>
                                        <th>Items</th>
                                        <th>Suppliers</th>
                                        <th style={{ textAlign: "right" }}>Total GST</th>
                                        <th style={{ textAlign: "right" }}>Total Amount</th>
                                        <th style={{ textAlign: "center" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {breakdown.map((row) => (
                                        <tr key={row.date}>
                                            <td style={{ fontWeight: 600 }}>
                                                {row.date && row.date !== "Unknown"
                                                    ? new Date(row.date + "T00:00:00").toLocaleDateString("en-IN", {
                                                          weekday: "short",
                                                          day: "numeric",
                                                          month: "short",
                                                          year: "numeric"
                                                      })
                                                    : "Unknown Date"}
                                                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                                                    {row.date}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">{row.orderCount} order{row.orderCount === 1 ? "" : "s"}</span>
                                            </td>
                                            <td>{row.itemCount} items</td>
                                            <td style={{ maxWidth: 200, fontSize: 11, color: "var(--text-secondary)" }}>
                                                {Array.from(row.suppliers).slice(0, 3).join(", ")}
                                                {row.suppliers.size > 3 ? ` +${row.suppliers.size - 3} more` : ""}
                                            </td>
                                            <td style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: 12 }}>
                                                ₹{(row.totalGst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                                                ₹{row.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ fontSize: 11, padding: "2px 8px" }}
                                                    onClick={() => onSelectDate(row.date)}
                                                    title={`Filter table to only ${row.date}`}
                                                >
                                                    View Orders
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: "var(--bg-elevated)", fontWeight: 700 }}>
                                        <td>Total ({breakdown.length} days)</td>
                                        <td>{totalOrders} orders</td>
                                        <td>{totalItems} items</td>
                                        <td>—</td>
                                        <td style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: 12 }}>
                                            ₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: "right", color: "var(--accent)", fontSize: 13 }}>
                                            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
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

export default function PurchaseIndex({ auth, purchaseOrders = [], scanUsage: initialScanUsage = null }) {
    const { switchedAdmin } = usePage().props;
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [deleteOrder, setDeleteOrder] = useState(null);
    const [viewingOrderDetails, setViewingOrderDetails] = useState(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [toast, setToast] = useState(null);

    // AI Scan Quota state (100 scans per month for Admin, Unlimited for SuperAdmin)
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

    // Date-wise filtering state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [datePreset, setDatePreset] = useState("All");
    const [dateSort, setDateSort] = useState("desc"); // 'desc' = newest first, 'asc' = oldest first
    const [showDateSummaryModal, setShowDateSummaryModal] = useState(false);

    // Vama Lab AI Auto-fill state
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgressPercent, setOcrProgressPercent] = useState(0);
    const [ocrStatusText, setOcrStatusText] = useState("");
    const [initialAutoData, setInitialAutoData] = useState(null);
    const mainFileInputRef = useRef(null);

    const handleUploadBillClick = () => {
        if (!scanUsage?.isSuperAdmin && scanUsage?.hasReachedLimit) {
            alert(
                `⚠️ Monthly AI Scan Limit Reached!\n\nYou have used all ${scanUsage.limit} scans for this month (${scanUsage.monthName}).\n\nSuperAdmin has unlimited scanning capacity. You can still add invoices manually using the "Manual Invoice" button, or contact SuperAdmin to upgrade quota.`
            );
            showToast(`AI Scan limit of ${scanUsage.limit} reached for ${scanUsage.monthName}.`, "error");
            return;
        }
        mainFileInputRef.current?.click();
    };

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

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

    const toggleDateSort = () => {
        setDateSort((prev) => (prev === "desc" ? "asc" : "desc"));
    };

    // Orders filtered by date range
    const dateFilteredOrders = useMemo(() => {
        return purchaseOrders.filter((o) => {
            const orderDate = o.order_date ? o.order_date.slice(0, 10) : "";
            if (startDate && orderDate < startDate) return false;
            if (endDate && orderDate > endDate) return false;
            return true;
        });
    }, [purchaseOrders, startDate, endDate]);

    // KPI Metrics calculation (reflects date range if filtered)
    const metrics = useMemo(() => {
        const targetList = (startDate || endDate) ? dateFilteredOrders : purchaseOrders;
        const totalSpend = targetList.reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);
        const gstAmountFor = (order) => {
            const parsedTotalGst = parseFloat(order.total_gst);
            if (!isNaN(parsedTotalGst) && parsedTotalGst > 0) {
                return parsedTotalGst;
            }
            const cgst = parseFloat(order.cgst) || 0;
            const sgst = parseFloat(order.sgst) || 0;
            const igst = parseFloat(order.igst) || 0;
            return cgst + sgst + igst;
        };
        const totalGst = targetList.reduce((sum, order) => sum + gstAmountFor(order), 0);
        const totalSpendWithGst = targetList.reduce((sum, order) => (
            sum + (gstAmountFor(order) > 0 ? (parseFloat(order.total_amount) || 0) : 0)
        ), 0);
        const totalSpendWithoutGst = targetList.reduce((sum, order) => (
            sum + (gstAmountFor(order) <= 0 ? (parseFloat(order.total_amount) || 0) : 0)
        ), 0);
        const totalCount = targetList.length;
        const pendingCount = targetList.filter((o) => o.status === "Pending").length;
        const approvedCount = targetList.filter((o) => o.status === "Approved").length;
        const receivedCount = targetList.filter((o) => o.status === "Received").length;
        const cancelledCount = targetList.filter((o) => o.status === "Cancelled").length;

        return {
            totalSpend,
            totalSpendWithGst,
            totalSpendWithoutGst,
            totalGst,
            totalCount,
            pendingCount,
            approvedCount,
            receivedCount,
            cancelledCount,
            isDateFiltered: Boolean(startDate || endDate),
        };
    }, [purchaseOrders, dateFilteredOrders, startDate, endDate]);

    // Group purchases day by day for date-wise summary report
    const dateBreakdown = useMemo(() => {
        const groups = {};
        const source = (startDate || endDate) ? dateFilteredOrders : purchaseOrders;

        source.forEach((order) => {
            const d = order.order_date ? order.order_date.slice(0, 10) : "Unknown";
            if (!groups[d]) {
                groups[d] = {
                    date: d,
                    orderCount: 0,
                    itemCount: 0,
                    totalGst: 0,
                    totalAmount: 0,
                    suppliers: new Set(),
                    statuses: {},
                };
            }
            groups[d].orderCount += 1;
            groups[d].itemCount += order.items?.length || 0;
            const parsedGst = parseFloat(order.total_gst);
            const gstVal = !isNaN(parsedGst) && parsedGst > 0
                ? parsedGst
                : ((parseFloat(order.cgst) || 0) + (parseFloat(order.sgst) || 0) + (parseFloat(order.igst) || 0));
            groups[d].totalGst += gstVal;
            groups[d].totalAmount += parseFloat(order.total_amount || 0);
            if (order.supplier_name) groups[d].suppliers.add(order.supplier_name);
            groups[d].statuses[order.status] = (groups[d].statuses[order.status] || 0) + 1;
        });

        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }, [purchaseOrders, dateFilteredOrders, startDate, endDate]);

    // Final filtered orders (date + search + status + sorting)
    const filteredOrders = useMemo(() => {
        const list = dateFilteredOrders.filter((o) => {
            const matchesSearch =
                (o.po_number || "").toLowerCase().includes(search.toLowerCase()) ||
                (o.purchase_number || `PUR-${String(o.id).padStart(6, "0")}`).toLowerCase().includes(search.toLowerCase()) ||
                (o.supplier_name || "").toLowerCase().includes(search.toLowerCase()) ||
                (o.gst_number || "").toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "All" || o.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        return list.sort((a, b) => {
            const dateA = a.order_date ? a.order_date.slice(0, 10) : "";
            const dateB = b.order_date ? b.order_date.slice(0, 10) : "";
            if (dateSort === "asc") {
                return dateA.localeCompare(dateB);
            }
            return dateB.localeCompare(dateA);
        });
    }, [dateFilteredOrders, search, statusFilter, dateSort]);

    function handleDelete() {
        if (!deleteOrder) return;
        router.delete(`/purchase/${deleteOrder.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteOrder(null);
                showToast("Purchase Order deleted.");
            },
            onError: () => showToast("Failed to delete order.", "error"),
        });
    }

    const handleStatusChange = (order, newStatus) => {
        if (order.status === newStatus) return;

        router.patch(`/purchase/${order.id}/status`, { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => {
                showToast(`Order #${order.po_number} updated to ${newStatus}.`);
                if (viewingOrderDetails && viewingOrderDetails.id === order.id) {
                    setViewingOrderDetails((prev) => ({
                        ...prev,
                        status: newStatus,
                        is_inventory_synced: newStatus === "Received" ? true : (prev.is_inventory_synced && newStatus !== "Received" ? false : prev.is_inventory_synced)
                    }));
                }
            },
            onError: () => showToast("Could not update status.", "error"),
        });
    };

    // Client-side image optimizer: fast downscale before upload so AI scan completes in 1-2 seconds
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
                `⚠️ Monthly AI Scan Limit Reached!\n\nYou have reached the limit of ${scanUsage.limit} scans for ${scanUsage.monthName}.\n\nSuperAdmin has unlimited scanning capacity. You can still add invoices manually using "Manual Invoice", or contact SuperAdmin to upgrade quota.`
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
                        setOcrStatusText("Extracting items, GST (CGST/SGST/IGST) & discounts...");
                    } else if (currentPct >= 35) {
                        setOcrStatusText("Analyzing invoice layout with Vama Lab AI...");
                    }
                }
            }, 120);

            try {
                const fileToUpload = await optimizeImageForOcr(file);

                const formData = new FormData();
                formData.append("bill_file", fileToUpload);

                const response = await axios.post("/purchase/scan", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                if (response.data?.success && response.data?.data) {
                    if (response.data.scan_usage) {
                        setScanUsage(response.data.scan_usage);
                    }

                    const parsed = response.data.data;

                    // Accurately resolve Tax Rate, CGST, SGST, IGST, Total GST
                    let cgstVal = parseFloat(parsed.cgst ?? parsed.financial_summary?.cgst ?? 0) || 0;
                    let sgstVal = parseFloat(parsed.sgst ?? parsed.financial_summary?.sgst ?? 0) || 0;
                    let igstVal = parseFloat(parsed.igst ?? parsed.financial_summary?.igst ?? 0) || 0;
                    let totalGstVal = parseFloat(parsed.total_gst ?? parsed.financial_summary?.total_gst ?? 0) || 0;
                    let taxRateVal = parseFloat(parsed.tax_rate) || 0;

                    let grossDiscVal = parseFloat(parsed.gross_discount ?? parsed.financial_summary?.gross_discount ?? parsed.financial_summary?.discount ?? 0) || 0;
                    let subtotalVal = parseFloat(parsed.subtotal ?? parsed.financial_summary?.subtotal ?? 0) || 0;
                    let roundOffVal = parseFloat(parsed.round_off ?? parsed.financial_summary?.round_off ?? 0) || 0;

                    // If total_gst is 0 but component taxes exist
                    if (!totalGstVal) {
                        if (igstVal > 0) {
                            totalGstVal = igstVal;
                        } else if (cgstVal > 0 || sgstVal > 0) {
                            totalGstVal = cgstVal + sgstVal;
                        }
                    }

                    // Format line items with discount, individual taxes, and amounts
                    const formattedItems = (parsed.items || []).map((item) => {
                        const rawUnit = (item.unit || item.per || "PCS").toString().toUpperCase().trim();
                        const qty = item.quantity !== null && item.quantity !== undefined ? parseFloat(item.quantity) : 1;
                        const rate = item.rate !== null && item.rate !== undefined ? parseFloat(item.rate) : 0;

                        let disc = "";
                        let discAmt = item.discount_amount ? parseFloat(item.discount_amount) : "";
                        if (item.discount_percent !== null && item.discount_percent !== undefined && item.discount_percent !== "") {
                            disc = parseFloat(item.discount_percent);
                        } else if (discAmt && qty * rate > 0) {
                            disc = parseFloat(((discAmt / (qty * rate)) * 100).toFixed(2));
                        }

                        let itemAmt = item.taxable_amount || item.amount;
                        if (!itemAmt && rate > 0) {
                            itemAmt = qty * rate;
                            if (disc > 0) itemAmt = itemAmt - (itemAmt * (disc / 100));
                        }

                        return {
                            description: item.description || "",
                            hsn_sac: item.hsn_sac || "",
                            quantity: qty || 1,
                            rate: rate !== 0 ? rate : "",
                            per: rawUnit || "PCS",
                            isCustomUnit: rawUnit ? !PURCHASE_STANDARD_UNITS.includes(rawUnit) : false,
                            discount_percent: disc !== "" ? disc : "",
                            discount_amount: discAmt !== "" ? discAmt : "",
                            amount: itemAmt !== null && itemAmt !== undefined ? parseFloat(parseFloat(itemAmt).toFixed(2)) : ((qty || 1) * (rate || 0)),
                        };
                    });

                    // If subtotal was not explicitly returned, calculate from line items
                    const itemsSubtotal = formattedItems.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
                    if (!subtotalVal && itemsSubtotal > 0) {
                        subtotalVal = itemsSubtotal;
                    }

                    // If tax_rate was not detected but we have total_gst and taxable value:
                    const taxableValueEst = Math.max(0, subtotalVal - grossDiscVal);
                    if (!taxRateVal && totalGstVal > 0 && taxableValueEst > 0) {
                        taxRateVal = Math.round((totalGstVal / taxableValueEst) * 100);
                    }

                    // If total_gst > 0 but cgst/sgst/igst are not broken down (default to 50/50 intra-state CGST/SGST)
                    if (totalGstVal > 0 && cgstVal === 0 && sgstVal === 0 && igstVal === 0) {
                        const half = parseFloat((totalGstVal / 2).toFixed(2));
                        cgstVal = half;
                        sgstVal = parseFloat((totalGstVal - half).toFixed(2));
                    }

                    let totalAmount = parsed.total_amount || parsed.financial_summary?.grand_total || "";
                    if (!totalAmount && itemsSubtotal > 0) {
                        totalAmount = (Math.max(0, itemsSubtotal - grossDiscVal) + totalGstVal + roundOffVal).toFixed(2);
                    }

                    const isDuplicate = Boolean(response.data?.is_duplicate);
                    const duplicateOrder = response.data?.duplicate_order;

                    clearInterval(timer);
                    setOcrProgressPercent(100);

                    if (isDuplicate && duplicateOrder) {
                        alert(
                            `⚠️ Duplicate Invoice Alert: Invoice #${duplicateOrder.invoice_number} has already been added in your purchase records (Supplier: ${duplicateOrder.supplier_name || "N/A"}, Date: ${duplicateOrder.order_date}, Total: ₹${parseFloat(duplicateOrder.total_amount || 0).toFixed(2)})!\n\nThe same invoice cannot be added twice.`
                        );
                        showToast(
                            `⚠️ Duplicate Bill: Invoice #${duplicateOrder.invoice_number} is already in your records!`,
                            "error"
                        );
                        return; // Stop here! Do not open the purchase form modal!
                    }

                    setOcrStatusText("Analysis complete! Opening invoice...");
                    await new Promise((resolve) => setTimeout(resolve, 250));

                    setInitialAutoData({
                        bill_file: response.data?.bill_file || file,
                        po_number: parsed.po_number || "",
                        supplier_name: parsed.supplier_name || "",
                        gst_number: parsed.gst_number || parsed.supplier_gst || "",
                        order_date: parsed.order_date || new Date().toISOString().split("T")[0],
                        subtotal: subtotalVal > 0 ? subtotalVal.toFixed(2) : "",
                        gross_discount: grossDiscVal > 0 ? grossDiscVal.toFixed(2) : "",
                        round_off: roundOffVal !== 0 ? roundOffVal.toFixed(2) : "",
                        tax_rate: taxRateVal > 0 ? taxRateVal : "",
                        cgst: cgstVal > 0 ? cgstVal.toFixed(2) : "",
                        sgst: sgstVal > 0 ? sgstVal.toFixed(2) : "",
                        igst: igstVal > 0 ? igstVal.toFixed(2) : "",
                        total_gst: totalGstVal > 0 ? totalGstVal.toFixed(2) : "",
                        total_amount: totalAmount,
                        items: formattedItems,
                        scan_summary: `${formattedItems.length} item${formattedItems.length === 1 ? "" : "s"} extracted from invoice sheet.${grossDiscVal > 0 ? ` Gross discount detected: ₹${grossDiscVal.toFixed(2)}.` : ""}`,
                        is_duplicate: isDuplicate,
                        duplicate_order: duplicateOrder,
                    });
                    setModalOpen(true);
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
                setInitialAutoData({ bill_file: file });
                setModalOpen(true);
            } finally {
                setOcrLoading(false);
                setOcrProgressPercent(0);
                setOcrStatusText("");
            }
        } else {
            setInitialAutoData({ bill_file: file });
            setModalOpen(true);
        }
    };

    const handleMainFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFileForScan(e.target.files[0]);
            e.target.value = "";
        }
    };

    const exportToTally = () => {
        if (!filteredOrders || filteredOrders.length === 0) {
            showToast("No purchase invoices available to export to Tally.", "error");
            return;
        }

        try {
            downloadTallyVouchers("purchase", filteredOrders, "Tally_Purchase_Vouchers", { startDate, endDate });
            showToast(`Downloaded a readable purchase spreadsheet for ${filteredOrders.length} invoices.`);
        } catch (error) {
            showToast(error.message || "Unable to create the purchase spreadsheet.", "error");
        }
    };

    return (
        <AppLayout title="Purchase Invoices">
            {auth?.user?.role === "super_admin" && !switchedAdmin && (
                <div style={{ padding: "12px 16px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4338ca" }}>
                        <span>🛡️</span>
                        <span>You are currently in <strong>Super Admin Root View</strong>. Use the store dropdown in the top bar to select an admin store and view its purchase bills.</span>
                    </div>
                </div>
            )}
            {/* Toast Notification Banner */}
            {toast && (
                <div className={`toast-notice ${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertCircle size={18} color="var(--danger)" />}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{toast.message}</span>
                </div>
            )}

            {/* AI OCR Loading Dialog */}
            {ocrLoading && (
                <div className="modal-overlay" style={{ zIndex: 99999 }}>
                    <div className="ai-scan-modal-box">
                        <div className="ai-scan-badge">
                            <ScanLine size={14} /> Vama Lab AI
                        </div>

                        <div className="ai-scan-spinner-wrap">
                            <div className="loading-ring ai-scan-spinner-ring"></div>
                            <div className="ai-scan-spinner-text">
                                {ocrProgressPercent}%
                            </div>
                        </div>

                        <div style={{ width: "100%" }}>
                            <div className="ai-scan-title">
                                Scanning Invoice with Vama Lab AI
                            </div>
                            <div className="ai-scan-status">
                                {ocrStatusText}
                            </div>

                            <div style={{
                                width: "100%",
                                height: 6,
                                background: "var(--bg-elevated, #f1f5f9)",
                                borderRadius: 999,
                                overflow: "hidden",
                                marginTop: 10
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

            {/* Compact Top KPI Metrics */}
            <div className="purchase-stats-grid">
                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--accent)" }}>
                        <IndianRupee size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Total Spend <span style={{ textTransform: "none", fontSize: 10, color: "var(--text-muted)" }}>(With GST)</span>
                            {metrics.isDateFiltered && <span style={{ textTransform: "none", color: "var(--accent)" }}> (Period)</span>}
                        </span>
                        <span className="purchase-stat-num">₹{metrics.totalSpendWithGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(14, 165, 233, 0.1)", color: "#0284c7" }}>
                        <IndianRupee size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Total Spend <span style={{ textTransform: "none", fontSize: 10, color: "var(--text-muted)" }}>(Without GST)</span>
                            {metrics.isDateFiltered && <span style={{ textTransform: "none", color: "var(--accent)" }}> (Period)</span>}
                        </span>
                        <span className="purchase-stat-num">₹{metrics.totalSpendWithoutGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                        <Receipt size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Total GST {metrics.isDateFiltered && <span style={{ textTransform: "none", color: "#8b5cf6" }}>(Period)</span>}
                        </span>
                        <span className="purchase-stat-num">₹{metrics.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(2, 132, 199, 0.1)", color: "var(--info)" }}>
                        <ShoppingBag size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            Total Invoices {metrics.isDateFiltered && <span style={{ textTransform: "none", color: "var(--info)" }}>(Period)</span>}
                        </span>
                        <span className="purchase-stat-num">{metrics.totalCount}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(217, 119, 6, 0.1)", color: "var(--warning)" }}>
                        <Clock size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Pending</span>
                        <span className="purchase-stat-num">{metrics.pendingCount}</span>
                    </div>
                </div>

                <div className="purchase-stat-compact">
                    <div className="purchase-stat-icon-wrap" style={{ background: "rgba(5, 150, 105, 0.1)", color: "var(--success)" }}>
                        <CheckCircle2 size={16} />
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">Received & Stocked</span>
                        <span className="purchase-stat-num">{metrics.receivedCount}</span>
                    </div>
                </div>

                {/* AI Scan Quota Card */}
                <div className="purchase-stat-compact" style={{
                    border: scanUsage.hasReachedLimit ? "1px solid rgba(239, 68, 68, 0.4)" : undefined,
                    background: scanUsage.hasReachedLimit ? "rgba(239, 68, 68, 0.04)" : undefined
                }}>
                    <div className="purchase-stat-icon-wrap" style={{
                        background: scanUsage.isSuperAdmin ? "rgba(99, 102, 241, 0.12)" : (scanUsage.hasReachedLimit ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)"),
                        color: scanUsage.isSuperAdmin ? "#6366f1" : (scanUsage.hasReachedLimit ? "#ef4444" : "#10b981")
                    }}>
                        {scanUsage.isSuperAdmin ? <Sparkles size={16} /> : <ScanLine size={16} />}
                    </div>
                    <div className="purchase-stat-info">
                        <span className="purchase-stat-title">
                            {scanUsage.isSuperAdmin ? "AI Scans" : `AI Scans (${scanUsage.monthName || "Month"})`}
                        </span>
                        <span className="purchase-stat-num">
                            {scanUsage.isSuperAdmin ? (
                                <span style={{ color: "#6366f1", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700 }}>
                                    Unlimited <Zap size={13} fill="#6366f1" />
                                </span>
                            ) : (
                                <span style={{ color: scanUsage.hasReachedLimit ? "#ef4444" : "inherit" }}>
                                    {scanUsage.used} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>/ {scanUsage.limit}</span>
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <div className="card page-full-card">
                {/* Search & Actions Toolbar */}
                <div className="table-toolbar">
                    <div className="toolbar-left">
                        <div className="search-input-wrap">
                            <Search size={15} />
                            <input
                                className="form-input search-input"
                                placeholder="Search by Invoice # or Supplier..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {/* Live AI Scan Counter Pill */}
                        {scanUsage.isSuperAdmin ? (
                            <div
                                className="scan-quota-badge"
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
                                    border: "1px solid rgba(99, 102, 241, 0.25)"
                                }}
                            >
                                <Sparkles size={13} />
                                <span>AI Scans: <strong>Unlimited</strong> (SuperAdmin)</span>
                            </div>
                        ) : (
                            <div
                                className="scan-quota-badge"
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
                                    border: scanUsage.hasReachedLimit ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.25)"
                                }}
                            >
                                <ScanLine size={13} />
                                <span>
                                    AI Scans: <strong>{scanUsage.used}/{scanUsage.limit}</strong> {scanUsage.hasReachedLimit ? "(Quota Full)" : `(${scanUsage.remaining} left)`}
                                </span>
                            </div>
                        )}

                        <button type="button" className="btn btn-secondary" onClick={exportToTally} title="Download a readable, itemized purchase spreadsheet">
                            <Download size={15} /> Export Tally (CSV)
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setImportModalOpen(true)}
                            title="Import purchase bills from Zoho Books, Vyapar, MyBillBook, Excel or CSV"
                        >
                            <UploadCloud size={15} /> Import Purchases
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleUploadBillClick}
                            title={!scanUsage.isSuperAdmin && scanUsage.hasReachedLimit ? `Scan limit reached (${scanUsage.limit}/${scanUsage.limit})` : "Upload invoice document to scan with AI"}
                            style={!scanUsage.isSuperAdmin && scanUsage.hasReachedLimit ? { borderColor: "rgba(239, 68, 68, 0.4)", color: "var(--danger)" } : {}}
                        >
                            <FileUp size={16} /> Upload Bill
                        </button>
                        <input
                            type="file"
                            style={{ display: "none" }}
                            ref={mainFileInputRef}
                            onChange={handleMainFileUpload}
                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        />
                        <button className="btn btn-primary" onClick={() => {
                            setInitialAutoData(null);
                            setModalOpen(true);
                        }}>
                            <Plus size={16} /> Manual Invoice
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
                            title="Open Date-wise Summary Breakdown report"
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
                                Checking Purchases for:{" "}
                                <strong>
                                    {startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Start"}
                                    {" — "}
                                    {endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}
                                </strong>
                                {" • "}
                                <span>{filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}</span>
                                {" • "}
                                <span>Period Total: <strong>₹{metrics.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
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

                {/* Status Filter Pills Bar */}
                <div className="filter-pills-bar">
                    <button
                        className={`filter-pill ${statusFilter === "All" ? "active" : ""}`}
                        onClick={() => setStatusFilter("All")}
                    >
                        All Orders <span className="filter-pill-badge">{metrics.totalCount}</span>
                    </button>
                    <button
                        className={`filter-pill ${statusFilter === "Pending" ? "active" : ""}`}
                        onClick={() => setStatusFilter("Pending")}
                    >
                        Pending <span className="filter-pill-badge">{metrics.pendingCount}</span>
                    </button>
                    <button
                        className={`filter-pill ${statusFilter === "Approved" ? "active" : ""}`}
                        onClick={() => setStatusFilter("Approved")}
                    >
                        Approved <span className="filter-pill-badge">{metrics.approvedCount}</span>
                    </button>
                    <button
                        className={`filter-pill ${statusFilter === "Received" ? "active" : ""}`}
                        onClick={() => setStatusFilter("Received")}
                    >
                        Received <span className="filter-pill-badge">{metrics.receivedCount}</span>
                    </button>
                    {metrics.cancelledCount > 0 && (
                        <button
                            className={`filter-pill ${statusFilter === "Cancelled" ? "active" : ""}`}
                            onClick={() => setStatusFilter("Cancelled")}
                        >
                            Cancelled <span className="filter-pill-badge">{metrics.cancelledCount}</span>
                        </button>
                    )}
                </div>

                {/* Orders Data Table */}
                <div className="table-container table-wrap">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Purchase Ref / Supplier Invoice</th>
                                <th>Supplier</th>
                                <th
                                    style={{ cursor: "pointer", userSelect: "none" }}
                                    onClick={toggleDateSort}
                                    title={`Click to sort by date (${dateSort === "desc" ? "Newest First" : "Oldest First"})`}
                                >
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        Date <ArrowUpDown size={11} style={{ opacity: 0.8 }} />
                                    </div>
                                </th>
                                <th>Items</th>
                                <th>Gross Disc</th>
                                <th>GST (Tax)</th>
                                <th>Total Amount</th>
                                <th>Tax Rate</th>
                                <th>Status & Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                        No purchase invoices found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, idx) => (
                                    <tr key={order.id}>
                                        <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{idx + 1}</td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => setViewingOrderDetails(order)}
                                                style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12 }}
                                                title="View invoice details and items"
                                            >
                                                <span style={{ display: "block" }}>{getPurchaseReference(order)}</span>
                                                <span style={{ display: "block", marginTop: 3, color: "var(--text-muted)", fontSize: 10.5, fontWeight: 500 }}>
                                                    Supplier invoice: {order.po_number}
                                                </span>
                                            </button>
                                        </td>
                                        <td style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>
                                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{order.supplier_name}</div>
                                            {order.gst_number && (
                                                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 1 }}>
                                                    GST: {order.gst_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="date-cell" style={{ fontSize: 11 }}>
                                            {formatDate(order.order_date)}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="badge badge-info"
                                                onClick={() => setViewingOrderDetails(order)}
                                                style={{ border: "none", cursor: "pointer", fontSize: 10.5 }}
                                                title="Click to view line items"
                                            >
                                                {order.items ? order.items.length : 0} items
                                            </button>
                                        </td>
                                        <td style={{ fontSize: 11.5 }}>
                                            {parseFloat(order.gross_discount || 0) > 0 ? (
                                                <span style={{ color: "#059669", fontWeight: 700, background: "rgba(16, 185, 129, 0.08)", padding: "2px 7px", borderRadius: 4, display: "inline-flex", alignItems: "center" }}>
                                                    -₹{parseFloat(order.gross_discount).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)" }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 11.5 }}>
                                            {parseFloat(order.total_gst || 0) > 0 ? (
                                                <div>
                                                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                                        ₹{parseFloat(order.total_gst).toFixed(2)}
                                                    </div>
                                                    {(parseFloat(order.cgst || 0) > 0 || parseFloat(order.sgst || 0) > 0 || parseFloat(order.igst || 0) > 0) && (
                                                        <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 4, flexWrap: "wrap", marginTop: 1 }}>
                                                            {parseFloat(order.cgst || 0) > 0 && <span>C: ₹{parseFloat(order.cgst).toFixed(2)}</span>}
                                                            {parseFloat(order.sgst || 0) > 0 && <span>S: ₹{parseFloat(order.sgst).toFixed(2)}</span>}
                                                            {parseFloat(order.igst || 0) > 0 && <span>I: ₹{parseFloat(order.igst).toFixed(2)}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)" }}>₹0.00</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 700, fontSize: 12.5 }}>₹{parseFloat(order.total_amount || 0).toFixed(2)}</td>
                                        <td style={{ fontSize: 11.5, fontWeight: 600 }}>
                                            {order.tax_rate !== null && order.tax_rate !== undefined && parseFloat(order.tax_rate) > 0 ? (
                                                <span style={{ background: "rgba(99, 102, 241, 0.08)", color: "var(--accent)", padding: "2px 7px", borderRadius: 4 }}>
                                                    {parseFloat(order.tax_rate)}%
                                                </span>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)" }}>0%</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                                                <div className="status-select-wrap">
                                                    <select
                                                        className={`status-select ${order.status}`}
                                                        value={order.status}
                                                        onChange={(e) => handleStatusChange(order, e.target.value)}
                                                        title="Click to update status and inventory sync"
                                                        style={{ fontSize: 11, padding: "2px 8px" }}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Approved">Approved</option>
                                                        <option value="Received">Received</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                                <span className={`stock-sync-indicator ${order.is_inventory_synced ? "synced" : "unsynced"}`}>
                                                    {order.is_inventory_synced ? "✓ Stocked" : "Pending Stock"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <TableActionDropdown label="Actions">
                                                <ActionItem
                                                    icon={Eye}
                                                    label="View Details"
                                                    onClick={() => setViewingOrderDetails(order)}
                                                    primary
                                                />
                                                {order.bill_file && (
                                                    <ActionItem
                                                        icon={Download}
                                                        label="Download File"
                                                        href={`/storage/${order.bill_file}`}
                                                        download={`Invoice_${order.po_number || "Bill"}.${order.bill_file.toLowerCase().endsWith(".pdf") ? "pdf" : "jpg"}`}
                                                    />
                                                )}
                                                <ActionItem
                                                    icon={Edit2}
                                                    label="Edit Order"
                                                    onClick={() => setEditingOrder(order)}
                                                />
                                                <ActionItem
                                                    icon={Trash2}
                                                    label="Delete Order"
                                                    onClick={() => setDeleteOrder(order)}
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

            {/* Comprehensive Order Details Modal */}
            {viewingOrderDetails && (
                <OrderDetailsModal
                    order={viewingOrderDetails}
                    onClose={() => setViewingOrderDetails(null)}
                    onStatusChange={handleStatusChange}
                    onEdit={(ord) => {
                        setViewingOrderDetails(null);
                        setEditingOrder(ord);
                    }}
                />
            )}

            {/* Edit Purchase Modal */}
            {editingOrder && (
                <PurchaseModal
                    order={editingOrder}
                    existingOrders={purchaseOrders}
                    onClose={() => setEditingOrder(null)}
                    onSaved={() => {
                        setEditingOrder(null);
                        showToast("Purchase Invoice updated successfully.");
                    }}
                />
            )}

            {/* Create Purchase Modal */}
            {modalOpen && (
                <PurchaseModal
                    initialData={initialAutoData}
                    existingOrders={purchaseOrders}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => {
                        setInitialAutoData(null);
                        showToast("Purchase Invoice created successfully.");
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteOrder && (
                <ConfirmDelete
                    order={deleteOrder}
                    onClose={() => setDeleteOrder(null)}
                    onConfirm={handleDelete}
                />
            )}

            {/* Date-wise Summary Breakdown Modal */}
            {showDateSummaryModal && (
                <DateSummaryModal
                    breakdown={dateBreakdown}
                    onClose={() => setShowDateSummaryModal(false)}
                    onSelectDate={(date) => {
                        setStartDate(date);
                        setEndDate(date);
                        setDatePreset("Custom");
                        setShowDateSummaryModal(false);
                        showToast(`Showing purchase orders for ${date}.`);
                    }}
                />
            )}

            <DataImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                type="purchase"
                onSuccess={() => {
                    router.reload({ only: ['purchaseOrders'] });
                    showToast("Purchases imported successfully!");
                }}
            />
            <datalist id="purchase-unit-options">
                <option value="PCS">PCS (Pieces)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="CM">CM (Centimeters)</option>
                <option value="MM">MM (Millimeters)</option>
                <option value="M">M (Meters)</option>
                <option value="BOX">BOX</option>
                <option value="LTR">LTR (Liters)</option>
                <option value="SET">SET</option>
                <option value="ROLL">ROLL</option>
                <option value="PKT">PKT (Packets)</option>
                <option value="NOS">NOS (Numbers)</option>
            </datalist>
        </AppLayout>
    );
}
