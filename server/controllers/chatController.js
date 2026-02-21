const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const ensureAppointmentAccess = (appointmentId, user, cb) => {
  db.get(
    `SELECT a.*, u.fullName as patientName, u.email as patientEmail
     FROM appointments a
     JOIN users u ON a.patientId = u.id
     WHERE a.id = ?`,
    [appointmentId],
    (err, appointment) => {
      if (err) return cb({ status: 500, error: 'Failed to load appointment' });
      if (!appointment) return cb({ status: 404, error: 'Appointment not found' });

      if (user.role === 'admin') return cb(null, appointment);
      if (appointment.patientId !== user.id) return cb({ status: 403, error: 'Access denied for this appointment' });

      return cb(null, appointment);
    }
  );
};

const getSenderName = (user, cb) => {
  db.get('SELECT fullName, email FROM users WHERE id = ?', [user.id], (err, row) => {
    if (err) return cb(user.email || 'User');
    return cb(row?.fullName || row?.email || user.email || 'User');
  });
};

exports.getChatAppointments = (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const params = [];

  let query = `
    SELECT
      a.id,
      a.appointmentDate,
      a.appointmentTime,
      a.approvalStatus,
      a.status,
      a.doctorName,
      a.meetingLink,
      u.fullName as patientName,
      u.email as patientEmail,
      (
        SELECT cm.message
        FROM chat_messages cm
        WHERE cm.appointmentId = a.id
        ORDER BY cm.createdat DESC
        LIMIT 1
      ) AS lastMessage,
      (
        SELECT cm.createdat
        FROM chat_messages cm
        WHERE cm.appointmentId = a.id
        ORDER BY cm.createdat DESC
        LIMIT 1
      ) AS lastMessageAt
    FROM appointments a
    JOIN users u ON a.patientId = u.id
  `;

  if (!isAdmin) {
    query += ' WHERE a.patientId = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY a.appointmentDate DESC, a.appointmentTime DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch chat appointments' });
    }
    return res.status(200).json(rows);
  });
};

exports.getAppointmentMessages = (req, res) => {
  const { appointmentId } = req.params;

  ensureAppointmentAccess(appointmentId, req.user, (accessErr) => {
    if (accessErr) {
      return res.status(accessErr.status).json({ error: accessErr.error });
    }

    db.all(
      `SELECT id, appointmentId, senderId, senderRole, senderName, message, createdat as createdAt
       FROM chat_messages
       WHERE appointmentId = ?
       ORDER BY createdat ASC`,
      [appointmentId],
      (err, messages) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch messages' });
        }
        return res.status(200).json(messages);
      }
    );
  });
};

exports.sendAppointmentMessage = (req, res) => {
  const { appointmentId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  ensureAppointmentAccess(appointmentId, req.user, (accessErr) => {
    if (accessErr) {
      return res.status(accessErr.status).json({ error: accessErr.error });
    }

    const messageId = uuidv4();
    getSenderName(req.user, (senderName) => {
      db.run(
        `INSERT INTO chat_messages (id, appointmentId, senderId, senderRole, senderName, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [messageId, appointmentId, req.user.id, req.user.role, senderName, message.trim()],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to send message' });
          }

          return res.status(201).json({
            id: messageId,
            appointmentId,
            senderId: req.user.id,
            senderRole: req.user.role,
            senderName,
            message: message.trim(),
            createdAt: new Date().toISOString()
          });
        }
      );
    });
  });
};

exports.shareFallbackMeetingLink = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can share fallback meeting links' });
  }

  const { appointmentId } = req.params;
  const { meetingLink } = req.body;

  if (!meetingLink || !meetingLink.trim()) {
    return res.status(400).json({ error: 'Meeting link is required' });
  }

  ensureAppointmentAccess(appointmentId, req.user, (accessErr) => {
    if (accessErr) {
      return res.status(accessErr.status).json({ error: accessErr.error });
    }

    db.run(
      `UPDATE appointments SET meetingLink = ? WHERE id = ?`,
      [meetingLink.trim(), appointmentId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update fallback meeting link' });
        }

        const messageId = uuidv4();
        const systemMessage = `Fallback meeting link shared: ${meetingLink.trim()}`;

        db.run(
          `INSERT INTO chat_messages (id, appointmentId, senderId, senderRole, senderName, message)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [messageId, appointmentId, req.user.id, 'admin', 'Admin', systemMessage],
          () => {
            return res.status(200).json({ message: 'Fallback meeting link shared successfully' });
          }
        );
      }
    );
  });
};
