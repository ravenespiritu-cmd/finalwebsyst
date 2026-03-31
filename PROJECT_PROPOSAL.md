# PROJECT PROPOSAL
## COSMETICS E-COMMERCE SYSTEM
### "Ganda Hub Cosmetics"

**Version:** Revised (March 31)

---

## I. Functional Requirements

### 1. User Management
- User registration and login for **Customers**, **Administrators**, and **Riders**
- User profile management (update personal information, address, and password)
- Role-based access control (**Admin**, **Customer**, **Rider**)
- Optional extension: supplier/store-owner role for marketplace operations

### 2. Product Management
- Product browsing by category (Face, Lips, Eyes, Skincare, etc.)
- Product search and filtering by price, brand, and popularity
- Product detail pages with images, descriptions, prices, and reviews
- Promotional product display (featured products, discounts, and vouchers)

### 3. Shopping and Order Processing
- Shopping cart management (add items, update quantity, remove items)
- Secure checkout and online payment processing
- Order confirmation with notifications (email/in-app, based on deployment configuration)
- Order tracking for customers

### 4. Inventory Management
- Real-time inventory tracking
- Automatic stock updates after successful orders
- Low-stock alerts for administrators

### 5. Delivery and Logistics
- Delivery management system for assigning and monitoring orders
- Rider dashboard to view assigned deliveries
- Delivery status updates (e.g., Out for Delivery, Delivered)

### 6. Administrative Functions
- Admin dashboard for managing products, categories, prices, and inventory
- Admin order management (view, process, ship, cancel)
- System settings configuration
- Report generation (sales, inventory, and user activity reports)

### 7. Customer Engagement
- Customer product reviews and ratings
- Promotional features such as vouchers and discount codes

---

## II. Non-Functional Requirements

### 1. Performance
- Pages must load within 3 seconds under normal network conditions
- The system must support high concurrent user traffic

### 2. Usability
- Mobile-responsive design for all device sizes
- Intuitive and user-friendly interface
- Standardized error handling and clear user feedback messages

### 3. Security
- Secure data transmission using SSL/HTTPS
- PCI-DSS-aligned handling of payment information
- Strict role-based access control (Admin, Customer, Rider)

### 4. Reliability and Availability
- Target system availability of 99.9% uptime
- Automated daily database backups
- Fast recovery from system failures

### 5. Compatibility
- Cross-browser compatibility (Chrome, Safari, Edge)

### 6. Scalability
- Ability to scale system resources as users, products, and transactions increase
- Support for future feature expansion without full system redesign

---
