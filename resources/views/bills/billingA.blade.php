<h1 class="text-center text-light m-3">Pakka Order Bill</h1>
<table class="text-white table table-bordered table-primary text-center">
    <tr>
        <th>Sr.No</th>
        <th>Customer Name</th>
        <th>Item</th>
        <th>Hsn No</th>
        <th>Order Quantity</th>
        <th>Order Price</th>
        <th>Total Amount</th>
        <th>Date</th>
        <th>Action</th>
    </tr>
    @foreach($orderA as $pakka)
    <tr>
        <td>{{$pakka->id}}</td>
        <td>{{$pakka->custname}}</td>
        <td>{{$pakka->item}}</td>
        <td>{{$pakka->hsn}}</td>
        <td>{{$pakka->qty}}</td>
        <td>{{$pakka->price}}</td>
        <td>{{$pakka->totalprice}}</td>
        <td>{{$pakka->created_at->format('d-m-y')}}</td>
        <td>
            <a href="" data-bs-toggle="modal" data-bs-target="#exampleModal1" onclick="populateEditAForm({{ $pakka }})">
                <input class="btn btn-warning" value="Edit" type="button">
            </a>
            <a href="{{route('deleteStoreA',['id'=>$pakka->id])}}" onclick="return confirm('Are you sure?')">
                <input class="btn btn-danger" value="Delete" type="button">
            </a>
            <a>
                <button class="btn btn-primary" onclick= "printOrder({{$pakka}})">Print</button>
            </a>
        </td>
    </tr>
    @endforeach
</table>

<!-- Modal Add Order -->
<div class="modal fade" id="exampleModal1" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h1 class="modal-title fs-5" id="exampleModalLabel">Add Pakka Bill Order</h1>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <!-- Order form -->
                <form method="post" action="" id="editorder">
                    @csrf
                    <div class="row mb-3">
                        <label for="customer" class="col-sm-2 col-form-label">Customer Name</label>
                        <div class="col-sm-10">
                            <input type="name" class="form-control" name="custname" id="customer" required>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <label for="item" class="col-sm-2 col-form-label">Item</label>
                        <div class="col-sm-10">
                            <input type="name" class="form-control" name="item" id="item" required>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <label for="hsn" class="col-sm-2 col-form-label">Hsn Number</label>
                        <div class="col-sm-10">
                            <input type="number" class="form-control" name="hsn" id="hsn" readonly>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <label for="qty" class="col-sm-2 col-form-label">Quantity</label>
                        <div class="col-sm-10">
                            <input type="number" class="form-control" name="qty" id="qty" onchange="calculateTotal()" required>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <label for="price" class="col-sm-2 col-form-label">Sell Price</label>
                        <div class="col-sm-10">
                            <input type="number" class="form-control" name="price" id="price" onchange="calculateTotal()" required>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <label for="totalprice" class="col-sm-2 col-form-label">Total Amount</label>
                        <div class="col-sm-10">
                            <input type="number" class="form-control" name="totalprice" id="totalprice" readonly>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Order</button>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
    function calculateTotal() {
        // Order Total Price
        var qty = document.getElementById('qty').value;
        var price = document.getElementById('price').value;
        var total = qty * price;
        document.getElementById('totalprice').value = total.toFixed(2); // Adjust to your desired decimal places
    }

    function populateEditAForm(pakka) {
        document.querySelector('#editorder').action = `/billingA-update/${pakka.id}`;
        document.querySelector('#customer').value = pakka.custname;
        document.querySelector('#item').value = pakka.item;
        document.querySelector('#hsn').value = pakka.hsn;
        document.querySelector('#qty').value = pakka.qty;
        document.querySelector('#price').value = pakka.price;
        document.querySelector('#totalprice').value = pakka.totalprice;
    }

 function printOrder(pakka) {
    var printWindow = window.open('', '', 'height=400,width=800');
    printWindow.document.write('<html><head><title>Print Order</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; }');
    printWindow.document.write('th, td { padding: 10px; text-align: left; }');
    printWindow.document.write('.date { position: absolute; top: 20px; right: 20px; font-size: 12px; }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    
    // Date at the upper right corner
    printWindow.document.write('<div class="date">' + new Date(pakka.created_at).toLocaleDateString() + '</div>');
    
    printWindow.document.write('<h1 style="text-align: center;">Order Details</h1>');
    printWindow.document.write('<table>');
    printWindow.document.write('<tr><th style="width: 80%;">Field</th><th>Value</th></tr>');
    printWindow.document.write('<tr><td>Customer Name</td><td>' + pakka.custname + '</td></tr>');
    printWindow.document.write('<tr><td>Item</td><td>' + pakka.item + '</td></tr>');
    printWindow.document.write('<tr><td>Hsn Number</td><td>' + pakka.hsn + '</td></tr>');
    printWindow.document.write('<tr><td>Quantity</td><td>' + pakka.qty + '</td></tr>');
    printWindow.document.write('<tr><td>Price</td><td>' + pakka.price + '</td></tr>');
    printWindow.document.write('<tr><td>Total Price</td><td>' + pakka.totalprice + '</td></tr>');
    printWindow.document.write('</table>');
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}


    
</script>
