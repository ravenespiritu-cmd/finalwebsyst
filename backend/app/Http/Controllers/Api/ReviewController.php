<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * Get all reviews for a product.
     */
    public function index(Request $request, $productId)
    {
        $product = Product::find($productId);

        if (!$product) {
            return $this->errorResponse('Product not found', 404);
        }

        $query = $product->reviews()->with('user');

        // Only show approved reviews for non-admin users
        $isAdmin = false;
        try {
            $user = auth()->user();
            $isAdmin = $user && $user->isAdmin();
        } catch (\Throwable $e) {
            // Invalid/expired JWT or no token - treat as public
        }
        if (!$isAdmin) {
            $query->approved();
        }

        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        if ($request->boolean('verified_only')) {
            $query->verifiedPurchase();
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        if ($sortBy === 'helpful') {
            $query->orderBy('helpful_count', $sortOrder);
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        $perPage = min($request->get('per_page', 10), 50);
        $reviews = $query->paginate($perPage);

        return $this->paginatedResponse($reviews);
    }

    /**
     * Get a single review.
     */
    public function show($id)
    {
        $review = Review::with(['user', 'product'])->find($id);

        if (!$review) {
            return $this->errorResponse('Review not found', 404);
        }

        return $this->successResponse($review);
    }

    /**
     * Create a review.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'order_id' => 'nullable|exists:orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:255',
            'comment' => 'nullable|string|max:2000',
            'images' => 'nullable|array',
            'images.*' => 'string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();

        // Check if user already reviewed this product
        $existingReview = Review::where('user_id', $user->id)
            ->where('product_id', $request->product_id)
            ->first();

        if ($existingReview) {
            return $this->errorResponse('You have already reviewed this product', 400);
        }

        // Check if it's a verified purchase
        $isVerifiedPurchase = false;
        if ($request->order_id) {
            $order = Order::where('id', $request->order_id)
                ->where('user_id', $user->id)
                ->where('status', 'delivered')
                ->whereHas('items', function ($q) use ($request) {
                    $q->where('product_id', $request->product_id);
                })
                ->first();

            $isVerifiedPurchase = (bool) $order;
        }

        $review = Review::create([
            'user_id' => $user->id,
            'product_id' => $request->product_id,
            'order_id' => $request->order_id,
            'rating' => $request->rating,
            'title' => $request->title,
            'comment' => $request->comment,
            'images' => $request->images,
            'is_verified_purchase' => $isVerifiedPurchase,
            'is_approved' => false, // Requires admin approval
        ]);

        return $this->successResponse($review, 'Review submitted for approval', 201);
    }

    /**
     * Update a review.
     */
    public function update(Request $request, $id)
    {
        $review = Review::find($id);

        if (!$review) {
            return $this->errorResponse('Review not found', 404);
        }

        $user = auth()->user();

        if ($review->user_id !== $user->id && !$user->isAdmin()) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $validator = Validator::make($request->all(), [
            'rating' => 'sometimes|integer|min:1|max:5',
            'title' => 'nullable|string|max:255',
            'comment' => 'nullable|string|max:2000',
            'images' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $review->update($request->only(['rating', 'title', 'comment', 'images']));

        // Reset approval status if user edits
        if (!$user->isAdmin()) {
            $review->update(['is_approved' => false]);
        }

        return $this->successResponse($review, 'Review updated');
    }

    /**
     * Delete a review.
     */
    public function destroy($id)
    {
        $review = Review::find($id);

        if (!$review) {
            return $this->errorResponse('Review not found', 404);
        }

        $user = auth()->user();

        if ($review->user_id !== $user->id && !$user->isAdmin()) {
            return $this->errorResponse('Unauthorized', 403);
        }

        $review->delete();

        return $this->successResponse(null, 'Review deleted');
    }

    /**
     * Approve a review (Admin only).
     */
    public function approve($id)
    {
        $review = Review::find($id);

        if (!$review) {
            return $this->errorResponse('Review not found', 404);
        }

        $review->approve();

        return $this->successResponse($review, 'Review approved');
    }

    /**
     * Reject a review (Admin only).
     */
    public function reject($id)
    {
        $review = Review::find($id);

        if (!$review) {
            return $this->errorResponse('Review not found', 404);
        }

        $review->reject();

        return $this->successResponse($review, 'Review rejected');
    }

    /**
     * Mark review as helpful.
     */
    public function markHelpful($id)
    {
        $review = Review::find($id);

        if (!$review) {
            return $this->errorResponse('Review not found', 404);
        }

        $review->markAsHelpful();

        return $this->successResponse($review, 'Marked as helpful');
    }

    /**
     * Get pending reviews (Admin only).
     */
    public function pending(Request $request)
    {
        $perPage = min($request->get('per_page', 10), 50);
        $reviews = Review::with(['user', 'product'])
            ->where('is_approved', false)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return $this->paginatedResponse($reviews);
    }
}
