<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
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

        // Mock payment processing - real-world requirements per payment method
        $validator = Validator::make($request->all(), [
            // Credit Card: card number, cardholder name, expiry, CVV (as required by merchants)
            'card_number' => 'required_if:payment_method,credit_card|string|regex:/^\d{13,19}$/',
            'cardholder_name' => 'required_if:payment_method,credit_card|string|min:2',
            'card_expiry' => 'required_if:payment_method,credit_card|string|regex:/^(0[1-9]|1[0-2])\/\d{2}$/',
            'card_cvv' => 'required_if:payment_method,credit_card|string|regex:/^\d{3,4}$/',
            // GCash: registered mobile number + name for verification (as required for Send Money/Request)
            'gcash_number' => 'required_if:payment_method,gcash|string|regex:/^09\d{9}$/',
            'gcash_name' => 'required_if:payment_method,gcash|string|min:2',
            // Maya: registered mobile number + name for verification (as required for Maya Wallet)
            'maya_number' => 'required_if:payment_method,maya|string|regex:/^09\d{9}$/',
            'maya_name' => 'required_if:payment_method,maya|string|min:2',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        // Validate card expiry is not in the past
        if ($request->payment_method === 'credit_card' && $request->card_expiry) {
            [$month, $year] = explode('/', $request->card_expiry);
            $expiryDate = \Carbon\Carbon::createFromDate(2000 + (int) $year, (int) $month, 1)->endOfMonth();
            if ($expiryDate->isPast()) {
                return $this->errorResponse('Card has expired', 422);
            }
        }

        // Simulate payment processing
        $transactionId = 'TXN-' . strtoupper(Str::random(12));
        $success = true; // In production, integrate with actual payment gateway

        if ($success) {
            $payment->markAsCompleted($transactionId);
            
            // Update order status
            $order->updateStatus(Order::STATUS_CONFIRMED);

            return $this->successResponse([
                'payment' => $payment->fresh(),
                'transaction_id' => $transactionId,
            ], 'Payment processed successfully');
        } else {
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
        return $this->successResponse(Payment::getPaymentMethods());
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
