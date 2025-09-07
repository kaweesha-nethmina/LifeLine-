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
      color: COLORS.PRIMARY,
      onPress: () => navigation.navigate('DoctorList'),
      show: isPatient
    },
    {
      title: 'My Appointments',
      subtitle: 'View upcoming appointments',
      icon: 'calendar',
      color: COLORS.INFO,
      onPress: () => navigation.navigate('PatientAppointments'),
      show: isPatient
    },
    {
      title: 'Telemedicine Tools',
      subtitle: 'Advanced remote monitoring',
      icon: 'pulse',
      color: COLORS.SUCCESS,
      onPress: () => navigation.navigate('Telemedicine'),
      show: isPatient
    },
    {
      title: 'Chat with Doctor',
      subtitle: 'Send messages to your doctor',
      icon: 'chatbubble',
      color: COLORS.ACCENT,
      onPress: () => navigation.navigate('DoctorList', { chatMode: true }),
      show: isPatient
    },
    {
      title: 'Video Consultation',
      subtitle: 'Real-time video appointments',
      icon: 'videocam',
      color: COLORS.SECONDARY,
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
        <Card style={styles.optionCard}>
          <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
            <Ionicons name={option.icon} size={32} color={option.color} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.GRAY_MEDIUM} />
        </Card>
      </TouchableOpacity>
    );
  };

  const AppointmentCard = ({ appointment }) => (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.appointmentTitle}>{appointment.doctorName}</Text>
        <View style={styles.appointmentStatus}>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: 
                appointment.status === CONSULTATION_STATUS.CONFIRMED ? COLORS.WARNING :
                appointment.status === CONSULTATION_STATUS.ONGOING ? COLORS.SUCCESS :
                COLORS.GRAY_MEDIUM
            }
          ]}>
            <Text style={styles.statusText}>
              {appointment.status.replace('_', ' ').charAt(0).toUpperCase() + appointment.status.replace('_', ' ').slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.appointmentSubtitle}>
        {appointment.specialization}
      </Text>
      <Text style={styles.appointmentDate}>
        {appointment.appointmentDate} at {appointment.appointmentTime}
      </Text>
      <View style={styles.appointmentActions}>
        {appointment.status === CONSULTATION_STATUS.ONGOING && (
          <TouchableOpacity
            style={styles.joinButton}
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
            <Text style={styles.joinButtonText}>Join Now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => Alert.alert('Appointment Details', 'View appointment details here')}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const upcomingAppointments = getUpcomingAppointments();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Consultations</Text>
            <Text style={styles.subtitle}>
              Book appointments and connect with healthcare providers
            </Text>
          </View>

          {/* Consultation Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consultation Options</Text>
            <View style={styles.optionsGrid}>
              {consultationOptions.map(renderConsultationOption)}
            </View>
          </View>

          {/* Upcoming Appointments */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PatientAppointments')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 3).map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <Card style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentTitle}>No Upcoming Appointments</Text>
                </View>
                <Text style={styles.appointmentSubtitle}>
                  You don't have any upcoming appointments. Book one now to get started.
                </Text>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => navigation.navigate('DoctorList')}
                >
                  <Text style={styles.bookButtonText}>Book Appointment</Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>

          {/* Health Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Tips</Text>
            <Card variant="primary" style={styles.healthTipCard}>
              <View style={styles.healthTipContent}>
                <Ionicons name="bulb" size={24} color={COLORS.PRIMARY} />
                <View style={styles.healthTipText}>
                  <Text style={styles.healthTipTitle}>Preparing for Your Consultation</Text>
                  <Text style={styles.healthTipDescription}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
  },
  header: {
    marginBottom: SPACING.LG,
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
  section: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
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
    color: COLORS.TEXT_PRIMARY,
  },
  optionSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
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
  appointmentCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
    color: COLORS.TEXT_PRIMARY,
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
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  appointmentSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  appointmentDate: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinButton: {
    backgroundColor: COLORS.SUCCESS,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginRight: SPACING.SM,
  },
  joinButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  detailsButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  healthTipCard: {
    padding: SPACING.MD,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  healthTipDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ConsultationScreen;