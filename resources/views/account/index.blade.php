@extends('layouts.main')

@section('main-section')
    <div class="container-fluid px-4">
        <div class="row mb-4">
            <div class="col-12">
                <a href="/billing" class="btn btn-secondary mb-3">
                    <i class="bi bi-arrow-left"></i> Back to Billing
                </a>
                <h2 class="text-white">Account Details - {{ $order->customer }}</h2>
            </div>
        </div>

        <!-- Order Summary Card -->
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="card bg-dark text-white border-primary">
                    <div class="card-header bg-primary">
                        <h5 class="mb-0"><i class="bi bi-receipt"></i> Order
                            #{{ str_pad($order->id, 6, '0', STR_PAD_LEFT) }}</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Customer:</strong> {{ $order->customer }}</p>
                                @if ($order->gst)
                                    <p><strong>GST Number:</strong> <span
                                            class="badge bg-success">{{ $order->gst }}</span></p>
                                @else
                                    <p><strong>GST Number:</strong> <span class="badge bg-secondary">No GST</span></p>
                                @endif
                            </div>
                            <div class="col-md-6">
                                <p><strong>Date:</strong> {{ $order->created_at->format('d M Y, h:i A') }}</p>
                                <p><strong>Total Amount:</strong> <span
                                        class="badge bg-info">₹{{ number_format($order->total_price, 2) }}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card bg-dark text-white border-warning">
                    <div class="card-header bg-warning text-dark">
                        <h5 class="mb-0"><i class="bi bi-wallet2"></i> Current Balance</h5>
                    </div>
                    <div class="card-body text-center">
                        @php
                            $currentBalance = $order->total_price;
                            foreach ($transactions as $transaction) {
                                if ($transaction->type === 'credit') {
                                    $currentBalance += $transaction->amount;
                                } else {
                                    $currentBalance -= $transaction->amount;
                                }
                            }
                        @endphp
                        <h2 class="mb-0">
                            <span class="badge {{ $currentBalance > 0 ? 'bg-danger' : 'bg-success' }}">
                                ₹{{ number_format($currentBalance, 2) }}
                            </span>
                        </h2>
                        <small class="text-muted">
                            {{ $currentBalance > 0 ? 'Amount Due' : 'Fully Paid' }}
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="row mb-4">
            <div class="col-12">
                <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#receiveModal">
                    <i class="bi bi-cash-coin"></i> Add Payment Received
                </button>
                <button type="button" class="btn btn-warning" data-bs-toggle="modal" data-bs-target="#creditModal">
                    <i class="bi bi-plus-circle"></i> Add Credit
                </button>
                <a href="{{ route('billing.print', $order->id) }}" class="btn btn-info" target="_blank">
                    <i class="bi bi-printer"></i> Print Invoice
                </a>
            </div>
        </div>

        <!-- Order Items -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card bg-dark text-white border-secondary">
                    <div class="card-header bg-secondary">
                        <h5 class="mb-0"><i class="bi bi-list-ul"></i> Order Items</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-bordered table-dark">
                                <thead class="table-light text-dark">
                                    <tr>
                                        <th>#</th>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th class="text-center">Quantity</th>
                                        <th class="text-end">Price</th>
                                        <th class="text-end">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @php $counter = 1; @endphp
                                    @foreach ($order->items as $item)
                                        @php
                                            $inventory = \App\Models\Inventory::where('code', $item->code)->first();
                                            $itemName = $inventory ? $inventory->item : '-';
                                        @endphp
                                        <tr>
                                            <td>{{ $counter++ }}</td>
                                            <td>{{ $item->code }}</td>
                                            <td>{{ $itemName }}</td>
                                            <td class="text-center">{{ $item->quantity }}</td>
                                            <td class="text-end">₹{{ number_format($item->selling_price, 2) }}</td>
                                            <td class="text-end">
                                                ₹{{ number_format($item->quantity * $item->selling_price, 2) }}</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                                <tfoot class="table-primary">
                                    <tr>
                                        <th colspan="5" class="text-end">Total:</th>
                                        <th class="text-end">₹{{ number_format($order->total_price, 2) }}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Transaction History -->
        <div class="row">
            <div class="col-12">
                <div class="card bg-dark text-white border-info">
                    <div class="card-header bg-info text-dark">
                        <h5 class="mb-0"><i class="bi bi-clock-history"></i> Transaction History</h5>
                    </div>
                    <div class="card-body">
                        @if ($transactions->count() > 0)
                            <div class="table-responsive">
                                <table class="table table-bordered table-dark table-hover">
                                    <thead class="table-light text-dark">
                                        <tr>
                                            <th>#</th>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Description</th>
                                            <th class="text-end">Amount</th>
                                            <th class="text-end">Running Balance</th>
                                            <th class="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @php
                                            $counter = 1;
                                            $runningBalance = $order->total_price;
                                        @endphp
                                        @foreach ($transactions as $transaction)
                                            @php
                                                if ($transaction->type === 'credit') {
                                                    $runningBalance += $transaction->amount;
                                                } else {
                                                    $runningBalance -= $transaction->amount;
                                                }
                                            @endphp
                                            <tr>
                                                <td>{{ $counter++ }}</td>
                                                <td>{{ $transaction->created_at->format('d M Y, h:i A') }}</td>
                                                <td>
                                                    @if ($transaction->type === 'credit')
                                                        <span class="badge bg-warning">Credit</span>
                                                    @else
                                                        <span class="badge bg-success">Payment</span>
                                                    @endif
                                                </td>
                                                <td>{{ $transaction->text ?? '-' }}</td>
                                                <td class="text-end">
                                                    @if ($transaction->type === 'credit')
                                                        <span
                                                            class="text-warning">+₹{{ number_format($transaction->amount, 2) }}</span>
                                                    @else
                                                        <span
                                                            class="text-success">-₹{{ number_format($transaction->amount, 2) }}</span>
                                                    @endif
                                                </td>
                                                <td class="text-end">
                                                    <strong
                                                        class="{{ $runningBalance > 0 ? 'text-danger' : 'text-success' }}">
                                                        ₹{{ number_format($runningBalance, 2) }}
                                                    </strong>
                                                </td>
                                                <td class="text-center">
                                                    @if ($transaction->type === 'credit')
                                                        <a href="{{ route('account.credit.delete', $transaction->id) }}"
                                                            class="btn btn-sm btn-danger"
                                                            onclick="return confirm('Are you sure you want to delete this credit?')">
                                                            <i class="bi bi-trash"></i>
                                                        </a>
                                                    @else
                                                        <a href="{{ route('account.receipt.delete', $transaction->id) }}"
                                                            class="btn btn-sm btn-danger"
                                                            onclick="return confirm('Are you sure you want to delete this receipt?')">
                                                            <i class="bi bi-trash"></i>
                                                        </a>
                                                    @endif
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        @else
                            <div class="text-center py-5">
                                <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.5;"></i>
                                <p class="text-muted mt-3">No transactions yet. Add a payment or credit to get started.</p>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Receive Payment Modal -->
    <div class="modal fade" id="receiveModal" tabindex="-1" aria-labelledby="receiveModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header border-success">
                    <h5 class="modal-title" id="receiveModalLabel">
                        <i class="bi bi-cash-coin text-success"></i> Add Payment Received
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <form method="POST" action="{{ route('account.receipt', $order->id) }}">
                    @csrf
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="receive" class="form-label">Amount Received</label>
                            <input type="number" class="form-control" id="receive" name="receive" step="0.01"
                                required>
                        </div>
                        <div class="mb-3">
                            <label for="receive_text" class="form-label">Description (Optional)</label>
                            <textarea class="form-control" id="receive_text" name="text" rows="2"
                                placeholder="e.g., Cash payment, Online transfer, etc."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-success">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-success">
                            <i class="bi bi-check-circle"></i> Add Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Add Credit Modal -->
    <div class="modal fade" id="creditModal" tabindex="-1" aria-labelledby="creditModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header border-warning">
                    <h5 class="modal-title" id="creditModalLabel">
                        <i class="bi bi-plus-circle text-warning"></i> Add Credit
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <form method="POST" action="{{ route('account.credit', $order->id) }}">
                    @csrf
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="credit" class="form-label">Credit Amount</label>
                            <input type="number" class="form-control" id="credit" name="credit" step="0.01"
                                required>
                        </div>
                        <div class="mb-3">
                            <label for="credit_text" class="form-label">Description (Optional)</label>
                            <textarea class="form-control" id="credit_text" name="text" rows="2"
                                placeholder="e.g., Additional charges, Late fee, etc."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-warning">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-warning">
                            <i class="bi bi-check-circle"></i> Add Credit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection
