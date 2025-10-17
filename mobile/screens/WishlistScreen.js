import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as childService from '../services/childService';
import Snowflakes from '../components/Snowflakes';

function WishlistScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    // Reload when screen comes into focus (after extracting wishlist)
    const unsubscribe = navigation.addListener('focus', () => {
      loadChildren();
    });
    return unsubscribe;
  }, [navigation]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const data = await childService.getChildren();
      setChildren(data);
      
      // Keep selected child or select first one
      if (selectedChild) {
        const updated = data.find(c => c._id === selectedChild._id);
        setSelectedChild(updated || data[0]);
      } else if (data.length > 0) {
        setSelectedChild(data[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const removeWishlistItem = async (item) => {
    Alert.alert(
      'Remove Item',
      `Remove "${item}" from ${selectedChild.name}'s wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedWishlist = selectedChild.wishlist.filter(i => i !== item);
              await childService.updateChild(selectedChild._id, {
                wishlist: updatedWishlist,
              });
              await loadChildren();
              Alert.alert('Success', 'Item removed from wishlist');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const clearWishlist = async () => {
    Alert.alert(
      'Clear Wishlist',
      `Clear all items from ${selectedChild.name}'s wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await childService.updateChild(selectedChild._id, {
                wishlist: [],
              });
              await loadChildren();
              Alert.alert('Success', 'Wishlist cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear wishlist');
            }
          },
        },
      ]
    );
  };

  const renderWishlistItem = ({ item, index }) => (
    <View style={styles.wishlistItem}>
      <View style={styles.itemContent}>
        <View style={styles.itemNumber}>
          <Text style={styles.itemNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.itemText}>{item}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeWishlistItem(item)}
      >
        <Ionicons name="close-circle" size={24} color="#f44336" />
      </TouchableOpacity>
    </View>
  );

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
          <Ionicons name="gift-outline" size={80} color="#ddd" />
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
                  {child.wishlist && child.wishlist.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{child.wishlist.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Wishlist Content */}
          {!selectedChild?.wishlist || selectedChild.wishlist.length === 0 ? (
            <View style={styles.emptyWishlistContainer}>
              <Ionicons name="gift-outline" size={80} color="#ddd" />
              <Text style={styles.emptyWishlistText}>
                {selectedChild?.name}'s wishlist is empty
              </Text>
              <Text style={styles.emptyWishlistSubtext}>
                Make Santa calls and extract the wishlist from recordings
              </Text>
              <TouchableOpacity
                style={styles.goToAudioButton}
                onPress={() => navigation.navigate('AudioFiles')}
              >
                <Ionicons name="musical-notes" size={20} color="#fff" />
                <Text style={styles.goToAudioButtonText}>Go to Audio Files</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                  <Ionicons name="gift" size={24} color="#FFD700" />
                  <Text style={styles.headerTitle}>
                    {selectedChild.name}'s Wishlist
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearWishlist}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedChild.wishlist}
                renderItem={renderWishlistItem}
                keyExtractor={(item, index) => `${item}-${index}`}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  badge: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#b71c1c',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyWishlistContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyWishlistText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyWishlistSubtext: {
    color: '#ddd',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  goToAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
    gap: 8,
  },
  goToAudioButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#a71c1c',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 5,
  },
});

export default WishlistScreen;