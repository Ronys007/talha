<div>
    <!-- Inventory Mode Toggles -->
    <div class="mb-4 d-flex gap-2" style="border-bottom: 2px solid #eee; padding-bottom: 15px;">
        <button type="button" id="btn-simple-inventory" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="toggleInventoryMode('simple')">
            <i class="bi bi-list-ul me-1"></i> Simple Inventory
        </button>
        <button type="button" id="btn-barcode-inventory" class="btn btn-outline-secondary px-4" onclick="toggleInventoryMode('barcode')">
            <i class="bi bi-upc-scan me-1"></i> Barcode Based Inventory
        </button>
    </div>
    
    <script>
        function toggleInventoryMode(mode) {
            const btnSimple = document.getElementById('btn-simple-inventory');
            const btnBarcode = document.getElementById('btn-barcode-inventory');
            
            if (mode === 'simple') {
                // Active state for Simple
                btnSimple.className = 'btn btn-primary fw-bold px-4 shadow-sm';
                btnBarcode.className = 'btn btn-outline-secondary px-4';
            } else {
                // Active state for Barcode
                btnBarcode.className = 'btn btn-success fw-bold px-4 shadow-sm';
                btnSimple.className = 'btn btn-outline-secondary px-4';
            }
        }
    </script>

    <div class="hstack gap-3">
        <div class="p-2">
            <!-- Modal Add inventory-->
            <button type="button" id="inv1" class="btn btn-primary" data-bs-toggle="modal"
                data-bs-target="#exampleModal3">
                Add Inventory
            </button>

            <!-- Modal Add inventory-->
            <div class="modal fade" id="exampleModal3" tabindex="-1" aria-labelledby="exampleModalLabel"
                aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="exampleModalLabel">Add Inventory</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Inventory form -->
                            <form method="post" action="{{ url('/inventory') }}" id="inventoryFormB"
                                enctype="multipart/form-data">
                                @csrf
                                <div class="row mb-3">
                                    <label for="name" class="col-sm-2 col-form-label">Item</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" name="item" id="item_input"
                                            required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <label for="image" class="col-sm-2 col-form-label">Image</label>
                                    <div class="col-sm-10">
                                        <input type="file" class="form-control" name="image" id="img_input">
                                        <img id="existing-image" src="" alt="Existing Image"
                                            style="max-width: 50px; max-height: 50px; margin-left: 10px;">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <label for="name" class="col-sm-2 col-form-label">Item Code</label>
                                    <div class="col-sm-10">
                                        <input type="number" class="form-control" name="code" id="code_input"
                                            readonly>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <label for="qty" class="col-sm-2 col-form-label">Quantity</label>
                                    <div class="col-sm-10">
                                        <input type="number" class="form-control" name="qty" id="qty_input"
                                            required>
                                    </div>
                                </div>
                                <!-- <div class="row mb-3">
                                    <label for="price" class="col-sm-2 col-form-label">Purchase Price</label>
                                    <div class="col-sm-10">
                                        <input type="number" class="form-control" name="price" id="priceB" onchange="calculateTotalB()" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <label for="price" class="col-sm-2 col-form-label">Total Price</label>
                                    <div class="col-sm-10">
                                        <input type="number" class="form-control" name="totalprice" id="totalpriceB" required>
                                    </div>
                                </div> -->
                                <button type="submit" class="btn btn-primary">Add Inventory</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-2">
            <!-- Customer Order Modal -->
            <button type="button" id="inv2" class="btn btn-danger" data-bs-toggle="modal"
                data-bs-target="#exampleModal4">
                Add Bill
            </button>
        </div>

        <!-- Modal Add Order-->
        <div class="modal fade" id="exampleModal4" tabindex="-1" aria-labelledby="exampleModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h1 class="modal-title fs-5" id="exampleModalLabel">Add Order</h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Order form -->
                        <form method="post" action="{{ route('billing.store') }}">
                            @csrf

                            <div class="row mb-3">
                                <label for="inputPassword3" class="col-sm-2 col-form-label">Customer Name</label>
                                <div class="col-sm-10">
                                    <input type="name" class="form-control" name="customer" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <label for="gst" class="col-sm-2 col-form-label">GST Number</label>
                                <div class="col-sm-10">
                                    <input type="text" class="form-control" name="gst"
                                        placeholder="Enter GST Number (Optional)">
                                    <small class="text-muted">Format: 22AAAAA0000A1Z5</small>
                                </div>
                            </div>
                            <div id="itemsB">
                                <div class="form-row mb-3">
                                    <div class="row mb-3">
                                        <div class="col">
                                            <label for="item" class="col-sm-2 col-form-label"
                                                style="white-space:nowrap">Item Name/Code</label>

                                            <input type="text" class="form-control item-inputB item-nameB"
                                                id="item_displayB" placeholder="Search Item Name or Code"
                                                autocomplete="off">
                                            <input type="hidden" name="items[0][code]" class="item-codeB"
                                                id="code_inputB">
                                            <div class="suggestions list-group"
                                                style="position: absolute; z-index: 1000;"></div>
                                        </div>

                                        <div class="col">
                                            <label for="quantity" class="col-sm-2 col-form-label">Quantity</label>

                                            <input type="number" class="form-control" name="items[0][quantity]"
                                                id="qty_inputB" placeholder="Quantity" required>

                                        </div>
                                        <div class="col">
                                            <label for="price" class="col-sm-2 col-form-label">Price</label>

                                            <input type="number" class="form-control" name="items[0][selling_price]"
                                                id="priceBB" step="0.01" placeholder="Selling Price" required>

                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="button" id="add-item_inputB" class="btn btn-secondary mb-3">Add
                                Item</button>
                            <div class="row mb-3">
                                <label for="inputPassword3" class="col-sm-2 col-form-label">Total Amount</label>
                                <div class="col-sm-10">
                                    <input type="number" class="form-control" id="total_priceBB" name="total_price"
                                        readonly>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">Add Order</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="table-responsive mt-4">
        <table class="table table-dark table-hover text-center align-middle"
            style="background: rgba(0,0,0,0.2); border-radius: 10px; overflow: hidden;">
            <thead class="table-dark"
                style="background: transparent; border-bottom: 2px solid rgba(255,255,255,0.1);">
                <tr>
                    <th>Sr.No</th>
                    <th class="text-start">Item</th>
                    <th>Item Code</th>
                    <!-- <th>Hsn No</th> -->
                    <th>Quantity</th>
                    <!-- <th>Purchase Price</th>
            <th>Total Amount</th> -->
                    <th>Action</th>
                </tr>
            </thead>
            @php
                $counter = 1; // Initialize the counter
            @endphp
            @foreach ($inventory as $kach)
                <tbody>
                    <tr>
                        <td>{{ $counter }}</td>
                        <td class="text-start">
                            {{ $kach->item }}
                            @if ($kach->image)
                                <img src="{{ asset('storage/' . $kach->image) }}" alt="{{ $kach->item }}"
                                    style="max-width: 50px; max-height: 50px; margin-left: 10px;">
                            @endif
                        </td>
                        <td>{{ $kach->code }}</td>
                        <!-- <td>{{ $kach->hsn }}</td> -->
                        <td>{{ $kach->qty }}</td>
                        <!-- <td>{{ $kach->price }}</td>
            <td>{{ $kach->totalprice }}</td> -->
                        <td>
                            <a href="" data-bs-toggle="modal" data-bs-target="#exampleModal3"
                                onclick="populateEditBForm({{ $kach }})"><input class="btn btn-warning"
                                    value="Edit" type="button"></a>
                            <a href="{{ route('inventory.delete', $kach->id) }}"
                                onclick="return confirm('Are you sure?')"><button
                                    class="btn btn-danger">Delete</button></a>
                        </td>
                    </tr>
                </tbody>
                @php
                    $counter++; // Increment the counter
                @endphp
            @endforeach
        </table>
    </div>
</div>

<script>
    // Document code for above
    $(document).ready(function() {

        // auto compelete feature for inputs
        // Delegate keyup event to dynamically handle multiple item inputs
        $(document).on('keyup', '.item-inputB', function() {
            let input = $(this);
            let query = input.val(); // Get the value of the current input field
            let suggestionsDiv = input.siblings('.suggestions'); // Find the associated suggestions div

            if (query.length > 0) {
                // Send AJAX request to the controller
                $.ajax({
                    url: '/billing/search', // Ensure this matches your route
                    type: 'GET',
                    data: {
                        query: query
                    },
                    success: function(data) {
                        // Clear previous suggestions
                        suggestionsDiv.empty();

                        if (data.length > 0) {
                            // Append each item as a suggestion
                            data.forEach(function(item) {
                                suggestionsDiv.append(
                                    `<a href="#" class="list-group-item list-group-item-action suggestion-item" data-code="${item.code}" data-name="${item.item}">
                                    ${item.item} (${item.code})
                                </a>`
                                );
                            });
                        } else {
                            suggestionsDiv.append(
                                '<p class="list-group-item">No items found</p>');
                        }
                    },
                    error: function() {
                        console.error('Error fetching suggestions');
                    },
                });
            } else {
                // Clear suggestions if input is empty
                suggestionsDiv.empty();
            }
        });

        // Handle click events on suggestions
        $(document).on('click', '.suggestion-item', function(e) {
            e.preventDefault();
            let suggestion = $(this);
            let formRow = suggestion.closest('.form-row');

            // Find the visible name input and hidden code input
            let nameInput = formRow.find('.item-nameB');
            let codeInput = formRow.find('.item-codeB');

            // Set the item NAME in visible field (for user to see)
            nameInput.val(suggestion.data('name'));

            // Set the item CODE in hidden field (for form submission)
            codeInput.val(suggestion.data('code'));

            // Clear the suggestions list
            suggestion.closest('.suggestions').empty();
        });

        // Clear suggestions when clicking outside the input or suggestions
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.item-inputB, .suggestions').length) {
                $('.suggestions').empty();
            }
        });
        // Automatic generate number for item code
        let usedCodes = []; // Array to store used codes

        $('#item_input').on('input', function() {
            var item = $('#item_input').val();

            if (item !== '') {
                let randomCode;
                do {
                    randomCode = Math.floor(1000 + Math.random() * 9000); // Generates 4-digit code
                } while (usedCodes.includes(randomCode)); // Check if code already exists

                if (usedCodes.length === 0 || !usedCodes.includes(randomCode)) {
                    usedCodes.push(randomCode); // Add new code to the array
                    var item_code = String(randomCode).padStart(4, '0'); // Ensures 4-digit code
                    $('#code_input').val(item_code);
                } else {
                    alert('Error: Duplicate code generated. Please try again.');
                }
            } else {
                $('#code_input').val('');
            }
        });


        // Function to add a new item row
        $('#add-item_inputB').click(function() {
            var itemsDiv = $('#itemsB');
            var itemCount = itemsDiv.children().length;

            var itemRow = `
            <div class="form-row mb-3">
            <div class="row mb-3">
                <div class="col">
                    <label for="code_inputB" class="form-label" style="white-space:nowrap;">Item Name/Code</label>
                     <input type="text" class="form-control item-inputB" name="items[][code]" placeholder="Item Name/Code" autocomplete="off">
                        <div class="suggestions list-group" style="position: absolute; z-index: 1000;"></div>

                    
                </div>
                <div class="col">
                    <label for="quantityB" class="form-label">Quantity</label>
                    <input type="number" class="form-control" name="items[${itemCount}][quantity]" placeholder="Quantity" required>   
                </div>
                <div class="col">
                    <label for="priceB" class="form-label">Price</label>
                    <input type="number" class="form-control" name="items[${itemCount}][selling_price]" placeholder="Selling Price" step="0.01" required>
                </div>
                </div>
                <div class="col">
                    <button type="button" class="btn btn-danger remove-item_inputB">Remove</button>
                
                </div>
            </div>
        `;

            itemsDiv.append(itemRow);
            updateTotalPrice();

            itemsDiv.find('.remove-item_inputB:last').click(function() {
                $(this).closest('.form-row').remove();
                updateTotalPrice();
            });

            itemsDiv.find('input[type="number"]').on('input', function() {
                updateTotalPrice();
            });
        });

        // Function to update total price
        function updateTotalPrice() {
            var total = 0;
            $('#itemsB .form-row').each(function() {
                var price = $(this).find('input[name*="[selling_price]"]').val();
                var quantity = $(this).find('input[name*="[quantity]"]').val();
                if (price && quantity) {
                    total += parseFloat(price) * parseInt(quantity);
                }
            });
            $('#total_priceBB').val(total.toFixed(2));
        }

        // Attach input event to dynamically added inputs
        $(document).on('input', 'input[type="number"]', function() {
            updateTotalPrice();
        });

        // Initial update of total price on document ready
        updateTotalPrice();
    });


    // Edit PopulateEditBform
    function populateEditBForm(kach) {
        document.querySelector('#inventoryFormB').action = `/inventory/${kach.id}`;
        document.querySelector('#qty_input').value = kach.qty;
        document.querySelector('#item_input').value = kach.item;
        document.querySelector('#code_input').value = kach.code;

        // Display the existing image
        var existingImage = document.getElementById('existing-image');
        existingImage.src = "{{ asset('storage') }}" + '/' + kach.image;

        // if item gets change the code will gets change
        var itemA = document.getElementById('item_input').value;
        var codeA = document.getElementById('code_input').value;
        document.getElementById('item_input').addEventListener('input', function() {
            var item_input = document.getElementById('item_input').value;
            if (itemA === item_input) {
                document.getElementById('code_input').value = codeA;
            } else {
                randomCode = Math.floor(1000 + Math.random() * 9000);
                var item_code = String(randomCode).padStart(4, '0');
                document.getElementById('code_input').value = item_code;
            }
        });
    }
</script>
