import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as childService from '../services/childService';

export default function ChildProfileScreen({ route, navigation }) {
  const childId = route.params?.childId; // undefined if adding new
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (childId) {
      setLoading(true);
      childService.getChild(childId)
        .then((data) => {
          setName(data.name || '');
          setAge(data.age?.toString() || '');
        })
        .catch(err => Alert.alert('Error', 'Failed to load child data'))
        .finally(() => setLoading(false));
    }
  }, [childId]);

  const handleSave = async () => {
  try {
    if (childId) {
      // update existing child
      await childService.updateChild(childId, { name, age });
    } else {
      // add new child
      await childService.addChild({ name, age });
    }

    // Call the refresh function if passed
    if (route.params?.onGoBack) {
      route.params.onGoBack();
    }

    navigation.goBack();
  } catch (err) {
    console.error('Save child error:', err);
    Alert.alert('Error', 'Failed to save child');
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>{childId ? 'Edit Child' : 'Add Child'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Child Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />

      <Button title={childId ? 'Update Child' : 'Add Child'} onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
});
