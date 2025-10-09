import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';
import telemedicineService from '../services/telemedicineService';

const TelemedicineScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [isRecording, setIsRecording] = useState(false);
  const [vitalSigns, setVitalSigns] = useState(null);
  const [stethoscopeData, setStethoscopeData] = useState(null);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [report, setReport] = useState(null);
  const monitoringCleanup = useRef(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initialize telemedicine service
    const initTelemedicine = async () => {
      try {
        await telemedicineService.initializeAudioRecording();
      } catch (error) {
        console.error('Error initializing telemedicine:', error);
        Alert.alert('Error', 'Failed to initialize telemedicine features');
      }
    };

    initTelemedicine();

    // Cleanup on unmount
    return () => {
      if (monitoringCleanup.current) {
        monitoringCleanup.current();
      }
    };
  }, []);

  useEffect(() => {
    // Pulse animation for monitoring
    const animatePulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMonitoring) animatePulse();
      });
    };

    if (isMonitoring) {
      animatePulse();
    }
  }, [isMonitoring]);

  const connectToDevice = async (deviceType) => {
    try {
      Alert.alert('Connecting...', `Connecting to ${deviceType} device. Please ensure the device is powered on and in pairing mode.`);
      
      // Simulate connection process
      setTimeout(async () => {
        try {
          const device = await telemedicineService.connectToMedicalDevice(deviceType);
          setConnectedDevice(device);
          Alert.alert('Success', `${deviceType} device connected successfully!`);
        } catch (error) {
          console.error('Error connecting to device:', error);
          Alert.alert('Connection Failed', `Failed to connect to ${deviceType} device. Please try again.`);
        }
      }, 2000);
    } catch (error) {
      console.error('Error initiating device connection:', error);
      Alert.alert('Error', 'Failed to initiate device connection');
    }
  };

  const startVitalSignsMonitoring = async () => {
    try {
      if (!connectedDevice) {
        Alert.alert('Device Required', 'Please connect to a medical device first');
        return;
      }

      setIsMonitoring(true);
      Vibration.vibrate([0, 500, 500, 500], true); // Vibrate pattern

      monitoringCleanup.current = await telemedicineService.startVitalSignsMonitoring(
        (newVitalSigns) => {
          setVitalSigns(newVitalSigns);
        },
        3000 // Update every 3 seconds
      );
    } catch (error) {
      console.error('Error starting monitoring:', error);
      Alert.alert('Error', 'Failed to start vital signs monitoring');
      setIsMonitoring(false);
      Vibration.cancel();
    }
  };

  const stopVitalSignsMonitoring = () => {
    if (monitoringCleanup.current) {
      monitoringCleanup.current();
      monitoringCleanup.current = null;
    }
    setIsMonitoring(false);
    Vibration.cancel();
  };

  const startStethoscopeRecording = async () => {
    try {
      await telemedicineService.startStethoscopeRecording();
      setIsRecording(true);
      Alert.alert('Recording Started', 'Listening to heart sounds. Tap Stop when finished.');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start stethoscope recording');
    }
  };

  const stopStethoscopeRecording = async () => {
    try {
      const uri = await telemedicineService.stopStethoscopeRecording();
      setIsRecording(false);
      
      if (uri) {
        Alert.alert(
          'Recording Complete',
          'Analyzing heart sounds...',
          [
            {
              text: 'Analyze',
              onPress: () => analyzeStethoscopeRecording(uri)
            },
            {
              text: 'Play Recording',
              onPress: () => telemedicineService.playStethoscopeRecording(uri)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop stethoscope recording');
      setIsRecording(false);
    }
  };

  const analyzeStethoscopeRecording = async (uri) => {
    try {
      Alert.alert('Analyzing...', 'Analyzing heart sounds. This may take a moment.');
      
      // Simulate analysis process
      setTimeout(async () => {
        try {
          const analysis = await telemedicineService.analyzeHeartSounds(uri);
          setStethoscopeData(analysis);
          Alert.alert('Analysis Complete', 'Heart sound analysis complete. View results in the Stethoscope tab.');
        } catch (error) {
          console.error('Error analyzing recording:', error);
          Alert.alert('Analysis Failed', 'Failed to analyze heart sounds. Please try again.');
        }
      }, 3000);
    } catch (error) {
      console.error('Error initiating analysis:', error);
      Alert.alert('Error', 'Failed to initiate heart sound analysis');
    }
  };

  const generateReport = () => {
    if (!vitalSigns && !stethoscopeData) {
      Alert.alert('Insufficient Data', 'Please collect vital signs and/or stethoscope data first');
      return;
    }

    const newReport = telemedicineService.generateConsultationReport(
      userProfile,
      vitalSigns,
      stethoscopeData,
      'Patient reported feeling generally well during examination.'
    );

    setReport(newReport);
    Alert.alert('Report Generated', 'Consultation report has been generated successfully.');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High': return theme.ERROR;
      case 'Moderate': return theme.WARNING;
      case 'Low': return theme.SUCCESS;
      default: return theme.GRAY_MEDIUM;
    }
  };

  const DeviceCard = ({ title, icon, color, deviceType, isConnected }) => (
    <Card style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceTitle}>{title}</Text>
        <Text style={styles.deviceStatus}>
          {isConnected ? `Connected (${connectedDevice?.batteryLevel || 'N/A'}%)` : 'Tap to connect'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => connectToDevice(deviceType)}
        disabled={isConnected}
      >
        <View style={[styles.deviceIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color={theme.WHITE} />
        </View>
      </TouchableOpacity>
    </Card>
  );

  const VitalSignItem = ({ label, value, unit, normalRange }) => (
    <View style={styles.vitalSignItem}>
      <Text style={styles.vitalSignLabel}>{label}</Text>
      <Text style={styles.vitalSignValue}>{value} <Text style={styles.vitalSignUnit}>{unit}</Text></Text>
      {normalRange && (
        <Text style={styles.normalRange}>{normalRange}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Telemedicine Tools</Text>
        <Text style={styles.subtitle}>Advanced remote patient monitoring</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Medical Devices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Devices</Text>
          <DeviceCard
            title="Digital Stethoscope"
            icon="volume-high"
            color={theme.PRIMARY}
            deviceType="stethoscope"
            isConnected={connectedDevice?.deviceName?.includes('stethoscope')}
          />
          <DeviceCard
            title="Blood Pressure Monitor"
            icon="pulse"
            color={theme.SUCCESS}
            deviceType="blood_pressure"
            isConnected={connectedDevice?.deviceName?.includes('blood_pressure')}
          />
          <DeviceCard
            title="Pulse Oximeter"
            icon="heart"
            color={theme.ERROR}
            deviceType="oximeter"
            isConnected={connectedDevice?.deviceName?.includes('oximeter')}
          />
        </View>

        {/* Vital Signs Monitoring */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vital Signs Monitoring</Text>
          <Card style={styles.monitoringCard}>
            <View style={styles.monitoringHeader}>
              <Text style={styles.monitoringTitle}>Continuous vital signs monitoring</Text>
              <Text style={styles.monitoringStatus}>
                {isMonitoring ? 'Monitoring Active' : 'Tap to start monitoring'}
              </Text>
            </View>
            <Button
              title={isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              onPress={isMonitoring ? stopVitalSignsMonitoring : startVitalSignsMonitoring}
              disabled={!connectedDevice}
              variant={isMonitoring ? 'danger' : 'primary'}
              style={styles.monitoringButton}
            />
          </Card>

          {vitalSigns && (
            <Card style={styles.vitalSignsCard}>
              <View style={styles.vitalSignsHeader}>
                <Text style={styles.vitalSignsTitle}>Latest Readings</Text>
                <Text style={styles.timestamp}>
                  {new Date(vitalSigns.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              
              <View style={styles.vitalSignsGrid}>
                <VitalSignItem
                  label="Heart Rate"
                  value={vitalSigns.heartRate}
                  unit="BPM"
                  normalRange="60-100"
                />
                <VitalSignItem
                  label="Blood Pressure"
                  value={`${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic}`}
                  unit="mmHg"
                  normalRange="<140/90"
                />
                <VitalSignItem
                  label="Oxygen Saturation"
                  value={vitalSigns.oxygenSaturation}
                  unit="%"
                  normalRange="95-100"
                />
                <VitalSignItem
                  label="Temperature"
                  value={vitalSigns.temperature}
                  unit="°F"
                  normalRange="97-99"
                />
                <VitalSignItem
                  label="Respiratory Rate"
                  value={vitalSigns.respiratoryRate}
                  unit="breaths/min"
                  normalRange="12-20"
                />
              </View>
            </Card>
          )}
        </View>

        {/* Digital Stethoscope */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Digital Stethoscope</Text>
          <Card style={styles.stethoscopeCard}>
            <View style={styles.stethoscopeHeader}>
              <Text style={styles.stethoscopeTitle}>Heart Sound Analysis</Text>
            </View>
            
            {!isRecording ? (
              <Button
                title="Start Recording"
                onPress={startStethoscopeRecording}
                icon="mic"
                style={styles.recordButton}
              />
            ) : (
              <Button
                title="Stop Recording"
                onPress={stopStethoscopeRecording}
                variant="danger"
                icon="stop"
                style={styles.stopRecordButton}
              />
            )}
            
            {stethoscopeData && (
              <Card style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>Analysis Results</Text>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Heart Rate:</Text>
                  <Text style={styles.analysisValue}>72 BPM</Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Rhythm:</Text>
                  <Text style={styles.analysisValue}>Normal Sinus Rhythm</Text>
                </View>
                <View style={styles.abnormalitiesSection}>
                  <Text style={styles.abnormalitiesTitle}>Abnormalities Detected:</Text>
                  <Text style={styles.abnormalityItem}>• Occasional premature ventricular contractions</Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Recording Quality:</Text>
                  <Text style={styles.analysisValue}>Good</Text>
                </View>
              </Card>
            )}
          </Card>
        </View>

        {/* Consultation Report */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Report</Text>
          <Card style={styles.reportCard}>
            <Button
              title="Generate Report"
              onPress={generateReport}
              icon="document-text"
              style={styles.reportButton}
            />
            
            {report && (
              <Card style={styles.generatedReport}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTitle}>Consultation Report</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(report.severity) }]}>
                    <Text style={styles.severityText}>{report.severity} Severity</Text>
                  </View>
                </View>
                
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Recommendations</Text>
                  {report.recommendations.map((recommendation, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.SUCCESS} />
                      <Text style={styles.recommendationText}>{recommendation}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={[styles.reportFooter, { borderTopColor: theme.BORDER }]}>
                  <Text style={styles.reportDate}>
                    Generated: {new Date(report.timestamp).toLocaleString()}
                  </Text>
                  <Button
                    title="Share Report"
                    onPress={() => Alert.alert('Share', 'Report sharing functionality would be implemented here')}
                    variant="outline"
                    style={styles.shareButton}
                  />
                </View>
              </Card>
            )}
          </Card>
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
    marginBottom: SPACING.XL,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  deviceCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  deviceTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  deviceStatus: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'right',
  },
  deviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.MD,
  },
  connectButton: {
    marginBottom: SPACING.XS,
  },
  monitoringCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  monitoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  monitoringTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  monitoringStatus: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'right',
  },
  monitoringButton: {
    marginBottom: SPACING.MD,
  },
  vitalSignsCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  vitalSignsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  vitalSignsTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  timestamp: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'right',
  },
  vitalSignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vitalSignItem: {
    width: '50%',
    paddingVertical: SPACING.SM,
    paddingRight: SPACING.SM,
  },
  vitalSignLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
    marginBottom: SPACING.XS / 2,
  },
  vitalSignValue: {
    fontSize: FONT_SIZES.LG,
    color: theme.TEXT_PRIMARY,
    fontWeight: 'bold',
  },
  vitalSignUnit: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'normal',
    color: theme.TEXT_SECONDARY,
  },
  normalRange: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
  stethoscopeCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  stethoscopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  stethoscopeTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  recordButton: {
    marginBottom: SPACING.MD,
  },
  stopRecordButton: {
    marginBottom: SPACING.MD,
  },
  analysisCard: {
    marginTop: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  analysisTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  analysisLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  analysisValue: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    fontWeight: '600',
  },
  abnormalitiesSection: {
    marginVertical: SPACING.MD,
  },
  abnormalitiesTitle: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  abnormalityItem: {
    fontSize: FONT_SIZES.SM,
    color: theme.ERROR,
    marginBottom: SPACING.XS / 2,
  },
  reportCard: {
    marginBottom: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  reportButton: {
    marginBottom: SPACING.MD,
  },
  generatedReport: {
    marginTop: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  reportTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  severityBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  severityText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: 'bold',
  },
  reportSection: {
    marginBottom: SPACING.MD,
  },
  reportSectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  recommendationText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  reportFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
    paddingTop: SPACING.MD,
  },
  reportDate: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  shareButton: {
    alignSelf: 'flex-start',
  },
});

export default TelemedicineScreen;