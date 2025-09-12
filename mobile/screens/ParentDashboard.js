import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import * as childService from '../services/childService';
import Snowflakes from '../components/Snowflakes';

export default function ParentDashboard({ navigation }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(null); // Track selected child

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const data = await childService.getChildren();
      setChildren(data || []);
      // Clear selection if selected child no longer exists
      if (!data.some(c => c._id === selectedChildId)) setSelectedChildId(null);
    } catch (err) {
      console.error('Failed to fetch children:', err);
      if (!err.message.includes('404')) {
        Alert.alert('Error', 'Failed to load children');
      } else {
        setChildren([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchChildren);
    return unsubscribe;
  }, [navigation]);

  const handleNavigateToChild = (childId = null) => {
    navigation.navigate('ChildProfile', { childId, onGoBack: fetchChildren });
  };

  const handleDeleteChild = (childId, childName) => {
    Alert.alert(
      'Delete Child',
      `Are you sure you want to delete ${childName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await childService.deleteChild(childId);
              fetchChildren();
            } catch (err) {
              console.error('Failed to delete child:', err);
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const renderChild = ({ item, index }) => {
    const isSelected = selectedChildId === item._id;

    return (
      <Animatable.View animation="fadeInUp" delay={index * 100}>
        <LinearGradient
          colors={['#b71c1c', '#f44336']}
          style={[
            styles.childCard,
            isSelected && { borderWidth: 3, borderColor: '#FFD700' }, // highlight selected
          ]}
        >
          <TouchableOpacity
            onPress={() => setSelectedChildId(item._id)}
            activeOpacity={0.8}
          >
            <View style={styles.childInfo}>
              <Image
                source={{ uri: item.avatar || 'https://i.pravatar.cc/100' }}
                style={styles.avatar}
              />
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.childName}>{item.name}</Text>
                <Text style={styles.childAge}>{item.age} years old</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cardButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleNavigateToChild(item._id)}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={styles.buttonText}> Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardButton, { backgroundColor: '#FF5252' }]}
              onPress={() => handleDeleteChild(item._id, item.name)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.buttonText}> Delete</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b71c1c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Snowflakes />

      <Text style={styles.title}>Parent Dashboard</Text>

      {children.length > 0 ? (
        <FlatList
          data={children}
          keyExtractor={(item) => item._id}
          renderItem={renderChild}
          contentContainerStyle={{ paddingVertical: 10 }}
        />
      ) : (
        <Text style={styles.emptyText}>No children added yet.</Text>
      )}

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.bottomButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => handleNavigateToChild()}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}> Add New Child</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.bottomButton,
            { backgroundColor: selectedChildId ? '#2196F3' : '#888' },
          ]}
          onPress={() =>
            selectedChildId
              ? navigation.navigate('SantaChat', { childId: selectedChildId })
              : Alert.alert('Select a child', 'Please select a child first.')
          }
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}> Chat with Santa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b71c1c',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 20,
  },
  childCard: {
    borderRadius: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  childInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  childName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  childAge: { fontSize: 14, color: '#fff' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  emptyText: { textAlign: 'center', marginVertical: 20, color: '#fff', fontSize: 16 },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  bottomButton: {
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
