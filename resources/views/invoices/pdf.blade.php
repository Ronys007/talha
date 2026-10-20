<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Invoice #{{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #0f172a;
            line-height: 1.4;
            margin: 0;
            padding: 15px;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header-title {
            font-size: 20px;
            font-weight: bold;
            color: #1e1b4b;
            text-transform: uppercase;
            text-align: right;
        }
        .header-sub {
            font-size: 10px;
            color: #64748b;
            text-align: right;
            text-transform: uppercase;
        }
        .header-inv-no {
            font-size: 12px;
            font-weight: bold;
            color: #4f46e5;
            text-align: right;
            margin-top: 3px;
        }
        .shop-name {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        .info-grid td {
            padding: 8px 10px;
            vertical-align: top;
            font-size: 10.5px;
        }
        .info-title {
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 10px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-weight: bold;
            padding: 6px 7px;
            text-align: left;
            border: 1px solid #0f172a;
        }
        .items-table td {
            padding: 6px 7px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
        }
        .summary-table td {
            padding: 3px 6px;
        }
        .grand-total-row {
            border-top: 2px solid #0f172a;
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
        }
        .badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-paid { background: #d1fae5; color: #047857; }
        .badge-unpaid { background: #fee2e2; color: #b91c1c; }
        .badge-partial { background: #fef3c7; color: #b45309; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .hsn-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin-top: 4px;
        }
        .hsn-table th {
            background: #f1f5f9;
            color: #334155;
            padding: 4px;
            border: 1px solid #cbd5e1;
        }
        .hsn-table td {
            padding: 4px;
            border: 1px solid #cbd5e1;
        }
        .footer-note {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 9.5px;
            color: #64748b;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <div class="shop-name">{{ $invoice->seller_name ?: 'Store' }}</div>
                @if(!empty($invoice->seller_address))
                    <div style="color: #475569; font-size: 10px; margin-top: 2px;">{{ $invoice->seller_address }}</div>
                @endif
                @if(!empty($invoice->seller_gst_number))
                    <div style="font-size: 10px; margin-top: 2px;"><strong>GSTIN:</strong> {{ $invoice->seller_gst_number }}</div>
                @endif
                @if(!empty($invoice->seller_phone))
                    <div style="font-size: 10px;"><strong>Phone:</strong> {{ $invoice->seller_phone }}</div>
                @endif
            </td>
            <td style="vertical-align: top; width: 45%;">
                <div class="header-title">TAX INVOICE</div>
                <div class="header-sub">Original for Recipient</div>
                <div class="header-inv-no">#{{ $invoice->invoice_number }}</div>
                <div style="margin-top: 4px; text-align: right;">
                    @if($invoice->status === 'Paid')
                        <span class="badge badge-paid">PAYMENT RECEIVED</span>
                    @elseif($invoice->status === 'Partially Paid')
                        <span class="badge badge-partial">PARTIALLY PAID</span>
                    @else
                        <span class="badge badge-unpaid">PAYMENT DUE</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <!-- Info Grid -->
    <table class="info-grid">
        <tr>
            <td style="width: 50%; border-right: 1px solid #e2e8f0;">
                <div class="info-title">BILLED TO (BUYER):</div>
                <div style="font-size: 12px; font-weight: bold; color: #0f172a;">{{ $invoice->customer_name }}</div>
                @if(!empty($invoice->customer_address))
                    <div style="margin-top: 2px; color: #334155;">{{ $invoice->customer_address }}</div>
                @endif
                <div style="margin-top: 3px;"><strong>GSTIN:</strong> {{ $invoice->customer_gst_number ?: 'Unregistered' }}</div>
                @if(!empty($invoice->customer_phone))
                    <div><strong>Phone:</strong> {{ $invoice->customer_phone }}</div>
                @endif
                @if(!empty($invoice->customer_state))
                    <div><strong>State:</strong> {{ $invoice->customer_state }}</div>
                @endif
            </td>
            <td style="width: 50%;">
                <div class="info-title">INVOICE DETAILS:</div>
                <div><strong>Invoice Date:</strong> {{ date('d M Y', strtotime($invoice->invoice_date)) }}</div>
                @if(!empty($invoice->due_date))
                    <div><strong>Payment Due Date:</strong> {{ date('d M Y', strtotime($invoice->due_date)) }}</div>
                @endif
                <div><strong>Place of Supply:</strong> {{ $invoice->place_of_supply ?: ($invoice->customer_state ?: 'Local') }}</div>
                <div><strong>Tax Type:</strong> {{ $invoice->tax_type === 'inter_state' ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)' }}</div>
            </td>
        </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 20px; text-align: center;">#</th>
                <th>Item Description</th>
                <th style="width: 60px; text-align: center;">HSN/SAC</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 35px; text-align: center;">Unit</th>
                <th style="width: 55px;" class="text-right">Rate</th>
                <th style="width: 65px;" class="text-right">Taxable</th>
                @if($invoice->tax_type === 'inter_state')
                    <th style="width: 65px;" class="text-right">IGST</th>
                @else
                    <th style="width: 55px;" class="text-right">CGST</th>
                    <th style="width: 55px;" class="text-right">SGST</th>
                @endif
                <th style="width: 75px;" class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $item->item_name }}</strong>
                        @if(!empty($item->dimension))
                            <div style="font-size: 8.5px; color: #64748b;">Dim: {{ $item->dimension }}</div>
                        @endif
                    </td>
                    <td class="text-center">{{ $item->hsn_sac ?: '-' }}</td>
                    <td class="text-center">{{ (float) $item->quantity }}</td>
                    <td class="text-center">{{ $item->unit ?: 'PCS' }}</td>
                    <td class="text-right">₹{{ number_format((float) $item->rate, 2) }}</td>
                    <td class="text-right">₹{{ number_format((float) $item->taxable_value, 2) }}</td>
                    @if($invoice->tax_type === 'inter_state')
                        <td class="text-right">
                            ₹{{ number_format((float) $item->igst_amount, 2) }}
                            <div style="font-size: 8px; color: #64748b;">({{ (float) $item->igst_rate }}%)</div>
                        </td>
                    @else
                        <td class="text-right">
                            ₹{{ number_format((float) $item->cgst_amount, 2) }}
                            <div style="font-size: 8px; color: #64748b;">({{ (float) $item->cgst_rate }}%)</div>
                        </td>
                        <td class="text-right">
                            ₹{{ number_format((float) $item->sgst_amount, 2) }}
                            <div style="font-size: 8px; color: #64748b;">({{ (float) $item->sgst_rate }}%)</div>
                        </td>
                    @endif
                    <td class="text-right"><strong>₹{{ number_format((float) $item->total_amount, 2) }}</strong></td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals and HSN Summary -->
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <!-- Left: Bank & Settlement -->
            <td style="width: 55%; vertical-align: top; padding-right: 15px;">
                @if(!empty($businessProfile?->bank_name))
                    <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; background: #f8fafc; margin-bottom: 8px;">
                        <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Bank Settlement Details:</div>
                        <div style="font-size: 9.5px; margin-top: 2px;"><strong>Bank:</strong> {{ $businessProfile->bank_name }} {{ $businessProfile->bank_branch ? "({$businessProfile->bank_branch})" : "" }}</div>
                        <div style="font-size: 9.5px;"><strong>A/C No:</strong> {{ $businessProfile->bank_account_number }}</div>
                        <div style="font-size: 9.5px;"><strong>IFSC Code:</strong> {{ $businessProfile->bank_ifsc }}</div>
                    </div>
                @endif

                @if(!empty($invoice->terms))
                    <div style="font-size: 8.5px; color: #64748b;">
                        <strong>Terms & Conditions:</strong><br/>
                        {!! nl2br(e($invoice->terms)) !!}
                    </div>
                @endif
            </td>

            <!-- Right: Financial Summary -->
            <td style="width: 45%; vertical-align: top;">
                <table class="summary-table" style="border: 1px solid #cbd5e1; background: #f8fafc;">
                    <tr>
                        <td style="color: #64748b;">Subtotal:</td>
                        <td class="text-right">₹{{ number_format((float) $invoice->subtotal, 2) }}</td>
                    </tr>
                    @if((float) $invoice->total_discount > 0)
                        <tr>
                            <td style="color: #dc2626;">Discount:</td>
                            <td class="text-right" style="color: #dc2626;">- ₹{{ number_format((float) $invoice->total_discount, 2) }}</td>
                        </tr>
                    @endif
                    <tr>
                        <td style="color: #64748b;">Taxable Value:</td>
                        <td class="text-right">₹{{ number_format((float) $invoice->taxable_amount, 2) }}</td>
                    </tr>
                    @if($invoice->tax_type === 'inter_state')
                        <tr>
                            <td style="color: #64748b;">IGST Total:</td>
                            <td class="text-right">₹{{ number_format((float) $invoice->igst_amount, 2) }}</td>
                        </tr>
                    @else
                        <tr>
                            <td style="color: #64748b;">CGST Total:</td>
                            <td class="text-right">₹{{ number_format((float) $invoice->cgst_amount, 2) }}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b;">SGST Total:</td>
                            <td class="text-right">₹{{ number_format((float) $invoice->sgst_amount, 2) }}</td>
                        </tr>
                    @endif
                    @if((float) $invoice->round_off != 0)
                        <tr>
                            <td style="color: #64748b;">Round Off:</td>
                            <td class="text-right">₹{{ number_format((float) $invoice->round_off, 2) }}</td>
                        </tr>
                    @endif
                    <tr class="grand-total-row">
                        <td>Grand Total:</td>
                        <td class="text-right">₹{{ number_format((float) $invoice->total_amount, 2) }}</td>
                    </tr>
                    @if((float) ($invoice->paid_amount ?? 0) > 0)
                        <tr style="color: #047857; font-weight: bold;">
                            <td>Amount Received:</td>
                            <td class="text-right">₹{{ number_format((float) $invoice->paid_amount, 2) }}</td>
                        </tr>
                    @endif
                    @php
                        $balanceDue = max(0, (float) $invoice->total_amount - (float) ($invoice->paid_amount ?? 0));
                    @endphp
                    @if($balanceDue > 0)
                        <tr style="color: #b91c1c; font-weight: bold; border-top: 1px dashed #cbd5e1;">
                            <td>Balance Due:</td>
                            <td class="text-right">₹{{ number_format($balanceDue, 2) }}</td>
                        </tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>

    <!-- Signatory -->
    <table style="width: 100%; margin-top: 30px;">
        <tr>
            <td style="vertical-align: bottom; font-size: 9px; color: #64748b;">
                Generated electronically on {{ date('d-m-Y H:i') }}.
            </td>
            <td style="text-align: right; vertical-align: bottom;">
                <div style="font-size: 10.5px; font-weight: bold; color: #0f172a;">For {{ $invoice->seller_name }}</div>
                <div style="height: 35px;"></div>
                <div style="border-top: 1px solid #94a3b8; width: 140px; margin-left: auto;"></div>
                <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">Authorized Signatory</div>
            </td>
        </tr>
    </table>

</body>
</html>
