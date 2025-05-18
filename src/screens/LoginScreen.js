import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../utils/AuthContext';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup, updateProfile } = useAuth();
  
  useEffect(() => {
    // Initialize Google Sign-In
    const config = {
      webClientId: '38492354885-vuj1913fosnenabqd8vhb7mhj1scibsq.apps.googleusercontent.com',
      offlineAccess: true,
      iosClientId: '38492354885-vuj1913fosnenabqd8vhb7mhj1scibsq.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ]
    };
    console.warn('[Google Sign-In] Configuring with:', config);
    GoogleSignin.configure(config);
  }, []);
  
  const navigateAfterAuth = (screenName, params = {}) => {
    // Add a small delay to ensure navigation is ready
    setTimeout(() => {
      if (navigation) {
        try {
          navigation.replace(screenName, params);
        } catch (error) {
          console.warn('[Navigation] Error:', error);
          // Fallback to navigate if replace fails
          navigation.navigate(screenName, params);
        }
      }
    }, 100);
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.warn('[Google Sign-In] Starting sign-in process');
      
      // Check if user is already signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      console.warn('[Google Sign-In] Is user already signed in?', isSignedIn);
      
      if (isSignedIn) {
        console.warn('[Google Sign-In] User was already signed in, signing out first');
        await GoogleSignin.signOut();
      }
      
      // Sign in
      console.warn('[Google Sign-In] Checking Play Services');
      await GoogleSignin.hasPlayServices();
      
      console.warn('[Google Sign-In] Initiating sign in');
      const userInfo = await GoogleSignin.signIn();
      console.warn('[Google Sign-In] User info received:', JSON.stringify(userInfo, null, 2));
      
      console.warn('[Google Sign-In] Getting tokens');
      const tokens = await GoogleSignin.getTokens();
      console.warn('[Google Sign-In] Access Token:', tokens.accessToken ? `${tokens.accessToken.substring(0, 10)}...` : 'null');
      
      // Check if user has a YouTube channel
      try {
        console.warn('[YouTube API] Checking for existing channel');
        
        const channelResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
          {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'Accept': 'application/json',
            },
          }
        );
        
        console.warn('[YouTube API] Response status:', channelResponse.status);
        
        // Get the raw response text first
        const responseText = await channelResponse.text();
        
        if (!channelResponse.ok) {
          const errorData = JSON.parse(responseText);
          console.warn('[YouTube API] Error response:', JSON.stringify(errorData, null, 2));
          throw new Error(
            `YouTube API error: ${errorData.error?.message || channelResponse.status}`
          );
        }
        
        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.warn('[YouTube API] Failed to parse response as JSON:', parseError);
          throw new Error('Invalid response format from YouTube API');
        }
        
        console.warn('[YouTube API] Channel check response:', JSON.stringify(data, null, 2));
        
        const userData = {
          ...userInfo.user,
          accessToken: tokens.accessToken,
        };

        if (data.items && data.items.length > 0) {
          console.warn('[YouTube API] Channel found:', data.items[0].id);
          userData.channelId = data.items[0].id;
          
          // Update auth context with user data
          await updateProfile(userData);
          
          // Navigate to Home screen
          navigateAfterAuth('Home');
        } else {
          console.warn('[YouTube API] No channel found, redirecting to channel creation');
          // Navigate to CreateChannel screen
          navigateAfterAuth('CreateChannel', { userInfo: userData });
        }
      } catch (error) {
        console.warn('[YouTube API] Error checking channel:', error);
        console.warn('[YouTube API] Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response
        });
        Alert.alert('Error', `Failed to check YouTube channel status: ${error.message}`);
      }
      
    } catch (error) {
      console.warn('[Google Sign-In] Error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.warn('[Google Sign-In] User cancelled sign-in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.warn('[Google Sign-In] Operation already in progress');
        Alert.alert('Error', 'Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.warn('[Google Sign-In] Play services not available');
        Alert.alert('Error', 'Play services not available');
      } else {
        Alert.alert('Error', `Google Sign-In failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAuth = async () => {
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        if (!username || !email || !password) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }
        
        await signup({
          username,
          email,
          password,
        });
      } else {
        if (!email || !password) {
          Alert.alert('Error', 'Please enter both email and password');
          return;
        }
        
        await login(email, password);
      }
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Demo credentials quick fill for testing
  const fillDemoCredentials = () => {
    setEmail('demo@streamverse.com');
    setPassword('password123');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo and App Name */}
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="youtube" size={60} color="#FF0000" />
            <Text style={styles.appName}>StreamVerse</Text>
            <Text style={styles.tagline}>Live Stream Your World</Text>
          </View>
          
          {/* Auth Form */}
          <View style={styles.formContainer}>
            {/* Google Sign In Button */}
            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="google" size={24} color="#4285F4" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            
            {isSignUp && (
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={24} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            
            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.authButton}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={styles.authButtonText}>
                {isSignUp ? 'Sign Up' : 'Log In'}
              </Text>
            </TouchableOpacity>
            
            {!isSignUp && (
              <TouchableOpacity 
                style={styles.demoButton}
                onPress={fillDemoCredentials}
              >
                <Text style={styles.demoButtonText}>Use Demo Account</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.switchActionText}>
                  {isSignUp ? 'Log In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#FF0000',
    fontSize: 14,
  },
  authButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  demoButtonText: {
    color: '#666',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
  switchActionText: {
    color: '#FF0000',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 50,
    marginBottom: 20,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 10,
    fontSize: 14,
  },
});

export default LoginScreen; 