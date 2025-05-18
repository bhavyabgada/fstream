import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';

const ChatMessage = ({ message, isHost = false }) => {
  return (
    <View style={[styles.messageContainer, isHost && styles.hostMessageContainer]}>
      <Image source={{ uri: message.avatar }} style={styles.avatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.username, isHost && styles.hostUsername]}>
            {message.username}
            {isHost && <Text style={styles.hostLabel}> (Host)</Text>}
          </Text>
          <Text style={styles.timestamp}>{message.timestamp}</Text>
        </View>
        <Text style={[styles.messageText, isHost && styles.hostMessageText]}>
          {message.message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  hostMessageContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  hostUsername: {
    color: '#FF0000',
  },
  hostLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  hostMessageText: {
    fontWeight: '500',
  },
});

export default ChatMessage; 