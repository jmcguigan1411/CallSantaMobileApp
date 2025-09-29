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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as childService from '../services/childService';
import Snowflakes from '../components/Snowflakes';

export default function ChildProfileScreen({ route, navigation }) {
  const { childId, onGoBack } = route.params || {};
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState(''); // Changed to empty string (no default)
  const [phoneticSpelling, setPhoneticSpelling] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (childId) {
      setLoading(true);
      childService.getChild(childId)
        .then((data) => {
          setName(data.name || '');
          setAge(data.age?.toString() || '');
          setGender(data.gender || '');
          setPhoneticSpelling(data.phoneticSpelling || '');
        })
        .catch(() => Alert.alert('Error', 'Failed to load child data'))
        .finally(() => setLoading(false));
    }
  }, [childId]);

  const handleSave = async () => {
    // Updated validation to check for gender selection
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
      };
      if (childId) {
        await childService.updateChild(childId, childData);
      } else {
        await childService.addChild(childData);
      }
      if (typeof onGoBack === 'function') onGoBack();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save child');
    } finally {
      setLoading(false);
    }
  };

  // Gender checkbox component
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Snowflakes />

          <Text style={styles.title}>{childId ? 'Edit Child' : 'Add Child'}</Text>

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

          {/* Gender Checkboxes */}
          <View style={styles.genderSection}>
            <Text style={styles.sectionLabel}>Gender *</Text>
            <View style={styles.checkboxRow}>
              <GenderCheckbox value="male" label="Boy" icon="male" />
              <GenderCheckbox value="female" label="Girl" icon="female" />
            </View>
          </View>

          {/* Phonetic Spelling */}
          <TextInput
            style={styles.input}
            placeholder="Phonetic Spelling (e.g. Kee-rah for Ciara)"
            placeholderTextColor="#eee"
            value={phoneticSpelling}
            onChangeText={setPhoneticSpelling}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>{childId ? 'Update Child' : 'Add Child'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: '#b71c1c' },
  title: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
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
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});