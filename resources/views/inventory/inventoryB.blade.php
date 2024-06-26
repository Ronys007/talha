<div> 
    <h1 class="text-center text-light m-3">Inventory Kachha Bill</h1>
    <div class="hstack gap-3">
        <div class="p-2">
            <!-- Modal Add inventory-->
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#exampleModal3">
                Add Inventory
            </button>

            <!-- Modal Add inventory-->
            <div class="modal fade" id="exampleModal3" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="exampleModalLabel">Add Kachha Bill Inventory</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Inventory form -->
                            <form method="post" action="{{url('/inventoryB')}}" id="inventoryFormB">
                                @csrf
                                <div class="row mb-3">
                                    <label for="name" class="col-sm-2 col-form-label">Item</label>
                                    <div class="col-sm-10">
                                        <input type="text" class="form-control" name="item" id="itemB" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <label for="hsn" class="col-sm-2 col-form-label">Hsn Number</label>
                                    <div class="col-sm-10">
                                        <input type="number" class="form-control" name="hsn" id="hsnB" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <label for="qty" class="col-sm-2 col-form-label">Quantity</label>
                                    <div class="col-sm-10">
                                        <input type="number" class="form-control" name="qty" id="qtyB" onchange="calculateTotalB()" required>
                                    </div>
                                </div>
                                <div class="row mb-3">
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
                                </div>
                                <button type="submit" class="btn btn-primary">Add Inventory</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-2">
            <!-- Customer Order Modal -->
            <button type="button" class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#exampleModal4">
                Add Order
            </button>
        </div>

        <!-- Modal Add Order-->
        <div class="modal fade" id="exampleModal4" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h1 class="modal-title fs-5" id="exampleModalLabel">Add Kachha Bill Order</h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Order form -->
                        <form method="post" action="{{route('storeB')}}">
                            @csrf
                        <div class="row mb-3">
                               <label for="inputPassword3" class="col-sm-2 col-form-label">Customer Name</label>
                               <div class="col-sm-10">
                                 <input type="name" class="form-control" name="custname" required>
                               </div>
                             </div>
                            <div class="row mb-3">
                                <label for="name" class="col-sm-2 col-form-label">Item</label>
                                  <!-- <input type="name" class="form-control" name="item" required> -->
                                    <select name="item" id="itemBB" class="col-sm-10">
                                      <option value="">Select Item</option>
                                      @foreach($inventB as $inventoryB)
                                      <option value="{{$inventoryB->item}}" data-hsn="{{$inventoryB->hsn}}">{{$inventoryB->item}}</option>
                                      @endforeach
                                    </select>
                            </div>
                            <div class="row mb-3">
                                <label for="hsn" class="col-sm-2 col-form-label">Hsn Number</label>
                                <div class="col-sm-10">
                                    <input type="number" class="form-control" name="hsn" id="hsnBB" readonly>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <label for="qty" class="col-sm-2 col-form-label">Quantity</label>
                                <div class="col-sm-10">
                                    <input type="number" class="form-control" name="qty" id="qtyBB" onchange="calculateTotalB()" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <label for="price" class="col-sm-2 col-form-label">Sell Price</label>
                                <div class="col-sm-10">
                                    <input type="number" class="form-control" name="price" id="priceBB" onchange="calculateTotalB()" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <label for="price" class="col-sm-2 col-form-label">Total Amount</label>
                                <div class="col-sm-10">
                                    <input type="number" class="form-control" name="totalprice" id="totalpriceBB" readonly>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">Add Order</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="table-responsive">
    <table class="text-white table table-bordered table-primary text-center">
        <tr>
            <th>Sr.No</th>
            <th>Item</th>
            <th>Hsn No</th>
            <th>Quantity</th>
            <th>Purchase Price</th>
            <th>Total Amount</th>
            <th>Action</th>
        </tr>
        @foreach ($inventB as $kach)
        <tr>
            <td>{{$kach->id}}</td>
            <td>{{$kach->item}}</td>
            <td>{{$kach->hsn}}</td>
            <td>{{$kach->qty}}</td>
            <td>{{$kach->price}}</td>
            <td>{{$kach->totalprice}}</td>
            <td>
            <a href="" data-bs-toggle="modal" data-bs-target="#exampleModal3" onclick="populateEditBForm({{ $kach }})"><input class="btn btn-warning" value="Edit" type="button"></a>
                <a href="{{ route('inventoryB.delete', $kach->id) }}" onclick="return confirm('Are you sure?')"><button class="btn btn-danger">Delete</button></a>
        </td>
        </tr>
        @endforeach
    </table>
</div>
</div>

<script>
    $(document).ready(function(){
      $('#itemBB').change(function(){
        var hsnB =$(this).find(':selected').data('hsn');
        $('#hsnBB').val(hsnB);
      });
    });
    function calculateTotalB() {
          // Inventory Total Price
            var qty = document.getElementById('qtyB').value;
            var price = document.getElementById('priceB').value;
            var total = qty * price;
            document.getElementById('totalpriceB').value = total.toFixed(2); // Adjust to your desired decimal places
            
            // Order Total Price
            var qty = document.getElementById('qtyBB').value;
            var price = document.getElementById('priceBB').value;
            var total = qty * price;
            document.getElementById('totalpriceBB').value = total.toFixed(2); // Adjust to your desired decimal places
        }

        function populateEditBForm(kach) {
        document.querySelector('#inventoryFormB').action = `/inventoryB-update/${kach.id}`;
        document.querySelector('#itemB').value = kach.item;
        document.querySelector('#hsnB').value = kach.hsn;
        document.querySelector('#qtyB').value = kach.qty;
        document.querySelector('#priceB').value = kach.price;
        document.querySelector('#totalpriceB').value = kach.totalprice;
    }
</script>

