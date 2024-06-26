@extends('layouts.main')

@section('main-section')
    <div class="row justify-content-center my-4">
        <div class="card col-3 m-2 p-3 text-center" onclick="pakkabill()" id="back" style="cursor:pointer;">Pakka Bill Inventory</div>
        <div class="card col-3 m-2 p-3 text-center" onclick="kachhabill()" id="bac" style="cursor:pointer; background-color:aqua;">Kachha Bill Inventory</div>
    </div>

    <div id="bill" style="display:none;">@include('inventory.inventoryA')</div>
    <div id="bill2">@include('inventory.inventoryB')</div>

    <script>
        function pakkabill() {
                    document.getElementById('bill').style.display = "block";
                    document.getElementById('bill2').style.display = "none";
                    document.getElementById('back').style.backgroundColor="aqua";   
                    document.getElementById('bac').style.backgroundColor="white";        
        }

        function kachhabill() {
            document.getElementById('bill').style.display = "none";
            document.getElementById('bill2').style.display = "block";
            document.getElementById('bac').style.backgroundColor="aqua";
            document.getElementById('back').style.backgroundColor="white";   
        }
    </script>
@endsection
