import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ChildCard({ child, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <LinearGradient
      colors={['#b71c1c', '#f44336']}
      style={[
        styles.card,
        isSelected && { borderWidth: 3, borderColor: '#FFD700' },
      ]}
    >
      <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
        <View style={styles.infoRow}>
          <Image
            source={{ uri: child.avatar || 'https://i.pravatar.cc/100' }}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.name}>{child.name}</Text>
            <Text style={styles.subText}>
              {child.age} years old • {child.gender || 'Unknown'}
            </Text>
            {child.phoneticSpelling ? (
              <Text style={styles.subText}>Phonetic: {child.phoneticSpelling}</Text>
            ) : null}
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color="#FFD700" />}
        </View>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        {onEdit && (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#4CAF50' }]} onPress={onEdit}>
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={styles.buttonText}> Edit</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#FF5252' }]} onPress={onDelete}>
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.buttonText}> Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
