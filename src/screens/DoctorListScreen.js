import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  MEDICAL_SPECIALIZATIONS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';
import useProfilePicture from '../hooks/useProfilePicture';

// Separate DoctorCard component to avoid re-creating it on every render
const DoctorCard = ({ doctor, onViewProfile, onBookAppointment, chatMode, theme }) => { // Add theme prop
  const { fetchUserProfilePicture, getCachedProfilePicture } = useProfilePicture();
  const [profilePicture, setProfilePicture] = useState(null);
  const [loadingProfilePicture, setLoadingProfilePicture] = useState(false);

  // Fetch profile picture when component mounts or when doctor.id changes
  useEffect(() => {
    const loadProfilePicture = async () => {
      if (doctor.id) {
        setLoadingProfilePicture(true);
        try {
          // First check if we have it cached
          const cachedPicture = getCachedProfilePicture(doctor.id);
          if (cachedPicture && cachedPicture !== null) {
            setProfilePicture(cachedPicture);
          } else {
            // Fetch from Firestore if not cached
            const pictureUrl = await fetchUserProfilePicture(doctor.id);
            if (pictureUrl && pictureUrl !== null) {
              setProfilePicture(pictureUrl);
            } else {
              // Explicitly set to null if no picture found
              setProfilePicture(null);
            }
          }
        } catch (error) {
          console.error('Error loading profile picture:', error);
          // Set to null on error to show initials
          setProfilePicture(null);
        } finally {
          setLoadingProfilePicture(false);
        }
      }
    };

    loadProfilePicture();
  }, [doctor.id, getCachedProfilePicture, fetchUserProfilePicture]);

  return (
    <Card style={[styles.doctorCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.doctorHeader}>
        <View style={[styles.doctorAvatar, { backgroundColor: theme.PRIMARY }]}>
          {profilePicture && profilePicture !== null ? (
            <Image 
              source={{ uri: profilePicture }} 
              style={styles.doctorAvatarImage}
              onError={() => {
                console.log('Profile picture load error for doctor:', doctor.id);
                // Fallback to initials if image fails to load
                setProfilePicture(null);
              }}
            />
          ) : (
            <Ionicons name="person" size={32} color={theme.WHITE} />
          )}
        </View>
        <View style={styles.doctorInfo}>
          <Text style={[styles.doctorName, { color: theme.TEXT_PRIMARY }]}>{doctor.name}</Text>
          <Text style={[styles.doctorSpecialization, { color: theme.PRIMARY }]}>{doctor.specialization}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={theme.WARNING} />
            <Text style={[styles.rating, { color: theme.TEXT_SECONDARY }]}>{doctor.rating}</Text>
            <Text style={[styles.reviewCount, { color: theme.TEXT_SECONDARY }]}>({doctor.reviewCount} reviews)</Text>
          </View>
        </View>
        <View style={styles.availabilityContainer}>
          <View style={[
            styles.availabilityBadge,
            { backgroundColor: doctor.availableNow ? theme.SUCCESS : theme.GRAY_MEDIUM }
          ]}>
            <Text style={[styles.availabilityText, { color: theme.WHITE }]}>
              {doctor.availableNow ? 'Available' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.doctorActions}>
        <Button
          title={chatMode ? "Chat Now" : "View Profile"}
          variant="outline"
          size="small"
          onPress={() => onViewProfile(doctor)}
          style={styles.actionButton}
        />
        <Button
          title={chatMode ? "Start Chat" : "Book Appointment"}
          size="small"
          onPress={() => onBookAppointment(doctor)}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
};

const DoctorListScreen = ({ navigation, route }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [sortBy, setSortBy] = useState('rating'); // rating, availability, experience
  const [chatMode, setChatMode] = useState(false); // New state for chat mode
  const doctorsListenerRef = useRef(null);

  useEffect(() => {
    // Check if we're in chat mode
    if (route?.params?.chatMode) {
      setChatMode(true);
    }
    loadDoctors();
    const unsubscribe = setupDoctorsListener();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, searchQuery, selectedSpecialization, urgent, sortBy]);

  const setupDoctorsListener = () => {
    try {
      // Listen for doctors in real-time
      // Only filter by role 'doctor', remove isVerified and isActive filters for now
      const doctorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'doctor')
      );
      
      return onSnapshot(doctorsQuery, (snapshot) => {
        const doctorsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          doctorsData.push({
            id: doc.id,
            uid: doc.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Doctor',
            specialization: data.specialization || 'General Practitioner',
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            experience: data.experience || 5,
            location: data.address || 'Medical Center',
            consultationFee: data.consultationFee || 100,
            availableNow: data.availableNow || false,
            phone: data.phone || '',
            email: data.email || '',
            licenseNumber: data.licenseNumber || '',
            languages: data.languages || ['en'],
            isVerified: data.isVerified || false,
            isActive: data.isActive || false
          });
        });
        
        setDoctors(doctorsData);
      }, (error) => {
        console.error('Error listening to doctors:', error);
      });
    } catch (error) {
      console.error('Error setting up doctors listener:', error);
      return null;
    }
  };

  const loadDoctors = async () => {
    try {
      setLoading(true);
      
      // Fetch doctors from Firebase users collection where role is 'doctor'
      // Only filter by role 'doctor', remove isVerified and isActive filters for now
      const doctorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'doctor')
      );
      
      const querySnapshot = await getDocs(doctorsQuery);
      const doctorsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        doctorsData.push({
          id: doc.id,
          uid: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Doctor',
          specialization: data.specialization || 'General Practitioner',
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          experience: data.experience || 5,
          location: data.address || 'Medical Center',
          consultationFee: data.consultationFee || 100,
          availableNow: data.availableNow || false,
          phone: data.phone || '',
          email: data.email || '',
          licenseNumber: data.licenseNumber || '',
          languages: data.languages || ['en'],
          isVerified: data.isVerified || false,
          isActive: data.isActive || false
        });
      });
      
      setDoctors(doctorsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setLoading(false);
      // In a production app, we might want to show an error message to the user
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(doctor =>
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by specialization
    if (selectedSpecialization) {
      filtered = filtered.filter(doctor => doctor.specialization === selectedSpecialization);
    }

    // Filter for urgent care
    if (urgent) {
      filtered = filtered.filter(doctor => doctor.availableNow);
    }

    // Sort doctors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'experience':
          return b.experience - a.experience;
        case 'availability':
          return b.availableNow - a.availableNow;
        default:
          return 0;
      }
    });

    setFilteredDoctors(filtered);
  };

  const handleBookAppointment = (doctor) => {
    if (chatMode) {
      // Navigate to chat with the selected doctor
      // Generate a unique chat ID for direct messaging
      const patientId = userProfile?.uid;
      const doctorId = doctor.id;
      
      if (!patientId || !doctorId) {
        Alert.alert('Error', 'Unable to start chat. Missing user information.');
        return;
      }
      
      // Create a consistent chatId for direct messaging
      const participantIds = [doctorId, patientId].sort();
      const chatId = `${participantIds[0]}_${participantIds[1]}`;
      
      // Navigate to chat with all required parameters
      navigation.navigate('Chat', {
        doctorId: doctorId,
        doctorName: doctor.name,
        patientId: patientId,
        patientName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Patient',
        chatId: chatId // Include the generated chatId
      });
    } else {
      // Normal booking flow
      navigation.navigate('Booking', { doctor });
    }
  };

  const handleViewProfile = (doctor) => {
    if (chatMode) {
      // In chat mode, we might want to show a simplified profile or just start chat
      handleBookAppointment(doctor);
    } else {
      // Normal profile view
      navigation.navigate('DoctorProfile', { doctor: { id: doctor.id } });
    }
  };

  const SpecializationChip = ({ specialization, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.specializationChip,
        isSelected && styles.selectedChip,
        { 
          backgroundColor: isSelected ? theme.PRIMARY : theme.GRAY_LIGHT,
          borderColor: theme.BORDER
        }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.chipText,
        isSelected && styles.selectedChipText,
        { 
          color: isSelected ? theme.WHITE : theme.TEXT_SECONDARY
        }
      ]}>
        {specialization}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      {/* Search Section */}
      <View style={[styles.searchSection, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>{chatMode ? 'Select a Doctor to Chat' : 'Find a Doctor'}</Text>
          <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>
            {chatMode 
              ? 'Choose a doctor to start a conversation' 
              : 'Browse and connect with healthcare providers'}
          </Text>
        </View>
        
        <View style={[styles.searchBar, { backgroundColor: theme.GRAY_LIGHT, borderColor: theme.BORDER }]}>
          <Ionicons name="search-outline" size={20} color={theme.GRAY_MEDIUM} />
          <TextInput
            style={[styles.searchInput, { color: theme.TEXT_PRIMARY }]}
            placeholder="Search doctors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.GRAY_MEDIUM}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.GRAY_MEDIUM} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.specializationChip,
              !selectedSpecialization && styles.selectedChip,
              { 
                backgroundColor: !selectedSpecialization ? theme.PRIMARY : theme.GRAY_LIGHT,
                borderColor: theme.BORDER
              }
            ]}
            onPress={() => setSelectedSpecialization('')}
          >
            <Text style={[
              styles.chipText,
              !selectedSpecialization && styles.selectedChipText,
              { 
                color: !selectedSpecialization ? theme.WHITE : theme.TEXT_SECONDARY
              }
            ]}>
              All Specializations
            </Text>
          </TouchableOpacity>
          
          {MEDICAL_SPECIALIZATIONS.map((specialization) => (
            <TouchableOpacity
              key={specialization}
              style={[
                styles.specializationChip,
                selectedSpecialization === specialization && styles.selectedChip,
                { 
                  backgroundColor: selectedSpecialization === specialization ? theme.PRIMARY : theme.GRAY_LIGHT,
                  borderColor: theme.BORDER
                }
              ]}
              onPress={() => setSelectedSpecialization(selectedSpecialization === specialization ? '' : specialization)}
            >
              <Text style={[
                styles.chipText,
                selectedSpecialization === specialization && styles.selectedChipText,
                { 
                  color: selectedSpecialization === specialization ? theme.WHITE : theme.TEXT_SECONDARY
                }
              ]}>
                {specialization}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={[styles.sortLabel, { color: theme.TEXT_SECONDARY }]}>Sort by:</Text>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'rating' && styles.selectedSortOption,
              { 
                backgroundColor: sortBy === 'rating' ? theme.PRIMARY : theme.GRAY_LIGHT,
                borderColor: theme.BORDER
              }
            ]}
            onPress={() => setSortBy('rating')}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'rating' && styles.selectedSortOptionText,
              { 
                color: sortBy === 'rating' ? theme.WHITE : theme.TEXT_SECONDARY
              }
            ]}>
              Rating
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'experience' && styles.selectedSortOption,
              { 
                backgroundColor: sortBy === 'experience' ? theme.PRIMARY : theme.GRAY_LIGHT,
                borderColor: theme.BORDER
              }
            ]}
            onPress={() => setSortBy('experience')}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'experience' && styles.selectedSortOptionText,
              { 
                color: sortBy === 'experience' ? theme.WHITE : theme.TEXT_SECONDARY
              }
            ]}>
              Experience
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'availability' && styles.selectedSortOption,
              { 
                backgroundColor: sortBy === 'availability' ? theme.PRIMARY : theme.GRAY_LIGHT,
                borderColor: theme.BORDER
              }
            ]}
            onPress={() => setSortBy('availability')}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'availability' && styles.selectedSortOptionText,
              { 
                color: sortBy === 'availability' ? theme.WHITE : theme.TEXT_SECONDARY
              }
            ]}>
              Availability
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortOption, { backgroundColor: theme.GRAY_LIGHT, borderColor: theme.BORDER }]}
            onPress={() => setUrgent(!urgent)}
          >
            <Text style={[styles.sortOptionText, { color: theme.TEXT_SECONDARY }]}>
              {urgent ? 'All Doctors' : 'Available Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <View style={[styles.resultsContainer, { backgroundColor: theme.BACKGROUND }]}>
        <Text style={[styles.resultsCount, { color: theme.TEXT_SECONDARY }]}>
          {loading ? 'Loading...' : `${filteredDoctors.length} doctors found`}
          {urgent && ' (Available Now)'}
        </Text>

        <ScrollView style={styles.doctorsList} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.PRIMARY} />
              <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Finding doctors for you...</Text>
            </View>
          ) : filteredDoctors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color={theme.GRAY_MEDIUM} />
              <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Doctors Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
                Try adjusting your search criteria or filters
              </Text>
            </View>
          ) : (
            filteredDoctors.map((doctor) => (
              <DoctorCard 
                key={doctor.id} 
                doctor={doctor} 
                onViewProfile={handleViewProfile}
                onBookAppointment={handleBookAppointment}
                chatMode={chatMode}
                theme={theme} // Pass theme to DoctorCard
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  header: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.MD,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    backgroundColor: theme.INPUT_BACKGROUND,
    color: theme.TEXT_PRIMARY,
  },
  filterButton: {
    marginLeft: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: theme.BUTTON_SECONDARY,
    borderRadius: BORDER_RADIUS.MD,
  },
  content: {
    flex: 1,
  },
  filterSection: {
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    backgroundColor: theme.BUTTON_SECONDARY,
    marginRight: SPACING.SM,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  selectedChip: {
    backgroundColor: theme.PRIMARY,
  },
  chipText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  selectedChipText: {
    color: theme.WHITE,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginRight: SPACING.SM,
  },
  sortOption: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.SM,
    marginBottom: SPACING.XS,
    backgroundColor: theme.BUTTON_SECONDARY,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  selectedSortOption: {
    backgroundColor: theme.PRIMARY,
  },
  sortOptionText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  selectedSortOptionText: {
    color: theme.WHITE,
  },
  resultsContainer: {
    flex: 1,
    padding: SPACING.MD,
    backgroundColor: theme.BACKGROUND,
  },
  resultsCount: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  doctorsList: {
    flex: 1,
  },
  doctorCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  
  doctorAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  doctorSpecialization: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '600',
    marginLeft: SPACING.XS / 2,
    marginRight: SPACING.XS,
  },
  reviewCount: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
  availabilityContainer: {
    alignItems: 'flex-end',
  },
  availabilityBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  availabilityText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: '600',
  },
  doctorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.LG,
  },
});

export default DoctorListScreen;