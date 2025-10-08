import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  CONSULTATION_STATUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';
import { collection, addDoc, doc, onSnapshot, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import NotificationService from '../services/notificationService';
import usePushNotifications from '../hooks/usePushNotifications';

const BookingScreen = ({ navigation, route }) => {
  const { doctor } = route.params || {};
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const pushNotifications = usePushNotifications();
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('video'); // video, chat, in-person
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [appointmentStatus, setAppointmentStatus] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const statusListenerRef = useRef(null);

  useEffect(() => {
    loadDoctorData();
    return () => {
      // Clean up status listener when component unmounts
      if (statusListenerRef.current) {
        statusListenerRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDate && doctorData) {
      loadAvailableTimes(selectedDate);
    }
  }, [selectedDate, doctorData]);

  const loadDoctorData = async () => {
    if (!doctor?.id) return;
    
    try {
      const doctorDocRef = doc(db, 'users', doctor.id);
      const doctorDoc = await getDoc(doctorDocRef);
      
      if (doctorDoc.exists()) {
        const doctorInfo = doctorDoc.data();
        console.log("Doctor data loaded:", JSON.stringify(doctorInfo));
        setDoctorData(doctorInfo);
        
        // Load available dates based on doctor's schedule
        loadAvailableDates(doctorInfo);
      } else {
        console.log('Doctor document not found');
      }
    } catch (error) {
      console.error('Error loading doctor data:', error);
    }
  };

  const loadAvailableDates = (doctorInfo) => {
    // Get doctor's availability from their profile
    const availability = doctorInfo.availability || generateDefaultAvailability();
    console.log("Doctor availability:", JSON.stringify(availability));
    const dates = [];
    const today = new Date();
    
    // Generate next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if doctor is available on this date
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isAvailable = availability[dayOfWeek] !== undefined;
      
      dates.push({
        date: dateStr,
        display: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        available: true // Default all days to available for now
      });
    }
    setAvailableDates(dates);
  };

  // Generate default availability if the doctor doesn't have any
  const generateDefaultAvailability = () => {
    const defaultAvailability = {};
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const defaultTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    
    daysOfWeek.forEach(day => {
      defaultAvailability[day] = {
        available: true,
        timeSlots: defaultTimeSlots
      };
    });
    
    return defaultAvailability;
  };

  const loadAvailableTimes = (date) => {
    // If doctor has no availability data, generate default time slots
    const availability = doctorData?.availability || generateDefaultAvailability();
    
    // Get day of week for the selected date
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Get doctor's available times for this day
    const dayAvailability = availability[dayOfWeek];
    
    // Generate default time slots if no specific availability
    const defaultTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    const timeSlots = (dayAvailability?.timeSlots || defaultTimeSlots);
    
    // Parse time slots
    const times = timeSlots.map(slot => ({
      time: slot,
      available: true
    }));
    
    console.log(`Available times for ${date}:`, times);
    setAvailableTimes(times);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const listenToAppointmentStatus = (appointmentId) => {
    // Set up real-time listener for appointment status updates
    statusListenerRef.current = NotificationService.subscribeToAppointmentStatus(
      appointmentId,
      (updatedAppointment) => {
        if (updatedAppointment) {
          setAppointmentStatus(updatedAppointment.status);
          
          // Show notification when status changes
          if (updatedAppointment.status === CONSULTATION_STATUS.CONFIRMED) {
            Alert.alert(
              'Appointment Confirmed',
              `Your appointment with ${doctorData?.firstName} ${doctorData?.lastName || 'the doctor'} has been confirmed.`
            );
          } else if (updatedAppointment.status === CONSULTATION_STATUS.CANCELLED) {
            Alert.alert(
              'Appointment Cancelled',
              `Your appointment with ${doctorData?.firstName} ${doctorData?.lastName || 'the doctor'} has been cancelled.`
            );
          }
        }
      }
    );
  };

  const confirmBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Missing Information', 'Please select both date and time for your appointment.');
      return;
    }

    if (!symptoms.trim()) {
      Alert.alert('Missing Information', 'Please describe your symptoms or reason for visit.');
      return;
    }

    setLoading(true);

    try {
      const appointmentData = {
        patientId: user.uid,
        patientName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        patientEmail: user.email,
        doctorId: doctor.id,
        doctorName: `${doctorData?.firstName} ${doctorData?.lastName}`,
        specialization: doctorData?.specialization,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        type: appointmentType,
        symptoms: symptoms.trim(),
        status: CONSULTATION_STATUS.PENDING,
        consultationFee: doctorData?.consultationFee || doctor.consultationFee,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
      const appointmentId = docRef.id;
      
      // Set up real-time status listener
      listenToAppointmentStatus(appointmentId);
      
      // Create notification for the patient
      try {
        await NotificationService.createAppointmentNotification(
          user.uid,
          {
            id: appointmentId,
            ...appointmentData
          },
          'created'
        );
        console.log('Appointment notification created successfully');
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the appointment booking if notification creation fails
      }
      
      // Create notification for the doctor
      try {
        await NotificationService.createAppointmentNotification(
          doctor.id,
          {
            id: appointmentId,
            ...appointmentData
          },
          'created'
        );
        console.log('Doctor appointment notification created successfully');
      } catch (notificationError) {
        console.error('Error creating doctor notification:', notificationError);
      }
      
      // Schedule appointment reminder
      const appointmentDate = new Date(selectedDate);
      // Validate that the date is valid
      if (isNaN(appointmentDate.getTime())) {
        console.error('Invalid appointment date:', selectedDate);
      } else {
        const reminderData = {
          id: appointmentId,
          doctorName: `${doctorData?.firstName} ${doctorData?.lastName}` || 'Doctor',
          date: appointmentDate,
          time: selectedTime,
        };
        
        await pushNotifications.scheduleAppointmentReminder(reminderData);
      }
      
      // Show success message
      Alert.alert(
        'Booking Confirmed',
        `Your appointment with ${doctorData?.firstName} ${doctorData?.lastName || 'the doctor'} has been confirmed for ${formatDate(selectedDate)} at ${selectedTime}. You'll receive a reminder before your appointment.`,
        [
          {
            text: 'View Appointment',
            onPress: () => navigation.navigate('Consultation', { screen: 'Appointments' })
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error confirming booking:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const DateButton = ({ dateItem, selected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.dateButton,
        selected && styles.selectedDate,
        !dateItem.available && styles.unavailableDate,
        { 
          backgroundColor: selected ? theme.PRIMARY : dateItem.available ? theme.CARD_BACKGROUND : theme.GRAY_LIGHT,
          borderColor: selected ? theme.PRIMARY : theme.BORDER
        }
      ]}
      onPress={dateItem.available ? onPress : null}
      disabled={!dateItem.available}
    >
      <Text style={[
        styles.dateText,
        selected && styles.selectedDateText,
        !dateItem.available && styles.unavailableDateText,
        { 
          color: selected ? theme.WHITE : dateItem.available ? theme.TEXT_PRIMARY : theme.GRAY_MEDIUM
        }
      ]}>
        {dateItem.display}
      </Text>
    </TouchableOpacity>
  );

  const TimeButton = ({ timeItem, selected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.timeButton,
        selected && styles.selectedTime,
        !timeItem.available && styles.unavailableTime,
        { 
          backgroundColor: selected ? theme.PRIMARY : timeItem.available ? theme.CARD_BACKGROUND : theme.GRAY_LIGHT,
          borderColor: selected ? theme.PRIMARY : theme.BORDER
        }
      ]}
      onPress={timeItem.available ? onPress : null}
      disabled={!timeItem.available}
    >
      <Text style={[
        styles.timeText,
        selected && styles.selectedTimeText,
        !timeItem.available && styles.unavailableTimeText,
        { 
          color: selected ? theme.WHITE : timeItem.available ? theme.TEXT_PRIMARY : theme.GRAY_MEDIUM
        }
      ]}>
        {timeItem.time}
      </Text>
    </TouchableOpacity>
  );

  const AppointmentTypeButton = ({ type, title, icon, description, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.typeButton, selected && styles.selectedType, { backgroundColor: selected ? theme.PRIMARY + '10' : theme.CARD_BACKGROUND, borderColor: selected ? theme.PRIMARY : theme.BORDER }]}
      onPress={onPress}
    >
      <View style={[styles.typeIcon, selected && styles.selectedTypeIcon, { backgroundColor: selected ? theme.PRIMARY : theme.GRAY_LIGHT }]}>
        <Ionicons name={icon} size={24} color={selected ? theme.WHITE : theme.PRIMARY} />
      </View>
      <View style={styles.typeInfo}>
        <Text style={[styles.typeTitle, selected && styles.selectedTypeTitle, { color: selected ? theme.PRIMARY : theme.TEXT_PRIMARY }]}>{title}</Text>
        <Text style={[styles.typeDescription, selected && styles.selectedTypeDescription, { color: selected ? theme.TEXT_PRIMARY : theme.TEXT_SECONDARY }]}>
          {description}
        </Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={24} color={theme.PRIMARY} />
      )}
    </TouchableOpacity>
  );

  // Show loading state while fetching doctor data
  if (!doctorData && doctor?.id) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.ERROR }]}>Loading doctor information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
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
        {/* Doctor Info */}
        <Card style={[styles.doctorCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <View style={styles.doctorInfo}>
            <View style={[styles.doctorAvatar, { backgroundColor: theme.PRIMARY }]}>
              <Ionicons name="person" size={32} color={theme.WHITE} />
            </View>
            <View style={styles.doctorDetails}>
              <Text style={[styles.doctorName, { color: theme.TEXT_PRIMARY }]}>
                {doctorData ? `${doctorData.firstName} ${doctorData.lastName}` : doctor.name}
              </Text>
              <Text style={[styles.doctorSpecialization, { color: theme.TEXT_SECONDARY }]}>
                {doctorData?.specialization || doctor.specialization}
              </Text>
              <View style={styles.consultationFee}>
                <Ionicons name="card" size={16} color={theme.SUCCESS} />
                <Text style={[styles.feeText, { color: theme.SUCCESS }]}>
                  Consultation: LKR {doctorData?.consultationFee || doctor.consultationFee}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Appointment Status */}
        {appointmentStatus && (
          <Card style={[styles.statusCard, { backgroundColor: theme.GRAY_LIGHT, borderColor: theme.BORDER }]}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={
                  appointmentStatus === CONSULTATION_STATUS.CONFIRMED ? 'checkmark-circle' :
                  appointmentStatus === CONSULTATION_STATUS.CANCELLED ? 'close-circle' :
                  'time'
                } 
                size={24} 
                color={
                  appointmentStatus === CONSULTATION_STATUS.CONFIRMED ? theme.SUCCESS :
                  appointmentStatus === CONSULTATION_STATUS.CANCELLED ? theme.ERROR :
                  theme.WARNING
                } 
              />
              <Text style={[styles.statusTitle, { color: theme.TEXT_PRIMARY }]}>
                {appointmentStatus === CONSULTATION_STATUS.CONFIRMED ? 'Confirmed' :
                 appointmentStatus === CONSULTATION_STATUS.CANCELLED ? 'Cancelled' :
                 'Pending Confirmation'}
              </Text>
            </View>
            <Text style={[styles.statusText, { color: theme.TEXT_SECONDARY }]}>
              {appointmentStatus === CONSULTATION_STATUS.CONFIRMED ? 'Your appointment has been confirmed.' :
               appointmentStatus === CONSULTATION_STATUS.CANCELLED ? 'Your appointment has been cancelled.' :
               'Your appointment is pending confirmation from the doctor.'}
            </Text>
          </Card>
        )}

        {/* Appointment Type */}
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Select Consultation Type</Text>
          
          <AppointmentTypeButton
            type="video"
            title="Video Consultation"
            icon="videocam"
            description="Face-to-face consultation via video call"
            selected={appointmentType === 'video'}
            onPress={() => setAppointmentType('video')}
          />
          
          <AppointmentTypeButton
            type="chat"
            title="Chat Consultation"
            icon="chatbubble"
            description="Text-based consultation via messaging"
            selected={appointmentType === 'chat'}
            onPress={() => setAppointmentType('chat')}
          />
          
          <AppointmentTypeButton
            type="in-person"
            title="In-Person Visit"
            icon="location"
            description="Visit the clinic for physical examination"
            selected={appointmentType === 'in-person'}
            onPress={() => setAppointmentType('in-person')}
          />
        </Card>

        {/* Date Selection */}
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {availableDates.map((dateItem) => (
              <DateButton
                key={dateItem.date}
                dateItem={dateItem}
                selected={selectedDate === dateItem.date}
                onPress={() => setSelectedDate(dateItem.date)}
              />
            ))}
          </ScrollView>
        </Card>

        {/* Time Selection */}
        {selectedDate && (
          <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Select Time</Text>
            <View style={styles.timeGrid}>
              {availableTimes.length > 0 ? (
                availableTimes.map((timeItem) => (
                  <TimeButton
                    key={timeItem.time}
                    timeItem={timeItem}
                    selected={selectedTime === timeItem.time}
                    onPress={() => setSelectedTime(timeItem.time)}
                  />
                ))
              ) : (
                <Text style={[styles.noTimesText, { color: theme.TEXT_SECONDARY }]}>No available times for this date</Text>
              )}
            </View>
          </Card>
        )}

        {/* Symptoms/Reason */}
        <Card style={[styles.section, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Describe Your Symptoms</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.TEXT_SECONDARY }]}>
            Please provide details about your health concerns or reason for consultation
          </Text>
          <TextInput
            style={[styles.symptomsInput, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER, color: theme.TEXT_PRIMARY }]}
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Describe your symptoms, concerns, or reason for visit..."
            placeholderTextColor={theme.TEXT_SECONDARY}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        {/* Booking Summary */}
        {selectedDate && selectedTime && (
          <Card style={[styles.summaryCard, { backgroundColor: theme.PRIMARY + '10', borderColor: theme.BORDER }]}>
            <Text style={[styles.summaryTitle, { color: theme.PRIMARY }]}>Appointment Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Doctor:</Text>
              <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>
                {doctorData ? `${doctorData.firstName} ${doctorData.lastName}` : doctor.name}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Date:</Text>
              <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>{formatDate(selectedDate)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Time:</Text>
              <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>{selectedTime}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Type:</Text>
              <Text style={[styles.summaryValue, { color: theme.TEXT_PRIMARY }]}>
                {appointmentType === 'video' ? 'Video Call' : 
                 appointmentType === 'chat' ? 'Chat' : 'In-Person'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.TEXT_SECONDARY }]}>Fee:</Text>
              <Text style={[styles.summaryValue, styles.feeAmount, { color: theme.SUCCESS }]}>
                LKR {doctorData?.consultationFee || doctor.consultationFee}
              </Text>
            </View>
          </Card>
        )}

        {/* Book Button */}
        <Button
          title={loading ? "Booking..." : "Book Appointment"}
          onPress={confirmBooking}
          style={styles.bookButton}
          disabled={loading || !selectedDate || !selectedTime || !symptoms.trim()}
        />
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
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  backButton: {
    padding: SPACING.SM,
  },
  headerTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  content: {
    flex: 1,
    padding: SPACING.MD,
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
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  doctorSpecialization: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
  },
  statusCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.BUTTON_SECONDARY,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  statusTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginLeft: 36, // Align with status title
  },
  section: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 2,
    borderColor: theme.BORDER,
    marginBottom: SPACING.SM,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  selectedType: {
    borderColor: theme.PRIMARY,
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.BUTTON_SECONDARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  selectedTypeIcon: {
    backgroundColor: theme.PRIMARY,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  selectedTypeTitle: {
    color: theme.PRIMARY,
  },
  typeDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  selectedTypeDescription: {
    color: theme.TEXT_PRIMARY,
  },
  dateScroll: {
    marginBottom: SPACING.SM,
  },
  dateButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
    marginRight: SPACING.SM,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: theme.CARD_BACKGROUND,
  },
  selectedDate: {
    backgroundColor: theme.PRIMARY,
    borderColor: theme.PRIMARY,
  },
  unavailableDate: {
    backgroundColor: theme.BUTTON_SECONDARY,
    opacity: 0.5,
  },
  dateText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
  },
  selectedDateText: {
    color: theme.WHITE,
  },
  unavailableDateText: {
    color: theme.TEXT_SECONDARY,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
    marginRight: SPACING.SM,
    marginBottom: SPACING.SM,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: theme.CARD_BACKGROUND,
  },
  selectedTime: {
    backgroundColor: theme.PRIMARY,
    borderColor: theme.PRIMARY,
  },
  unavailableTime: {
    backgroundColor: theme.BUTTON_SECONDARY,
    opacity: 0.5,
  },
  timeText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
  },
  selectedTimeText: {
    color: theme.WHITE,
  },
  unavailableTimeText: {
    color: theme.TEXT_SECONDARY,
  },
  symptomsInput: {
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    minHeight: 100,
    backgroundColor: theme.INPUT_BACKGROUND,
  },
  summaryCard: {
    backgroundColor: theme.PRIMARY + '10',
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.PRIMARY,
    marginBottom: SPACING.MD,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    fontWeight: '600',
  },
  feeAmount: {
    color: theme.SUCCESS,
    fontSize: FONT_SIZES.LG,
  },
  bookButton: {
    marginBottom: SPACING.XL,
  },
});

export default BookingScreen;