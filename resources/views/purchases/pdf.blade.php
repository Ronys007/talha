<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Purchase Statement #{{ $order->purchase_number ?: $order->po_number }}</title>
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
            font-size: 18px;
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
            margin-bottom: 4px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-weight: bold;
            padding: 7px 8px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
        }
        .items-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10px;
        }
        .items-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .totals-table {
            width: 100%;
            margin-bottom: 14px;
        }
        .totals-box {
            width: 260px;
            float: right;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            padding: 8px 12px;
        }
        .totals-row {
            display: table;
            width: 100%;
            margin-bottom: 4px;
            font-size: 10.5px;
        }
        .totals-label {
            display: table-cell;
            color: #475569;
        }
        .totals-val {
            display: table-cell;
            text-align: right;
            font-weight: bold;
        }
        .totals-due {
            border-top: 1.5px solid #cbd5e1;
            padding-top: 5px;
            margin-top: 5px;
            font-size: 12px;
            color: #dc2626;
        }
        .badge {
            display: inline-block;
            padding: 3px 7px;
            font-size: 9px;
            font-weight: bold;
            border-radius: 3px;
            text-transform: uppercase;
        }
        .badge-paid {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
        }
        .badge-partial {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
        }
        .badge-unpaid {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        .clear {
            clear: both;
        }
        .footer-note {
            margin-top: 25px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 9.5px;
            color: #64748b;
        }
    </style>
</head>
<body>

    @php
        $bizName = ($businessProfile?->business_name && $businessProfile?->business_name !== 'Super Admin')
            ? $businessProfile->business_name
            : ($user?->name ?: 'Admin');
        $total = (float) $order->total_amount;
        $isPaid = strtolower((string)$order->status) === 'paid';
        $paid = $isPaid ? $total : (float)($order->paid_amount ?? 0);
        $due = max(0, $total - $paid);
        if ($due <= 0.001 && $total > 0) {
            $isPaid = true;
        }
    @endphp

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <div class="shop-name">{{ $bizName }}</div>
                @if(!empty($businessProfile?->address))
                    <div style="color: #475569; font-size: 10px; margin-top: 2px;">{{ $businessProfile->address }}</div>
                @endif
                @if(!empty($businessProfile?->gst_number))
                    <div style="font-size: 10px; margin-top: 2px;"><strong>GSTIN:</strong> {{ $businessProfile->gst_number }}</div>
                @endif
                @if(!empty($businessProfile?->phone))
                    <div style="font-size: 10px;"><strong>Phone:</strong> {{ $businessProfile->phone }}</div>
                @endif
            </td>
            <td style="vertical-align: top; width: 45%;">
                <div class="header-title">PURCHASE STATEMENT</div>
                <div class="header-sub">Supplier Payment Voucher</div>
                <div class="header-inv-no">Ref: {{ $order->purchase_number ?: 'PUR-' . str_pad((string)$order->id, 6, '0', STR_PAD_LEFT) }}</div>
                <div style="margin-top: 4px; text-align: right;">
                    @if($isPaid)
                        <span class="badge badge-paid">PAID IN FULL</span>
                    @elseif($paid > 0)
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
                <div class="info-title">SUPPLIER / VENDOR (PAYEE):</div>
                <div style="font-size: 12px; font-weight: bold; color: #0f172a;">{{ $order->supplier_name }}</div>
                @if(!empty($order->gst_number))
                    <div style="margin-top: 3px;"><strong>GSTIN:</strong> {{ $order->gst_number }}</div>
                @endif
                @if(!empty($order->supplier_phone))
                    <div><strong>Phone:</strong> {{ $order->supplier_phone }}</div>
                @endif
            </td>
            <td style="width: 50%;">
                <div class="info-title">PURCHASE BILL DETAILS:</div>
                <div><strong>Supplier Invoice #:</strong> {{ $order->po_number }}</div>
                <div><strong>Order Date:</strong> {{ $order->order_date ? date('d M Y', strtotime($order->order_date)) : '-' }}</div>
                <div><strong>Payment Due Date:</strong> {{ $order->due_date ? date('d M Y', strtotime($order->due_date)) : 'Upon Receipt' }}</div>
                @if($isPaid && $order->paid_at)
                    <div style="color: #047857;"><strong>Paid Date:</strong> {{ date('d M Y', strtotime($order->paid_at)) }}</div>
                @endif
            </td>
        </tr>
    </table>

    <!-- Items Table -->
    @if($order->items && count($order->items) > 0)
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 45%;">Item Description</th>
                    <th style="width: 15%;" class="text-center">Qty</th>
                    <th style="width: 15%;" class="text-right">Rate</th>
                    <th style="width: 20%;" class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $idx => $item)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        <td><strong>{{ $item->description ?: 'Item' }}</strong></td>
                        <td class="text-center">{{ (float)$item->quantity }} {{ $item->per ?: 'PCS' }}</td>
                        <td class="text-right">₹{{ number_format((float)$item->rate, 2) }}</td>
                        <td class="text-right">₹{{ number_format((float)$item->amount, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <!-- Totals Area -->
    <div class="totals-table">
        <div style="float: left; width: 55%; font-size: 10px; color: #475569;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px;">
                <strong>Payment Notice:</strong><br/>
                This statement outlines the purchase obligation towards supplier <strong>{{ $order->supplier_name }}</strong> for Invoice #{{ $order->po_number }}. Please settle the balance before the due date.
            </div>
        </div>

        <div class="totals-box">
            <div class="totals-row">
                <span class="totals-label">Total Amount:</span>
                <span class="totals-val">₹{{ number_format($total, 2) }}</span>
            </div>
            <div class="totals-row">
                <span class="totals-label" style="color: #047857;">Amount Paid:</span>
                <span class="totals-val" style="color: #047857;">- ₹{{ number_format($paid, 2) }}</span>
            </div>
            <div class="totals-row totals-due">
                <span class="totals-label" style="color: {{ $isPaid ? '#047857' : '#dc2626' }};">Pending Payable:</span>
                <span class="totals-val" style="color: {{ $isPaid ? '#047857' : '#dc2626' }};">₹{{ number_format($due, 2) }}</span>
            </div>
        </div>
        <div class="clear"></div>
    </div>

    <!-- Footer Note -->
    <div class="footer-note">
        <table style="width: 100%;">
            <tr>
                <td style="width: 60%;">
                    Verified by: <strong>{{ $bizName }}</strong>
                </td>
                <td style="width: 40%; text-align: right;">
                    <strong>Authorized Signatory</strong>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
