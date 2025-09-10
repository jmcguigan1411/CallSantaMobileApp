import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as childService from '../services/childService';

export default function ParentDashboard({ navigation }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch children only if they exist
  const fetchChildren = async () => {
    setLoading(true);
    try {
      const data = await childService.getChildren();
      setChildren(data || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
      if (!err.message.includes('404')) {
        Alert.alert('Error', 'Failed to load children');
      } else {
        setChildren([]); // no children yet
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
    navigation.navigate('ChildProfile', {
      childId,
      onGoBack: fetchChildren,
    });
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

  const renderChild = ({ item }) => (
    <TouchableOpacity
      style={styles.childCard}
      onPress={() => handleNavigateToChild(item._id)}
    >
      <Text style={styles.childName}>{item.name}</Text>
      <Text style={styles.childAge}>Age: {item.age}</Text>
      <View style={styles.buttonRow}>
        <Button title="Edit" onPress={() => handleNavigateToChild(item._id)} />
        <Button
          title="Delete"
          color="red"
          onPress={() => handleDeleteChild(item._id, item.name)}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent Dashboard</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <>
          {children.length > 0 ? (
            <FlatList
              data={children}
              keyExtractor={(item) => item._id}
              renderItem={renderChild}
            />
          ) : (
            <Text style={styles.emptyText}>No children added yet.</Text>
          )}
          <Button title="Add New Child" onPress={() => handleNavigateToChild()} />
          <Button title="Chat with Santa" onPress={() => navigation.navigate('SantaChat')} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  childCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  childName: { fontSize: 18, fontWeight: 'bold' },
  childAge: { fontSize: 16, color: '#555', marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emptyText: { textAlign: 'center', marginVertical: 20, color: '#777' },
});
