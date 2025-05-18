import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the Authentication Context
const AuthContext = createContext();

// Sample user data
const SAMPLE_USERS = [
  {
    id: '1',
    username: 'demo_user',
    email: 'demo@streamverse.com',
    password: 'password123',
    avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
    displayName: 'Demo User',
    subscribers: 120,
    isVerified: true
  },
  {
    id: '2',
    username: 'jane_smith',
    email: 'jane@streamverse.com',
    password: 'password123',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    displayName: 'Jane Smith',
    subscribers: 843,
    isVerified: true
  }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on app start
    const bootstrapAsync = async () => {
      try {
        const userJSON = await AsyncStorage.getItem('user');
        if (userJSON) {
          setUser(JSON.parse(userJSON));
        }
      } catch (e) {
        console.error('Failed to load user from storage', e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      // In a real app, this would be an API call
      const foundUser = SAMPLE_USERS.find(
        (u) => u.email === email && u.password === password
      );

      if (!foundUser) {
        throw new Error('Invalid credentials');
      }

      // Remove sensitive data
      const userToStore = { ...foundUser };
      delete userToStore.password;

      // Store the user
      await AsyncStorage.setItem('user', JSON.stringify(userToStore));
      setUser(userToStore);
      return userToStore;
    } catch (error) {
      throw error;
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, just validate and return the user
      if (!userData.email || !userData.password || !userData.username) {
        throw new Error('Please provide all required fields');
      }

      // Create a new user object
      const newUser = {
        id: Date.now().toString(),
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName || userData.username,
        avatar: userData.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
        subscribers: 0,
        isVerified: false
      };

      // Remove sensitive data
      const userToStore = { ...newUser };
      
      // Store the user
      await AsyncStorage.setItem('user', JSON.stringify(userToStore));
      setUser(userToStore);
      return userToStore;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (e) {
      console.error('Failed to remove user from storage', e);
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (e) {
      console.error('Failed to update user profile', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        signup,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 