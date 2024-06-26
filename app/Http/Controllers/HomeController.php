<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\InventoryAController;
use App\Http\Controllers\InventoryBController;
use App\Models\InventoryA;


class HomeController extends Controller
{
    public function __construct(private InventoryAController $inventoryA, private InventoryBController $inventoryB)
    {} 

    public function index(){
        $inventA= $this->inventoryA->view();
        $inventB= $this->inventoryB->view();
        return view('home', compact('inventA', 'inventB'));
    }

    
     
}
