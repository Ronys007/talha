<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pay Invoice #{{ $invoice->invoice_number }} - {{ $shopName }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px 14px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden; text-align: center; }
        .header { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 26px 20px; }
        .header h1 { font-size: 19px; font-weight: 700; margin-bottom: 4px; }
        .header p { font-size: 13px; opacity: 0.92; }
        .badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; margin-top: 10px; font-weight: 600; letter-spacing: 0.3px; }
        .body { padding: 24px 20px; }
        .amount-box { background: #f1f5f9; border-radius: 12px; padding: 18px; margin-bottom: 22px; border: 1px dashed #cbd5e1; }
        .amount-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
        .amount-value { font-size: 32px; font-weight: 800; color: #0f172a; }
        .btn-pay { display: block; width: 100%; background: #059669; color: white; padding: 14px 20px; border-radius: 10px; font-size: 16px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(5,150,105,0.35); transition: 0.2s; margin-bottom: 12px; border: none; cursor: pointer; }
        .btn-pay:hover { background: #047857; transform: translateY(-1px); }
        .app-logos { display: flex; justify-content: center; gap: 12px; margin-bottom: 20px; }
        .app-chip { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; }
        .scan-warning { background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 18px; line-height: 1.4; }
        .btn-invoice { display: block; width: 100%; background: transparent; color: #475569; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid #cbd5e1; }
        .btn-invoice:hover { background: #f8fafc; }
        .qr-desktop { display: none; margin: 16px 0; }
        @media (min-width: 768px) {
            .qr-desktop { display: block; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>{{ $shopName }}</h1>
            <p>Invoice #{{ $invoice->invoice_number }}</p>
            <div class="badge">
                <span>🔒</span> Scan {{ $currentScan }} of {{ $maxScans }} used
            </div>
        </div>
        <div class="body">
            <div class="amount-box">
                <div class="amount-label">Outstanding Balance Due</div>
                <div class="amount-value">₹{{ number_format($due, 2) }}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Billed to: <strong>{{ $invoice->customer_name }}</strong></div>
            </div>

            @if(!empty($upiPayUrl))
                <a href="{{ $upiPayUrl }}" class="btn-pay" id="payButton">
                    ⚡ Pay ₹{{ number_format($due, 2) }} via UPI
                </a>

                <div class="app-logos">
                    <span class="app-chip">Google Pay</span>
                    <span class="app-chip">PhonePe</span>
                    <span class="app-chip">Paytm</span>
                    <span class="app-chip">BHIM</span>
                </div>
            @else
                <div style="color: #64748b; font-size: 13px; margin-bottom: 16px;">
                    Please view your online bill below for complete details.
                </div>
            @endif

            <div class="scan-warning">
                ⏱️ <strong>Security Notice:</strong> This payment QR is valid for <strong>2 scans only</strong> (You are on scan #{{ $currentScan }}). Please complete your payment now.
            </div>

            <a href="{{ url('/i/' . $invoice->invoice_hash) }}" class="btn-invoice">
                📄 View Full Invoice & Receipt
            </a>
        </div>
    </div>

    @if(!empty($upiPayUrl))
    <script>
        // Auto-launch UPI intent on mobile devices upon scanning
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            // Gentle trigger after 500ms so user sees the store confirmation
            setTimeout(() => {
                window.location.href = "{{ $upiPayUrl }}";
            }, 600);
        }
    </script>
    @endif
</body>
</html>
