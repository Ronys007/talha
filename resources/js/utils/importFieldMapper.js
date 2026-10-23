/**
 * Universal Data Import & Preset Mapping Engine
 * Supports Zoho Books, Vyapar, MyBillBook, Tally, Busy, and Generic Excel/CSV files.
 */

// Normalizes string for fuzzy header comparison
export function normalizeHeader(str) {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .replace(/[_\-\/\.\(\)\#\:]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ─── FIELD DEFINITIONS ───────────────────────────────────────────────────────

export const INVENTORY_FIELDS = [
    {
        key: "item",
        label: "Item / Product Name",
        required: true,
        description: "Name or title of the inventory item",
        aliases: [
            "item", "item name", "product", "product name", "item description",
            "particulars", "name", "description", "title", "product title"
        ],
    },
    {
        key: "code",
        label: "Item Code / Barcode / SKU",
        required: false,
        description: "Unique item code, barcode or HSN/SAC (auto-generated if empty)",
        aliases: [
            "code", "item code", "barcode", "sku", "hsn", "hsn code", "hsn sac",
            "product code", "item id", "part number", "upc", "ean"
        ],
    },
    {
        key: "qty",
        label: "Quantity / Current Stock",
        required: false,
        description: "Available quantity in stock (defaults to 0)",
        aliases: [
            "qty", "quantity", "stock", "stock qty", "current stock",
            "stock on hand", "opening stock", "units in stock", "balance", "available stock"
        ],
    },
    {
        key: "unit",
        label: "Unit of Measurement",
        required: false,
        description: "E.g. PCS, KG, BOX, MTR, NOS (defaults to PCS)",
        aliases: [
            "unit", "measuring unit", "uom", "usage unit", "unit of measure",
            "measurement unit", "per", "units"
        ],
    },
    {
        key: "selling_price",
        label: "Selling Price / Rate",
        required: false,
        description: "Sale price per unit (defaults to 0)",
        aliases: [
            "selling price", "sale price", "sales price", "rate", "price", "mrp",
            "unit price", "item price", "retail price", "price per unit"
        ],
    },
];

export const PURCHASE_FIELDS = [
    {
        key: "po_number",
        label: "Bill No / Invoice No",
        required: true,
        description: "Purchase bill or invoice number from supplier",
        aliases: [
            "bill no", "bill number", "invoice no", "invoice number", "po number",
            "purchase no", "voucher no", "reference", "ref no", "purchase order"
        ],
    },
    {
        key: "order_date",
        label: "Bill Date",
        required: false,
        description: "Date of the purchase bill (defaults to today)",
        aliases: [
            "bill date", "date", "purchase date", "order date", "invoice date", "voucher date"
        ],
    },
    {
        key: "supplier_name",
        label: "Supplier / Party Name",
        required: true,
        description: "Vendor or seller company name",
        aliases: [
            "supplier name", "supplier", "party name", "party", "vendor name",
            "vendor", "seller name", "account name", "party / supplier"
        ],
    },
    {
        key: "gst_number",
        label: "Supplier GSTIN",
        required: false,
        description: "GST Identification Number of supplier",
        aliases: [
            "gstin", "gst number", "gst no", "gst", "supplier gstin", "vendor gstin",
            "party gstin", "tax id", "tin"
        ],
    },
    {
        key: "supplier_phone",
        label: "Supplier Phone / Mobile",
        required: false,
        description: "Contact mobile or phone number",
        aliases: [
            "phone", "mobile", "phone no", "mobile no", "contact", "supplier phone", "vendor phone"
        ],
    },
    {
        key: "description",
        label: "Item Description / Name",
        required: true,
        description: "Name of the purchased item/service",
        aliases: [
            "item", "item name", "description", "product name", "product",
            "particulars", "item desc", "goods description"
        ],
    },
    {
        key: "hsn_sac",
        label: "HSN / SAC Code",
        required: false,
        description: "HSN or SAC tax classification code",
        aliases: [
            "hsn", "hsn code", "hsn sac", "sac", "hsn/sac", "item code", "sku"
        ],
    },
    {
        key: "quantity",
        label: "Quantity",
        required: false,
        description: "Quantity purchased (defaults to 1)",
        aliases: [
            "qty", "quantity", "stock", "units", "billed qty", "count"
        ],
    },
    {
        key: "unit",
        label: "Unit",
        required: false,
        description: "Unit of item e.g. PCS, KG (defaults to PCS)",
        aliases: [
            "unit", "per", "uom", "usage unit", "measuring unit"
        ],
    },
    {
        key: "rate",
        label: "Purchase Rate / Price",
        required: false,
        description: "Unit rate or purchase cost (defaults to 0)",
        aliases: [
            "rate", "price", "unit price", "purchase price", "item price",
            "cost price", "cost", "purchase rate", "price per unit"
        ],
    },
    {
        key: "discount_percent",
        label: "Discount %",
        required: false,
        description: "Item discount percentage (if applicable)",
        aliases: [
            "discount %", "discount percent", "disc %", "discount percentage", "disc pct"
        ],
    },
    {
        key: "tax_rate",
        label: "GST / Tax Rate %",
        required: false,
        description: "Tax percentage (e.g. 5, 12, 18, 28)",
        aliases: [
            "tax %", "tax rate", "gst %", "gst rate", "tax percentage", "vat %", "rate of tax"
        ],
    },
    {
        key: "total_amount",
        label: "Total Bill Amount",
        required: false,
        description: "Grand total bill amount (auto-calculated if omitted)",
        aliases: [
            "total amount", "total", "bill amount", "grand total", "net amount",
            "invoice total", "final amount", "bill total"
        ],
    },
    {
        key: "status",
        label: "Status",
        required: false,
        description: "Pending, Approved, Received, Cancelled (defaults to Received)",
        aliases: [
            "status", "bill status", "payment status", "order status"
        ],
    },
    {
        key: "due_date",
        label: "Payment Due Date",
        required: false,
        description: "Payment due date for supplier",
        aliases: [
            "due date", "payment due date", "bill due date", "expiry date"
        ],
    },
    {
        key: "notes",
        label: "Notes / Remarks",
        required: false,
        description: "Optional remarks or notes",
        aliases: [
            "notes", "narration", "remarks", "comment", "description"
        ],
    },
];

export const SALES_FIELDS = [
    {
        key: "invoice_number",
        label: "Invoice No / Bill No",
        required: true,
        description: "Sales invoice or bill number (auto-generated if empty)",
        aliases: [
            "invoice no", "invoice number", "bill no", "bill number", "voucher no",
            "inv no", "sale no", "sales invoice no", "reference"
        ],
    },
    {
        key: "invoice_date",
        label: "Invoice Date",
        required: false,
        description: "Date of sales bill (defaults to today)",
        aliases: [
            "invoice date", "date", "bill date", "voucher date", "sale date"
        ],
    },
    {
        key: "customer_name",
        label: "Customer / Party Name",
        required: true,
        description: "Client or customer name",
        aliases: [
            "customer name", "customer", "party name", "party", "client name",
            "client", "buyer name", "buyer", "customer / party"
        ],
    },
    {
        key: "customer_phone",
        label: "Customer Phone / Mobile",
        required: false,
        description: "Customer contact mobile number",
        aliases: [
            "customer phone", "phone", "phone no", "mobile", "mobile no",
            "contact number", "party phone", "customer mobile"
        ],
    },
    {
        key: "customer_gst_number",
        label: "Customer GSTIN",
        required: false,
        description: "Customer GST Identification Number",
        aliases: [
            "customer gstin", "gstin", "gst number", "gst no", "party gstin",
            "buyer gstin", "customer gst", "tax id"
        ],
    },
    {
        key: "customer_address",
        label: "Billing Address",
        required: false,
        description: "Customer full address",
        aliases: [
            "customer address", "address", "billing address", "party address",
            "client address", "location", "shipping address"
        ],
    },
    {
        key: "place_of_supply",
        label: "State / Place of Supply",
        required: false,
        description: "Customer state / place of supply for GST",
        aliases: [
            "place of supply", "customer state", "state", "state of supply", "pos"
        ],
    },
    {
        key: "item_name",
        label: "Item Name / Description",
        required: true,
        description: "Name of the sold item or service",
        aliases: [
            "item", "item name", "product", "product name", "description",
            "particulars", "item desc", "goods"
        ],
    },
    {
        key: "hsn_sac",
        label: "HSN / SAC Code",
        required: false,
        description: "HSN / SAC classification",
        aliases: [
            "hsn", "hsn code", "hsn sac", "sac", "hsn/sac", "item code", "sku"
        ],
    },
    {
        key: "quantity",
        label: "Quantity",
        required: false,
        description: "Billed quantity (defaults to 1)",
        aliases: [
            "qty", "quantity", "billed qty", "units", "count"
        ],
    },
    {
        key: "unit",
        label: "Unit",
        required: false,
        description: "Unit e.g. PCS, KG, MTR (defaults to PCS)",
        aliases: [
            "unit", "uom", "measuring unit", "usage unit", "per"
        ],
    },
    {
        key: "rate",
        label: "Selling Rate / Price",
        required: false,
        description: "Unit selling price (defaults to 0)",
        aliases: [
            "rate", "price", "unit price", "selling price", "sale price",
            "item price", "mrp", "price per unit"
        ],
    },
    {
        key: "discount_percent",
        label: "Discount %",
        required: false,
        description: "Item discount %",
        aliases: [
            "discount %", "discount percent", "disc %", "discount percentage", "disc pct"
        ],
    },
    {
        key: "gst_rate",
        label: "GST / Tax Rate %",
        required: false,
        description: "GST tax % (e.g. 5, 12, 18, 28)",
        aliases: [
            "gst rate", "gst %", "tax rate", "tax %", "tax percentage", "vat %"
        ],
    },
    {
        key: "total_amount",
        label: "Invoice Grand Total",
        required: false,
        description: "Total invoice amount (auto-calculated if omitted)",
        aliases: [
            "total amount", "total", "invoice amount", "grand total", "net amount",
            "bill amount", "invoice total"
        ],
    },
    {
        key: "paid_amount",
        label: "Paid / Received Amount",
        required: false,
        description: "Amount already paid by customer",
        aliases: [
            "paid amount", "paid", "received amount", "amount received", "advance",
            "received", "collected"
        ],
    },
    {
        key: "status",
        label: "Payment Status",
        required: false,
        description: "Paid, Unpaid, Partially Paid (defaults to Paid)",
        aliases: [
            "status", "payment status", "invoice status"
        ],
    },
    {
        key: "due_date",
        label: "Payment Due Date",
        required: false,
        description: "Due date for payment",
        aliases: [
            "due date", "payment due date", "expiry date"
        ],
    },
    {
        key: "notes",
        label: "Notes / Terms",
        required: false,
        description: "Invoice remarks or terms",
        aliases: [
            "notes", "narration", "remarks", "terms", "terms and conditions"
        ],
    },
];

// ─── SOFTWARE PRESET RECOGNITION ─────────────────────────────────────────────

export const SOFTWARE_PRESETS = [
    {
        id: "auto",
        name: "Auto-Detect Format",
        badge: "✨ Smart Auto-Detect",
        color: "#6366f1",
    },
    {
        id: "zoho",
        name: "Zoho Books / Inventory",
        badge: "Zoho Books",
        color: "#dc2626",
        fingerprints: ["stock on hand", "usage unit", "balance due", "vendor name", "account", "item desc"],
    },
    {
        id: "vyapar",
        name: "Vyapar App",
        badge: "Vyapar",
        color: "#ea580c",
        fingerprints: ["party name", "stock qty", "price unit", "received amount", "sale price"],
    },
    {
        id: "mybillbook",
        name: "MyBillBook",
        badge: "MyBillBook",
        color: "#8b5cf6",
        fingerprints: ["current stock", "voucher no", "sales price", "purchase price"],
    },
    {
        id: "generic",
        name: "Excel / CSV Spreadsheet",
        badge: "Excel / CSV",
        color: "#059669",
    },
];

/**
 * Detects the software source by analyzing column headers.
 */
export function detectSoftwarePreset(headers = []) {
    const norm = headers.map(normalizeHeader);
    let bestMatch = "generic";
    let highestHits = 0;

    for (const preset of SOFTWARE_PRESETS) {
        if (!preset.fingerprints) continue;
        let hits = 0;
        for (const fp of preset.fingerprints) {
            if (norm.some((h) => h.includes(fp) || fp.includes(h))) {
                hits++;
            }
        }
        if (hits >= 2 && hits > highestHits) {
            highestHits = hits;
            bestMatch = preset.id;
        }
    }

    return bestMatch;
}

/**
 * Automatically maps target fields to file column headers using fuzzy matching.
 */
export function autoMapColumns(fields, fileHeaders) {
    const mapping = {};
    const usedHeaders = new Set();

    // 1. Exact or Alias Match
    for (const field of fields) {
        let matchedHeader = null;

        for (const header of fileHeaders) {
            if (usedHeaders.has(header)) continue;
            const normH = normalizeHeader(header);

            // Exact match with key
            if (normH === normalizeHeader(field.key) || normH === normalizeHeader(field.label)) {
                matchedHeader = header;
                break;
            }

            // Match with aliases
            if (field.aliases && field.aliases.some((alias) => normH === alias)) {
                matchedHeader = header;
                break;
            }
        }

        // 2. Partial/Contains Match
        if (!matchedHeader) {
            for (const header of fileHeaders) {
                if (usedHeaders.has(header)) continue;
                const normH = normalizeHeader(header);

                if (field.aliases && field.aliases.some((alias) => normH.includes(alias) || alias.includes(normH))) {
                    matchedHeader = header;
                    break;
                }
            }
        }

        if (matchedHeader) {
            mapping[field.key] = matchedHeader;
            usedHeaders.add(matchedHeader);
        } else {
            mapping[field.key] = "";
        }
    }

    return mapping;
}

/**
 * Transforms raw file rows into mapped objects according to column mapping.
 */
export function transformRows(rawRows, columnMapping) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    return rawRows.map((row) => {
        const item = {};
        for (const [fieldKey, headerName] of Object.entries(columnMapping)) {
            if (headerName && row[headerName] !== undefined) {
                item[fieldKey] = row[headerName];
            } else {
                item[fieldKey] = null;
            }
        }
        return item;
    });
}

/**
 * Helper to parse numbers safely (stripping currency symbols, commas).
 */
export function parseNumber(val, defaultVal = 0) {
    if (val === null || val === undefined || val === "") return defaultVal;
    if (typeof val === "number") return Number.isFinite(val) ? val : defaultVal;
    const cleaned = String(val).replace(/[₹,\s\$]/g, "").replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : defaultVal;
}

/**
 * Helper to normalize date to YYYY-MM-DD.
 */
export function parseDate(val) {
    if (!val) return new Date().toISOString().split("T")[0];
    if (val instanceof Date) return val.toISOString().split("T")[0];

    const str = String(val).trim();
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.slice(0, 10);
    }
    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dmy) {
        const day = dmy[1].padStart(2, "0");
        const month = dmy[2].padStart(2, "0");
        let year = dmy[3];
        if (year.length === 2) year = "20" + year;
        return `${year}-${month}-${day}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
}

/**
 * Groups flat rows into multi-item purchase vouchers.
 */
export function groupPurchaseRows(mappedRows) {
    const groups = new Map();

    mappedRows.forEach((row, idx) => {
        const billNo = String(row.po_number || "").trim();
        const party = String(row.supplier_name || "").trim() || "Supplier";
        const date = parseDate(row.order_date);

        // Group key: if billNo exists use billNo, else row unique key
        const groupKey = billNo ? `${billNo}__${party}` : `auto_bill_${idx}`;

        const itemDesc = String(row.description || row.item || "").trim() || "Item";
        const qty = Math.max(0.001, parseNumber(row.quantity, 1));
        const rate = Math.max(0, parseNumber(row.rate, 0));
        const discPct = parseNumber(row.discount_percent, 0);
        const itemAmt = qty * rate * (1 - discPct / 100);

        const itemObj = {
            description: itemDesc,
            hsn_sac: String(row.hsn_sac || "").trim(),
            quantity: qty,
            rate: rate,
            per: String(row.unit || "PCS").trim().toUpperCase() || "PCS",
            discount_percent: discPct > 0 ? discPct : null,
            amount: parseFloat(itemAmt.toFixed(2)),
        };

        if (!groups.has(groupKey)) {
            const taxRate = parseNumber(row.tax_rate, 0);
            const totalAmt = parseNumber(row.total_amount, 0);

            groups.set(groupKey, {
                po_number: billNo,
                supplier_name: party,
                supplier_phone: String(row.supplier_phone || "").trim(),
                gst_number: String(row.gst_number || "").trim().toUpperCase(),
                order_date: date,
                tax_rate: taxRate,
                total_amount: totalAmt,
                status: String(row.status || "Received").trim(),
                due_date: row.due_date ? parseDate(row.due_date) : null,
                notes: String(row.notes || "").trim(),
                items: [itemObj],
            });
        } else {
            const existing = groups.get(groupKey);
            existing.items.push(itemObj);
        }
    });

    return Array.from(groups.values());
}

/**
 * Groups flat rows into multi-item sales vouchers.
 */
export function groupSalesRows(mappedRows) {
    const groups = new Map();

    mappedRows.forEach((row, idx) => {
        const invNo = String(row.invoice_number || "").trim();
        const party = String(row.customer_name || "").trim() || "Cash Customer";
        const date = parseDate(row.invoice_date);

        const groupKey = invNo ? `${invNo}__${party}` : `auto_inv_${idx}`;

        const itemName = String(row.item_name || row.item || "").trim() || "Item";
        const qty = Math.max(0.001, parseNumber(row.quantity, 1));
        const rate = Math.max(0, parseNumber(row.rate, 0));
        const discPct = parseNumber(row.discount_percent, 0);
        const gstRate = parseNumber(row.gst_rate, 0);
        const taxable = qty * rate * (1 - discPct / 100);

        const itemObj = {
            item_name: itemName,
            hsn_sac: String(row.hsn_sac || "").trim(),
            quantity: qty,
            rate: rate,
            unit: String(row.unit || "PCS").trim().toUpperCase() || "PCS",
            discount_percent: discPct > 0 ? discPct : 0,
            discount_amount: parseFloat((qty * rate * (discPct / 100)).toFixed(2)),
            taxable_value: parseFloat(taxable.toFixed(2)),
            gst_rate: gstRate,
        };

        if (!groups.has(groupKey)) {
            const totalAmt = parseNumber(row.total_amount, 0);
            const paidAmt = parseNumber(row.paid_amount, totalAmt);

            groups.set(groupKey, {
                invoice_number: invNo,
                invoice_date: date,
                customer_name: party,
                customer_phone: String(row.customer_phone || "").trim(),
                customer_gst_number: String(row.customer_gst_number || "").trim().toUpperCase(),
                customer_address: String(row.customer_address || "").trim(),
                place_of_supply: String(row.place_of_supply || "").trim(),
                total_amount: totalAmt,
                paid_amount: paidAmt,
                status: String(row.status || "Paid").trim(),
                due_date: row.due_date ? parseDate(row.due_date) : null,
                notes: String(row.notes || "").trim(),
                items: [itemObj],
            });
        } else {
            const existing = groups.get(groupKey);
            existing.items.push(itemObj);
        }
    });

    return Array.from(groups.values());
}
