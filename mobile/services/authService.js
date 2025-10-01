// services/authService.js
import { API_BASE_URL } from '../config';

export const login = async (email, password) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.message || 'Login failed, no token returned');
    }
    return data;
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    throw err;
  }
};

export const register = async (name, email, password) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.message || 'Registration failed, no token returned');
    }
    return data;
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    throw err;
  }
};

export const socialLogin = async (provider, token, name, email) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/social-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, token, name, email }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Social login failed');
    }
    return await res.json();
  } catch (err) {
    console.error('SOCIAL LOGIN ERROR:', err);
    throw err;
  }
};

export const acceptTerms = async (token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/accept-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to accept terms');
    }
    return data;
  } catch (err) {
    console.error('ACCEPT TERMS ERROR:', err);
    throw err;
  }
};

export const requestPasswordReset = async (email) => {
  const res = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to send reset code');
  }
  return data;
};

export const verifyResetCode = async (email, code) => {
  const res = await fetch(`${API_BASE_URL}/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Invalid code');
  }
  return data;
};

export const resetPassword = async (email, code, newPassword) => {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }
  return data;
};
