<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\InventoryB;

class InventoryBController extends Controller
{
    public function store(Request $request){
        $request->validate([
            'item'=>'required|string|max:255',
            'qty'=>'required|numeric',
            'hsn'=>'required|numeric',
            'price'=>'required|numeric',
            'totalprice'=>'required|numeric',

        ]);

        $inventoryB = new InventoryB();
        $inventoryB->item= $request['item'];
        $inventoryB->hsn= $request['hsn'];
        $inventoryB->qty= $request['qty'];
        $inventoryB->price= $request['price'];
        $inventoryB->totalprice= $request['totalprice'];
        $inventoryB->save();

        return redirect()->back();
    } 

    // Fetch data from server

    public function view(){
        $kachha = InventoryB::all();
        // $data= compact('kachha');
        // return redirect('inventoryB')->with($data);
        return $kachha;
    }

    // Delete Query
    public function delete($id){
        InventoryB::find($id)->delete();
        return redirect()->back();
    }
    
    // public function edit($id){
    //     $kacha= InventoryB::find($id);
    //     return view('home', compact('kacha'));
    // }

    // Update Query
    public function update(Request $request, $id){
        $request->validate([
            'item'=>'required|string|max:255',
            'qty'=>'required|numeric',
            'hsn'=>'required|numeric',
            'price'=>'required|numeric',
            'totalprice'=> 'required|numeric',
        ]);

        $inventoryB= InventoryB::find($id);
        if(!$inventoryB){
            return redirect()->back();
        }
        $inventoryB->item = $request->item;
        $inventoryB->hsn = $request->hsn;
        $inventoryB->qty = $request->qty;
        $inventoryB->price = $request->price;
        $inventoryB->totalprice = $request->totalprice;
        $inventoryB->save();
        return redirect()->back();
    }

}
