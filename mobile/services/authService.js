const API_BASE = 'https://callsantamobile-devicestorage.onrender.com/api';
const API_URL = `${API_BASE}/auth`;

export const login = async (email, password) => {
  try {
    const res = await fetch(`${API_URL}/login`, {
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
    const res = await fetch(`${API_URL}/register`, {
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
    const res = await fetch(`${API_URL}/social-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, token, name, email }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Social login failed');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('SOCIAL LOGIN ERROR:', err);
    throw err;
  }
};

export const acceptTerms = async (token) => {
  try {
    const res = await fetch(`${API_URL}/accept-terms`, {
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
  const response = await fetch(`${API_URL}/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
 
  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send reset code');
  }
 
  return data;
};

export const verifyResetCode = async (email, code) => {
  const response = await fetch(`${API_URL}/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
 
  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(data.message || 'Invalid code');
  }
 
  return data;
};

export const resetPassword = async (email, code, newPassword) => {
  const response = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
 
  const data = await response.json();
 
  if (!response.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }
 
  return data;
};