import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ChatWithSantaCard({ onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      style={{ marginVertical: 10 }}
    >
      <LinearGradient
        colors={disabled ? ['#888', '#aaa'] : ['#2196F3', '#1976D2']}
        style={styles.card}
      >
        <View style={styles.content}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
          <Text style={styles.text}>Chat with Santa</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
});
