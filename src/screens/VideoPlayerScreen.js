import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';

// Make sure all icons are loaded properly
// Note: We rely on App.js to load the font, we don't need to do it here anymore

const { width } = Dimensions.get('window');

// Mock chat messages
const CHAT_MESSAGES = [
  {
    id: '1',
    username: 'ReactFan',
    message: 'Loving this livestream!',
    avatar: 'https://randomuser.me/api/portraits/men/43.jpg',
    timestamp: '2m ago',
  },
  {
    id: '2',
    username: 'CodeMaster',
    message: 'Can you show more examples of hooks?',
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    timestamp: '1m ago',
  },
  {
    id: '3',
    username: 'DevGuru',
    message: 'This is exactly what I needed for my project!',
    avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    timestamp: '45s ago',
  },
  {
    id: '4',
    username: 'UIDesigner',
    message: 'What do you think about using Flexbox vs Grid?',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
    timestamp: '30s ago',
  },
  {
    id: '5',
    username: 'NewbieDev',
    message: 'I just started learning React Native yesterday!',
    avatar: 'https://randomuser.me/api/portraits/men/66.jpg',
    timestamp: '15s ago',
  },
];

// Mock related livestreams data
const RELATED_STREAMS = [
  {
    id: '1',
    thumbnail: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'Live Coding: React Hooks Deep Dive',
    channel: 'ReactMasters',
    viewers: '3.2K',
    startedAt: '2 hours ago',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    isLive: true,
  },
  {
    id: '2',
    thumbnail: 'https://images.pexels.com/photos/5483077/pexels-photo-5483077.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'Building an E-Commerce App with React Native LIVE',
    channel: 'Mobile Dev',
    viewers: '1.8K',
    startedAt: '45 minutes ago',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
    isLive: true,
  },
  {
    id: '3',
    thumbnail: 'https://images.pexels.com/photos/7014337/pexels-photo-7014337.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'Live Q&A: Answering Your React Native Questions',
    channel: 'CodeWithMe',
    viewers: '950',
    startedAt: '1 hour ago',
    avatar: 'https://randomuser.me/api/portraits/men/36.jpg',
    isLive: true,
  },
  {
    id: '4',
    thumbnail: 'https://images.pexels.com/photos/92904/pexels-photo-92904.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'Navigation in React Native - Live Workshop',
    channel: 'App Builders',
    viewers: '2.2K',
    startedAt: '30 minutes ago',
    avatar: 'https://randomuser.me/api/portraits/women/54.jpg',
    isLive: true,
  },
];

const VideoPlayerScreen = ({ route, navigation }) => {
  const { video } = route.params;
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showMoreDescription, setShowMoreDescription] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(CHAT_MESSAGES);
  const [viewCount, setViewCount] = useState(parseInt(video.viewers.replace(/[^\d]/g, '')));

  // Simulate viewer count increasing over time
  useEffect(() => {
    const interval = setInterval(() => {
      setViewCount((prev) => prev + Math.floor(Math.random() * 5));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  // Simulate new chat messages arriving
  useEffect(() => {
    const interval = setInterval(() => {
      const newMessage = {
        id: Date.now().toString(),
        username: `User${Math.floor(Math.random() * 1000)}`,
        message: [
          'Great stream!',
          'Thanks for the explanation',
          'Can you cover topic X next?',
          'Hello from Germany!',
          'First time catching you live',
        ][Math.floor(Math.random() * 5)],
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
        timestamp: 'just now'
      };
      
      setChatMessages(prev => [newMessage, ...prev.slice(0, 49)]);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const togglePlayPause = () => {
    setPaused(!paused);
    setShowControls(true);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const onProgress = (data) => {
    setCurrentTime(data.currentTime);
  };

  const onLoad = (data) => {
    setDuration(data.duration);
    setIsBuffering(false);
  };

  const onBuffer = ({ isBuffering }) => {
    setIsBuffering(isBuffering);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleLike = () => {
    setLiked(!liked);
    if (disliked) setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
  };

  const toggleSubscription = () => {
    setIsSubscribed(!isSubscribed);
  };

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        username: 'You',
        message: chatMessage,
        avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
        timestamp: 'just now'
      };
      
      setChatMessages([newMessage, ...chatMessages]);
      setChatMessage('');
    }
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.seek(time);
    }
    setCurrentTime(time);
  };

  const renderChatMessage = ({ item }) => (
    <View style={styles.chatMessage}>
      <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatUsername}>{item.username}</Text>
          <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.chatText}>{item.message}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 85 : 0}
      >
        <View style={styles.mainSection}>
          {/* Video Player */}
          <View style={styles.videoContainer}>
            <TouchableOpacity 
              style={styles.videoTouchable} 
              activeOpacity={1} 
              onPress={toggleControls}
            >
              <Video
                ref={videoRef}
                source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }}
                style={styles.videoPlayer}
                resizeMode="contain"
                paused={paused}
                onProgress={onProgress}
                onLoad={onLoad}
                onBuffer={onBuffer}
                repeat
              />
              
              {isBuffering && (
                <View style={styles.bufferingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}

              <View style={styles.liveOverlay}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <View style={styles.viewersContainer}>
                  <MaterialIcons name="visibility" size={14} color="#FFF" />
                  <Text style={styles.viewersText}>{viewCount.toLocaleString()}</Text>
                </View>
              </View>
              
              {showControls && (
                <View style={styles.controlsOverlay}>
                  <TouchableOpacity
                    style={styles.playPauseButton}
                    onPress={togglePlayPause}
                  >
                    <MaterialIcons
                      name={paused ? 'play-arrow' : 'pause'}
                      size={50}
                      color="white"
                    />
                  </TouchableOpacity>
                  
                  <View style={styles.videoControls}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={duration}
                      value={currentTime}
                      minimumTrackTintColor="#FF0000"
                      maximumTrackTintColor="#DDDDDD"
                      thumbTintColor="#FF0000"
                      onValueChange={(value) => setCurrentTime(value)}
                      onSlidingComplete={(value) => seekTo(value)}
                    />
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    <TouchableOpacity style={styles.fullscreenButton}>
                      <MaterialIcons name="fullscreen" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <View style={styles.videoStats}>
                <Text style={styles.statsText}>
                  Started {video.startedAt} • {viewCount.toLocaleString()} viewers
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <MaterialIcons
                  name={liked ? 'thumb-up' : 'thumb-up-off-alt'}
                  size={24}
                  color={liked ? '#065FD4' : '#666'}
                />
                <Text style={[styles.actionText, liked && styles.activeActionText]}>23K</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleDislike}>
                <MaterialIcons
                  name={disliked ? 'thumb-down' : 'thumb-down-off-alt'}
                  size={24}
                  color={disliked ? '#065FD4' : '#666'}
                />
                <Text style={[styles.actionText, disliked && styles.activeActionText]}>Dislike</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="reply" size={24} color="#666" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="more-horiz" size={24} color="#666" />
                <Text style={styles.actionText}>More</Text>
              </TouchableOpacity>
            </View>

            {/* Channel Info */}
            <View style={styles.channelContainer}>
              <TouchableOpacity style={styles.channelInfo}>
                <Image
                  source={{ uri: video.avatar }}
                  style={styles.channelAvatar}
                />
                <View>
                  <Text style={styles.channelName}>{video.channel}</Text>
                  <Text style={styles.subscriberCount}>1.2M subscribers</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  isSubscribed && styles.subscribedButton,
                ]}
                onPress={toggleSubscription}
              >
                <Text style={[
                  styles.subscribeText,
                  isSubscribed && styles.subscribedText,
                ]}>
                  {isSubscribed ? 'SUBSCRIBED' : 'SUBSCRIBE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Split View for Content and Chat */}
          <View style={styles.splitContainer}>
            {/* Chat section */}
            <View style={styles.chatContainer}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Live Chat</Text>
              </View>
              
              <FlatList
                data={chatMessages}
                renderItem={renderChatMessage}
                keyExtractor={(item) => item.id}
                style={styles.chatList}
                inverted
                contentContainerStyle={styles.chatListContent}
              />
              
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Send a message..."
                  value={chatMessage}
                  onChangeText={setChatMessage}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendButton, 
                    !chatMessage.trim() && styles.sendButtonDisabled
                  ]}
                  onPress={sendMessage}
                  disabled={!chatMessage.trim()}
                >
                  <MaterialIcons name="send" size={24} color={chatMessage.trim() ? "#FFFFFF" : "#999999"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  mainSection: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    height: width * (9 / 16), // 16:9 aspect ratio
    backgroundColor: 'black',
    position: 'relative',
  },
  videoTouchable: {
    flex: 1,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  liveOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  liveIndicator: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  liveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewersContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewersText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  playPauseButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    padding: 5,
  },
  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenButton: {
    padding: 5,
  },
  contentContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleContainer: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeActionText: {
    color: '#065FD4',
  },
  channelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  subscriberCount: {
    fontSize: 14,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 2,
  },
  subscribedButton: {
    backgroundColor: '#f0f0f0',
  },
  subscribeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subscribedText: {
    color: '#666',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  chatContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingLeft: 8,
    paddingTop: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingTop: 12,
  },
  chatMessage: {
    flexDirection: 'row',
    padding: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    marginBottom: 4,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chatTimestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
  },
  chatText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#065FD4',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
});

export default VideoPlayerScreen; 