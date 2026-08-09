# MyWiFi Store

Full-stack India-wide WiFi product store.

## Requirements
- Node.js
- MongoDB running locally

## Backend
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev

Admin:
Email: admin@mywifi.in
Password: Admin@12345

## Frontend
Open a second terminal:
cd frontend
npm install
npm run dev

Open http://localhost:5173

## Important
Change ADMIN_PASSWORD and JWT_SECRET in backend/.env before using this outside local development.
This first version uses Cash on Delivery. Add a payment gateway and real shipping provider only after the basic store is tested.
