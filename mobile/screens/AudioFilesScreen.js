import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as audioService from '../services/audioService';
import * as childService from '../services/childService';
import Snowflakes from '../components/Snowflakes';
import { LinearGradient } from 'expo-linear-gradient';

export default function AudioFilesScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extractingWishlist, setExtractingWishlist] = useState(false);

  useEffect(() => {
    fetchChildren();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChildren();
    });
    
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (selectedChild) {
      console.log('📼 Child selected:', selectedChild.name, selectedChild._id);
      console.log('📼 Child wishlist:', selectedChild.wishlist);
      
      // Load saved wishlist with duplicate markers
      if (selectedChild.wishlist && selectedChild.wishlist.length > 0) {
        const wishlistWithDuplicates = markDuplicates(selectedChild.wishlist);
        setWishlist(wishlistWithDuplicates);
      } else {
        setWishlist([]);
      }
      
      fetchRecordings(selectedChild._id);
    }
  }, [selectedChild]);

  // Mark duplicate items
  const markDuplicates = (items) => {
    const itemCounts = {};
    const seenItems = {};
    
    // Count occurrences (case-insensitive)
    items.forEach(item => {
      const normalized = item.toLowerCase().trim();
      itemCounts[normalized] = (itemCounts[normalized] || 0) + 1;
    });
    
    // Mark duplicates
    return items.map(item => {
      const normalized = item.toLowerCase().trim();
      if (itemCounts[normalized] > 1) {
        if (!seenItems[normalized]) {
          seenItems[normalized] = true;
          return item; // First occurrence - no marker
        }
        return `${item} (duplicate)`;
      }
      return item;
    });
  };

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const data = await childService.getChildren();
      setChildren(data || []);
      if (data && data.length > 0) {
        setSelectedChild(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      Alert.alert('Error', 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordings = async (childId) => {
    try {
      setLoading(true);
      console.log('📼 Fetching recordings for child:', childId);
      
      const data = await audioService.getChildAudioRecordings(childId, token);
      
      console.log('📼 Received recordings:', data);
      console.log('📼 Number of recordings:', data?.length || 0);
      
      setRecordings(data || []);
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
      Alert.alert('Error', 'Failed to load recordings');
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecording = (recordingId, filename) => {
    Alert.alert(
      'Delete Recording',
      `Are you sure you want to delete ${filename}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await audioService.deleteAudioRecording(recordingId, token);
              fetchRecordings(selectedChild._id);
              Alert.alert('Success', 'Recording deleted');
            } catch (error) {
              console.error('Failed to delete recording:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  const handleExtractWishlist = async () => {
    if (!selectedChild) return;

    try {
      setExtractingWishlist(true);
      const data = await audioService.extractWishlist(selectedChild._id, token);
      
      // Mark duplicates in the new wishlist
      const wishlistWithDuplicates = markDuplicates(data.wishlist || []);
      setWishlist(wishlistWithDuplicates);
      
      // Update the selected child's wishlist in state
      setSelectedChild(prev => ({
        ...prev,
        wishlist: data.wishlist || []
      }));
      
      if (data.wishlist.length === 0) {
        Alert.alert('No Wishlist Items', 'No specific gift requests were found in the recordings.');
      } else {
        Alert.alert(
          'Wishlist Extracted!',
          `Found ${data.wishlist.length} item(s) from ${data.recordingsAnalyzed} recording(s).`
        );
      }
    } catch (error) {
      console.error('Failed to extract wishlist:', error);
      Alert.alert('Error', 'Failed to extract wishlist. Make sure there are recordings available.');
    } finally {
      setExtractingWishlist(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderRecording = ({ item }) => (
    <LinearGradient
      colors={['#d46f34ff', '#dd9b8bff']}
      style={styles.recordingCard}
    >
      <View style={styles.recordingHeader}>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingFilename}>{item.filename}</Text>
          <Text style={styles.recordingMeta}>
            Recording #{item.sequenceNumber} • {formatFileSize(item.fileSize)}
          </Text>
          <Text style={styles.recordingDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRecording(item._id, item.filename)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {item.transcription && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Transcription:</Text>
          <Text style={styles.transcriptionText}>{item.transcription}</Text>
        </View>
      )}
    </LinearGradient>
  );

  const renderWishlistItem = ({ item, index }) => (
    <View style={styles.wishlistItem}>
      <Ionicons name="gift" size={20} color="#FFD700" />
      <Text style={styles.wishlistText}>
        {index + 1}. {item}
      </Text>
    </View>
  );

  if (loading && children.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Snowflakes />

      <View style={styles.childSelector}>
        <Text style={styles.selectorLabel}>Select Child:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {children.map((child) => (
            <TouchableOpacity
              key={child._id}
              style={[
                styles.childButton,
                selectedChild?._id === child._id && styles.childButtonSelected,
              ]}
              onPress={() => setSelectedChild(child)}
            >
              <Text
                style={[
                  styles.childButtonText,
                  selectedChild?._id === child._id && styles.childButtonTextSelected,
                ]}
              >
                {child.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {recordings.length > 0 && (
        <TouchableOpacity
          style={styles.extractButton}
          onPress={handleExtractWishlist}
          disabled={extractingWishlist}
        >
          {extractingWishlist ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.extractButtonText}>
                {wishlist.length > 0 ? 'Re-extract Wishlist' : 'Extract Wishlist'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {wishlist.length > 0 && (
  <View style={styles.wishlistContainer}>
    <Text style={styles.wishlistTitle}>
      🎁 {selectedChild?.name}'s Wishlist
    </Text>
    <ScrollView 
      style={styles.wishlistScrollView}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      {wishlist.map((item, index) => (
        <View key={index} style={styles.wishlistItem}>
          <Ionicons name="gift" size={20} color="#FFD700" />
          <Text style={styles.wishlistText}>
            {index + 1}. {item}
          </Text>
        </View>
      ))}
    </ScrollView>
  </View>
)}
      <Text style={styles.sectionTitle}>
        📼 Audio Recordings ({recordings.length})
      </Text>

      {recordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-off" size={60} color="#fff" />
          <Text style={styles.emptyText}>
            No recordings yet for {selectedChild?.name}
          </Text>
          <Text style={styles.emptySubtext}>
            Recordings will appear here after calls with Santa
          </Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item._id}
          renderItem={renderRecording}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#af1f1fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#af1f1fff',
  },
  childSelector: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  selectorLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  childButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  childButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#FFD700',
  },
  childButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  childButtonTextSelected: {
    fontWeight: 'bold',
  },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  wishlistContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  wishlistTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  wishlistScrollView: {
  maxHeight: 200,
  paddingVertical: 5,
},
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    gap: 10,
  },
  wishlistText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  recordingCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordingInfo: {
    flex: 1,
  },
  recordingFilename: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recordingMeta: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  recordingDate: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    marginTop: 3,
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    padding: 10,
    borderRadius: 8,
  },
  transcriptionContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  transcriptionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  transcriptionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
});