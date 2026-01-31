<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DeliveryController extends Controller
{
    /**
     * Get all deliveries (Admin/Rider).
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = Delivery::with(['order.user', 'rider']);

        // Riders only see their assigned deliveries
        if ($user->isRider()) {
            $query->where('rider_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('rider_id')) {
            $query->where('rider_id', $request->rider_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = min($request->get('per_page', 10), 50);
        $deliveries = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $this->paginatedResponse($deliveries);
    }

    /**
     * Get delivery details.
     */
    public function show($id)
    {
        $user = auth()->user();
        $delivery = Delivery::with(['order.items', 'order.user', 'order.payment', 'rider'])->find($id);

        if (!$delivery) {
            return $this->errorResponse('Delivery not found', 404);
        }

        // Riders can only view their assigned deliveries
        if ($user->isRider() && $delivery->rider_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        return $this->successResponse($delivery);
    }

    /**
     * Assign rider to delivery (Admin only).
     */
    public function assignRider(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'rider_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $delivery = Delivery::find($id);

        if (!$delivery) {
            return $this->errorResponse('Delivery not found', 404);
        }

        $rider = User::find($request->rider_id);

        if (!$rider->isRider()) {
            return $this->errorResponse('Selected user is not a rider', 400);
        }

        $delivery->assignToRider($rider->id);

        return $this->successResponse($delivery->fresh(['rider']), 'Rider assigned successfully');
    }

    /**
     * Update delivery status (Rider/Admin).
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,assigned,picked_up,in_transit,out_for_delivery,delivered,failed,returned',
            'location' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();
        $delivery = Delivery::find($id);

        if (!$delivery) {
            return $this->errorResponse('Delivery not found', 404);
        }

        // Riders can only update their assigned deliveries
        if ($user->isRider() && $delivery->rider_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $delivery->updateDeliveryStatus($request->status, $request->location);

        if ($request->notes) {
            $delivery->update(['delivery_notes' => $request->notes]);
        }

        // Sync with order status
        $order = $delivery->order;
        if ($request->status === Delivery::STATUS_DELIVERED) {
            $order->updateStatus(Order::STATUS_DELIVERED);
        } elseif ($request->status === Delivery::STATUS_OUT_FOR_DELIVERY) {
            $order->updateStatus(Order::STATUS_OUT_FOR_DELIVERY);
        }

        return $this->successResponse($delivery->fresh(['order', 'rider']), 'Delivery status updated');
    }

    /**
     * Update delivery location (Rider).
     */
    public function updateLocation(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'location' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();
        $delivery = Delivery::find($id);

        if (!$delivery) {
            return $this->errorResponse('Delivery not found', 404);
        }

        if ($user->isRider() && $delivery->rider_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $delivery->updateLocation(
            $request->latitude,
            $request->longitude,
            $request->location
        );

        return $this->successResponse($delivery, 'Location updated');
    }

    /**
     * Mark delivery as completed with proof.
     */
    public function complete(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'recipient_name' => 'required|string|max:255',
            'proof_of_delivery' => 'nullable|string', // Base64 image or file path
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();
        $delivery = Delivery::find($id);

        if (!$delivery) {
            return $this->errorResponse('Delivery not found', 404);
        }

        if ($user->isRider() && $delivery->rider_id !== $user->id) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $delivery->update([
            'status' => Delivery::STATUS_DELIVERED,
            'delivered_at' => now(),
            'recipient_name' => $request->recipient_name,
            'proof_of_delivery' => $request->proof_of_delivery,
            'delivery_notes' => $request->notes,
        ]);

        // Update order status
        $delivery->order->updateStatus(Order::STATUS_DELIVERED);

        return $this->successResponse($delivery->fresh(['order']), 'Delivery completed');
    }

    /**
     * Track delivery by tracking number.
     */
    public function track($trackingNumber)
    {
        $delivery = Delivery::with('order')
            ->where('tracking_number', $trackingNumber)
            ->first();

        if (!$delivery) {
            return $this->errorResponse('Delivery not found', 404);
        }

        return $this->successResponse([
            'tracking_number' => $delivery->tracking_number,
            'status' => $delivery->status,
            'status_label' => Delivery::getStatuses()[$delivery->status] ?? $delivery->status,
            'current_location' => $delivery->current_location,
            'estimated_delivery' => $delivery->estimated_delivery,
            'picked_up_at' => $delivery->picked_up_at,
            'delivered_at' => $delivery->delivered_at,
            'delivery_attempts' => $delivery->delivery_attempts,
        ]);
    }

    /**
     * Get available riders (Admin only).
     */
    public function availableRiders()
    {
        $riders = User::where('role', 'rider')
            ->where('is_active', true)
            ->get(['id', 'first_name', 'last_name', 'email', 'phone']);

        return $this->successResponse($riders);
    }

    /**
     * Get rider's delivery statistics.
     */
    public function riderStats($riderId = null)
    {
        $user = auth()->user();
        $riderId = $riderId ?? $user->id;

        if ($user->isRider() && $user->id != $riderId) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $stats = [
            'total_deliveries' => Delivery::where('rider_id', $riderId)->count(),
            'completed' => Delivery::where('rider_id', $riderId)
                ->where('status', Delivery::STATUS_DELIVERED)->count(),
            'pending' => Delivery::where('rider_id', $riderId)
                ->whereIn('status', [
                    Delivery::STATUS_ASSIGNED,
                    Delivery::STATUS_PICKED_UP,
                    Delivery::STATUS_IN_TRANSIT,
                    Delivery::STATUS_OUT_FOR_DELIVERY,
                ])->count(),
            'failed' => Delivery::where('rider_id', $riderId)
                ->where('status', Delivery::STATUS_FAILED)->count(),
            'today' => Delivery::where('rider_id', $riderId)
                ->whereDate('created_at', today())->count(),
        ];

        return $this->successResponse($stats);
    }
}
