import { useState, useRef, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import {
    X,
    UploadCloud,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Download,
    ArrowRight,
    ArrowLeft,
    Check,
    RotateCcw,
    Layers,
    FileText,
    Sparkles,
    RefreshCw,
    HelpCircle,
    CheckCheck,
    Boxes,
    FileCheck,
} from "lucide-react";
import {
    INVENTORY_FIELDS,
    PURCHASE_FIELDS,
    SALES_FIELDS,
    SOFTWARE_PRESETS,
    detectSoftwarePreset,
    autoMapColumns,
    transformRows,
    groupPurchaseRows,
    groupSalesRows,
    parseNumber,
} from "@/utils/importFieldMapper";

export default function DataImportModal({
    isOpen,
    onClose,
    type = "inventory", // 'inventory' | 'purchase' | 'sales'
    mode = "standard",   // For inventory: 'standard' | 'barcode'
    onSuccess,
}) {
    if (!isOpen) return null;

    // ─── State ───────────────────────────────────────────────────────────────
    const [step, setStep] = useState(1); // 1 = Upload, 2 = Map & Preview, 3 = Result
    const [fileName, setFileName] = useState("");
    const [fileSize, setFileSize] = useState("");
    const [rawRows, setRawRows] = useState([]);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState("auto");
    const [detectedPresetId, setDetectedPresetId] = useState("generic");
    const [columnMapping, setColumnMapping] = useState({});

    // Import configuration options
    const [duplicateAction, setDuplicateAction] = useState(
        type === "inventory" ? "update" : "skip"
    );
    const [syncInventory, setSyncInventory] = useState(type === "purchase");
    const [createCustomers, setCreateCustomers] = useState(true);

    // Progress & Execution
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const fileInputRef = useRef(null);

    // Lock body scroll and listen for Escape key when modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !importing) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [importing, onClose]);

    // Get field definition for current type
    const targetFields = useMemo(() => {
        if (type === "purchase") return PURCHASE_FIELDS;
        if (type === "sales") return SALES_FIELDS;
        return INVENTORY_FIELDS;
    }, [type]);

    const title = useMemo(() => {
        if (type === "purchase") return "Import Purchase Bills";
        if (type === "sales") return "Import Sales Invoices";
        return "Import Inventory Items";
    }, [type]);

    const templateEndpoint = useMemo(() => {
        if (type === "purchase") return "/purchase/import/template";
        if (type === "sales") return "/invoices/import/template";
        return "/inventory/import/template";
    }, [type]);

    const importEndpoint = useMemo(() => {
        if (type === "purchase") return "/purchase/import";
        if (type === "sales") return "/invoices/import";
        return "/inventory/import";
    }, [type]);

    // ─── File Parsing with SheetJS (XLSX, XLS, CSV) ───────────────────────────
    const handleFile = (file) => {
        if (!file) return;
        setErrorMessage("");

        const validExts = [".xlsx", ".xls", ".csv", ".tsv", ".txt"];
        const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
        if (!hasValidExt && !file.type.includes("sheet") && !file.type.includes("csv")) {
            setErrorMessage("Please upload an Excel (.xlsx, .xls) or CSV file.");
            return;
        }

        setFileName(file.name);
        setFileSize((file.size / 1024).toFixed(1) + " KB");

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });

                // Get the first worksheet
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    throw new Error("No sheet found in uploaded file.");
                }
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert sheet to JSON array of objects (header = 1st non-empty row)
                const rows = XLSX.utils.sheet_to_json(worksheet, {
                    defval: "",
                    blankrows: false,
                });

                if (rows.length === 0) {
                    throw new Error("The uploaded sheet contains no data rows.");
                }

                // Extract headers from keys of the first row
                const headers = Object.keys(rows[0]).filter(
                    (h) => !h.startsWith("__EMPTY") && h.trim() !== ""
                );

                if (headers.length === 0) {
                    throw new Error("Could not detect column headers in the file.");
                }

                setRawRows(rows);
                setFileHeaders(headers);

                // Auto-detect software source (Zoho, Vyapar, MyBillBook, etc.)
                const detected = detectSoftwarePreset(headers);
                setDetectedPresetId(detected);
                setSelectedPreset(detected);

                // Auto-map fields
                const initialMapping = autoMapColumns(targetFields, headers);
                setColumnMapping(initialMapping);

                setStep(2);
            } catch (err) {
                console.error("File Parse Error:", err);
                setErrorMessage(err.message || "Failed to parse file. Please verify file format.");
            }
        };

        reader.onerror = () => {
            setErrorMessage("Failed to read the file. Please try again.");
        };

        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // ─── Manual Preset Switch ────────────────────────────────────────────────
    const handlePresetChange = (presetId) => {
        setSelectedPreset(presetId);
        if (fileHeaders.length > 0) {
            const newMapping = autoMapColumns(targetFields, fileHeaders);
            setColumnMapping(newMapping);
        }
    };

    // ─── Mapped Preview Data ─────────────────────────────────────────────────
    const mappedRows = useMemo(() => {
        return transformRows(rawRows, columnMapping);
    }, [rawRows, columnMapping]);

    const previewRows = useMemo(() => {
        return mappedRows.slice(0, 5);
    }, [mappedRows]);

    // Validation check: ensure required fields are mapped
    const missingRequired = useMemo(() => {
        return targetFields
            .filter((f) => f.required && !columnMapping[f.key])
            .map((f) => f.label);
    }, [targetFields, columnMapping]);

    // ─── Perform Import ──────────────────────────────────────────────────────
    const handleImport = async () => {
        if (missingRequired.length > 0) {
            setErrorMessage(
                `Please map required field(s): ${missingRequired.join(", ")}`
            );
            return;
        }

        setImporting(true);
        setErrorMessage("");

        try {
            let payload = {};

            if (type === "inventory") {
                const validItems = mappedRows
                    .filter((r) => r.item && String(r.item).trim() !== "")
                    .map((r) => ({
                        item: String(r.item).trim(),
                        code: r.code ? String(r.code).trim() : null,
                        qty: parseNumber(r.qty, 0),
                        unit: r.unit ? String(r.unit).trim().toUpperCase() : "PCS",
                        selling_price: parseNumber(r.selling_price, 0),
                    }));

                if (validItems.length === 0) {
                    throw new Error("No valid items found to import. Item Name is required.");
                }

                payload = {
                    items: validItems,
                    mode: mode || "standard",
                    duplicate_action: duplicateAction,
                };
            } else if (type === "purchase") {
                const groupedOrders = groupPurchaseRows(mappedRows);
                if (groupedOrders.length === 0) {
                    throw new Error("No valid purchase records found to import.");
                }

                payload = {
                    orders: groupedOrders,
                    sync_inventory: Boolean(syncInventory),
                    duplicate_action: duplicateAction,
                };
            } else if (type === "sales") {
                const groupedInvoices = groupSalesRows(mappedRows);
                if (groupedInvoices.length === 0) {
                    throw new Error("No valid sales invoice records found to import.");
                }

                payload = {
                    invoices: groupedInvoices,
                    sync_inventory: Boolean(syncInventory),
                    create_customers: Boolean(createCustomers),
                    duplicate_action: duplicateAction,
                };
            }

            const response = await axios.post(importEndpoint, payload, {
                headers: {
                    "X-CSRF-TOKEN":
                        document.querySelector("meta[name=csrf-token]")?.content || "",
                },
            });

            if (response.data && response.data.success) {
                setImportResult(response.data);
                setStep(3);
                if (typeof onSuccess === "function") {
                    onSuccess(response.data);
                }
            } else {
                throw new Error(response.data?.message || "Import failed");
            }
        } catch (err) {
            console.error("Import execution failed:", err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                "Failed to import data. Please check your data format.";
            setErrorMessage(msg);
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setFileName("");
        setFileSize("");
        setRawRows([]);
        setFileHeaders([]);
        setColumnMapping({});
        setImportResult(null);
        setErrorMessage("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div
            className="modal-overlay import-modal-overlay"
            onClick={!importing ? onClose : undefined}
        >
            <div
                className="modal-box import-modal-box"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="import-modal-header">
                    <div>
                        <h2
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                            }}
                        >
                            <span
                                style={{
                                    display: "inline-flex",
                                    padding: 6,
                                    borderRadius: 8,
                                    background: "rgba(79, 70, 229, 0.1)",
                                    color: "var(--accent, #4f46e5)",
                                }}
                            >
                                <FileSpreadsheet size={18} />
                            </span>
                            {title}
                        </h2>
                        <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                            Import data from <strong>Zoho Books</strong>, <strong>Vyapar</strong>, <strong>MyBillBook</strong>, or any Excel / CSV file.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={onClose}
                        disabled={importing}
                        title="Close (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Stepper & Download Template Bar */}
                <div className="import-modal-stepper-bar">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 10px",
                                borderRadius: 999,
                                background: step === 1 ? "var(--accent)" : "rgba(79, 70, 229, 0.1)",
                                color: step === 1 ? "#fff" : "var(--accent)",
                                fontSize: 12,
                            }}
                        >
                            1. Select File
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>›</span>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 10px",
                                borderRadius: 999,
                                background: step === 2 ? "var(--accent)" : "rgba(0,0,0,0.05)",
                                color: step === 2 ? "#fff" : "var(--text-muted)",
                                fontSize: 12,
                            }}
                        >
                            2. Map Columns
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>›</span>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 10px",
                                borderRadius: 999,
                                background: step === 3 ? "var(--accent)" : "rgba(0,0,0,0.05)",
                                color: step === 3 ? "#fff" : "var(--text-muted)",
                                fontSize: 12,
                            }}
                        >
                            3. Complete
                        </span>
                    </div>

                    <a
                        href={templateEndpoint}
                        download
                        className="btn btn-secondary btn-sm"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            textDecoration: "none",
                            fontSize: 12,
                            padding: "4px 10px",
                        }}
                        title="Download sample template with example headers and rows"
                    >
                        <Download size={13} /> Download Sample CSV
                    </a>
                </div>

                {/* Error Alert Box */}
                {errorMessage && (
                    <div
                        style={{
                            margin: "14px 24px 0",
                            padding: "10px 14px",
                            borderRadius: "var(--radius-sm, 8px)",
                            background: "var(--danger-bg, #fff1f2)",
                            border: "1px solid #fecdd3",
                            color: "var(--danger, #e11d48)",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                        }}
                    >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{errorMessage}</span>
                    </div>
                )}

                {/* Body Content (Scrolls if needed) */}
                <div className="import-modal-body">
                    {/* STEP 1: Upload Dropzone & Compatibility Guide */}
                    {step === 1 && (
                        <div className="import-grid-step1">
                            {/* Left: Drag & Drop Zone */}
                            <div
                                className="import-dropzone"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div
                                    style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: "50%",
                                        background: "rgba(79, 70, 229, 0.1)",
                                        color: "var(--accent, #4f46e5)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 16,
                                    }}
                                >
                                    <UploadCloud size={32} />
                                </div>
                                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                                    Drag & Drop Spreadsheet File Here
                                </h3>
                                <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", maxWidth: 360 }}>
                                    Drop your exported file from Zoho, Vyapar, or MyBillBook directly, or choose from computer.
                                </p>

                                <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                                    {["XLSX", "XLS", "CSV"].map((ext) => (
                                        <span
                                            key={ext}
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: 6,
                                                background: "rgba(15, 23, 42, 0.06)",
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            .{ext}
                                        </span>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ pointerEvents: "none", fontSize: 13, padding: "8px 18px" }}
                                >
                                    Browse from Computer
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFile(e.target.files[0]);
                                        }
                                    }}
                                />
                            </div>

                            {/* Right: Compatibility Cards & Migration Help */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Supported Software Card */}
                                <div
                                    style={{
                                        padding: 16,
                                        borderRadius: "var(--radius-lg, 12px)",
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border)",
                                    }}
                                >
                                    <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                                        Instant One-Click Compatibility
                                    </span>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                            <span style={{ color: "#ea580c", fontWeight: 700 }}>✓ Vyapar:</span>
                                            <span style={{ color: "var(--text-secondary)" }}>Direct Items, Sales Invoices & Purchase Bills</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                            <span style={{ color: "#dc2626", fontWeight: 700 }}>✓ Zoho Books:</span>
                                            <span style={{ color: "var(--text-secondary)" }}>Items List, Invoices & Bills CSV/XLS exports</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                            <span style={{ color: "#8b5cf6", fontWeight: 700 }}>✓ MyBillBook:</span>
                                            <span style={{ color: "var(--text-secondary)" }}>Item Master, Sales & Purchase Excel files</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                            <span style={{ color: "#059669", fontWeight: 700 }}>✓ Generic Excel:</span>
                                            <span style={{ color: "var(--text-secondary)" }}>Any custom spreadsheet with header columns</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sample Template Card */}
                                <div
                                    style={{
                                        padding: 16,
                                        borderRadius: "var(--radius-lg, 12px)",
                                        background: "rgba(79, 70, 229, 0.05)",
                                        border: "1px solid rgba(79, 70, 229, 0.2)",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        flex: 1,
                                    }}
                                >
                                    <div>
                                        <strong style={{ fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                            <Sparkles size={14} color="var(--accent)" /> Don't have an existing file?
                                        </strong>
                                        <p style={{ margin: "5px 0 12px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                            Download our pre-formatted sample spreadsheet with test records, fill in your data, and import directly.
                                        </p>
                                    </div>

                                    <a
                                        href={templateEndpoint}
                                        download
                                        className="btn btn-secondary btn-sm"
                                        style={{ textDecoration: "none", width: "100%", justifyContent: "center", fontWeight: 600 }}
                                    >
                                        <Download size={13} /> Download Sample {type === "inventory" ? "Items" : type === "purchase" ? "Purchases" : "Sales"} CSV
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Map Columns, Live Preview & Settings */}
                    {step === 2 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* File Info Bar */}
                            <div className="import-file-info-bar">
                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                    <div
                                        style={{
                                            padding: 8,
                                            borderRadius: 8,
                                            background: "rgba(79, 70, 229, 0.1)",
                                            color: "var(--accent)",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <FileSpreadsheet size={18} />
                                    </div>
                                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                            {fileName}
                                        </div>
                                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                                            {fileSize} • <strong>{rawRows.length}</strong> rows • <strong>{fileHeaders.length}</strong> columns
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                                        Preset:
                                    </span>
                                    <select
                                        className="form-input"
                                        style={{ fontSize: 12, padding: "5px 10px", width: "auto" }}
                                        value={selectedPreset}
                                        onChange={(e) => handlePresetChange(e.target.value)}
                                    >
                                        {SOFTWARE_PRESETS.map((preset) => (
                                            <option key={preset.id} value={preset.id}>
                                                {preset.id === detectedPresetId ? `✨ ${preset.name} (Detected)` : preset.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={handleReset}
                                        title="Choose a different file"
                                    >
                                        <RotateCcw size={12} /> Replace File
                                    </button>
                                </div>
                            </div>

                            {/* Column Mapping Section */}
                            <div
                                style={{
                                    borderRadius: "var(--radius-lg, 12px)",
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        padding: "12px 18px",
                                        borderBottom: "1px solid var(--border)",
                                        background: "var(--bg-elevated)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                        Field Column Mapping
                                    </span>
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                        Assign your file's columns to system fields
                                    </span>
                                </div>

                                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                                    <table className="data-table import-mapping-table" style={{ fontSize: 12.5, margin: 0 }}>
                                        <thead>
                                            <tr style={{ background: "var(--bg-surface)", position: "sticky", top: 0, zIndex: 2 }}>
                                                <th style={{ width: "35%" }}>System Field</th>
                                                <th style={{ width: "45%" }}>Your File Header</th>
                                                <th style={{ width: "20%", textAlign: "center" }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {targetFields.map((field) => {
                                                const currentHeader = columnMapping[field.key] || "";
                                                const isMapped = Boolean(currentHeader);

                                                return (
                                                    <tr key={field.key}>
                                                        <td>
                                                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                                                {field.label}{" "}
                                                                {field.required ? (
                                                                    <span style={{ color: "var(--danger)" }} title="Required">*</span>
                                                                ) : (
                                                                    <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                                {field.description}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-input"
                                                                style={{
                                                                    fontSize: 12,
                                                                    padding: "5px 10px",
                                                                    background: isMapped ? "rgba(16, 185, 129, 0.04)" : "inherit",
                                                                    borderColor: isMapped ? "#10b981" : (!isMapped && field.required ? "var(--danger)" : "var(--border)"),
                                                                }}
                                                                value={currentHeader}
                                                                onChange={(e) => {
                                                                    setColumnMapping((prev) => ({
                                                                        ...prev,
                                                                        [field.key]: e.target.value,
                                                                    }));
                                                                }}
                                                            >
                                                                <option value="">-- Do Not Import (Skip) --</option>
                                                                {fileHeaders.map((header) => (
                                                                    <option key={header} value={header}>
                                                                        {header}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="import-mapping-status-cell" style={{ textAlign: "center" }}>
                                                            {isMapped ? (
                                                                <span
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: 4,
                                                                        padding: "3px 8px",
                                                                        borderRadius: 999,
                                                                        background: "var(--success-bg, #ecfdf5)",
                                                                        color: "var(--success, #059669)",
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    <Check size={11} /> Mapped
                                                                </span>
                                                            ) : field.required ? (
                                                                <span
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: 4,
                                                                        padding: "3px 8px",
                                                                        borderRadius: 999,
                                                                        background: "var(--danger-bg, #fff1f2)",
                                                                        color: "var(--danger, #e11d48)",
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Missing
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        padding: "3px 8px",
                                                                        borderRadius: 999,
                                                                        background: "rgba(0,0,0,0.05)",
                                                                        color: "var(--text-muted)",
                                                                        fontSize: 11,
                                                                    }}
                                                                >
                                                                    Omitted
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Live Preview Table */}
                            <div
                                style={{
                                    borderRadius: "var(--radius-lg, 12px)",
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        padding: "10px 18px",
                                        borderBottom: "1px solid var(--border)",
                                        background: "var(--bg-elevated)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                        Mapped Data Preview (First 5 Rows)
                                    </span>
                                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                                        Showing how records will be stored
                                    </span>
                                </div>

                                <div style={{ overflowX: "auto" }}>
                                    <table className="data-table" style={{ fontSize: 12, margin: 0 }}>
                                        <thead>
                                            <tr style={{ background: "var(--bg-surface)" }}>
                                                <th style={{ width: 40 }}>#</th>
                                                {targetFields
                                                    .filter((f) => columnMapping[f.key])
                                                    .map((f) => (
                                                        <th key={f.key}>{f.label}</th>
                                                    ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, i) => (
                                                <tr key={i}>
                                                    <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                                                    {targetFields
                                                        .filter((f) => columnMapping[f.key])
                                                        .map((f) => (
                                                            <td key={f.key}>
                                                                {row[f.key] !== null && row[f.key] !== undefined && row[f.key] !== ""
                                                                    ? String(row[f.key])
                                                                    : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                            </td>
                                                        ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Import Settings Card */}
                            <div className="import-settings-card">
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <label style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                        Duplicate Records:
                                    </label>
                                    <select
                                        className="form-input"
                                        style={{ display: "inline-block", width: "auto", fontSize: 12, padding: "4px 8px" }}
                                        value={duplicateAction}
                                        onChange={(e) => setDuplicateAction(e.target.value)}
                                    >
                                        {type === "inventory" && (
                                            <option value="update">Update existing stock & price (Recommended)</option>
                                        )}
                                        <option value="skip">Skip existing records</option>
                                        {type === "purchase" && (
                                            <option value="replace">Overwrite & replace existing bills</option>
                                        )}
                                        <option value="create_new">Create as new separate records</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                                    {(type === "purchase" || type === "sales") && (
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 500, color: "var(--text-secondary)" }}>
                                            <input
                                                type="checkbox"
                                                checked={syncInventory}
                                                onChange={(e) => setSyncInventory(e.target.checked)}
                                            />
                                            <span>
                                                {type === "purchase"
                                                    ? "Sync purchased quantities to Inventory"
                                                    : "Deduct sold quantities from Inventory"}
                                            </span>
                                        </label>
                                    )}

                                    {type === "sales" && (
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 500, color: "var(--text-secondary)" }}>
                                            <input
                                                type="checkbox"
                                                checked={createCustomers}
                                                onChange={(e) => setCreateCustomers(e.target.checked)}
                                            />
                                            <span>Save new customers to Directory</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Results & Execution Summary */}
                    {step === 3 && importResult && (
                        <div style={{ textAlign: "center", padding: "30px 16px" }}>
                            <div
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    background: "var(--success-bg, #ecfdf5)",
                                    color: "var(--success, #059669)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 18px",
                                }}
                            >
                                <CheckCheck size={36} />
                            </div>

                            <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                                Data Imported Successfully!
                            </h3>
                            <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "var(--text-muted)" }}>
                                {importResult.message || "Your spreadsheet records have been integrated into the database."}
                            </p>

                            {/* Metric Cards */}
                            {importResult.summary && (
                                <div className="import-results-grid">
                                    {importResult.summary.created !== undefined && (
                                        <div style={{ padding: 16, borderRadius: "var(--radius-lg, 12px)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--success, #059669)" }}>
                                                {importResult.summary.created}
                                            </div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>New Records Added</div>
                                        </div>
                                    )}

                                    {importResult.summary.updated !== undefined && (
                                        <div style={{ padding: 16, borderRadius: "var(--radius-lg, 12px)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>
                                                {importResult.summary.updated}
                                            </div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Existing Updated</div>
                                        </div>
                                    )}

                                    {importResult.summary.skipped !== undefined && (
                                        <div style={{ padding: 16, borderRadius: "var(--radius-lg, 12px)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-muted)" }}>
                                                {importResult.summary.skipped}
                                            </div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Skipped</div>
                                        </div>
                                    )}

                                    {importResult.summary.customers_created !== undefined && (
                                        <div style={{ padding: 16, borderRadius: "var(--radius-lg, 12px)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: "#8b5cf6" }}>
                                                {importResult.summary.customers_created}
                                            </div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Customers Added</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Warnings/Skipped Details */}
                            {importResult.summary?.errors && importResult.summary.errors.length > 0 && (
                                <div
                                    style={{
                                        textAlign: "left",
                                        padding: 14,
                                        borderRadius: "var(--radius-md, 10px)",
                                        background: "var(--warning-bg, #fffbeb)",
                                        border: "1px solid #fde68a",
                                        fontSize: 12,
                                        color: "#b45309",
                                        maxHeight: 140,
                                        overflowY: "auto",
                                        maxWidth: 600,
                                        margin: "0 auto",
                                    }}
                                >
                                    <strong>Details / Skipped Items:</strong>
                                    <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                                        {importResult.summary.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="import-modal-footer">
                    <div>
                        {step === 2 && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setStep(1)}
                                disabled={importing}
                            >
                                <ArrowLeft size={14} /> Back to File
                            </button>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        {step !== 3 ? (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={onClose}
                                    disabled={importing}
                                >
                                    Cancel
                                </button>
                                {step === 2 && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleImport}
                                        disabled={importing || missingRequired.length > 0}
                                        style={{ minWidth: 160 }}
                                    >
                                        {importing ? (
                                            <>
                                                <RefreshCw size={14} className="animate-spin" /> Importing Data...
                                            </>
                                        ) : (
                                            <>
                                                Confirm & Import ({mappedRows.length}) <ArrowRight size={14} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={onClose}
                                style={{ minWidth: 120 }}
                            >
                                Done & View Records
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
