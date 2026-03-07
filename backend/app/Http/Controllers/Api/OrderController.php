<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Get all orders (Admin) or user's orders (Customer).
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = Order::with(['items.product', 'payment', 'delivery']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by order number
        if ($request->has('search')) {
            $query->where('order_number', 'like', "%{$request->search}%");
        }

        $perPage = min($request->get('per_page', 10), 50);
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $this->paginatedResponse($orders);
    }

    /**
     * Get a single order.
     */
    public function show($id)
    {
        $user = auth()->user();
        $order = Order::with(['items.product', 'payment', 'delivery.rider', 'user'])->find($id);

        if (!$order) {
            return $this->errorResponse('Order not found', 404);
        }

        // Customers can only view their own orders
        if (!$user->isAdmin() && $order->user_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        return $this->successResponse($order);
    }

    /**
     * Create a new order from cart.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'shipping_first_name' => 'required|string|max:255',
            'shipping_last_name' => 'required|string|max:255',
            'shipping_email' => 'required|email',
            'shipping_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string',
            'shipping_city' => 'required|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_zip_code' => 'required|string|max:20',
            'shipping_country' => 'nullable|string|max:255',
            'billing_first_name' => 'nullable|string|max:255',
            'billing_last_name' => 'nullable|string|max:255',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:255',
            'billing_state' => 'nullable|string|max:255',
            'billing_zip_code' => 'nullable|string|max:20',
            'billing_country' => 'nullable|string|max:255',
            'payment_method' => 'required|in:credit_card,gcash,maya,cod,bank_transfer',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();
        $cart = Cart::where('user_id', $user->id)->with('items.product')->first();

        if (!$cart || $cart->items->isEmpty()) {
            return $this->errorResponse('Cart is empty', 400);
        }

        // Validate stock availability
        foreach ($cart->items as $item) {
            if ($item->product->stock_quantity < $item->quantity) {
                return $this->errorResponse(
                    "Insufficient stock for {$item->product->name}",
                    400
                );
            }
        }

        DB::beginTransaction();

        try {
            // Create order
            $order = Order::create([
                'user_id' => $user->id,
                'status' => Order::STATUS_PENDING,
                'subtotal' => $cart->subtotal,
                'tax' => $cart->tax,
                'shipping_fee' => $cart->shipping,
                'discount' => $cart->discount,
                'total' => $cart->total,
                'coupon_code' => $cart->coupon_code,
                'shipping_first_name' => $request->shipping_first_name,
                'shipping_last_name' => $request->shipping_last_name,
                'shipping_email' => $request->shipping_email,
                'shipping_phone' => $request->shipping_phone,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'shipping_state' => $request->shipping_state,
                'shipping_zip_code' => $request->shipping_zip_code,
                'shipping_country' => $request->shipping_country ?? 'Philippines',
                'billing_first_name' => $request->billing_first_name,
                'billing_last_name' => $request->billing_last_name,
                'billing_address' => $request->billing_address,
                'billing_city' => $request->billing_city,
                'billing_state' => $request->billing_state,
                'billing_zip_code' => $request->billing_zip_code,
                'billing_country' => $request->billing_country,
                'notes' => $request->notes,
            ]);

            // Create order items and update stock
            foreach ($cart->items as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'product_sku' => $item->product->sku,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->total_price,
                    'options' => $item->options,
                ]);

                // Decrease stock
                $item->product->decreaseStock($item->quantity);
            }

            // Create payment record
            $payment = Payment::create([
                'order_id' => $order->id,
                'payment_method' => $request->payment_method,
                'amount' => $cart->total,
                'status' => $request->payment_method === 'cod' 
                    ? Payment::STATUS_PENDING 
                    : Payment::STATUS_PROCESSING,
            ]);

            // Create delivery record
            Delivery::create([
                'order_id' => $order->id,
                'status' => Delivery::STATUS_PENDING,
            ]);

            // Clear cart
            $cart->clear();

            DB::commit();

            $order->load(['items', 'payment', 'delivery']);

            return $this->successResponse($order, 'Order placed successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update order status (Admin only).
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,confirmed,processing,shipped,out_for_delivery,delivered,cancelled,refunded',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $order = Order::find($id);

        if (!$order) {
            return $this->errorResponse('Order not found', 404);
        }

        $order->updateStatus($request->status);

        // Update delivery status accordingly
        if (in_array($request->status, ['shipped', 'out_for_delivery', 'delivered'])) {
            $delivery = $order->delivery;
            if ($delivery) {
                $deliveryStatus = match($request->status) {
                    'shipped' => Delivery::STATUS_IN_TRANSIT,
                    'out_for_delivery' => Delivery::STATUS_OUT_FOR_DELIVERY,
                    'delivered' => Delivery::STATUS_DELIVERED,
                    default => $delivery->status,
                };
                $delivery->updateDeliveryStatus($deliveryStatus);
            }
        }

        // If cancelled, restore stock
        if ($request->status === 'cancelled') {
            foreach ($order->items as $item) {
                $item->product->increaseStock($item->quantity);
            }
        }

        return $this->successResponse($order->fresh(['items', 'payment', 'delivery']), 'Order status updated');
    }

    /**
     * Cancel order (Customer can cancel pending/confirmed orders).
     */
    public function cancel($id)
    {
        $user = auth()->user();
        $order = Order::find($id);

        if (!$order) {
            return $this->errorResponse('Order not found', 404);
        }

        if ($order->user_id !== $user->id && !$user->isAdmin()) {
            return $this->errorResponse('Unauthorized', 403);
        }

        if (!$order->canBeCancelled()) {
            return $this->errorResponse('Order cannot be cancelled at this stage', 400);
        }

        // Restore stock
        foreach ($order->items as $item) {
            $item->product->increaseStock($item->quantity);
        }

        $order->updateStatus(Order::STATUS_CANCELLED);

        // Update payment status
        if ($order->payment) {
            $order->payment->update(['status' => Payment::STATUS_CANCELLED]);
        }

        return $this->successResponse($order->fresh(['items', 'payment', 'delivery']), 'Order cancelled successfully');
    }

    /**
     * Track order by order number.
     */
    public function track($orderNumber)
    {
        $order = Order::with(['items', 'delivery'])
            ->where('order_number', $orderNumber)
            ->first();

        if (!$order) {
            return $this->errorResponse('Order not found', 404);
        }

        return $this->successResponse([
            'order_number' => $order->order_number,
            'status' => $order->status,
            'delivery' => $order->delivery,
            'shipped_at' => $order->shipped_at,
            'delivered_at' => $order->delivered_at,
        ]);
    }
}
