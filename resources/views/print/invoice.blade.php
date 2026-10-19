<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - {{ $order->customer }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }

        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .invoice-header {
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .invoice-header h1 {
            color: #333;
            font-size: 32px;
            margin-bottom: 10px;
        }

        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .detail-section h3 {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
        }

        .detail-section p {
            margin: 5px 0;
            font-size: 16px;
        }

        .gst-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
        }

        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }

        .invoice-table thead {
            background: #333;
            color: white;
        }

        .invoice-table th,
        .invoice-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        .invoice-table th {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
        }

        .invoice-table tbody tr:hover {
            background: #f9f9f9;
        }

        .text-right {
            text-align: right !important;
        }

        .text-center {
            text-align: center !important;
        }

        .invoice-total {
            text-align: right;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #333;
        }

        .invoice-total h2 {
            font-size: 24px;
            color: #333;
        }

        .invoice-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .invoice-container {
                box-shadow: none;
                padding: 20px;
            }

            .no-print {
                display: none !important;
            }

            .ledger-section {
                display: block !important;
            }
        }

        .action-buttons {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: #007bff;
            color: white;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-warning {
            background: #ffc107;
            color: #333;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .ledger-section {
            display: none;
            margin-top: 40px;
            padding: 20px;
            background: #fff9e6;
            border: 2px solid #ffc107;
            border-radius: 8px;
        }

        .ledger-section.show {
            display: block;
        }

        .ledger-section h3 {
            color: #856404;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ledger-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .ledger-table th,
        .ledger-table td {
            padding: 10px;
            text-align: left;
            border: 1px solid #ffc107;
        }

        .ledger-table th {
            background: #ffc107;
            color: #333;
            font-weight: bold;
        }

        .ledger-table tbody tr:nth-child(even) {
            background: #fffbf0;
        }

        .total-pending {
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
            text-align: center;
        }

        .total-pending h4 {
            margin: 0;
            font-size: 20px;
        }

        .alert-warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            body {
                padding: 5px;
                font-size: 13px;
            }

            .invoice-container {
                padding: 10px;
            }

            .invoice-header h1 {
                font-size: 20px;
            }

            .invoice-details {
                grid-template-columns: 1fr;
            }

            .action-buttons {
                flex-direction: column;
            }

            .btn {
                width: 100%;
                padding: 12px;
            }

            .invoice-table {
                font-size: 11px;
            }

            .invoice-table th,
            .invoice-table td {
                padding: 6px 4px;
            }
        }
    </style>
</head>

<body>
    <div class="no-print action-buttons">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print Invoice</button>
        @if (isset($pendingOrders) && count($pendingOrders) > 0)
            <button class="btn btn-warning" onclick="toggleLedger()">📋 Show Ledger ({{ count($pendingOrders) }}
                Pending)</button>
        @endif
    </div>

    <div class="invoice-container">
        <div class="invoice-header">
            <h1>INVOICE</h1>
            <p>Invoice #{{ str_pad($order->id, 6, '0', STR_PAD_LEFT) }}</p>
            <p>Date: {{ $order->created_at->format('d F Y') }}</p>
        </div>

        <div class="invoice-details">
            <div class="detail-section">
                <h3>Bill To:</h3>
                <p><strong>{{ $order->customer }}</strong></p>
                @if ($order->gst)
                    <p><span class="gst-badge">GST: {{ $order->gst }}</span></p>
                @endif
            </div>

            <div class="detail-section">
                <h3>From:</h3>
                <p><strong>{{ auth()->user()->name }}</strong></p>
                <p>{{ auth()->user()->email }}</p>
            </div>
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 45%;">Item Name</th>
                    <th class="text-center" style="width: 15%;">Quantity</th>
                    <th class="text-right" style="width: 15%;">Price</th>
                    <th class="text-right" style="width: 20%;">Total</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $counter = 1;
                @endphp
                @foreach ($order->items as $item)
                    @php
                        $inventoryItem = $inventoryItems->firstWhere('code', $item->code);
                        $itemName = $inventoryItem ? $inventoryItem->item : $item->code;
                        $itemTotal = $item->quantity * $item->selling_price;
                    @endphp
                    <tr>
                        <td>{{ $counter++ }}</td>
                        <td>{{ $itemName }}</td>
                        <td class="text-center">{{ $item->quantity }}</td>
                        <td class="text-right">₹{{ number_format($item->selling_price, 2) }}</td>
                        <td class="text-right">₹{{ number_format($itemTotal, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Payment Summary Section -->
        <div class="payment-summary" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                Payment Summary
            </h3>

            <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-size: 16px;">Original Bill Amount:</td>
                    <td style="padding: 10px; text-align: right; font-size: 16px; font-weight: bold;">
                        ₹{{ number_format($order->total_price, 2) }}
                    </td>
                </tr>

                @if ($totalCredit > 0)
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-size: 16px; color: #856404;">Additional Charges/Credits:</td>
                        <td
                            style="padding: 10px; text-align: right; font-size: 16px; font-weight: bold; color: #856404;">
                            + ₹{{ number_format($totalCredit, 2) }}
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-size: 16px;">Adjusted Total:</td>
                        <td style="padding: 10px; text-align: right; font-size: 16px; font-weight: bold;">
                            ₹{{ number_format($order->total_price + $totalCredit, 2) }}
                        </td>
                    </tr>
                @endif

                @if ($totalPaid > 0)
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-size: 16px; color: #28a745;">Amount Paid:</td>
                        <td
                            style="padding: 10px; text-align: right; font-size: 16px; font-weight: bold; color: #28a745;">
                            - ₹{{ number_format($totalPaid, 2) }}
                        </td>
                    </tr>
                @endif

                <tr style="background: {{ $currentBalance > 0 ? '#dc3545' : '#28a745' }}; color: white;">
                    <td style="padding: 12px; font-size: 16px; font-weight: bold;">
                        {{ $currentBalance > 0 ? 'Balance Due:' : 'Status:' }}
                    </td>
                    <td style="padding: 12px; text-align: right; font-size: 18px; font-weight: bold;">
                        @if ($currentBalance > 0)
                            ₹{{ number_format($currentBalance, 2) }}
                        @else
                            PAID IN FULL
                        @endif
                    </td>
                </tr>
            </table>

            <!-- Payment History -->
            @if (count($currentTransactions) > 0)
                <div style="margin-top: 20px;">
                    <h4 style="color: #666; margin-bottom: 10px;">Payment History:</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead style="background: #e9ecef;">
                            <tr>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Type</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Description</th>
                                <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($currentTransactions as $trans)
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        {{ $trans->created_at->format('d M Y') }}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        @if ($trans->type === 'receive')
                                            <span style="color: #28a745; font-weight: bold;">Payment</span>
                                        @else
                                            <span style="color: #856404; font-weight: bold;">Credit</span>
                                        @endif
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{{ $trans->text ?? '-' }}</td>
                                    <td
                                        style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold;">
                                        @if ($trans->type === 'receive')
                                            <span
                                                style="color: #28a745;">-₹{{ number_format($trans->amount, 2) }}</span>
                                        @else
                                            <span
                                                style="color: #856404;">+₹{{ number_format($trans->amount, 2) }}</span>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </div>

        <!-- Ledger Section -->
        @if (isset($pendingOrders) && count($pendingOrders) > 0)
            <div class="ledger-section" id="ledgerSection">
                <h3>
                    <span>⚠️</span>
                    Previous Pending Bills for {{ $order->customer }}
                </h3>

                <table class="ledger-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Invoice No.</th>
                            <th>Date</th>
                            <th class="text-right">Bill Amount</th>
                            <th class="text-right">Pending Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($pendingOrders as $index => $pending)
                            <tr>
                                <td>{{ $index + 1 }}</td>
                                <td>#{{ str_pad($pending['id'], 6, '0', STR_PAD_LEFT) }}</td>
                                <td>{{ $pending['date']->format('d M Y') }}</td>
                                <td class="text-right">₹{{ number_format($pending['total'], 2) }}</td>
                                <td class="text-right"><strong>₹{{ number_format($pending['balance'], 2) }}</strong>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>

                <div class="total-pending">
                    <h4>Total Previous Pending: ₹{{ number_format($totalPending, 2) }}</h4>
                </div>

                <div class="alert-warning">
                    <strong>Note:</strong> This customer has ₹{{ number_format($totalPending, 2) }} pending from
                    previous bills.
                    Current invoice balance: ₹{{ number_format($currentBalance, 2) }}.
                    <strong>Grand Total Due: ₹{{ number_format($totalPending + $currentBalance, 2) }}</strong>
                </div>
            </div>
        @endif

        <div class="invoice-footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
    </div>

    <script>
        function toggleLedger() {
            const ledgerSection = document.getElementById('ledgerSection');
            ledgerSection.classList.toggle('show');
        }
    </script>
</body>

</html>
