import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as childService from '../services/childService';
import Snowflakes from '../components/Snowflakes';
import ChildCard from '../components/ChildCard';
import AddChildCard from '../components/AddChildCard';
import ChatWithSantaCard from '../components/ChatWithSantaCard';
import * as Animatable from 'react-native-animatable';

export default function ParentDashboard({ navigation }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(null);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const data = await childService.getChildren();
      setChildren(data || []);
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

  const renderChild = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" delay={index * 100}>
      <ChildCard
        child={item}
        isSelected={selectedChildId === item._id}
        onSelect={() => setSelectedChildId(item._id)}
        onEdit={() => handleNavigateToChild(item._id)}
        onDelete={() => handleDeleteChild(item._id, item.name)}
      />
    </Animatable.View>
  );

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

      <FlatList
        data={children}
        keyExtractor={(item) => item._id}
        renderItem={renderChild}
        ListFooterComponent={
          <View>
            <AddChildCard onPress={() => handleNavigateToChild()} />
            <ChatWithSantaCard
              disabled={!selectedChildId}
              onPress={() => {
                if (!selectedChildId) return;
                const selectedChild = children.find(c => c._id === selectedChildId);
                navigation.navigate('SantaChat', { child: selectedChild });
              }}
            />
          </View>
        }
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      {children.length === 0 && (
        <Text style={styles.emptyText}>No children added yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#af1f1fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
