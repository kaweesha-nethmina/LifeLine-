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
const DoctorCard = ({ doctor, onViewProfile, onBookAppointment, chatMode }) => {
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
    <Card style={styles.doctorCard}>
      <View style={styles.doctorHeader}>
        <View style={styles.doctorAvatar}>
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
            <Ionicons name="person" size={32} color={COLORS.WHITE} />
          )}
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={COLORS.WARNING} />
            <Text style={styles.rating}>{doctor.rating}</Text>
            <Text style={styles.reviewCount}>({doctor.reviewCount} reviews)</Text>
          </View>
        </View>
        <View style={styles.availabilityContainer}>
          <View style={[
            styles.availabilityBadge,
            { backgroundColor: doctor.availableNow ? COLORS.SUCCESS : COLORS.GRAY_MEDIUM }
          ]}>
            <Text style={styles.availabilityText}>
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
        isSelected && styles.selectedChip
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.chipText,
        isSelected && styles.selectedChipText
      ]}>
        {specialization}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.header}>
          <Text style={styles.title}>{chatMode ? 'Select a Doctor to Chat' : 'Find a Doctor'}</Text>
          <Text style={styles.subtitle}>
            {chatMode 
              ? 'Choose a doctor to start a conversation' 
              : 'Browse and connect with healthcare providers'}
          </Text>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.GRAY_MEDIUM} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.GRAY_MEDIUM} />
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
              !selectedSpecialization && styles.selectedChip
            ]}
            onPress={() => setSelectedSpecialization('')}
          >
            <Text style={[
              styles.chipText,
              !selectedSpecialization && styles.selectedChipText
            ]}>
              All Specializations
            </Text>
          </TouchableOpacity>
          
          {MEDICAL_SPECIALIZATIONS.map((specialization) => (
            <TouchableOpacity
              key={specialization}
              style={[
                styles.specializationChip,
                selectedSpecialization === specialization && styles.selectedChip
              ]}
              onPress={() => setSelectedSpecialization(selectedSpecialization === specialization ? '' : specialization)}
            >
              <Text style={[
                styles.chipText,
                selectedSpecialization === specialization && styles.selectedChipText
              ]}>
                {specialization}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'rating' && styles.selectedSortOption
            ]}
            onPress={() => setSortBy('rating')}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'rating' && styles.selectedSortOptionText
            ]}>
              Rating
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'experience' && styles.selectedSortOption
            ]}
            onPress={() => setSortBy('experience')}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'experience' && styles.selectedSortOptionText
            ]}>
              Experience
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'availability' && styles.selectedSortOption
            ]}
            onPress={() => setSortBy('availability')}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'availability' && styles.selectedSortOptionText
            ]}>
              Availability
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sortOption}
            onPress={() => setUrgent(!urgent)}
          >
            <Text style={styles.sortOptionText}>
              {urgent ? 'All Doctors' : 'Available Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsCount}>
          {loading ? 'Loading...' : `${filteredDoctors.length} doctors found`}
          {urgent && ' (Available Now)'}
        </Text>

        <ScrollView style={styles.doctorsList} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Finding doctors for you...</Text>
            </View>
          ) : filteredDoctors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color={COLORS.GRAY_MEDIUM} />
              <Text style={styles.emptyTitle}>No Doctors Found</Text>
              <Text style={styles.emptySubtitle}>
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
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    marginBottom: SPACING.MD,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  searchSection: {
    padding: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  filterScroll: {
    marginBottom: SPACING.MD,
  },
  specializationChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    backgroundColor: COLORS.GRAY_LIGHT,
    marginRight: SPACING.SM,
  },
  selectedChip: {
    backgroundColor: COLORS.PRIMARY,
  },
  chipText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  selectedChipText: {
    color: COLORS.WHITE,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.SM,
  },
  sortOption: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.SM,
    marginBottom: SPACING.XS,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  selectedSortOption: {
    backgroundColor: COLORS.PRIMARY,
  },
  sortOptionText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  selectedSortOptionText: {
    color: COLORS.WHITE,
  },
  resultsContainer: {
    flex: 1,
    padding: SPACING.MD,
  },
  resultsCount: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  doctorsList: {
    flex: 1,
  },
  doctorCard: {
    marginBottom: SPACING.MD,
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
    backgroundColor: COLORS.PRIMARY,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  doctorSpecialization: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginLeft: SPACING.XS / 2,
    marginRight: SPACING.XS,
  },
  reviewCount: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
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
    color: COLORS.WHITE,
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
    color: COLORS.TEXT_SECONDARY,
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
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.LG,
  },
});

export default DoctorListScreen;