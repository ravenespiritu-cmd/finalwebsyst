# Ganda Hub Cosmetics - E-Commerce System

A modern, full-stack e-commerce web application for cosmetics and beauty products built with React (Frontend) and Laravel (Backend API).

> **📄 Project Proposal:** See [PROJECT_PROPOSAL.md](PROJECT_PROPOSAL.md) for the full functional and non-functional requirements document.

## Features

### Customer Features
- Browse products by categories
- Product search and filtering
- Shopping cart management
- Secure checkout process
- Order tracking
- User profile management
- Product reviews

### Admin Features
- Dashboard with analytics
- Product management (CRUD)
- Category management
- Inventory management with low stock alerts
- Order management and status updates
- Customer management
- Payment management
- Delivery management and rider assignment
- Reports generation (Sales, Inventory, Revenue, etc.)
- System settings configuration
- Database backup support

### Rider Features
- Delivery dashboard
- View assigned deliveries
- Update delivery status
- Mark deliveries as complete

## Tech Stack

### Frontend
- **React 18** - UI library
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Toastify** - Notifications
- **React Icons** - Icon library
- **Vite** - Build tool

### Backend
- **Laravel 10** - PHP Framework
- **MySQL** - Database
- **JWT Auth** - Authentication
- **Laravel Eloquent** - ORM

## Tools & Services Used

| Tool | Purpose |
|------|---------|
| **Railway** | Backend API hosting & deployment |
| **Cloudinary** | Product image storage, transformation & CDN |
| **Laravel Socialite** | OAuth package for "Continue with Google" login |
| **Google Cloud Console** | OAuth 2.0 credentials (Client ID & Secret) for Google sign-in |
| **Laravel Herd** | Local development environment (PHP, Nginx, MySQL) |
| **XAMPP** | Alternative local server stack (Apache, MySQL, PHP) |
| **Navicat** | Database GUI for MySQL management (optional) |

## Project Structure

```
websystproj/
├── backend/                 # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   └── Middleware/
│   │   ├── Models/
│   │   └── Providers/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   └── ...
│
├── frontend/                # React Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   └── layout/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   └── rider/
│   │   └── services/
│   └── ...
│
└── README.md
```

## Installation

### Prerequisites
- PHP 8.1+ (Laravel Herd recommended)
- Composer
- Node.js 18+
- npm or yarn
- MySQL 8.0+

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install PHP dependencies:
```bash
composer install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Configure your database in `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gandahub_cosmetics
DB_USERNAME=root
DB_PASSWORD=your_password
```

5. Generate application key:
```bash
php artisan key:generate
```

6. Generate JWT secret:
```bash
php artisan jwt:secret
```

7. Run migrations and seeders:
```bash
php artisan migrate --seed
```

8. Start the development server:
```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Default Login Credentials

After running the database seeder, you can use these accounts:

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Admin    | admin@gandahub.com     | password123 |
| Rider    | rider@gandahub.com     | password123 |
| Customer | customer@gandahub.com  | password123 |

## API Endpoints

### Authentication
- `POST /api/v1/register` - Register new user
- `POST /api/v1/login` - Login
- `POST /api/v1/logout` - Logout
- `GET /api/v1/me` - Get current user

### Products
- `GET /api/v1/products` - List products
- `GET /api/v1/products/{id}` - Get product details
- `GET /api/v1/products/featured` - Featured products
- `GET /api/v1/products/on-sale` - Products on sale

### Categories
- `GET /api/v1/categories` - List categories
- `GET /api/v1/categories/{id}` - Get category details

### Cart
- `GET /api/v1/cart` - Get cart
- `POST /api/v1/cart/items` - Add item
- `PUT /api/v1/cart/items/{id}` - Update item
- `DELETE /api/v1/cart/items/{id}` - Remove item

### Orders
- `GET /api/v1/orders` - List orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/{id}` - Get order details
- `GET /api/v1/orders/track/{orderNumber}` - Track order

### Admin Routes (Requires admin role)
- `GET /api/v1/admin/users` - Manage users
- `GET /api/v1/admin/products` - Manage products
- `GET /api/v1/admin/orders` - Manage orders
- `GET /api/v1/admin/deliveries` - Manage deliveries
- `GET /api/v1/admin/reports/dashboard` - Dashboard stats

## Security Features

- JWT token-based authentication
- Role-based access control (Admin, Customer, Rider)
- Password encryption using bcrypt
- CSRF protection
- SQL injection prevention via Eloquent ORM
- XSS protection
- CORS configuration
- Rate limiting

## Database Schema (ERD)

The system includes the following entities:
- **Users** - Customers, Admins, Riders
- **Categories** - Product categories with parent/child support
- **Products** - Product catalog with inventory
- **Carts** - Shopping cart
- **CartItems** - Individual cart items
- **Orders** - Customer orders
- **OrderItems** - Order line items
- **Payments** - Payment records
- **Deliveries** - Delivery tracking
- **Reviews** - Product reviews
- **Reports** - Generated reports
- **SystemSettings** - Application configuration

## Quality Attributes (ISO/IEC 25010)

- **Functional Suitability** - Complete e-commerce functionality
- **Performance Efficiency** - Optimized queries and caching
- **Compatibility** - Responsive design for all devices
- **Usability** - Intuitive UI/UX design
- **Reliability** - Error handling and validation
- **Security** - JWT auth, encryption, role-based access
- **Maintainability** - Clean code architecture
- **Portability** - Docker-ready configuration

## Coupon Codes

The following coupon codes are available for testing:
- `WELCOME10` - 10% off
- `SAVE20` - 20% off
- `GANDA15` - 15% off

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, email support@gandahub.com or create an issue in the repository.
