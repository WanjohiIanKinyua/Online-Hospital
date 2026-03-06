import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/AuthPages.css';
import { API_BASE_URL } from '../config/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetLink('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email });
      setMessage(response.data?.message || 'If the account exists, a reset link has been sent.');
      if (response.data?.resetLink) {
        setResetLink(response.data.resetLink);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Dr.Merceline Naserian</h1>
          <p>Online Hospital</p>
        </div>

        <form onSubmit={handleSubmit}>
          <h2>Forgot Password</h2>
          <p className="auth-subtitle">Enter your email to receive a password reset link.</p>

          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {resetLink && (
          <div className="auth-note">
            <strong>Reset link:</strong>{' '}
            <a href={resetLink} target="_blank" rel="noreferrer">
              Open reset page
            </a>
          </div>
        )}

        <div className="auth-footer">
          <p>Remembered your password? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
