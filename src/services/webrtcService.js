// WebRTC Service with Expo Go compatibility
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  deleteDoc,
  getDoc 
} from 'firebase/firestore';

// Check if we're running in Expo Go or a development build
const isExpoGo = () => {
  // More robust check for Expo Go environment
  return Constants && Constants.appOwnership === 'expo';
};

// Dynamic import for WebRTC (only in development builds)
let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices;

if (!isExpoGo()) {
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    mediaDevices = webrtc.mediaDevices;
    console.log('WebRTC module loaded successfully');
  } catch (error) {
    console.warn('WebRTC not available, using mock implementation:', error.message);
  }
} else {
  console.log('Running in Expo Go - WebRTC not available, using mock implementation');
}

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callDoc = null;
    this.callDocListener = null;
    this.isInitiator = false;
    this.isMockMode = isExpoGo() || !RTCPeerConnection;
    
    if (this.isMockMode) {
      console.warn('Running in mock mode - WebRTC not available in Expo Go');
    }
  }

  // Mock stream for Expo Go
  createMockStream() {
    return {
      id: `mock_stream_${Date.now()}`,
      toURL: () => 'mock://video-stream',
      getTracks: () => [
        {
          id: 'mock_video_track',
          kind: 'video',
          enabled: true,
          stop: () => console.log('Mock video track stopped'),
          _switchCamera: async () => console.log('Mock camera switched')
        },
        {
          id: 'mock_audio_track',
          kind: 'audio',
          enabled: true,
          stop: () => console.log('Mock audio track stopped')
        }
      ],
      getVideoTracks: function() { return this.getTracks().filter(t => t.kind === 'video'); },
      getAudioTracks: function() { return this.getTracks().filter(t => t.kind === 'audio'); }
    };
  }

  // Initialize WebRTC connection
  async initializeConnection() {
    if (this.isMockMode) {
      console.log('Mock: Initializing WebRTC connection');
      this.peerConnection = {
        createOffer: async () => ({ type: 'offer', sdp: 'mock_offer_sdp' }),
        createAnswer: async () => ({ type: 'answer', sdp: 'mock_answer_sdp' }),
        setLocalDescription: async () => console.log('Mock: Set local description'),
        setRemoteDescription: async () => console.log('Mock: Set remote description'),
        addIceCandidate: async () => console.log('Mock: Added ICE candidate'),
        addTrack: () => console.log('Mock: Added track'),
        close: () => console.log('Mock: Closed peer connection'),
        iceConnectionState: 'connected',
        signalingState: 'stable',
        remoteDescription: null
      };
      return;
    }

    // Configuration for the peer connection
    const configuration = {
      iceServers: [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ],
        },
      ],
    };

    // Create peer connection
    this.peerConnection = new RTCPeerConnection(configuration);

    // Add event listeners
    this.peerConnection.onicecandidate = this.handleICECandidateEvent;
    this.peerConnection.ontrack = this.handleTrackEvent;
    this.peerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent;
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.peerConnection.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent;
  }

  // Get user media (camera and microphone)
  async getUserMedia(video = true, audio = true) {
    try {
      if (this.isMockMode) {
        console.log('Mock: Getting user media');
        this.localStream = this.createMockStream();
        return this.localStream;
      }

      const constraints = {
        video: video ? {
          facingMode: 'user', // Use front camera by default
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        } : false,
        audio: audio
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error getting user media:', error);
      // Fallback to mock stream
      this.localStream = this.createMockStream();
      return this.localStream;
    }
  }

  // Add local stream to peer connection
  addLocalStreamToConnection() {
    if (this.localStream && this.peerConnection) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  // Create offer for initiating call
  async createOffer() {
    try {
      if (!this.peerConnection) {
        await this.initializeConnection();
      }

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Create answer for receiving call
  async createAnswer() {
    try {
      if (!this.peerConnection) {
        await this.initializeConnection();
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  // Set remote description
  async setRemoteDescription(description) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw error;
    }
  }

  // Add ICE candidate
  async addICECandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      throw error;
    }
  }

  // Handle ICE candidate event
  handleICECandidateEvent = async (event) => {
    if (event.candidate) {
      try {
        // Store ICE candidate in Firestore
        const candidateData = {
          candidate: event.candidate,
          type: 'candidate'
        };
        
        if (this.callDoc) {
          await updateDoc(this.callDoc, {
            [`candidates.${Date.now()}`]: candidateData
          });
        }
      } catch (error) {
        console.error('Error saving ICE candidate:', error);
      }
    }
  };

  // Handle track event (remote stream)
  handleTrackEvent = (event) => {
    this.remoteStream = event.streams[0];
  };

  // Handle negotiation needed event
  handleNegotiationNeededEvent = async () => {
    try {
      if (this.isInitiator) {
        const offer = await this.createOffer();
        // Store offer in Firestore
        if (this.callDoc) {
          await updateDoc(this.callDoc, {
            offer: {
              type: offer.type,
              sdp: offer.sdp
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling negotiation needed:', error);
    }
  };

  // Handle ICE connection state change
  handleICEConnectionStateChangeEvent = () => {
    console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    if (this.peerConnection.iceConnectionState === 'failed' || 
        this.peerConnection.iceConnectionState === 'disconnected' ||
        this.peerConnection.iceConnectionState === 'closed') {
      this.handleConnectionFailure();
    }
  };

  // Handle signaling state change
  handleSignalingStateChangeEvent = () => {
    console.log('Signaling state:', this.peerConnection.signalingState);
  };

  // Handle ICE gathering state change
  handleICEGatheringStateChangeEvent = () => {
    console.log('ICE gathering state:', this.peerConnection.iceGatheringState);
  };

  // Handle connection failure
  handleConnectionFailure = () => {
    console.log('Connection failed, attempting to reconnect...');
    this.cleanup();
  };

  // Start a video call
  async startCall(callId, isInitiator = true) {
    try {
      this.callId = callId;
      this.isInitiator = isInitiator;
      
      if (this.isMockMode) {
        console.log('Mock: Starting call', callId);
        await this.getUserMedia(true, true);
        
        // Simulate remote stream after delay
        setTimeout(() => {
          this.remoteStream = this.createMockStream();
          console.log('Mock: Remote stream connected');
        }, 2000);
        
        return true;
      }
      
      // Initialize connection
      await this.initializeConnection();
      
      // Get user media
      await this.getUserMedia(true, true);
      
      // Add local stream to connection
      this.addLocalStreamToConnection();
      
      // Create call document in Firestore
      this.callDoc = doc(db, 'videoCalls', callId);
      
      if (isInitiator) {
        // Set up call document
        await setDoc(this.callDoc, {
          callId,
          initiatorId: null, // Set from outside
          receiverId: null,  // Set from outside
          status: 'calling',
          createdAt: new Date(),
          offer: null,
          answer: null,
          candidates: {}
        });
        
        // Create and send offer
        const offer = await this.createOffer();
        await updateDoc(this.callDoc, {
          offer: {
            type: offer.type,
            sdp: offer.sdp
          }
        });
      }
      
      // Listen for signaling changes
      this.setupSignalingListener();
      
      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  // Join an existing call
  async joinCall(callId) {
    try {
      this.callId = callId;
      this.isInitiator = false;
      
      if (this.isMockMode) {
        console.log('Mock: Joining call', callId);
        await this.getUserMedia(true, true);
        
        // Simulate remote stream immediately for joiner
        setTimeout(() => {
          this.remoteStream = this.createMockStream();
          console.log('Mock: Remote stream connected');
        }, 1000);
        
        return true;
      }
      
      // Initialize connection
      await this.initializeConnection();
      
      // Get user media
      await this.getUserMedia(true, true);
      
      // Add local stream to connection
      this.addLocalStreamToConnection();
      
      // Set call document reference
      this.callDoc = doc(db, 'videoCalls', callId);
      
      // Listen for signaling changes
      this.setupSignalingListener();
      
      // Get call data and set remote description if offer exists
      const callData = await this.getCallData();
      if (callData && callData.offer) {
        await this.setRemoteDescription(callData.offer);
        
        // Create and send answer
        const answer = await this.createAnswer();
        await updateDoc(this.callDoc, {
          answer: {
            type: answer.type,
            sdp: answer.sdp
          },
          status: 'connected'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error joining call:', error);
      throw error;
    }
  }

  // Set up signaling listener
  setupSignalingListener() {
    if (!this.callDoc) return;
    
    this.callDocListener = onSnapshot(this.callDoc, async (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.data();
      
      // Handle offer (for receiver)
      if (!this.isInitiator && data.offer && !this.peerConnection.remoteDescription) {
        await this.setRemoteDescription(data.offer);
        
        // Create and send answer
        const answer = await this.createAnswer();
        await updateDoc(this.callDoc, {
          answer: {
            type: answer.type,
            sdp: answer.sdp
          },
          status: 'connected'
        });
      }
      
      // Handle answer (for initiator)
      if (this.isInitiator && data.answer && !this.peerConnection.remoteDescription) {
        await this.setRemoteDescription(data.answer);
        await updateDoc(this.callDoc, {
          status: 'connected'
        });
      }
      
      // Handle ICE candidates
      if (data.candidates) {
        const candidates = Object.values(data.candidates);
        for (const candidateData of candidates) {
          if (candidateData.type === 'candidate' && candidateData.candidate) {
            await this.addICECandidate(candidateData.candidate);
          }
        }
      }
    });
  }

  // Get call data
  async getCallData() {
    try {
      if (!this.callDoc) return null;
      const snapshot = await getDoc(this.callDoc);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      console.error('Error getting call data:', error);
      return null;
    }
  }

  // End call
  async endCall() {
    try {
      // Update call status
      if (this.callDoc) {
        await updateDoc(this.callDoc, {
          status: 'ended',
          endedAt: new Date()
        });
      }
      
      this.cleanup();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  // Toggle mute
  toggleMute() {
    if (this.isMockMode) {
      console.log('Mock: Toggle mute');
      return Math.random() > 0.5; // Random mock state
    }
    
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !audioTracks[0]?.enabled;
    }
    return false;
  }

  // Toggle video
  toggleVideo() {
    if (this.isMockMode) {
      console.log('Mock: Toggle video');
      return Math.random() > 0.5; // Random mock state
    }
    
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !videoTracks[0]?.enabled;
    }
    return false;
  }

  // Switch camera
  async switchCamera() {
    try {
      if (this.isMockMode) {
        console.log('Mock: Switch camera');
        return;
      }
      
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          await videoTrack._switchCamera();
        }
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }

  // Get local stream
  getLocalStream() {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream() {
    return this.remoteStream;
  }

  // Cleanup resources
  cleanup() {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    // Remove listener
    if (this.callDocListener) {
      this.callDocListener();
      this.callDocListener = null;
    }
    
    // Clear call document reference
    this.callDoc = null;
    this.callId = null;
    this.isInitiator = false;
  }

  // Delete call document
  async deleteCallDocument() {
    try {
      if (this.callDoc) {
        await deleteDoc(this.callDoc);
      }
    } catch (error) {
      console.error('Error deleting call document:', error);
    }
  }
}

// Create singleton instance
const webRTCService = new WebRTCService();

export default webRTCService;