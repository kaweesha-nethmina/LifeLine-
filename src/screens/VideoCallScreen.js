import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
// Conditional import for RTCView
import { useAuth } from '../context/AuthContext';
import webRTCService from '../services/webrtcService';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';

// Conditional import for RTCView to avoid issues in Expo Go
let RTCView;
try {
  if (Platform.OS !== 'web') {
    const webrtc = require('react-native-webrtc');
    RTCView = webrtc.RTCView;
  }
} catch (error) {
  console.log('RTCView not available in this environment');
  RTCView = null;
}

const { width, height } = Dimensions.get('window');

const VideoCallScreen = ({ navigation, route }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { 
    appointmentId, 
    consultationId,
    patientId, 
    patientName, 
    doctorId, 
    doctorName,
    isInitiator = false 
  } = route.params || {};
  
  // Check if WebRTC is available
  const isWebRTCAvailable = !!RTCView && !webRTCService.isMockMode;
  
  const [callState, setCallState] = useState(isWebRTCAvailable ? 'initializing' : 'failed'); // initializing, calling, connecting, connected, ended, failed
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, fair, poor
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(isWebRTCAvailable ? null : 'Video calling is not available in Expo Go. Please use a development build.');
  
  const callTimer = useRef(null);
  const callId = consultationId || appointmentId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    // Show alert if WebRTC is not available
    if (!isWebRTCAvailable) {
      Alert.alert(
        'Video Call Not Available',
        'Video calling requires a development build. Please run:\n\nnpx expo run:ios\nor\nnpx expo run:android',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
            style: 'default'
          }
        ]
      );
    } else {
      initializeCall();
    }
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Check if WebRTC is available before initializing
      if (!isWebRTCAvailable) {
        setCallState('failed');
        setError('Video calling is not available in this environment. Please use a development build.');
        return;
      }
      
      setCallState('calling');
      
      if (isInitiator) {
        // Start new call
        await webRTCService.startCall(callId, true);
      } else {
        // Join existing call
        await webRTCService.joinCall(callId);
      }
      
      // Get streams
      const localStr = webRTCService.getLocalStream();
      setLocalStream(localStr);
      
      // Set up remote stream listener
      const checkRemoteStream = setInterval(() => {
        const remoteStr = webRTCService.getRemoteStream();
        if (remoteStr) {
          setRemoteStream(remoteStr);
          setCallState('connected');
          startCallTimer();
          clearInterval(checkRemoteStream);
        }
      }, 1000);
      
      // Set connection timeout
      setTimeout(() => {
        if (callState !== 'connected') {
          clearInterval(checkRemoteStream);
          setCallState('failed');
          setError('Connection timeout');
        }
      }, 30000); // 30 seconds timeout
      
      setCallState('connecting');
    } catch (error) {
      console.error('Error initializing call:', error);
      setCallState('failed');
      setError(error.message || 'Failed to initialize call');
    }
  };

  const cleanup = async () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
    }
    
    try {
      await webRTCService.endCall();
      webRTCService.cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end the video call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            setCallState('ended');
            await cleanup();
            // Navigate back after a brief delay
            setTimeout(() => {
              navigation.goBack();
            }, 2000);
          }
        }
      ]
    );
  };

  const toggleMute = async () => {
    try {
      const muted = webRTCService.toggleMute();
      setIsMuted(muted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleVideo = async () => {
    try {
      const videoOff = webRTCService.toggleVideo();
      setIsVideoOn(!videoOff);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const switchCamera = async () => {
    try {
      await webRTCService.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  const handleChat = () => {
    // Navigate to chat while keeping call active (picture-in-picture mode)
    navigation.navigate('Chat', {
      appointmentId: appointmentId,
      doctorId: doctorId,
      doctorName: doctorName,
      patientId: patientId,
      patientName: patientName,
      isVideoCallActive: true
    });
  };

  const getConnectionQualityIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return 'wifi';
      case 'fair':
        return 'wifi-outline';
      case 'poor':
        return 'warning';
      default:
        return 'wifi';
    }
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'good':
        return COLORS.SUCCESS;
      case 'fair':
        return COLORS.WARNING;
      case 'poor':
        return COLORS.ERROR;
      default:
        return COLORS.SUCCESS;
    }
  };

  if (!isWebRTCAvailable) {
    return (
      <SafeAreaView style={styles.endedContainer}>
        <View style={styles.endedContent}>
          <Ionicons name="videocam-off" size={64} color={COLORS.WARNING} />
          <Text style={styles.endedTitle}>Video Call Not Available</Text>
          <Text style={styles.endedSubtitle}>
            Video calling requires a development build
          </Text>
          <Text style={styles.endedMessage}>
            To use video calling features:{'\n\n'}
            1. Create a development build:{'\n'}
            {'   '}npx expo run:ios{'\n'}
            {'   '}or{'\n'}
            {'   '}npx expo run:android{'\n\n'}
            2. Install the build on your device
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (callState === 'failed') {
    return (
      <SafeAreaView style={styles.endedContainer}>
        <View style={styles.endedContent}>
          <Ionicons name="warning" size={64} color={COLORS.ERROR} />
          <Text style={styles.endedTitle}>Call Failed</Text>
          <Text style={styles.endedSubtitle}>
            {error || 'Unable to connect to the call'}
          </Text>
          {!isWebRTCAvailable && (
            <Text style={styles.endedMessage}>
              Video calling requires a development build. Please run:
              {'\n\n'}npx expo run:ios{'\n'}or{'\n'}npx expo run:android
            </Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setCallState('initializing');
              setError(null);
              initializeCall();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (callState === 'ended') {
    return (
      <SafeAreaView style={styles.endedContainer}>
        <View style={styles.endedContent}>
          <Ionicons name="call" size={64} color={COLORS.SUCCESS} />
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.endedSubtitle}>
            Duration: {formatDuration(callDuration)}
          </Text>
          <Text style={styles.endedMessage}>
            Thank you for using LifeLine+ video consultation
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {patientName || doctorName || 'Participant'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={styles.connectionIndicator}>
              <Ionicons 
                name={getConnectionQualityIcon()} 
                size={16} 
                color={getConnectionQualityColor()} 
              />
              <Text style={[styles.connectionText, { color: getConnectionQualityColor() }]}>
                {connectionQuality}
              </Text>
            </View>
            {callState === 'connected' && (
              <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={() => Alert.alert('Feature Coming Soon', 'Picture-in-picture mode will be available soon.')}
        >
          <Ionicons name="contract-outline" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Video Area */}
      <View style={styles.videoContainer}>
        {(callState === 'initializing' || callState === 'calling' || callState === 'connecting') ? (
          <View style={styles.connectingContainer}>
            <View style={styles.participantAvatar}>
              <Text style={styles.avatarText}>
                {(patientName || doctorName || 'P').charAt(0)}
              </Text>
            </View>
            <Text style={styles.connectingText}>
              {callState === 'initializing' ? 'Initializing...' :
               callState === 'calling' ? 'Calling...' : 'Connecting...'}
            </Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        ) : (
          <>
            {/* Main Video Feed (Remote Stream) */}
            <View style={styles.mainVideo}>
              {remoteStream && isVideoOn ? (
                <RTCView
                  style={styles.remoteVideo}
                  streamURL={remoteStream.toURL()}
                  objectFit="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="person" size={80} color={COLORS.GRAY_MEDIUM} />
                  <Text style={styles.videoPlaceholderText}>
                    {patientName || doctorName || 'Participant'}
                  </Text>
                  {!isVideoOn && (
                    <Text style={styles.videoOffText}>Camera is off</Text>
                  )}
                </View>
              )}
            </View>

            {/* Self Video (Picture-in-Picture) */}
            <View style={styles.selfVideo}>
              {localStream && isVideoOn ? (
                <RTCView
                  style={styles.localVideo}
                  streamURL={localStream.toURL()}
                  objectFit="cover"
                  mirror={isFrontCamera}
                />
              ) : (
                <View style={styles.selfVideoPlaceholder}>
                  {isVideoOn ? (
                    <Text style={styles.selfVideoText}>You</Text>
                  ) : (
                    <Ionicons name="videocam-off" size={20} color={COLORS.WHITE} />
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons 
              name={isMuted ? 'mic-off' : 'mic'} 
              size={24} 
              color={isMuted ? COLORS.ERROR : COLORS.WHITE} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            <Ionicons 
              name={isVideoOn ? 'videocam' : 'videocam-off'} 
              size={24} 
              color={!isVideoOn ? COLORS.ERROR : COLORS.WHITE} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
          >
            <Ionicons name="camera-reverse" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleChat}
          >
            <Ionicons name="chatbubble" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => Alert.alert('Feature Coming Soon', 'Screen sharing will be available soon.')}
          >
            <Ionicons name="desktop" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={28} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Emergency Button */}
      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={() => Alert.alert('Emergency', 'Emergency services will be contacted immediately.')}
      >
        <Ionicons name="warning" size={20} color={COLORS.WHITE} />
        <Text style={styles.emergencyText}>Emergency</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BLACK,
  },
  endedContainer: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedContent: {
    alignItems: 'center',
  },
  endedTitle: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  endedSubtitle: {
    fontSize: FONT_SIZES.LG,
    color: theme.PRIMARY,
    marginBottom: SPACING.SM,
  },
  endedMessage: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.WHITE,
    marginBottom: SPACING.XS / 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  connectionText: {
    fontSize: FONT_SIZES.SM,
    marginLeft: SPACING.XS / 2,
    fontWeight: '500',
    color: theme.WHITE,
  },
  duration: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: '500',
  },
  minimizeButton: {
    padding: SPACING.SM,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  avatarText: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.WHITE,
  },
  connectingText: {
    fontSize: FONT_SIZES.LG,
    color: theme.WHITE,
    marginBottom: SPACING.MD,
  },
  loadingDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.PRIMARY,
    marginHorizontal: SPACING.XS / 2,
  },
  mainVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: FONT_SIZES.LG,
    color: theme.WHITE,
    marginTop: SPACING.MD,
  },
  videoOff: {
    alignItems: 'center',
  },
  videoOffText: {
    fontSize: FONT_SIZES.MD,
    color: theme.WHITE,
    marginTop: SPACING.SM,
  },
  selfVideo: {
    position: 'absolute',
    top: SPACING.LG,
    right: SPACING.MD,
    width: 120,
    height: 160,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: theme.GRAY_DARK,
    overflow: 'hidden',
  },
  selfVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.PRIMARY,
  },
  selfVideoText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: '500',
  },
  selfVideoOff: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.GRAY_DARK,
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  retryButton: {
    backgroundColor: theme.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.LG,
  },
  retryButtonText: {
    color: theme.WHITE,
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: theme.GRAY_MEDIUM,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.MD,
  },
  backButtonText: {
    color: theme.WHITE,
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
  },
  controlPanel: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.LG,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: SPACING.LG,
    width: '100%',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: theme.ERROR,
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButton: {
    position: 'absolute',
    top: height * 0.15,
    left: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.EMERGENCY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
  },
  emergencyText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
});

export default VideoCallScreen;