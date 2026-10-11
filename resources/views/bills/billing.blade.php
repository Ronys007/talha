@extends('layouts.main')

@section('main-section')
    <script>
        // Diagnostic script - Check if JavaScript is working
        console.log('=== BILLING PAGE LOADED ===');
        console.log('jQuery loaded:', typeof $ !== 'undefined');
        console.log('jQuery version:', typeof $ !== 'undefined' ? $.fn.jquery : 'N/A');
        console.log('Bootstrap loaded:', typeof bootstrap !== 'undefined');

        // Log all clicks on buttons and links for debugging
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM ready - Setting up click listeners');

            document.addEventListener('click', function(e) {
                const target = e.target.closest('button, a');
                if (target) {
                    console.log('Clicked element:', {
                        tag: target.tagName,
                        type: target.type,
                        class: target.className,
                        text: target.textContent.trim(),
                        href: target.href || 'N/A'
                    });
                }
            }, true);
        });
    </script>

    <div id="billing-section" class="container-fluid px-2 py-2">
        <div class="row mb-4">
            <div class="col-12">
                <h2 class="text-white mb-3">Billing Management</h2>


            </div>
        </div>

        <div class="table-responsive">
            <table class="table table-bordered table-dark text-white text-center">
                <thead class="table-primary">
                    <tr>
                        <th>Sr.No</th>
                        <th class="text-start">Customer Name</th>
                        <th>GST Number</th>
                        <th>Total Amount</th>
                        <th>Balance</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $counter = 1;
                    @endphp

                    @forelse ($orders as $order)
                        <tr>
                            <td>{{ $counter++ }}</td>
                            <td class="text-start">{{ $order->customer }}</td>
                            <td>
                                @if ($order->gst)
                                    <span class="badge bg-success">{{ $order->gst }}</span>
                                @else
                                    <span class="badge bg-secondary">No GST</span>
                                @endif
                            </td>
                            <td>₹{{ number_format($order->total_price, 2) }}</td>
                            <td>
                                <span
                                    class="badge {{ $order->updated_balance > 0 ? 'bg-warning text-dark' : 'bg-success' }}">
                                    ₹{{ number_format($order->updated_balance, 2) }}
                                </span>
                            </td>
                            <td>{{ $order->created_at->format('d M Y') }}</td>
                            <td>
                                <div class="btn-group" role="group">
                                    <a href="{{ route('billing.print', $order->id) }}" class="btn btn-sm btn-info"
                                        target="_blank">
                                        <i class="bi bi-printer"></i> Print
                                    </a>
                                    <a href="{{ route('account.show', $order->id) }}" class="btn btn-sm btn-primary">
                                        <i class="bi bi-person-circle"></i> Account
                                    </a>
                                    <button type="button" class="btn btn-sm btn-warning" data-bs-toggle="modal"
                                        data-bs-target="#editModal{{ $order->id }}">
                                        <i class="bi bi-pencil"></i> Edit
                                    </button>
                                    <form method="GET" action="{{ route('billing.delete', $order->id) }}"
                                        style="display: inline;">
                                        <button type="submit" class="btn btn-sm btn-danger">
                                            <i class="bi bi-trash"></i> Delete
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>

                        <!-- Edit Modal for each order -->
                        <div class="modal fade" id="editModal{{ $order->id }}" tabindex="-1"
                            aria-labelledby="editModalLabel{{ $order->id }}" aria-hidden="true">
                            <div class="modal-dialog modal-xl">
                                <div class="modal-content bg-dark text-white">
                                    <div class="modal-header border-warning">
                                        <h5 class="modal-title" id="editModalLabel{{ $order->id }}">
                                            <i class="bi bi-pencil-square"></i> Edit Order - {{ $order->customer }}
                                        </h5>
                                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                                            aria-label="Close"></button>
                                    </div>
                                    <form method="POST" action="{{ route('billing.update', $order->id) }}"
                                        id="editForm{{ $order->id }}">
                                        @csrf
                                        <div class="modal-body">
                                            <!-- Customer Info -->
                                            <div class="row mb-3">
                                                <div class="col-md-6">
                                                    <label for="edit_customer{{ $order->id }}"
                                                        class="form-label">Customer Name</label>
                                                    <input type="text" class="form-control"
                                                        id="edit_customer{{ $order->id }}" name="customer"
                                                        value="{{ $order->customer }}" required>
                                                </div>
                                                <div class="col-md-6">
                                                    <label for="edit_gst{{ $order->id }}" class="form-label">GST
                                                        Number</label>
                                                    <input type="text" class="form-control"
                                                        id="edit_gst{{ $order->id }}" name="gst"
                                                        value="{{ $order->gst }}"
                                                        placeholder="Enter GST Number (Optional)">
                                                </div>
                                            </div>

                                            <!-- Items Section -->
                                            <div class="border border-secondary rounded p-3 mb-3">
                                                <h6 class="text-warning mb-3"><i class="bi bi-cart"></i> Order Items</h6>
                                                <div id="editItemsContainer{{ $order->id }}">
                                                    @foreach ($order->items as $index => $item)
                                                        @php
                                                            // Get the item name from inventory
                                                            $inventoryItem = \App\Models\Inventory::where(
                                                                'code',
                                                                $item->code,
                                                            )
                                                                ->where('user_id', auth()->id())
                                                                ->first();
                                                            $itemName = $inventoryItem
                                                                ? $inventoryItem->item
                                                                : $item->code;
                                                        @endphp
                                                        <div class="edit-item-row mb-2 border-bottom border-secondary pb-2">
                                                            <div class="row g-2">
                                                                <div class="col-md-4">
                                                                    <label class="form-label small">Item Name</label>
                                                                    <input type="text"
                                                                        class="form-control form-control-sm edit-item-search"
                                                                        value="{{ $itemName }}"
                                                                        data-order-id="{{ $order->id }}"
                                                                        placeholder="Search items..." autocomplete="off">
                                                                    <input type="hidden"
                                                                        name="items[{{ $index }}][code]"
                                                                        class="edit-item-code" value="{{ $item->code }}">
                                                                    <div class="edit-suggestions list-group"
                                                                        style="position: absolute; z-index: 1050; max-height: 200px; overflow-y: auto;">
                                                                    </div>
                                                                </div>
                                                                <div class="col-md-3">
                                                                    <label class="form-label small">Quantity</label>
                                                                    <input type="number"
                                                                        class="form-control form-control-sm edit-quantity"
                                                                        name="items[{{ $index }}][quantity]"
                                                                        value="{{ $item->quantity }}"
                                                                        oninput="calculateEditTotal{{ $order->id }}()"
                                                                        onchange="calculateEditTotal{{ $order->id }}()"
                                                                        required>
                                                                </div>
                                                                <div class="col-md-3">
                                                                    <label class="form-label small">Price</label>
                                                                    <input type="number"
                                                                        class="form-control form-control-sm edit-price"
                                                                        name="items[{{ $index }}][selling_price]"
                                                                        value="{{ $item->selling_price }}" step="0.01"
                                                                        oninput="calculateEditTotal{{ $order->id }}()"
                                                                        onchange="calculateEditTotal{{ $order->id }}()"
                                                                        required>
                                                                </div>
                                                                <div class="col-md-2 d-flex align-items-end">
                                                                    @if ($index > 0)
                                                                        <button type="button"
                                                                            class="btn btn-sm btn-danger w-100"
                                                                            onclick="this.closest('.edit-item-row').remove(); calculateEditTotal{{ $order->id }}()">
                                                                            <i class="bi bi-trash"></i>
                                                                        </button>
                                                                    @endif
                                                                </div>
                                                            </div>
                                                        </div>
                                                    @endforeach
                                                </div>
                                            </div>

                                            <!-- Total -->
                                            <div class="row">
                                                <div class="col-md-12">
                                                    <label for="edit_total{{ $order->id }}"
                                                        class="form-label"><strong>Total Amount</strong></label>
                                                    <input type="number"
                                                        class="form-control form-control-lg bg-warning text-dark fw-bold"
                                                        id="edit_total{{ $order->id }}" name="total_price"
                                                        value="{{ $order->total_price }}" step="0.01" readonly
                                                        required>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="modal-footer border-warning">
                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                                <i class="bi bi-x-circle"></i> Cancel
                                            </button>
                                            <button type="submit" class="btn btn-warning text-dark">
                                                <i class="bi bi-check-circle"></i> Save Changes
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                        <script>
                            // Calculate total for edit form {{ $order->id }}
                            function calculateEditTotal{{ $order->id }}() {
                                console.log('[Order {{ $order->id }}] Starting calculation');
                                let total = 0;
                                const rows = document.querySelectorAll('#editItemsContainer{{ $order->id }} .edit-item-row');
                                console.log('[Order {{ $order->id }}] Found', rows.length, 'item rows');

                                rows.forEach((row, index) => {
                                    const qtyInput = row.querySelector('.edit-quantity');
                                    const priceInput = row.querySelector('.edit-price');

                                    console.log(`[Order {{ $order->id }}] Row ${index}:`, {
                                        hasQtyInput: !!qtyInput,
                                        hasPriceInput: !!priceInput,
                                        qtyValue: qtyInput ? qtyInput.value : 'N/A',
                                        priceValue: priceInput ? priceInput.value : 'N/A'
                                    });

                                    if (qtyInput && priceInput) {
                                        // Try to get value from .value property, fallback to attribute
                                        const qtyValue = qtyInput.value || qtyInput.getAttribute('value') || '0';
                                        const priceValue = priceInput.value || priceInput.getAttribute('value') || '0';

                                        const qty = parseFloat(qtyValue) || 0;
                                        const price = parseFloat(priceValue) || 0;

                                        console.log(`[Order {{ $order->id }}] Row ${index} parsed:`, {
                                            qty,
                                            price,
                                            subtotal: qty * price
                                        });

                                        if (!isNaN(qty) && !isNaN(price)) {
                                            total += qty * price;
                                        }
                                    }
                                });

                                console.log('[Order {{ $order->id }}] Final total:', total);
                                const totalInput = document.getElementById('edit_total{{ $order->id }}');
                                if (totalInput) {
                                    totalInput.value = total.toFixed(2);
                                    console.log('[Order {{ $order->id }}] Set total input to:', total.toFixed(2));
                                } else {
                                    console.error('[Order {{ $order->id }}] Total input element not found!');
                                }
                            }

                            // Calculate initial total
                            calculateEditTotal{{ $order->id }}();
                        </script>


                    @empty
                        <tr>
                            <td colspan="7" class="text-center py-4">
                                <p class="text-muted mb-0">No bills found. Create your first bill to get started!</p>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <!-- Summary Cards -->
        @if ($orders->count() > 0)
            <div class="row mt-3 g-2">
                <div class="col-lg-4 col-md-6 col-12">
                    <div class="card bg-primary text-white shadow-sm border-0">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="text-uppercase mb-1"
                                        style="font-size: 10px; letter-spacing: 0.5px; opacity: 0.85;">Total Orders</div>
                                    <div class="fs-4 fw-bold">{{ $orders->count() }}</div>
                                </div>
                                <div class="bg-white bg-opacity-25 rounded-circle p-2">
                                    <i class="bi bi-receipt fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 col-md-6 col-12">
                    <div class="card bg-success text-white shadow-sm border-0">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="text-uppercase mb-1"
                                        style="font-size: 10px; letter-spacing: 0.5px; opacity: 0.85;">Total Revenue</div>
                                    <div class="fs-5 fw-bold">₹{{ number_format($orders->sum('total_price'), 2) }}</div>
                                </div>
                                <div class="bg-white bg-opacity-25 rounded-circle p-2">
                                    <i class="bi bi-currency-rupee fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 col-md-12 col-12">
                    <div class="card bg-warning text-dark shadow-sm border-0">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="text-uppercase mb-1"
                                        style="font-size: 10px; letter-spacing: 0.5px; opacity: 0.75;">Pending Balance
                                    </div>
                                    <div class="fs-5 fw-bold">₹{{ number_format($orders->sum('updated_balance'), 2) }}
                                    </div>
                                </div>
                                <div class="bg-dark bg-opacity-25 rounded-circle p-2">
                                    <i class="bi bi-exclamation-triangle fs-3"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        @endif
    </div>

    <script>
        // Autocomplete for edit modal item search
        $(document).on('keyup', '.edit-item-search', function() {
            let input = $(this);
            let query = input.val();
            let suggestionsDiv = input.siblings('.edit-suggestions');

            if (query.length > 0) {
                $.ajax({
                    url: '/billing/search',
                    type: 'GET',
                    data: {
                        query: query
                    },
                    success: function(data) {
                        suggestionsDiv.empty();
                        if (data.length > 0) {
                            data.forEach(function(item) {
                                let priceText = '';
                                if (item.selling_price !== undefined && item.selling_price !==
                                    null) {
                                    priceText = ` - ₹${item.selling_price}`;
                                }

                                suggestionsDiv.append(
                                    `<a href="#" class="list-group-item list-group-item-action edit-suggestion-item" 
                                        data-code="${item.code}" data-name="${item.item}" data-price="${item.selling_price || ''}">
                                        ${item.item} (${item.code})${priceText}
                                    </a>`
                                );
                            });
                            suggestionsDiv.show(); // Show dropdown
                        } else {
                            suggestionsDiv.append('<p class="list-group-item">No items found</p>');
                            suggestionsDiv.show(); // Show "no items" message
                        }
                    },
                    error: function() {
                        console.error('Error fetching edit suggestions');
                    }
                });
            } else {
                suggestionsDiv.empty().hide(); // Hide when empty
            }
        });

        // Handle click on autocomplete suggestion in edit modal
        $(document).on('click', '.edit-suggestion-item', function(e) {
            e.preventDefault();
            let suggestion = $(this);
            let row = suggestion.closest('.edit-item-row');

            const code = suggestion.data('code');
            const name = suggestion.data('name');
            const price = suggestion.data('price');

            console.log('Item selected:', {
                code,
                name,
                price
            });

            // Set the item name in visible field
            row.find('.edit-item-search').val(name || code || '');

            // Set the item code in hidden field
            row.find('.edit-item-code').val(code);

            // Auto-fill the price if available
            if (price) {
                row.find('.edit-price').val(price);
            }

            console.log('Code field set to:', row.find('.edit-item-code').val());

            // Clear suggestions
            suggestion.closest('.edit-suggestions').empty().hide();

            // Focus on quantity field
            row.find('.edit-quantity').focus();
        });

        // Clear edit suggestions when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.edit-item-search, .edit-suggestions').length) {
                $('.edit-suggestions').empty().hide();
            }
        });

        // Initialize all edit modals - calculate total when any modal is shown
        $(document).ready(function() {
            console.log('Setting up edit modal listeners');

            // Listen for all modals with ID starting with "editModal"
            $('[id^="editModal"]').on('shown.bs.modal', function() {
                const modalId = $(this).attr('id');
                const orderId = modalId.replace('editModal', '');
                console.log('Modal opened for order:', orderId);

                // Call the corresponding calculateEditTotal function with a delay
                // The delay ensures the modal is fully rendered and input values are accessible
                setTimeout(function() {
                    const funcName = 'calculateEditTotal' + orderId;
                    if (typeof window[funcName] === 'function') {
                        console.log('Calling', funcName);
                        window[funcName]();
                    } else {
                        console.error('Function not found:', funcName);
                    }
                }, 150); // 150ms delay to ensure DOM is ready
            });
        });

        // Handle delete confirmation more reliably
        $(document).on('submit', 'form[action*="/delete"]', function(e) {
            e.preventDefault(); // Stop form submission
            e.stopPropagation(); // Stop event bubbling

            const form = this;
            const orderId = form.action.split('/').pop();

            console.log('Delete form submit intercepted for order:', orderId);

            // Show confirmation
            const confirmed = confirm(
                'Are you sure you want to delete this order?\n\nThis action cannot be undone.');

            console.log('User confirmed:', confirmed);

            if (confirmed) {
                console.log('Submitting delete request...');
                // Actually submit the form
                form.submit();
            } else {
                console.log('Delete cancelled by user');
            }

            return false; // Prevent default submission
        });
    </script>
@endsection
