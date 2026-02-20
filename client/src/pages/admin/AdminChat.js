import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';
import '../../styles/ChatRoom.css';
import { API_BASE_URL } from '../../config/api';

function AdminChat() {
  const token = localStorage.getItem('token');
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [fallbackLinkInput, setFallbackLinkInput] = useState('');
  const [loading, setLoading] = useState(true);

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
    setFallbackLinkInput(selectedAppointment?.meetingLink || '');

    const intervalId = setInterval(() => {
      loadMessages(selectedAppointmentId);
      loadAppointments(false);
    }, 5000);

    return () => clearInterval(intervalId);
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedAppointmentId]);

  useEffect(() => {
    setFallbackLinkInput(selectedAppointment?.meetingLink || '');
  }, [selectedAppointment?.meetingLink]);

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

  const shareFallbackLink = async () => {
    if (!selectedAppointmentId || !fallbackLinkInput.trim()) {
      alert('Please enter a valid Google Meet link');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/chat/appointments/${selectedAppointmentId}/fallback-link`,
        { meetingLink: fallbackLinkInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadMessages(selectedAppointmentId);
      await loadAppointments(false);
      alert('Fallback link shared with patient');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to share fallback link');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="chat-loading">Loading chat...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="chat-page">
        <div className="chat-sidebar">
          <h3>Patient Chats</h3>
          {appointments.length === 0 ? (
            <p className="chat-empty">No appointment chats available.</p>
          ) : (
            appointments.map((apt) => (
              <button
                key={apt.id}
                className={`chat-thread ${selectedAppointmentId === apt.id ? 'active' : ''}`}
                onClick={() => setSelectedAppointmentId(apt.id)}
              >
                <div className="chat-thread-title">{apt.patientName}</div>
                <div className="chat-thread-sub">
                  {new Date(apt.appointmentDate).toLocaleDateString()} {apt.appointmentTime}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="chat-main">
          <div className="chat-main-header">
            <h2>Doctor Response Room</h2>
            {selectedAppointment && (
              <div className="chat-main-meta">
                <span>{selectedAppointment.patientName} ({selectedAppointment.patientEmail})</span>
              </div>
            )}
          </div>

          <div className="fallback-link-box">
            <input
              type="url"
              value={fallbackLinkInput}
              onChange={(e) => setFallbackLinkInput(e.target.value)}
              placeholder="Paste backup Google Meet link here"
            />
            <button type="button" onClick={shareFallbackLink}>Share Backup Link</button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">No messages in this conversation yet.</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.senderRole === 'admin' ? 'mine' : 'theirs'}`}>
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
              placeholder="Reply to patient..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button type="button" onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminChat;

