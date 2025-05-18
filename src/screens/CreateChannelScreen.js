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
  const [isCheckingChannel, setIsCheckingChannel] = useState(false);
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
      const isAvailable = await InAppBrowser.isAvailable();
      if (!isAvailable) {
        throw new Error('In-app browser is not available');
      }

      const options = {
        showTitle: true,
        toolbarColor: '#FF0000',
        secondaryToolbarColor: 'black',
        navigationBarColor: 'black',
        navigationBarDividerColor: 'white',
        enableUrlBarHiding: true,
        enableDefaultShare: false,
        forceCloseOnRedirection: false,
        animations: {
          startEnter: 'slide_in_right',
          startExit: 'slide_out_left',
          endEnter: 'slide_in_left',
          endExit: 'slide_out_right'
        },
        headers: {
          'Authorization': `Bearer ${userInfo.accessToken}`
        },
        preferredBarTintColor: '#FF0000',
        preferredControlTintColor: 'white',
        readerMode: false,
        showInRecents: true,
        modalEnabled: true,
        modalPresentationStyle: 'pageSheet',
        injectedJavaScript: `
          (function() {
            function closeAndCheck() {
              window.ReactNativeWebView.postMessage('close_browser');
            }

            document.addEventListener('click', function(e) {
              if (e.target && (
                  e.target.matches('button[type="submit"]') || 
                  e.target.matches('.create-channel-button') ||
                  e.target.textContent.includes('Create') ||
                  e.target.value.includes('Create')
                )) {
                console.log('Create button clicked');
                closeAndCheck();
              }
            }, true);

            document.addEventListener('submit', function(e) {
              console.log('Form submitted');
              closeAndCheck();
            }, true);
          })();
        `,
        onMessage: (event) => {
          if (event.nativeEvent.data === 'close_browser') {
            console.warn('[InAppBrowser] Closing browser immediately after button click');
            InAppBrowser.close();
            setTimeout(() => {
              setIsCheckingChannel(true);
              checkForChannel();
            }, 1500);
          }
        }
      };

      console.warn('[Channel Creation] Opening YouTube channel creation page');
      
      const channelCreationUrl = `https://m.youtube.com/create_channel?chromeless=1&next=/channel_creation_done&authuser=${userInfo.email}`;
      
      await InAppBrowser.openAuth(
        channelCreationUrl,
        'streamverse://callback',
        options
      );
    } catch (error) {
      console.warn('[Channel Creation] Error:', error);
    } finally {
      setIsCheckingChannel(false);
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
          disabled={isLoading || isCheckingChannel}
        >
          {isLoading || isCheckingChannel ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.loadingText}>
                {isCheckingChannel ? 'Checking channel status...' : 'Creating channel...'}
              </Text>
            </View>
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateChannelScreen; 