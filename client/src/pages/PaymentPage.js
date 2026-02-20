import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/PaymentPage.css';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

function PaymentPage() {
  const { appointmentId } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [paymentDetails, setPaymentDetails] = useState({
    mpesaPhone: '',
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [showMpesaPopup, setShowMpesaPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAppointment();
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [appointmentId]);

  const fetchAppointment = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointment(response.data);
    } catch (err) {
      setError('Failed to load appointment details');
    }
  };

  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      if (
        !paymentDetails.cardName.trim() ||
        !paymentDetails.cardNumber.trim() ||
        !paymentDetails.expiry.trim() ||
        !paymentDetails.cvv.trim()
      ) {
        setError('Please fill all card details');
        setLoading(false);
        return;
      }
    }

    try {
      await axios.post(
        'http://localhost:5000/api/payments/create',
        {
          appointmentId,
          amount: 500,
          paymentMethod,
          phoneNumber: paymentDetails.mpesaPhone,
          cardNumber: paymentDetails.cardNumber
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowMpesaPopup(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return <div className="loading">Loading payment details...</div>;
  }

  if (paymentSuccess) {
    return (
      <div className="payment-page">
        <div className="success-container">
          <div className="success-icon">
            <FiCheckCircle size={64} />
          </div>
          <h1>Payment Successful!</h1>
          <p>Your consultation has been confirmed.</p>
          <div className="success-details">
            <p>
              Appointment Date: <strong>{new Date(appointment.appointmentDate).toLocaleDateString()}</strong>
            </p>
            <p>
              Time: <strong>{appointment.appointmentTime}</strong>
            </p>
            <p>
              Amount Paid: <strong>KSH 500</strong>
            </p>
          </div>
          <p style={{ marginTop: '20px', color: '#999' }}>Redirecting to dashboard in 3 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="container">
        <Link to="/dashboard" className="back-button">
          <FiArrowLeft /> Back to Dashboard
        </Link>

        <div className="payment-card">
          <h1>Complete Your Payment</h1>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="appointment-details">
            <h3>Appointment Details</h3>
            <div className="detail-item">
              <span>Doctor:</span>
              <strong>{appointment.doctorName}</strong>
            </div>
            <div className="detail-item">
              <span>Date:</span>
              <strong>{new Date(appointment.appointmentDate).toLocaleDateString()}</strong>
            </div>
            <div className="detail-item">
              <span>Time:</span>
              <strong>{appointment.appointmentTime}</strong>
            </div>
          </div>

          <form onSubmit={handlePayment}>
            <div className="payment-method">
              <h3>Payment Method</h3>
              <div className="method-options">
                <label className="method-option">
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Debit/Credit Card</span>
                </label>
                <label className="method-option">
                  <input
                    type="radio"
                    value="mpesa"
                    checked={paymentMethod === 'mpesa'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Mobile Money (M-Pesa)</span>
                </label>
              </div>
            </div>

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

            {paymentMethod === 'mpesa' && (
              <div className="mobile-details">
                <div className="form-group">
                  <label htmlFor="phoneNumber">M-Pesa Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="mpesaPhone"
                    value={paymentDetails.mpesaPhone}
                    onChange={handlePaymentDetailsChange}
                    placeholder="254712345678"
                    required
                  />
                </div>
                <p style={{ color: '#999', fontSize: '13px', marginTop: '10px' }}>
                  You will receive a prompt on your phone to complete the transaction.
                </p>
              </div>
            )}

            <div className="price-summary">
              <div className="summary-row">
                <span>Consultation Fee:</span>
                <strong>KSH 500</strong>
              </div>
              <div className="summary-row">
                <span>Processing Fee:</span>
                <strong>KSH 0</strong>
              </div>
              <div className="summary-row total">
                <span>Total Amount:</span>
                <strong>KSH 500</strong>
              </div>
            </div>

            <button type="submit" className="btn-pay" disabled={loading}>
              {loading ? 'Processing Payment...' : paymentMethod === 'mpesa' ? 'Pay with M-Pesa' : 'Pay with Card'}
            </button>

            <p className="security-note">Your payment information is encrypted and secure</p>
          </form>
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
              <button type="button" className="btn-confirm" onClick={(e) => handlePayment(e)}>
                Send Prompt & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentPage;

