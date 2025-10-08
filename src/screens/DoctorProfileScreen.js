import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';

const DoctorProfileScreen = ({ route, navigation }) => {
  const { doctor } = route.params || {};
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [doctorData, setDoctorData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedTab, setSelectedTab] = useState('about');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (doctor) {
      loadDoctorDetails(doctor.id);
      loadDoctorReviews(doctor.id);
    }
  }, [doctor]);

  const loadDoctorDetails = async (doctorId) => {
    try {
      setLoading(true);
      
      // Fetch doctor details from Firebase
      const doctorDocRef = doc(db, 'users', doctorId);
      const doctorDoc = await getDoc(doctorDocRef);
      
      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        const doctorDetails = {
          id: doctorDoc.id,
          uid: doctorDoc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Doctor',
          specialization: data.specialization || 'General Practitioner',
          rating: 0, // Will be updated from actual reviews
          reviewCount: 0, // Will be updated from actual reviews
          experience: data.experience || 5,
          location: data.address || 'Medical Center',
          consultationFee: data.consultationFee || 100,
          availableNow: data.availableNow || false,
          phone: data.phone || '',
          email: data.email || '',
          licenseNumber: data.licenseNumber || '',
          languages: data.languages || ['en'],
          about: data.about || `Experienced ${data.specialization || 'healthcare'} professional dedicated to providing comprehensive medical care.`,
          patients: data.patients || '500+'
        };
        
        setDoctorData(doctorDetails);
      } else {
        console.error('Doctor not found');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading doctor details:', error);
      setLoading(false);
    }
  };

  const loadDoctorReviews = async (doctorId) => {
    try {
      // Fetch reviews from Firebase
      // Removed orderBy to avoid composite index requirement
      const reviewsQuery = query(
        collection(db, 'users', doctorId, 'reviews')
        // Removed orderBy('createdAt', 'desc') to avoid composite index
      );
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Format the date for display
        date: doc.data().createdAt?.toDate ? 
          doc.data().createdAt.toDate().toLocaleDateString() : 
          new Date().toLocaleDateString()
      }));
      
      // Sort in memory instead of using Firestore orderBy
      reviewsData.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : a.createdAt) : new Date(0);
        const dateB = b.createdAt ? (typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : b.createdAt) : new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
      
      setReviews(reviewsData);
      
      // Update doctor's rating based on reviews
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviewsData.length) * 10) / 10;
        
        setDoctorData(prev => ({
          ...prev,
          rating: averageRating,
          reviewCount: reviewsData.length
        }));
      } else {
        // Set default values if no reviews
        setDoctorData(prev => ({
          ...prev,
          rating: 0,
          reviewCount: 0
        }));
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Set default values if there's an error
      setReviews([]);
      setDoctorData(prev => ({
        ...prev,
        rating: 0,
        reviewCount: 0
      }));
    }
  };

  const handleBookAppointment = () => {
    navigation.navigate('Booking', { doctor: doctorData });
  };

  const handleStartChat = () => {
    navigation.navigate('Chat', {
      doctorId: doctorData.id,
      doctorName: doctorData.name,
      patientId: userProfile?.uid,
      patientName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Patient'
    });
  };

  const TabButton = ({ title, value, active, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTab, { borderBottomColor: active ? theme.PRIMARY : 'transparent' }]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.activeTabText, { color: active ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const ReviewCard = ({ review }) => (
    <Card style={[styles.reviewCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.patientInfo}>
          <View style={[styles.patientAvatar, { backgroundColor: theme.PRIMARY }]}>
            <Text style={[styles.patientInitial, { color: theme.WHITE }]}>{review.patientName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={[styles.patientName, { color: theme.TEXT_PRIMARY }]}>{review.patientName}</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= review.rating ? 'star' : 'star-outline'}
                  size={16}
                  color={theme.WARNING}
                />
              ))}
              <Text style={[styles.reviewDate, { color: theme.TEXT_SECONDARY }]}>{review.date}</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={[styles.reviewText, { color: theme.TEXT_SECONDARY }]}>{review.comment}</Text>
    </Card>
  );

  const ScheduleSlot = ({ time, available, onPress }) => (
    <TouchableOpacity
      style={[
        styles.scheduleSlot,
        available ? styles.availableSlot : styles.unavailableSlot,
        { backgroundColor: available ? theme.PRIMARY : theme.GRAY_LIGHT }
      ]}
      onPress={available ? onPress : null}
      disabled={!available}
    >
      <Text style={[
        styles.slotText,
        available ? styles.availableSlotText : styles.unavailableSlotText,
        { color: available ? theme.WHITE : theme.TEXT_SECONDARY }
      ]}>
        {time}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.TEXT_PRIMARY }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctorData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.ERROR }]}>Doctor information not available</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card style={[styles.headerCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <View style={styles.doctorHeader}>
            <View style={[styles.doctorAvatar, { backgroundColor: theme.PRIMARY }]}>
              <Ionicons name="person" size={40} color={theme.WHITE} />
            </View>
            <View style={styles.doctorInfo}>
              <Text style={[styles.doctorName, { color: theme.TEXT_PRIMARY }]}>{doctorData.name}</Text>
              <Text style={[styles.doctorSpecialization, { color: theme.PRIMARY }]}>{doctorData.specialization}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={theme.WARNING} />
                <Text style={[styles.ratingText, { color: theme.TEXT_PRIMARY }]}>{doctorData.rating}</Text>
                <Text style={[styles.reviewCount, { color: theme.TEXT_SECONDARY }]}>({doctorData.reviewCount} reviews)</Text>
              </View>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color={theme.TEXT_SECONDARY} />
                <Text style={[styles.location, { color: theme.TEXT_SECONDARY }]}>{doctorData.location}</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: doctorData.availableNow ? theme.SUCCESS : theme.GRAY_MEDIUM }
              ]}>
                <Text style={[styles.statusText, { color: theme.WHITE }]}>
                  {doctorData.availableNow ? 'Available' : 'Busy'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={[styles.statsContainer, { borderTopColor: theme.BORDER }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.PRIMARY }]}>{doctorData.experience}</Text>
              <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Years Exp.</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.PRIMARY }]}>{doctorData.consultationFee}</Text>
              <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Consultation</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.PRIMARY }]}>{doctorData.patients || '500+'}</Text>
              <Text style={[styles.statLabel, { color: theme.TEXT_SECONDARY }]}>Patients</Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Book Appointment"
            onPress={handleBookAppointment}
            style={styles.bookButton}
          />
          <Button
            title="Start Chat"
            onPress={handleStartChat}
            variant="outline"
            style={styles.chatButton}
          />
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
          <TabButton
            title="About"
            value="about"
            active={selectedTab === 'about'}
            onPress={() => setSelectedTab('about')}
          />
          <TabButton
            title="Reviews"
            value="reviews"
            active={selectedTab === 'reviews'}
            onPress={() => setSelectedTab('reviews')}
          />
          <TabButton
            title="Schedule"
            value="schedule"
            active={selectedTab === 'schedule'}
            onPress={() => setSelectedTab('schedule')}
          />
        </View>

        {/* Tab Content */}
        {selectedTab === 'about' && (
          <Card style={[styles.tabContent, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>About Dr. {doctorData.name}</Text>
            <Text style={[styles.aboutText, { color: theme.TEXT_SECONDARY }]}>
              {doctorData.about || 'Dr. ' + doctorData.name + ' is an experienced ' + doctorData.specialization.toLowerCase() + ' with ' + doctorData.experience + ' years of practice. Committed to providing excellent patient care and staying up-to-date with the latest medical advances.'}
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Education & Certifications</Text>
            {(doctorData.education || []).map((item, index) => (
              <View key={index} style={styles.educationItem}>
                <Ionicons name="school" size={16} color={theme.PRIMARY} />
                <View style={styles.educationText}>
                  <Text style={[styles.educationDegree, { color: theme.TEXT_PRIMARY }]}>{item.degree}</Text>
                  <Text style={[styles.educationInstitution, { color: theme.TEXT_SECONDARY }]}>{item.institution}</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Specializations</Text>
            <View style={styles.specializationsContainer}>
              {(doctorData.specializations || [doctorData.specialization]).map((spec, index) => (
                <View key={index} style={[styles.specializationTag, { backgroundColor: theme.GRAY_LIGHT }]}>
                  <Text style={[styles.specializationText, { color: theme.TEXT_PRIMARY }]}>{spec}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Languages</Text>
            <Text style={[styles.languageText, { color: theme.TEXT_SECONDARY }]}>
              {(doctorData.languages || ['English']).join(', ')}
            </Text>
          </Card>
        )}

        {selectedTab === 'reviews' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Patient Reviews</Text>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        )}

        {selectedTab === 'schedule' && (
          <Card style={[styles.tabContent, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Available Times</Text>
            <Text style={[styles.scheduleDate, { color: theme.TEXT_PRIMARY }]}>Today - {new Date().toLocaleDateString()}</Text>
            
            <Text style={[styles.timeSlotLabel, { color: theme.TEXT_SECONDARY }]}>Morning</Text>
            <View style={styles.timeSlotsRow}>
              <ScheduleSlot time="09:00 AM" available={true} onPress={handleBookAppointment} />
              <ScheduleSlot time="10:00 AM" available={false} />
              <ScheduleSlot time="11:00 AM" available={true} onPress={handleBookAppointment} />
            </View>

            <Text style={[styles.timeSlotLabel, { color: theme.TEXT_SECONDARY }]}>Afternoon</Text>
            <View style={styles.timeSlotsRow}>
              <ScheduleSlot time="02:00 PM" available={true} onPress={handleBookAppointment} />
              <ScheduleSlot time="03:00 PM" available={true} onPress={handleBookAppointment} />
              <ScheduleSlot time="04:00 PM" available={false} />
            </View>

            <Text style={[styles.timeSlotLabel, { color: theme.TEXT_SECONDARY }]}>Evening</Text>
            <View style={styles.timeSlotsRow}>
              <ScheduleSlot time="06:00 PM" available={true} onPress={handleBookAppointment} />
              <ScheduleSlot time="07:00 PM" available={false} />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  content: {
    padding: SPACING.MD,
  },
  headerCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  doctorHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  doctorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  doctorInfo: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  doctorName: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  doctorSpecialization: {
    fontSize: FONT_SIZES.MD,
    color: theme.PRIMARY,
    marginBottom: SPACING.MD,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  ratingText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.XS,
    marginRight: SPACING.MD,
  },
  reviewCount: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  statusContainer: {
    marginBottom: SPACING.MD,
  },
  statusBadge: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.XL,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.WHITE,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
    gap: SPACING.MD,
  },
  bookButton: {
    flex: 2,
  },
  chatButton: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.XS,
    marginBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.SM,
  },
  activeTab: {
    backgroundColor: theme.PRIMARY,
  },
  tabText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_SECONDARY,
  },
  activeTabText: {
    color: theme.WHITE,
  },
  tabContent: {
    marginBottom: SPACING.XL,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    marginTop: SPACING.MD,
  },
  aboutText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: SPACING.LG,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  educationText: {
    marginLeft: SPACING.SM,
    flex: 1,
  },
  educationDegree: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  educationInstitution: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.LG,
  },
  specializationTag: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  specializationText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    fontWeight: '500',
  },
  languageText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
  },
  reviewCard: {
    marginBottom: SPACING.SM,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  reviewHeader: {
    marginBottom: SPACING.SM,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  patientInitial: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.WHITE,
  },
  patientName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  reviewText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    lineHeight: 20,
  },
  scheduleDate: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.LG,
  },
  timeSlotLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
    marginTop: SPACING.MD,
  },
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.MD,
  },
  scheduleSlot: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    marginRight: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  availableSlot: {
    backgroundColor: theme.PRIMARY,
  },
  unavailableSlot: {
    backgroundColor: theme.GRAY_LIGHT,
  },
  slotText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
  },
  availableSlotText: {
    color: theme.WHITE,
  },
  unavailableSlotText: {
    color: theme.TEXT_SECONDARY,
  },
});

export default DoctorProfileScreen;