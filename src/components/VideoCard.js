import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const VideoCard = ({ video, onPress, style }) => {
  return (
    <TouchableOpacity
      style={[styles.videoCard, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: video.thumbnail }} 
          style={styles.thumbnail}
          resizeMode="cover" 
        />
        
        {/* Live indicator */}
        {video.isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        
        {/* Viewers count or duration */}
        <View style={styles.viewersContainer}>
          <MaterialIcons name="visibility" size={16} color="#FFF" />
          <Text style={styles.viewersText}>
            {video.isLive ? video.viewers : video.views || '0'}
          </Text>
        </View>
        
        {/* Duration (for non-live videos) */}
        {!video.isLive && video.duration && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.videoDetails}>
        <Image source={{ uri: video.avatar }} style={styles.avatar} />
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.channelName}>{video.channel}</Text>
          <Text style={styles.videoStats}>
            {video.isLive ? `Started ${video.startedAt}` : `${video.views} views • ${video.uploadedAt || video.startedAt}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.optionsButton}>
          <MaterialIcons name="more-vert" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  videoCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF0000',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewersContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  viewersText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
  },
  durationContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
  },
  videoDetails: {
    flexDirection: 'row',
    padding: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 10,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  videoStats: {
    fontSize: 12,
    color: '#888',
  },
  optionsButton: {
    marginLeft: 10,
    justifyContent: 'center',
  },
});

export default VideoCard; 