import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as childService from '../services/childService';
import * as localAudioService from '../services/localAudioService';
import Snowflakes from '../components/Snowflakes';

export default function AudioFilesScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    loadChildren();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadRecordings(selectedChild._id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const data = await childService.getChildren();
      setChildren(data);
      if (data.length > 0) {
        setSelectedChild(data[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadRecordings = async (childId) => {
    try {
      setLoading(true);
      const data = await localAudioService.getRecordingsForChild(childId);
      // Sort by date, newest first
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecordings(sortedData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const playRecording = async (recording) => {
    try {
      // Stop any currently playing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
      }

      // If clicking the same recording that was playing, just stop
      if (playingId === recording.id) {
        return;
      }

      // Play the new recording
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(recording.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
          setSound(null);
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to play recording');
      console.error('Playback error:', error);
    }
  };

  const deleteRecording = async (recording) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (playingId === recording.id && sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingId(null);
              }

              await localAudioService.deleteRecording(selectedChild._id, recording.id);
              await loadRecordings(selectedChild._id);
              Alert.alert('Success', 'Recording deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  const extractWishlist = async () => {
    if (!selectedChild || recordings.length === 0) {
      Alert.alert('Info', 'No recordings available to analyze');
      return;
    }

    Alert.alert(
      'Extract Wishlist',
      `Analyze ${recordings.length} recording(s) to extract ${selectedChild.name}'s wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Analyze',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await localAudioService.extractWishlistLocal(
                selectedChild._id,
                selectedChild.name,
                token
              );

              if (result.wishlist && result.wishlist.length > 0) {
                // Update child's wishlist
                await childService.updateChild(selectedChild._id, {
                  wishlist: result.wishlist,
                });

                Alert.alert(
                  'Wishlist Updated',
                  `Found ${result.wishlist.length} items:\n\n${result.wishlist.join('\n')}`,
                  [{ text: 'OK', onPress: () => navigation.navigate('ParentDashboard') }]
                );
              } else {
                Alert.alert('No Items Found', 'Could not extract any wishlist items from the recordings.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to extract wishlist');
              console.error('Wishlist extraction error:', error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderRecording = ({ item }) => {
    const isPlaying = playingId === item.id;

    return (
      <View style={styles.recordingCard}>
        <View style={styles.recordingHeader}>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingNumber}>Recording #{item.sequenceNumber}</Text>
            <Text style={styles.recordingDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.recordingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.playButton]}
              onPress={() => playRecording(item)}
            >
              <Ionicons 
                name={isPlaying ? 'stop' : 'play'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteRecording(item)}
            >
              <Ionicons name="trash" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {item.transcription && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionLabel}>Transcription:</Text>
            <Text style={styles.transcriptionText}>{item.transcription}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && children.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Snowflakes />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Snowflakes />

      {children.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>No children profiles yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('ChildProfile')}
          >
            <Text style={styles.addButtonText}>Add a Child</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Child Selector */}
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Select Child:</Text>
            <View style={styles.childButtons}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child._id}
                  style={[
                    styles.childButton,
                    selectedChild?._id === child._id && styles.childButtonActive,
                  ]}
                  onPress={() => setSelectedChild(child)}
                >
                  <Text
                    style={[
                      styles.childButtonText,
                      selectedChild?._id === child._id && styles.childButtonTextActive,
                    ]}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recordings List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : recordings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-off-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>
                No recordings for {selectedChild?.name} yet
              </Text>
              <Text style={styles.emptySubtext}>
                Make a Santa call to create recordings
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  {recordings.length} recording{recordings.length !== 1 ? 's' : ''} saved on device
                </Text>
                <TouchableOpacity
                  style={styles.extractButton}
                  onPress={extractWishlist}
                  disabled={loading}
                >
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.extractButtonText}>Extract Wishlist</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={recordings}
                renderItem={renderRecording}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b71c1c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#ddd',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 30,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectorContainer: {
    padding: 20,
    backgroundColor: '#a71c1c',
  },
  selectorLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  childButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  childButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  childButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#FFD700',
  },
  childButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  childButtonTextActive: {
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#a71c1c',
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  recordingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recordingDate: {
    fontSize: 12,
    color: '#666',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  transcriptionContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});