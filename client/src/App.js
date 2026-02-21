import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PatientDashboard from './pages/PatientDashboard';
import PatientAppointments from './pages/PatientAppointments';
import PatientChat from './pages/PatientChat';
import PatientProfile from './pages/PatientProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminPatients from './pages/admin/AdminPatients';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminBookAppointment from './pages/admin/AdminBookAppointment';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminChat from './pages/admin/AdminChat';
import AdminDoctorNotes from './pages/admin/AdminDoctorNotes';
import BookAppointment from './pages/BookAppointment';
import Consultation from './pages/Consultation';
import PaymentPage from './pages/PaymentPage';
import Prescriptions from './pages/Prescriptions';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    checkAuth();
    setLoading(false);

    // Listen for storage changes (logout from other tabs or within the app)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
            <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            {userRole === 'patient' && (
              <>
                <Route path="/dashboard" element={<PatientDashboard />} />
                <Route path="/book-appointment" element={<BookAppointment />} />
                <Route path="/appointments" element={<PatientAppointments />} />
                <Route path="/chat" element={<PatientChat />} />
                <Route path="/profile" element={<PatientProfile />} />
                <Route path="/consultation/:appointmentId" element={<Consultation />} />
                <Route path="/payment/:appointmentId" element={<PaymentPage />} />
                <Route path="/prescriptions" element={<Prescriptions />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </>
            )}
            {userRole === 'admin' && (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/schedule" element={<AdminSchedule />} />
                <Route path="/admin/approvals" element={<AdminApprovals />} />
                <Route path="/admin/book-for-patient" element={<AdminBookAppointment />} />
                <Route path="/admin/doctors" element={<AdminDoctors />} />
                <Route path="/admin/chat" element={<AdminChat />} />
                <Route path="/admin/doctor-notes" element={<AdminDoctorNotes />} />
                <Route path="/admin/appointments" element={<AdminAppointments />} />
                <Route path="/admin/patients" element={<AdminPatients />} />
                <Route path="/consultation/:appointmentId" element={<Consultation />} />
                <Route path="*" element={<Navigate to="/admin" />} />
              </>
            )}
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
