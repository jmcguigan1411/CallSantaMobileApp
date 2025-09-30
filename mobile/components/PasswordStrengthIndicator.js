import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { passwordCriteria, validatePassword } from '../utils/passwordValidation';

export default function PasswordStrengthIndicator({ password }) {
  const validation = validatePassword(password);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password Requirements:</Text>
      {Object.keys(passwordCriteria).map((key) => {
        const isValid = validation[key];
        return (
          <View key={key} style={styles.criteriaRow}>
            <Ionicons
              name={isValid ? 'checkmark-circle' : 'close-circle-outline'}
              size={20}
              color={isValid ? '#4CAF50' : '#999'}
            />
            <Text style={[styles.criteriaText, isValid && styles.criteriaTextValid]}>
              {passwordCriteria[key].message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criteriaText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  criteriaTextValid: {
    color: '#4CAF50',
    fontWeight: '500',
  },
});