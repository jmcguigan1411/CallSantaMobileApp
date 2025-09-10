// mobile/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // for login/register actions
  const [loaded, setLoaded] = useState(false);   // true once token check completes

  // Load user token from storage on app start
  useEffect(() => {
    const loadUser = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setUser({ token });
      }
      setLoaded(true);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);

      if (!data || !data.token) {
        throw new Error('Login failed, no token returned');
      }

      setUser(data);
      await AsyncStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      Alert.alert('Login Error', error.message || 'Failed to login');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await authService.register(name, email, password);

      if (!data || !data.token) {
        throw new Error('Registration failed, no token returned');
      }

      setUser(data);
      await AsyncStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      console.error('REGISTER ERROR:', error);
      Alert.alert('Registration Error', error.message || 'Failed to register');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, loaded, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
