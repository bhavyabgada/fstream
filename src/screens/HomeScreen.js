import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../utils/AuthContext';

// Mock data for livestreams instead of videos
const LIVESTREAMS = [
  {
    id: '1',
    thumbnail: 'https://images.pexels.com/photos/4974915/pexels-photo-4974915.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'Live Coding: Building a React Native App from Scratch',
    channel: 'Coding Masters',
    viewers: '2.1K',
    startedAt: '2 hours ago',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    isLive: true,
  },
  {
    id: '2',
    thumbnail: 'https://images.pexels.com/photos/614117/pexels-photo-614117.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'JavaScript Live: Advanced Tips and Tricks',
    channel: 'Dev Simplified',
    viewers: '1.5K',
    startedAt: '45 minutes ago',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    isLive: true,
  },
  {
    id: '3',
    thumbnail: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'The Future of Mobile Development - Live Discussion',
    channel: 'Tech Insights',
    viewers: '890',
    startedAt: '3 hours ago',
    avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
    isLive: true,
  },
  {
    id: '4',
    thumbnail: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'UI/UX Design Workshop: Building Beautiful Interfaces',
    channel: 'Design Hub',
    viewers: '450',
    startedAt: '1 hour ago',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    isLive: true,
  },
  {
    id: '5',
    thumbnail: 'https://images.pexels.com/photos/3082341/pexels-photo-3082341.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'StreamVerse Launch Event: The Future of Livestreaming',
    channel: 'StreamVerse Team',
    viewers: '4.2K',
    startedAt: '30 minutes ago',
    avatar: 'https://randomuser.me/api/portraits/men/91.jpg',
    isLive: true,
  },
];

// Categories for livestreams (currently hidden but kept for future use)
const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'coding', name: 'Coding' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'design', name: 'Design' },
  { id: 'music', name: 'Music' },
  { id: 'tech_talks', name: 'Tech Talks' },
  { id: 'education', name: 'Education' },
  { id: 'sports', name: 'Sports' },
  { id: 'events', name: 'Events' },
];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false); // Changed to false since we don't need the loading state for now

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const renderLivestreamCard = ({ item }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => navigation.navigate('VideoPlayer', { video: item })}
      activeOpacity={0.9}
    >
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.thumbnail}
          resizeMode="cover" 
        />
        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        
        {/* Viewers count */}
        <View style={styles.viewersContainer}>
          <MaterialIcons name="visibility" size={16} color="#FFF" />
          <Text style={styles.viewersText}>{item.viewers}</Text>
        </View>
      </View>
      <View style={styles.videoDetails}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.channelName}>{item.channel}</Text>
          <Text style={styles.videoStats}>
            Started {item.startedAt}
          </Text>
        </View>
        <TouchableOpacity style={styles.optionsButton}>
          <MaterialIcons name="more-vert" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="youtube" size={30} color="#FF0000" />
            <Text style={styles.logoText}>StreamVerse</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="cast" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="notifications-none" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="search" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Image
                source={{ uri: user?.avatar || 'https://randomuser.me/api/portraits/men/85.jpg' }}
                style={styles.profilePic}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Now Banner */}
        <View style={styles.liveBanner}>
          <MaterialCommunityIcons name="broadcast" size={20} color="#FF0000" />
          <Text style={styles.liveBannerText}>Live Now</Text>
        </View>

        {/* Livestreams List */}
        <FlatList
          data={LIVESTREAMS}
          renderItem={renderLivestreamCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.videosList}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
        />

        {/* Create Livestream Button */}
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateLivestream')}
        >
          <MaterialIcons name="videocam" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons name="home" size={24} color="#FF0000" />
            <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons name="compass" size={24} color="#666" />
            <Text style={styles.navText}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#666" />
            <Text style={styles.navText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialCommunityIcons name="youtube-subscription" size={24} color="#666" />
            <Text style={styles.navText}>Subscriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <MaterialCommunityIcons name="account-circle" size={24} color="#666" />
            <Text style={styles.navText}>You</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 20,
  },
  profilePic: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  activeCategoryButton: {
    backgroundColor: '#333',
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  activeCategoryText: {
    color: 'white',
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  liveBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  videosList: {
    paddingBottom: 60, // To account for bottom nav
  },
  videoCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
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
    backgroundColor: 'white',
    marginRight: 4,
  },
  liveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewersContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    marginLeft: 4,
  },
  videoDetails: {
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
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
    color: '#666',
  },
  optionsButton: {
    padding: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 3,
    color: '#666',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#FF0000',
  },
  createButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100,
  },
});

export default HomeScreen; 