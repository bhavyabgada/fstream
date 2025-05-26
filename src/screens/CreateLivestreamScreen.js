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
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [messageText, setMessageText] = useState('');
  const [showDebugModal, setShowDebugModal] = useState(false);
  
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
            cache: 'no-cache'
          });
          const latency = Date.now() - startTime;
          
          setNetworkStatus(prev => ({
            ...prev,
            latency,
            quality: latency < 100 ? 'Excellent' : latency < 300 ? 'Good' : latency < 500 ? 'Fair' : 'Poor',
            bandwidth: latency < 100 ? 'High' : latency < 300 ? 'Medium' : 'Low'
          }));
        } catch (error) {
          console.warn('[NETWORK] Network check failed:', error);
          setNetworkStatus(prev => ({
            ...prev,
            quality: 'Poor',
            bandwidth: 'Unknown'
          }));
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
  
  // Simulate increasing viewcount when live
  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setViewCount(prev => prev + Math.floor(Math.random() * 3));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLive]);
  
  // Generate random chat messages while streaming
  useEffect(() => {
    let chatInterval;
    if (isLive) {
      chatInterval = setInterval(() => {
        const randomMessages = [
          'This is so interesting!',
          'Thanks for sharing this.',
          'Can you explain more?',
          'Great content!',
          'Wow, I didn\'t know that!',
          'How long have you been coding?',
          'Are you planning to do this again?',
          'This is exactly what I needed to learn.',
          'Hello from Germany!',
          'First time catching your stream!'
        ];
        
        const randomUsernames = [
          'CodingFan',
          'ReactLover',
          'DevStudent',
          'JSExpert',
          'MobileDev',
          'UI_Designer',
          'WebDeveloper',
          'CodeNoob',
          'TechGuru',
          'AppBuilder'
        ];
        
        const newMessage = {
          id: Date.now().toString(),
          username: randomUsernames[Math.floor(Math.random() * randomUsernames.length)],
          message: randomMessages[Math.floor(Math.random() * randomMessages.length)],
          avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
          timestamp: 'just now'
        };
        
        setChatMessages(prevMessages => [newMessage, ...prevMessages.slice(0, 49)]);
      }, 8000);
    }
    
    return () => clearInterval(chatInterval);
  }, [isLive]);
  
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
    try {
      if (!streamKey) {
        throw new Error('Stream key is required. Please create a broadcast first or enter a custom stream key.');
      }

      console.log('[LIVESTREAM] Starting RTMP stream with key:', streamKey);
      console.log('[LIVESTREAM] Using stream URL:', streamUrl);
      
      // Start the RTMP livestream using API.video
      if (liveStreamRef.current) {
        // Use the exact YouTube RTMP URL provided during stream creation
        const finalStreamUrl = streamUrl || 'rtmp://a.rtmp.youtube.com/live2';
        
        console.log('[LIVESTREAM] Starting stream to:', finalStreamUrl);
        console.log('[LIVESTREAM] With stream key:', streamKey);
        
        // For YouTube RTMP, we need to ensure proper URL format
        // YouTube expects: rtmp://a.rtmp.youtube.com/live2/STREAM_KEY
        // But API.video component might handle URL construction differently
        
        console.log('[LIVESTREAM] Attempting to start stream with YouTube RTMP');
        liveStreamRef.current.startStreaming(streamKey, finalStreamUrl);
        console.log('[LIVESTREAM] RTMP stream command sent successfully');
      }
    } catch (error) {
      console.error('[LIVESTREAM] Error starting stream:', error);
      setStreamingError(error.message || error);
      Alert.alert('Streaming Error', error.message || error);
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
    try {
      setIsWaitingForStream(true);
      setStreamStatus('connecting');
      
      // First transition to live view to initialize the camera component
      console.warn('[YouTube API] Transitioning to live view...');
      setCurrentStep('live');
      
      // Give the camera component more time to initialize properly
      console.warn('[YouTube API] Initializing camera component...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now start the RTMP stream
      console.warn('[YouTube API] Starting RTMP stream...');
      await startLiveStreaming();
      
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
          // Check if it's a "redundant transition" error (meaning already live)
          if (data.error?.reason === 'redundantTransition') {
            console.warn('[YouTube API] Broadcast is already live (redundant transition)');
            setIsLive(true);
            setIsWaitingForStream(false);
            return;
          }
          setStreamStatus('error');
          throw new Error(data.error?.message || 'Failed to go live');
        }
      }
      
      setIsLive(true);
      setIsWaitingForStream(false);
    } catch (error) {
      console.warn('[YouTube API] Error going live:', error);
      setIsWaitingForStream(false);
      setStreamStatus('error');
      // Don't go back to preview if we're already in live view
      if (currentStep !== 'live') {
        setCurrentStep('preview');
      }
      Alert.alert('Error', error.message || 'Failed to go live');
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

  // Toggle microphone
  const toggleMicrophone = () => {
    setIsMicMuted(!isMicMuted);
    console.log('[AUDIO] Microphone', isMicMuted ? 'unmuted' : 'muted');
  };

  // Toggle camera
  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    console.log('[VIDEO] Camera', isCameraOff ? 'enabled' : 'disabled');
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
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={selectedDevice}
          isActive={currentStep === 'preview' || currentStep === 'live'}
          photo={true}
          video={true}
          audio={true}
          torch={flash === 'on' ? 'on' : 'off'}
        />
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
  
  // Render chat message item
  const renderChatMessage = ({ item }) => (
    <View style={[styles.chatMessage, item.isHost && styles.hostChatMessage]}>
      <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatUsername, item.isHost && styles.hostUsername]}>{item.username}</Text>
          <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.chatText}>{item.message}</Text>
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
              <Text style={styles.debugSectionTitle}>📊 Stream Performance</Text>
              <Text style={styles.debugItem}>Duration: {Math.floor(streamStats.duration / 60)}:{(streamStats.duration % 60).toString().padStart(2, '0')}</Text>
              <Text style={styles.debugItem}>Current FPS: {streamStats.fps}</Text>
              <Text style={styles.debugItem}>Dropped Frames: {streamStats.droppedFrames}</Text>
              <Text style={styles.debugItem}>Current Bitrate: {Math.round(streamStats.bitrate/1000)}k</Text>
              <Text style={styles.debugItem}>Viewers: {viewCount}</Text>
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
                  const newMessage = {
                    id: Date.now().toString(),
                    username: 'You (Host)',
                    message: messageText,
                    avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
                    timestamp: 'just now',
                    isHost: true
                  };
                  setChatMessages(prev => [newMessage, ...prev]);
                  setMessageText('');
                }
              }}
            />
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={() => {
                if (messageText.trim() !== '') {
                  const newMessage = {
                    id: Date.now().toString(),
                    username: 'You (Host)',
                    message: messageText,
                    avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
                    timestamp: 'just now',
                    isHost: true
                  };
                  setChatMessages(prev => [newMessage, ...prev]);
                  setMessageText('');
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
        <ApiVideoLiveStreamView
          ref={liveStreamRef}
          style={[styles.camera, isCameraOff && styles.cameraOff]}
          camera={isCameraOff ? null : (isFrontCamera ? 'front' : 'back')}
          enablePinchedZoom={true}
          video={{
            fps: 30,
            resolution: streamQuality,
            bitrate: streamBitrate * 1000, // Convert kbps to bps (YouTube expects this format)
            gopDuration: 2, // YouTube recommends 2-4 seconds for GOP duration
          }}
          audio={{
            bitrate: 128000, // 128 kbps is good for YouTube
            sampleRate: 44100, // Standard sample rate
            isStereo: true,
          }}
          isMuted={isMicMuted}
          onConnectionSuccess={() => {
            console.log('[LIVESTREAM] Stream connected successfully to YouTube RTMP');
            console.log('[LIVESTREAM] Stream URL:', streamUrl);
            console.log('[LIVESTREAM] Stream Key:', streamKey ? 'Present' : 'Missing');
            setIsStreaming(true);
            setStreamingError(null);
            
            // Start monitoring stream status after connection
            setTimeout(() => {
              if (streamData?.id) {
                checkStreamStatus(streamData.id).then(status => {
                  console.log('[LIVESTREAM] Post-connection stream status:', status);
                });
              }
            }, 5000);
          }}
          onConnectionFailed={(error) => {
            console.error('[LIVESTREAM] Connection failed to YouTube RTMP:', error);
            console.error('[LIVESTREAM] Stream URL was:', streamUrl);
            console.error('[LIVESTREAM] Stream Key present:', streamKey ? 'Yes' : 'No');
            setStreamingError(error);
            setIsStreaming(false);
            Alert.alert('Connection Failed', 'Failed to connect to YouTube RTMP server: ' + error);
          }}
          onDisconnect={() => {
            console.log('[LIVESTREAM] Stream disconnected from YouTube RTMP');
            setIsStreaming(false);
          }}
        />
        
        <View style={styles.liveHeader}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: isStreaming ? '#00FF00' : '#FF0000' }]} />
            <Text style={styles.liveText}>{isStreaming ? 'STREAMING' : 'CONNECTING'}</Text>
          </View>
          
          <View style={styles.streamInfo}>
            <Text style={styles.viewerCount}>{viewCount} watching</Text>
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
});

export default CreateLivestreamScreen; 