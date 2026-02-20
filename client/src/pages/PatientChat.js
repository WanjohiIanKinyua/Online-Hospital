import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import '../styles/ChatRoom.css';
import { API_BASE_URL } from '../config/api';

function PatientChat() {
  const token = localStorage.getItem('token');
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBackupLink, setSelectedBackupLink] = useState('');

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === selectedAppointmentId),
    [appointments, selectedAppointmentId]
  );

  useEffect(() => {
    loadAppointments();
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    if (!selectedAppointmentId) return;
    loadMessages(selectedAppointmentId);

    const intervalId = setInterval(() => {
      loadMessages(selectedAppointmentId);
      loadAppointments(false);
    }, 5000);

    return () => clearInterval(intervalId);
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedAppointmentId]);

  const loadAppointments = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
      if (!selectedAppointmentId && response.data.length > 0) {
        setSelectedAppointmentId(response.data[0].id);
      }
    } catch (error) {
      // no-op
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadMessages = async (appointmentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/appointments/${appointmentId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      // no-op
    }
  };

  const sendMessage = async () => {
    if (!selectedAppointmentId || !messageInput.trim()) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/chat/appointments/${selectedAppointmentId}/messages`,
        { message: messageInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessageInput('');
      await loadMessages(selectedAppointmentId);
      await loadAppointments(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send message');
    }
  };

  const openBackupLinkModal = (e, link) => {
    e.preventDefault();
    if (!link) return;
    setSelectedBackupLink(link);
  };

  const copyBackupLink = async () => {
    if (!selectedBackupLink) return;
    try {
      await navigator.clipboard.writeText(selectedBackupLink);
      alert('Backup meet link copied.');
    } catch (copyError) {
      alert('Failed to copy link. Please copy it manually.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="patient">
        <div className="chat-loading">Loading chat...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="chat-page">
        <div className="chat-sidebar">
          <h3>Your Appointment Chats</h3>
          {appointments.length === 0 ? (
            <p className="chat-empty">No appointments available for chat.</p>
          ) : (
            appointments.map((apt) => (
              <button
                key={apt.id}
                className={`chat-thread ${selectedAppointmentId === apt.id ? 'active' : ''}`}
                onClick={() => setSelectedAppointmentId(apt.id)}
              >
                <div className="chat-thread-title">
                  {new Date(apt.appointmentDate).toLocaleDateString()} {apt.appointmentTime}
                </div>
                <div className="chat-thread-sub">{apt.lastMessage || 'No messages yet'}</div>
              </button>
            ))
          )}
        </div>

        <div className="chat-main">
          <div className="chat-main-header">
            <h2>Doctor Chat Room</h2>
            {selectedAppointment && (
              <div className="chat-main-meta">
                <span>Approval: {selectedAppointment.approvalStatus || 'pending'}</span>
                {selectedAppointment.meetingLink && (
                  <button
                    type="button"
                    className="backup-link-btn"
                    onClick={(e) => openBackupLinkModal(e, selectedAppointment.meetingLink)}
                  >
                    Open Backup Meet Link
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">Start the conversation with your doctor.</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.senderRole === 'patient' ? 'mine' : 'theirs'}`}>
                  <div className="chat-message-name">{msg.senderName}</div>
                  <div className="chat-message-text">{msg.message}</div>
                  <div className="chat-message-time">{new Date(msg.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          <div className="chat-input-bar">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your question or reminder to the doctor..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button type="button" onClick={sendMessage}>Send</button>
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
                <button type="button" className="btn-submit" onClick={copyBackupLink}>
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

export default PatientChat;

