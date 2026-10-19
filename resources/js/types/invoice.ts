export interface InvoiceItem {
    id?: number;
    invoice_id?: number;
    inventory_id?: number | null;
    item_name: string;
    hsn_sac?: string | null;
    dimension?: string | null;
    quantity: number | string;
    unit?: string | null;
    rate: number | string;
    discount_percent?: number | string;
    discount_amount?: number | string;
    taxable_value?: number | string;
    gst_rate?: number | string;
    cgst_rate?: number | string;
    cgst_amount?: number | string;
    sgst_rate?: number | string;
    sgst_amount?: number | string;
    igst_rate?: number | string;
    igst_amount?: number | string;
    total_amount?: number | string;
}

export interface InvoiceItemFormRow {
    inventory_id: number | string;
    item_name: string;
    hsn_sac: string;
    dimension: string; // Optional between qty and dimension
    quantity: number | string;
    unit: string;
    rate: number | string;
    discount_percent: number | string;
    gst_rate: number | string;
    available_stock?: number | null;
    stock_error?: string | null;
}

export interface CustomerItem {
    id?: number;
    name: string;
    address?: string | null;
    gst_number?: string | null;
    phone?: string | null;
    state?: string | null;
}

export interface BusinessProfileData {
    id?: number;
    user_id?: number;
    business_name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gst_number?: string | null;
    phone?: string | null;
    email?: string | null;
    pan_number?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_ifsc?: string | null;
    bank_branch?: string | null;
    terms_and_conditions?: string | null;
}

export interface InvoiceData {
    id: number;
    user_id: number;
    invoice_number: string;
    invoice_date: string;
    due_date?: string | null;
    status: "Paid" | "Unpaid" | "Partially Paid";
    tax_type: "intra_state" | "inter_state";
    seller_name: string;
    seller_address?: string | null;
    seller_gst_number?: string | null;
    seller_phone?: string | null;
    seller_state?: string | null;
    customer_name: string;
    customer_address?: string | null;
    customer_gst_number?: string | null;
    customer_phone?: string | null;
    customer_state?: string | null;
    place_of_supply?: string | null;
    subtotal: number | string;
    total_discount: number | string;
    taxable_amount: number | string;
    cgst_amount: number | string;
    sgst_amount: number | string;
    igst_amount: number | string;
    total_tax: number | string;
    round_off: number | string;
    total_amount: number | string;
    notes?: string | null;
    terms?: string | null;
    items?: InvoiceItem[];
    created_at?: string;
    updated_at?: string;
}

export interface InventoryItemOption {
    id: number;
    item: string;
    code?: string | null;
    selling_price?: number | string | null;
    qty?: number | string | null;
    unit?: string | null;
}

export interface CalculatedItemTotals {
    gross: number;
    discountAmount: number;
    taxable: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTax: number;
    lineTotal: number;
}

export interface InvoiceSummaryTotals {
    subtotal: number;
    totalDiscount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    roundOff: number;
    grandTotal: number;
    words: string;
}

/**
 * Robust parsing helpers ensuring no NaN, negative bugs or null dereferences.
 */
export function parseStrongNumber(val: unknown, fallback: number = 0): number {
    if (val === null || val === undefined || val === "") return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
}

export function parseStrongQuantity(val: unknown, fallback: number = 1): number {
    const num = parseStrongNumber(val, fallback);
    return num <= 0 ? fallback : num;
}

export function parseStrongRate(val: unknown, fallback: number = 0): number {
    const num = parseStrongNumber(val, fallback);
    return num < 0 ? fallback : num;
}

/**
 * Calculates financial amounts for a single line item with strong typing.
 */
export function calculateLineItemAmounts(
    row: InvoiceItemFormRow,
    taxType: "intra_state" | "inter_state"
): CalculatedItemTotals {
    const qty = parseStrongQuantity(row.quantity, 1);
    const rate = parseStrongRate(row.rate, 0);
    const discPct = Math.max(0, Math.min(100, parseStrongNumber(row.discount_percent, 0)));
    const gstRate = Math.max(0, Math.min(100, parseStrongNumber(row.gst_rate, 0)));

    const gross = qty * rate;
    const discountAmount = (gross * discPct) / 100;
    const taxable = Math.max(0, gross - discountAmount);

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (taxType === "inter_state") {
        igstRate = gstRate;
        igstAmount = (taxable * igstRate) / 100;
    } else {
        cgstRate = gstRate / 2;
        cgstAmount = (taxable * cgstRate) / 100;
        sgstRate = gstRate / 2;
        sgstAmount = (taxable * sgstRate) / 100;
    }

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const lineTotal = taxable + totalTax;

    return {
        gross,
        discountAmount,
        taxable,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalTax,
        lineTotal,
    };
}

/**
 * Converts Indian Rupee amounts into official words for GST invoices.
 */
export function numberToWordsINR(amount: number | string): string {
    const numAmount = parseStrongNumber(amount, 0);
    if (!numAmount || isNaN(numAmount)) return "Zero Rupees Only";
    const num = Math.floor(Math.abs(numAmount));
    const paise = Math.round((Math.abs(numAmount) - num) * 100);

    const units = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convertSection(n: number): string {
        if (n < 20) return units[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + units[n % 10] : "");
        return units[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertSection(n % 100) : "");
    }

    if (num === 0 && paise === 0) return "Zero Rupees Only";

    let words = "";
    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    if (crores > 0) words += convertSection(crores) + " Crore ";
    if (lakhs > 0) words += convertSection(lakhs) + " Lakh ";
    if (thousands > 0) words += convertSection(thousands) + " Thousand ";
    if (remainder > 0) words += convertSection(remainder) + " ";

    words = words.trim() ? words.trim() + " Rupees" : "";
    if (paise > 0) {
        words += (words ? " and " : "") + convertSection(paise) + " Paise";
    }
    return words + " Only";
}

/**
 * Calculates complete invoice totals and taxes across all rows.
 */
export function calculateInvoiceSummary(
    items: InvoiceItemFormRow[],
    taxType: "intra_state" | "inter_state"
): InvoiceSummaryTotals {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    items.forEach((row) => {
        const itemTotals = calculateLineItemAmounts(row, taxType);
        subtotal += itemTotals.gross;
        totalDiscount += itemTotals.discountAmount;
        taxableAmount += itemTotals.taxable;
        cgstAmount += itemTotals.cgstAmount;
        sgstAmount += itemTotals.sgstAmount;
        igstAmount += itemTotals.igstAmount;
    });

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const rawTotal = taxableAmount + totalTax;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    return {
        subtotal,
        totalDiscount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        roundOff,
        grandTotal: roundedTotal,
        words: numberToWordsINR(roundedTotal),
    };
}
