import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AddChildCard({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={['#4CAF50', '#81C784']} style={styles.card}>
        <View style={styles.content}>
          <Ionicons name="add-circle-outline" size={32} color="#fff" />
          <Text style={styles.text}>Add New Child</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 25,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  text: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
});
