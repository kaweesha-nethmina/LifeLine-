import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  collection,
  addDoc,
  query,
  where,
  // Removed orderBy import since we'll sort client-side
  onSnapshot,
  serverTimestamp,
  getDocs,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import NotificationService from '../services/notificationService';
import useProfilePicture from '../hooks/useProfilePicture';

const ChatScreen = ({ navigation, route }) => {
  // Add safety check for route.params
  const routeParams = route?.params || {};
  const { appointmentId, doctorId, doctorName, patientId, patientName, chatId: routeChatId } = routeParams;
  
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { fetchUserProfilePicture, getCachedProfilePicture, clearCache } = useProfilePicture();
  const [profilePictures, setProfilePictures] = useState({});
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatPartnerName, setChatPartnerName] = useState('');
  const [hasValidParams, setHasValidParams] = useState(true);
  const flatListRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Check for required parameters at the beginning
  useEffect(() => {
    if (!routeParams || !doctorId || !patientId) {
      setHasValidParams(false);
      Alert.alert(
        'Error',
        'Missing required chat parameters. Please try again.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    }
  }, []);

  // If we don't have valid parameters, show a simple loading screen
  if (!hasValidParams) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
          <Text style={{ color: theme.TEXT_PRIMARY }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    // Load chat messages from Firebase with real-time listener
    if (user) {
      // Validate required parameters (redundant check but kept for safety)
      if (!doctorId || !patientId) {
        console.warn('Missing critical chat parameters: doctorId or patientId');
        Alert.alert(
          'Error', 
          'Unable to load chat. Missing doctor or patient information.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      loadMessages();
      loadChatPartnerName();
      loadChatParticipantsProfilePictures(); // Load profile pictures for chat participants
    } else {
      // User is not authenticated, clear any existing data
      setMessages([]);
      setChatPartnerName('');
      setProfilePictures({});
      clearCache();
    }
    
    return () => {
      // Unsubscribe from real-time listener when component unmounts
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [appointmentId, doctorId, patientId, user]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadChatPartnerName = async () => {
    // Check if user is authenticated
    if (!user) {
      console.log('User not authenticated, cannot load chat partner name');
      return;
    }
    
    // Determine the correct chat partner based on the current user's role
    if (user.uid === doctorId) {
      // Current user is the doctor, show patient name
      setChatPartnerName(patientName || 'Patient');
      console.log('Chat partner (patient):', patientName);
      return;
    } else if (user.uid === patientId) {
      // Current user is the patient, show doctor name
      setChatPartnerName(doctorName || 'Doctor');
      console.log('Chat partner (doctor):', doctorName);
      return;
    }
    
    // If we don't have names from params, try to fetch from Firebase
    try {
      let partnerId;
      if (user.uid === doctorId) {
        partnerId = patientId;
      } else if (user.uid === patientId) {
        partnerId = doctorId;
      } else {
        // User is neither doctor nor patient - shouldn't happen
        console.error('User is neither doctor nor patient in this chat');
        return;
      }
      
      if (partnerId) {
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('uid', '==', partnerId)
        ));
        
        userDoc.forEach((doc) => {
          const userData = doc.data();
          const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Healthcare Provider';
          setChatPartnerName(name);
          console.log('Fetched chat partner name:', name);
        });
      }
    } catch (error) {
      console.error('Error loading chat partner name:', error);
      // Fallback name based on user role
      if (user && user.uid === doctorId) {
        setChatPartnerName(patientName || 'Patient');
      } else if (user && user.uid === patientId) {
        setChatPartnerName(doctorName || 'Doctor');
      } else {
        setChatPartnerName('Healthcare Provider');
      }
    }
  };

  // Load profile pictures for chat participants
  const loadChatParticipantsProfilePictures = async () => {
    try {
      // Fetch profile pictures for both doctor and patient using the hook
      const doctorPicture = await fetchUserProfilePicture(doctorId);
      const patientPicture = await fetchUserProfilePicture(patientId);
      
      // Update state with the fetched profile pictures
      setProfilePictures(prev => ({
        ...prev,
        [doctorId]: doctorPicture,
        [patientId]: patientPicture
      }));
    } catch (error) {
      console.error('Error loading chat participants profile pictures:', error);
    }
  };

  const loadMessages = async () => {
    try {
      // Validate that we have sufficient information to load messages
      if (!doctorId || !patientId) {
        console.error('Missing required parameters for chat: doctorId or patientId');
        return;
      }
      
      // Generate a consistent chat ID from doctorId and patientId
      const participantIds = [doctorId, patientId].sort();
      const chatIdToUse = routeChatId || `${participantIds[0]}_${participantIds[1]}`;
      
      console.log('Loading chat with participants:', { doctorId, patientId, chatId: chatIdToUse });
      
      // Create a combined query to get all messages between these users regardless of appointment
      // Use logical OR to get messages that match either doctorId+patientId OR have the chatId
      const messagesQuery = query(
        collection(db, 'messages'),
        where('doctorId', '==', doctorId),
        where('patientId', '==', patientId)
      );
      
      // Update chat metadata for tracking conversations
      try {
        const chatMetadataRef = doc(db, 'chatMetadata', chatIdToUse);
        await setDoc(chatMetadataRef, {
          doctorId,
          patientId,
          doctorName: doctorName || '',
          patientName: patientName || '',
          lastUpdated: serverTimestamp(),
          // Don't override existing lastMessage
        }, { merge: true });
        console.log('Chat metadata updated successfully');
      } catch (error) {
        console.error('Error updating chat metadata:', error);
      }
      
      // Set up real-time listener for the chat messages
      unsubscribeRef.current = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Handle timestamp conversion properly
          const timestamp = data.timestamp ? 
            (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : data.timestamp) : 
            new Date();
          
          newMessages.push({
            id: doc.id,
            ...data,
            timestamp
          });
        });
        
        // Sort messages by timestamp in memory instead of using Firestore orderBy
        newMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        console.log(`Loaded ${newMessages.length} messages between doctor and patient`);
        if (newMessages.length > 0) {
          console.log('Sample message:', {
            text: newMessages[0].text,
            senderId: newMessages[0].senderId,
            recipientId: newMessages[0].recipientId,
            doctorId: newMessages[0].doctorId,
            patientId: newMessages[0].patientId
          });
        }
        
        setMessages(newMessages);
      }, (error) => {
        console.error('Error listening to messages:', error);
        Alert.alert('Error', 'Failed to load messages');
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;

    try {
      // Validate required parameters before sending
      if (!doctorId || !patientId) {
        console.error('Missing required parameters for sending message: doctorId or patientId');
        Alert.alert('Error', 'Unable to send message. Missing chat participants information.');
        return;
      }

      // Determine recipient ID and chat parameters
      let recipientId, recipientName, chatParams;
      
      // Setup message parameters based on sender role
      if (user && user.uid === doctorId) {
        recipientId = patientId;
        recipientName = patientName || 'Patient';
      } else if (user && user.uid === patientId) {
        recipientId = doctorId;
        recipientName = doctorName || 'Doctor';
      } else {
        console.error('Current user is neither doctor nor patient');
        Alert.alert('Error', 'Unable to send message. User role mismatch.');
        return;
      }
      
      // Create a consistent chatId regardless of chat type
      const participantIds = [doctorId, patientId].sort();
      const chatIdToUse = routeChatId || `${participantIds[0]}_${participantIds[1]}`;
      
      // Always include both appointment and chat information when available
      chatParams = {
        doctorId,
        patientId,
        doctorName: doctorName || '',
        patientName: patientName || '',
        chatId: chatIdToUse
      };
      
      // Add appointmentId if available, but it's optional
      if (appointmentId) {
        chatParams.appointmentId = appointmentId;
      }
      
      console.log('Sending message with params:', chatParams);
      
      // Update chat metadata with the latest message
      try {
        const chatMetadataRef = doc(db, 'chatMetadata', chatIdToUse);
        await setDoc(chatMetadataRef, {
          lastMessage: inputText.trim(),
          lastUpdated: serverTimestamp()
        }, { merge: true });
        console.log('Updated chat metadata with latest message');
      } catch (error) {
        console.error('Error updating chat metadata with last message:', error);
        // Don't throw error here as this is not critical to message sending
      }
      
      // Prepare message data
      const senderName = userProfile?.firstName ? 
        `${userProfile.firstName} ${userProfile.lastName || ''}` : 
        (user && user.uid === doctorId ? doctorName : patientName) || 'You';
        
      const messageData = {
        text: inputText.trim(),
        senderId: user.uid,
        senderName: senderName,
        recipientId: recipientId,
        recipientName: recipientName,
        timestamp: serverTimestamp(),
        type: 'text',
        ...chatParams
      };

      // Add message to Firebase
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Send push notification to the recipient
      if (recipientId) {
        try {
          await NotificationService.createChatMessageNotification(recipientId, {
            id: docRef.id,
            ...messageData
          });
        } catch (notificationError) {
          console.error('Error sending push notification (non-critical):', notificationError);
          // Don't throw error here as this is not critical to message sending
        }
      }
      
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const MessageBubble = ({ item }) => {
    // Check if this message was sent by the current user
    // Add null check for user to prevent errors during logout
    const isMyMessage = user && item.senderId === user.uid;
    
    console.log('Rendering message:', {
      text: item.text,
      senderId: item.senderId,
      currentUserId: user?.uid,
      isMyMessage
    });
    
    const messageTime = new Date(item.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Determine the correct sender name to display
    const displayName = isMyMessage ? 'You' : item.senderName;
    
    // Get profile picture for the sender
    const senderProfilePicture = profilePictures[item.senderId];

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <View style={styles.messageHeader}>
            {senderProfilePicture ? (
              <Image 
                source={{ uri: senderProfilePicture }} 
                style={styles.senderAvatar}
                onError={() => console.log('Sender avatar image load error')}
              />
            ) : (
              <View style={[styles.senderAvatarPlaceholder, { backgroundColor: theme.PRIMARY }]}>
                <Ionicons name="person" size={16} color={theme.WHITE} />
              </View>
            )}
            <Text style={[styles.senderName, { color: theme.PRIMARY }]}>{displayName}</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          { 
            backgroundColor: isMyMessage ? theme.PRIMARY : theme.CARD_BACKGROUND,
            borderColor: isMyMessage ? theme.PRIMARY : theme.BORDER
          }
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
            { color: isMyMessage ? theme.WHITE : theme.TEXT_PRIMARY }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
            { color: isMyMessage ? theme.WHITE : theme.TEXT_SECONDARY }
          ]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  const QuickReply = ({ text, onPress }) => (
    <TouchableOpacity style={[styles.quickReply, { backgroundColor: theme.GRAY_LIGHT }]} onPress={() => onPress(text)}>
      <Text style={[styles.quickReplyText, { color: theme.TEXT_PRIMARY }]}>{text}</Text>
    </TouchableOpacity>
  );

  const sendQuickMessage = (message) => {
    setInputText(message);
    // Auto-send quick messages
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: theme.BACKGROUND }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
      >
        {/* Chat Header */}
        <View style={[styles.header, { backgroundColor: theme.PRIMARY }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.WHITE} />
          </TouchableOpacity>
          <View style={styles.doctorInfo}>
            {user && profilePictures[user.uid === doctorId ? patientId : doctorId] ? (
              <Image 
                source={{ uri: profilePictures[user.uid === doctorId ? patientId : doctorId] }} 
                style={styles.doctorAvatar}
                onError={() => console.log('Chat partner avatar image load error')}
              />
            ) : (
              <View style={[styles.doctorAvatar, { backgroundColor: theme.WHITE }]}>
                <Ionicons name="person" size={20} color={theme.PRIMARY} />
              </View>
            )}
            <View>
              <Text style={[styles.doctorName, { color: theme.WHITE }]}>
                {chatPartnerName || (user && user.uid === doctorId ? patientName : doctorName) || 'Chat Partner'}
              </Text>
              <Text style={[styles.doctorStatus, { color: theme.WHITE }]}>Online</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.videoCallButton}>
            <Ionicons name="videocam" size={24} color={theme.WHITE} />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble item={item} />}
          style={styles.messagesList}
          contentContainerStyle={[styles.messagesContainer, { backgroundColor: theme.BACKGROUND }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyMessageContainer}>
              <Text style={[styles.emptyMessageText, { color: theme.TEXT_SECONDARY }]}>No messages yet. Start a conversation!</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Quick Replies */}
        <View style={[styles.quickRepliesContainer, { backgroundColor: theme.CARD_BACKGROUND, borderTopColor: theme.BORDER }]}>
          <Text style={[styles.quickRepliesTitle, { color: theme.TEXT_SECONDARY }]}>Quick replies:</Text>
          <View style={styles.quickRepliesRow}>
            <QuickReply text="How are you feeling?" onPress={sendQuickMessage} />
            <QuickReply text="Thank you doctor" onPress={sendQuickMessage} />
            <QuickReply text="I have a question" onPress={sendQuickMessage} />
          </View>
        </View>

        {/* Message Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.CARD_BACKGROUND, borderTopColor: theme.BORDER }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { 
                borderColor: theme.BORDER, 
                backgroundColor: theme.WHITE, 
                color: theme.TEXT_PRIMARY 
              }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor={theme.GRAY_MEDIUM}
              multiline
              maxLength={500}
              onFocus={() => {
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              onContentSizeChange={(event) => {
                // Adjust the height of the TextInput based on content
                // This will help with multiline text input
              }}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
                { 
                  backgroundColor: inputText.trim() ? theme.PRIMARY : theme.GRAY_LIGHT 
                }
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.trim() ? theme.WHITE : theme.GRAY_MEDIUM} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Mock messages for demonstration (no longer needed with real-time Firebase)
// const mockMessages = [...];

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  backButton: {
    padding: SPACING.SM,
  },
  doctorInfo: {
    flex: 1,
    alignItems: 'center',
  },
  doctorName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  doctorStatus: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  videoCallButton: {
    padding: SPACING.SM,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: SPACING.MD,
    paddingBottom: SPACING.LG,
    backgroundColor: theme.BACKGROUND,
  },
  messageContainer: {
    marginBottom: SPACING.MD,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS / 2,
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: SPACING.XS,
  },
  senderAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.XS,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  myMessageBubble: {
    backgroundColor: theme.PRIMARY,
    borderBottomRightRadius: BORDER_RADIUS.SM,
    borderColor: theme.PRIMARY,
  },
  otherMessageBubble: {
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomLeftRadius: BORDER_RADIUS.SM,
    shadowColor: theme.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderColor: theme.BORDER,
  },
  senderName: {
    fontSize: FONT_SIZES.XS,
    fontWeight: '600',
    color: theme.PRIMARY,
  },
  messageText: {
    fontSize: FONT_SIZES.MD,
    lineHeight: 20,
  },
  myMessageText: {
    color: theme.WHITE,
  },
  otherMessageText: {
    color: theme.TEXT_PRIMARY,
  },
  messageTime: {
    fontSize: FONT_SIZES.XS,
    marginTop: SPACING.XS / 2,
  },
  myMessageTime: {
    color: theme.WHITE,
    opacity: 0.7,
  },
  otherMessageTime: {
    color: theme.TEXT_SECONDARY,
  },
  emptyMessageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  emptyMessageText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  quickRepliesContainer: {
    backgroundColor: theme.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  quickRepliesTitle: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  quickRepliesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickReply: {
    backgroundColor: theme.BUTTON_SECONDARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  quickReplyText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
  },
  inputContainer: {
    backgroundColor: theme.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.XL,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    backgroundColor: theme.INPUT_BACKGROUND,
    maxHeight: 100,
    marginRight: SPACING.SM,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: theme.PRIMARY,
  },
  sendButtonInactive: {
    backgroundColor: theme.BUTTON_SECONDARY,
  },
});

export default ChatScreen;