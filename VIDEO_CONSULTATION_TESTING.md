# Video Consultation Testing Guide

## Overview
This guide outlines how to test the video consultation functionality in the LifeLinePlus application for both doctors and patients.

## Prerequisites
- React Native development environment set up
- Firebase project configured
- Expo development client or Expo Go app
- Two test devices/emulators (one for doctor, one for patient)

## Test Scenarios

### 1. Doctor Initiates Video Call

#### Steps:
1. **Login as Doctor**
   - Use doctor credentials to log into the app
   - Navigate to "Consultations" tab

2. **Start Video Consultation**
   - Find a confirmed appointment with type "video"
   - Tap "Start" button on the consultation card
   - Confirm "Start Video Consultation" alert
   - App should navigate to VideoCallScreen with `isInitiator: true`

3. **Verify Call Initiation**
   - Screen should show "Calling..." state
   - WebRTC should initialize local stream (camera/mic)
   - Firebase call document should be created in `videoCalls` collection
   - Appointment status should update to "ongoing"

4. **Expected Behavior**
   - Local video preview should appear in bottom-right corner
   - Connection quality indicator should show
   - Control buttons (mute, video, camera switch) should be functional

### 2. Patient Joins Video Call

#### Steps:
1. **Login as Patient**
   - Use patient credentials
   - Navigate to "Consultations" tab

2. **Receive Call Notification**
   - When doctor starts call, patient should receive:
     - In-app alert: "Incoming Video Call"
     - Push notification (if app is backgrounded)

3. **Answer the Call**
   - Tap "Answer" on the incoming call alert
   - App should navigate to VideoCallScreen with `isInitiator: false`

4. **Verify Call Connection**
   - Screen should show "Connecting..." then "Connected"
   - Both local and remote video streams should be visible
   - Audio should be working
   - Call duration timer should start

### 3. During Video Call

#### Test Controls:
1. **Mute/Unmute Audio**
   - Tap microphone button
   - Icon should change to indicate muted state
   - Audio track should be disabled/enabled

2. **Toggle Video**
   - Tap camera button
   - Video should turn on/off
   - Remote user should see the change

3. **Switch Camera**
   - Tap camera switch button
   - Should toggle between front and rear camera
   - Video orientation should update

4. **Chat Integration**
   - Tap chat button during call
   - Should navigate to chat while maintaining call connection
   - Test picture-in-picture mode (if implemented)

### 4. End Video Call

#### Steps:
1. **End Call**
   - Tap red "End Call" button
   - Confirm end call alert
   - Call should terminate for both participants

2. **Verify Cleanup**
   - WebRTC connections should be closed
   - Video/audio streams should stop
   - Firebase call document should be updated with "ended" status
   - App should navigate back to previous screen

### 5. Error Scenarios

#### Test Cases:
1. **Connection Timeout**
   - Start call without second device answering
   - After 30 seconds, should show "Call Failed" screen
   - Provide retry and go back options

2. **Network Issues**
   - Simulate poor network connection
   - Should show connection quality indicators
   - Handle reconnection attempts

3. **Permission Denied**
   - Deny camera/microphone permissions
   - Should show appropriate error messages
   - Provide instructions to enable permissions

## Firebase Collections Structure

### Video Calls Collection (`videoCalls`)
```javascript
{
  callId: "unique_call_id",
  initiatorId: "doctor_uid",
  receiverId: "patient_uid",
  status: "calling|connected|ended",
  createdAt: timestamp,
  offer: { type: "offer", sdp: "..." },
  answer: { type: "answer", sdp: "..." },
  candidates: {
    "timestamp1": { candidate: {...}, type: "candidate" },
    "timestamp2": { candidate: {...}, type: "candidate" }
  }
}
```

### Appointments Collection Update
```javascript
{
  // existing fields...
  status: "ongoing", // when video call starts
  type: "video",
  callDeclined: false,
  declinedAt: null
}
```

## Validation Checklist

### Technical Validation
- [ ] WebRTC peer connection establishes successfully
- [ ] Audio and video streams are transmitted
- [ ] Firebase signaling works correctly
- [ ] ICE candidates are exchanged
- [ ] Call state management is accurate
- [ ] Error handling works properly

### User Experience Validation
- [ ] Intuitive call initiation flow
- [ ] Clear visual feedback during connection
- [ ] Responsive control buttons
- [ ] Proper call termination
- [ ] Notification system works
- [ ] Clean UI during video calls

### Performance Validation
- [ ] Video quality is acceptable
- [ ] Audio latency is minimal
- [ ] App remains responsive during calls
- [ ] Memory usage is reasonable
- [ ] Battery consumption is optimized

## Troubleshooting

### Common Issues:
1. **Video not showing**: Check camera permissions and WebRTC stream setup
2. **Audio not working**: Verify microphone permissions and audio track configuration
3. **Call not connecting**: Check Firebase configuration and network connectivity
4. **Performance issues**: Monitor device capabilities and optimize stream quality

### Debug Information:
- Check browser/app console for WebRTC logs
- Monitor Firebase Firestore for signaling data
- Verify network connectivity and STUN/TURN server access
- Check device permissions for camera and microphone

## Deployment Considerations

### Production Setup:
1. **TURN Servers**: Configure TURN servers for NAT traversal
2. **Security**: Implement proper authentication for video calls
3. **Scalability**: Consider using a dedicated video calling service for production
4. **Monitoring**: Set up logging and analytics for video call success rates

### Performance Optimization:
1. **Video Quality**: Adjust resolution based on network conditions
2. **Bandwidth**: Implement adaptive bitrate streaming
3. **Battery**: Optimize for mobile device battery life
4. **Background**: Handle app backgrounding and foregrounding

This testing guide ensures comprehensive validation of the video consultation feature across all user scenarios and edge cases.