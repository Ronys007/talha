function number(value) {
    const parsed = Number.parseFloat(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function text(value) {
    const normalized = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
    return /^[\s]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function csvCell(value, isText = false) {
    if (!isText && typeof value === "number" && Number.isFinite(value)) {
        return value.toFixed(2);
    }
    return `"${text(value).replace(/"/g, '""')}"`;
}

function dateValue(value) {
    return String(value ?? "").slice(0, 10);
}

const textColumns = new Set([0, 1, 3, 4, 5, 6, 7, 9, 10, 12, 26]);

function buildVoucherRows(record, type) {
    const isSales = type === "sales";
    const voucherNo = isSales ? record.invoice_number : record.po_number;
    const voucherDate = dateValue(isSales ? record.invoice_date : record.order_date);
    const party = isSales ? record.customer_name : record.supplier_name;
    if (!voucherNo || !voucherDate || !party) {
        throw new Error("An invoice is missing its number, date, or party name.");
    }

    const total = number(record.total_amount);
    const taxableTotal = isSales
        ? number(record.taxable_amount)
        : Math.max(0, number(record.subtotal) - number(record.gross_discount));
    const cgstTotal = number(isSales ? record.cgst_amount : record.cgst);
    const sgstTotal = number(isSales ? record.sgst_amount : record.sgst);
    const igstTotal = number(isSales ? record.igst_amount : record.igst);
    const roundOff = number(record.round_off);
    const items = Array.isArray(record.items) ? record.items : [];
    const originalTaxable = items.reduce((sum, item) => sum + (
        isSales ? number(item.taxable_value) : number(item.amount)
    ), 0);

    const voucherItems = items.length
        ? items.map((item) => ({
            name: String((isSales ? item.item_name : item.description) || "").trim(),
            hsn: item.hsn_sac || "",
            quantity: number(item.quantity) || 1,
            unit: (isSales ? item.unit : item.per) || "PCS",
            rate: number(item.rate),
            discount: number(item.discount_percent),
            taxable: isSales ? number(item.taxable_value) : number(item.amount),
        }))
        : [{
            name: isSales ? "Sales Invoice Total" : "Purchase Invoice Total",
            hsn: "",
            quantity: 1,
            unit: "LOT",
            rate: taxableTotal,
            discount: 0,
            taxable: taxableTotal,
        }];

    if (voucherItems.some((item) => !item.name)) {
        throw new Error(`Invoice ${voucherNo} contains an item without a name.`);
    }

    if (items.length && originalTaxable > 0 && Math.abs(originalTaxable - taxableTotal) > 0.005) {
        let assigned = 0;
        voucherItems.forEach((item, index) => {
            item.taxable = index === voucherItems.length - 1
                ? number((taxableTotal - assigned).toFixed(2))
                : number((taxableTotal * item.taxable / originalTaxable).toFixed(2));
            assigned += item.taxable;
        });
    }

    let assignedCgst = 0;
    let assignedSgst = 0;
    let assignedIgst = 0;
    return voucherItems.map((item, index) => {
        const lastItem = index === voucherItems.length - 1;
        const ratio = taxableTotal > 0 ? item.taxable / taxableTotal : 0;
        const cgst = lastItem ? cgstTotal - assignedCgst : number((cgstTotal * ratio).toFixed(2));
        const sgst = lastItem ? sgstTotal - assignedSgst : number((sgstTotal * ratio).toFixed(2));
        const igst = lastItem ? igstTotal - assignedIgst : number((igstTotal * ratio).toFixed(2));
        assignedCgst += cgst;
        assignedSgst += sgst;
        assignedIgst += igst;

        const voucherSummary = index === 0
            ? [
                number(isSales ? record.gross_discount : record.gross_discount),
                roundOff,
                total,
                number(record.paid_amount),
                Math.max(0, total - number(record.paid_amount)),
                record.status,
                record.notes,
            ]
            : ["", "", "", "", "", "", ""];

        return [
            type === "sales" ? "Sales" : "Purchase",
            voucherNo,
            voucherDate,
            party,
            isSales ? record.customer_gst_number : record.gst_number,
            isSales ? record.customer_phone : record.supplier_phone,
            isSales ? record.customer_address : "",
            isSales ? record.place_of_supply : "",
            index + 1,
            item.name,
            item.hsn,
            item.quantity,
            item.unit,
            item.rate,
            item.discount,
            Math.max(0, item.quantity * item.rate - item.taxable),
            item.taxable,
            cgst,
            sgst,
            igst,
            ...voucherSummary,
        ];
    }).map((row) => row.map((cell, index) => csvCell(cell, textColumns.has(index))).join(","));
}

export function buildTallyCsv(type, records) {
    if (type !== "sales" && type !== "purchase") {
        throw new Error("Choose sales or purchase invoices to export.");
    }
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error(`There are no ${type} invoices to export.`);
    }

    const headers = [
        "Voucher Type",
        "Invoice / Voucher Number",
        "Voucher Date",
        "Party Name",
        "Party GSTIN",
        "Party Phone",
        "Party Address",
        "Place of Supply",
        "Item No.",
        "Item / Service",
        "HSN / SAC",
        "Quantity",
        "Unit",
        "Rate (INR)",
        "Discount (%)",
        "Item Discount (INR)",
        "Taxable Value (INR)",
        "CGST (INR)",
        "SGST (INR)",
        "IGST (INR)",
        "Invoice Discount (INR)",
        "Round Off (INR)",
        "Invoice Total (INR)",
        "Amount Paid (INR)",
        "Balance Due (INR)",
        "Status",
        "Notes",
    ].map((header) => csvCell(header, true));
    const rows = records.flatMap((record) => buildVoucherRows(record, type));
    return `\uFEFF${[headers.join(","), ...rows].join("\r\n")}`;
}

export function downloadTallyVouchers(type, records, filePrefix, dateRange = {}) {
    const csv = buildTallyCsv(type, records);

    let suffix = new Date().toISOString().slice(0, 10);
    if (dateRange.startDate && dateRange.endDate) {
        suffix = `${dateRange.startDate}_to_${dateRange.endDate}`;
    } else if (dateRange.startDate) {
        suffix = `from_${dateRange.startDate}`;
    } else if (dateRange.endDate) {
        suffix = `until_${dateRange.endDate}`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filePrefix}_${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
