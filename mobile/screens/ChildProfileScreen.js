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
import { Picker } from '@react-native-picker/picker'; // add picker
import * as childService from '../services/childService';
import Snowflakes from '../components/Snowflakes';

export default function ChildProfileScreen({ route, navigation }) {
  const { childId, onGoBack } = route.params || {};
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male'); // default
  const [phoneticSpelling, setPhoneticSpelling] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (childId) {
      setLoading(true);
      childService.getChild(childId)
        .then((data) => {
          setName(data.name || '');
          setAge(data.age?.toString() || '');
          setGender(data.gender || 'male');
          setPhoneticSpelling(data.phoneticSpelling || '');
        })
        .catch(() => Alert.alert('Error', 'Failed to load child data'))
        .finally(() => setLoading(false));
    }
  }, [childId]);

  const handleSave = async () => {
    if (!name.trim() || !age.trim() || !gender.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields');
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
            placeholder="Child Name"
            placeholderTextColor="#eee"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Age"
            placeholderTextColor="#eee"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />

          {/* Gender Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Gender</Text>
            <Picker
              selectedValue={gender}
              style={styles.picker}
              onValueChange={(itemValue) => setGender(itemValue)}
            >
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
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
  pickerContainer: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    padding: 10,
  },
  picker: {
    color: '#fff',
    backgroundColor: '#f44336',
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
