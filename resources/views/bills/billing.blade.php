@extends('layouts.main')

@section('main-section')
    <div class="row justify-content-center my-4">
    <div class="card col-3 m-2 p-3 text-center" onclick="pakkabill()" id="back" style="cursor:pointer;">Pakka Order Bill</div>
    <div class="card col-3 m-2 p-3 text-center" onclick="kachhabill()" id="bac" style="cursor:pointer;background-color:aqua;">kachha Order Bill</div>
    </div>

    <div style="display:none;" id="pakka">@include('bills.billingA')</div>
    <div style="display:block;" id="kachha">@include('bills.billingB')</div>

<script>
    
    function pakkabill(){
        document.getElementById('pakka').style.display="block";
        document.getElementById('kachha').style.display="none";
        document.getElementById('back').style.backgroundColor="aqua";
        document.getElementById('bac').style.backgroundColor="white";
    }

    function kachhabill(){
        document.getElementById('pakka').style.display="none";
        document.getElementById('kachha').style.display="block";
        document.getElementById('back').style.backgroundColor="white";
        document.getElementById('bac').style.backgroundColor="aqua";
    }
</script>

@endsection