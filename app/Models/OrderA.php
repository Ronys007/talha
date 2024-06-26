<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderA extends Model
{
    use HasFactory;
    protected $table= "order_a_s";
    protected $id= "id";
    protected $fillable = ['custname', 'item', 'hsn', 'qty', 'price'];

}
