const { v4: uuidv4 } = require('uuid');
const db = require('../database');

exports.createPayment = (req, res) => {
  const { appointmentId, amount, paymentMethod = 'card', phoneNumber, cardNumber } = req.body;
  const patientId = req.user.id;

  if (!appointmentId || !amount) {
    return res.status(400).json({ error: 'Appointment ID and amount are required' });
  }

  // Verify appointment belongs to patient
  db.get('SELECT * FROM appointments WHERE id = ? AND patientId = ?', [appointmentId, patientId], (err, appointment) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to verify appointment' });
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const paymentId = uuidv4();
    const transactionId =
      paymentMethod === 'mpesa'
        ? `MPESA-${Date.now()}`
        : `CARD-${Date.now()}`;

    db.run(
      `INSERT INTO payments (id, appointmentId, patientId, amount, paymentMethod, transactionId, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        appointmentId,
        patientId,
        amount,
        paymentMethod === 'mpesa' ? `mpesa:${phoneNumber || ''}` : `card:${(cardNumber || '').slice(-4)}`,
        transactionId,
        'completed'
      ],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Payment creation failed' });
        }

        // Keep appointment approval workflow intact; only mark payment completed here.
        db.run(
          `UPDATE appointments SET paymentStatus = ? WHERE id = ?`,
          ['completed', appointmentId],
          (updateErr) => {
            if (updateErr) {
              console.error('Failed to update appointment:', updateErr);
            }
          }
        );

        res.status(201).json({ 
          message: 'Payment successful', 
          paymentId, 
          transactionId 
        });
      }
    );
  });
};

exports.getPaymentHistory = (req, res) => {
  const patientId = req.user.id;

  db.all(
    `SELECT p.*, a.appointmentDate, a.appointmentTime FROM payments p 
     JOIN appointments a ON p.appointmentId = a.id 
     WHERE p.patientId = ? ORDER BY p.paymentDate DESC`,
    [patientId],
    (err, payments) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch payment history' });
      }
      res.status(200).json(payments);
    }
  );
};

exports.getPaymentByAppointment = (req, res) => {
  const { appointmentId } = req.params;

  db.get('SELECT * FROM payments WHERE appointmentId = ?', [appointmentId], (err, payment) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch payment' });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(200).json(payment);
  });
};

exports.getAllPayments = (req, res) => {
  db.all(
    `SELECT p.*, u.fullName, a.appointmentDate FROM payments p 
     JOIN users u ON p.patientId = u.id 
     JOIN appointments a ON p.appointmentId = a.id 
     ORDER BY p.paymentDate DESC`,
    (err, payments) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch payments' });
      }
      res.status(200).json(payments);
    }
  );
};
