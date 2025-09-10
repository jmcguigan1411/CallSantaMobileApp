// mobile/services/authService.js
const API_URL = 'http://192.168.1.137:5000/api/auth';

export const login = async (email, password) => {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    console.log('RAW RESPONSE:', res);

    const data = await res.json();
    console.log('PARSED DATA:', data);

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

    console.log('RAW RESPONSE:', res);

    const data = await res.json();
    console.log('PARSED DATA:', data);

    if (!res.ok || !data.token) {
      throw new Error(data.message || 'Registration failed, no token returned');
    }

    return data;
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    throw err;
  }
};
