import { Alert } from 'react-native';
import { doc, updateDoc, onSnapshot, getDoc, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import NotificationService from './notificationService';

class VideoCallNotificationService {
  constructor() {
    this.activeCallListeners = new Map();
    this.incomingCallListener = null;
    this.currentUserId = null;
  }

  // Initialize video call notifications for a user
  async initializeForUser(userId, userRole, navigation) {
    this.currentUserId = userId;
    this.userRole = userRole;
    this.navigation = navigation;
    
    // Listen for incoming video calls
    this.setupIncomingCallListener();
  }

  // Setup listener for incoming video calls
  setupIncomingCallListener() {
    if (!this.currentUserId) return;

    // Listen to appointments where this user is involved and status changes to ongoing
    const appointmentsRef = collection(db, 'appointments');
    const userField = this.userRole === 'doctor' ? 'doctorId' : 'patientId';
    
    this.incomingCallListener = onSnapshot(
      query(appointmentsRef, where(userField, '==', this.currentUserId)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const data = change.doc.data();
            const appointmentId = change.doc.id;
            
            // Check if appointment status changed to ongoing and type is video
            if (data.status === 'ongoing' && 
                data.type === 'video' && 
                !this.activeCallListeners.has(appointmentId)) {
              
              this.handleIncomingVideoCall(appointmentId, data);
            }
          }
        });
      }
    );
  }

  // Handle incoming video call
  async handleIncomingVideoCall(appointmentId, appointmentData) {
    try {
      // Determine if this user should receive the incoming call notification
      const isReceiver = this.userRole === 'patient' || 
                        (this.userRole === 'doctor' && appointmentData.status === 'ongoing');
      
      if (!isReceiver) return;

      const callerName = this.userRole === 'patient' ? 
                        appointmentData.doctorName : 
                        appointmentData.patientName;
      
      // Show incoming call notification
      this.showIncomingCallAlert(appointmentId, appointmentData, callerName);
      
      // Send push notification if app is in background
      await this.sendIncomingCallNotification(appointmentData, callerName);
      
    } catch (error) {
      console.error('Error handling incoming video call:', error);
    }
  }

  // Show incoming call alert
  showIncomingCallAlert(appointmentId, appointmentData, callerName) {
    Alert.alert(
      'Incoming Video Call',
      `${callerName} is calling you for a video consultation`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => this.declineCall(appointmentId)
        },
        {
          text: 'Answer',
          onPress: () => this.answerCall(appointmentId, appointmentData)
        }
      ],
      { 
        cancelable: false,
        onDismiss: () => this.declineCall(appointmentId)
      }
    );
  }

  // Answer incoming call
  answerCall(appointmentId, appointmentData) {
    if (this.navigation) {
      this.navigation.navigate('VideoCall', {
        consultationId: appointmentId,
        appointmentId: appointmentId,
        patientId: appointmentData.patientId,
        patientName: appointmentData.patientName,
        doctorId: appointmentData.doctorId,
        doctorName: appointmentData.doctorName,
        isInitiator: false // Receiver joins the call
      });
    }
  }

  // Decline incoming call
  async declineCall(appointmentId) {
    try {
      // Update appointment status back to confirmed
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'confirmed',
        callDeclined: true,
        declinedAt: new Date()
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }
  }

  // Send push notification for incoming call
  async sendIncomingCallNotification(appointmentData, callerName) {
    try {
      const receiverId = this.userRole === 'patient' ? 
                        appointmentData.patientId : 
                        appointmentData.doctorId;
      
      await NotificationService.createNotification(
        receiverId,
        {
          title: 'Incoming Video Call',
          message: `${callerName} is calling you for a video consultation`,
          type: 'incoming_video_call',
          data: {
            appointmentId: appointmentData.id,
            type: 'video_call',
            callerName: callerName,
            callerId: this.userRole === 'patient' ? appointmentData.doctorId : appointmentData.patientId
          }
        }
      );
    } catch (error) {
      console.error('Error sending incoming call notification:', error);
    }
  }

  // Monitor active video call status
  monitorCallStatus(callId, onCallEnded) {
    if (this.activeCallListeners.has(callId)) return;

    const callDoc = doc(db, 'videoCalls', callId);
    const listener = onSnapshot(callDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'ended') {
          onCallEnded();
          this.stopMonitoringCall(callId);
        }
      }
    });

    this.activeCallListeners.set(callId, listener);
  }

  // Stop monitoring a specific call
  stopMonitoringCall(callId) {
    const listener = this.activeCallListeners.get(callId);
    if (listener) {
      listener();
      this.activeCallListeners.delete(callId);
    }
  }

  // Notify about call connection status
  async notifyCallStatus(appointmentId, status, message) {
    try {
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      if (!appointmentDoc.exists()) return;

      const appointmentData = appointmentDoc.data();
      const receiverId = this.userRole === 'patient' ? 
                        appointmentData.doctorId : 
                        appointmentData.patientId;

      await NotificationService.createNotification(
        receiverId,
        'call_status',
        'Call Status Update',
        message,
        {
          appointmentId,
          status,
          type: 'call_status'
        }
      );
    } catch (error) {
      console.error('Error notifying call status:', error);
    }
  }

  // Clean up all listeners
  cleanup() {
    // Remove incoming call listener
    if (this.incomingCallListener) {
      this.incomingCallListener();
      this.incomingCallListener = null;
    }

    // Remove all active call listeners
    this.activeCallListeners.forEach((listener, callId) => {
      listener();
    });
    this.activeCallListeners.clear();

    // Clear user data
    this.currentUserId = null;
    this.userRole = null;
    this.navigation = null;
  }
}

// Create singleton instance
const videoCallNotificationService = new VideoCallNotificationService();

export default videoCallNotificationService;