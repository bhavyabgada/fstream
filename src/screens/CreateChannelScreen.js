import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useAuth } from '../utils/AuthContext';

const CreateChannelScreen = ({ navigation, route }) => {
  const { userInfo } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile } = useAuth();

  const navigateToHome = () => {
    // Add a small delay to ensure navigation is ready
    setTimeout(() => {
      if (navigation) {
        try {
          // First try to reset the navigation stack
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } catch (error) {
          console.warn('[Navigation] Reset failed, trying replace:', error);
          try {
            // If reset fails, try replace
            navigation.replace('Home');
          } catch (error) {
            console.warn('[Navigation] Replace failed, trying navigate:', error);
            // Last resort: simple navigation
            navigation.navigate('Home');
          }
        }
      }
    }, 100);
  };

  const checkForChannel = async () => {
    try {
      console.warn('[YouTube API] Checking for channel after browser return');
      const channelResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
        {
          headers: {
            'Authorization': `Bearer ${userInfo.accessToken}`,
          },
        }
      );

      const channelData = await channelResponse.json();
      console.warn('[YouTube API] Channel check response:', JSON.stringify(channelData, null, 2));

      if (channelData.items && channelData.items.length > 0) {
        // Update user data with channel ID
        const updatedUserInfo = {
          ...userInfo,
          channelId: channelData.items[0].id,
        };
        await updateProfile(updatedUserInfo);

        // Navigate to home screen
        navigateToHome();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('[YouTube API] Error checking channel:', error);
      return false;
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come back to foreground
        console.warn('[App State] App returned to foreground, checking for channel');
        await checkForChannel();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userInfo]);

  const openChannelCreation = async () => {
    setIsLoading(true);
    try {
      // Check if the in-app browser is available
      const isAvailable = await InAppBrowser.isAvailable();
      if (!isAvailable) {
        throw new Error('In-app browser is not available');
      }

      // Configure browser options for a native feel
      const options = {
        // Show toolbar
        showTitle: true,
        toolbarColor: '#FF0000',
        secondaryToolbarColor: 'black',
        navigationBarColor: 'black',
        navigationBarDividerColor: 'white',
        enableUrlBarHiding: true,
        enableDefaultShare: false,
        forceCloseOnRedirection: false,
        // Specify animation (only on Android)
        animations: {
          startEnter: 'slide_in_right',
          startExit: 'slide_out_left',
          endEnter: 'slide_in_left',
          endExit: 'slide_out_right'
        },
        // Additional headers to maintain Google sign-in state
        headers: {
          'Authorization': `Bearer ${userInfo.accessToken}`
        },
        // Only on iOS
        preferredBarTintColor: '#FF0000',
        preferredControlTintColor: 'white',
        readerMode: false,
        // Android only
        showInRecents: true,
        // Force browser theme
        modalEnabled: true,
        modalPresentationStyle: 'pageSheet',
      };

      console.warn('[Channel Creation] Opening YouTube channel creation page');
      const result = await InAppBrowser.openAuth(
        'https://www.youtube.com/create_channel',
        'streamverse://callback',
        options
      );

      console.warn('[Channel Creation] Browser result:', result);

      if (result.type === 'success') {
        // Check for channel immediately after browser closes
        const hasChannel = await checkForChannel();
        if (!hasChannel) {
          Alert.alert(
            'Channel Not Found',
            'Please complete the channel creation process.'
          );
        }
      } else if (result.type === 'cancel') {
        console.warn('[Channel Creation] User cancelled the process');
      }
    } catch (error) {
      console.warn('[Channel Creation] Error:', error);
      Alert.alert(
        'Error',
        'Failed to create channel. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Your Channel</Text>
        <Text style={styles.description}>
          You'll need to create a YouTube channel to start streaming. This will only take a minute.
        </Text>
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={openChannelCreation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Channel</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  createButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '80%',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateChannelScreen; 