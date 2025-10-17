// services/localAudioService.js
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIO_DIR = `${FileSystem.documentDirectory}santa_calls/`;
const AUDIO_INDEX_KEY = 'audio_recordings_index';

// Ensure directory exists
const ensureDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
};

// Get index of all recordings
const getAudioIndex = async () => {
  try {
    const index = await AsyncStorage.getItem(AUDIO_INDEX_KEY);
    return index ? JSON.parse(index) : [];
  } catch (error) {
    console.error('Error getting audio index:', error);
    return [];
  }
};

// Update index
const updateAudioIndex = async (index) => {
  try {
    await AsyncStorage.setItem(AUDIO_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('Error updating audio index:', error);
  }
};

// Save audio recording locally with transcription
export const saveRecording = async (audioUri, childId, childName, transcription = '') => {
  try {
    await ensureDirectoryExists();
    
    const timestamp = Date.now();
    const fileName = `call_${childId}_${timestamp}.m4a`;
    const newUri = `${AUDIO_DIR}${fileName}`;
    
    // Copy audio file to app's document directory
    await FileSystem.copyAsync({
      from: audioUri,
      to: newUri
    });
    
    // Get existing recordings to determine sequence number
    const index = await getAudioIndex();
    const childRecordings = index.filter(r => r.childId === childId);
    const sequenceNumber = childRecordings.length + 1;
    
    // Create metadata
    const metadata = {
      id: `${childId}_${timestamp}`,
      childId,
      childName,
      fileName,
      uri: newUri,
      timestamp,
      date: new Date(timestamp).toISOString(),
      transcription: transcription || '',
      sequenceNumber,
      duration: null
    };
    
    // Update index
    index.push(metadata);
    await updateAudioIndex(index);
    
    return metadata;
  } catch (error) {
    console.error('Error saving audio locally:', error);
    throw error;
  }
};

// Alias for compatibility
export const saveAudioLocally = saveRecording;

// Get all recordings for a specific child (for AudioFilesScreen)
export const getRecordingsForChild = async (childId) => {
  try {
    const index = await getAudioIndex();
    return index.filter(recording => recording.childId === childId)
                .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting recordings for child:', error);
    return [];
  }
};

// Alias for compatibility
export const getChildRecordings = getRecordingsForChild;

// Get all recordings
export const getAllRecordings = async () => {
  try {
    const index = await getAudioIndex();
    return index.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting all recordings:', error);
    return [];
  }
};

// Delete a recording (compatible with both parameter styles)
export const deleteRecording = async (childIdOrRecordingId, recordingId = null) => {
  try {
    const index = await getAudioIndex();
    
    // Handle two parameter styles:
    // 1. deleteRecording(childId, recordingId) - from AudioFilesScreen
    // 2. deleteRecording(recordingId) - from other screens
    let recording;
    if (recordingId) {
      // Two parameter style
      recording = index.find(r => r.childId === childIdOrRecordingId && r.id === recordingId);
    } else {
      // Single parameter style
      recording = index.find(r => r.id === childIdOrRecordingId);
    }
    
    if (recording) {
      // Delete the file
      const fileInfo = await FileSystem.getInfoAsync(recording.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(recording.uri);
      }
      
      // Update index
      const updatedIndex = index.filter(r => r.id !== recording.id);
      await updateAudioIndex(updatedIndex);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
};

// Delete all recordings for a child (useful when deleting a child profile)
export const deleteChildRecordings = async (childId) => {
  try {
    const index = await getAudioIndex();
    const childRecordings = index.filter(r => r.childId === childId);
    
    // Delete all files
    for (const recording of childRecordings) {
      const fileInfo = await FileSystem.getInfoAsync(recording.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(recording.uri);
      }
    }
    
    // Update index
    const updatedIndex = index.filter(r => r.childId !== childId);
    await updateAudioIndex(updatedIndex);
    
    return true;
  } catch (error) {
    console.error('Error deleting child recordings:', error);
    throw error;
  }
};

// Delete child and cleanup all recordings (for ParentDashboard)
export const deleteChildWithCleanup = async (childId) => {
  try {
    // Delete all recordings for this child
    await deleteChildRecordings(childId);
    return true;
  } catch (error) {
    console.error('Error in deleteChildWithCleanup:', error);
    throw error;
  }
};

// Get recording by ID
export const getRecordingById = async (recordingId) => {
  try {
    const index = await getAudioIndex();
    return index.find(r => r.id === recordingId);
  } catch (error) {
    console.error('Error getting recording by ID:', error);
    return null;
  }
};

// Check if recording exists
export const recordingExists = async (recordingId) => {
  try {
    const recording = await getRecordingById(recordingId);
    if (!recording) return false;
    
    const fileInfo = await FileSystem.getInfoAsync(recording.uri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error checking recording exists:', error);
    return false;
  }
};

// Clean up orphaned files (files that exist but aren't in index)
export const cleanupOrphanedFiles = async () => {
  try {
    await ensureDirectoryExists();
    const dirContents = await FileSystem.readDirectoryAsync(AUDIO_DIR);
    const index = await getAudioIndex();
    const indexedFiles = index.map(r => r.fileName);
    
    // Delete files not in index
    for (const file of dirContents) {
      if (!indexedFiles.includes(file)) {
        await FileSystem.deleteAsync(`${AUDIO_DIR}${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
  }
};

// Extract wishlist from local recordings (placeholder - needs backend integration)
export const extractWishlistLocal = async (childId, childName, token) => {
  try {
    const recordings = await getRecordingsForChild(childId);
    
    if (recordings.length === 0) {
      return { wishlist: [] };
    }
    
    // Collect all transcriptions
    const transcriptions = recordings
      .map(r => r.transcription)
      .filter(t => t && t.trim())
      .join(' ');
    
    if (!transcriptions) {
      return { wishlist: [] };
    }
    
    // Here you would call your backend to extract wishlist items from transcriptions
    // For now, return a placeholder
    // TODO: Implement API call to backend
    // const response = await fetch('YOUR_BACKEND_URL/api/extract-wishlist', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify({ transcriptions, childId })
    // });
    // const data = await response.json();
    // return { wishlist: data.wishlist };
    
    // Placeholder: Extract simple keywords that might be gifts
    const giftKeywords = ['want', 'like', 'wish', 'get', 'need'];
    const words = transcriptions.toLowerCase().split(/\s+/);
    const potentialGifts = [];
    
    for (let i = 0; i < words.length; i++) {
      if (giftKeywords.includes(words[i]) && words[i + 1]) {
        potentialGifts.push(words[i + 1]);
      }
    }
    
    return { wishlist: [...new Set(potentialGifts)].slice(0, 10) };
  } catch (error) {
    console.error('Error extracting wishlist:', error);
    throw error;
  }
};

export default {
  saveRecording,
  saveAudioLocally,
  getRecordingsForChild,
  getChildRecordings,
  getAllRecordings,
  deleteRecording,
  deleteChildRecordings,
  deleteChildWithCleanup,
  getRecordingById,
  recordingExists,
  cleanupOrphanedFiles,
  extractWishlistLocal
};