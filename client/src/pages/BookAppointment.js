import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/BookAppointment.css';
import { FiArrowLeft } from 'react-icons/fi';
import { DashboardLayout } from '../components/DashboardLayout';
import { API_BASE_URL } from '../config/api';

function BookAppointment() {
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    doctorName: 'Dr. Merceline'
  });
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [paymentDetails, setPaymentDetails] = useState({
    mpesaPhone: '',
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [showMpesaPopup, setShowMpesaPopup] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments/doctors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDoctors(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({ ...prev, doctorName: response.data[0].fullName }));
        } else {
          setFormData((prev) => ({ ...prev, doctorName: 'Dr. Merceline' }));
        }
      } catch (err) {
        setDoctors([]);
        setFormData((prev) => ({ ...prev, doctorName: 'Dr. Merceline' }));
      }
    };

    fetchDoctors();
  }, [token]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!formData.appointmentDate) {
        setAvailableSlots([]);
        return;
      }

      setSlotsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/appointments/available-slots`, {
          params: { date: formData.appointmentDate },
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableSlots(response.data);
      } catch (err) {
        setAvailableSlots([]);
        setError(err.response?.data?.error || 'Failed to load available slots');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [formData.appointmentDate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'appointmentDate') {
      setFormData((prev) => ({
        ...prev,
        appointmentDate: value,
        appointmentTime: ''
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.appointmentDate || !formData.appointmentTime) {
      setError('Please select both date and time');
      setLoading(false);
      return;
    }

    if (paymentMethod === 'mpesa') {
      if (!paymentDetails.mpesaPhone.trim()) {
        setError('Please enter your M-Pesa phone number');
        setLoading(false);
        return;
      }

      if (!showMpesaPopup) {
        setShowMpesaPopup(true);
        setLoading(false);
        return;
      }
    } else {
      if (!paymentDetails.cardName.trim() || !paymentDetails.cardNumber.trim() || !paymentDetails.expiry.trim() || !paymentDetails.cvv.trim()) {
        setError('Please fill all card details');
        setLoading(false);
        return;
      }
    }

    try {
      const appointmentRes = await axios.post(`${API_BASE_URL}/api/appointments/book`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const appointmentId = appointmentRes.data.appointmentId;

      await axios.post(
        `${API_BASE_URL}/api/payments/create`,
        {
          appointmentId,
          amount: 1000,
          paymentMethod,
          phoneNumber: paymentDetails.mpesaPhone,
          cardNumber: paymentDetails.cardNumber
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowMpesaPopup(false);
      setSuccess('You have successfully booked an appointment. Redirecting to booked appointments...');
      setTimeout(() => {
        navigate('/appointments');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <DashboardLayout role="patient">
      <div className="book-appointment-page">
        <div className="container">
          <Link to="/dashboard" className="back-button">
            <FiArrowLeft /> Back to Dashboard
          </Link>

          <div className="booking-card">
            <h1>Book a Consultation</h1>
            <p className="consultation-fee">Consultation Fee: <strong>KSH 1000</strong></p>

            <form onSubmit={handleBookAppointment}>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="form-group">
                <label htmlFor="appointmentDate">Preferred Date</label>
                <input
                  type="date"
                  id="appointmentDate"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  min={today}
                  required
                />
                <small>Select your preferred consultation date</small>
              </div>

              <div className="form-group">
                <label htmlFor="appointmentTime">Preferred Time</label>
                <select
                  id="appointmentTime"
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleChange}
                  disabled={!formData.appointmentDate || slotsLoading || availableSlots.length === 0}
                  required
                >
                  <option value="">Select available time</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.slotTime}>
                      {slot.slotTime}
                    </option>
                  ))}
                </select>
                <small>
                  {!formData.appointmentDate
                    ? 'Select a date first'
                    : slotsLoading
                      ? 'Loading available slots...'
                      : availableSlots.length === 0
                        ? 'No available slots for this date'
                        : 'Only admin-available slots are shown'}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="doctorName">Doctor/Department</label>
                <select
                  id="doctorName"
                  name="doctorName"
                  value={formData.doctorName}
                  onChange={handleChange}
                >
                  {doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.fullName}>
                        {doctor.fullName}
                      </option>
                    ))
                  ) : (
                    <option value="Dr. Merceline">Dr. Merceline</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <div className="method-options">
                  <label className="method-option">
                    <input
                      type="radio"
                      value="mpesa"
                      checked={paymentMethod === 'mpesa'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>M-Pesa</span>
                  </label>
                  <label className="method-option">
                    <input
                      type="radio"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>Card</span>
                  </label>
                </div>
              </div>

              {paymentMethod === 'mpesa' && (
                <div className="form-group">
                  <label htmlFor="mpesaPhone">M-Pesa Number</label>
                  <input
                    type="tel"
                    id="mpesaPhone"
                    name="mpesaPhone"
                    value={paymentDetails.mpesaPhone}
                    onChange={handlePaymentDetailsChange}
                    placeholder="2547XXXXXXXX"
                    required
                  />
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="card-details">
                  <div className="form-group">
                    <label htmlFor="cardName">Cardholder Name</label>
                    <input
                      type="text"
                      id="cardName"
                      name="cardName"
                      value={paymentDetails.cardName}
                      onChange={handlePaymentDetailsChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number</label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={paymentDetails.cardNumber}
                      onChange={handlePaymentDetailsChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiry">Expiry Date</label>
                      <input
                        type="text"
                        id="expiry"
                        name="expiry"
                        value={paymentDetails.expiry}
                        onChange={handlePaymentDetailsChange}
                        placeholder="MM/YY"
                        maxLength="5"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cvv">CVV</label>
                      <input
                        type="text"
                        id="cvv"
                        name="cvv"
                        value={paymentDetails.cvv}
                        onChange={handlePaymentDetailsChange}
                        placeholder="123"
                        maxLength="3"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="booking-summary">
                <h3>Appointment Summary</h3>
                <div className="summary-item">
                  <span>Consultation Fee:</span>
                  <strong>KSH 1000</strong>
                </div>
                {formData.appointmentDate && (
                  <div className="summary-item">
                    <span>Scheduled Date:</span>
                    <strong>{new Date(formData.appointmentDate).toLocaleDateString()}</strong>
                  </div>
                )}
                {formData.appointmentTime && (
                  <div className="summary-item">
                    <span>Scheduled Time:</span>
                    <strong>{formData.appointmentTime}</strong>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-book-appointment" disabled={loading}>
                {loading
                  ? 'Processing...'
                  : paymentMethod === 'mpesa'
                    ? 'Book & Pay with M-Pesa'
                    : 'Book & Pay with Card'}
              </button>

              <p className="disclaimer">
                After booking, your request will be reviewed by admin. If rejected, a reason will be shown on your dashboard.
              </p>
            </form>
          </div>
        </div>
      </div>

      {showMpesaPopup && (
        <div className="modal-overlay">
          <div className="mpesa-modal">
            <h3>Confirm M-Pesa Payment</h3>
            <p>A payment prompt will be sent to:</p>
            <strong>{paymentDetails.mpesaPhone}</strong>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowMpesaPopup(false)}>
                Cancel
              </button>
              <button type="button" className="btn-confirm" onClick={(e) => handleBookAppointment(e)}>
                Send Prompt & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default BookAppointment;
