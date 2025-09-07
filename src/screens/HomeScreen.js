import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../constants';
import useNotifications from '../hooks/useNotifications';
import useProfilePicture from '../hooks/useProfilePicture';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

const HomeScreen = ({ navigation }) => {
  const { userProfile, isPatient, isDoctor, isEmergencyOperator } = useAuth();
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const { unreadCount } = useNotifications({ autoRefresh: true });
  const [recentChats, setRecentChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatProfilePictures, setChatProfilePictures] = useState({});

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

  const quickActions = [
    {
      title: 'Emergency SOS',
      subtitle: 'Immediate help',
      icon: 'alert-circle',
      color: COLORS.EMERGENCY,
      onPress: () => navigation.navigate('Emergency', { screen: 'SOS' }),
      show: isPatient
    },
    {
      title: 'Book Consultation',
      subtitle: 'Find a doctor',
      icon: 'medical',
      color: COLORS.PRIMARY,
      onPress: () => navigation.navigate('Consultation', { screen: 'DoctorList' }),
      show: isPatient
    },
    {
      title: 'Chat with Doctors',
      subtitle: 'Message your doctor',
      icon: 'chatbubble',
      color: COLORS.ACCENT,
      onPress: () => navigation.navigate('Consultation', { screen: 'DoctorList', params: { chatMode: true } }),
      show: isPatient
    },
    {
      title: 'Telemedicine',
      subtitle: 'Virtual consultation',
      icon: 'videocam',
      color: COLORS.INFO,
      onPress: () => navigation.navigate('Consultation', { screen: 'Telemedicine' }),
      show: isPatient
    },
    {
      title: 'Health Records',
      subtitle: 'View your history',
      icon: 'folder',
      color: COLORS.SUCCESS,
      onPress: () => navigation.navigate('Health Records', { screen: 'HealthRecordsMain' }),
      show: true
    },
    {
      title: 'First Aid Guide',
      subtitle: 'Emergency tips',
      icon: 'book',
      color: COLORS.INFO,
      onPress: () => navigation.navigate('FirstAid'),
      show: true
    },
    {
      title: 'Health Assistant',
      subtitle: 'Symptom checker',
      icon: 'bar-chart',
      color: COLORS.INFO,
      onPress: () => navigation.navigate('AIHealthAssistant'),
      show: isPatient
    }
  ];

  const renderQuickAction = (action) => {
    if (!action.show) return null;
    
    return (
      <TouchableOpacity
        key={action.title}
        style={styles.quickActionContainer}
        onPress={action.onPress}
      >
        <Card style={styles.quickActionCard}>
          <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
            <Ionicons name={action.icon} size={32} color={action.color} />
          </View>
          <Text style={styles.quickActionTitle}>{action.title}</Text>
          <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {userProfile?.firstName} {userProfile?.lastName}
              </Text>
              <Text style={styles.userRole}>
                {userProfile?.role?.replace('_', ' ')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.TEXT_PRIMARY} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>

          {/* Recent Chats Section - Only visible for patients */}
          {isPatient && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Chats</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Consultation', { screen: 'DoctorList', params: { chatMode: true } })}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {loadingChats ? (
                <Card style={styles.loadingCard}>
                  <Text style={styles.loadingText}>Loading recent chats...</Text>
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
                    <Card style={styles.chatCard}>
                      <View style={styles.chatCardContent}>
                        <View style={styles.chatIcon}>
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
                            <Ionicons name="person" size={24} color={COLORS.WHITE} />
                          )}
                        </View>
                        <View style={styles.chatInfo}>
                          <Text style={styles.doctorName}>{chat.doctorName}</Text>
                          <Text style={styles.lastMessage} numberOfLines={1}>{chat.lastMessage}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              ) : (
                <Card style={styles.emptyChatCard}>
                  <View style={styles.emptyChatContent}>
                    <Ionicons name="chatbubble-outline" size={36} color={COLORS.GRAY_MEDIUM} />
                    <Text style={styles.emptyChatText}>No recent chats</Text>
                    <TouchableOpacity 
                      style={styles.startChatButton}
                      onPress={() => navigation.navigate('Consultation', { screen: 'DoctorList', params: { chatMode: true } })}
                    >
                      <Text style={styles.startChatButtonText}>Start a Chat</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.activityCard}>
              <View style={styles.activityItem}>
                <Ionicons name="time-outline" size={20} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.activityText}>
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
                <Card style={styles.healthRecordsCard}>
                  <View style={styles.healthRecordsContent}>
                    <View style={styles.healthRecordsIcon}>
                      <Ionicons name="folder" size={24} color={COLORS.WHITE} />
                    </View>
                    <View style={styles.healthRecordsText}>
                      <Text style={styles.healthRecordsTitle}>Health Records</Text>
                      <Text style={styles.healthRecordsDescription}>View your medical history and documents</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
                  </View>
                </Card>
              </TouchableOpacity>
            </View>
          )}

          {/* Health Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Tip of the Day</Text>
            <Card variant="primary" style={styles.healthTipCard}>
              <View style={styles.healthTipContent}>
                <Ionicons name="bulb" size={24} color={COLORS.PRIMARY} />
                <View style={styles.healthTipText}>
                  <Text style={styles.healthTipTitle}>Stay Hydrated</Text>
                  <Text style={styles.healthTipDescription}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.XL,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  userName: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.XS,
  },
  userRole: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginTop: SPACING.XS,
    textTransform: 'capitalize',
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.SM,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.ERROR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 12,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: SPACING.XL,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  seeAllText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionContainer: {
    width: '48%',
    marginBottom: SPACING.MD,
  },
  quickActionCard: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  quickActionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.XS,
  },
  quickActionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  activityCard: {
    paddingVertical: SPACING.LG,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  healthRecordsCard: {
    padding: 0,
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
    backgroundColor: COLORS.SUCCESS,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  healthRecordsDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  healthTipCard: {
    padding: SPACING.LG,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  healthTipDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  // Chat card styles
  loadingCard: {
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  chatCard: {
    marginBottom: SPACING.MD,
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
    backgroundColor: COLORS.PRIMARY,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  lastMessage: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyChatCard: {
    paddingVertical: SPACING.XL,
  },
  emptyChatContent: {
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  startChatButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
  },
  startChatButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    fontWeight: '600',
  }
});

export default HomeScreen;