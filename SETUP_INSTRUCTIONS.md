# 🚀 Dr.Merceline Naserian Online Hospital - Setup Instructions

Complete step-by-step guide to get the telemedicine platform running locally.

## ✅ Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

To verify installation, open Command Prompt/PowerShell and run:
```bash
node --version
npm --version
```

## 📂 Project Structure Overview

```
Hosi/
├── server/          # Node.js/Express backend
├── client/          # React frontend
└── README.md        # Main documentation
```

## 🔧 Backend Setup (Server)

### Step 1: Navigate to Server Directory
```bash
cd c:\xampp\htdocs\Hosi\server
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- express (web framework)
- sqlite3 (database)
- jsonwebtoken (authentication)
- bcryptjs (password hashing)
- cors (cross-origin support)
- dotenv (environment variables)
- nodemon (development hot-reload)

### Step 3: Verify Backend Setup
The `database.js` and `server.js` files are already configured. The database will be created automatically on first run.

### Step 4: Start Backend Server
```bash
npm start
```

Or for development mode with auto-reload:
```bash
npm run dev
```

Expected output:
```
Server is running on port 5000
Visit http://localhost:5000/api/health to check server status
Database tables initialized successfully
```

✅ Keep this terminal open with the backend running!

## 🎨 Frontend Setup (Client)

### Step 1: Open New Terminal/Command Prompt
Keep the backend terminal running and open a new one.

### Step 2: Navigate to Client Directory
```bash
cd c:\xampp\htdocs\Hosi\client
```

### Step 3: Install Dependencies
```bash
npm install
```

This will install React, React Router, Axios, and other frontend dependencies.

### Step 4: Start Frontend Development Server
```bash
npm start
```

Expected output:
```
Compiled successfully!

You can now view merceline-hospital-frontend in the browser.

Local:            http://localhost:3000
```

The application will automatically open in your default browser at `http://localhost:3000`

## 🔐 Login Credentials

Use these demo accounts to test the application:

### Patient Account
- **Email**: patient@example.com
- **Password**: password

### Admin Account
- **Email**: admin@example.com
- **Password**: password

## 📝 Testing Workflow

### 1. Test Patient Features
First terminal (Backend): Server running on port 5000 ✓
Second terminal (Frontend): App running on port 3000 ✓

1. Go to http://localhost:3000
2. Click "Login"
3. Enter patient credentials
4. Explore Dashboard:
   - View stats (consultations, appointments, spending)
   - Click "Book New Appointment"
   - Select date and time
   - Choose department
   - Click "Book Appointment & Proceed to Payment"
   - Complete payment with test card information
   - View appointment on dashboard

### 2. Test Admin Features
1. Logout from patient account (click Logout button)
2. Login with admin credentials
3. Admin Dashboard shows:
   - Total Patients
   - Total Appointments
   - Completed Consultations
   - Total Revenue
4. Manage appointments:
   - Click "Appointments" tab
   - Add meeting link for active consultations
   - Issue prescriptions
   - Mark consultations as completed
5. View all patients in "Patients" tab

## 🎯 Key Features to Test

### Patient Dashboard ✓
- [ ] Login successful
- [ ] Dashboard displays stats correctly
- [ ] Can book new appointments
- [ ] Can proceed to payment
- [ ] Appointment appears after payment

### Payment System ✓
- [ ] Payment form displays correctly
- [ ] Can select payment method (Card/M-Pesa)
- [ ] Payment confirmation shows
- [ ] Appointment status updates to "confirmed"

### Admin Panel ✓
- [ ] Login as admin works
- [ ] Can view all appointments
- [ ] Can add meeting links
- [ ] Can issue prescriptions
- [ ] Dashboard stats are accurate

### Online Consultations ✓
- [ ] Meeting link displays when confirmed
- [ ] Can join meeting from dashboard
- [ ] Meeting link opens in new tab

### Prescriptions ✓
- [ ] Can issue prescriptions from admin
- [ ] Prescriptions appear in patient dashboard
- [ ] Can download prescription
- [ ] Can print prescription

## 🛠️ Troubleshooting

### Problem: "Backend not running" or Connection Refused
**Solution**: 
- Ensure backend Terminal shows "Server is running on port 5000"
- Run `npm start` in the server directory
- Check if port 5000 is already in use

### Problem: "Cannot find module" errors
**Solution**:
- Run `npm install` again in both directories
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Problem: Database not initializing
**Solution**:
- Delete the `hospital.db` file in server directory
- Restart the backend server
- Database will be recreated automatically

### Problem: Frontend shows "Cannot GET /dashboard"
**Solution**:
- Ensure you're logged in first
- Check browser console for errors
- Make sure backend API is running

### Problem: "Port 3000 or 5000 already in use"
**Solution**:
```bash
# Find process using port 5000 and kill it
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm start
```

## 📚 API Documentation

All API endpoints require authentication token from login.

### Authentication Endpoints
```
POST /api/auth/register - Create new account
POST /api/auth/login - Login
GET /api/auth/profile - Get profile
PUT /api/auth/profile - Update profile
```

### Appointment Endpoints
```
POST /api/appointments/book - Book appointment
GET /api/appointments - Get all appointments
GET /api/appointments/:id - Get specific appointment
DELETE /api/appointments/:id - Cancel appointment
```

### Payment Endpoints
```
POST /api/payments/create - Create payment
GET /api/payments/history - Get payment history
```

### Prescription Endpoints
```
POST /api/prescriptions/issue - Issue prescription (Admin)
GET /api/prescriptions - Get prescriptions
```

### Admin Endpoints
```
GET /api/admin/dashboard - Dashboard stats
GET /api/admin/appointments - All appointments
GET /api/admin/patients - All patients
POST /api/admin/meeting-link - Add meeting link
PUT /api/admin/appointment-status - Update status
```

## 📊 Database Files

The SQLite database is created automatically:
```
c:\xampp\htdocs\Hosi\server\hospital.db
```

To view/manage the database, you can use:
- **SQLite Browser** - https://sqlitebrowser.org/
- **VS Code Extension** - SQLite Explorer

## 🔄 Development Workflow

1. **Make Backend Changes**
   - Edit files in `server/` directory
   - If using `npm run dev`, changes auto-reload
   - If using `npm start`, restart server manually

2. **Make Frontend Changes**
   - Edit files in `client/src/` directory
   - Changes auto-reload at http://localhost:3000
   - Check browser console for errors

## 📱 Testing Different Scenarios

### Scenario 1: Complete Patient Journey
1. Register new account
2. Login
3. Book appointment for tomorrow
4. Complete payment
5. View appointment status change to "confirmed"
6. (Admin: Add meeting link)
7. Join meeting from dashboard

### Scenario 2: Admin Management
1. Login as admin
2. View dashboard stats
3. Find patient's appointment
4. Add Google Meet link
5. Issue prescription
6. Mark as completed
7. (Patient: View prescription)

## 🎓 Learning Resources

- React Documentation: https://react.dev
- Express.js Guide: https://expressjs.com
- SQLite Docs: https://sqlite.org
- REST API Best Practices: https://restfulapi.net

## 📞 Support

If you encounter issues:

1. **Check both terminals are running**
   - backend: port 5000
   - frontend: port 3000

2. **Review error messages**
   - Browser console (F12)
   - Backend terminal output

3. **Common Fixes**
   - Restart both servers
   - Clear browser cache (Ctrl+Shift+Delete)
   - Delete and reinstall node_modules

## ✨ Next Steps

### Features to Extend
- [ ] Real phone payment integration (M-Pesa API)
- [ ] Email notifications for appointments
- [ ] SMS reminders
- [ ] Appointment rescheduling
- [ ] Doctor profiles and availability
- [ ] Patient medical history
- [ ] Lab results integration
- [ ] Appointment ratings/reviews

### Security Enhancements
- [ ] Two-factor authentication
- [ ] Google/Facebook login
- [ ] Rate limiting on APIs
- [ ] HTTPS with SSL certificates
- [ ] Comprehensive logging
- [ ] API versioning

### Performance Improvements
- [ ] Database query optimization
- [ ] Frontend code splitting
- [ ] Image optimization
- [ ] Caching strategies
- [ ] CDN integration

## 🎉 You're All Set!

Your telemedicine platform is now ready to use. Start with:

**Terminal 1** (Backend):
```bash
cd c:\xampp\htdocs\Hosi\server
npm start
```

**Terminal 2** (Frontend):
```bash
cd c:\xampp\htdocs\Hosi\client
npm start
```

Access the application at: **http://localhost:3000**

Enjoy working with Dr.Merceline Naserian Online Hospital! 🏥👨‍⚕️👩‍⚕️

