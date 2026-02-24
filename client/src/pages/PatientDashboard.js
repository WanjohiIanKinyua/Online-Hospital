import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { FiVideo, FiCalendar, FiCheckCircle, FiFileText } from 'react-icons/fi';
import '../styles/ModernDashboard.css';
import { API_BASE_URL } from '../config/api';

function PatientDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState({
    completedConsultations: 0,
    upcomingAppointments: 0,
    totalPayments: 0,
    pendingPrescriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [loginNotification, setLoginNotification] = useState('');
  const token = localStorage.getItem('token');

  const getLatestBookingStatus = (appointmentsList = []) => {
    const sorted = [...appointmentsList].sort((a, b) => {
      const aDate = new Date(a.createdAt || a.createdat || a.appointmentDate || 0).getTime();
      const bDate = new Date(b.createdAt || b.createdat || b.appointmentDate || 0).getTime();
      return bDate - aDate;
    });

    const latest = sorted[0];
    if (!latest) return null;
    if (latest.approvalStatus === 'approved') return 'approved';
    if (latest.approvalStatus === 'rejected') return 'rejected';
    return null;
  };

  const buildPatientNotification = (unreadFromAdmin, latestBookingStatus) => {
    const parts = [];
    if (unreadFromAdmin > 0) {
      parts.push(`You have received ${unreadFromAdmin} new message${unreadFromAdmin === 1 ? '' : 's'} from admin.`);
    }
    if (latestBookingStatus === 'approved') {
      parts.push('Your latest booking has been approved.');
    } else if (latestBookingStatus === 'rejected') {
      parts.push('Your latest booking has been rejected.');
    }
    return parts.join(' ');
  };

  useEffect(() => {
    const isFreshLogin = localStorage.getItem('loginSuccess') === '1';
    if (isFreshLogin) {
      setShowLoginSuccess(true);
      localStorage.removeItem('loginSuccess');
      setTimeout(() => setShowLoginSuccess(false), 3000);
    }

    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [appointmentsRes, prescriptionsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/appointments`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/prescriptions`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const appts = appointmentsRes.data;
        const rxs = prescriptionsRes.data;

        setAppointments(appts);
        setPrescriptions(rxs);

        // Calculate stats
        const completed = appts.filter(a => a.status === 'completed').length;
        const upcoming = appts.filter(a => a.status === 'confirmed' && new Date(a.appointmentDate) >= new Date()).length;
        const pending = rxs.filter(r => !r.isDownloaded).length;

        setStats({
          completedConsultations: completed,
          upcomingAppointments: upcoming,
          totalPayments: appts.length,
          pendingPrescriptions: pending
        });

        if (isFreshLogin) {
          let unreadFromAdmin = 0;
          try {
            const unreadRes = await axios.get(`${API_BASE_URL}/api/chat/unread-summary`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            unreadFromAdmin = Number(unreadRes.data?.unreadFromAdmin || unreadRes.data?.unreadTotal || 0);
          } catch (error) {
            unreadFromAdmin = 0;
          }

          const latestBookingStatus = getLatestBookingStatus(appts);
          const popupMessage = buildPatientNotification(unreadFromAdmin, latestBookingStatus);
          if (popupMessage) {
            setLoginNotification(popupMessage);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, token]);

  useEffect(() => {
    if (!loginNotification) return undefined;
    const timer = setTimeout(() => setLoginNotification(''), 60000);
    return () => clearTimeout(timer);
  }, [loginNotification]);

  useEffect(() => {
    if (!loginNotification || !token) return undefined;

    let stopped = false;

    const refreshNotification = async () => {
      try {
        const [unreadRes, appointmentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/chat/unread-summary`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/appointments`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (stopped) return;

        const unreadFromAdmin = Number(unreadRes.data?.unreadFromAdmin || unreadRes.data?.unreadTotal || 0);
        const latestBookingStatus = getLatestBookingStatus(appointmentsRes.data || []);
        const popupMessage = buildPatientNotification(unreadFromAdmin, latestBookingStatus);
        if (popupMessage) {
          setLoginNotification(popupMessage);
        } else {
          setLoginNotification('');
        }
      } catch (error) {
        // Keep current notification if refresh fails.
      }
    };

    const intervalId = setInterval(refreshNotification, 8000);
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [loginNotification, token]);

  const upcomingAppointments = appointments
    .filter(a => a.status === 'confirmed' && new Date(a.appointmentDate) >= new Date())
    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
    .slice(0, 3);

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getApprovalColor = (approvalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
      default:
        return 'status-pending';
    }
  };

  const renderConsultationAction = (appointment) => {
    if (appointment.approvalStatus === 'approved') {
      if (appointment.status === 'completed') {
        return <span className="text-muted">Session completed</span>;
      }
      return (
        <Link to={`/consultation/${appointment.id}`} className="btn-join-meeting">
          <FiVideo /> Enter Care Room
        </Link>
      );
    }

    if (appointment.approvalStatus === 'rejected') {
      return <span className="text-muted">Not approved</span>;
    }

    return <span className="text-muted">Awaiting doctor approval</span>;
  };

  return (
    <DashboardLayout role="patient">
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-text">
            <h1 className="dashboard-title">Patient Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back! Here's your health overview.</p>
          </div>
        </div>

        {showLoginSuccess && (
          <div className="login-success-banner">You have successfully logged in.</div>
        )}
        {loginNotification && (
          <div className="dashboard-login-popup" role="status" aria-live="polite">
            <div className="dashboard-login-popup-text">{loginNotification}</div>
            <button
              type="button"
              className="dashboard-login-popup-close"
              onClick={() => setLoginNotification('')}
              aria-label="Close notification"
            >
              x
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon completed">
                  <FiCheckCircle />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Consultations</p>
                  <p className="stat-value">{stats.completedConsultations}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon upcoming">
                  <FiCalendar />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Upcoming</p>
                  <p className="stat-value">{stats.upcomingAppointments}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon payments">
                  <FiVideo />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Bookings</p>
                  <p className="stat-value">{stats.totalPayments}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon prescriptions">
                  <FiFileText />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Prescriptions</p>
                  <p className="stat-value">{prescriptions.length}</p>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-section">
                  <h2 className="card-title">Upcoming Appointments</h2>
                </div>
                <Link to="/book-appointment" className="btn-primary-small">
                  <span>+ Book New</span>
                </Link>
              </div>
              <div className="card-content">
                {upcomingAppointments.length === 0 ? (
                  <p className="empty-message">No upcoming appointments. Book a consultation to get started.</p>
                ) : (
                  <div className="appointments-list">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="appointment-item">
                        <div className="appointment-info">
                          <p className="appointment-date">
                            {formatDate(appointment.appointmentDate)}
                          </p>
                          <span className={`status-badge ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        {appointment.meetingLink ? (
                          <a
                            href={appointment.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-join-meeting"
                          >
                            <FiVideo /> Join Meeting
                          </a>
                        ) : (
                          <span className="text-muted">Meeting link pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Prescriptions */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Recent Prescriptions</h2>
              </div>
              <div className="card-content">
                {prescriptions.length === 0 ? (
                  <p className="empty-message">No prescriptions yet. They will appear here after your consultations.</p>
                ) : (
                  <div className="prescriptions-list">
                    {prescriptions.slice(0, 3).map((prescription) => (
                      <div key={prescription.id} className="prescription-item">
                        <div className="prescription-info">
                          <p className="prescription-date">
                            {formatDate(prescription.issuedAt)}
                          </p>
                          <p className="prescription-text">{prescription.medications || 'Prescription details'}</p>
                        </div>
                        <Link to="/prescriptions" className="btn-secondary-small">
                          View Details
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Booked Appointments */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Booked Appointments</h2>
              </div>
              <div className="card-content">
                {appointments.length === 0 ? (
                  <p className="empty-message">No booked appointments found yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="appointments-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Approval</th>
                          <th>Reason</th>
                          <th>Doctor</th>
                          <th>Consultation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appointment) => (
                          <tr key={appointment.id}>
                            <td>{formatDate(appointment.appointmentDate)}</td>
                            <td>
                              <span className={`status-badge ${getStatusColor(appointment.status)}`}>
                                {appointment.status}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${getApprovalColor(appointment.approvalStatus)}`}>
                                {appointment.approvalStatus || 'pending'}
                              </span>
                            </td>
                            <td>{appointment.approvalReason || <span className="text-muted">-</span>}</td>
                            <td>{appointment.doctorName || 'Dr. Merceline'}</td>
                            <td>{renderConsultationAction(appointment)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default PatientDashboard;
