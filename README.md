# Dr.Merceline Naserian Online Hospital

A comprehensive full-stack telemedicine web application built with React, Node.js/Express, and SQLite. This platform enables patients to book medical consultations, make payments, attend online clinical sessions, and receive digital prescriptions.

## 🏥 Features

### Patient Features
- **User Registration & Authentication**: Secure signup and login system
- **Dashboard**: Personalized patient dashboard with:
  - Total consultations attended
  - Upcoming appointments
  - Previous appointment history
  - Payment history
  - Quick action buttons
- **Book Appointments**: Schedule consultations with preferred date, time, and doctor/department
- **Payment Processing**: Pay KSH 500 consultation fee with multiple payment methods:
  - Credit/Debit Card
  - Mobile Money (M-Pesa)
- **Online Consultations**: Secure video meeting links integrated with the appointment
- **View & Download Prescriptions**: Access digital prescriptions post-consultation
- **Profile Management**: Update personal information

### Admin Features
- **Admin Dashboard**: Comprehensive overview with:
  - Total registered patients
  - Total appointments booked
  - Completed consultations count
  - Pending appointments count
  - Total revenue generated
- **Appointment Management**:
  - View all appointments with patient details
  - Manage appointment status
  - Add meeting links for consultations
  - Mark consultations as completed
- **Patient Management**: View all registered patients and their details
- **Prescription Management**: Issue digital prescriptions with:
  - Medication details
  - Dosage instructions
  - Medical notes
  - Follow-up recommendations

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Icons** - Icon library
- **CSS3** - Styling with green (#27ae60) and blue (#2980b9) color scheme

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **CORS** - Cross-origin support

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **SQLite3** (usually comes with Node.js packages)

## 🚀 Installation & Setup

### 1. Clone/Navigate to Project
```bash
cd c:\xampp\htdocs\Hosi
```

### 2. Backend Setup

#### Install Backend Dependencies
```bash
cd server
npm install
```

#### Create Environment File
The `.env` file is already created with default settings:
```
PORT=5000
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
DATABASE_PATH=./hospital.db
```

#### Start Backend Server
```bash
npm start
```
or for development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

#### Install Frontend Dependencies
```bash
cd ../client
npm install
```

#### Start Frontend Development Server
```bash
npm start
```

The frontend will open at `http://localhost:3000`

## 📱 Application Flow

### Patient Journey
1. **Register** - Create new account with personal details
2. **Login** - Access personalized dashboard
3. **Book Appointment** - Select date, time, and preferred doctor
4. **Make Payment** - Pay KSH 500 consultation fee
5. **Receive Meeting Link** - Get secure video consultation link
6. **Join Consultation** - Attend online meeting with doctor
7. **Download Prescription** - Access digital prescription after consultation

### Admin Journey
1. **Login** - Access admin dashboard with credentials
2. **View Dashboard** - Monitor all key metrics and statistics
3. **Manage Appointments** - View, update status, and add meeting links
4. **Issue Prescriptions** - Create digital prescriptions for patients
5. **View Patients** - Monitor registered patients and their details

## 🔐 Default Demo Credentials

### Patient Account
- **Email**: patient@example.com
- **Password**: password

### Admin Account
- **Email**: admin@example.com
- **Password**: password

**Note**: Change these credentials in production!

## 📊 Database Structure

### Users Table
- id (Primary Key)
- fullName
- email (Unique)
- password (Hashed)
- phone
- role (patient/admin)
- dateOfBirth
- gender
- address
- createdAt

### Appointments Table
- id (Primary Key)
- patientId (Foreign Key)
- doctorName
- appointmentDate
- appointmentTime
- status (pending/confirmed/completed/cancelled)
- meetingLink
- paymentStatus
- consultationFee (default: 500)
- createdAt

### Payments Table
- id (Primary Key)
- appointmentId (Foreign Key)
- patientId (Foreign Key)
- amount
- paymentMethod
- transactionId (Unique)
- status
- paymentDate

### Prescriptions Table
- id (Primary Key)
- appointmentId (Foreign Key)
- patientId (Foreign Key)
- doctorName
- medications
- dosageInstructions
- medicalNotes
- followUpRecommendations
- issuedAt

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Appointments
- `POST /api/appointments/book` - Book new appointment
- `GET /api/appointments` - Get patient's appointments
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id/status` - Update appointment status
- `DELETE /api/appointments/:id` - Cancel appointment

### Payments
- `POST /api/payments/create` - Create payment
- `GET /api/payments/history` - Get payment history
- `GET /api/payments/appointment/:appointmentId` - Get appointment payment

### Prescriptions
- `POST /api/prescriptions/issue` - Issue prescription (Admin)
- `GET /api/prescriptions` - Get patient prescriptions
- `GET /api/prescriptions/:id` - Get prescription details
- `GET /api/prescriptions/appointment/:appointmentId` - Get prescription by appointment

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/appointments` - Get all appointments
- `GET /api/admin/patients` - Get all patients
- `PUT /api/admin/appointment-status` - Update appointment status
- `POST /api/admin/meeting-link` - Add meeting link

## 🎨 Color Scheme

The application uses a professional healthcare color scheme:
- **Primary Green**: #27ae60 (Health & Care)
- **Secondary Green**: #2ecc71 (Growth & Trust)
- **Primary Blue**: #2980b9 (Reliability & Security)
- **Secondary Blue**: #3498db (Communication)

## 📝 Key Features Implementation

### Secure Authentication
- Password hashing with bcryptjs
- JWT tokens for secure API access
- Role-based access control (RBAC)

### Payment Processing
- Simulated payment system for demo (KSH 500)
- Automatic appointment confirmation upon payment
- Payment history tracking

### Video Consultations
- Meeting link integration with appointments
- Admin can add Google Meet or Zoom links
- Patients can access secure links during appointments

### Digital Prescriptions
- Comprehensive prescription creation
- Download as text document
- Print functionality
- Medication and dosage tracking

## 🔒 Security Measures

- Password hashing with bcryptjs (10 salt rounds)
- JWT authentication for API endpoints
- CORS enabled for frontend communication
- Input validation on server-side
- SQL injection prevention with parameterized queries
- Environment variables for sensitive data

## 📞 Support & Help

For issues or questions:
1. Check the database is properly initialized
2. Ensure backend is running on port 5000
3. Verify all dependencies are installed
4. Check browser console for frontend errors
5. Review server logs for backend errors

## 🚀 Deployment Considerations

For production deployment:
1. Change JWT_SECRET in .env file
2. Update database path to permanent location
3. Implement actual payment gateway (M-Pesa, Stripe, etc.)
4. Add HTTPS/SSL certificates
5. Set NODE_ENV=production
6. Implement rate limiting
7. Add comprehensive logging
8. Set up automated backups
9. Implement email notifications
10. Add 2FA for admin accounts

## 📦 Project Structure

```
Hosi/
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── appointmentController.js
│   │   ├── paymentController.js
│   │   ├── prescriptionController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── prescriptionRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── database.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── PatientDashboard.js
│   │   │   ├── AdminDashboard.js
│   │   │   ├── BookAppointment.js
│   │   │   ├── PaymentPage.js
│   │   │   ├── Consultation.js
│   │   │   └── Prescriptions.js
│   │   ├── styles/
│   │   │   ├── AuthPages.css
│   │   │   ├── PatientDashboard.css
│   │   │   ├── AdminDashboard.css
│   │   │   ├── BookAppointment.css
│   │   │   ├── PaymentPage.css
│   │   │   ├── Consultation.css
│   │   │   └── Prescriptions.css
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
└── README.md
```

## 📄 License

This project is private and intended for healthcare use. All rights reserved.

## 👥 Contributors

Developed as a comprehensive telemedicine solution for Dr.Merceline Naserian Online Hospital.

---

**Version**: 1.0.0  
**Last Updated**: February 2026

For more information visit the application at `http://localhost:3000` after starting both servers.

