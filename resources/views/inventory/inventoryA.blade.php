<div>
<h1 class="text-center text-light m-3">Inventory Pakka Bill</h1>
  <div class="hstack gap-3">
    <div class="p-2">
 <!-- Modal Add inventory-->
<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#exampleModal">
  Add Inventory
</button>

<!-- Modal Add inventory-->
<div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="exampleModalLabel">Add Pakka Bill Inventory</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
         <!-- inventory form -->
      <form method="post" action="{{url('/inventoryA')}}" id="inventoryFormA">
        @csrf
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label" >Item</label>
    <div class="col-sm-10">
      <input type="name" class="form-control" name="item" id="itemA" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Hsn Number</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="hsn" id="hsnA" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Quantity</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="qty" id="qtyA" onchange="calculateTotal()" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Purchase Price</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="price" id="priceA" onchange="calculateTotal()" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Total Amount</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="totalprice" id="totalpriceA" readonly>
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

 <button type="button" class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#exampleModal1">
  Add Order
</button>
</div>

<!-- Modal Add Order-->
<div class="modal fade" id="exampleModal1" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="exampleModalLabel">Add Pakka Bill Order</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
         <!-- Order form -->
         <form method="post" action="{{route('storeA')}}">
          @csrf
      <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Customer Name</label>
    <div class="col-sm-10">
      <input type="name" class="form-control" name="custname" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Item</label>
      <!-- <input type="name" class="form-control" name="item" required> -->
    <select name="item" id="item" class="col-sm-10">
      <option value="">Select Item</option>
      @foreach($inventA as $inventoryA)
      <option value="{{$inventoryA->item}}" data-hsn="{{$inventoryA->hsn}}">{{$inventoryA->item}}</option>
      @endforeach
    </select>
    
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Hsn Number</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="hsn" id="hsn" readonly>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Quantity</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="qty" id="qty" onchange="calculateTotal()" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Sell Price</label>
    <div class="col-sm-10">
      <input type="number" class="form-control" name="price" id="price" onchange="calculateTotal()" required>
    </div>
  </div>
  <div class="row mb-3">
    <label for="inputPassword3" class="col-sm-2 col-form-label">Total Amount</label>
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
        @foreach ($inventA as $pak)
        <tr>
            <td>{{$pak->id}}</td>
            <td>{{$pak->item}}</td>
            <td>{{$pak->hsn}}</td>
            <td>{{$pak->qty}}</td>
            <td>{{$pak->price}}</td>
            <td>{{$pak->totalprice}}</td>
            <td>
            <a href="" data-bs-toggle="modal" data-bs-target="#exampleModal" onclick="populateEditAForm({{ $pak }})"><input class="btn btn-warning" value="Edit" type="button"></a>
              <a href="{{ route('inventoryA.delete', $pak->id) }}" onclick="return confirm('Are you sure?')"><button class="btn btn-danger">Delete</button></a>
            </td>
        </tr>
        @endforeach
    </table>
</div>
</div>

<script>
    $(document).ready(function(){
      $('#item').change(function(){
        var hsnA =$(this).find(':selected').data('hsn');
        $('#hsn').val(hsnA);
      });
    });

    function calculateTotal() {
          // Inventory Total Price
            var qty = document.getElementById('qtyA').value;
            var price = document.getElementById('priceA').value;
            var total = qty * price;
            document.getElementById('totalpriceA').value = total.toFixed(2); // Adjust to your desired decimal places
            
            // Order Total Price
            var qty = document.getElementById('qty').value;
            var price = document.getElementById('price').value;
            var total = qty * price;
            document.getElementById('totalprice').value = total.toFixed(2); // Adjust to your desired decimal places
        }

        function populateEditAForm(pak) {
        document.querySelector('#inventoryFormA').action = `/inventoryA-update/${pak.id}`;
        document.querySelector('#itemA').value = pak.item;
        document.querySelector('#hsnA').value = pak.hsn;
        document.querySelector('#qtyA').value = pak.qty;
        document.querySelector('#priceA').value = pak.price;
        document.querySelector('#totalpriceA').value = pak.totalprice;
    }
</script>

