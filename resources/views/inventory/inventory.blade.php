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
