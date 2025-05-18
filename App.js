/**
 * StreamVerse - A YouTube Clone
 * React Native App
 */

import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, LogBox, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Auth Context
import { AuthProvider, useAuth } from './src/utils/AuthContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import CreateLivestreamScreen from './src/screens/CreateLivestreamScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'RCTBridge required dispatch_sync to load RCTDevLoadingView',
]);

// Ensure icons are loaded
const loadIconFonts = async () => {
  try {
    await Promise.all([
      MaterialIcons.loadFont(),
      MaterialCommunityIcons.loadFont()
    ]);
    console.log('Icon fonts loaded successfully');
  } catch (error) {
    console.warn('Failed to load icon fonts:', error);
    // Retry loading after a short delay
    setTimeout(() => {
      console.log('Retrying icon font loading...');
      Promise.all([
        MaterialIcons.loadFont(),
        MaterialCommunityIcons.loadFont()
      ]).catch(e => console.warn('Retry failed:', e));
    }, 2000);
  }
};

// Call the function to load fonts
loadIconFonts();

const Stack = createStackNavigator();

// Main navigation component that checks authentication
const AppNavigator = () => {
  const { user, loading } = useAuth();

  // Display loading screen while checking authentication status
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading StreamVerse...</Text>
      </SafeAreaView>
    );
  }

  return (
    <Stack.Navigator 
      initialRouteName={user ? "Home" : "Login"} 
      screenOptions={{ headerShown: false }}
    >
      {user ? (
        // Authenticated screens
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen 
            name="VideoPlayer" 
            component={VideoPlayerScreen} 
            options={{ 
              animationEnabled: true,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen 
            name="CreateLivestream" 
            component={CreateLivestreamScreen} 
            options={{ 
              animationEnabled: true,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ 
              animationEnabled: true,
              gestureEnabled: true,
            }}
          />
        </>
      ) : (
        // Authentication screens
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            animationEnabled: true,
            gestureEnabled: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};

function App() {
  // Force the app to reload any font changes
  useEffect(() => {
    console.log('StreamVerse App Loaded');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <AppNavigator />
          </SafeAreaView>
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
});

export default App; 