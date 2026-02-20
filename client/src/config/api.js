const envApiUrl = process.env.REACT_APP_API_URL;

const isPrivateIPv4 = (host) => /^(10|127|192\.168|172\.(1[6-9]|2\d|3[0-1]))\.\d{1,3}\.\d{1,3}$/.test(host);

const resolveApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';

  const { hostname, protocol } = window.location;
  const isHostedVercel = hostname.endsWith('.vercel.app');

  if (envApiUrl) {
    const envIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envApiUrl);
    if (!(isHostedVercel && envIsLocalhost)) {
      return envApiUrl;
    }
  }

  const isLocalOrLan = hostname === 'localhost' || hostname === '127.0.0.1' || isPrivateIPv4(hostname);

  // Local dev on laptop or local-network phone testing (http://<pc-ip>:3000 -> http://<pc-ip>:5000)
  if (isLocalOrLan) {
    return `${protocol}//${hostname}:5000`;
  }

  if (isHostedVercel) {
    return 'https://online-hospital.onrender.com';
  }

  // Hosted frontend must provide REACT_APP_API_URL.
  return '';
};

const rawApiBaseUrl = resolveApiBaseUrl();
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');
