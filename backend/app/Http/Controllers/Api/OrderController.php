<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Conversation;
use App\Models\Delivery;
use App\Models\Message;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Store;
use App\Services\PayMongoService;
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
        $query = Order::with(['items.product.store', 'payment', 'delivery', 'user']);

        if ($user->isAdmin()) {
            // Admin sees all orders
        } elseif ($user->isSupplier()) {
            $store = Store::where('user_id', $user->id)->first();
            if (!$store) {
                return $this->paginatedResponse(new \Illuminate\Pagination\LengthAwarePaginator([], 0, 10));
            }
            $query->whereHas('items.product', function ($q) use ($store) {
                $q->where('store_id', $store->id);
            });
        } else {
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
        $order = Order::with(['items.product', 'payment', 'delivery.rider', 'user', 'riderRating'])->find($id);

        if (!$order) {
            return $this->errorResponse('Order not found', 404);
        }

        if ($user->isAdmin()) {
            // Admin oversight: can view any order.
        } elseif ($user->isSupplier()) {
            $store = Store::where('user_id', $user->id)->first();
            if (! $store) {
                return $this->errorResponse('Supplier store not found', 404);
            }
            $isSupplierOrder = $order->items->contains(function ($item) use ($store) {
                return $item->product && (int) $item->product->store_id === (int) $store->id;
            });
            if (! $isSupplierOrder) {
                return $this->errorResponse('Unauthorized', 403);
            }
        } elseif ($order->user_id !== $user->id) {
            // Customers can only view their own orders.
            return $this->errorResponse('Unauthorized', 403);
        }

        $data = $order->toArray();

        // For customer: append rider_rating and each item's user_review for "Rate rider" / "Rate product" UI
        if ($order->user_id === $user->id) {
            $data['rider_rating'] = $order->riderRating ? $order->riderRating->only(['id', 'rating', 'comment', 'created_at']) : null;
            if ($order->items && $order->items->isNotEmpty()) {
                $productIds = $order->items->pluck('product_id')->filter()->unique();
                $reviews = \App\Models\Review::where('user_id', $user->id)
                    ->whereIn('product_id', $productIds)
                    ->get()
                    ->keyBy('product_id');
                foreach ($data['items'] as $idx => $itemArr) {
                    $productId = $order->items[$idx]->product_id ?? null;
                    $data['items'][$idx]['user_review'] = $productId ? $reviews->get($productId)?->only(['id', 'rating', 'comment', 'title', 'is_approved']) : null;
                }
            }
        }

        return $this->successResponse($data);
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
            'payment_method' => 'required|in:gcash,cod',
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

            // Clear cart only for COD (pay on delivery). For GCash, keep cart until payment completes.
            if ($request->payment_method === 'cod') {
                $cart->clear();
            }

            DB::commit();

            $order->load(['items', 'payment', 'delivery']);
            $this->sendSupplierThankYouMessages($order);

            return $this->successResponse($order, 'Order placed successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create order and process payment in one step (GCash).
     * Only creates the order when payment succeeds - no pending orders from abandoned checkouts.
     */
    public function storeWithPayment(Request $request)
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
            'payment_method' => 'required|in:gcash',
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
            $payMongo = app(PayMongoService::class);
            if (!$payMongo->isConfigured()) {
                DB::rollBack();
                return $this->errorResponse('PayMongo is not configured yet. Please contact admin.', 422);
            }

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
                $item->product->decreaseStock($item->quantity);
            }

            $payment = Payment::create([
                'order_id' => $order->id,
                'payment_method' => $request->payment_method,
                'amount' => $cart->total,
                'status' => Payment::STATUS_PROCESSING,
                'payment_details' => [],
            ]);

            Delivery::create([
                'order_id' => $order->id,
                'status' => Delivery::STATUS_PENDING,
            ]);

            $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
            $checkoutSession = $payMongo->createCheckoutSession([
                'billing' => [
                    'name' => trim($request->shipping_first_name . ' ' . $request->shipping_last_name),
                    'email' => $request->shipping_email,
                    'phone' => $request->shipping_phone,
                ],
                'send_email_receipt' => false,
                'show_description' => true,
                'show_line_items' => true,
                'line_items' => [[
                    'currency' => 'PHP',
                    'amount' => (int) round(((float) $cart->total) * 100),
                    'name' => 'Order ' . $order->order_number,
                    'quantity' => 1,
                    'description' => 'Payment for order ' . $order->order_number,
                ]],
                'payment_method_types' => ['gcash'],
                'description' => 'Payment for order ' . $order->order_number,
                'statement_descriptor' => 'GANDA HUB',
                'reference_number' => (string) $order->order_number,
                'success_url' => $frontendUrl . '/orders/' . $order->id . '?payment=success',
                'cancel_url' => $frontendUrl . '/checkout?payment=cancelled',
                'metadata' => [
                    'order_id' => (string) $order->id,
                    'payment_id' => (string) $payment->id,
                    'user_id' => (string) $user->id,
                ],
            ]);

            $sessionId = data_get($checkoutSession, 'data.id');
            $checkoutUrl = data_get($checkoutSession, 'data.attributes.checkout_url');
            if (!$sessionId || !$checkoutUrl) {
                throw new \RuntimeException('PayMongo did not return checkout session details.');
            }

            $payment->update([
                'payment_details' => [
                    'provider' => 'paymongo',
                    'checkout_session_id' => $sessionId,
                    'checkout_url' => $checkoutUrl,
                ],
                'transaction_id' => $sessionId,
            ]);

            DB::commit();

            return $this->successResponse([
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'checkout_url' => $checkoutUrl,
            ], 'Redirecting to secure payment', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to place order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Send auto thank-you message from each supplier whose product was purchased.
     */
    protected function sendSupplierThankYouMessages(Order $order): void
    {
        $storeIds = $order->items->map(function ($item) {
            return $item->product?->store_id;
        })->filter()->unique();

        foreach ($storeIds as $storeId) {
            $store = Store::find($storeId);
            if (!$store) {
                continue;
            }

            $conversation = Conversation::firstOrCreate(
                ['user_id' => $order->user_id, 'store_id' => $storeId],
                ['order_id' => $order->id]
            );

            // Friendly, store-branded thank-you message that clearly shows where the product came from
            $storeName = $store->name ?? 'our store';
            $messageBody = "Thank you for purchasing our product from {$storeName}! "
                . "If you have any questions about your order or our items, you can reply to this message.";

            Message::create([
                'conversation_id' => $conversation->id,
                'sender_type' => Message::SENDER_STORE,
                'sender_id' => $storeId,
                'body' => $messageBody,
            ]);
        }
    }

    /**
     * Admin order status updates are disabled (oversight-only admin role).
     */
    public function updateStatus(Request $request, $id)
    {
        return $this->errorResponse(
            'Admins can monitor orders but cannot manage order transactions. Suppliers must update fulfillment status.',
            403
        );
    }

    /**
     * Update order status for supplier-owned orders.
     */
    public function supplierUpdateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:confirmed,processing,shipped,cancelled',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();
        $store = Store::where('user_id', $user->id)->first();
        if (! $store) {
            return $this->errorResponse('Supplier store not found', 404);
        }

        $order = Order::with(['items.product', 'delivery'])->find($id);
        if (! $order) {
            return $this->errorResponse('Order not found', 404);
        }

        $isSupplierOrder = $order->items->contains(function ($item) use ($store) {
            return $item->product && (int) $item->product->store_id === (int) $store->id;
        });
        if (! $isSupplierOrder) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $targetStatus = $request->status;
        if (! $this->isSupplierStatusTransitionAllowed($order->status, $targetStatus)) {
            return $this->errorResponse('Invalid supplier status transition for this order state', 422);
        }

        $order->updateStatus($targetStatus);

        if ($targetStatus === Order::STATUS_SHIPPED) {
            $delivery = $order->delivery;
            if ($delivery) {
                $delivery->updateDeliveryStatus(Delivery::STATUS_IN_TRANSIT);
            }
        }

        if ($targetStatus === Order::STATUS_CANCELLED) {
            foreach ($order->items as $item) {
                $item->product->increaseStock($item->quantity);
            }
            if ($order->payment && $order->payment->status !== Payment::STATUS_COMPLETED) {
                $order->payment->update(['status' => Payment::STATUS_CANCELLED]);
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

        if ($order->user_id !== $user->id) {
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

    protected function isSupplierStatusTransitionAllowed(string $currentStatus, string $targetStatus): bool
    {
        return match ($targetStatus) {
            Order::STATUS_CONFIRMED => $currentStatus === Order::STATUS_PENDING,
            Order::STATUS_PROCESSING => in_array($currentStatus, [Order::STATUS_PENDING, Order::STATUS_CONFIRMED], true),
            Order::STATUS_SHIPPED => $currentStatus === Order::STATUS_PROCESSING,
            Order::STATUS_CANCELLED => in_array($currentStatus, [Order::STATUS_PENDING, Order::STATUS_CONFIRMED, Order::STATUS_PROCESSING], true),
            default => false,
        };
    }
}
