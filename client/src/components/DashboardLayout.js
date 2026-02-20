import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiLogOut,
  FiLayout,
  FiCalendar,
  FiPlusSquare,
  FiMessageSquare,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiClock,
  FiCheckSquare,
  FiUserPlus,
  FiUser,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useState } from 'react';
import '../styles/DashboardLayout.css';

export function DashboardLayout({ children, role = 'patient' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userName = localStorage.getItem('userName') || 'User';
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

  const patientLinks = [
    { to: '/dashboard', icon: FiLayout, label: 'Overview' },
    { to: '/book-appointment', icon: FiPlusSquare, label: 'Book Appointment' },
    { to: '/appointments', icon: FiCalendar, label: 'Booked Appointments' },
    { to: '/chat', icon: FiMessageSquare, label: 'Chat Room' },
    { to: '/prescriptions', icon: FiFileText, label: 'Prescriptions' }
  ];

  const adminLinks = [
    { to: '/admin', icon: FiBarChart2, label: 'Overview' },
    { to: '/admin/schedule', icon: FiClock, label: 'Schedule' },
    { to: '/admin/approvals', icon: FiCheckSquare, label: 'Approvals' },
    { to: '/admin/book-for-patient', icon: FiUserPlus, label: 'Book Patient' },
    { to: '/admin/doctors', icon: FiUser, label: 'Doctors' },
    { to: '/admin/chat', icon: FiMessageSquare, label: 'Chat Room' },
    { to: '/admin/appointments', icon: FiCalendar, label: 'Appointments' },
    { to: '/admin/patients', icon: FiUsers, label: 'Patients' }
  ];

  const links = role === 'admin' ? adminLinks : patientLinks;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="brand-logo">
            <span className="brand-icon">+</span>
            <span className="brand-text-wrap">
              <span className="brand-name">{userName}</span>
              <span className="brand-status">
                <span className="status-dot" />
                online
              </span>
            </span>
          </Link>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <link.icon className="nav-icon" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <p className="user-email">{userEmail}</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut className="logout-icon" />
            Sign Out
          </button>
        </div>
      </aside>

      <button
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
      >
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="dashboard-main">{children}</main>
    </div>
  );
}

export default DashboardLayout;
