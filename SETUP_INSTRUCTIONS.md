# Setup Instructions - Dr.Merceline Naserian Online Hospital

This guide is for running the project locally on desktop.

## 1. Prerequisites
- Node.js 14+
- npm
- Internet connection (PostgreSQL Neon is cloud-hosted)

## 2. Backend Setup

```bash
cd c:\xampp\htdocs\Hosi\server
npm install
```

Create/update `server/.env`:
```env
PORT=5000
JWT_SECRET=your-strong-secret
NODE_ENV=development
DATABASE_URL=postgresql://...your-neon-url...
```

Start backend:
```bash
npm start
```

Expected log:
- `Server is running on port 5000`
- `PostgreSQL tables initialized successfully`

Health check:
- `http://localhost:5000/api/health`

## 3. Frontend Setup

```bash
cd c:\xampp\htdocs\Hosi\client
npm install
npm start
```

Open:
- `http://localhost:3000`

## 4. Frontend API Environment

Use `client/.env.development`:
```env
REACT_APP_API_URL=http://localhost:5000
```

For production builds use `client/.env.production`:
```env
REACT_APP_API_URL=https://online-hospital.onrender.com
```

## 5. Login Credentials

Patient:
- Email: `patient@example.com`
- Password: `password`

Admin:
- Email: `drnaserian@admin.com`
- Password: `password`

## 6. Common Issues

### Port already in use
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Backend disconnect warning when idle
- Cloud PostgreSQL can terminate idle connections.
- App is configured to recover and continue.

### Vercel login/register fails
- Ensure Vercel uses public backend URL, not localhost:
  - `REACT_APP_API_URL=https://online-hospital.onrender.com`

## 7. What is built with what?
- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL (Neon)

