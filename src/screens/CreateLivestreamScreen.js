import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  Modal,
  Dimensions,
  Share,
  AppState,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import { ApiVideoLiveStreamView } from '@api.video/react-native-livestream';
import * as ImagePicker from 'react-native-image-picker';
import { useAuth } from '../utils/AuthContext';

// Screen dimensions for responsive UI
const { width, height } = Dimensions.get('window');

// Sample chat messages for testing
const INITIAL_CHAT_MESSAGES = [
  {
    id: '1',
    username: 'ReactFan',
    message: 'This stream is amazing!',
    avatar: 'https://randomuser.me/api/portraits/men/43.jpg',
    timestamp: '2m ago',
  },
  {
    id: '2',
    username: 'CodeMaster',
    message: 'Can you explain that last part again?',
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    timestamp: '1m ago',
  },
  {
    id: '3',
    username: 'DevNewbie',
    message: 'Thanks for doing this stream!',
    avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    timestamp: '45s ago',
  },
];

const CreateLivestreamScreen = ({ navigation }) => {
  const { user } = useAuth();
  // Livestream setup state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [simulatorFallback, setSimulatorFallback] = useState(false);
  
  // Camera state
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flash, setFlash] = useState('off');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  // Livestream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState(null);
  const [streamQuality, setStreamQuality] = useState('720p'); // 480p, 720p, 1080p
  const [streamBitrate, setStreamBitrate] = useState(2500); // kbps
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://broadcast.api.video/s'); // Default RTMP URL
  const [streamStatus, setStreamStatus] = useState('inactive'); // inactive, active, error
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  
  // Use the modern camera hooks
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
  
  // Refs for livestreaming
  const liveStreamRef = useRef(null);
  
  // Get camera device using the modern API
  const device = useCameraDevice(isFrontCamera ? 'front' : 'back');

  // Fallback device selection if primary device is not available
  const fallbackDevice = useCameraDevice(isFrontCamera ? 'back' : 'front');
  const selectedDevice = device || fallbackDevice;

  // Check permissions and initialize camera on mount
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        console.log('Initializing camera...');
        
        // Request camera permission if not granted
        if (!hasCameraPermission) {
          console.log('Requesting camera permission...');
          const granted = await requestCameraPermission();
          console.log('Camera permission result:', granted);
          
          if (!granted) {
            console.warn('Camera permission denied');
            Alert.alert(
              'Camera Permission Required',
              'Please enable camera access in Settings to use the livestream feature.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }
        }
        
        // Request microphone permission if not granted
        if (!hasMicrophonePermission) {
          console.log('Requesting microphone permission...');
          const granted = await requestMicrophonePermission();
          console.log('Microphone permission result:', granted);
          
          if (!granted) {
            console.warn('Microphone permission denied');
            Alert.alert(
              'Microphone Permission Required',
              'Please enable microphone access in Settings for audio in your livestream.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
        }

        console.log('Camera initialization completed');
      } catch (error) {
        console.error('Camera initialization error:', error);
        Alert.alert(
          'Camera Error',
          'Failed to initialize camera. Please try again.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeCamera();
  }, [hasCameraPermission, hasMicrophonePermission, requestCameraPermission, requestMicrophonePermission]);

  // Log device information for debugging
  useEffect(() => {
    console.log('Camera device info:', {
      requestedPosition: isFrontCamera ? 'front' : 'back',
      primaryDevice: device ? {
        id: device.id,
        name: device.name,
        position: device.position,
        hasFlash: device.hasFlash,
        hasTorch: device.hasTorch,
        minZoom: device.minZoom,
        maxZoom: device.maxZoom,
        formats: device.formats?.length || 0,
      } : 'No primary device available',
      fallbackDevice: fallbackDevice ? {
        id: fallbackDevice.id,
        name: fallbackDevice.name,
        position: fallbackDevice.position,
      } : 'No fallback device available',
      selectedDevice: selectedDevice ? {
        id: selectedDevice.id,
        name: selectedDevice.name,
        position: selectedDevice.position,
      } : 'No device selected',
      isFrontCamera,
      hasCameraPermission,
      hasMicrophonePermission,
      simulatorFallback
    });
  }, [device, fallbackDevice, selectedDevice, isFrontCamera, hasCameraPermission, hasMicrophonePermission, simulatorFallback]);
  
  // Setup settings (non-changeable per requirements)
  const [isForKids, setIsForKids] = useState(false); // Default: not for kids
  const [visibility, setVisibility] = useState('unlisted'); // Default: unlisted
  
  // Camera ref
  const cameraRef = useRef(null);
  
  // Screen states
  const [currentStep, setCurrentStep] = useState('setup'); // setup, preview, live
  const [viewCount, setViewCount] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showDebugModal, setShowDebugModal] = useState(false);
  
  // Real YouTube data
  const [realYouTubeData, setRealYouTubeData] = useState({
    likes: 0,
    dislikes: 0,
    comments: 0,
    subscribers: 0,
    concurrentViewers: 0,
    totalViews: 0,
    chatId: null,
    nextPageToken: null,
  });
  
  const [streamKey, setStreamKey] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [broadcastId, setBroadcastId] = useState('');
  const [streamData, setStreamData] = useState(null);
  
  // Network and performance monitoring
  const [networkStatus, setNetworkStatus] = useState({
    bandwidth: 'Unknown',
    latency: 0,
    packetLoss: 0,
    quality: 'Good',
    uploadSpeed: 0,
  });
  const [streamStats, setStreamStats] = useState({
    duration: 0,
    droppedFrames: 0,
    fps: 30,
    bitrate: 0,
  });
  
  // Privacy protection
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraActiveWhenBackground, setCameraActiveWhenBackground] = useState(false);
  
  // Privacy protection: Auto-disable camera when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('[PRIVACY] App state changed from', appState, 'to', nextAppState);
      
      if (appState.match(/active/) && nextAppState === 'background') {
        // App is going to background - disable camera for privacy
        if (isStreaming || currentStep === 'live' || currentStep === 'preview') {
          console.log('[PRIVACY] App going to background - disabling camera for privacy');
          setCameraActiveWhenBackground(true);
          setIsCameraOff(true);
          
          // Show privacy notification
          Alert.alert(
            '🔒 Privacy Protection',
            'Camera has been automatically disabled for your privacy while the app is in the background.',
            [{ text: 'OK' }]
          );
        }
      } else if (appState === 'background' && nextAppState === 'active') {
        // App is coming back to foreground
        if (cameraActiveWhenBackground) {
          console.log('[PRIVACY] App returning to foreground - asking to re-enable camera');
          Alert.alert(
            '📹 Re-enable Camera?',
            'Would you like to turn your camera back on?',
            [
              { text: 'Keep Off', style: 'cancel' },
              { 
                text: 'Turn On', 
                onPress: () => {
                  setIsCameraOff(false);
                  setCameraActiveWhenBackground(false);
                }
              }
            ]
          );
        }
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isStreaming, currentStep, cameraActiveWhenBackground]);

  // Network monitoring and stream statistics
  useEffect(() => {
    let networkInterval;
    let statsInterval;
    
    if (isStreaming) {
      // Monitor network status every 5 seconds
      networkInterval = setInterval(async () => {
        try {
          const startTime = Date.now();
          const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            cache: 'no-cache',
            timeout: 10000 // 10 second timeout
          });
          const latency = Date.now() - startTime;
          
          const newQuality = latency < 100 ? 'Excellent' : latency < 300 ? 'Good' : latency < 500 ? 'Fair' : 'Poor';
          
          setNetworkStatus(prev => {
            // If quality degraded significantly, warn user
            if (prev.quality === 'Excellent' && newQuality === 'Poor') {
              console.warn('[NETWORK] ⚠️ Network quality degraded significantly - stream may be affected');
            }
            
            return {
              ...prev,
              latency,
              quality: newQuality,
              bandwidth: latency < 100 ? 'High' : latency < 300 ? 'Medium' : 'Low',
              lastCheck: new Date().toISOString()
            };
          });
        } catch (error) {
          console.warn('[NETWORK] ❌ Network check failed:', error.message);
          setNetworkStatus(prev => ({
            ...prev,
            quality: 'Poor',
            bandwidth: 'Unknown',
            lastCheck: new Date().toISOString(),
            error: error.message
          }));
          
          // If network is completely down, warn user
          if (isStreaming) {
            console.warn('[NETWORK] ⚠️ Network issues detected during streaming - connection may be unstable');
          }
        }
      }, 5000);
      
      // Update stream statistics every second
      statsInterval = setInterval(() => {
        setStreamStats(prev => ({
          ...prev,
          duration: prev.duration + 1,
          bitrate: streamBitrate,
          fps: Math.max(25, 30 - Math.floor(Math.random() * 5)) // Simulate FPS variation
        }));
      }, 1000);
    }
    
    return () => {
      if (networkInterval) clearInterval(networkInterval);
      if (statsInterval) clearInterval(statsInterval);
    };
  }, [isStreaming, streamBitrate]);

  // Check if we're running on a simulator - improved detection
  useEffect(() => {
    const checkIfRealDevice = async () => {
      try {
        if (Platform.OS === 'ios') {
          // More reliable simulator detection for iOS
          const isSimulator = Platform.isPad === false && Platform.isTVOS === false && 
                             (Platform.constants.systemName === 'iOS' && 
                              (Platform.constants.model.includes('Simulator') || 
                               Platform.constants.model.includes('x86_64')));
          console.log('[DEVICE] iOS Device Info:', {
            model: Platform.constants.model,
            systemName: Platform.constants.systemName,
            isSimulator
          });
          setSimulatorFallback(isSimulator);
        } else if (Platform.OS === 'android') {
          // Android emulator detection
          const isEmulator = Platform.constants.Brand === 'google' && 
                           Platform.constants.Manufacturer === 'Google';
          console.log('[DEVICE] Android Device Info:', {
            brand: Platform.constants.Brand,
            manufacturer: Platform.constants.Manufacturer,
            isEmulator
          });
          setSimulatorFallback(isEmulator);
        }
      } catch (err) {
        console.log('[DEVICE] Error in device detection:', err);
        // If there's an error, assume we're on a real device
        setSimulatorFallback(false);
      }
    };
    
    checkIfRealDevice();
  }, []);
  
  // Real YouTube data fetching when live
  useEffect(() => {
    let statsInterval;
    let chatInterval;
    let healthCheckInterval;
    
    if (isLive && broadcastId) {
      // Get live chat ID first
      getLiveChatId();
      
      // Fetch real statistics every 10 seconds
      statsInterval = setInterval(() => {
        fetchVideoStatistics();
      }, 10000);
      
      // Fetch real chat messages every 5 seconds
      chatInterval = setInterval(() => {
        fetchLiveChatMessages();
      }, 5000);
      
      // Monitor stream health every 30 seconds
      healthCheckInterval = setInterval(async () => {
        if (streamData?.id && isStreaming) {
          try {
            const status = await checkStreamStatus(streamData.id);
            console.log('[DEBUG] 🔍 Stream health check:', status);
            
            // If YouTube reports no data for too long, try to reconnect
            if (status.streamStatus === 'active' && !status.hasData) {
              console.warn('[DEBUG] ⚠️ YouTube reports no data - stream may have issues');
              
              // Check if this has been happening for a while
              const now = Date.now();
              if (!window.lastDataWarning || (now - window.lastDataWarning) > 60000) {
                window.lastDataWarning = now;
                
                Alert.alert(
                  'Stream Quality Warning',
                  'YouTube is not receiving video data from your stream. This might cause your stream to end automatically.\n\nWould you like to restart the connection?',
                  [
                    { text: 'Continue', style: 'cancel' },
                    { 
                      text: 'Restart Connection', 
                      onPress: async () => {
                        console.log('[DEBUG] User chose to restart connection');
                        try {
                          await stopLiveStreaming();
                          setTimeout(async () => {
                            await startLiveStreaming();
                          }, 2000);
                        } catch (error) {
                          console.error('[DEBUG] Failed to restart connection:', error);
                        }
                      }
                    }
                  ]
                );
              }
            }
          } catch (error) {
            console.warn('[DEBUG] Stream health check failed:', error);
          }
        }
      }, 30000);
      
      // Initial fetch
      fetchVideoStatistics();
      setTimeout(fetchLiveChatMessages, 2000); // Wait a bit for chat ID
    }
    
    return () => {
      if (statsInterval) clearInterval(statsInterval);
      if (chatInterval) clearInterval(chatInterval);
      if (healthCheckInterval) clearInterval(healthCheckInterval);
    };
  }, [isLive, broadcastId, realYouTubeData.chatId, isStreaming, streamData?.id]);
  
  // No more fake chat messages - using real YouTube chat only
  
  // CRITICAL: Camera cleanup when leaving live/preview screens
  useEffect(() => {
    // Only disable camera when going back to setup (not when going from preview to live)
    if (currentStep === 'setup') {
      console.log('[PRIVACY] Returned to setup - cleaning up camera resources');
      setIsCameraOff(true);
      setIsStreaming(false);
      
      // Stop any active streams
      if (liveStreamRef.current) {
        try {
          liveStreamRef.current.stopStreaming();
        } catch (error) {
          console.log('[PRIVACY] Error stopping stream during cleanup:', error);
        }
      }
    } else if (currentStep === 'preview' || currentStep === 'live') {
      // Reset camera state when entering preview or live (unless manually disabled)
      if (!cameraActiveWhenBackground) {
        setIsCameraOff(false);
      }
    }
  }, [currentStep]);
  
  // CRITICAL: Component unmount cleanup
  useEffect(() => {
    return () => {
      // This runs when the entire component unmounts (user navigates away)
      console.log('[PRIVACY] Component unmounting - cleaning up all camera resources');
      
      // Stop streaming
      if (liveStreamRef.current) {
        try {
          liveStreamRef.current.stopStreaming();
        } catch (error) {
          console.log('[PRIVACY] Error stopping stream during unmount:', error);
        }
      }
      
      // Ensure camera is disabled
      setIsCameraOff(true);
      setIsStreaming(false);
      setIsLive(false);
    };
  }, []); // Empty dependency array means this only runs on unmount
  
  // Handle thumbnail selection
  const handleSelectThumbnail = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 720,
      maxWidth: 1280,
    };
    
    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        setThumbnail(response.assets[0].uri);
      }
    });
  };
  
  // Take a thumbnail photo using the camera
  const takeThumbnailPhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 720,
      maxWidth: 1280,
      saveToPhotos: false,
    };
    
    ImagePicker.launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        setThumbnail(response.assets[0].uri);
      }
    });
  };
  
  // Open settings to enable permissions
  const openSettings = () => {
    Linking.openSettings();
  };
  
  // Create a YouTube livestream
  const createYouTubeLivestream = async () => {
    try {
      console.warn('[YouTube API] Creating livestream broadcast');
      
      // 1. Create broadcast
      const broadcastResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails,status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            snippet: {
              title: title,
              description: description || 'Join me for an exciting livestream!',
              scheduledStartTime: new Date().toISOString(),
            },
            contentDetails: {
              enableAutoStart: true,
              enableAutoStop: true,
              enableDvr: true,
              enableContentEncryption: true,
              enableEmbed: true,
              recordFromStart: true,
              startWithSlate: false,
            },
            status: {
              privacyStatus: 'unlisted',
              selfDeclaredMadeForKids: false,
              enableModerationPanel: true,
            },
          }),
        }
      );

      const broadcastData = await broadcastResponse.json();
      console.warn('[YouTube API] Broadcast creation response:', JSON.stringify(broadcastData, null, 2));

      if (!broadcastResponse.ok) {
        throw new Error(broadcastData.error?.message || 'Failed to create broadcast');
      }

      const broadcastId = broadcastData.id;
      setBroadcastId(broadcastId);

      // 2. Create stream
      console.warn('[YouTube API] Creating livestream');
      const streamResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            snippet: {
              title: `${title} - Stream`,
            },
            cdn: {
              frameRate: 'variable',
              ingestionType: 'rtmp',
              resolution: 'variable',
            },
          }),
        }
      );

      const streamData = await streamResponse.json();
      console.warn('[YouTube API] Stream creation response:', JSON.stringify(streamData, null, 2));

      if (!streamResponse.ok) {
        throw new Error(streamData.error?.message || 'Failed to create stream');
      }

      // Save stream details
      setStreamKey(streamData.cdn.ingestionInfo.streamName);
      setStreamUrl(streamData.cdn.ingestionInfo.ingestionAddress);
      setStreamData(streamData);

      // 3. Bind broadcast to stream
      console.warn('[YouTube API] Binding stream to broadcast');
      const bindResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamData.id}&part=snippet`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
          },
        }
      );

      const bindData = await bindResponse.json();
      console.warn('[YouTube API] Bind response:', JSON.stringify(bindData, null, 2));

      if (!bindResponse.ok) {
        throw new Error(bindData.error?.message || 'Failed to bind stream to broadcast');
      }

      // 4. Set thumbnail if available
      if (thumbnail && thumbnail !== 'https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2') {
        console.warn('[YouTube API] Setting thumbnail');
        const formData = new FormData();
        formData.append('image', {
          uri: thumbnail,
          type: 'image/jpeg',
          name: 'thumbnail.jpg',
        });

        const thumbnailResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/thumbnails/set?videoId=${broadcastId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          }
        );

        console.warn('[YouTube API] Thumbnail upload response:', await thumbnailResponse.text());
      }

      return true;
    } catch (error) {
      console.warn('[YouTube API] Error creating livestream:', error);
      Alert.alert('Error', error.message || 'Failed to create livestream');
      return false;
    }
  };

  // Start the livestream
  const startLivestream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your livestream');
      return;
    }

    setIsLoading(true);
    try {
      const success = await createYouTubeLivestream();
      if (success) {
        setCurrentStep('preview');
      }
    } catch (error) {
      console.warn('Error starting livestream:', error);
      Alert.alert('Error', 'Failed to start livestream');
    } finally {
      setIsLoading(false);
    }
  };

  // Start actual livestreaming
  const startLiveStreaming = async () => {
    console.log('[DEBUG] startLiveStreaming function called');
    
    try {
      // Comprehensive validation
      if (!streamKey) {
        throw new Error('Stream key is required. Please create a broadcast first or enter a custom stream key.');
      }

      if (!streamUrl) {
        throw new Error('Stream URL is required. Please create a broadcast first.');
      }

      console.log('[DEBUG] Starting RTMP stream with key:', streamKey ? 'Present' : 'Missing');
      console.log('[DEBUG] Using stream URL:', streamUrl);
      
      // Wait for the live stream component to be ready with more robust checking
      let attempts = 0;
      const maxAttempts = 15; // Increased attempts
      
      console.log('[DEBUG] Waiting for ApiVideoLiveStreamView component...');
      while ((!liveStreamRef.current || !liveStreamRef.current._isReady) && attempts < maxAttempts) {
        console.log(`[DEBUG] Waiting for live stream component (attempt ${attempts + 1}/${maxAttempts})`);
        console.log(`[DEBUG] Component exists: ${!!liveStreamRef.current}, Ready: ${!!(liveStreamRef.current && liveStreamRef.current._isReady)}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased wait time
        attempts++;
      }
      
      // Final check for component readiness
      if (!liveStreamRef.current) {
        console.error('[DEBUG] ApiVideoLiveStreamView component not available after waiting');
        throw new Error('Live stream component failed to initialize. Please try again.');
      }
      
      console.log('[DEBUG] ApiVideoLiveStreamView component is ready');
      
      // Validate component methods exist
      if (typeof liveStreamRef.current.startStreaming !== 'function') {
        console.error('[DEBUG] startStreaming method not available on component');
        throw new Error('Live stream component is not properly initialized. Please restart the app.');
      }
      
      // Use the exact YouTube RTMP URL provided during stream creation
      const finalStreamUrl = streamUrl || 'rtmp://a.rtmp.youtube.com/live2';
      
      console.log('[DEBUG] Final stream URL:', finalStreamUrl);
      console.log('[DEBUG] Stream key length:', streamKey.length);
      
      // Start the RTMP livestream using API.video
      console.log('[DEBUG] Calling startStreaming on ApiVideoLiveStreamView...');
      
      try {
        liveStreamRef.current.startStreaming(streamKey, finalStreamUrl);
        console.log('[DEBUG] startStreaming call completed successfully');
      } catch (componentError) {
        console.error('[DEBUG] Error calling startStreaming:', componentError);
        throw new Error(`Failed to start streaming component: ${componentError.message || componentError}`);
      }
      
    } catch (error) {
      console.error('[DEBUG] Error in startLiveStreaming:', error);
      setStreamingError(error.message || error.toString());
      
      // Don't show alert here, let the calling function handle it
      throw error;
    }
  };

  // Stop livestreaming
  const stopLiveStreaming = async () => {
    try {
      if (liveStreamRef.current && isStreaming) {
        liveStreamRef.current.stopStreaming();
        setIsStreaming(false);
        setStreamingError(null);
        console.log('[LIVESTREAM] RTMP stream stopped');
      }
    } catch (error) {
      console.error('[LIVESTREAM] Error stopping stream:', error);
    }
  };

  // Check stream status
  const checkStreamStatus = async (streamId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/liveStreams?part=status&id=${streamId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.warn('[YouTube API] Stream status check:', JSON.stringify(data, null, 2));

      if (data.items && data.items.length > 0) {
        const streamStatus = data.items[0].status.streamStatus;
        const healthStatus = data.items[0].status.healthStatus?.status;
        
        console.warn(`[YouTube API] Stream status: ${streamStatus}, Health: ${healthStatus}`);
        
        // Return an object with both statuses
        return {
          streamStatus,
          healthStatus,
          isReady: streamStatus === 'ready' || streamStatus === 'active',
          isActive: streamStatus === 'active',
          hasData: healthStatus === 'good' || healthStatus === 'ok'
        };
      }
      return { streamStatus: 'inactive', healthStatus: 'noData', isReady: false, isActive: false, hasData: false };
    } catch (error) {
      console.warn('[YouTube API] Error checking stream status:', error);
      return { streamStatus: 'inactive', healthStatus: 'noData', isReady: false, isActive: false, hasData: false };
    }
  };

  // Check broadcast status
  const checkBroadcastStatus = async (broadcastId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=status&id=${broadcastId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.warn('[YouTube API] Broadcast status check:', JSON.stringify(data, null, 2));

      if (data.items && data.items.length > 0) {
        const broadcastStatus = data.items[0].status.lifeCycleStatus;
        const privacyStatus = data.items[0].status.privacyStatus;
        
        console.warn(`[YouTube API] Broadcast status: ${broadcastStatus}, Privacy: ${privacyStatus}`);
        
        return {
          broadcastStatus,
          privacyStatus,
          canGoLive: broadcastStatus === 'ready' || broadcastStatus === 'testing'
        };
      }
      return { broadcastStatus: 'unknown', privacyStatus: 'unknown', canGoLive: false };
    } catch (error) {
      console.warn('[YouTube API] Error checking broadcast status:', error);
      return { broadcastStatus: 'unknown', privacyStatus: 'unknown', canGoLive: false };
    }
  };

  // Wait for stream to be active
  const waitForStreamActive = async (streamId, maxAttempts = 60) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.warn(`[YouTube API] Checking stream status (attempt ${attempt}/${maxAttempts})`);
      
      const statusInfo = await checkStreamStatus(streamId);
      
      // Wait for actual data flow - this is crucial for YouTube
      if (statusInfo.isReady && statusInfo.hasData) {
        console.warn('[YouTube API] Stream is ready and has data, proceeding...');
        return true;
      }
      
      // For early attempts, just log the status
      if (attempt <= 10) {
        console.warn(`[YouTube API] Stream status: ${statusInfo.streamStatus}, Health: ${statusInfo.healthStatus} - waiting for data...`);
      }
      
      // After many attempts, check if we should proceed anyway
      if (attempt > 45 && statusInfo.isReady) {
        console.warn('[YouTube API] Stream is ready but no data detected after long wait, proceeding anyway...');
        return true;
      }
      
      // Wait 3 seconds between checks to give more time for data to flow
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.warn('[YouTube API] Timeout waiting for stream to become active');
    return false;
  };

  // Go live
  const goLive = async () => {
    console.log('[DEBUG] goLive function called');
    
    try {
      // Comprehensive validation
      console.log('[DEBUG] Validating required data...');
      console.log('[DEBUG] streamKey:', streamKey ? 'Present' : 'Missing');
      console.log('[DEBUG] streamUrl:', streamUrl ? 'Present' : 'Missing');
      console.log('[DEBUG] broadcastId:', broadcastId ? 'Present' : 'Missing');
      console.log('[DEBUG] user.accessToken:', user?.accessToken ? 'Present' : 'Missing');
      
      if (!streamKey || !streamUrl || !broadcastId) {
        throw new Error('Missing required stream data. Please go back to setup and try again.');
      }
      
      if (!user?.accessToken) {
        throw new Error('Authentication token missing. Please sign in again.');
      }
      
      // Check camera permissions before proceeding
      console.log('[DEBUG] Checking camera permissions...');
      if (!hasCameraPermission) {
        throw new Error('Camera permission required. Please enable camera access in Settings.');
      }
      
      if (!hasMicrophonePermission) {
        throw new Error('Microphone permission required. Please enable microphone access in Settings.');
      }
      
      setIsWaitingForStream(true);
      setStreamStatus('connecting');
      
      // First transition to live view to initialize the camera component
      console.log('[DEBUG] Transitioning to live view...');
      setCurrentStep('live');
      
      // Give the camera component more time to initialize properly
      console.log('[DEBUG] Waiting for camera component initialization...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Increased wait time
      
      // Now start the RTMP stream
      console.log('[DEBUG] Starting RTMP stream...');
      try {
        await startLiveStreaming();
        console.log('[DEBUG] RTMP stream started successfully');
      } catch (streamError) {
        console.error('[DEBUG] Failed to start streaming:', streamError);
        setStreamStatus('error');
        throw new Error(`Failed to start streaming: ${streamError.message}`);
      }
      
      // Wait longer for the stream to establish and start sending actual video data
      console.warn('[YouTube API] Waiting for stream to establish and send video data...');
      setStreamStatus('waiting');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if stream is ready and has data
      console.warn('[YouTube API] Checking if stream is ready with data...');
      const streamActive = await waitForStreamActive(streamData?.id);
      
      if (!streamActive) {
        setStreamStatus('error');
        throw new Error('Stream failed to become ready with data. Please check your internet connection and camera permissions, then try again.');
      }

      setStreamStatus('ready');
      console.warn('[YouTube API] Stream is ready with data, checking broadcast status...');
      
      // Check current broadcast status before transitioning
      const broadcastStatus = await checkBroadcastStatus(broadcastId);
      console.warn('[YouTube API] Current broadcast status:', broadcastStatus);
      
      if (broadcastStatus.broadcastStatus === 'live') {
        console.warn('[YouTube API] Broadcast is already live!');
        setIsLive(true);
        setIsWaitingForStream(false);
        return;
      }
      
      if (broadcastStatus.canGoLive) {
        console.warn('[YouTube API] Transitioning broadcast to live...');
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=live&id=${broadcastId}&part=status`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
            },
          }
        );

        const data = await response.json();
        console.warn('[YouTube API] Transition response:', JSON.stringify(data, null, 2));

              if (!response.ok) {
          // Check if it's a "redundant transition" error (meaning already ended)
          if (data.error?.reason === 'redundantTransition') {
            console.warn('[DEBUG] ✅ Broadcast already ended (redundant transition) - this is normal');
            // Stream is already ended, continue with cleanup
          } else {
            throw new Error(data.error?.message || 'Failed to end livestream');
          }
        }
      }
      
      setIsLive(true);
      setIsWaitingForStream(false);
    } catch (error) {
      console.error('[DEBUG] Error in goLive function:', error);
      console.error('[DEBUG] Error stack:', error.stack);
      
      // Reset all states
      setIsWaitingForStream(false);
      setStreamStatus('error');
      setIsStreaming(false);
      setStreamingError(error.message || error.toString());
      
      // Go back to preview on error to allow retry
      setCurrentStep('preview');
      
      // Show detailed error information
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      console.error('[DEBUG] Showing error alert:', errorMessage);
      
      Alert.alert(
        'Streaming Error', 
        `Failed to start streaming:\n\n${errorMessage}\n\nPlease check your internet connection and try again.`,
        [
          { 
            text: 'Retry', 
            onPress: () => {
              console.log('[DEBUG] User chose to retry');
              // Reset error state
              setStreamingError(null);
              setStreamStatus('inactive');
            }
          },
          { 
            text: 'Go Back', 
            style: 'cancel',
            onPress: () => {
              console.log('[DEBUG] User chose to go back to setup');
              setCurrentStep('setup');
            }
          }
        ]
      );
    }
  };

  // Share livestream link
  const shareLivestreamLink = async () => {
    try {
      const shareUrl = `https://www.youtube.com/watch?v=${broadcastId}`;
      const shareMessage = `🔴 I'm live streaming now! Join me at: ${shareUrl}\n\n"${title}" - Watch live on YouTube!`;
      
      const result = await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: `Join my livestream: ${title}`,
      });

      if (result.action === Share.sharedAction) {
        console.log('[SHARE] Livestream link shared successfully');
      }
    } catch (error) {
      console.error('[SHARE] Error sharing livestream:', error);
      Alert.alert('Share Error', 'Failed to share livestream link');
    }
  };

  // Toggle microphone - use mute instead of stopping audio stream
  const toggleMicrophone = () => {
    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);
    
    console.log('[DEBUG] 🎤 Microphone toggle:', newMuteState ? 'MUTED' : 'UNMUTED');
    console.log('[DEBUG] ✅ Audio stream continues - just muted/unmuted');
    
    // The ApiVideoLiveStreamView handles muting internally via the isMuted prop
    // This ensures audio stream continuity to YouTube
  };

  // Toggle camera - restart stream with different camera settings
  const toggleCamera = async () => {
    const newCameraState = !isCameraOff;
    setIsCameraOff(newCameraState);
    
    console.log('[DEBUG] 📹 Camera toggle:', newCameraState ? 'OFF (no camera to YouTube)' : 'ON (live feed to YouTube)');
    
    // If we're currently streaming, we need to restart the stream with new settings
    if (isStreaming && liveStreamRef.current && streamKey && streamUrl) {
      try {
        console.log('[DEBUG] 🔄 Restarting stream with new camera settings...');
        
        // Stop current stream
        await liveStreamRef.current.stopStreaming();
        setIsStreaming(false);
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Restart stream - the component will use the new isCameraOff state
        liveStreamRef.current.startStreaming(streamKey, streamUrl);
        
        console.log('[DEBUG] ✅ Stream restarted with camera', newCameraState ? 'OFF' : 'ON');
      } catch (error) {
        console.error('[DEBUG] Error restarting stream:', error);
        // If restart fails, at least update the UI
      }
    }
  };

  // Fetch real YouTube live chat messages
  const fetchLiveChatMessages = async () => {
    if (!realYouTubeData.chatId) return;
    
    try {
      const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${realYouTubeData.chatId}&part=snippet,authorDetails&maxResults=200${realYouTubeData.nextPageToken ? `&pageToken=${realYouTubeData.nextPageToken}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
        },
      });

      const data = await response.json();
      console.log('[REAL CHAT] Fetched messages:', data);

      if (response.ok && data.items) {
        const newMessages = data.items.map(item => ({
          id: item.id,
          username: item.authorDetails.displayName,
          message: item.snippet.displayMessage,
          avatar: item.authorDetails.profileImageUrl,
          timestamp: new Date(item.snippet.publishedAt).toLocaleTimeString(),
          publishedAt: item.snippet.publishedAt, // Keep original timestamp for deduplication
          isHost: item.authorDetails.isChatOwner,
          isModerator: item.authorDetails.isChatModerator,
          isVerified: item.authorDetails.isVerified,
        }));

        // Deduplicate messages by ID and timestamp
        setChatMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const existingTimestamps = new Set(prev.map(msg => msg.publishedAt));
          
          const uniqueNewMessages = newMessages.filter(msg => 
            !existingIds.has(msg.id) && !existingTimestamps.has(msg.publishedAt)
          );
          
          console.log(`[REAL CHAT] Fetched ${data.items.length} messages, ${uniqueNewMessages.length} are new`);
          
          // Add only unique new messages to the beginning (most recent first)
          // Limit to 100 messages to prevent performance issues
          const updatedMessages = [...uniqueNewMessages.reverse(), ...prev];
          return updatedMessages.slice(0, 100);
        });
        
        // Update next page token for pagination
        setRealYouTubeData(prev => ({
          ...prev,
          nextPageToken: data.nextPageToken
        }));
      }
    } catch (error) {
      console.error('[REAL CHAT] Error fetching chat messages:', error);
    }
  };

  // Fetch real YouTube video statistics
  const fetchVideoStatistics = async () => {
    if (!broadcastId) return;
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,liveStreamingDetails&id=${broadcastId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.log('[REAL STATS] Video statistics:', data);

      if (response.ok && data.items && data.items.length > 0) {
        const stats = data.items[0].statistics;
        const liveDetails = data.items[0].liveStreamingDetails;
        
        setRealYouTubeData(prev => ({
          ...prev,
          likes: parseInt(stats.likeCount || 0),
          comments: parseInt(stats.commentCount || 0),
          totalViews: parseInt(stats.viewCount || 0),
          concurrentViewers: parseInt(liveDetails?.concurrentViewers || 0),
        }));
        
        // Update the main view count with real data
        setViewCount(parseInt(liveDetails?.concurrentViewers || 0));
      }
    } catch (error) {
      console.error('[REAL STATS] Error fetching video statistics:', error);
    }
  };

  // Get live chat ID from broadcast
  const getLiveChatId = async () => {
    if (!broadcastId) return;
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${broadcastId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.log('[REAL CHAT] Live chat details:', data);

      if (response.ok && data.items && data.items.length > 0) {
        const chatId = data.items[0].liveStreamingDetails?.activeLiveChatId;
        if (chatId) {
          setRealYouTubeData(prev => ({
            ...prev,
            chatId: chatId
          }));
          console.log('[REAL CHAT] Found live chat ID:', chatId);
        }
      }
    } catch (error) {
      console.error('[REAL CHAT] Error getting live chat ID:', error);
    }
  };

  // Send message to real YouTube live chat
  const sendChatMessage = async (message) => {
    if (!realYouTubeData.chatId || !message.trim()) return;
    
    try {
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              liveChatId: realYouTubeData.chatId,
              type: 'textMessageEvent',
              textMessageDetails: {
                messageText: message
              }
            }
          }),
        }
      );

      const data = await response.json();
      console.log('[REAL CHAT] Message sent:', data);

      if (response.ok) {
        // Message sent successfully, it will appear in the next fetch
        setMessageText('');
        
        // Add a temporary message immediately for better UX (will be replaced by real message from API)
        const tempMessage = {
          id: `temp_${Date.now()}`, // Temporary ID
          username: user.name || 'You',
          message: message,
          avatar: user.picture || 'https://via.placeholder.com/36',
          timestamp: new Date().toLocaleTimeString(),
          publishedAt: new Date().toISOString(),
          isHost: true,
          isModerator: false,
          isVerified: false,
          isTemporary: true, // Mark as temporary
        };
        
        setChatMessages(prev => [tempMessage, ...prev]);
        
        // Fetch new messages after a delay to get the real message and remove temp
        setTimeout(() => {
          fetchLiveChatMessages();
          // Remove temporary message after real one should have arrived
          setTimeout(() => {
            setChatMessages(prev => prev.filter(msg => !msg.isTemporary));
          }, 2000);
        }, 1000);
      } else {
        Alert.alert('Chat Error', data.error?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('[REAL CHAT] Error sending message:', error);
      Alert.alert('Chat Error', 'Failed to send message');
    }
  };

  // Enhanced end stream with privacy protection
  const endLivestream = async () => {
    Alert.alert(
      '🔴 End Livestream',
      'Are you sure you want to end your livestream? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Stream', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Immediately disable camera for privacy
              console.log('[PRIVACY] Ending stream - disabling camera immediately');
              setIsCameraOff(true);
              
              // Stop the actual livestreaming first
              await stopLiveStreaming();
              
              console.warn('[YouTube API] Ending broadcast');
              const response = await fetch(
                `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id=${broadcastId}&part=status`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${user.accessToken}`,
                  },
                }
              );

              const data = await response.json();
              console.warn('[YouTube API] End broadcast response:', JSON.stringify(data, null, 2));

              if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to end livestream');
              }

              // CRITICAL: Immediately disable camera for privacy
              setIsCameraOff(true);
              
              // Reset all streaming states
              setIsLive(false);
              setIsStreaming(false);
              setStreamingError(null);
              setStreamStatus('inactive');
              setIsWaitingForStream(false);
              
              // Reset stats
              setStreamStats({
                duration: 0,
                droppedFrames: 0,
                fps: 30,
                bitrate: 0,
              });
              
              // CRITICAL: Go back to setup to unmount camera components
              setCurrentStep('setup');
              
              // Show stream summary
              const duration = Math.floor(streamStats.duration / 60);
              Alert.alert(
                '✅ Stream Ended',
                `Your livestream has ended successfully!\n\nDuration: ${duration} minutes\nViewers: ${viewCount}\nQuality: ${streamQuality}`,
                [{ text: 'OK', onPress: () => navigation.replace('Home') }]
              );
              
            } catch (error) {
              console.warn('[YouTube API] Error ending livestream:', error);
              Alert.alert('Error', 'Failed to end livestream properly, but camera has been disabled for privacy.');
              // Still navigate away for privacy even if API call fails
              navigation.replace('Home');
            }
          }
        }
      ]
    );
  };
  
  // Render setup form
  const renderSetupForm = () => (
    <ScrollView style={styles.formContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Create New Livestream</Text>
      </View>
      
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: thumbnail }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.thumbnailButtonsContainer}>
          <TouchableOpacity 
            style={styles.thumbnailButton}
            onPress={handleSelectThumbnail}
          >
            <MaterialIcons name="photo-library" size={20} color="#FFFFFF" />
            <Text style={styles.thumbnailButtonText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.thumbnailButton}
            onPress={takeThumbnailPhoto}
          >
            <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
            <Text style={styles.thumbnailButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Title */}
      <Text style={styles.inputLabel}>Title (required)</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter a title for your livestream"
        placeholderTextColor="#999"
        maxLength={100}
      />
      <Text style={styles.charCount}>{title.length}/100</Text>
      
      {/* Description */}
      <Text style={styles.inputLabel}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Tell viewers about your livestream"
        placeholderTextColor="#999"
        multiline
        maxLength={5000}
      />
      
      {/* Stream Quality Settings */}
      <Text style={styles.settingsTitle}>Stream Settings</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Stream Quality</Text>
          <Text style={styles.settingDesc}>Higher quality uses more bandwidth</Text>
        </View>
        <View style={styles.qualityButtons}>
          {['480p', '720p', '1080p'].map((quality) => (
            <TouchableOpacity
              key={quality}
              style={[
                styles.qualityButton,
                streamQuality === quality && styles.qualityButtonActive
              ]}
              onPress={() => {
                setStreamQuality(quality);
                // Adjust bitrate based on quality
                if (quality === '480p') setStreamBitrate(1500);
                else if (quality === '720p') setStreamBitrate(2500);
                else if (quality === '1080p') setStreamBitrate(4500);
              }}
            >
              <Text style={[
                styles.qualityButtonText,
                streamQuality === quality && styles.qualityButtonTextActive
              ]}>
                {quality}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Stream Key Input */}
      <Text style={styles.inputLabel}>Stream Key (Optional)</Text>
      <TextInput
        style={styles.input}
        value={streamKey}
        onChangeText={setStreamKey}
        placeholder="Enter your RTMP stream key (leave empty for YouTube)"
        placeholderTextColor="#999"
        secureTextEntry={false}
      />
      <Text style={styles.settingDesc}>
        If you have a custom RTMP stream key, enter it here. Otherwise, YouTube stream key will be generated automatically.
      </Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Made for kids</Text>
          <Text style={styles.settingDesc}>This setting cannot be changed</Text>
        </View>
        <Switch
          value={isForKids}
          disabled={true}
          trackColor={{ false: '#767577', true: '#ccc' }}
          thumbColor={isForKids ? '#f4f3f4' : '#f4f3f4'}
        />
      </View>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Visibility</Text>
          <Text style={styles.settingValue}>Unlisted</Text>
          <Text style={styles.settingDesc}>This setting cannot be changed</Text>
        </View>
      </View>
      
      {/* Start Button */}
      <TouchableOpacity 
        style={styles.startButton}
        onPress={startLivestream}
      >
        <Text style={styles.startButtonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  // Render camera permissions screen
  const renderPermissionsScreen = () => (
    <View style={styles.permissionsContainer}>
      <MaterialIcons name="videocam-off" size={64} color="#FF0000" />
      <Text style={styles.permissionsTitle}>Camera Permission Required</Text>
      <Text style={styles.permissionsText}>
        StreamVerse needs access to your camera to start livestreaming.
      </Text>
      <TouchableOpacity 
        style={styles.permissionsButton}
        onPress={openSettings}
      >
        <Text style={styles.permissionsButtonText}>Open Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.permissionsButton, styles.cancelButton]}
        onPress={() => setCurrentStep('setup')}
      >
        <Text style={styles.cancelButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render camera preview
  const renderCameraPreview = () => {
    console.log('[CAMERA] Rendering camera preview:', {
      hasPermission: hasCameraPermission,
      device: device?.name || 'No device',
      simulatorFallback
    });

    if (simulatorFallback) {
      return renderSimulatorFallback();
    }

    if (!hasCameraPermission) {
      return renderPermissionsScreen();
    }

    if (!selectedDevice) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.errorText}>No camera available. Please check your device.</Text>
        </View>
      );
    }

    return (
      <View style={styles.previewContainer}>
        {!isCameraOff ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={selectedDevice}
            isActive={currentStep === 'preview'}
            photo={true}
            video={true}
            audio={!isMicMuted}
            torch={flash === 'on' ? 'on' : 'off'}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cameraOff]}>
            <Text style={styles.cameraOffText}>Camera Disabled</Text>
          </View>
        )}
        {/* Camera controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.cameraControl}
            onPress={() => setIsFrontCamera(!isFrontCamera)}
          >
            <MaterialIcons name="flip-camera-ios" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cameraControl}
            onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
          >
            <MaterialIcons
              name={flash === 'off' ? 'flash-off' : 'flash-on'}
              size={24}
              color="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cameraControl}
            onPress={() => setShowDebugModal(true)}
          >
            <MaterialIcons name="bug-report" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Start Streaming Button */}
        <View style={styles.streamButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.startStreamButton, 
              (!streamKey || isWaitingForStream) && styles.startStreamButtonDisabled
            ]}
            onPress={goLive}
            disabled={!streamKey || isWaitingForStream}
          >
            <View style={styles.recordIcon} />
            <Text style={styles.startStreamText}>
              {isWaitingForStream ? 'CONNECTING...' : 
               streamKey ? 'START STREAMING' : 'SETUP REQUIRED'}
            </Text>
          </TouchableOpacity>
          
          {!streamKey && !isWaitingForStream && (
            <Text style={styles.streamHint}>
              Complete setup to enable streaming
            </Text>
          )}
          
          {isWaitingForStream && (
            <Text style={styles.streamHint}>
              {streamStatus === 'connecting' && 'Starting RTMP stream...'}
              {streamStatus === 'waiting' && 'Waiting for stream to be ready...'}
              {streamStatus === 'ready' && 'Stream ready, going live...'}
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  // Render chat message item with real YouTube data
  const renderChatMessage = ({ item }) => (
    <View style={[
      styles.chatMessage, 
      item.isHost && styles.hostChatMessage,
      item.isModerator && styles.moderatorChatMessage,
      item.isTemporary && styles.temporaryChatMessage
    ]}>
      <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <View style={styles.usernameContainer}>
            <Text style={[
              styles.chatUsername, 
              item.isHost && styles.hostUsername,
              item.isModerator && styles.moderatorUsername,
              item.isTemporary && styles.temporaryUsername
            ]}>
              {item.username}
            </Text>
            {item.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
            {item.isModerator && <Text style={styles.moderatorBadge}>🛡️</Text>}
            {item.isHost && <Text style={styles.hostBadge}>👑</Text>}
            {item.isTemporary && <Text style={styles.sendingBadge}>📤</Text>}
          </View>
          <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
        </View>
        <Text style={[styles.chatText, item.isTemporary && styles.temporaryChatText]}>
          {item.message}
        </Text>
      </View>
    </View>
  );
  
  // Render debug modal
  const renderDebugModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showDebugModal}
      onRequestClose={() => setShowDebugModal(false)}
    >
      <View style={styles.debugOverlay}>
        <View style={styles.debugContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Advanced Stream Controls</Text>
            <TouchableOpacity onPress={() => setShowDebugModal(false)} style={styles.closeDebugButton}>
              <MaterialIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.debugContent}>
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>🌐 Network Status</Text>
              <Text style={styles.debugItem}>Connection Quality: {networkStatus.quality}</Text>
              <Text style={styles.debugItem}>Latency: {networkStatus.latency}ms</Text>
              <Text style={styles.debugItem}>Bandwidth: {networkStatus.bandwidth}</Text>
              <Text style={styles.debugItem}>Upload Speed: {networkStatus.uploadSpeed > 0 ? `${networkStatus.uploadSpeed} Mbps` : 'Testing...'}</Text>
              <Text style={styles.debugItem}>Packet Loss: {networkStatus.packetLoss}%</Text>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>📊 Real YouTube Analytics</Text>
              <Text style={styles.debugItem}>Live Viewers: {realYouTubeData.concurrentViewers}</Text>
              <Text style={styles.debugItem}>Total Views: {realYouTubeData.totalViews}</Text>
              <Text style={styles.debugItem}>Likes: {realYouTubeData.likes}</Text>
              <Text style={styles.debugItem}>Comments: {realYouTubeData.comments}</Text>
              <Text style={styles.debugItem}>Chat ID: {realYouTubeData.chatId ? '✅ Connected' : '❌ Not found'}</Text>
              <Text style={styles.debugItem}>Chat Messages: {chatMessages.length}</Text>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>📊 Stream Performance</Text>
              <Text style={styles.debugItem}>Duration: {Math.floor(streamStats.duration / 60)}:{(streamStats.duration % 60).toString().padStart(2, '0')}</Text>
              <Text style={styles.debugItem}>Current FPS: {streamStats.fps}</Text>
              <Text style={styles.debugItem}>Dropped Frames: {streamStats.droppedFrames}</Text>
              <Text style={styles.debugItem}>Current Bitrate: {Math.round(streamStats.bitrate/1000)}k</Text>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>📡 Stream Configuration</Text>
              <Text style={styles.debugItem}>Stream Key: {streamKey ? '✅ Set' : '❌ Missing'}</Text>
              <Text style={styles.debugItem}>Stream URL: {streamUrl ? '✅ Set' : '❌ Missing'}</Text>
              <Text style={styles.debugItem}>Broadcast ID: {broadcastId ? '✅ Set' : '❌ Missing'}</Text>
              <Text style={styles.debugItem}>Quality: {streamQuality}</Text>
              <Text style={styles.debugItem}>Bitrate: {streamBitrate} kbps</Text>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>⚙️ Advanced Controls</Text>
              
              <View style={styles.debugControlRow}>
                <Text style={styles.debugControlLabel}>Stream Quality:</Text>
                <View style={styles.debugQualityButtons}>
                  {['480p', '720p', '1080p'].map((quality) => (
                    <TouchableOpacity
                      key={quality}
                      style={[
                        styles.debugQualityButton,
                        streamQuality === quality && styles.debugQualityButtonActive
                      ]}
                      onPress={() => {
                        setStreamQuality(quality);
                        if (quality === '480p') setStreamBitrate(1500);
                        else if (quality === '720p') setStreamBitrate(2500);
                        else if (quality === '1080p') setStreamBitrate(4500);
                      }}
                    >
                      <Text style={[
                        styles.debugQualityButtonText,
                        streamQuality === quality && styles.debugQualityButtonTextActive
                      ]}>
                        {quality}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.debugControlRow}>
                <Text style={styles.debugControlLabel}>Privacy Protection:</Text>
                <Text style={styles.debugItem}>
                  {cameraActiveWhenBackground ? '🔒 Camera disabled in background' : '✅ Privacy protection active'}
                </Text>
              </View>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>📱 Device Status</Text>
              <Text style={styles.debugItem}>Camera Permission: {hasCameraPermission ? '✅ Granted' : '❌ Denied'}</Text>
              <Text style={styles.debugItem}>Microphone Permission: {hasMicrophonePermission ? '✅ Granted' : '❌ Denied'}</Text>
              <Text style={styles.debugItem}>Camera Device: {selectedDevice ? `✅ ${selectedDevice.name}` : '❌ No device'}</Text>
              <Text style={styles.debugItem}>Camera Position: {isFrontCamera ? 'Front' : 'Back'}</Text>
              <Text style={styles.debugItem}>Flash: {flash === 'on' ? 'On' : 'Off'}</Text>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>🔴 Streaming Status</Text>
              <Text style={styles.debugItem}>Is Streaming: {isStreaming ? '✅ Active' : '❌ Inactive'}</Text>
              <Text style={styles.debugItem}>Is Live: {isLive ? '✅ Live' : '❌ Not Live'}</Text>
              <Text style={styles.debugItem}>Stream Status: {streamStatus}</Text>
              <Text style={styles.debugItem}>Waiting for Stream: {isWaitingForStream ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugItem}>Stream Error: {streamingError || 'None'}</Text>
              <Text style={styles.debugItem}>Viewer Count: {viewCount}</Text>
              <Text style={styles.debugItem}>Camera State: {isCameraOff ? '📹 OFF (Placeholder Active)' : '📹 ON (Live Feed)'}</Text>
              <Text style={styles.debugItem}>Microphone: {isMicMuted ? '🎤 MUTED' : '🎤 ACTIVE'}</Text>
              <Text style={styles.debugItem}>Stream Continuity: {isStreaming ? '✅ MAINTAINED' : '❌ INTERRUPTED'}</Text>
            </View>
            
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>🔧 Technical Details</Text>
              <Text style={styles.debugItem}>Platform: {Platform.OS}</Text>
              <Text style={styles.debugItem}>Simulator Fallback: {simulatorFallback ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugItem}>Current Step: {currentStep}</Text>
              <Text style={styles.debugItem}>Title: {title || 'Not set'}</Text>
            </View>
            
            {streamKey && (
              <View style={styles.debugSection}>
                <Text style={styles.debugSectionTitle}>🔑 Stream Key (Last 8 chars)</Text>
                <Text style={styles.debugItem}>...{streamKey.slice(-8)}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render chat overlay
  const renderChatOverlay = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isChatVisible}
      onRequestClose={() => setIsChatVisible(false)}
    >
      <View style={styles.chatOverlay}>
        <View style={styles.chatContainer}>
          <View style={styles.chatTitleBar}>
            <Text style={styles.chatTitle}>Live Chat</Text>
            <TouchableOpacity onPress={() => setIsChatVisible(false)} style={styles.closeChatButton}>
              <MaterialIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={chatMessages}
            renderItem={renderChatMessage}
            keyExtractor={item => item.id}
            inverted
            style={styles.chatList}
          />
          
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (messageText.trim() !== '') {
                  sendChatMessage(messageText);
                }
              }}
            />
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={() => {
                if (messageText.trim() !== '') {
                  sendChatMessage(messageText);
                }
              }}
              disabled={messageText.trim() === ''}
            >
              <MaterialIcons 
                name="send" 
                size={24} 
                color={messageText.trim() === '' ? "#666" : "#FF0000"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render live view
  const renderLiveView = () => {
    if (simulatorFallback) {
      return (
        <View style={styles.liveContainer}>
          <View style={styles.simulatorFallback}>
            <MaterialIcons name="videocam" size={64} color="#FFFFFF" />
            <Text style={styles.simulatorText}>
              Livestreaming now
            </Text>
            <Text style={styles.simulatorSubtext}>
              Camera feed will display on a real device
            </Text>
          </View>
          
          <View style={styles.liveHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            
            <Text style={styles.viewerCount}>{viewCount} watching</Text>
            <View style={styles.engagementStats}>
              <Text style={styles.engagementText}>👍 {realYouTubeData.likes}</Text>
              <Text style={styles.engagementText}>💬 {realYouTubeData.comments}</Text>
            </View>
          </View>
          
          {/* Network Status Display for Simulator */}
          <View style={styles.networkStatusContainer}>
            <View style={styles.networkStatusRow}>
              <View style={[styles.networkIndicator, { 
                backgroundColor: networkStatus.quality === 'Excellent' ? '#00FF00' : 
                                networkStatus.quality === 'Good' ? '#FFFF00' : 
                                networkStatus.quality === 'Fair' ? '#FFA500' : '#FF0000' 
              }]} />
              <Text style={styles.networkStatusText}>
                {networkStatus.quality} • {networkStatus.latency}ms • {networkStatus.bandwidth}
              </Text>
            </View>
            
            <View style={styles.streamStatsRow}>
              <Text style={styles.streamStatsText}>
                {Math.floor(streamStats.duration / 60)}:{(streamStats.duration % 60).toString().padStart(2, '0')} • 
                {streamStats.fps}fps • {Math.round(streamStats.bitrate/1000)}k
              </Text>
            </View>
          </View>
          
          <View style={styles.liveControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsFrontCamera(!isFrontCamera)}
            >
              <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, isMicMuted && styles.controlButtonMuted]}
              onPress={toggleMicrophone}
            >
              <MaterialIcons 
                name={isMicMuted ? "mic-off" : "mic"} 
                size={28} 
                color={isMicMuted ? "#FF6666" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, isCameraOff && styles.controlButtonMuted]}
              onPress={toggleCamera}
            >
              <MaterialIcons 
                name={isCameraOff ? "videocam-off" : "videocam"} 
                size={28} 
                color={isCameraOff ? "#FF6666" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setFlash(flash === 'off' ? 'torch' : 'off')}
            >
              <MaterialIcons 
                name={flash === 'off' ? "flash-off" : "flash-on"} 
                size={28} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={shareLivestreamLink}
            >
              <MaterialIcons name="share" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsChatVisible(true)}
            >
              <MaterialIcons name="chat" size={28} color="#FFFFFF" />
              {chatMessages.length > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{chatMessages.length > 99 ? '99+' : chatMessages.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setShowDebugModal(true)}
            >
              <MaterialIcons name="settings" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.endLiveButton}
              onPress={endLivestream}
            >
              <Text style={styles.endLiveText}>END STREAM</Text>
            </TouchableOpacity>
          </View>
          
          {renderChatOverlay()}
        </View>
      );
    }
    
    return (
      <View style={styles.liveContainer}>
                        {currentStep === 'live' ? (
          <View style={styles.camera}>
            <ApiVideoLiveStreamView
              ref={liveStreamRef}
              style={StyleSheet.absoluteFill}
              camera={isCameraOff ? null : (isFrontCamera ? 'front' : 'back')}
              enablePinchedZoom={!isCameraOff}
              video={{
                fps: 30,
                resolution: streamQuality,
                bitrate: streamBitrate * 1000,
                gopDuration: 2,
              }}
              audio={{
                bitrate: 128000,
                sampleRate: 44100,
                isStereo: true,
              }}
              isMuted={isMicMuted}
              onReady={() => {
                console.log('[DEBUG] ApiVideoLiveStreamView component is ready');
                if (liveStreamRef.current) {
                  liveStreamRef.current._isReady = true;
                }
              }}
              onConnectionSuccess={() => {
                console.log('[DEBUG] ✅ RTMP Stream connected successfully to YouTube');
                setIsStreaming(true);
                setStreamingError(null);
                setStreamStatus('active');
              }}
              onConnectionFailed={(error) => {
                console.error('[DEBUG] ❌ RTMP Connection failed:', error);
                setStreamingError(`Connection failed: ${error}`);
                setIsStreaming(false);
                setStreamStatus('error');
              }}
              onDisconnect={() => {
                console.warn('[DEBUG] ⚠️ RTMP Stream disconnected unexpectedly');
                setIsStreaming(false);
                setStreamStatus('disconnected');
              }}
            />
            
            {isCameraOff && (
              <View style={[StyleSheet.absoluteFill, styles.placeholderOverlay]}>
                <View style={styles.placeholderContent}>
                  <MaterialIcons name="videocam-off" size={120} color="#FFFFFF" />
                  <Text style={styles.placeholderTitle}>Be Right Back</Text>
                  <Text style={styles.placeholderSubtitle}>The host will return shortly</Text>
                  <View style={styles.placeholderIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.placeholderLiveText}>LIVE</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : null}
        
        <View style={styles.liveHeader}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: isStreaming ? '#00FF00' : '#FF0000' }]} />
            <Text style={styles.liveText}>{isStreaming ? 'STREAMING' : 'CONNECTING'}</Text>
          </View>
          
          <View style={styles.streamInfo}>
            <Text style={styles.viewerCount}>{viewCount} watching</Text>
            <View style={styles.engagementStats}>
              <Text style={styles.engagementText}>👍 {realYouTubeData.likes}</Text>
              <Text style={styles.engagementText}>💬 {realYouTubeData.comments}</Text>
            </View>
            <Text style={styles.streamQualityText}>{streamQuality}</Text>
            {streamingError && (
              <Text style={styles.streamError}>⚠️ {streamingError}</Text>
            )}
          </View>
        </View>
        
        {/* Network Status Display */}
        <View style={styles.networkStatusContainer}>
          <View style={styles.networkStatusRow}>
            <View style={[styles.networkIndicator, { 
              backgroundColor: networkStatus.quality === 'Excellent' ? '#00FF00' : 
                              networkStatus.quality === 'Good' ? '#FFFF00' : 
                              networkStatus.quality === 'Fair' ? '#FFA500' : '#FF0000' 
            }]} />
            <Text style={styles.networkStatusText}>
              {networkStatus.quality} • {networkStatus.latency}ms • {networkStatus.bandwidth}
            </Text>
          </View>
          
          <View style={styles.streamStatsRow}>
            <Text style={styles.streamStatsText}>
              {Math.floor(streamStats.duration / 60)}:{(streamStats.duration % 60).toString().padStart(2, '0')} • 
              {streamStats.fps}fps • {Math.round(streamStats.bitrate/1000)}k
            </Text>
          </View>
        </View>
        
        <View style={styles.liveControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setIsFrontCamera(!isFrontCamera)}
          >
            <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, isMicMuted && styles.controlButtonMuted]}
            onPress={toggleMicrophone}
          >
            <MaterialIcons 
              name={isMicMuted ? "mic-off" : "mic"} 
              size={28} 
              color={isMicMuted ? "#FF6666" : "#FFFFFF"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, isCameraOff && styles.controlButtonMuted]}
            onPress={toggleCamera}
          >
            <MaterialIcons 
              name={isCameraOff ? "videocam-off" : "videocam"} 
              size={28} 
              color={isCameraOff ? "#FF6666" : "#FFFFFF"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setFlash(flash === 'off' ? 'torch' : 'off')}
          >
            <MaterialIcons 
              name={flash === 'off' ? "flash-off" : "flash-on"} 
              size={28} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={shareLivestreamLink}
          >
            <MaterialIcons name="share" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
                      <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsChatVisible(true)}
            >
              <MaterialIcons name="chat" size={28} color="#FFFFFF" />
              {chatMessages.length > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{chatMessages.length > 99 ? '99+' : chatMessages.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setShowDebugModal(true)}
            >
              <MaterialIcons name="settings" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.endLiveButton}
              onPress={endLivestream}
            >
              <Text style={styles.endLiveText}>END STREAM</Text>
            </TouchableOpacity>
        </View>
        
        {renderChatOverlay()}
      </View>
    );
  };
  
  // Render simulator fallback
  const renderSimulatorFallback = () => (
    <View style={styles.previewContainer}>
      <View style={styles.simulatorFallback}>
        <MaterialIcons name="videocam" size={64} color="#FFFFFF" />
        <Text style={styles.simulatorText}>
          Camera preview not available in simulator
        </Text>
        <Text style={styles.simulatorSubtext}>
          Preview will work on a real device
        </Text>
      </View>
      
              <View style={styles.previewHeader}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setCurrentStep('setup')}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>{title || 'Untitled Livestream'}</Text>
            <Text style={styles.previewStatus}>
              {streamKey ? 'Custom RTMP Ready' : 'YouTube Stream Ready'}
            </Text>
          </View>
        </View>
      
      <View style={styles.previewControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setIsFrontCamera(!isFrontCamera)}
        >
          <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
        >
          <MaterialIcons 
            name={flash === 'off' ? "flash-off" : "flash-on"} 
            size={28} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowDebugModal(true)}
        >
          <MaterialIcons name="bug-report" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.goLiveButton, 
            (!streamKey || isWaitingForStream) && styles.startStreamButtonDisabled
          ]}
          onPress={goLive}
          disabled={!streamKey || isWaitingForStream}
        >
          <View style={styles.recordIcon} />
          <Text style={styles.goLiveText}>
            {isWaitingForStream ? 'CONNECTING...' : 
             streamKey ? 'START STREAMING' : 'SETUP REQUIRED'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Loading indicator
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Setting up your livestream...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {currentStep === 'setup' && renderSetupForm()}
        {currentStep === 'preview' && renderCameraPreview()}
        {currentStep === 'live' && renderLiveView()}
        {renderDebugModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: -8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  thumbnailContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailButtonsContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
  },
  thumbnailButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  thumbnailButtonText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  permissionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  permissionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionsText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionsButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  simulatorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  simulatorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  simulatorSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOff: {
    backgroundColor: '#000000',
  },
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    marginRight: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewStatus: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonMuted: {
    backgroundColor: 'rgba(255,0,0,0.3)',
    borderWidth: 2,
    borderColor: '#FF6666',
  },
  controlButtonMuted: {
    backgroundColor: 'rgba(255,0,0,0.3)',
    borderWidth: 2,
    borderColor: '#FF6666',
  },
  cameraOff: {
    backgroundColor: '#000000',
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
  },
  recordIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  goLiveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  liveContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  liveHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  liveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  viewerCount: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  liveControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    flexWrap: 'wrap',
    minHeight: 70,
  },
  endLiveButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
  },
  endLiveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: '#222',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#444',
  },
  chatTitleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  chatTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeChatButton: {
    padding: 4,
  },
  chatList: {
    flex: 1,
    padding: 10,
  },
  chatMessage: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  hostChatMessage: {
    backgroundColor: '#444',
    borderLeftWidth: 3,
    borderLeftColor: '#FF0000',
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatUsername: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 14,
  },
  hostUsername: {
    color: '#FF6666',
    fontWeight: 'bold',
  },
  chatTimestamp: {
    color: '#999',
    fontSize: 12,
  },
  chatText: {
    color: '#EEE',
    fontSize: 14,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#444',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
  },
  chatBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugText: {
    marginTop: 10,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraControl: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityButtons: {
    flexDirection: 'row',
  },
  qualityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginLeft: 8,
    backgroundColor: '#f9f9f9',
  },
  qualityButtonActive: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  qualityButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  qualityButtonTextActive: {
    color: '#FFFFFF',
  },
  streamInfo: {
    alignItems: 'flex-end',
  },
  streamQualityText: {
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  streamError: {
    color: '#FF6666',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 4,
    maxWidth: 200,
  },
  streamButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  startStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 200,
    justifyContent: 'center',
  },
  startStreamButtonDisabled: {
    backgroundColor: '#666666',
  },
  startStreamText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  streamHint: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  debugOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugContainer: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    padding: 16,
  },
  debugTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeDebugButton: {
    padding: 4,
  },
  debugContent: {
    flex: 1,
    padding: 16,
  },
  debugSection: {
    marginBottom: 20,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
  },
  debugSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugItem: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  networkStatusContainer: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
  },
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  networkStatusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  streamStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  streamStatsText: {
    color: '#CCC',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugControlLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  debugQualityButtons: {
    flexDirection: 'row',
  },
  debugQualityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#666',
    marginLeft: 4,
    backgroundColor: '#333',
  },
  debugQualityButtonActive: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  debugQualityButtonText: {
    fontSize: 10,
    color: '#CCC',
    fontWeight: '500',
  },
  debugQualityButtonTextActive: {
    color: '#FFFFFF',
  },
  engagementStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  engagementText: {
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 8,
    fontWeight: '500',
  },
  moderatorChatMessage: {
    backgroundColor: '#444',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moderatorUsername: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  verifiedBadge: {
    color: '#1DA1F2',
    fontSize: 12,
    marginLeft: 4,
  },
  moderatorBadge: {
    fontSize: 12,
    marginLeft: 4,
  },
  hostBadge: {
    fontSize: 12,
    marginLeft: 4,
  },
  cameraOffText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
  },
  placeholderOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 20,
  },
  placeholderLiveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  placeholderStreamView: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenStream: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },
  temporaryChatMessage: {
    opacity: 0.7,
    borderLeftWidth: 2,
    borderLeftColor: '#FFA500',
  },
  temporaryUsername: {
    color: '#FFA500',
    fontStyle: 'italic',
  },
  temporaryChatText: {
    color: '#DDD',
    fontStyle: 'italic',
  },
  sendingBadge: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default CreateLivestreamScreen; 