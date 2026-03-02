# Dr.Merceline Naserian Online Hospital

A full-stack telemedicine application built with:
- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL (Neon)
- Realtime: Socket.IO (consultation room)

## Tech Stack

### Frontend
- React 18
- React Router
- Axios
- React Icons
- CSS

### Backend
- Node.js
- Express
- PostgreSQL (`pg`)
- JWT auth
- bcryptjs
- Socket.IO

## Local Run (Desktop)

### 1) Backend
```bash
cd c:\xampp\htdocs\Hosi\server
npm install
npm start
```
Expected:
- `Server is running on port 5000`
- `PostgreSQL tables initialized successfully`

### 2) Frontend
```bash
cd c:\xampp\htdocs\Hosi\client
npm install
npm start
```
Open:
- `http://localhost:3000`

## Environment Variables

### Backend (`server/.env`)
```env
PORT=5000
JWT_SECRET=your-strong-secret
NODE_ENV=development
DATABASE_URL=postgresql://...your-neon-url...
```

### Frontend
- Development: `client/.env.development`
```env
REACT_APP_API_URL=http://localhost:5000
```
- Production: `client/.env.production`
```env
REACT_APP_API_URL=https://online-hospital.onrender.com
```

## Access

- Create your own user account through the registration page.
- Admin access credentials should be kept private in deployment or local environment setup, not committed to public documentation.

## Key Features

### Patient
- Register/Login
- Book appointment
- Payment flow (Card / M-Pesa simulation)
- Booked appointments page
- Chat with doctor
- Consultation room (video/mic controls)
- Prescriptions
- My Profile (view + update)

### Admin
- Dashboard overview
- Schedule management (single slot + bulk day/week)
- Appointment approvals
- Book appointment for patient
- Doctors management
- Patients management
- Admin chat
- Doctor Notes page (rich text summaries)

## Important Notes

- For Vercel mode, frontend must use a public backend URL.
- `localhost:5000` only works for local desktop testing.

## Main API Health Check

- `http://localhost:5000/api/health`

## Project Structure (Simplified)

```text
Hosi/
  server/
  client/
  README.md
  SETUP_INSTRUCTIONS.md
  QUICK_START.txt
```

## Version
- Updated: February 2026
