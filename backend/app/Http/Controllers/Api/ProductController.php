<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Get all products with filters.
     */
    public function index(Request $request)
    {
        $query = Product::with('category');

        // Filter by active status (default to active for public)
        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        } else {
            $isAdmin = false;
            try {
                $user = auth()->user();
                $isAdmin = $user && $user->isAdmin();
            } catch (\Throwable $e) {
                // Invalid/expired JWT or no token - treat as public
            }
            if (!$isAdmin) {
                $query->active();
            }
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by brand
        if ($request->has('brand')) {
            $query->where('brand', $request->brand);
        }

        // Filter by price range
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Filter featured products
        if ($request->boolean('featured')) {
            $query->featured();
        }

        // Filter products on sale
        if ($request->boolean('on_sale')) {
            $query->onSale();
        }

        // Filter in stock
        if ($request->boolean('in_stock')) {
            $query->inStock();
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $allowedSorts = ['name', 'price', 'created_at', 'average_rating', 'stock_quantity'];
        
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = min($request->get('per_page', 12), 50);
        $products = $query->paginate($perPage);

        return $this->paginatedResponse($products);
    }

    /**
     * Get a single product.
     */
    public function show($id)
    {
        $product = Product::with(['category', 'reviews' => function ($q) {
            $q->approved()->with('user')->latest()->limit(10);
        }])->find($id);

        if (!$product) {
            return $this->errorResponse('Product not found', 404);
        }

        return $this->successResponse($product);
    }

    /**
     * Get product by slug.
     */
    public function showBySlug($slug)
    {
        $product = Product::with(['category', 'reviews' => function ($q) {
            $q->approved()->with('user')->latest()->limit(10);
        }])->where('slug', $slug)->first();

        if (!$product) {
            return $this->errorResponse('Product not found', 404);
        }

        return $this->successResponse($product);
    }

    /**
     * Create a new product (Admin only).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products',
            'sku' => 'nullable|string|max:255|unique:products',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0|lt:price',
            'stock_quantity' => 'required|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'brand' => 'nullable|string|max:255',
            'weight' => 'nullable|string|max:50',
            'dimensions' => 'nullable|string|max:100',
            'images' => 'nullable|array',
            'thumbnail' => 'nullable|string',
            'attributes' => 'nullable|array',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->all();
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }
        if (empty($data['sku'])) {
            $data['sku'] = strtoupper(Str::random(8));
        }

        $product = Product::create($data);

        return $this->successResponse($product, 'Product created successfully', 201);
    }

    /**
     * Update a product (Admin only).
     */
    public function update(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return $this->errorResponse('Product not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'category_id' => 'sometimes|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:products,slug,' . $id,
            'sku' => 'sometimes|string|max:255|unique:products,sku,' . $id,
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'price' => 'sometimes|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'brand' => 'nullable|string|max:255',
            'weight' => 'nullable|string|max:50',
            'dimensions' => 'nullable|string|max:100',
            'images' => 'nullable|array',
            'thumbnail' => 'nullable|string',
            'attributes' => 'nullable|array',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $product->update($request->all());

        return $this->successResponse($product, 'Product updated successfully');
    }

    /**
     * Delete a product (Admin only).
     */
    public function destroy($id)
    {
        $product = Product::find($id);

        if (!$product) {
            return $this->errorResponse('Product not found', 404);
        }

        $product->delete();

        return $this->successResponse(null, 'Product deleted successfully');
    }

    /**
     * Get featured products.
     */
    public function featured()
    {
        $products = Product::active()->featured()->with('category')->limit(8)->get();
        return $this->successResponse($products);
    }

    /**
     * Get products on sale.
     */
    public function onSale()
    {
        $products = Product::active()->onSale()->with('category')->limit(12)->get();
        return $this->successResponse($products);
    }

    /**
     * Get new arrivals.
     */
    public function newArrivals()
    {
        $products = Product::active()->with('category')
            ->orderBy('created_at', 'desc')
            ->limit(8)
            ->get();
        return $this->successResponse($products);
    }

    /**
     * Get all brands.
     */
    public function brands()
    {
        $brands = Product::active()
            ->whereNotNull('brand')
            ->distinct()
            ->pluck('brand');
        return $this->successResponse($brands);
    }

    /**
     * Update stock (Admin only).
     */
    public function updateStock(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return $this->errorResponse('Product not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer',
            'operation' => 'required|in:set,add,subtract',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $quantity = $request->quantity;

        switch ($request->operation) {
            case 'add':
                $product->increaseStock($quantity);
                break;
            case 'subtract':
                if (!$product->decreaseStock($quantity)) {
                    return $this->errorResponse('Insufficient stock', 400);
                }
                break;
            case 'set':
                $product->update(['stock_quantity' => $quantity]);
                break;
        }

        return $this->successResponse($product->fresh(), 'Stock updated successfully');
    }
}
