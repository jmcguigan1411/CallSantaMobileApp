import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as childService from '../services/childService';
import {
  getChildWishlist,
  addWishlistItem,
  toggleWishlistItem,
  deleteWishlistItem
} from '../services/wishlistService';
import Snowflakes from '../components/Snowflakes';

export default function ChildProfileScreen({ route, navigation }) {
  const { childId, onGoBack } = route.params || {};
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phoneticSpelling, setPhoneticSpelling] = useState('');
  const [hasBehavioralNotes, setHasBehavioralNotes] = useState(false);
  const [goodBehavior, setGoodBehavior] = useState('');
  const [badBehavior, setBadBehavior] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Wishlist state
  const [wishlist, setWishlist] = useState([]);
  const [newWishItem, setNewWishItem] = useState('');
  const [showWishlist, setShowWishlist] = useState(false);

  useEffect(() => {
    if (childId) {
      setLoading(true);
      childService.getChild(childId)
        .then((data) => {
          setName(data.name || '');
          setAge(data.age?.toString() || '');
          setGender(data.gender || '');
          setPhoneticSpelling(data.phoneticSpelling || '');
          setHasBehavioralNotes(data.hasBehavioralNotes || false);
          setGoodBehavior(data.goodBehavior || '');
          setBadBehavior(data.badBehavior || '');
        })
        .catch(() => Alert.alert('Error', 'Failed to load child data'))
        .finally(() => setLoading(false));
      
      // Load wishlist
      loadWishlist();
    }
  }, [childId]);

  const loadWishlist = async () => {
    if (!childId) return;
    try {
      const items = await getChildWishlist(childId);
      setWishlist(items);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const handleAddWishItem = async () => {
    if (!newWishItem.trim()) return;
    
    if (!childId) {
      Alert.alert('Error', 'Please save the profile first before adding wishlist items');
      return;
    }

    try {
      await addWishlistItem(childId, newWishItem);
      setNewWishItem('');
      await loadWishlist();
    } catch (error) {
      Alert.alert('Error', 'Failed to add wishlist item');
    }
  };

  const handleToggleItem = async (itemId) => {
    try {
      await toggleWishlistItem(childId, itemId);
      await loadWishlist();
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Delete Item',
      'Remove this item from the wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWishlistItem(childId, itemId);
              await loadWishlist();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter the child\'s name');
      return;
    }
    if (!age.trim()) {
      Alert.alert('Validation', 'Please enter the child\'s age');
      return;
    }
    if (!gender) {
      Alert.alert('Validation', 'Please select a gender');
      return;
    }
    
    try {
      setLoading(true);
      const childData = {
        name,
        age,
        gender,
        phoneticSpelling,
        hasBehavioralNotes,
        goodBehavior: hasBehavioralNotes ? goodBehavior : '',
        badBehavior: hasBehavioralNotes ? badBehavior : '',
      };
      
      if (childId) {
        await childService.updateChild(childId, childData);
        Alert.alert('Success', 'Child profile updated');
      } else {
        await childService.addChild(childData);
        Alert.alert('Success', 'Child profile created');
        
        setName('');
        setAge('');
        setGender('');
        setPhoneticSpelling('');
        setHasBehavioralNotes(false);
        setGoodBehavior('');
        setBadBehavior('');
      }
      
      if (typeof onGoBack === 'function') onGoBack();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save child');
    } finally {
      setLoading(false);
    }
  };

  const GenderCheckbox = ({ value, label, icon }) => {
    const isSelected = gender === value;
    return (
      <TouchableOpacity
        style={[styles.checkboxContainer, isSelected && styles.checkboxSelected]}
        onPress={() => setGender(value)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
          {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
        </View>
        <Ionicons 
          name={icon} 
          size={24} 
          color={isSelected ? '#FFD700' : '#fff'} 
          style={{ marginLeft: 10 }}
        />
        <Text style={[styles.checkboxLabel, isSelected && styles.checkboxLabelActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: '#b71c1c' }}>
          <Snowflakes />
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {childId ? 'Edit Child' : 'Add Child'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Child Name *"
              placeholderTextColor="#eee"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Age *"
              placeholderTextColor="#eee"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />

            <View style={styles.genderSection}>
              <Text style={styles.sectionLabel}>Gender *</Text>
              <View style={styles.checkboxRow}>
                <GenderCheckbox value="male" label="Boy" icon="male" />
                <GenderCheckbox value="female" label="Girl" icon="female" />
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Phonetic Spelling (e.g. Kee-rah for Ciara)"
              placeholderTextColor="#eee"
              value={phoneticSpelling}
              onChangeText={setPhoneticSpelling}
            />

            {/* Behavioral Notes Toggle */}
            <View style={styles.behaviorToggleContainer}>
              <View style={styles.behaviorToggleHeader}>
                <Ionicons name="list" size={24} color="#fff" />
                <Text style={styles.behaviorToggleLabel}>Add Behavioral Notes for Santa</Text>
              </View>
              <Switch
                value={hasBehavioralNotes}
                onValueChange={setHasBehavioralNotes}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={hasBehavioralNotes ? '#FFD700' : '#f4f3f4'}
              />
            </View>

            {hasBehavioralNotes && (
              <View style={styles.behaviorNotesContainer}>
                <Text style={styles.behaviorNotesTitle}>
                  Santa will mention these during the call
                </Text>
                
                <View style={styles.behaviorInputGroup}>
                  <View style={styles.behaviorLabelRow}>
                    <Ionicons name="happy" size={20} color="#4CAF50" />
                    <Text style={styles.behaviorLabel}>Good Behavior (Nice List)</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.behaviorInput]}
                    placeholder="E.g., Helped with chores, kind to siblings..."
                    placeholderTextColor="#ccc"
                    value={goodBehavior}
                    onChangeText={setGoodBehavior}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.behaviorInputGroup}>
                  <View style={styles.behaviorLabelRow}>
                    <Ionicons name="sad" size={20} color="#FF5252" />
                    <Text style={styles.behaviorLabel}>Bad Behavior (Naughty List)</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.behaviorInput]}
                    placeholder="E.g., Not listening, arguing with parents..."
                    placeholderTextColor="#ccc"
                    value={badBehavior}
                    onChangeText={setBadBehavior}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            )}

            {/* Wishlist Section - Only show if editing */}
            {childId && (
              <View style={styles.wishlistSection}>
                <TouchableOpacity
                  style={styles.behaviorToggleContainer}
                  onPress={() => setShowWishlist(!showWishlist)}
                >
                  <View style={styles.behaviorToggleHeader}>
                    <Ionicons name="gift" size={24} color="#FFD700" />
                    <Text style={styles.behaviorToggleLabel}>
                      Wishlist ({wishlist.length})
                    </Text>
                  </View>
                  <Ionicons 
                    name={showWishlist ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>

                {showWishlist && (
                  <View style={styles.wishlistContainer}>
                    {/* Add Item Input */}
                    <View style={styles.addWishContainer}>
                      <TextInput
                        style={[styles.input, styles.wishInput]}
                        placeholder="Add a wish..."
                        placeholderTextColor="#ccc"
                        value={newWishItem}
                        onChangeText={setNewWishItem}
                        onSubmitEditing={handleAddWishItem}
                      />
                      <TouchableOpacity
                        style={styles.addWishButton}
                        onPress={handleAddWishItem}
                      >
                        <Ionicons name="add-circle" size={32} color="#4CAF50" />
                      </TouchableOpacity>
                    </View>

                    {/* Wishlist Items */}
                    {wishlist.length === 0 ? (
                      <Text style={styles.emptyWishlist}>
                        No items yet. Add wishes or chat with Santa!
                      </Text>
                    ) : (
                      wishlist.map((item) => (
                        <View key={item.id} style={styles.wishItem}>
                          <TouchableOpacity
                            style={styles.wishItemContent}
                            onPress={() => handleToggleItem(item.id)}
                          >
                            <Ionicons
                              name={item.completed ? "checkbox" : "square-outline"}
                              size={24}
                              color={item.completed ? "#4CAF50" : "#fff"}
                            />
                            <View style={styles.wishItemTextContainer}>
                              <Text
                                style={[
                                  styles.wishItemText,
                                  item.completed && styles.wishItemCompleted
                                ]}
                              >
                                {item.item}
                              </Text>
                              {item.fromChat && (
                                <Text style={styles.fromChatBadge}>
                                  📞 From Santa Chat
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteWishButton}
                            onPress={() => handleDeleteItem(item.id)}
                          >
                            <Ionicons name="trash" size={20} color="#FF5252" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>{childId ? 'Update Child' : 'Add Child'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#b71c1c',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 44,
  },
  container: { 
    flexGrow: 1, 
    padding: 20, 
    paddingTop: 10,
  },
  input: {
    backgroundColor: '#f44336',
    color: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  genderSection: {
    marginBottom: 15,
  },
  sectionLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  checkboxContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkboxSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#e53935',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  checkboxLabelActive: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  behaviorToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f44336',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  behaviorToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  behaviorToggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  behaviorNotesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  behaviorNotesTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  behaviorInputGroup: {
    marginBottom: 15,
  },
  behaviorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  behaviorLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  behaviorInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  // Wishlist Styles
  wishlistSection: {
    marginBottom: 15,
  },
  wishlistContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginTop: -10,
  },
  addWishContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  wishInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  addWishButton: {
    padding: 5,
  },
  emptyWishlist: {
    textAlign: 'center',
    color: '#FFD700',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  wishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  wishItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wishItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  wishItemText: {
    fontSize: 16,
    color: '#fff',
  },
  wishItemCompleted: {
    textDecorationLine: 'line-through',
    color: '#ccc',
  },
  fromChatBadge: {
    fontSize: 11,
    color: '#FFD700',
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteWishButton: {
    padding: 8,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#b71c1c',
  },
});
