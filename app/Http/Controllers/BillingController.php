<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\OrderA;
use App\Models\OrderB;
use App\Models\InventoryA;
use App\Models\InventoryB;

class BillingController extends Controller
{   
    public function index(){
        $orderA= OrderA::all();
        $orderB= OrderB::all();
        return view('bills.billing', compact('orderA', 'orderB'));
    }

    // inventoryA(pakka bill)
    public function storeA(Request $request){
        $request-> validate([
            'custname'=> 'required|string|max:255',
            'item'=>'required|string|max:255',
            'hsn'=>'required|numeric',
            'qty'=> 'required|numeric',
            'price'=> 'required|numeric',
            'totalprice'=> 'required|numeric',
        ]);

        $billing= new OrderA();
        $billing->custname=$request['custname'];
        $billing->item= $request['item'];
        $billing->hsn= $request['hsn'];
        $billing->qty= $request['qty'];
        $billing->price= $request['price'];
        $billing->totalprice= $request['totalprice'];
        $billing->save();

        // Update inventory quantity
        $inventoryA = InventoryA::where('item', $request['item'])->first();
        if ($inventoryA) {
            $inventoryA->qty -= $request['qty'];
            $inventoryA->save();
        }

        return redirect()->back();
        // print_r($request->all());
}

// inventoryB(kachha bill)
    public function storeB(Request $request){
        $request-> validate([
            'custname'=> 'required|string|max:255',
            'item'=>'required|string|max:255',
            'hsn'=>'required|numeric',
            'qty'=> 'required|numeric',
            'price'=> 'required|numeric',
            'totalprice'=> 'required|numeric',
        ]);

        $billing= new OrderB();
        $billing->custname=$request['custname'];
        $billing->item= $request['item'];
        $billing->hsn= $request['hsn'];
        $billing->qty= $request['qty'];
        $billing->price= $request['price'];
        $billing->totalprice= $request['totalprice'];
        $billing->save();

          // Update inventory quantity
          $inventoryB = InventoryB::where('item', $request['item'])->first();
          if ($inventoryB) {
              $inventoryB->qty -= $request['qty'];
              $inventoryB->save();
          }
          return redirect()->back();
        // print_r($request->all());
    }

    
// Delete Pakka Bill 
public function deleteA($id) {
    // Fetch the OrderA entry
    $orderA = OrderA::find($id);
    $orderA->delete();
    return redirect()->back();
}

    // Delete kachha Bill 
    public function deleteB($id){
        OrderB::find($id)->delete();
        return redirect()->back();
    }

    // edit and upadte for pakka bill

    // public function editA($id){
    //     $orderA = OrderA::find($id);
    //     return view('bills.billing',compact('orderA'));
    // }
    
    public function updateA(Request $request, $id){
        $request-> validate([
            'custname'=> 'required|string|max:255',
            'item'=> 'required|string|max:255',
            'hsn'=> 'required|string|max:255',
            'qty'=> 'required|string|max:255',
            'price'=> 'required|string|max:255',
            'totalprice'=> 'required|string|max:255'    
        ]);
        $billing= OrderA::find($id);
        if (!$billing) {
            return redirect()->back();
        }
          
        // Update inventory before updating the order
    $originalQty = $billing->qty;
    $newQty = $request['qty'];
    $item = $request['item'];
        $inventoryA = InventoryA::where('item', $request['item'])->first();
        if ($inventoryA) {
            $inventoryA->qty += $originalQty - $newQty;
            $inventoryA->save();
        }
        $billing-> custname= $request['custname'];
        $billing-> item= $request['item'];
        $billing-> hsn= $request['hsn'];
        $billing-> qty= $request['qty'];
        $billing-> price= $request['price'];
        $billing-> totalprice= $request['totalprice'];
        $billing->save();
        return redirect()->back();
    }

     // edit and upadte for kachha bill
    //  public function editB($id){
    //     $orderB = OrderB::find($id);
    //     return view('billingB-editB',compact('orderB'));
    // }
    
    public function updateB(Request $request, $id){
        $request-> validate([
            'custname'=> 'required|string|max:255',
            'item'=> 'required|string|max:255',
            'hsn'=> 'required|string|max:255',
            'qty'=> 'required|string|max:255',
            'price'=> 'required|string|max:255',
            'totalprice'=> 'required|string|max:255'    
        ]);

        $billing= OrderB::find($id);
        if (!$billing) {
            return redirect()->back();
        }
            // Update inventory before updating the order
        $originalQty= $billing->qty;
        $newQty= $request['qty'];
        $item= $request['item'];
        $inventoryB= InventoryB::where('item', $request['item'])->first();
        if($inventoryB){
            $inventoryB->qty += $originalQty - $newQty;
            $inventoryB->save();
        }
        
            $billing-> custname= $request['custname'];
            $billing-> item= $request['item'];
            $billing-> hsn= $request['hsn'];
            $billing-> qty= $request['qty'];
            $billing-> price= $request['price'];
            $billing-> totalprice= $request['totalprice'];
            $billing->save();
        return redirect()->back();
    }
    
}
