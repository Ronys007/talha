<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Inventory;
use Inertia\Inertia;

class InventoryController extends Controller
{
    // Render the React Inventory page
    public function index()
    {
        return Inertia::render('Inventory/Index');
    }

    private function getOwnerId(): int
    {
        $owner = (int) (auth()->user()?->getEffectiveOwnerId() ?? 0);
        if ($owner > 0) {
            return $owner;
        }
        return (int) (auth()->id() ?? 0);
    }

    private function getStoreUserIds(): array
    {
        $ids = auth()->user()?->getEffectiveStoreUserIds() ?? [];
        if (empty($ids) || $ids === [-1]) {
            return [$this->getOwnerId()];
        }
        return $ids;
    }

    // Paginated JSON for infinite scroll (React Query)
    public function data(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();
        $perPage = 50;
        $cursor  = $request->input('cursor');
        $search  = $request->input('search', '');
        $mode = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        $query = Inventory::whereIn('user_id', $ownerIds)
            ->where('mode', $mode)
            ->when($search, fn($q) => $q->where(function ($q2) use ($search) {
                $q2->where('item', 'LIKE', "%{$search}%")
                   ->orWhere('code', 'LIKE', "%{$search}%");
            }))
            ->orderBy('id', 'desc');

        if ($cursor) {
            $query->where('id', '<', $cursor);
        }

        $items   = $query->limit($perPage + 1)->get();
        $hasMore = $items->count() > $perPage;
        if ($hasMore) {
            $items = $items->take($perPage);
        }

        $nextCursor = $hasMore ? $items->last()?->id : null;

        return response()->json([
            'data'       => $items->map(fn($item) => [
                'id'            => $item->id,
                'mode'          => $item->mode,
                'item'          => $item->item,
                'code'          => $item->code,
                'qty'           => $item->qty,
                'unit'          => $item->unit ?: 'PCS',
                'selling_price' => $item->selling_price ? (float)$item->selling_price : 0,
                'inventory_value' => round(((float)($item->selling_price ?? 0)) * ((float)($item->qty ?? 0)), 2),
                'image'         => $item->image ? asset('storage/' . $item->image) : null,
            ]),
            'nextCursor' => $nextCursor,
            'hasMore'    => $hasMore,
        ]);
    }

    private function generateUniqueCode(string $name, int $userId, string $mode, ?int $excludeId = null): string
    {
        $str = strtolower(trim($name));
        if (empty($str)) {
            return '';
        }

        // Deterministic base hash from item name
        $hash = 5381;
        for ($i = 0; $i < strlen($str); $i++) {
            $hash = (($hash << 5) + $hash + ord($str[$i])) & 0x7fffffff;
        }
        $codeInt = 10000 + ($hash % 90000);
        $candidate = (string)$codeInt;

        // Check if code is already used by another item in database
        $attempts = 0;
        while ($attempts < 100) {
            $codeInUse = Inventory::where('user_id', $userId)
                ->where('mode', $mode)
                ->where('code', $candidate)
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->exists();

            if (!$codeInUse) {
                return $candidate;
            }

            // In case of collision, shift by 1 and wrap within 10000-99999
            $codeInt = ($codeInt >= 99999) ? 10000 : ($codeInt + 1);
            $candidate = (string)$codeInt;
            $attempts++;
        }

        return (string)rand(10000, 99999);
    }

    public function checkName(Request $request)
    {
        $name      = $request->input('name', '');
        $excludeId = $request->input('exclude_id');
        $mode      = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        $userId   = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();
        $exists = Inventory::whereIn('user_id', $ownerIds)
            ->where('mode', $mode)
            ->whereRaw('LOWER(item) = LOWER(?)', [$name])
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->exists();

        $uniqueCode = '';
        if (strlen(trim($name)) >= 1) {
            $uniqueCode = $this->generateUniqueCode($name, $userId, $mode, $excludeId);
        }

        return response()->json([
            'exists'      => $exists,
            'unique_code' => $uniqueCode,
        ]);
    }

    public function store(Request $request)
    {
        $userId = $this->getOwnerId();
        if ($userId <= 0) {
            return back()->with('error', 'Please switch to an admin store from the topbar before creating inventory items.');
        }
        $mode   = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        $request->validate([
            'item'          => [
                'required', 'string', 'max:255',
                \Illuminate\Validation\Rule::unique('inventory_b_s', 'item')
                    ->where('user_id', $userId)
                    ->where('mode', $mode),
            ],
            'code'          => 'required|string|max:255',
            'qty'           => 'required|numeric',
            'unit'          => 'nullable|string|max:50',
            'selling_price' => 'nullable|numeric|min:0',
            'image'         => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10048',
        ], [
            'item.unique' => 'An item with this name already exists in your inventory.',
        ]);

        $inventory                = new Inventory();
        $inventory->user_id       = $userId;
        $inventory->mode          = $mode;
        $inventory->item          = $request->item;
        $inventory->code          = $request->code;
        $inventory->qty           = $request->qty;
        $inventory->unit          = $request->filled('unit') ? strtoupper(trim($request->unit)) : 'PCS';
        $inventory->selling_price = $request->selling_price ?? 0;

        if ($request->hasFile('image')) {
            $inventory->image = $request->file('image')->store('images', 'public');
        }

        $inventory->save();

        return back()->with('success', 'Inventory added successfully.');
    }

    public function update(Request $request, $id)
    {
        $userId   = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $invQuery = Inventory::where('id', $id);
        if (!$isSuperAdmin) {
            $invQuery->whereIn('user_id', $ownerIds);
        }
        $inventory = $invQuery->firstOrFail();

        $mode = $request->input('mode', $inventory->mode ?? 'standard');

        $request->validate([
            'item'          => [
                'required', 'string', 'max:255',
                \Illuminate\Validation\Rule::unique('inventory_b_s', 'item')
                    ->where('user_id', $userId)
                    ->where('mode', $mode)
                    ->ignore($id),
            ],
            'code'          => 'required|string|max:255',
            'qty'           => 'required|numeric',
            'unit'          => 'nullable|string|max:50',
            'selling_price' => 'nullable|numeric|min:0',
            'image'         => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10048',
        ], [
            'item.unique' => 'An item with this name already exists in your inventory.',
        ]);

        $inventory->item          = $request->item;
        $inventory->code          = $request->code;
        $inventory->qty           = $request->qty;
        if ($request->has('unit')) {
            $inventory->unit      = $request->filled('unit') ? strtoupper(trim($request->unit)) : ($inventory->unit ?: 'PCS');
        }
        $inventory->selling_price = $request->selling_price ?? 0;

        if ($request->hasFile('image')) {
            if ($inventory->image && Storage::disk('public')->exists($inventory->image)) {
                Storage::disk('public')->delete($inventory->image);
            }
            $inventory->image = $request->file('image')->store('images', 'public');
        }

        $inventory->save();

        return back()->with('success', 'Inventory updated successfully.');
    }

    public function destroy($id)
    {
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $invQuery = Inventory::where('id', $id);
        if (!$isSuperAdmin) {
            $invQuery->whereIn('user_id', $ownerIds);
        }
        $inventory = $invQuery->firstOrFail();

        if ($inventory->image && Storage::disk('public')->exists($inventory->image)) {
            Storage::disk('public')->delete($inventory->image);
        }

        $inventory->delete();

        return back()->with('success', 'Inventory deleted successfully.');
    }

    // Legacy GET delete route
    public function legacyDelete($id)
    {
        return $this->destroy($id);
    }

}
