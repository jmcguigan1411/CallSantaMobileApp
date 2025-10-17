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
import * as localAudioService from '../services/localAudioService';
// import { useTooltips } from '../context/TooltipContext'; // COMMENTED OUT - TooltipProvider disabled
import Snowflakes from '../components/Snowflakes';
import ChildCard from '../components/ChildCard';
import AddChildCard from '../components/AddChildCard';
import ChatWithSantaCard from '../components/ChatWithSantaCard';
// import TooltipOverlay from '../components/TooltipOverlay'; // COMMENTED OUT - TooltipProvider disabled
import * as Animatable from 'react-native-animatable';

export default function ParentDashboard({ navigation }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(null);
  
  // COMMENTED OUT - TooltipProvider disabled
  // const { TUTORIAL_STEPS, shouldShowTooltip } = useTooltips();

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
      `Are you sure you want to delete ${childName}? This will also delete all recordings and wishlist items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await localAudioService.deleteChildWithCleanup(childId);
              Alert.alert('Success', `${childName} has been deleted.`);
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
      
      {/* COMMENTED OUT - TooltipProvider disabled
      <TooltipOverlay
        step={TUTORIAL_STEPS.WELCOME}
        title="Welcome to Call Santa! 🎅"
        message="Let's get started! First, you'll need to add a child profile. Then you can chat with Santa and create wishlists. Let me show you how!"
        position="center"
      />
      */}

      {/* COMMENTED OUT - TooltipProvider disabled
      {children.length === 0 && (
        <TooltipOverlay
          step={TUTORIAL_STEPS.ADD_CHILD}
          title="Add a Child Profile"
          message="Tap the 'Add Child' card below to create a profile for your child. You'll enter their name, age, and a few details so Santa knows who he's talking to!"
          position="center"
        />
      )}
      */}

      {/* COMMENTED OUT - TooltipProvider disabled
      {children.length > 0 && selectedChildId && (
        <TooltipOverlay
          step={TUTORIAL_STEPS.CHAT_WITH_SANTA}
          title="Chat with Santa 🎄"
          message="Great! Now select a child and tap 'Chat with Santa' to start a magical conversation. Santa will ask about their wishlist and record the call!"
          position="center"
        />
      )}
      */}

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
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#af1f1fff',
  },
});