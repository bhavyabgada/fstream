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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Camera, useCameraDevices, CameraPermissionStatus } from 'react-native-vision-camera';
import * as ImagePicker from 'react-native-image-picker';

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
  // Livestream setup state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [simulatorFallback, setSimulatorFallback] = useState(false);
  
  // Camera state
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flash, setFlash] = useState('off');
  const [cameraPermission, setCameraPermission] = useState();
  const [microphonePermission, setMicrophonePermission] = useState();
  
  const rawDevices = useCameraDevices();
  
  // Organize devices into front and back cameras
  const devices = React.useMemo(() => {
    if (!Array.isArray(rawDevices) || rawDevices.length === 0) {
      console.log('No devices available');
      return { front: undefined, back: undefined };
    }

    // Find the best front and back cameras
    const frontCamera = rawDevices.find(d => 
      d.position === 'front' && d.name?.includes('TrueDepth')
    );
    
    const backCamera = rawDevices.find(d => 
      d.position === 'back' && (d.name?.includes('Back Camera') || d.name?.includes('Back Triple Camera'))
    );

    console.log('Organized devices:', {
      frontCamera: frontCamera?.name,
      backCamera: backCamera?.name
    });

    return {
      front: frontCamera,
      back: backCamera
    };
  }, [rawDevices]);

  useEffect(() => {
    console.log('Devices changed:', {
      availableDevices: rawDevices?.length || 0,
      frontDevice: devices.front?.name,
      backDevice: devices.back?.name
    });
  }, [rawDevices, devices]);

  const device = React.useMemo(() => {
    if (!devices.front && !devices.back) {
      console.log('No organized devices available');
      return undefined;
    }

    console.log('Device selection:', {
      selectedType: isFrontCamera ? 'front' : 'back',
      frontAvailable: !!devices.front,
      backAvailable: !!devices.back
    });

    const selectedDevice = isFrontCamera ? devices.front : devices.back;
    console.log('Selected device:', selectedDevice ? {
      id: selectedDevice.id,
      name: selectedDevice.name,
      position: selectedDevice.position
    } : 'none');

    return selectedDevice;
  }, [devices, isFrontCamera]);

  // Check permissions and initialize camera on mount
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        console.log('Initializing camera...');
        
        // Check initial permissions
        const cameraStatus = await Camera.getCameraPermissionStatus();
        const micStatus = await Camera.getMicrophonePermissionStatus();
        
        console.log('Initial permissions:', { camera: cameraStatus, microphone: micStatus });
        
        // Request permissions if needed
        if (cameraStatus !== 'granted') {
          const newCameraPermission = await Camera.requestCameraPermission();
          console.log('New camera permission:', newCameraPermission);
          setCameraPermission(newCameraPermission);
        } else {
          setCameraPermission(cameraStatus);
        }
        
        if (micStatus !== 'granted') {
          const newMicPermission = await Camera.requestMicrophonePermission();
          console.log('New microphone permission:', newMicPermission);
          setMicrophonePermission(newMicPermission);
        } else {
          setMicrophonePermission(micStatus);
        }

        // Force camera to initialize
        await Camera.requestCameraPermission();
        console.log('Camera initialization completed');
      } catch (error) {
        console.error('Camera initialization error:', error);
      }
    };

    initializeCamera();
  }, []);
  
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
  
  // Check if we're running on a simulator
  useEffect(() => {
    // Real device detection
    const checkIfRealDevice = async () => {
      try {
        // Default to assuming we're on a real device
        setSimulatorFallback(false);
        
        if (Platform.OS === 'ios') {
          // Better iOS simulator detection
          if (Platform.constants && 
              Platform.constants.utsname && 
              Platform.constants.utsname.machine) {
            // Real devices will have models like "iPhone10,3", "iPad8,12", etc.
            // Simulator models contain "Simulator" or don't start with "iPhone"
            const deviceModel = Platform.constants.utsname.machine;
            const isRealDevice = deviceModel.startsWith('iPhone') && !deviceModel.includes('Simulator');
            
            console.log('Device check: ', deviceModel, isRealDevice ? 'Real Device' : 'Simulator');
            setSimulatorFallback(!isRealDevice);
          }
        } else if (Platform.OS === 'android') {
          // Android emulator detection
          if (Platform.constants && 
              (Platform.constants.Brand === 'google' || 
              Platform.constants.Manufacturer === 'Google' ||
              (Platform.constants.model && Platform.constants.model.includes('sdk')))) {
            setSimulatorFallback(true);
          }
        }
      } catch (err) {
        console.log('Error in device detection:', err);
        // If there's an error, assume we can use the camera
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
  
  // Start livestream
  const startLivestream = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your livestream');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call to create livestream
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStep('preview');
    }, 1500);
  };
  
  // Go live
  const goLive = () => {
    setIsLive(true);
    setCurrentStep('live');
  };
  
  // End livestream
  const endLivestream = () => {
    Alert.alert(
      'End Livestream',
      'Are you sure you want to end your livestream?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End',
          onPress: () => {
            setIsLive(false);
            navigation.navigate('Home');
          },
          style: 'destructive',
        },
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
      
      {/* Fixed Settings */}
      <Text style={styles.settingsTitle}>Stream Settings</Text>
      
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
    console.log('Rendering camera preview:', {
      cameraPermission,
      microphonePermission,
      hasDevice: !!device,
      deviceInfo: device ? {
        id: device.id,
        name: device.name,
        position: device.position
      } : 'none'
    });
    
    if (cameraPermission !== 'granted') {
      return renderPermissionsScreen();
    }
    
    if (simulatorFallback) {
      return renderSimulatorFallback();
    }
    
    if (!device) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading camera...</Text>
          <Text style={styles.debugText}>
            {`Permissions - Camera: ${cameraPermission}, Mic: ${microphonePermission}`}
          </Text>
          <Text style={styles.debugText}>
            {`Available devices: ${rawDevices ? rawDevices.length : 0}`}
          </Text>
          <Text style={styles.debugText}>
            {`Front camera: ${devices.front ? devices.front.name : 'Not available'}`}
          </Text>
          <Text style={styles.debugText}>
            {`Back camera: ${devices.back ? devices.back.name : 'Not available'}`}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              console.log('Retrying camera initialization...');
              Camera.requestCameraPermission();
            }}
          >
            <Text style={styles.retryButtonText}>Retry Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.previewContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          audio={microphonePermission === 'granted'}
          enableZoomGesture
          photo={true}
          video={true}
          orientation="portrait"
        />
        
        <View style={styles.previewHeader}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setCurrentStep('setup')}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>{title || 'Untitled Livestream'}</Text>
            <Text style={styles.previewStatus}>Ready to go live</Text>
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
            onPress={() => setFlash(flash === 'off' ? 'torch' : 'off')}
          >
            <MaterialIcons 
              name={flash === 'off' ? "flash-off" : "flash-on"} 
              size={28} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.goLiveButton}
            onPress={goLive}
          >
            <View style={styles.recordIcon} />
            <Text style={styles.goLiveText}>START STREAMING</Text>
          </TouchableOpacity>
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
          
          <View style={styles.liveControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsFrontCamera(!isFrontCamera)}
            >
              <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
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
              style={styles.endLiveButton}
              onPress={endLivestream}
            >
              <Text style={styles.endLiveText}>END</Text>
            </TouchableOpacity>
          </View>
          
          {renderChatOverlay()}
        </View>
      );
    }
    
    return (
      <View style={styles.liveContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={true}
          audio={true}
          enableZoomGesture={true}
          torch={flash}
        />
        
        <View style={styles.liveHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          
          <Text style={styles.viewerCount}>{viewCount} watching</Text>
        </View>
        
        <View style={styles.liveControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setIsFrontCamera(!isFrontCamera)}
          >
            <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
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
            style={styles.endLiveButton}
            onPress={endLivestream}
          >
            <Text style={styles.endLiveText}>END</Text>
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
          <Text style={styles.previewStatus}>Ready to go live</Text>
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
          onPress={() => setFlash(flash === 'off' ? 'torch' : 'off')}
        >
          <MaterialIcons 
            name={flash === 'off' ? "flash-off" : "flash-on"} 
            size={28} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.goLiveButton}
          onPress={goLive}
        >
          <View style={styles.recordIcon} />
          <Text style={styles.goLiveText}>START STREAMING</Text>
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
});

export default CreateLivestreamScreen; 