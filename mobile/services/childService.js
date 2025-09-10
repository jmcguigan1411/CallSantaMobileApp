import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.137:5000/api/children'; // replace with your backend URL

// Helper to get auth token
const getToken = async () => {
  const token = await AsyncStorage.getItem('token');
  console.log('CURRENT TOKEN:', token); // debug token
  return token;
};

// Fetch all children for the logged-in parent
export const getChildren = async () => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 404) {
        // No children yet
        return [];
      }
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || `Failed to fetch children: ${res.status}`);
    }

    const data = await res.json();
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
    const res = await fetch(`${API_URL}/${childId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || `Failed to fetch child: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('getChild ERROR:', err);
    throw err;
  }
};

// Add a new child
export const addChild = async (childData) => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || `Failed to add child: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('addChild ERROR:', err);
    throw err;
  }
};

// Update an existing child
export const updateChild = async (childId, childData) => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/${childId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || `Failed to update child: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('updateChild ERROR:', err);
    throw err;
  }
};

export const deleteChild = async (childId) => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/${childId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || `Failed to delete child: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('deleteChild ERROR:', err);
    throw err;
  }
};


