<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment QR Limit Reached - {{ $shopName }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px 14px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #fee2e2; overflow: hidden; text-align: center; }
        .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 28px 20px; }
        .header .icon { font-size: 38px; margin-bottom: 8px; }
        .header h1 { font-size: 19px; font-weight: 700; margin-bottom: 4px; }
        .header p { font-size: 13px; opacity: 0.92; }
        .body { padding: 24px 20px; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin-bottom: 20px; color: #991b1b; font-size: 13px; line-height: 1.5; }
        .bill-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px; text-align: left; font-size: 13px; }
        .bill-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .bill-row:last-child { margin-bottom: 0; font-weight: 700; color: #0f172a; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
        .btn { display: block; width: 100%; background: #059669; color: white; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; margin-bottom: 10px; }
        .btn:hover { background: #047857; }
        .contact-info { font-size: 12px; color: #64748b; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="icon">🔒</div>
            <h1>QR Scan Limit Reached</h1>
            <p>Maximum 2 scans allowed for this payment code</p>
        </div>
        <div class="body">
            <div class="alert-box">
                <strong>Notice:</strong> For your financial security, this dynamic payment QR code has expired after reaching its 2-scan limit.
            </div>

            <div class="bill-summary">
                <div class="bill-row"><span>Store:</span> <span>{{ $shopName }}</span></div>
                <div class="bill-row"><span>Invoice #:</span> <span>#{{ $invoice->invoice_number }}</span></div>
                <div class="bill-row"><span>Customer:</span> <span>{{ $invoice->customer_name }}</span></div>
                <div class="bill-row"><span>Balance Due:</span> <span>₹{{ number_format($due, 2) }}</span></div>
            </div>

            <a href="{{ url('/i/' . $invoice->invoice_hash) }}" class="btn">
                📄 View Online Bill & Alternative Payment
            </a>

            <div class="contact-info">
                If you have questions or already paid, please contact <strong>{{ $shopName }}</strong>
                @if(!empty($businessProfile?->phone))
                    at <strong>{{ $businessProfile->phone }}</strong>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
