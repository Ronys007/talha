<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\InventoryA;

class InventoryAController extends Controller
{
    public function store(Request $request){
        $request->validate([
            'item'=>'required|string|max:255',
            'qty'=>'required|numeric',
            'hsn'=>'required|numeric',
            'price'=>'required|numeric',
            'totalprice'=> 'required|numeric',

        ]);

        $inventoryA = new InventoryA();
        $inventoryA->item= $request['item'];
        $inventoryA->hsn= $request['hsn'];
        $inventoryA->qty= $request['qty'];
        $inventoryA->price= $request['price'];
        $inventoryA->totalprice= $request['totalprice'];
        $inventoryA->save();

        return redirect()->back();
    }
  

    // Select Query to show data
    public function view() {
        $pakka = InventoryA::all(); // Fetch all inventory items
        // $data= compact('pakka');
        // return redirect('inventoryA')->with($data); // Pass the data to the view
        return $pakka;
    }

    public function delete($id){
        InventoryA::find($id)->delete();
        return redirect()->back();
    }

    // public function edit($id){
    //     $pakka = InventoryA::find($id);
    //     return view('home', compact('pakka'));
    // }

    public function update(Request $request, $id){
        $request->validate([
            'item'=>'required|string|max:255',
            'qty'=>'required|numeric',
            'hsn'=>'required|numeric',
            'price'=>'required|numeric',
            'totalprice'=> 'required|numeric',
        ]);

        $inventoryA = InventoryA::find($id);
        if (!$inventoryA) {
            return redirect()->back();
        }
        $inventoryA->item = $request->item;
        $inventoryA->hsn = $request->hsn;
        $inventoryA->qty = $request->qty;
        $inventoryA->price = $request->price;
        $inventoryA->totalprice = $request->totalprice;
        $inventoryA->save();
        return redirect()->back();
    }
    
}
