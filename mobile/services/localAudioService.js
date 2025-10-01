import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}santa_recordings/`;

// Initialize recordings directory
export const initializeRecordingsDirectory = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
      console.log('✅ Created recordings directory');
    }
  } catch (error) {
    console.error('❌ Error creating directory:', error);
  }
};

// Save a recording to device
export const saveRecording = async (audioUri, childId, childName, transcription) => {
  try {
    await initializeRecordingsDirectory();
    
    const timestamp = Date.now();
    const filename = `${childName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.m4a`;
    const permanentUri = `${RECORDINGS_DIR}${filename}`;
    
    // Copy recording to permanent location
    await FileSystem.copyAsync({
      from: audioUri,
      to: permanentUri,
    });
    
    // Get existing recordings for this child
    const recordingsKey = `recordings_${childId}`;
    const existingData = await AsyncStorage.getItem(recordingsKey);
    const recordings = existingData ? JSON.parse(existingData) : [];
    
    // Get next sequence number
    const sequenceNumber = recordings.length > 0 
      ? Math.max(...recordings.map(r => r.sequenceNumber)) + 1 
      : 1;
    
    // Add new recording metadata
    const newRecording = {
      id: timestamp.toString(),
      filename,
      uri: permanentUri,
      transcription,
      sequenceNumber,
      date: new Date().toISOString(),
      childId,
      childName,
    };
    
    recordings.push(newRecording);
    await AsyncStorage.setItem(recordingsKey, JSON.stringify(recordings));
    
    console.log(`✅ Saved recording to device: ${filename}`);
    return newRecording;
  } catch (error) {
    console.error('❌ Error saving recording:', error);
    throw error;
  }
};

// Get all recordings for a child
export const getRecordingsForChild = async (childId) => {
  try {
    const recordingsKey = `recordings_${childId}`;
    const data = await AsyncStorage.getItem(recordingsKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error getting recordings:', error);
    return [];
  }
};

// Delete a recording
export const deleteRecording = async (childId, recordingId) => {
  try {
    const recordingsKey = `recordings_${childId}`;
    const data = await AsyncStorage.getItem(recordingsKey);
    const recordings = data ? JSON.parse(data) : [];
    
    const recording = recordings.find(r => r.id === recordingId);
    if (recording) {
      // Delete physical file
      const fileInfo = await FileSystem.getInfoAsync(recording.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(recording.uri);
      }
      
      // Remove from metadata
      const updatedRecordings = recordings.filter(r => r.id !== recordingId);
      await AsyncStorage.setItem(recordingsKey, JSON.stringify(updatedRecordings));
      
      console.log(`✅ Deleted recording: ${recording.filename}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting recording:', error);
    throw error;
  }
};

// Get file size for a recording
export const getRecordingFileSize = async (uri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists ? fileInfo.size : 0;
  } catch (error) {
    return 0;
  }
};

// Extract wishlist from local recordings
export const extractWishlistLocal = async (childId, childName, token) => {
  try {
    const recordings = await getRecordingsForChild(childId);
    
    if (recordings.length === 0) {
      return { wishlist: [], recordingsAnalyzed: 0 };
    }
    
    // Combine all transcriptions
    const allTranscriptions = recordings
      .filter(r => r.transcription)
      .map((r, idx) => `[Recording ${idx + 1}]: ${r.transcription}`)
      .join('\n\n');
    
    // Send to backend for GPT analysis
    const response = await fetch('http://192.168.1.137:5000/api/ai/extract-wishlist-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        childName,
        transcriptions: allTranscriptions,
        recordingsCount: recordings.length,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to extract wishlist');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error extracting wishlist:', error);
    throw error;
  }
};