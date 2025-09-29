const API_BASE_URL = 'http://192.168.1.137:5000/api';

// Get all audio recordings for a child
export const getChildAudioRecordings = async (childId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio/child/${childId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch audio recordings');
    }

    return await response.json();
  } catch (error) {
    console.error('getChildAudioRecordings error:', error);
    throw error;
  }
};

// Delete an audio recording
export const deleteAudioRecording = async (recordingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio/${recordingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete audio recording');
    }

    return await response.json();
  } catch (error) {
    console.error('deleteAudioRecording error:', error);
    throw error;
  }
};

// Get download URL for an audio recording
export const getAudioDownloadUrl = (recordingId, token) => {
  return `${API_BASE_URL}/audio/${recordingId}/download?token=${token}`;
};

// Extract wishlist from audio recordings
export const extractWishlist = async (childId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio/child/${childId}/wishlist`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to extract wishlist');
    }

    return await response.json();
  } catch (error) {
    console.error('extractWishlist error:', error);
    throw error;
  }
};