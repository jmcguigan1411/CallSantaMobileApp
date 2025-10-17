// services/wishlistService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const WISHLIST_KEY = 'wishlists';

// Get all wishlists from local storage
const getWishlists = async () => {
  try {
    const wishlists = await AsyncStorage.getItem(WISHLIST_KEY);
    return wishlists ? JSON.parse(wishlists) : {};
  } catch (error) {
    console.error('Error getting wishlists:', error);
    return {};
  }
};

// Save wishlists to local storage
const saveWishlists = async (wishlists) => {
  try {
    await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlists));
  } catch (error) {
    console.error('Error saving wishlists:', error);
    throw error;
  }
};

// Get wishlist for a specific child
export const getChildWishlist = async (childId) => {
  try {
    const wishlists = await getWishlists();
    return wishlists[childId] || [];
  } catch (error) {
    console.error('Error getting child wishlist:', error);
    return [];
  }
};

// Add item to wishlist
export const addWishlistItem = async (childId, item) => {
  try {
    const wishlists = await getWishlists();
    
    if (!wishlists[childId]) {
      wishlists[childId] = [];
    }
    
    const newItem = {
      id: `${childId}_${Date.now()}`,
      childId,
      item: item.trim(),
      addedAt: new Date().toISOString(),
      completed: false
    };
    
    wishlists[childId].push(newItem);
    await saveWishlists(wishlists);
    
    return newItem;
  } catch (error) {
    console.error('Error adding wishlist item:', error);
    throw error;
  }
};

// Update wishlist item
export const updateWishlistItem = async (childId, itemId, updates) => {
  try {
    const wishlists = await getWishlists();
    
    if (wishlists[childId]) {
      const itemIndex = wishlists[childId].findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        wishlists[childId][itemIndex] = {
          ...wishlists[childId][itemIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        await saveWishlists(wishlists);
        return wishlists[childId][itemIndex];
      }
    }
    
    throw new Error('Item not found');
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    throw error;
  }
};

// Toggle item completion status
export const toggleWishlistItem = async (childId, itemId) => {
  try {
    const wishlists = await getWishlists();
    
    if (wishlists[childId]) {
      const itemIndex = wishlists[childId].findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        wishlists[childId][itemIndex].completed = !wishlists[childId][itemIndex].completed;
        wishlists[childId][itemIndex].updatedAt = new Date().toISOString();
        await saveWishlists(wishlists);
        return wishlists[childId][itemIndex];
      }
    }
    
    throw new Error('Item not found');
  } catch (error) {
    console.error('Error toggling wishlist item:', error);
    throw error;
  }
};

// Delete wishlist item
export const deleteWishlistItem = async (childId, itemId) => {
  try {
    const wishlists = await getWishlists();
    
    if (wishlists[childId]) {
      wishlists[childId] = wishlists[childId].filter(i => i.id !== itemId);
      await saveWishlists(wishlists);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    throw error;
  }
};

// Delete all wishlist items for a child
export const deleteChildWishlist = async (childId) => {
  try {
    const wishlists = await getWishlists();
    delete wishlists[childId];
    await saveWishlists(wishlists);
    return true;
  } catch (error) {
    console.error('Error deleting child wishlist:', error);
    throw error;
  }
};

// Get all wishlists (for parent to see all children's wishes)
export const getAllWishlists = async () => {
  try {
    return await getWishlists();
  } catch (error) {
    console.error('Error getting all wishlists:', error);
    return {};
  }
};

// Sync wishlist from chat (when Santa extracts items during conversation)
export const syncWishlistFromChat = async (childId, items) => {
  try {
    const wishlists = await getWishlists();
    
    if (!wishlists[childId]) {
      wishlists[childId] = [];
    }
    
    // Add new items from chat that don't already exist
    const existingItems = wishlists[childId].map(i => i.item.toLowerCase());
    
    for (const item of items) {
      const itemLower = item.trim().toLowerCase();
      if (!existingItems.includes(itemLower)) {
        wishlists[childId].push({
          id: `${childId}_${Date.now()}_${Math.random()}`,
          childId,
          item: item.trim(),
          addedAt: new Date().toISOString(),
          completed: false,
          fromChat: true
        });
        existingItems.push(itemLower);
      }
    }
    
    await saveWishlists(wishlists);
    return wishlists[childId];
  } catch (error) {
    console.error('Error syncing wishlist from chat:', error);
    throw error;
  }
};

export default {
  getChildWishlist,
  addWishlistItem,
  updateWishlistItem,
  toggleWishlistItem,
  deleteWishlistItem,
  deleteChildWishlist,
  getAllWishlists,
  syncWishlistFromChat
};
