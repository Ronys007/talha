import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import {
    X,
    UploadCloud,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Download,
    HelpCircle,
    ArrowRight,
    ArrowLeft,
    Check,
    RotateCcw,
    Layers,
    FileText,
    Sparkles,
    RefreshCw,
    ExternalLink,
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
                // Filter out rows without item name
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
        <div className="modal-backdrop">
            <div
                className="modal-container"
                style={{
                    maxWidth: step === 2 ? 960 : 720,
                    width: "95%",
                    maxHeight: "92vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FileSpreadsheet size={20} className="text-primary" />
                            {title}
                        </h2>
                        <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                            Import data effortlessly from <strong>Zoho Books</strong>, <strong>Vyapar</strong>, <strong>MyBillBook</strong>, or any Excel / CSV spreadsheet.
                        </p>
                    </div>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        disabled={importing}
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Stepper Indicator */}
                <div
                    style={{
                        padding: "10px 24px",
                        background: "rgba(0,0,0,0.02)",
                        borderBottom: "1px solid var(--border-color, #e2e8f0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12.5,
                        fontWeight: 600,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <span style={{ color: step >= 1 ? "var(--accent, #4f46e5)" : "var(--text-muted)" }}>
                            1. Upload File
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                        <span style={{ color: step >= 2 ? "var(--accent, #4f46e5)" : "var(--text-muted)" }}>
                            2. Map Columns & Preview
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                        <span style={{ color: step === 3 ? "var(--accent, #4f46e5)" : "var(--text-muted)" }}>
                            3. Import Complete
                        </span>
                    </div>

                    <a
                        href={templateEndpoint}
                        download
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: "var(--accent, #4f46e5)",
                            textDecoration: "none",
                            fontSize: 12,
                        }}
                        title="Download standard template with sample rows"
                    >
                        <Download size={13} />
                        Download Sample Template (CSV)
                    </a>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div
                        style={{
                            margin: "12px 24px 0",
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "#b91c1c",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Body Content */}
                <div className="modal-body" style={{ overflowY: "auto", flex: 1, padding: 24 }}>
                    {/* STEP 1: Upload Dropzone */}
                    {step === 1 && (
                        <div>
                            {/* Preset Badges Info */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                                    SUPPORTED SOFTWARE FORMATS
                                </label>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {SOFTWARE_PRESETS.filter((p) => p.id !== "auto").map((preset) => (
                                        <div
                                            key={preset.id}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: 999,
                                                background: "rgba(99, 102, 241, 0.06)",
                                                border: "1px solid rgba(99, 102, 241, 0.18)",
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: preset.color,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                            }}
                                        >
                                            <span>✓</span>
                                            {preset.badge}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dropzone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: "2px dashed var(--accent, #4f46e5)",
                                    borderRadius: 12,
                                    padding: "45px 20px",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    background: "rgba(99, 102, 241, 0.02)",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <div
                                    style={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: "50%",
                                        background: "rgba(99, 102, 241, 0.1)",
                                        color: "var(--accent, #4f46e5)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: "0 auto 14px",
                                    }}
                                >
                                    <UploadCloud size={28} />
                                </div>
                                <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>
                                    Click or Drag & Drop File Here
                                </h4>
                                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                                    Supports <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> exports directly from your accounting app
                                </p>
                                <span
                                    className="btn btn-secondary"
                                    style={{ pointerEvents: "none", fontSize: 12.5 }}
                                >
                                    Browse Files
                                </span>
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

                            {/* Helpful Instructions */}
                            <div
                                style={{
                                    marginTop: 20,
                                    padding: 14,
                                    borderRadius: 8,
                                    background: "rgba(0,0,0,0.03)",
                                    fontSize: 12.5,
                                    color: "var(--text-secondary)",
                                    lineHeight: 1.5,
                                }}
                            >
                                <strong style={{ color: "var(--text-primary)" }}>💡 Easy Migration Tip:</strong>
                                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                                    <li><strong>Vyapar:</strong> Go to Items / Reports → Export to Excel/CSV. Upload directly without renaming columns.</li>
                                    <li><strong>Zoho Books:</strong> Go to Items / Invoices / Bills → Click the hamburger menu → Export as CSV or XLS.</li>
                                    <li><strong>MyBillBook:</strong> Go to Items / Transactions → Export to Excel.</li>
                                    <li>Our intelligent mapper will automatically identify and align all column headers in Step 2.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Column Mapping & Data Preview */}
                    {step === 2 && (
                        <div>
                            {/* File Info & Detected Preset Banner */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 10,
                                    padding: "10px 14px",
                                    borderRadius: 8,
                                    background: "rgba(99, 102, 241, 0.06)",
                                    border: "1px solid rgba(99, 102, 241, 0.2)",
                                    marginBottom: 18,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <FileSpreadsheet size={20} color="var(--accent)" />
                                    <div>
                                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{fileName}</div>
                                        <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                                            {fileSize} • {rawRows.length} rows loaded • {fileHeaders.length} columns detected
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Format:</span>
                                    <select
                                        className="form-input"
                                        style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
                                        value={selectedPreset}
                                        onChange={(e) => handlePresetChange(e.target.value)}
                                    >
                                        {SOFTWARE_PRESETS.map((preset) => (
                                            <option key={preset.id} value={preset.id}>
                                                {preset.id === detectedPresetId ? `✨ ${preset.name} (Auto-detected)` : preset.name}
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

                            {/* Column Mapping Table */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                                        Field Column Mapping
                                    </h4>
                                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                        Review or modify column assignments:
                                    </span>
                                </div>

                                <div style={{ border: "1px solid var(--border-color, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
                                    <table className="data-table" style={{ fontSize: 12.5, margin: 0 }}>
                                        <thead>
                                            <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                                                <th style={{ width: "35%" }}>Our System Field</th>
                                                <th style={{ width: "45%" }}>Your File's Column Header</th>
                                                <th style={{ width: "20%", textAlign: "center" }}>Match Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {targetFields.map((field) => {
                                                const currentHeader = columnMapping[field.key] || "";
                                                const isMapped = Boolean(currentHeader);

                                                return (
                                                    <tr key={field.key}>
                                                        <td>
                                                            <div style={{ fontWeight: 600 }}>
                                                                {field.label}{" "}
                                                                {field.required ? (
                                                                    <span style={{ color: "var(--danger, #ef4444)" }} title="Required">*</span>
                                                                ) : (
                                                                    <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                                                {field.description}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-input"
                                                                style={{
                                                                    fontSize: 12,
                                                                    padding: "5px 10px",
                                                                    borderColor: !isMapped && field.required ? "rgba(239, 68, 68, 0.5)" : "inherit",
                                                                }}
                                                                value={currentHeader}
                                                                onChange={(e) => {
                                                                    setColumnMapping((prev) => ({
                                                                        ...prev,
                                                                        [field.key]: e.target.value,
                                                                    }));
                                                                }}
                                                            >
                                                                <option value="">-- Do Not Import / Skip --</option>
                                                                {fileHeaders.map((header) => (
                                                                    <option key={header} value={header}>
                                                                        {header}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td style={{ textAlign: "center" }}>
                                                            {isMapped ? (
                                                                <span
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: 4,
                                                                        padding: "3px 8px",
                                                                        borderRadius: 999,
                                                                        background: "rgba(16, 185, 129, 0.12)",
                                                                        color: "#059669",
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
                                                                        background: "rgba(239, 68, 68, 0.1)",
                                                                        color: "#dc2626",
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

                            {/* Live Preview Table (First 5 rows) */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 700 }}>
                                    Data Preview (First 5 Rows Mapped)
                                </h4>
                                <div style={{ overflowX: "auto", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: 8 }}>
                                    <table className="data-table" style={{ fontSize: 12, margin: 0 }}>
                                        <thead>
                                            <tr style={{ background: "rgba(0,0,0,0.02)" }}>
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

                            {/* Import Options / Settings */}
                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 8,
                                    background: "rgba(0,0,0,0.02)",
                                    border: "1px solid var(--border-color, #e2e8f0)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                }}
                            >
                                <strong style={{ fontSize: 13 }}>Import Settings:</strong>

                                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", fontSize: 12.5 }}>
                                    <div>
                                        <label style={{ fontWeight: 600, marginRight: 8 }}>Duplicate Handling:</label>
                                        <select
                                            className="form-input"
                                            style={{ display: "inline-block", width: "auto", fontSize: 12, padding: "4px 8px" }}
                                            value={duplicateAction}
                                            onChange={(e) => setDuplicateAction(e.target.value)}
                                        >
                                            {type === "inventory" && (
                                                <option value="update">Update existing item stock & price (Recommended)</option>
                                            )}
                                            <option value="skip">Skip existing records</option>
                                            {type === "purchase" && (
                                                <option value="replace">Overwrite & replace existing purchase bills</option>
                                            )}
                                            <option value="create_new">Create as new separate records</option>
                                        </select>
                                    </div>

                                    {(type === "purchase" || type === "sales") && (
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={syncInventory}
                                                onChange={(e) => setSyncInventory(e.target.checked)}
                                            />
                                            <span>
                                                {type === "purchase"
                                                    ? "Sync quantities directly into Inventory stock"
                                                    : "Deduct quantities from Inventory stock"}
                                            </span>
                                        </label>
                                    )}

                                    {type === "sales" && (
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={createCustomers}
                                                onChange={(e) => setCreateCustomers(e.target.checked)}
                                            />
                                            <span>Auto-save new customer names to Customers directory</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Execution Result Summary */}
                    {step === 3 && importResult && (
                        <div style={{ textAlign: "center", padding: "20px 10px" }}>
                            <div
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: "50%",
                                    background: "rgba(16, 185, 129, 0.12)",
                                    color: "#059669",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 16px",
                                }}
                            >
                                <CheckCircle2 size={34} />
                            </div>

                            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
                                Data Imported Successfully!
                            </h3>
                            <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "var(--text-secondary)" }}>
                                {importResult.message || "Your records have been imported into the application."}
                            </p>

                            {/* Summary Metrics */}
                            {importResult.summary && (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                        gap: 12,
                                        maxWidth: 550,
                                        margin: "0 auto 24px",
                                    }}
                                >
                                    {importResult.summary.created !== undefined && (
                                        <div style={{ padding: 12, borderRadius: 8, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>
                                                {importResult.summary.created}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>New Created</div>
                                        </div>
                                    )}

                                    {importResult.summary.updated !== undefined && (
                                        <div style={{ padding: 12, borderRadius: 8, background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>
                                                {importResult.summary.updated}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Updated</div>
                                        </div>
                                    )}

                                    {importResult.summary.skipped !== undefined && (
                                        <div style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.04)", border: "1px solid var(--border-color, #e2e8f0)" }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-muted)" }}>
                                                {importResult.summary.skipped}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Skipped</div>
                                        </div>
                                    )}

                                    {importResult.summary.customers_created !== undefined && (
                                        <div style={{ padding: 12, borderRadius: 8, background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#8b5cf6" }}>
                                                {importResult.summary.customers_created}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Customers Added</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Errors / Warnings List if any */}
                            {importResult.summary?.errors && importResult.summary.errors.length > 0 && (
                                <div
                                    style={{
                                        textAlign: "left",
                                        padding: 12,
                                        borderRadius: 8,
                                        background: "rgba(245, 158, 11, 0.1)",
                                        border: "1px solid rgba(245, 158, 11, 0.25)",
                                        fontSize: 12,
                                        color: "#b45309",
                                        maxHeight: 140,
                                        overflowY: "auto",
                                        marginBottom: 20,
                                    }}
                                >
                                    <strong>Warnings / Skipped Details:</strong>
                                    <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                                        {importResult.summary.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        {step === 2 && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setStep(1)}
                                disabled={importing}
                            >
                                <ArrowLeft size={14} /> Back
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
                                        style={{ minWidth: 150 }}
                                    >
                                        {importing ? (
                                            <>
                                                <RefreshCw size={14} className="animate-spin" /> Importing...
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
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
