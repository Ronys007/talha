import { useState, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Package,
    Camera,
    Upload,
    Barcode,
    Printer,
    Download,
} from "lucide-react";

import { useMode } from "@/Context/ModeContext";
import axios from "axios";
import TableActionDropdown, { ActionItem } from "@/Components/TableActionDropdown";

// ─── API ────────────────────────────────────────────────────────────────────
async function fetchInventory({ pageParam = null, queryKey }) {
    const [, activeStoreId, mode, search] = queryKey;
    const params = new URLSearchParams();
    if (pageParam) params.set("cursor", pageParam);
    if (search) params.set("search", search);
    if (mode) params.set("mode", mode);
    const res = await axios.get(`/inventory/data?${params}`);
    return res.data;
}

// ─── Code Generator Fallback ────────────────────────────────────────────────
function generateCode(name) {
    const str = name.trim().toLowerCase();
    if (!str) return "";
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
    }
    return String(10000 + (hash % 90000));
}

// ─── Item Drawer (Add / Edit) ───────────────────────────────────────────────
function ItemDrawer({ item, mode, onClose, onSaved }) {
    const isBarcode = mode === "barcode";
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const [form, setForm] = useState({
        item: "",
        code: "",
        selling_price: "",
        qty: "",
        unit: "PCS",
        image: null,
        _preview: null,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [dupName, setDupName] = useState(false);

    const STANDARD_UNITS = ["PCS", "KG", "CM", "MM", "M"];
    const [isOtherUnit, setIsOtherUnit] = useState(
        item?.unit ? !STANDARD_UNITS.includes(item.unit.toUpperCase()) : false
    );

    // Initialize form with existing item values
    useEffect(() => {
        if (item) {
            const isCustom = item.unit ? !STANDARD_UNITS.includes(item.unit.toUpperCase()) : false;
            setIsOtherUnit(isCustom);
            setForm({
                item: item.item,
                code: item.code || generateCode(item.item),
                selling_price: item.selling_price || "",
                qty: item.qty,
                unit: item.unit || "PCS",
                image: null,
                _preview: item.image,
            });
        } else {
            setIsOtherUnit(false);
            setForm({
                item: "",
                code: "",
                selling_price: "",
                qty: "",
                unit: "PCS",
                image: null,
                _preview: null,
            });
        }
    }, [item]);

    // Check duplicate name and generate verified unique code when name changes
    useEffect(() => {
        setDupName(false);
        const name = form.item.trim();

        if (name.length < 1) {
            if (!item) {
                setForm((f) => ({ ...f, code: "" }));
            }
            return;
        }

        // If editing and name is reverted back to original, restore original code
        if (item && name.toLowerCase() === item.item.trim().toLowerCase()) {
            setForm((f) => ({ ...f, code: item.code }));
            return;
        }

        // Set fast initial code fallback
        setForm((f) => {
            if (!f.code || (item && f.code === item.code)) {
                return { ...f, code: generateCode(name) };
            }
            return f;
        });

        const t = setTimeout(async () => {
            try {
                const res = await axios.get("/inventory/check-name", {
                    params: { name, mode, exclude_id: item?.id ?? null },
                });
                setDupName(res.data.exists);
                if (res.data.unique_code) {
                    setForm((f) => ({ ...f, code: res.data.unique_code }));
                }
            } catch {}
        }, 300);

        return () => clearTimeout(t);
    }, [form.item, mode, item]);

    function handle(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 800;
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width > height) {
                        height = Math.round((height * MAX) / width);
                        width = MAX;
                    } else {
                        width = Math.round((width * MAX) / height);
                        height = MAX;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        const compressed = new File([blob], file.name, {
                            type: "image/jpeg",
                        });
                        handle("image", compressed);
                        handle("_preview", URL.createObjectURL(compressed));
                    },
                    "image/jpeg",
                    0.75
                );
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData();
        fd.append("mode", mode);
        fd.append("item", form.item);
        fd.append("code", form.code);
        fd.append("selling_price", form.selling_price || 0);
        fd.append("qty", form.qty);
        fd.append("unit", form.unit || "PCS");
        if (form.image) fd.append("image", form.image);

        const url = item ? `/inventory/${item.id}` : "/inventory";

        try {
            await axios.post(url, fd, {
                headers: {
                    "X-CSRF-TOKEN":
                        document.querySelector("meta[name=csrf-token]")
                            ?.content || "",
                },
            });
            onSaved();
            onClose();
        } catch (err) {
            if (err.response?.status === 422)
                setErrors(err.response.data.errors || {});
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />
            <div className="drawer">
                <div className="drawer-header">
                    <span className="drawer-title">
                        {item ? "Edit Item" : isBarcode ? "Add New Barcode Item" : "Add New Item"}
                    </span>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
                <form className="drawer-body" onSubmit={submit}>
                    {form._preview && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <img
                                src={form._preview}
                                alt="Preview"
                                className="item-img"
                                style={{ width: 72, height: 72 }}
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Item Name *</label>
                        <input
                            className="form-input"
                            placeholder="Sugar, Rice, etc."
                            value={form.item}
                            onChange={(e) => handle("item", e.target.value)}
                            required
                            style={
                                dupName
                                    ? {
                                          borderColor: "var(--danger)",
                                          outline: "1px solid var(--danger)",
                                      }
                                    : {}
                            }
                        />
                        {dupName && (
                            <span className="form-error">
                                ⚠ An item with this name already exists.
                            </span>
                        )}
                        {!dupName && errors.item && (
                            <span className="form-error">{errors.item[0]}</span>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Item Code (Unique)</label>
                            <input
                                className="form-input"
                                value={form.code}
                                readOnly
                                style={{
                                    background: "var(--bg-elevated)",
                                    cursor: "not-allowed",
                                    color: "var(--text-secondary)",
                                }}
                                tabIndex={-1}
                            />
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                {item && form.item.trim().toLowerCase() === item.item.trim().toLowerCase()
                                    ? "Original code preserved"
                                    : "Unique code auto-generated"}
                            </span>
                            {errors.code && (
                                <span className="form-error">{errors.code[0]}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Price / Unit (₹) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input"
                                placeholder="e.g. 60.00"
                                value={form.selling_price}
                                onChange={(e) => handle("selling_price", e.target.value)}
                                required
                            />
                            {errors.selling_price && (
                                <span className="form-error">{errors.selling_price[0]}</span>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">{isBarcode ? "Quantity in Stock *" : "Quantity *"}</label>
                            <input
                                type="number"
                                step="0.001"
                                className="form-input"
                                placeholder="0"
                                value={form.qty}
                                onChange={(e) => handle("qty", e.target.value)}
                                required
                            />
                            {errors.qty && (
                                <span className="form-error">{errors.qty[0]}</span>
                            )}
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit (UOM)</label>
                            <select
                                className="form-input"
                                value={isOtherUnit ? "OTHER" : (form.unit || "PCS")}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "OTHER") {
                                        setIsOtherUnit(true);
                                        if (STANDARD_UNITS.includes((form.unit || "").toUpperCase())) {
                                            handle("unit", "");
                                        }
                                    } else {
                                        setIsOtherUnit(false);
                                        handle("unit", val);
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
                            {isOtherUnit && (
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ marginTop: 4 }}
                                    placeholder="Enter custom unit (e.g. BOX, LTR)"
                                    value={form.unit}
                                    onChange={(e) => handle("unit", e.target.value.toUpperCase())}
                                    autoFocus
                                />
                            )}
                            {errors.unit && (
                                <span className="form-error">{errors.unit[0]}</span>
                            )}
                        </div>
                    </div>

                    {isBarcode && form.code && (
                        <div className="form-group" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
                            <label className="form-label">Live Barcode Preview</label>
                            <div style={{ background: "#fff", padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "center", maxWidth: "100%", overflowX: "auto" }}>
                                <BarcodeComponent
                                    value={form.code}
                                    format="CODE128"
                                    width={1.6}
                                    height={45}
                                    fontSize={12}
                                    margin={0}
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Image (optional)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFile}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: "none" }}
                            onChange={handleFile}
                        />
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                    flex: 1,
                                    gap: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={15} /> Upload File
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                    flex: 1,
                                    gap: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                onClick={() => cameraInputRef.current?.click()}
                            >
                                <Camera size={15} /> Use Camera
                            </button>
                        </div>
                        {form._preview && (
                            <span
                                style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                    marginTop: 4,
                                    display: "block",
                                }}
                            >
                                ✓ Image selected
                            </span>
                        )}
                    </div>
                </form>
                <div className="drawer-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={loading || dupName}
                        title={dupName ? "Item name already exists" : undefined}
                    >
                        {loading
                            ? "Saving..."
                            : item
                              ? "Save Changes"
                              : "Add Item"}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Barcode Modal (Print / Download Label) ──────────────────────────────────
function BarcodeModal({ item, onClose }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && item?.code) {
            try {
                JsBarcode(canvasRef.current, item.code, {
                    format: "CODE128",
                    width: 2.2,
                    height: 70,
                    displayValue: true,
                    fontSize: 14,
                    font: "monospace",
                    textMargin: 4,
                    margin: 10,
                });
            } catch {}
        }
    }, [item]);

    function printBarcode() {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        const svgContent = document.getElementById("printable-barcode-svg")?.outerHTML || "";
        const price = item.selling_price ? parseFloat(item.selling_price).toFixed(2) : null;
        const title = (item.item || "").length > 28 ? (item.item || "").slice(0, 26) + "..." : (item.item || "");

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Print Barcode Label - ${item.item}</title>
                <style>
                    @page {
                        size: 2in 1in;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    html, body {
                        background: #fff;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .thermal-label {
                        width: 2in;
                        height: 1in;
                        max-width: 2in;
                        max-height: 1in;
                        page-break-inside: avoid;
                        box-sizing: border-box;
                        padding: 3.5mm 2.5mm 2.5mm 2.5mm;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: space-between;
                        text-align: center;
                        overflow: hidden;
                        background: #fff;
                        border: 1px dashed #94a3b8;
                    }
                    .label-title {
                        font-size: 7.5pt;
                        font-weight: 700;
                        color: #000;
                        line-height: 1.15;
                        max-height: 3.5mm;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        width: 100%;
                        margin-bottom: 0.8mm; /* Clean margin between name and barcode */
                        flex-shrink: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    .bcode-wrap {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        flex: 1;
                        min-height: 0;
                    }
                    .bcode-wrap svg {
                        max-width: 96%;
                        max-height: 13.0mm;
                        height: auto;
                    }
                    .price {
                        font-size: 8.5pt;
                        font-weight: 800;
                        color: #000;
                        line-height: 1.1;
                        margin-top: 1.0mm; /* Clean margin between barcode numbers and price */
                        flex-shrink: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                </style>
            </head>
            <body>
                <div class="thermal-label">
                    <div class="label-title">${title}</div>
                    <div class="bcode-wrap">${svgContent}</div>
                    ${price ? `<div class="price">Rs. ${price}</div>` : ""}
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    }

    function downloadBarcode() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `Barcode_${item.code}_${item.item.replace(/\s+/g, "_")}.png`;
        a.click();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 420, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Barcode size={18} color="#16a34a" /> Barcode Label
                    </span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className="modal-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
                        {item.item}
                    </div>

                    <div style={{ background: "#fff", padding: "16px 20px", borderRadius: 12, border: "2px solid var(--border)", boxShadow: "var(--shadow)", maxWidth: "100%", overflowX: "auto" }}>
                        <div id="printable-barcode-svg">
                            <BarcodeComponent
                                value={item.code}
                                format="CODE128"
                                width={2}
                                height={65}
                                fontSize={14}
                                margin={0}
                            />
                        </div>
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <code style={{ background: "var(--bg-elevated)", padding: "4px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                            #{item.code}
                        </code>
                        {item.selling_price > 0 && (
                            <span style={{ fontWeight: 700, color: "#16a34a", fontSize: 15 }}>
                                ₹{parseFloat(item.selling_price).toFixed(2)} / unit
                            </span>
                        )}
                    </div>
                </div>
                <div className="modal-footer" style={{ justifyContent: "center", gap: 10 }}>
                    <button className="btn btn-secondary" onClick={downloadBarcode}>
                        <Download size={14} /> Download PNG
                    </button>
                    <button className="btn btn-primary" onClick={printBarcode} style={{ background: "#16a34a", borderColor: "#16a34a" }}>
                        <Printer size={14} /> Print Label
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Confirm Delete Modal ────────────────────────────────────────────────────
function ConfirmDelete({ item, onClose, onConfirm }) {
    function confirm() {
        onConfirm();
        onClose();
    }
    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 380 }}>
                <div className="modal-header">
                    <span className="modal-title">Delete Item</span>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="modal-body">
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Are you sure you want to delete{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                            {item?.item}
                        </strong>
                        ? This cannot be undone.
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-danger" onClick={confirm}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function InventoryIndex() {
    const { mode } = useMode();
    const isBarcode = mode === "barcode";
    const qc = useQueryClient();
    const { auth, switchedAdmin } = usePage().props;
    const activeStoreId = switchedAdmin?.id ?? auth?.user?.id ?? 0;
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);
    const [barcodeModalItem, setBarcodeModalItem] = useState(null);
    const loadMoreRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        useInfiniteQuery({
            queryKey: ["inventory", activeStoreId, mode, debouncedSearch],
            queryFn: fetchInventory,
            getNextPageParam: (last) => last.nextCursor ?? undefined,
            staleTime: 0,
        });

    useEffect(() => {
        if (!loadMoreRef.current) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" }
        );
        obs.observe(loadMoreRef.current);
        return () => obs.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const items = data?.pages.flatMap((p) => p.data) ?? [];

    const totalInventoryValue = useMemo(() => {
        return items.reduce((sum, item) => {
            const price = parseFloat(item.selling_price || 0);
            const qty = parseFloat(item.qty || 0);
            return sum + (price * qty);
        }, 0);
    }, [items]);

    function invalidate() {
        qc.invalidateQueries({ queryKey: ["inventory", activeStoreId, mode] });
    }

    function handleDelete() {
        const id = deleteItem.id;
        qc.setQueryData(["inventory", activeStoreId, mode, debouncedSearch], (old) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    data: page.data.filter((item) => item.id !== id),
                })),
            };
        });
        axios
            .delete(`/inventory/${id}`, {
                headers: {
                    "X-CSRF-TOKEN": document.querySelector("meta[name=csrf-token]")?.content || "",
                },
            })
            .catch(() => { invalidate(); });
    }

    return (
        <AppLayout title={isBarcode ? "Barcode Inventory" : "Inventory"}>
            <div className="card page-full-card">
                {auth?.user?.role === "super_admin" && !switchedAdmin && (
                    <div style={{ padding: "12px 16px", background: "rgba(99, 102, 241, 0.08)", borderBottom: "1px solid rgba(99, 102, 241, 0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4338ca" }}>
                            <span>🛡️</span>
                            <span>You are currently in <strong>Super Admin Root View</strong>. Use the store dropdown in the top bar to select an admin store and view its inventory.</span>
                        </div>
                    </div>
                )}
                {/* Toolbar */}
                <div className="table-toolbar">
                    <div className="toolbar-left" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div className="search-input-wrap">
                            <Search size={15} />
                            <input
                                className="form-input search-input"
                                placeholder={`Search ${isBarcode ? "barcode " : ""}items or codes...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {items.length > 0 && (
                            <div
                                title="Total valuation of currently loaded inventory items (Price × Quantity)"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    background: "rgba(79, 70, 229, 0.08)",
                                    border: "1px solid rgba(79, 70, 229, 0.2)",
                                    color: "var(--accent, #4f46e5)",
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                }}
                            >
                                <span style={{ color: "var(--text-secondary)" }}>Total Value:</span>
                                <strong style={{ fontSize: 13.5 }}>
                                    ₹{totalInventoryValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                            </div>
                        )}
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => { setEditItem(null); setDrawerOpen(true); }}
                    >
                        <Plus size={15} /> Add {isBarcode ? "Barcode " : ""}Item
                    </button>
                </div>

                {/* Table */}
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            {isBarcode ? (
                                <tr>
                                    <th style={{ width: 50 }}>#</th>
                                    <th style={{ width: 52 }}>Image</th>
                                    <th>Item Name</th>
                                    <th>Code</th>
                                    <th>Price / Unit</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Inventory Value</th>
                                    <th style={{ width: 100 }}>Barcode</th>
                                    <th style={{ width: 100 }}>Actions</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th style={{ width: 50 }}>#</th>
                                    <th style={{ width: 52 }}>Image</th>
                                    <th>Item Name</th>
                                    <th>Code</th>
                                    <th>Price / Unit</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Inventory Value</th>
                                    <th style={{ width: 100 }}>Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td colSpan={isBarcode ? 10 : 9} style={{ textAlign: "center", padding: 40 }}>
                                        <div className="loading-ring" />
                                    </td>
                                </tr>
                            )}
                            {!isLoading && items.length === 0 && (
                                <tr>
                                    <td colSpan={isBarcode ? 10 : 9} style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                                        <Package size={40} style={{ opacity: 0.3, display: "block", margin: "0 auto 10px" }} />
                                        No {isBarcode ? "barcode " : ""}inventory items found
                                    </td>
                                </tr>
                            )}
                            {items.map((item, idx) => (
                                <tr key={item.id}>
                                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{idx + 1}</td>
                                    <td>
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.item}
                                                className="item-img lazy-img"
                                                loading="lazy"
                                                onLoad={(e) => e.currentTarget.classList.add("loaded")}
                                            />
                                        ) : (
                                            <div className="item-img-placeholder">
                                                {item.item?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.item}</td>
                                    <td>
                                        <code style={{ background: "var(--bg-elevated)", padding: "2px 7px", borderRadius: 4, fontSize: 12 }}>
                                            {item.code}
                                        </code>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: "#16a34a" }}>
                                            ₹{parseFloat(item.selling_price || 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${parseFloat(item.qty) > 10 ? "badge-success" : parseFloat(item.qty) > 0 ? "badge-warning" : "badge-danger"}`}>
                                            {item.qty}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-elevated)", padding: "2px 8px", borderRadius: 4 }}>
                                            {item.unit || "PCS"}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: "var(--accent, #4f46e5)", fontSize: 13 }}>
                                            ₹{(parseFloat(item.selling_price || 0) * parseFloat(item.qty || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    {isBarcode && (
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                style={{
                                                    padding: "4px 8px",
                                                    gap: 4,
                                                    fontSize: 12,
                                                    color: "var(--accent)",
                                                    border: "1px solid var(--border)",
                                                    borderRadius: 6,
                                                }}
                                                onClick={() => setBarcodeModalItem(item)}
                                                title="View & Print Barcode"
                                            >
                                                <Barcode size={14} /> View
                                            </button>
                                        </td>
                                    )}
                                    <td>
                                        <TableActionDropdown label="Actions">
                                            <ActionItem
                                                icon={Edit2}
                                                label="Edit Item"
                                                onClick={() => { setEditItem(item); setDrawerOpen(true); }}
                                            />
                                            {isBarcode && (
                                                <ActionItem
                                                    icon={Barcode}
                                                    label="View Barcode"
                                                    onClick={() => setBarcodeModalItem(item)}
                                                    primary
                                                />
                                            )}
                                            <ActionItem
                                                icon={Trash2}
                                                label="Delete Item"
                                                onClick={() => setDeleteItem(item)}
                                                danger
                                            />
                                        </TableActionDropdown>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div ref={loadMoreRef} className="scroll-sentinel" />
                    {isFetchingNextPage && <div className="loading-ring" />}
                    {!hasNextPage && items.length > 0 && (
                        <div style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)", fontSize: 12 }}>
                            All {items.length} {isBarcode ? "barcode " : ""}items loaded
                        </div>
                    )}
                </div>
            </div>

            {drawerOpen && (
                <ItemDrawer
                    item={editItem}
                    mode={mode}
                    onClose={() => { setDrawerOpen(false); setEditItem(null); }}
                    onSaved={invalidate}
                />
            )}



            {deleteItem && (
                <ConfirmDelete
                    item={deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={handleDelete}
                />
            )}
        </AppLayout>
    );
}
