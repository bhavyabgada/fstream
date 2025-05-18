import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../utils/AuthContext';
import * as ImagePicker from 'react-native-image-picker';

// Mock data for user's livestreams
const USER_LIVESTREAMS = [
  {
    id: '1',
    thumbnail: 'https://images.pexels.com/photos/4974915/pexels-photo-4974915.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'Building a Chat App with React Native',
    viewers: '543',
    startedAt: '2 days ago',
    duration: '1:45:22',
  },
  {
    id: '2',
    thumbnail: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'React Navigation Deep Dive',
    viewers: '1.2K',
    startedAt: '5 days ago',
    duration: '1:12:44',
  },
  {
    id: '3',
    thumbnail: 'https://images.pexels.com/photos/614117/pexels-photo-614117.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    title: 'State Management Options in React',
    viewers: '876',
    startedAt: '1 week ago',
    duration: '58:21',
  },
];

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || 'Mobile app developer and React Native enthusiast.');

  // Stats
  const totalViews = '5.7K';
  const followers = user?.subscribers || 0;
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };
  
  const handleChangeAvatar = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 500,
      maxWidth: 500,
    };
    
    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        updateProfile({ avatar: source.uri });
      }
    });
  };
  
  const handleSaveProfile = () => {
    updateProfile({
      displayName,
      bio,
    });
    setIsEditModalVisible(false);
  };

  const renderLivestreamItem = (item) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.livestreamItem}
      onPress={() => navigation.navigate('VideoPlayer', { video: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.livestreamThumbnail} />
      <View style={styles.livestreamInfo}>
        <Text style={styles.livestreamTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.livestreamStats}>
          {item.viewers} views • {item.startedAt}
        </Text>
        <Text style={styles.livestreamDuration}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );
  
  const renderEditProfileModal = () => (
    <Modal
      visible={isEditModalVisible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell viewers about yourself"
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
            <MaterialIcons name="edit" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handleChangeAvatar}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: user?.avatar || 'https://randomuser.me/api/portraits/men/85.jpg' }} 
                  style={styles.avatar} 
                />
                <View style={styles.cameraIconContainer}>
                  <MaterialIcons name="camera-alt" size={16} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
            <Text style={styles.username}>@{user?.username || 'username'}</Text>
            
            <Text style={styles.bio}>
              {user?.bio || 'Mobile app developer and React Native enthusiast.'}
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalViews}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{followers}</Text>
                <Text style={styles.statLabel}>Subscribers</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{USER_LIVESTREAMS.length}</Text>
                <Text style={styles.statLabel}>Streams</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.createStreamButton}
              onPress={() => navigation.navigate('CreateLivestream')}
            >
              <MaterialIcons name="videocam" size={20} color="#FFF" />
              <Text style={styles.createStreamButtonText}>Create Livestream</Text>
            </TouchableOpacity>
          </View>
          
          {/* Past Livestreams Section */}
          <View style={styles.livestreamsSection}>
            <Text style={styles.sectionTitle}>Past Livestreams</Text>
            {USER_LIVESTREAMS.map(renderLivestreamItem)}
          </View>
          
          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <TouchableOpacity style={styles.settingsButton}>
              <MaterialIcons name="settings" size={24} color="#666" />
              <Text style={styles.settingsButtonText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color="#FF0000" />
              <Text style={[styles.settingsButtonText, { color: '#FF0000' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {renderEditProfileModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF0000',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF0000',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  createStreamButton: {
    flexDirection: 'row',
    backgroundColor: '#FF0000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  createStreamButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  livestreamsSection: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  livestreamItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  livestreamThumbnail: {
    width: 120,
    height: 70,
    borderRadius: 4,
  },
  livestreamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  livestreamTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  livestreamStats: {
    fontSize: 14,
    color: '#666',
  },
  livestreamDuration: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  settingsSection: {
    padding: 16,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#FF0000',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default ProfileScreen; 