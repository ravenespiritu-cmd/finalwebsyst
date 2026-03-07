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



## Production setup (Vercel + Railway)

For **login, register, and product images** to work when the frontend is on Vercel and the backend on Railway, set these environment variables.

### Vercel (frontend)

1. Open your project on [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_URL`  
   - **Value:** Your Railway backend API URL, e.g. `https://your-app.up.railway.app/api/v1`  
     (Use the **public URL** of your Railway service, then add `/api/v1`.)
3. **Redeploy** the frontend so the new variable is applied. The build writes it into `public/config.json`, and the app loads that at startup.

Without `VITE_API_URL` pointing to your Railway backend (e.g. `https://websystemprojectf-production.up.railway.app/api/v1`), the site will call the wrong API and login/register will fail and products won’t load.

### Railway (backend)

1. In your Railway project, open the **backend (app) service** → **Variables**.
2. Set:
   - **APP_URL** = your Railway public URL, e.g. `https://your-app.up.railway.app`
   - **FRONTEND_URL** = your Vercel URL, e.g. `https://websystemprojectf.vercel.app`  
     (Required for CORS and OAuth redirects.)
   - **APP_DEBUG** = `false` in production (so DB/stack traces are not sent to the frontend).
3. **Database:** The app reads `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`. If you use Railway’s **MySQL** service, add its variables to this service:
   - Either use **Variable Reference** (e.g. reference `MYSQLHOST` as `DB_HOST`, `MYSQLPORT` as `DB_PORT`, etc.), **or**
   - Copy the MySQL service’s connection variables into this service and set **DB_HOST**, **DB_PORT**, **DB_DATABASE**, **DB_USERNAME**, **DB_PASSWORD** (the app also accepts **MYSQLHOST**, **MYSQLPORT**, **MYSQLDATABASE**, **MYSQLUSER**, **MYSQLPASSWORD** if `DB_*` are not set).
4. Set **APP_KEY** and **JWT_SECRET** as needed.

---

## Deploying backend to Railway

This repo is a monorepo (frontend + backend). To deploy only the **backend** on Railway:

1. In your Railway project, open the backend service.
2. Go to **Settings** → **Build**.
3. **Root Directory:** leave **empty** (so the build context is the full repo).
4. **Dockerfile path** (or variable `RAILWAY_DOCKERFILE_PATH`): set to `backend/Dockerfile` so Railway uses the backend Dockerfile.
5. Redeploy (e.g. trigger a new deployment or push a commit).

The Dockerfile copies `backend` into the image, so the app runs correctly.

### Seeing "0 products" or no product images?

- **If the Products page shows a red error** (e.g. "Could not load products"): the frontend can’t reach the backend. Check that `VITE_API_URL` on Vercel is your Railway URL + `/api/v1`, that the Railway service is running, and that you redeployed the frontend after changing env vars.
- **If it says "No products found" with no error**: the database has no products yet. The deploy runs `php artisan migrate --force` and `php artisan db:seed --force` on startup. If the DB was created later or the seed failed, run the seeder manually on Railway:
  1. In Railway, open your backend service.
  2. Use **Settings** → run a one-off command, or open the **Deployments** tab and use the **⋮** menu on a deployment to run a command in the container.
  3. Run: `php artisan db:seed --force`  
  This adds sample categories, products, and users (e.g. admin@gandahub.com / password123). Then refresh the storefront.

---

## Coupon Codes

The following coupon codes are available for testing:
- `WELCOME10` - 10% off
- `SAVE20` - 20% off
- `GANDA15` - 15% off
