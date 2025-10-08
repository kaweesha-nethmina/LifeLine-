import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants';
import useNotifications from '../hooks/useNotifications';
import useProfilePicture from '../hooks/useProfilePicture';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.LG * 2 - SPACING.MD) / 2;
const CARD_HEIGHT = 160; // Fixed height for all cards

const HomeScreen = ({ navigation }) => {
  const { userProfile, isPatient, isDoctor, isEmergencyOperator } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const { unreadCount } = useNotifications({ autoRefresh: true });
  const [recentChats, setRecentChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatProfilePictures, setChatProfilePictures] = useState({});
  const heartSOSAnimation = useRef(new Animated.Value(1)).current;

  // Animation for Heart SOS button
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(heartSOSAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(heartSOSAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Loop the animation
        animate();
      });
    };

    animate();
  }, [heartSOSAnimation]);

  // Fetch recent chats when screen loads
  useEffect(() => {
    if (isPatient && userProfile?.uid) {
      fetchRecentChats();
    }
  }, [userProfile]);

  // Function to fetch recent chats
  const fetchRecentChats = async () => {
    if (!userProfile?.uid) return;
    
    setLoadingChats(true);
    try {
      // First try to get chats from the chatMetadata collection
      const chatMetadataQuery = query(
        collection(db, 'chatMetadata'),
        where('patientId', '==', userProfile.uid),
        limit(5)
      );
      
      const chatMetadataSnapshot = await getDocs(chatMetadataQuery);
      
      if (!chatMetadataSnapshot.empty) {
        const chatsData = [];
        chatMetadataSnapshot.forEach((doc) => {
          const data = doc.data();
          chatsData.push({
            id: doc.id,
            doctorId: data.doctorId,
            doctorName: data.doctorName || 'Doctor',
            lastMessage: data.lastMessage || 'Start a conversation',
            lastUpdated: data.lastUpdated ? new Date(data.lastUpdated.toDate?.() || data.lastUpdated) : new Date(),
          });
        });
        
        // Sort by last updated time
        chatsData.sort((a, b) => b.lastUpdated - a.lastUpdated);
        setRecentChats(chatsData);
        
        // Fetch profile pictures for all doctors in chats
        fetchChatProfilePictures(chatsData);
      } else {
        // If no chat metadata, fall back to querying messages collection
        const messagesQuery = query(
          collection(db, 'messages'),
          where('patientId', '==', userProfile.uid),
          limit(20)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        
        // Process messages to find unique chats
        const chatsMap = new Map();
        
        messagesSnapshot.forEach((doc) => {
          const data = doc.data();
          const chatId = data.chatId || `${data.doctorId}_${userProfile.uid}`;
          
          // Only add if this is a doctor-patient chat
          if (data.doctorId && data.doctorName) {
            if (!chatsMap.has(chatId) || 
                new Date(data.timestamp?.toDate?.() || data.timestamp) > 
                new Date(chatsMap.get(chatId).lastUpdated)) {
              chatsMap.set(chatId, {
                id: chatId,
                doctorId: data.doctorId,
                doctorName: data.doctorName,
                lastMessage: data.text || 'New message',
                lastUpdated: data.timestamp ? new Date(data.timestamp.toDate?.() || data.timestamp) : new Date(),
              });
            }
          }
        });
        
        const chatsData = Array.from(chatsMap.values());
        // Sort by last updated time
        chatsData.sort((a, b) => b.lastUpdated - a.lastUpdated);
        const finalChats = chatsData.slice(0, 5);
        setRecentChats(finalChats);
        
        // Fetch profile pictures for all doctors in chats
        fetchChatProfilePictures(finalChats);
      }
    } catch (error) {
      console.error('Error fetching recent chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  // Function to fetch profile pictures for doctors in chats
  const fetchChatProfilePictures = async (chats) => {
    try {
      const profilePictures = { ...chatProfilePictures };
      for (const chat of chats) {
        if (chat.doctorId) {
          // Check cache first
          const cachedPicture = getCachedProfilePicture(chat.doctorId);
          if (cachedPicture && cachedPicture !== null) {
            profilePictures[chat.doctorId] = cachedPicture;
          } else {
            // Fetch from Firestore if not cached
            const pictureUrl = await fetchUserProfilePicture(chat.doctorId);
            if (pictureUrl && pictureUrl !== null) {
              profilePictures[chat.doctorId] = pictureUrl;
            } else {
              // Explicitly set to null if no picture found
              profilePictures[chat.doctorId] = null;
            }
          }
        }
      }
      setChatProfilePictures(profilePictures);
    } catch (error) {
      console.error('Error fetching chat profile pictures:', error);
    }
  };

  // Direct SOS activation for heart patients
  const activateHeartSOS = () => {
    // Navigate directly to emergency screen with immediate activation flag
    navigation.navigate('Emergency', { 
      screen: 'EmergencyMain',
      params: { 
        immediateSOS: true,
        isHeartPatient: true
      }
    });
  };

  const quickActions = [
    {
      title: 'Emergency SOS',
      subtitle: 'Immediate help',
      icon: 'alert-circle',
      color: theme.EMERGENCY,
      onPress: () => navigation.navigate('Emergency'),
      show: isPatient
    },
    {
      title: 'Heart SOS',
      subtitle: 'Quick heart emergency',
      icon: 'heart',
      color: theme.ERROR,
      onPress: activateHeartSOS,
      show: isPatient && userProfile?.isHeartPatient,
      isHeartSOS: true
    },
    {
      title: 'Book Consultation',
      subtitle: 'Find a doctor',
      icon: 'medical',
      color: theme.PRIMARY,
      onPress: () => navigation.navigate('Consultation', { screen: 'DoctorList' }),
      show: isPatient
    },
    {
      title: 'Chat with Doctors',
      subtitle: 'Message your doctor',
      icon: 'chatbubble',
      color: theme.ACCENT,
      onPress: () => navigation.navigate('Consultation', { screen: 'DoctorList', params: { chatMode: true } }),
      show: isPatient
    },
    {
      title: 'Telemedicine',
      subtitle: 'Virtual consultation',
      icon: 'videocam',
      color: theme.INFO,
      onPress: () => navigation.navigate('Consultation', { screen: 'Telemedicine' }),
      show: isPatient
    },
    {
      title: 'Health Records',
      subtitle: 'View your history',
      icon: 'folder',
      color: theme.SUCCESS,
      onPress: () => navigation.navigate('Health Records', { screen: 'HealthRecordsMain' }),
      show: true
    },
    {
      title: 'First Aid Guide',
      subtitle: 'Emergency tips',
      icon: 'book',
      color: theme.INFO,
      onPress: () => navigation.navigate('FirstAid'),
      show: true
    },
    {
      title: 'Health Assistant',
      subtitle: 'Symptom checker',
      icon: 'bar-chart',
      color: theme.INFO,
      onPress: () => navigation.navigate('AIHealthAssistant'),
      show: isPatient
    }
  ];

  const renderQuickAction = (action) => {
    if (!action.show) return null;
    
    // Special styling for heart SOS button
    if (action.isHeartSOS) {
      return (
        <View
          key={action.title}
          style={styles.quickActionWrapper}
        >
          <TouchableOpacity
            style={[styles.quickActionContainer, { width: CARD_WIDTH }]}
            onPress={action.onPress}
          >
            <View style={styles.heartSOSCard}>
              <Animated.View style={[styles.heartSOSButton, { transform: [{ scale: heartSOSAnimation }], backgroundColor: theme.ERROR }]}>
                <Ionicons name={action.icon} size={40} color={theme.WHITE} />
              </Animated.View>
              <Text style={[styles.heartSOSTitle, { color: theme.ERROR }]}>{action.title}</Text>
              <Text style={[styles.heartSOSSubtitle, { color: theme.ERROR }]}>{action.subtitle}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View
        key={action.title}
        style={styles.quickActionWrapper}
      >
        <TouchableOpacity
          style={[styles.quickActionContainer, { width: CARD_WIDTH }]}
          onPress={action.onPress}
        >
          <Card style={[styles.quickActionCard, { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: theme.CARD_BACKGROUND }]}>
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon} size={32} color={action.color} />
            </View>
            <Text style={[styles.quickActionTitle, { color: theme.TEXT_PRIMARY }]}>{action.title}</Text>
            <Text style={[styles.quickActionSubtitle, { color: theme.TEXT_SECONDARY }]}>{action.subtitle}</Text>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.welcomeContainer}>
              <Text style={[styles.welcomeText, { color: theme.TEXT_SECONDARY }]}>Welcome back,</Text>
              <Text style={[styles.userName, { color: theme.TEXT_PRIMARY }]}>
                {userProfile?.firstName} {userProfile?.lastName}
              </Text>
              <Text style={[styles.userRole, { color: theme.PRIMARY }]}>
                {userProfile?.role?.replace('_', ' ')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.TEXT_PRIMARY} />
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: theme.ERROR }]}>
                  <Text style={[styles.notificationBadgeText, { color: theme.WHITE }]}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>

          {/* Recent Chats Section - Only visible for patients */}
          {isPatient && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Recent Chats</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Consultation', { screen: 'DoctorList', params: { chatMode: true } })}>
                  <Text style={[styles.seeAllText, { color: theme.PRIMARY }]}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {loadingChats ? (
                <Card style={[styles.loadingCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
                  <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading recent chats...</Text>
                </Card>
              ) : recentChats.length > 0 ? (
                recentChats.map((chat) => (
                  <TouchableOpacity 
                    key={chat.id} 
                    onPress={() => navigation.navigate('Consultation', {
                      screen: 'Chat',
                      params: {
                        doctorId: chat.doctorId,
                        doctorName: chat.doctorName,
                        patientId: userProfile.uid,
                        patientName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Patient',
                        // Ensure we have a chatId for direct messaging
                        chatId: chat.id
                      }
                    })}
                  >
                    <Card style={[styles.chatCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
                      <View style={styles.chatCardContent}>
                        <View style={[styles.chatIcon, { backgroundColor: theme.PRIMARY }]}>
                          {chatProfilePictures[chat.doctorId] && chatProfilePictures[chat.doctorId] !== null ? (
                            <Image 
                              source={{ uri: chatProfilePictures[chat.doctorId] }} 
                              style={styles.chatAvatarImage}
                              onError={() => {
                                console.log('Chat profile picture load error for doctor:', chat.doctorId);
                                // Fallback to initials if image fails to load
                                setChatProfilePictures(prev => ({
                                  ...prev,
                                  [chat.doctorId]: null
                                }));
                              }}
                            />
                          ) : (
                            <Ionicons name="person" size={24} color={theme.WHITE} />
                          )}
                        </View>
                        <View style={styles.chatInfo}>
                          <Text style={[styles.doctorName, { color: theme.TEXT_PRIMARY }]}>{chat.doctorName}</Text>
                          <Text style={[styles.lastMessage, { color: theme.TEXT_SECONDARY }]} numberOfLines={1}>{chat.lastMessage}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.GRAY_MEDIUM} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              ) : (
                <Card style={[styles.emptyChatCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
                  <View style={styles.emptyChatContent}>
                    <Ionicons name="chatbubble-outline" size={36} color={theme.GRAY_MEDIUM} />
                    <Text style={[styles.emptyChatText, { color: theme.TEXT_SECONDARY }]}>No recent chats</Text>
                    <TouchableOpacity 
                      style={[styles.startChatButton, { backgroundColor: theme.PRIMARY }]}
                      onPress={() => navigation.navigate('Consultation', { screen: 'DoctorList', params: { chatMode: true } })}
                    >
                      <Text style={[styles.startChatButtonText, { color: theme.WHITE }]}>Start a Chat</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Recent Activity</Text>
            <Card style={[styles.activityCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
              <View style={styles.activityItem}>
                <Ionicons name="time-outline" size={20} color={theme.TEXT_SECONDARY} />
                <Text style={[styles.activityText, { color: theme.TEXT_SECONDARY }]}>
                  No recent activity to show
                </Text>
              </View>
            </Card>
          </View>

          {/* Health Records Card - Only visible for patients */}
          {isPatient && (
            <View style={styles.section}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Health Records', { screen: 'HealthRecordsMain' })}
              >
                <Card style={[styles.healthRecordsCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
                  <View style={styles.healthRecordsContent}>
                    <View style={[styles.healthRecordsIcon, { backgroundColor: theme.SUCCESS }]}>
                      <Ionicons name="folder" size={24} color={theme.WHITE} />
                    </View>
                    <View style={styles.healthRecordsText}>
                      <Text style={[styles.healthRecordsTitle, { color: theme.TEXT_PRIMARY }]}>Health Records</Text>
                      <Text style={[styles.healthRecordsDescription, { color: theme.TEXT_SECONDARY }]}>View your medical history and documents</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.GRAY_MEDIUM} />
                  </View>
                </Card>
              </TouchableOpacity>
            </View>
          )}

          {/* Health Tips */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Health Tip of the Day</Text>
            <Card variant="primary" style={[styles.healthTipCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
              <View style={styles.healthTipContent}>
                <Ionicons name="bulb" size={24} color={theme.PRIMARY} />
                <View style={styles.healthTipText}>
                  <Text style={[styles.healthTipTitle, { color: theme.TEXT_PRIMARY }]}>Stay Hydrated</Text>
                  <Text style={[styles.healthTipDescription, { color: theme.TEXT_SECONDARY }]}>
                    Drink at least 8 glasses of water daily to maintain good health.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.SM,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.ERROR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  notificationBadgeText: {
    color: theme.WHITE,
    fontSize: FONT_SIZES.XS,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  roleText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
  },
  section: {
    paddingHorizontal: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    marginTop: SPACING.MD,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionWrapper: {
    width: CARD_WIDTH,
    marginBottom: SPACING.MD,
  },
  quickActionCard: {
    height: CARD_HEIGHT,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  quickActionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  quickActionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.XS / 2,
  },
  quickActionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  heartSOSCard: {
    height: CARD_HEIGHT,
    // backgroundColor: theme.CARD_BACKGROUND,
    // borderWidth: 1,
    // borderColor: theme.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    // padding: SPACING.MD,
  },
  heartSOSButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: SPACING.XS,
  },
  heartSOSTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.ERROR,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
  heartSOSSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: theme.ERROR,
    textAlign: 'center',
    fontWeight: '600',
  },
  activityCard: {
    paddingVertical: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  healthRecordsCard: {
    padding: 0,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  healthRecordsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  healthRecordsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  healthRecordsText: {
    flex: 1,
  },
  healthRecordsTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  healthRecordsDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  healthTipCard: {
    padding: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  healthTipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  healthTipText: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  healthTipTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  healthTipDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    lineHeight: 20,
  },
  // Chat card styles
  loadingCard: {
    paddingVertical: SPACING.MD,
    alignItems: 'center',
    backgroundColor: theme.CARD_BACKGROUND,
  },
  loadingText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  chatCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  chatCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  
  chatAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  
  chatInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  lastMessage: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  emptyChatCard: {
    paddingVertical: SPACING.XL,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  emptyChatContent: {
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  startChatButton: {
    backgroundColor: theme.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
  },
  startChatButtonText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: '600',
  }
});

export default HomeScreen;