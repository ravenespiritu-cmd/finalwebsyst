<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    /**
     * Get or create user's cart.
     */
    protected function getCart()
    {
        $user = auth()->user();

        return Cart::firstOrCreate(
            ['user_id' => $user->id],
            ['user_id' => $user->id]
        );
    }

    /**
     * Get cart contents.
     */
    public function index()
    {
        $cart = $this->getCart();
        $cart->load('items.product');

        return $this->successResponse([
            'cart' => $cart,
            'items' => $cart->items,
            'items_count' => $cart->items_count,
        ]);
    }

    /**
     * Add item to cart.
     */
    public function addItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'options' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $product = Product::find($request->product_id);

        if (!$product->is_active) {
            return $this->errorResponse('Product is not available', 400);
        }

        if ($product->stock_quantity < $request->quantity) {
            return $this->errorResponse('Insufficient stock', 400);
        }

        $cart = $this->getCart();

        // Check if item already exists in cart
        $cartItem = $cart->items()->where('product_id', $product->id)->first();

        if ($cartItem) {
            $newQuantity = $cartItem->quantity + $request->quantity;
            
            if ($product->stock_quantity < $newQuantity) {
                return $this->errorResponse('Insufficient stock for requested quantity', 400);
            }

            $cartItem->update([
                'quantity' => $newQuantity,
                'unit_price' => $product->effective_price,
            ]);
        } else {
            $cart->items()->create([
                'product_id' => $product->id,
                'quantity' => $request->quantity,
                'unit_price' => $product->effective_price,
                'total_price' => $product->effective_price * $request->quantity,
                'options' => $request->options,
            ]);
        }

        // Refresh cart from DB so subtotal/tax/total reflect calculateTotals() from CartItem events
        $cart->refresh();
        $cart->load('items.product');

        return $this->successResponse([
            'cart' => $cart,
            'items_count' => $cart->items_count,
        ], 'Item added to cart');
    }

    /**
     * Update cart item quantity.
     */
    public function updateItem(Request $request, $itemId)
    {
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $cart = $this->getCart();
        $cartItem = $cart->items()->find($itemId);

        if (!$cartItem) {
            return $this->errorResponse('Cart item not found', 404);
        }

        $product = $cartItem->product;

        if ($product->stock_quantity < $request->quantity) {
            return $this->errorResponse('Insufficient stock', 400);
        }

        $cartItem->update([
            'quantity' => $request->quantity,
            'unit_price' => $product->effective_price,
        ]);

        // Refresh cart from DB so subtotal/tax/total reflect calculateTotals() from CartItem::saved
        $cart->refresh();
        $cart->load('items.product');

        return $this->successResponse([
            'cart' => $cart,
            'items_count' => $cart->items_count,
        ], 'Cart updated');
    }

    /**
     * Remove item from cart.
     */
    public function removeItem($itemId)
    {
        $cart = $this->getCart();
        $cartItem = $cart->items()->find($itemId);

        if (!$cartItem) {
            return $this->errorResponse('Cart item not found', 404);
        }

        $cartItem->delete();

        // Refresh cart from DB so subtotal/tax/total reflect calculateTotals() from CartItem::deleted
        $cart->refresh();
        $cart->load('items.product');

        return $this->successResponse([
            'cart' => $cart,
            'items_count' => $cart->items_count,
        ], 'Item removed from cart');
    }

    /**
     * Clear cart.
     */
    public function clear()
    {
        $cart = $this->getCart();
        $cart->clear();

        return $this->successResponse(null, 'Cart cleared');
    }

    /**
     * Apply coupon code.
     */
    public function applyCoupon(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'coupon_code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $cart = $this->getCart();

        // Mock coupon validation (in production, implement proper coupon system)
        $validCoupons = [
            'WELCOME10' => 0.10,
            'SAVE20' => 0.20,
            'GANDA15' => 0.15,
        ];

        $code = strtoupper($request->coupon_code);

        if (!isset($validCoupons[$code])) {
            return $this->errorResponse('Invalid coupon code', 400);
        }

        $discount = $cart->subtotal * $validCoupons[$code];

        $cart->update([
            'coupon_code' => $code,
            'discount' => $discount,
        ]);

        $cart->calculateTotals();
        $cart->load('items.product');

        return $this->successResponse([
            'cart' => $cart,
            'discount_applied' => $discount,
        ], 'Coupon applied successfully');
    }

    /**
     * Remove coupon code.
     */
    public function removeCoupon()
    {
        $cart = $this->getCart();

        $cart->update([
            'coupon_code' => null,
            'discount' => 0,
        ]);

        $cart->calculateTotals();
        $cart->load('items.product');

        return $this->successResponse($cart, 'Coupon removed');
    }
}
