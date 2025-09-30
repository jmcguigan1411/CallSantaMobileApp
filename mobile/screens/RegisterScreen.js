import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Snowflakes from '../components/Snowflakes';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { isPasswordValid } from '../utils/passwordValidation';

export default function RegisterScreen({ navigation }) {
  const { register, loading } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    if (!isPasswordValid(password)) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    const data = await register(name, email, password);
    if (data) {
      navigation.replace('AppDrawer');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#b71c1c' }}>
      <Snowflakes />
      <View style={styles.card}>
        <Image
          source={{ uri: 'https://www.pngall.com/wp-content/uploads/2016/04/Santa-Hat-Download-PNG.png' }}
          style={styles.santaHat}
        />
        <Text style={styles.title}>🎅 Register</Text>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.icon}>🙋‍♂️</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.icon}>📧</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.icon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Password Strength Indicator */}
        {password.length > 0 && <PasswordStrengthIndicator password={password} />}

        {/* Register Button */}
        <TouchableOpacity 
          style={[styles.button, !isPasswordValid(password) && password.length > 0 && styles.buttonDisabled]} 
          onPress={handleRegister} 
          disabled={loading || (password.length > 0 && !isPasswordValid(password))}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'REGISTER'}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
            Login
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 60,
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: 'center',
  },
  santaHat: {
    width: 60,
    height: 60,
    position: 'absolute',
    top: -30,
  },
  title: {
    fontSize: 24,
    color: '#b71c1c',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    width: '100%',
  },
  icon: { marginRight: 8, fontSize: 18 },
  input: { flex: 1, padding: 10 },
  eyeIcon: { fontSize: 18, padding: 5 },
  button: {
    backgroundColor: '#b71c1c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  footer: { color: '#333', marginTop: 20 },
  link: { color: '#b71c1c', fontWeight: 'bold' },
});