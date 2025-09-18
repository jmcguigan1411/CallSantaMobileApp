// mobile/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // for all login/register/social actions
  const [loaded, setLoaded] = useState(false);   // true once token check completes

  // Load stored token on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('[AuthContext] Loading stored token:', token ? 'Found' : 'Not found');
        if (token) {
          setUser({ token });
        }
      } catch (error) {
        console.error('[AuthContext] Error loading token:', error);
      } finally {
        setLoaded(true);
      }
    };
    loadUser();
  }, []);

  // Email/password login
  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      if (!data?.token) throw new Error('Login failed, no token returned');
      
      console.log('[AuthContext] Login successful, storing token');
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

  // Email/password register
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await authService.register(name, email, password);
      if (!data?.token) throw new Error('Registration failed, no token returned');
      
      console.log('[AuthContext] Registration successful, storing token');
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

  // Social login (Google / Apple)
  const socialLogin = async (provider, token) => {
    setLoading(true);
    try {
      const data = await authService.socialLogin(provider, token);
      if (!data?.token) throw new Error(`${provider} login failed, no token returned`);
      
      console.log(`[AuthContext] ${provider} login successful, storing token`);
      setUser(data);
      await AsyncStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      console.error('SOCIAL LOGIN ERROR:', error);
      Alert.alert('Login Error', error.message || `Failed to login with ${provider}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    console.log('[AuthContext] Logging out, removing token');
    setUser(null);
    await AsyncStorage.removeItem('token');
  };

  // Update Profile (name, email, password)
  const updateProfile = async ({ name, email, currentPassword, newPassword }) => {
    setLoading(true);
    try {
      const token = user?.token;
      const res = await fetch('http://localhost:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      
      // Update context with new user info
      setUser(prev => ({ ...prev, ...data }));
      if (data.token) {
        console.log('[AuthContext] Profile updated, storing new token');
        await AsyncStorage.setItem('token', data.token);
      }
      return data;
    } catch (err) {
      console.error('UPDATE PROFILE ERROR:', err);
      Alert.alert('Error', err.message || 'Failed to update profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Debug logging for token access
  const token = user?.token;
  console.log('[AuthContext] Current state:', {
    hasUser: !!user,
    hasToken: !!token,
    loaded
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        token: user?.token, // Expose token directly for easy access
        loading,
        loaded,
        login,
        register,
        socialLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};