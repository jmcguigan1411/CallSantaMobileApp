// services/aiService.js - Complete file with token debugging
const API_BASE_URL = 'http://192.168.1.137:5000/api';

// Function to handle Santa audio chat
export const chatWithSantaAudio = async (childId, audioUri, token, options = {}) => {
  try {
    console.log('[AI Service] Starting Santa audio chat:', {
      childId,
      hasAudio: !!audioUri,
      isGreeting: !!options.isGreeting,
      childName: options.childName
    });

    // Token debugging
    console.log('[AI Service] Token check:', {
      hasToken: !!token,
      tokenStart: token ? token.substring(0, 20) + '...' : 'no token',
      tokenLength: token ? token.length : 0
    });

    // Check token expiry
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Math.floor(Date.now() / 1000);
          const isExpired = payload.exp < now;
          
          console.log('[AI Service] Token analysis:', {
            expiresAt: new Date(payload.exp * 1000).toISOString(),
            currentTime: new Date().toISOString(),
            isExpired: isExpired,
            userId: payload.id,
            timeUntilExpiry: isExpired ? 'EXPIRED' : `${payload.exp - now} seconds`
          });

          if (isExpired) {
            console.error('[AI Service] ⚠️  TOKEN IS EXPIRED!');
            console.error('[AI Service] Please log out and log back in to get a fresh token');
          }
        }
      } catch (tokenDecodeError) {
        console.error('[AI Service] Could not decode token:', tokenDecodeError.message);
      }
    } else {
      console.error('[AI Service] ⚠️  NO TOKEN PROVIDED!');
    }

    const formData = new FormData();
   
    // Handle greeting vs regular chat
    if (options.isGreeting) {
      formData.append('isGreeting', 'true');
      formData.append('greetingText', options.greetingText);
      if (options.childName) {
        formData.append('childName', options.childName);
      }
      console.log('[AI Service] Sending greeting request');
    } else if (audioUri) {
      // Add audio file for regular chat
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      console.log('[AI Service] Sending audio file');
    }

    console.log('[AI Service] Making request to:', `${API_BASE_URL}/ai/chat-audio/${childId}`);
    console.log('[AI Service] Authorization header:', token ? 'Bearer [TOKEN_PROVIDED]' : 'NO_AUTHORIZATION_HEADER');

    // FIXED: Use the correct URL that matches your backend route
    const response = await fetch(`${API_BASE_URL}/ai/chat-audio/${childId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - let the browser set it
      },
      body: formData,
    });

    console.log('[AI Service] Response status:', response.status);
    console.log('[AI Service] Response headers:', {
      contentType: response.headers.get('content-type'),
      authorization: response.headers.get('www-authenticate')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Service] Server error response:', errorText);
      
      // Try to parse as JSON for better error details
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.error('[AI Service] Parsed error data:', errorData);
        
        if (response.status === 401) {
          console.error('[AI Service] 🔐 Authentication failed - likely expired or invalid token');
        }
      } catch (parseError) {
        console.error('[AI Service] Error response is not JSON, raw text:', errorText);
      }
      
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[AI Service] Success:', {
      hasText: !!data.text,
      hasAudio: !!data.audioBase64,
      audioSize: data.audioBase64?.length
    });

    return data;
  } catch (error) {
    console.error('[AI Service] chatWithSantaAudio error:', error);
    throw error;
  }
};

// Alternative JSON version if FormData doesn't work
export const chatWithSantaAudioJSON = async (childId, audioUri, token, options = {}) => {
  try {
    let body = {};
   
    if (options.isGreeting) {
      body.isGreeting = true;
      body.greetingText = options.greetingText;
      body.childName = options.childName;
    } else if (audioUri) {
      // Convert audio file to base64 if your backend expects it
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const base64Audio = await blobToBase64(blob);
      body.audioBase64 = base64Audio;
    }

    // FIXED: Use the correct URL that matches your backend route
    const response = await fetch(`${API_BASE_URL}/ai/chat-audio/${childId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('chatWithSantaAudioJSON error:', error);
    throw error;
  }
};

// Helper function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]); // Remove data:audio/... prefix
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};