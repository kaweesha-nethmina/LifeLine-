import React, { useState, useEffect, useRef } from 'react';
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
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  CONSULTATION_STATUS
} from '../constants';
import Card from '../components/Card';

const ConsultationScreen = ({ navigation }) => {
  const { userProfile, isPatient } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [appointments, setAppointments] = useState([]);
  const appointmentsListenerRef = useRef(null);

  useEffect(() => {
    loadAppointments();
    return () => {
      // Clean up listener when component unmounts
      if (appointmentsListenerRef.current) {
        appointmentsListenerRef.current();
      }
    };
  }, []);

  const loadAppointments = async () => {
    try {
      if (!userProfile?.uid) return;
      
      // Set up real-time listener for patient's appointments
      // Using in-memory sorting to avoid composite index requirement
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', userProfile.uid)
        // Removed orderBy('appointmentDate', 'asc') to avoid composite index
      );
      
      appointmentsListenerRef.current = onSnapshot(appointmentsQuery, (snapshot) => {
        const appointmentsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Handle timestamp conversion properly
          const createdAt = data.createdAt ? 
            (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : data.createdAt) : 
            new Date();
          const updatedAt = data.updatedAt ? 
            (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt) : 
            new Date();
          
          appointmentsData.push({
            id: doc.id,
            ...data,
            createdAt,
            updatedAt
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        appointmentsData.sort((a, b) => {
          const dateA = new Date(a.appointmentDate);
          const dateB = new Date(b.appointmentDate);
          return dateA - dateB;
        });
        
        setAppointments(appointmentsData);
      }, (error) => {
        console.error('Error listening to appointments:', error);
      });
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const getUpcomingAppointments = () => {
    return appointments.filter(appointment => 
      [CONSULTATION_STATUS.CONFIRMED, CONSULTATION_STATUS.ONGOING].includes(appointment.status)
    );
  };

  const consultationOptions = [
    {
      title: 'Find a Doctor',
      subtitle: 'Browse and book appointments',
      icon: 'search',
      color: theme.PRIMARY, // Use theme color
      onPress: () => navigation.navigate('DoctorList'),
      show: isPatient
    },
    {
      title: 'My Appointments',
      subtitle: 'View upcoming appointments',
      icon: 'calendar',
      color: theme.INFO, // Use theme color
      onPress: () => navigation.navigate('PatientAppointments'),
      show: isPatient
    },
    {
      title: 'Telemedicine Tools',
      subtitle: 'Advanced remote monitoring',
      icon: 'pulse',
      color: theme.SUCCESS, // Use theme color
      onPress: () => navigation.navigate('Telemedicine'),
      show: isPatient
    },
    {
      title: 'Chat with Doctor',
      subtitle: 'Send messages to your doctor',
      icon: 'chatbubble',
      color: theme.ACCENT, // Use theme color
      onPress: () => navigation.navigate('DoctorList', { chatMode: true }),
      show: isPatient
    },
    {
      title: 'Video Consultation',
      subtitle: 'Real-time video appointments',
      icon: 'videocam',
      color: theme.SECONDARY, // Use theme color
      onPress: () => {
        // Check if there's an active video appointment
        const activeVideoAppointment = getUpcomingAppointments().find(
          app => app.type === 'video' && app.status === CONSULTATION_STATUS.ONGOING
        );
        
        if (activeVideoAppointment) {
          navigation.navigate('VideoCall', {
            consultationId: activeVideoAppointment.id,
            appointmentId: activeVideoAppointment.id,
            doctorId: activeVideoAppointment.doctorId,
            doctorName: activeVideoAppointment.doctorName,
            patientId: activeVideoAppointment.patientId,
            patientName: activeVideoAppointment.patientName,
            isInitiator: false
          });
        } else {
          Alert.alert(
            'No Active Video Consultation',
            'You don\'t have any active video consultations. Please book an appointment first.',
            [
              { text: 'OK' },
              { text: 'Book Appointment', onPress: () => navigation.navigate('DoctorList') }
            ]
          );
        }
      },
      show: isPatient
    }
  ];

  const renderConsultationOption = (option) => {
    if (!option.show) return null;
    
    return (
      <TouchableOpacity
        key={option.title}
        style={styles.optionContainer}
        onPress={option.onPress}
      >
        <Card style={[styles.optionCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
            <Ionicons name={option.icon} size={32} color={option.color} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.TEXT_PRIMARY }]}>{option.title}</Text>
            <Text style={[styles.optionSubtitle, { color: theme.TEXT_SECONDARY }]}>{option.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.GRAY_MEDIUM} />
        </Card>
      </TouchableOpacity>
    );
  };

  const AppointmentCard = ({ appointment }) => (
    <Card style={[styles.appointmentCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.appointmentHeader}>
        <Text style={[styles.appointmentTitle, { color: theme.TEXT_PRIMARY }]}>{appointment.doctorName}</Text>
        <View style={styles.appointmentStatus}>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: 
                appointment.status === CONSULTATION_STATUS.CONFIRMED ? theme.WARNING :
                appointment.status === CONSULTATION_STATUS.ONGOING ? theme.SUCCESS :
                theme.GRAY_MEDIUM
            }
          ]}>
            <Text style={styles.statusText}>
              {appointment.status.replace('_', ' ').charAt(0).toUpperCase() + appointment.status.replace('_', ' ').slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.appointmentSubtitle, { color: theme.TEXT_SECONDARY }]}>
        {appointment.specialization}
      </Text>
      <Text style={[styles.appointmentDate, { color: theme.PRIMARY }]}>
        {appointment.appointmentDate} at {appointment.appointmentTime}
      </Text>
      <View style={styles.appointmentActions}>
        {appointment.status === CONSULTATION_STATUS.ONGOING && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: theme.SUCCESS }]}
            onPress={() => {
              if (appointment.type === 'video') {
                navigation.navigate('VideoCall', {
                  consultationId: appointment.id,
                  appointmentId: appointment.id,
                  doctorId: appointment.doctorId,
                  doctorName: appointment.doctorName,
                  patientId: appointment.patientId,
                  patientName: appointment.patientName,
                  isInitiator: false // Patient joins the call initiated by doctor
                });
              } else if (appointment.type === 'chat') {
                navigation.navigate('Chat', {
                  appointmentId: appointment.id,
                  doctorId: appointment.doctorId,
                  doctorName: appointment.doctorName,
                  patientId: appointment.patientId,
                  patientName: appointment.patientName
                });
              }
            }}
          >
            <Text style={[styles.joinButtonText, { color: theme.WHITE }]}>Join Now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.detailsButton, { backgroundColor: theme.GRAY_LIGHT }]}
          onPress={() => Alert.alert('Appointment Details', 'View appointment details here')}
        >
          <Text style={[styles.detailsButtonText, { color: theme.TEXT_PRIMARY }]}>View Details</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const upcomingAppointments = getUpcomingAppointments();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Consultations</Text>
            <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>
              Book appointments and connect with healthcare providers
            </Text>
          </View>

          {/* Consultation Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Consultation Options</Text>
            <View style={styles.optionsGrid}>
              {consultationOptions.map(renderConsultationOption)}
            </View>
          </View>

          {/* Upcoming Appointments */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Upcoming Appointments</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PatientAppointments')}>
                <Text style={[styles.seeAllText, { color: theme.PRIMARY }]}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 3).map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <Card style={[styles.appointmentCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
                <View style={styles.appointmentHeader}>
                  <Text style={[styles.appointmentTitle, { color: theme.TEXT_PRIMARY }]}>No Upcoming Appointments</Text>
                </View>
                <Text style={[styles.appointmentSubtitle, { color: theme.TEXT_SECONDARY }]}>
                  You don't have any upcoming appointments. Book one now to get started.
                </Text>
                <TouchableOpacity
                  style={[styles.bookButton, { backgroundColor: theme.PRIMARY }]}
                  onPress={() => navigation.navigate('DoctorList')}
                >
                  <Text style={[styles.bookButtonText, { color: theme.WHITE }]}>Book Appointment</Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>

          {/* Health Tips */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Health Tips</Text>
            <Card variant="primary" style={[styles.healthTipCard, { backgroundColor: theme.CARD_BACKGROUND }]}>
              <View style={styles.healthTipContent}>
                <Ionicons name="bulb" size={24} color={theme.PRIMARY} />
                <View style={styles.healthTipText}>
                  <Text style={[styles.healthTipTitle, { color: theme.TEXT_PRIMARY }]}>Preparing for Your Consultation</Text>
                  <Text style={[styles.healthTipDescription, { color: theme.TEXT_SECONDARY }]}>
                    Before your appointment, write down any symptoms you're experiencing, 
                    list all medications you're taking, and prepare questions for your doctor.
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
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  section: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionContainer: {
    width: '48%',
    marginBottom: SPACING.MD,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  optionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  optionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  seeAllText: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  appointmentTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  appointmentStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: '600',
  },
  appointmentSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  appointmentDate: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinButton: {
    backgroundColor: theme.SUCCESS,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginRight: SPACING.SM,
  },
  joinButtonText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: theme.BUTTON_SECONDARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  detailsButtonText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: theme.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: '600',
  },
  healthTipCard: {
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  healthTipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthTipText: {
    marginLeft: SPACING.MD,
  },
  healthTipTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  healthTipDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
});

export default ConsultationScreen;