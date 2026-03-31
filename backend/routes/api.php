<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\RiderRatingController;
use App\Http\Controllers\Api\StockRequestController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InventoryReceiptController;
use App\Http\Controllers\Api\LogisticsController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SystemSettingController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for Ganda Hub Cosmetics
|--------------------------------------------------------------------------
*/

// Public routes
Route::prefix('v1')->group(function () {

    // Health check (DB connectivity from web process)
    Route::get('/health', function () {
        $debug = [
            'db_host_set' => !empty(env('DB_HOST')),
            'database_url_set' => !empty(env('DATABASE_URL')),
            'mysql_url_set' => !empty(env('MYSQL_URL')),
            'config_url_set' => !empty(config('database.connections.mysql.url')),
        ];
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
            return response()->json(['ok' => true, 'database' => 'connected']);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'debug' => $debug,
            ], 500);
        }
    });

    // Authentication
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/auth/providers', [AuthController::class, 'authProviders']);
    /** Copy `google_redirect_uri` into Google Cloud → OAuth client → Authorized redirect URIs (exact match). */
    Route::get('/auth/google/expected-redirect', function () {
        return response()->json([
            'google_redirect_uri' => config('services.google.redirect'),
        ]);
    });
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle']);
    Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

    // Public product routes
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/featured', [ProductController::class, 'featured']);
    Route::get('/products/on-sale', [ProductController::class, 'onSale']);
    Route::get('/products/new-arrivals', [ProductController::class, 'newArrivals']);
    Route::get('/products/brands', [ProductController::class, 'brands']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::get('/products/slug/{slug}', [ProductController::class, 'showBySlug']);

    // Public category routes
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);

    // Public reviews
    Route::get('/products/{productId}/reviews', [ReviewController::class, 'index']);

    // Public store routes (customer-facing marketplace pages)
    Route::get('/public/stores/{slug}', [StoreController::class, 'publicShowBySlug']);

    // Order tracking (public)
    Route::get('/orders/track/{orderNumber}', [OrderController::class, 'track']);
    Route::get('/deliveries/track/{trackingNumber}', [DeliveryController::class, 'track']);

    // Public settings
    Route::get('/settings/public', [SystemSettingController::class, 'public']);

    // Newsletter (public)
    Route::post('/newsletter/subscribe', [NewsletterController::class, 'subscribe']);

    // Serve uploaded storage files (no auth; use so images always load from API)
    Route::get('/storage/serve', function (Request $request) {
        $path = $request->query('path');
        if (!is_string($path) || $path === '') {
            abort(404);
        }
        $path = str_replace(['..', '\\'], '', trim($path));
        $path = ltrim($path, '/');
        $fullPath = storage_path('app/public/' . $path);
        if (!File::isFile($fullPath)) {
            abort(404);
        }
        $ext = strtolower(File::extension($fullPath));
        $mimes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml'];
        $mime = $mimes[$ext] ?? 'application/octet-stream';
        return response()->file($fullPath, ['Content-Type' => $mime]);
    });

    // Payment methods
    Route::get('/payments/methods', [PaymentController::class, 'methods']);
    Route::post('/payments/paymongo/webhook', [PaymentController::class, 'paymongoWebhook']);

    // Protected routes
    Route::middleware('jwt.auth')->group(function () {
        
        // Auth
        Route::get('/me', [AuthController::class, 'me']);

        // Notifications (in-app, e.g. stock fulfilled)
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

        // Supplier uploads (logo & product images) - authenticated suppliers only
        Route::post('/supplier/upload/image', [UploadController::class, 'uploadImage']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);

        // Saved addresses (for checkout / profile)
        Route::get('/addresses', [AddressController::class, 'index']);
        Route::post('/addresses', [AddressController::class, 'store']);
        Route::put('/addresses/{id}', [AddressController::class, 'update']);
        Route::delete('/addresses/{id}', [AddressController::class, 'destroy']);
        Route::post('/addresses/{id}/set-default', [AddressController::class, 'setDefault']);

        // Cart
        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart/items', [CartController::class, 'addItem']);
        Route::put('/cart/items/{itemId}', [CartController::class, 'updateItem']);
        Route::delete('/cart/items/{itemId}', [CartController::class, 'removeItem']);
        Route::delete('/cart', [CartController::class, 'clear']);
        Route::post('/cart/coupon', [CartController::class, 'applyCoupon']);
        Route::delete('/cart/coupon', [CartController::class, 'removeCoupon']);

        // Orders (Customer)
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/orders/place-with-payment', [OrderController::class, 'storeWithPayment']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('/orders/{id}/rate-rider', [RiderRatingController::class, 'store']);

        // Payments
        Route::get('/payments/{id}', [PaymentController::class, 'show']);
        Route::post('/payments/process/{orderId}', [PaymentController::class, 'process']);

        // Reviews
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::put('/reviews/{id}', [ReviewController::class, 'update']);
        Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);
        Route::post('/reviews/{id}/helpful', [ReviewController::class, 'markHelpful']);

        // Stock requests (admin + supplier)
        Route::get('/stock-requests', [StockRequestController::class, 'index']);
        Route::post('/stock-requests/fulfill/{id}', [StockRequestController::class, 'fulfill']);
        Route::post('/stock-requests/decline/{id}', [StockRequestController::class, 'decline']);

        // Stores (admin + supplier)
        Route::get('/stores', [StoreController::class, 'index']);
        Route::get('/stores/list', [StoreController::class, 'listForSelect']);
        Route::get('/stores/{id}', [StoreController::class, 'show']);
        Route::put('/stores/{id}', [StoreController::class, 'update']);

        // Messages (customer + supplier)
        Route::get('/conversations', [MessageController::class, 'index']);
        Route::post('/conversations', [MessageController::class, 'getOrCreate']);
        Route::get('/conversations/{id}/messages', [MessageController::class, 'messages']);
        Route::post('/messages', [MessageController::class, 'store']);

        // Admin routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            
            // Stock requests (admin create)
            Route::post('/stock-requests', [StockRequestController::class, 'store']);

            // Inventory receipts (product, supplier, quantity, stocked date)
            Route::get('/inventory-receipts', [InventoryReceiptController::class, 'index']);

            // Stores (admin only - create/delete)
            Route::post('/stores', [StoreController::class, 'store']);
            Route::delete('/stores/{id}', [StoreController::class, 'destroy']);

            // File uploads
            Route::post('/upload/image', [UploadController::class, 'uploadImage']);
            Route::post('/upload/images', [UploadController::class, 'uploadMultiple']);
            Route::delete('/upload', [UploadController::class, 'delete']);

            // Users management
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::get('/users/{id}', [UserController::class, 'show']);
            Route::put('/users/{id}', [UserController::class, 'update']);
            Route::delete('/users/{id}', [UserController::class, 'destroy']);
            Route::post('/users/{id}/toggle-status', [UserController::class, 'toggleStatus']);
            Route::get('/users-riders', [UserController::class, 'riders']);
            Route::get('/users-customers', [UserController::class, 'customers']);

            // Categories management
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{id}', [CategoryController::class, 'update']);
            Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

            // Products management
            Route::post('/products', [ProductController::class, 'store']);
            Route::put('/products/{id}', [ProductController::class, 'update']);
            Route::delete('/products/{id}', [ProductController::class, 'destroy']);
            Route::put('/products/{id}/stock', [ProductController::class, 'updateStock']);
            Route::post('/products/{id}/release-stock', [ProductController::class, 'releaseStock']);
            Route::put('/products/{id}/warehouse-stock', [ProductController::class, 'updateWarehouseStock']);

            // Payments management
            Route::get('/payments', [PaymentController::class, 'index']);

            // Deliveries management
            Route::get('/deliveries', [DeliveryController::class, 'index']);
            Route::get('/deliveries/{id}', [DeliveryController::class, 'show']);
            Route::get('/deliveries-riders', [DeliveryController::class, 'availableRiders']);

            // Logistics (catalog for regional hubs / carriers)
            Route::get('/logistics/catalog', [LogisticsController::class, 'catalog']);

            // Reviews management
            Route::get('/reviews/pending', [ReviewController::class, 'pending']);
            Route::post('/reviews/{id}/approve', [ReviewController::class, 'approve']);
            Route::post('/reviews/{id}/reject', [ReviewController::class, 'reject']);

            // Reports
            Route::get('/reports', [ReportController::class, 'index']);
            Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
            Route::post('/reports', [ReportController::class, 'generate']);
            Route::get('/reports/{id}', [ReportController::class, 'show']);
            Route::delete('/reports/{id}', [ReportController::class, 'destroy']);

            // Newsletter (view subscribers)
            Route::get('/newsletter/subscribers', [NewsletterController::class, 'index']);

            // System settings
            Route::get('/settings', [SystemSettingController::class, 'index']);
            Route::get('/settings/groups', [SystemSettingController::class, 'groups']);
            Route::get('/settings/group/{group}', [SystemSettingController::class, 'byGroup']);
            Route::get('/settings/{key}', [SystemSettingController::class, 'show']);
            Route::post('/settings', [SystemSettingController::class, 'store']);
            Route::put('/settings/bulk', [SystemSettingController::class, 'bulkUpdate']);
            Route::delete('/settings/{key}', [SystemSettingController::class, 'destroy']);
            Route::post('/settings/clear-cache', [SystemSettingController::class, 'clearCache']);
            Route::post('/settings/backup', [SystemSettingController::class, 'backup']);
            Route::get('/settings/system-info', [SystemSettingController::class, 'systemInfo']);
        });

        // Rider routes
        Route::middleware('role:rider')->prefix('rider')->group(function () {
            Route::get('/deliveries', [DeliveryController::class, 'index']);
            Route::get('/deliveries/claimable', [DeliveryController::class, 'claimable']);
            Route::get('/deliveries/{id}', [DeliveryController::class, 'show']);
            Route::post('/deliveries/{id}/claim', [DeliveryController::class, 'claim']);
            Route::put('/deliveries/{id}/status', [DeliveryController::class, 'updateStatus']);
            Route::put('/deliveries/{id}/location', [DeliveryController::class, 'updateLocation']);
            Route::post('/deliveries/{id}/complete', [DeliveryController::class, 'complete']);
            Route::get('/stats', [DeliveryController::class, 'riderStats']);
            Route::get('/stats/{riderId}', [DeliveryController::class, 'riderStats']);
        });

        // Supplier routes - manage own store's products
        Route::middleware('role:supplier')->prefix('supplier')->group(function () {
            Route::get('/reports/dashboard', [ReportController::class, 'supplierDashboard']);
            Route::get('/reviews/pending', [ReviewController::class, 'supplierPending']);
            Route::post('/reviews/{id}/approve', [ReviewController::class, 'supplierApprove']);
            Route::post('/reviews/{id}/reject', [ReviewController::class, 'supplierReject']);
            Route::get('/logistics/catalog', [LogisticsController::class, 'catalog']);
            Route::get('/deliveries', [DeliveryController::class, 'supplierDeliveries']);
            Route::get('/deliveries/{id}', [DeliveryController::class, 'show']);
            Route::get('/inventory', [StockRequestController::class, 'supplierInventory']);
            Route::post('/upload/image', [UploadController::class, 'uploadImage']);
            Route::post('/products', [ProductController::class, 'supplierStore']);
            Route::put('/products/{id}', [ProductController::class, 'supplierUpdate']);
            Route::put('/products/{id}/stock', [ProductController::class, 'supplierUpdateStock']);
            Route::put('/orders/{id}/status', [OrderController::class, 'supplierUpdateStatus']);
            Route::post('/deliveries/{id}/arrive-station', [DeliveryController::class, 'arriveAtStation']);
        });
    });
});

/*
|--------------------------------------------------------------------------
| Legacy auth path (…/api/auth/...) — some deployments set VITE_API_URL to …/api/auth
| instead of …/api/v1. Canonical routes remain under /api/v1 above.
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
});
