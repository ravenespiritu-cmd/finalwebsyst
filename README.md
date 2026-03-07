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



## Deploying backend to Railway

This repo is a monorepo (frontend + backend). To deploy only the **backend** on Railway:

1. In your Railway project, open the backend service.
2. Go to **Settings** → **Build**.
3. **Root Directory:** leave **empty** (so the build context is the full repo).
4. **Dockerfile path** (or variable `RAILWAY_DOCKERFILE_PATH`): set to `backend/Dockerfile` so Railway uses the backend Dockerfile.
5. Redeploy (e.g. trigger a new deployment or push a commit).

The Dockerfile copies `backend` into the image, so the app runs correctly.

---

## Coupon Codes

The following coupon codes are available for testing:
- `WELCOME10` - 10% off
- `SAVE20` - 20% off
- `GANDA15` - 15% off
