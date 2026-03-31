# Ganda Hub Cosmetics - One-File System Documentation

This single file explains the architecture, roles, lifecycle states, and the main end-to-end workflows of the system (frontend + backend + database-backed order pipeline).

---

## 1) Architecture (Frontend + Backend)

### Frontend (React SPA)
- Location: `frontend/`
- Routing and role layouts:
  - Main router: `frontend/src/App.jsx`
  - Role layouts:
    - `frontend/src/components/layout/AdminLayout.jsx`
    - `frontend/src/components/layout/RiderLayout.jsx`
    - `frontend/src/components/layout/SupplierLayout.jsx`
    - `frontend/src/components/layout/Layout.jsx` (public/customer)
- Central API client:
  - `frontend/src/services/api.js`
  - All page calls go through this file (Axios base URL + `Authorization: Bearer <token>`).
- Key pages used in the core demo:
  - Customer checkout: `frontend/src/pages/Checkout.jsx`
  - Customer tracking: `frontend/src/pages/OrderTracking.jsx`
  - Customer order detail: `frontend/src/pages/OrderDetail.jsx`
  - Supplier workflows:
    - `frontend/src/pages/supplier/Orders.jsx`
    - `frontend/src/pages/supplier/Logistics.jsx`
  - Rider workflows:
    - `frontend/src/pages/rider/Deliveries.jsx`
  - Admin monitoring:
    - `frontend/src/pages/admin/Orders.jsx`
    - `frontend/src/pages/admin/Deliveries.jsx`
    - `frontend/src/pages/admin/Logistics.jsx`
    - `frontend/src/pages/admin/Payments.jsx`

### Backend (Laravel API)
- Location: `backend/`
- API routes live in:
  - `backend/routes/api.php`
- API is grouped under `/api/v1`.
- Core workflow controllers:
  - Orders: `backend/app/Http/Controllers/Api/OrderController.php`
  - Payments: `backend/app/Http/Controllers/Api/PaymentController.php`
  - Delivery + logistics handoff + rider actions: `backend/app/Http/Controllers/Api/DeliveryController.php`
  - Logistics catalog: `backend/app/Http/Controllers/Api/LogisticsController.php`

### Database models representing the workflow
- `backend/app/Models/Order.php`
- `backend/app/Models/Payment.php`
- `backend/app/Models/Delivery.php`

---

## 2) Roles and what they can do (enforced by API middleware)

Backend uses JWT auth (`middleware('jwt.auth')`) and role guards (`middleware('role:<role>')`).

### Customer
- Browse catalog (public routes).
- Place order:
  - `POST /api/v1/orders`
  - `POST /api/v1/orders/place-with-payment` (PayMongo checkout-session flow, if used)
- Cancel order:
  - `POST /api/v1/orders/{id}/cancel`
- Track:
  - `GET /api/v1/orders/track/{orderNumber}`
  - `GET /api/v1/deliveries/track/{trackingNumber}`
- Rate rider:
  - `POST /api/v1/orders/{orderId}/rate-rider`

### Supplier
- Update order fulfillment stage:
  - `PUT /api/v1/supplier/orders/{id}/status`
- Logistics station intake (handoff):
  - `POST /api/v1/supplier/deliveries/{id}/arrive-station`
- View supplier-scoped delivery list:
  - `GET /api/v1/supplier/deliveries`

### Rider
- View assigned deliveries:
  - `GET /api/v1/rider/deliveries`
- View claimable deliveries (at station, unassigned):
  - `GET /api/v1/rider/deliveries/claimable`
- Claim a delivery:
  - `POST /api/v1/rider/deliveries/{id}/claim`
- Update delivery status:
  - `PUT /api/v1/rider/deliveries/{id}/status`
- Update rider location:
  - `PUT /api/v1/rider/deliveries/{id}/location`
- Complete delivery with proof:
  - `POST /api/v1/rider/deliveries/{id}/complete`

### Admin
- Monitoring and oversight dashboards:
  - Orders: `GET /api/v1/admin/orders` via `DeliveryController`/`OrderController`-scoped routes
  - Deliveries: `GET /api/v1/admin/deliveries`
  - Logistics: `GET /api/v1/admin/logistics/catalog` (catalog only)
  - Payments: `GET /api/v1/admin/payments`
- Admin can list/filter; admin transaction updates are disabled in workflow controllers.

---

## Status Lifecycle (Order / Payment / Delivery)

This section lists the states and explains who updates them.

### 3.1 Order statuses (`Order::status`)
Defined in `backend/app/Models/Order.php`:
- `pending`
- `confirmed`
- `processing`
- `shipped`
- `out_for_delivery`
- `delivered`
- `cancelled`
- `refunded`

Who updates Order status?
- Supplier:
  - `PUT /api/v1/supplier/orders/{id}/status`
  - Valid target transitions are enforced in `OrderController::isSupplierStatusTransitionAllowed()`.
  - Side effects:
    - When supplier sets `shipped`, delivery becomes `in_transit`.
    - When supplier sets `cancelled`, stock is restored and payment is cancelled if not completed.
- Customer:
  - Cancel (limited states only): `POST /api/v1/orders/{id}/cancel`
  - Cancellation restores stock + sets payment to cancelled.
- Delivery workflow (rider):
  - When rider sets delivery `out_for_delivery`, order becomes `out_for_delivery`.
  - When rider sets delivery `delivered`, order becomes `delivered`.

Order timestamps:
- On `shipped`: `shipped_at` is set.
- On `delivered`: `delivered_at` is set and COD payment is completed (if applicable).

### 3.2 Payment statuses (`Payment::status`)
Defined in `backend/app/Models/Payment.php`:
- `pending`
- `processing`
- `completed`
- `failed`
- `refunded`
- `cancelled`

Who updates Payment status?
- `POST /api/v1/orders` and `POST /api/v1/orders/place-with-payment` create Payment records.
- Mock gateway processing:
  - `POST /api/v1/payments/process/{orderId}`
  - Updates payment to `completed` by deducting `gcash_balance` and then clears cart.
  - Note: order typically remains pending by design; fulfillment still drives delivery.
- PayMongo webhook:
  - `POST /api/v1/payments/paymongo/webhook`
  - Marks payment completed/failed based on webhook event type.

### 3.3 Delivery statuses (`Delivery::status`)
Defined in `backend/app/Models/Delivery.php`:
- `pending`
- `assigned`
- `picked_up`
- `in_transit`
- `out_for_delivery`
- `delivered`
- `failed`
- `returned`

Who updates Delivery status?
- Supplier logistics intake:
  - `POST /api/v1/supplier/deliveries/{id}/arrive-station`
  - Sets logistics fields and moves delivery into `in_transit`.
  - May auto-assign a rider and set `assigned`.
- Rider:
  - `POST /api/v1/rider/deliveries/{id}/claim`
  - `PUT /api/v1/rider/deliveries/{id}/status`
  - `PUT /api/v1/rider/deliveries/{id}/location`
  - `POST /api/v1/rider/deliveries/{id}/complete`

Delivery timestamps:
- `picked_up` sets `picked_up_at`
- `delivered` sets `delivered_at`

Delivery note:
- Rider actions synchronize important delivery statuses back into order statuses (`out_for_delivery`, `delivered`).

---

## Checkout → Payment → Delivery Sequences

This section explains how the system runs in real use, matching your current code.

### 4.1 Customer COD (happy path)

Sequence:
1. Customer uses `frontend/src/pages/Checkout.jsx` and selects `payment_method=cod`
2. Frontend calls:
   - `POST /api/v1/orders`
3. Backend (`OrderController@store`) creates together:
   - `Order(status=pending)`
   - `OrderItems`
   - Decreases stock immediately
   - `Payment(status=pending, payment_method=cod)`
   - `Delivery(status=pending)`
   - Clears cart (COD only)
4. Supplier updates fulfillment:
   - `PUT /api/v1/supplier/orders/{id}/status` to `confirmed`, then `processing`, then `shipped`
   - When `shipped`, delivery is moved to `in_transit`
5. Supplier logs station intake:
   - `POST /api/v1/supplier/deliveries/{deliveryId}/arrive-station`
   - Sets `station_arrived_at`, logistics fields, and may auto-assign a rider
6. Rider executes last-mile:
   - `POST /api/v1/rider/deliveries/{id}/claim` (if not auto-assigned)
   - `PUT /api/v1/rider/deliveries/{id}/status` with progress
   - `POST /api/v1/rider/deliveries/{id}/complete` with recipient/proof
7. Order completion:
   - When delivered, backend completes COD payment (if applicable) via `Order::completeCodPaymentIfApplicable()`.

### 4.2 Customer GCash QR path as implemented in the frontend UI

Important implementation detail:
- The frontend’s “GCash QR” flow in `frontend/src/pages/Checkout.jsx` creates the order using `POST /api/v1/orders` (with `payment_method=gcash`), and then polls `GET /api/v1/orders/{id}` until it considers the payment “paid”.
- The UI does not automatically call the PayMongo checkout-session endpoint.

Sequence:
1. Customer selects `payment_method=gcash` in `Checkout.jsx`
2. Frontend creates an order only at the payment step (still via `ordersAPI.create`)
   - Backend creates:
     - `Payment(status=processing, payment_method=gcash)`
     - `Delivery(status=pending)`
3. Frontend polls order:
   - `GET /api/v1/orders/{orderId}`
4. Payment becomes “completed” only if something updates the Payment record:
   - Mock payment processing via `POST /api/v1/payments/process/{orderId}`, or
   - PayMongo webhook, but only if PayMongo checkout session flow is used and webhooks arrive.

### 4.3 PayMongo checkout-session flow (backend-supported)

Sequence (backend endpoint):
1. Frontend would call:
   - `POST /api/v1/orders/place-with-payment`
2. Backend (`OrderController@storeWithPayment`) does:
   - Creates `Order`, `Payment(status=processing, payment_method=gcash)`, and `Delivery`
   - Creates a PayMongo checkout session and stores:
     - `payment_details.checkout_session_id`
     - `payment_details.checkout_url`
   - Returns `checkout_url` to redirect customer
3. PayMongo calls:
   - `POST /api/v1/payments/paymongo/webhook`
4. Backend (`PaymentController@paymongoWebhook`) maps webhook to local payment and updates:
   - `Payment(status=completed)` for paid events
   - `Payment(status=failed)` for failed/expired events

### 4.4 Supplier logistics handoff + rider claim

Sequence:
1. Supplier sets `Order` to `shipped`
2. Supplier checks in at logistics station:
   - `POST /api/v1/supplier/deliveries/{id}/arrive-station`
3. Delivery is moved to hub context:
   - sets `logistics_region`, `logistics_provider`, `logistics_station_name`, `station_arrived_at`
   - sets `status` to `in_transit`
   - selects best rider if any and may set `assigned`
4. Rider:
   - If unassigned, rider claims:
     - `POST /api/v1/rider/deliveries/{id}/claim`
   - Rider updates delivery status/location and completes delivery.

---

## 5) How to Demonstrate the System (One presenter, 4 sessions)

This is the recommended demo runbook (short but complete) you can follow live.

### 5.1 Preparation
1. Start backend + frontend
2. Ensure you have:
   - 1 admin
   - 1 supplier with products + a store
   - 1 active rider
   - 1 customer
3. Optional for GCash visuals:
   - Configure admin settings:
     - `gcash_qr_image_url`
     - `gcash_receiver_name`
     - `gcash_receiver_number`

### 5.2 Open 4 browser sessions
- Session A: Customer
- Session B: Supplier (`/supplier`)
- Session C: Rider (`/rider`)
- Session D: Admin (`/admin`)

Keep them logged in.

### 5.3 Script (10 to 15 minutes)

Phase 1 (Customer - Order)
- Customer: add 1 item to cart
- Go to `Checkout`
- Choose `Cash on Delivery`
- Place order

Phase 2 (Supplier - Fulfillment)
- Supplier: open `/supplier/orders`
- Confirm
- Set Processing
- Fulfill (Ship)

Phase 3 (Supplier - Logistics station intake)
- Supplier: open `/supplier/logistics`
- Open the shipped delivery
- Select region, provider, branch
- Click `Receive at station & notify customer`

Phase 4 (Rider - Delivery execution)
- Rider: open `/rider/deliveries`
- Claim the delivery (if needed)
- Move it forward:
  - `Pick Up`
  - `Start Delivery` (in_transit)
  - `Out for Delivery`
  - `Complete` (enter recipient name)

Phase 5 (Admin - Monitoring)
- Admin:
  - `/admin/orders`
  - `/admin/deliveries`
  - `/admin/payments`
  - `/admin/logistics`

Phase 6 (Customer - Verify)
- Customer:
  - refresh order detail page
  - confirm status is `delivered`
  - view delivery information (tracking number, rider)

### 5.4 Backup demo rules
- If payment visuals are unclear, stick to COD for a guaranteed full path.
- If rider claim queue is empty, wait for auto-assignment or re-open supplier logistics intake.
- If delivery does not move, verify the rider’s assigned delivery permissions and rider account activation.

---

## 6) Where to look when something doesn’t work

- Backend route mismatch:
  - check `backend/routes/api.php`
- Order creation and stock changes:
  - `backend/app/Http/Controllers/Api/OrderController.php`
- Payment completion:
  - `backend/app/Http/Controllers/Api/PaymentController.php`
  - verify whether PayMongo webhook or mock `payments/process` is being used
- Logistics intake + rider claim + status sync:
  - `backend/app/Http/Controllers/Api/DeliveryController.php`
- Frontend expected behavior:
  - `frontend/src/pages/Checkout.jsx` (especially for GCash)
  - `frontend/src/services/api.js` (baseURL and token)

