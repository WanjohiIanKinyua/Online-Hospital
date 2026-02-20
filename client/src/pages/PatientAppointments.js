import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { FiVideo } from 'react-icons/fi';
import '../styles/ModernDashboard.css';
import { API_BASE_URL } from '../config/api';

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBackupLink, setSelectedBackupLink] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointments(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [token]);

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

  const handleOpenBackupLink = (e, link) => {
    e.preventDefault();
    if (!link) return;
    setSelectedBackupLink(link);
  };

  const handleCopyBackupLink = async () => {
    if (!selectedBackupLink) return;
    try {
      await navigator.clipboard.writeText(selectedBackupLink);
      alert('Backup meet link copied.');
    } catch (copyError) {
      alert('Failed to copy link. Please copy it manually.');
    }
  };

  const renderConsultationAction = (appointment) => {
    if (appointment.approvalStatus === 'approved') {
      if (appointment.status === 'completed') {
        return <span className="text-muted">Session completed</span>;
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Link to={`/consultation/${appointment.id}`} className="btn-join-meeting">
            <FiVideo /> Enter Care Room
          </Link>
          {appointment.meetingLink && (
            <a
              href={appointment.meetingLink}
              onClick={(e) => handleOpenBackupLink(e, appointment.meetingLink)}
              className="btn-secondary-small"
            >
              Open Backup Meet Link
            </a>
          )}
        </div>
      );
    }

    if (appointment.approvalStatus === 'rejected') {
      return <span className="text-muted">Not approved</span>;
    }

    return <span className="text-muted">Awaiting doctor approval</span>;
  };

  if (loading) {
    return (
      <DashboardLayout role="patient">
        <div className="loading-spinner">Loading appointments...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-text">
            <h1 className="dashboard-title">Booked Appointments</h1>
            <p className="dashboard-subtitle">Track approval status and join consultations when approved</p>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            {error && <div className="alert alert-danger">{error}</div>}
            {!error && appointments.length === 0 ? (
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
                        <td>{new Date(appointment.appointmentDate).toLocaleDateString()} {appointment.appointmentTime}</td>
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
      </div>

      {selectedBackupLink && (
        <div className="modal active" onClick={() => setSelectedBackupLink('')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Backup Meet Link
              <span className="modal-close" onClick={() => setSelectedBackupLink('')}>&times;</span>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '0.75rem', color: '#374151' }}>
                The admin shared this backup meeting link for your appointment:
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  wordBreak: 'break-all'
                }}
              >
                {selectedBackupLink}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setSelectedBackupLink('')}>
                  Close
                </button>
                <button type="button" className="btn-submit" onClick={handleCopyBackupLink}>
                  Copy Link
                </button>
                <a
                  href={selectedBackupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-submit"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Open Link
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default PatientAppointments;
