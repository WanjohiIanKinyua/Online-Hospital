const { v4: uuidv4 } = require('uuid');
const db = require('../database');

exports.getDoctors = (req, res) => {
  db.all(
    `
      SELECT id, fullName, specialty
      FROM doctors
      WHERE isActive = 1
      ORDER BY fullName ASC
    `,
    (err, doctors) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch doctors' });
      }
      return res.status(200).json(doctors);
    }
  );
};

exports.getAvailableSlots = (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  db.all(
    `
      SELECT s.id, s.slotDate, s.slotTime
      FROM availability_slots s
      WHERE s.slotDate = ?
      AND s.isActive = 1
      AND NOT EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.appointmentDate = s.slotDate
          AND a.appointmentTime = s.slotTime
          AND a.status != 'cancelled'
      )
      ORDER BY s.slotTime ASC
    `,
    [date],
    (err, slots) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch available slots' });
      }
      return res.status(200).json(slots);
    }
  );
};

exports.bookAppointment = (req, res) => {
  const { appointmentDate, appointmentTime, doctorName } = req.body;
  const patientId = req.user.id;

  if (!appointmentDate || !appointmentTime) {
    return res.status(400).json({ error: 'Date and time are required' });
  }

  const appointmentId = uuidv4();

  db.get(
    `
      SELECT id FROM availability_slots
      WHERE slotDate = ?
      AND slotTime = ?
      AND isActive = 1
    `,
    [appointmentDate, appointmentTime],
    (slotErr, slot) => {
      if (slotErr) {
        return res.status(500).json({ error: 'Failed to validate slot availability' });
      }

      if (!slot) {
        return res.status(400).json({ error: 'Selected time slot is not available' });
      }

      db.get(
        `
          SELECT id FROM appointments
          WHERE appointmentDate = ?
          AND appointmentTime = ?
          AND status != 'cancelled'
          LIMIT 1
        `,
        [appointmentDate, appointmentTime],
        (conflictErr, conflict) => {
          if (conflictErr) {
            return res.status(500).json({ error: 'Failed to validate slot conflicts' });
          }

          if (conflict) {
            return res.status(400).json({ error: 'This time slot has already been selected by another patient' });
          }

          db.run(
            `INSERT INTO appointments (id, patientId, appointmentDate, appointmentTime, doctorName, status, approvalStatus, paymentStatus) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [appointmentId, patientId, appointmentDate, appointmentTime, doctorName || 'Dr. Merceline', 'pending', 'pending', 'pending'],
            (insertErr) => {
              if (insertErr) {
                return res.status(500).json({ error: 'Failed to book appointment' });
              }
              return res.status(201).json({
                message: 'Appointment request submitted. Waiting for admin approval.',
                appointmentId
              });
            }
          );
        }
      );
    }
  );
};

exports.rescheduleAppointment = (req, res) => {
  const { id } = req.params;
  const { appointmentDate, appointmentTime } = req.body;
  const patientId = req.user.id;

  if (!appointmentDate || !appointmentTime) {
    return res.status(400).json({ error: 'Date and time are required' });
  }

  db.get(
    `SELECT * FROM appointments WHERE id = ? AND patientId = ?`,
    [id, patientId],
    (findErr, appointment) => {
      if (findErr) {
        return res.status(500).json({ error: 'Failed to load appointment' });
      }
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        return res.status(400).json({ error: 'This appointment cannot be rescheduled' });
      }
      if (appointment.approvalStatus !== 'pending') {
        return res.status(400).json({ error: 'Only pending appointments can be rescheduled' });
      }

      db.get(
        `
          SELECT id FROM availability_slots
          WHERE slotDate = ?
          AND slotTime = ?
          AND isActive = 1
        `,
        [appointmentDate, appointmentTime],
        (slotErr, slot) => {
          if (slotErr) {
            return res.status(500).json({ error: 'Failed to validate slot availability' });
          }
          if (!slot) {
            return res.status(400).json({ error: 'Selected slot is not available' });
          }

          db.get(
            `
              SELECT id FROM appointments
              WHERE appointmentDate = ?
              AND appointmentTime = ?
              AND status != 'cancelled'
              AND id != ?
              LIMIT 1
            `,
            [appointmentDate, appointmentTime, id],
            (conflictErr, conflict) => {
              if (conflictErr) {
                return res.status(500).json({ error: 'Failed to validate slot conflicts' });
              }
              if (conflict) {
                return res.status(400).json({ error: 'This slot is already selected by another patient' });
              }

              db.run(
                `
                  UPDATE appointments
                  SET appointmentDate = ?, appointmentTime = ?
                  WHERE id = ? AND patientId = ?
                `,
                [appointmentDate, appointmentTime, id, patientId],
                function onUpdated(updateErr) {
                  if (updateErr) {
                    return res.status(500).json({ error: 'Failed to reschedule appointment' });
                  }
                  if (this.changes === 0) {
                    return res.status(404).json({ error: 'Appointment not found' });
                  }
                  return res.status(200).json({ message: 'Appointment rescheduled successfully' });
                }
              );
            }
          );
        }
      );
    }
  );
};

exports.getAppointments = (req, res) => {
  const patientId = req.user.id;

  db.all(
    `SELECT * FROM appointments
     WHERE patientId = ?
     ORDER BY createdAt DESC, appointmentDate DESC, appointmentTime DESC`,
    [patientId],
    (err, appointments) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }
    res.status(200).json(appointments);
    }
  );
};

exports.getAppointmentById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM appointments WHERE id = ?', [id], (err, appointment) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch appointment' });
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json(appointment);
  });
};

exports.updateAppointmentStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  db.run(
    `UPDATE appointments SET status = ? WHERE id = ?`,
    [status, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update appointment' });
      }
      res.status(200).json({ message: 'Appointment status updated' });
    }
  );
};

exports.addMeetingLink = (req, res) => {
  const { appointmentId, meetingLink } = req.body;

  if (!appointmentId || !meetingLink) {
    return res.status(400).json({ error: 'Appointment ID and meeting link are required' });
  }

  db.run(
    `UPDATE appointments SET meetingLink = ? WHERE id = ?`,
    [meetingLink, appointmentId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to add meeting link' });
      }
      res.status(200).json({ message: 'Meeting link added successfully' });
    }
  );
};

exports.cancelAppointment = (req, res) => {
  const { id } = req.params;
  const patientId = req.user.id;

  db.get('SELECT * FROM appointments WHERE id = ? AND patientId = ?', [id, patientId], (err, appointment) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to cancel appointment' });
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel this appointment' });
    }

    db.run(
      `UPDATE appointments SET status = ? WHERE id = ?`,
      ['cancelled', id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to cancel appointment' });
        }
        res.status(200).json({ message: 'Appointment cancelled successfully' });
      }
    );
  });
};
