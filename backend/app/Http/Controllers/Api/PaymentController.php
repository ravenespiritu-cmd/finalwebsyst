<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Payment;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Get all payments (Admin only).
     */
    public function index(Request $request)
    {
        $query = Payment::with('order.user');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = min($request->get('per_page', 10), 50);
        $payments = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $this->paginatedResponse($payments);
    }

    /**
     * Get payment details.
     */
    public function show($id)
    {
        $payment = Payment::with('order.user')->find($id);

        if (!$payment) {
            return $this->errorResponse('Payment not found', 404);
        }

        $user = auth()->user();
        if (!$user->isAdmin() && $payment->order->user_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        return $this->successResponse($payment);
    }

    /**
     * Process payment (Mock payment gateway).
     */
    public function process(Request $request, $orderId)
    {
        $order = Order::find($orderId);

        if (!$order) {
            return $this->errorResponse('Order not found', 404);
        }

        $user = auth()->user();
        if ($order->user_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $payment = $order->payment;

        if (!$payment) {
            return $this->errorResponse('Payment record not found', 404);
        }

        if ($payment->status === Payment::STATUS_COMPLETED) {
            return $this->errorResponse('Payment already completed', 400);
        }

        // Payment processing - only GCash is supported for online payment
        $validator = Validator::make($request->all(), [
            'payment_method' => 'required|in:gcash',
            'gcash_number' => 'required_if:payment_method,gcash|string|regex:/^09\d{9}$/',
            'gcash_name' => 'required_if:payment_method,gcash|string|min:2',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        if ($request->payment_method !== 'gcash') {
            return $this->errorResponse('Unsupported payment method', 422);
        }

        DB::beginTransaction();
        try {
            $customer = User::where('id', $user->id)->lockForUpdate()->first();
            if (!$customer) {
                DB::rollBack();
                return $this->errorResponse('User not found', 404);
            }

            $currentBalance = (float) $customer->gcash_balance;
            $paymentAmount = (float) $payment->amount;
            if ($currentBalance < $paymentAmount) {
                DB::rollBack();
                return $this->errorResponse('Insufficient GCash balance', 422);
            }

            $customer->update([
                'gcash_balance' => round($currentBalance - $paymentAmount, 2),
                'gcash_number' => $request->gcash_number,
            ]);

            $transactionId = 'TXN-' . strtoupper(Str::random(12));
            $payment->markAsCompleted($transactionId);
            $payment->update([
                'payment_details' => [
                    'gcash_number' => $request->gcash_number,
                    'gcash_name' => $request->gcash_name,
                    'balance_before' => number_format($currentBalance, 2, '.', ''),
                    'balance_after' => number_format((float) $customer->gcash_balance, 2, '.', ''),
                ],
            ]);

            // Update order status
            $order->updateStatus(Order::STATUS_CONFIRMED);

            // Clear cart now that payment is complete (cart was kept when order was created for non-COD)
            $userCart = Cart::where('user_id', $user->id)->first();
            if ($userCart) {
                $userCart->clear();
            }

            DB::commit();
            return $this->successResponse([
                'payment' => $payment->fresh(),
                'transaction_id' => $transactionId,
            ], 'Payment processed successfully');
        } catch (\Throwable $e) {
            DB::rollBack();
            $payment->markAsFailed('Payment declined');
            return $this->errorResponse('Payment failed', 400);
        }
    }

    /**
     * Update payment status (Admin only).
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,completed,failed,refunded,cancelled',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $payment = Payment::find($id);

        if (!$payment) {
            return $this->errorResponse('Payment not found', 404);
        }

        $payment->update([
            'status' => $request->status,
            'notes' => $request->notes,
            'paid_at' => $request->status === 'completed' ? now() : $payment->paid_at,
        ]);

        return $this->successResponse($payment, 'Payment status updated');
    }

    /**
     * Get available payment methods.
     */
    public function methods()
    {
        return $this->successResponse([
            'methods' => Payment::getPaymentMethods(),
            'gcash' => [
                'receiver_name' => (string) SystemSetting::get('gcash_receiver_name', 'Ganda Hub Cosmetics'),
                'receiver_number' => (string) SystemSetting::get('gcash_receiver_number', ''),
                'qr_image_url' => (string) SystemSetting::get('gcash_qr_image_url', ''),
            ],
        ]);
    }

    /**
     * PayMongo webhook endpoint.
     */
    public function paymongoWebhook(Request $request)
    {
        $payload = $request->all();
        $eventType = (string) data_get($payload, 'data.attributes.type', '');
        $resourceData = data_get($payload, 'data.attributes.data', []);

        // Best-effort extraction across PayMongo event payload variants.
        $checkoutSessionId = (string) (
            data_get($resourceData, 'id')
            ?: data_get($resourceData, 'attributes.checkout_session_id')
            ?: data_get($resourceData, 'attributes.source.id')
            ?: data_get($resourceData, 'attributes.metadata.checkout_session_id')
        );

        if ($checkoutSessionId === '') {
            Log::warning('PayMongo webhook received without checkout session id', ['payload' => $payload]);
            return $this->successResponse(['received' => true], 'Ignored');
        }

        $payment = Payment::where('payment_details->checkout_session_id', $checkoutSessionId)->first();
        if (!$payment) {
            Log::warning('PayMongo webhook session not mapped to local payment', ['checkout_session_id' => $checkoutSessionId]);
            return $this->successResponse(['received' => true], 'Ignored');
        }

        $order = $payment->order;
        if (!$order) {
            return $this->successResponse(['received' => true], 'Ignored');
        }

        $normalizedType = strtolower($eventType);
        $isPaidEvent = str_contains($normalizedType, 'paid');
        $isFailedEvent = str_contains($normalizedType, 'failed') || str_contains($normalizedType, 'expired');

        if ($isPaidEvent) {
            if ($payment->status !== Payment::STATUS_COMPLETED) {
                $providerPaymentId = (string) (
                    data_get($resourceData, 'attributes.payments.0.id')
                    ?: data_get($resourceData, 'attributes.payment_intent_id')
                    ?: $checkoutSessionId
                );
                $payment->markAsCompleted($providerPaymentId);
                $payment->update([
                    'payment_details' => array_merge($payment->payment_details ?? [], [
                        'provider' => 'paymongo',
                        'provider_payment_id' => $providerPaymentId,
                        'last_webhook_event' => $eventType,
                    ]),
                ]);
            }

            if ($order->status !== Order::STATUS_CONFIRMED) {
                $order->updateStatus(Order::STATUS_CONFIRMED);
            }

            $userCart = Cart::where('user_id', $order->user_id)->first();
            if ($userCart) {
                $userCart->clear();
            }
        } elseif ($isFailedEvent) {
            if ($payment->status !== Payment::STATUS_FAILED) {
                $payment->markAsFailed('PayMongo reported ' . $eventType);
                $payment->update([
                    'payment_details' => array_merge($payment->payment_details ?? [], [
                        'provider' => 'paymongo',
                        'last_webhook_event' => $eventType,
                    ]),
                ]);
            }
        }

        return $this->successResponse(['received' => true]);
    }

    /**
     * Refund payment (Admin only).
     */
    public function refund(Request $request, $id)
    {
        $payment = Payment::find($id);

        if (!$payment) {
            return $this->errorResponse('Payment not found', 404);
        }

        if ($payment->status !== Payment::STATUS_COMPLETED) {
            return $this->errorResponse('Only completed payments can be refunded', 400);
        }

        // Process refund (mock)
        $payment->update([
            'status' => Payment::STATUS_REFUNDED,
            'notes' => $request->reason ?? 'Refund processed',
        ]);

        // Update order status
        $payment->order->updateStatus(Order::STATUS_REFUNDED);

        // Restore stock
        foreach ($payment->order->items as $item) {
            $item->product->increaseStock($item->quantity);
        }

        return $this->successResponse($payment, 'Payment refunded successfully');
    }
}
