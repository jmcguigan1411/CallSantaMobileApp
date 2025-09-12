import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.137:5000/api/children'; // replace with your backend URL

// Helper to get auth token
const getToken = async () => {
  const token = await AsyncStorage.getItem('token');
  console.log('[DEBUG] CURRENT TOKEN:', token);
  return token;
};

// Fetch all children for the logged-in parent
export const getChildren = async () => {
  try {
    const token = await getToken();
    console.log('[DEBUG] GET CHILDREN URL:', API_URL);

    const res = await fetch(`${API_URL}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('[DEBUG] GET CHILDREN STATUS:', res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('[DEBUG] GET CHILDREN RESPONSE ERROR:', errData);
      if (res.status === 404) return [];
      throw new Error(errData?.message || `Failed to fetch children: ${res.status}`);
    }

    const data = await res.json();
    console.log('[DEBUG] PARSED CHILDREN DATA:', data);
    return data;
  } catch (err) {
    console.error('getChildren ERROR:', err);
    throw err;
  }
};

// Fetch a single child by ID
export const getChild = async (childId) => {
  try {
    const token = await getToken();
    console.log('[DEBUG] GET CHILD URL:', `${API_URL}/${childId}`);

    const res = await fetch(`${API_URL}/${childId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[DEBUG] GET CHILD STATUS:', res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('[DEBUG] GET CHILD RESPONSE ERROR:', errData);
      throw new Error(errData?.message || `Failed to fetch child: ${res.status}`);
    }

    const data = await res.json();
    console.log('[DEBUG] PARSED CHILD DATA:', data);
    return data;
  } catch (err) {
    console.error('getChild ERROR:', err);
    throw err;
  }
};

// Add a new child
export const addChild = async (childData) => {
  try {
    const token = await getToken();
    console.log('[DEBUG] ADD CHILD URL:', API_URL, 'BODY:', childData);

    const res = await fetch(`${API_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData),
    });

    console.log('[DEBUG] ADD CHILD STATUS:', res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('[DEBUG] ADD CHILD RESPONSE ERROR:', errData);
      throw new Error(errData?.message || `Failed to add child: ${res.status}`);
    }

    const data = await res.json();
    console.log('[DEBUG] ADDED CHILD DATA:', data);
    return data;
  } catch (err) {
    console.error('addChild ERROR:', err);
    throw err;
  }
};

// Update an existing child
export const updateChild = async (childId, childData) => {
  try {
    const token = await getToken();
    console.log('[DEBUG] UPDATE CHILD URL:', `${API_URL}/${childId}`, 'BODY:', childData);

    const res = await fetch(`${API_URL}/${childId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData),
    });

    console.log('[DEBUG] UPDATE CHILD STATUS:', res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('[DEBUG] UPDATE CHILD RESPONSE ERROR:', errData);
      throw new Error(errData?.message || `Failed to update child: ${res.status}`);
    }

    const data = await res.json();
    console.log('[DEBUG] UPDATED CHILD DATA:', data);
    return data;
  } catch (err) {
    console.error('updateChild ERROR:', err);
    throw err;
  }
};

// Delete a child
export const deleteChild = async (childId) => {
  try {
    const token = await getToken();
    console.log('[DEBUG] DELETE CHILD URL:', `${API_URL}/${childId}`);

    const res = await fetch(`${API_URL}/${childId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[DEBUG] DELETE CHILD STATUS:', res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('[DEBUG] DELETE CHILD RESPONSE ERROR:', errData);
      throw new Error(errData?.message || `Failed to delete child: ${res.status}`);
    }

    const data = await res.json();
    console.log('[DEBUG] DELETED CHILD RESPONSE:', data);
    return data;
  } catch (err) {
    console.error('deleteChild ERROR:', err);
    throw err;
  }
};
