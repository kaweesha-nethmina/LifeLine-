import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList
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
import pharmacyService from '../services/pharmacyService';

const PharmacyScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [pharmacies, setPharmacies] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicationHistory, setMedicationHistory] = useState([]);
  const [adherenceData, setAdherenceData] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [activeTab, setActiveTab] = useState('prescriptions'); // prescriptions, pharmacies, history, adherence

  useEffect(() => {
    loadPharmacyData();
  }, []);

  const loadPharmacyData = async () => {
    try {
      // Load pharmacies
      const nearbyPharmacies = await pharmacyService.getNearbyPharmacies();
      setPharmacies(nearbyPharmacies);
      
      // Load prescriptions
      const userPrescriptions = await pharmacyService.getUserPrescriptions('patient_1'); // Mock user ID
      setPrescriptions(userPrescriptions);
      
      // Load medication history
      const history = await pharmacyService.getMedicationHistory('patient_1'); // Mock user ID
      setMedicationHistory(history);
      
      // Load adherence data
      const adherence = await pharmacyService.getMedicationAdherence('patient_1'); // Mock user ID
      setAdherenceData(adherence);
    } catch (error) {
      console.error('Error loading pharmacy data:', error);
      Alert.alert('Error', 'Failed to load pharmacy data. Please try again.');
    }
  };

  const handleFillPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    Alert.alert(
      'Fill Prescription',
      `Would you like to fill your prescription for ${prescription.medication}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select Pharmacy',
          onPress: () => navigation.navigate('SelectPharmacy', { prescription })
        }
      ]
    );
  };

  const getPrescriptionStatusColor = (status) => {
    switch (status) {
      case 'active': return theme.SUCCESS;
      case 'filled': return theme.INFO;
      case 'expired': return theme.WARNING;
      case 'cancelled': return theme.ERROR;
      default: return theme.GRAY_MEDIUM;
    }
  };

  const getAdherenceColor = (adherence) => {
    if (adherence >= 90) return theme.SUCCESS;
    if (adherence >= 80) return theme.WARNING;
    return theme.ERROR;
  };

  const PrescriptionItem = ({ prescription }) => (
    <Card style={[styles.prescriptionCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.prescriptionHeader}>
        <View>
          <Text style={[styles.medicationName, { color: theme.TEXT_PRIMARY }]}>{prescription.medication}</Text>
          <Text style={[styles.dosage, { color: theme.TEXT_SECONDARY }]}>{prescription.dosage}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getPrescriptionStatusColor(prescription.status) }]}>
          <Text style={[styles.statusText, { color: theme.WHITE }]}>{prescription.status}</Text>
        </View>
      </View>
      
      <View style={styles.prescriptionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>Prescribed by {prescription.doctorName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>Prescribed on {new Date(prescription.prescribedDate).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>Quantity: {prescription.quantity} | Refills: {prescription.refills}</Text>
        </View>
        
        {prescription.insuranceCoverage && (
          <View style={styles.detailRow}>
            <Ionicons name="card" size={16} color={theme.TEXT_SECONDARY} />
            <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>
              Insurance: {prescription.insuranceCoverage.provider} (Copay: ${prescription.insuranceCoverage.copay})
            </Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.instructions, { color: theme.TEXT_PRIMARY }]}>{prescription.instructions}</Text>
      
      {prescription.status === 'active' && (
        <Button
          title="Fill Prescription"
          onPress={() => handleFillPrescription(prescription)}
          style={styles.fillButton}
        />
      )}
    </Card>
  );

  const PharmacyItem = ({ pharmacy }) => (
    <Card style={[styles.pharmacyCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.pharmacyHeader}>
        <Text style={[styles.pharmacyName, { color: theme.TEXT_PRIMARY }]}>{pharmacy.name}</Text>
        {pharmacy.deliveryAvailable && (
          <View style={[styles.deliveryBadge, { backgroundColor: theme.SUCCESS }]}>
            <Text style={[styles.deliveryText, { color: theme.WHITE }]}>Delivery</Text>
          </View>
        )}
      </View>
      
      <View style={styles.pharmacyDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>{pharmacy.address}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>{pharmacy.phone}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>{pharmacy.hours}</Text>
        </View>
      </View>
      
      <View style={styles.pharmacyActions}>
        <Button
          title="Call Pharmacy"
          onPress={() => Alert.alert('Call', `Calling ${pharmacy.phone}`)}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Get Directions"
          onPress={() => Alert.alert('Directions', 'Opening maps...')}
          variant="outline"
          style={styles.actionButton}
        />
      </View>
    </Card>
  );

  const HistoryItem = ({ medication }) => (
    <Card style={[styles.historyCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.medicationName, { color: theme.TEXT_PRIMARY }]}>{medication.medication}</Text>
        <Text style={[styles.dosage, { color: theme.TEXT_SECONDARY }]}>{medication.dosage}</Text>
      </View>
      
      <View style={styles.historyDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>Prescribed by {medication.prescribedBy}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>
            {new Date(medication.startDate).toLocaleDateString()} - 
            {medication.endDate ? new Date(medication.endDate).toLocaleDateString() : ' Ongoing'}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getPrescriptionStatusColor(medication.status) }]}>
          <Text style={[styles.statusText, { color: theme.WHITE }]}>{medication.status}</Text>
        </View>
      </View>
    </Card>
  );

  const AdherenceItem = ({ medication }) => (
    <Card style={[styles.adherenceCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <View style={styles.adherenceHeader}>
        <Text style={[styles.medicationName, { color: theme.TEXT_PRIMARY }]}>{medication.name}</Text>
        <Text style={[styles.adherencePercentage, { color: getAdherenceColor(medication.adherence) }]}>
          {medication.adherence}%
        </Text>
      </View>
      
      <View style={styles.adherenceDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>
            Last fill: {new Date(medication.lastFill).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>
            Next fill: {new Date(medication.nextFill).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube" size={16} color={theme.TEXT_SECONDARY} />
          <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>Days supply: {medication.daysSupply}</Text>
        </View>
      </View>
      
      <View style={[styles.progressBarContainer, { backgroundColor: theme.GRAY_LIGHT }]}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${medication.adherence}%`,
              backgroundColor: getAdherenceColor(medication.adherence)
            }
          ]} 
        />
      </View>
    </Card>
  );

  const PrescriptionsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {prescriptions.length === 0 ? (
        <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <Ionicons name="document-text-outline" size={64} color={theme.GRAY_MEDIUM} />
          <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Prescriptions</Text>
          <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
            You don't have any active prescriptions. Your doctor will prescribe medications during consultations.
          </Text>
        </Card>
      ) : (
        prescriptions.map((prescription, index) => (
          <PrescriptionItem key={index} prescription={prescription} />
        ))
      )}
    </ScrollView>
  );

  const PharmaciesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {pharmacies.map((pharmacy, index) => (
        <PharmacyItem key={index} pharmacy={pharmacy} />
      ))}
      
      <Card style={[styles.infoCard, { backgroundColor: theme.INFO + '10', borderColor: theme.INFO }]}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color={theme.INFO} />
          <Text style={[styles.infoTitle, { color: theme.INFO }]}>Pharmacy Services</Text>
        </View>
        <Text style={[styles.infoText, { color: theme.TEXT_SECONDARY }]}>
          Many pharmacies offer additional services like immunizations, health screenings, 
          and medication therapy management. Contact your pharmacy to learn more about 
          available services.
        </Text>
      </Card>
    </ScrollView>
  );

  const HistoryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {medicationHistory.length === 0 ? (
        <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <Ionicons name="time-outline" size={64} color={theme.GRAY_MEDIUM} />
          <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Medication History</Text>
          <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
            Your medication history will appear here once you start filling prescriptions.
          </Text>
        </Card>
      ) : (
        medicationHistory.map((medication, index) => (
          <HistoryItem key={index} medication={medication} />
        ))
      )}
    </ScrollView>
  );

  const AdherenceTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {adherenceData ? (
        <>
          <Card style={[styles.overallAdherenceCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
            <Text style={[styles.overallAdherenceTitle, { color: theme.TEXT_PRIMARY }]}>Overall Medication Adherence</Text>
            <Text style={[styles.overallAdherencePercentage, { color: getAdherenceColor(adherenceData.overallAdherence) }]}>
              {adherenceData.overallAdherence}%
            </Text>
            <View style={[styles.progressBarContainer, { backgroundColor: theme.GRAY_LIGHT }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${adherenceData.overallAdherence}%`,
                    backgroundColor: getAdherenceColor(adherenceData.overallAdherence)
                  }
                ]} 
              />
            </View>
          </Card>
          
          {adherenceData.medications.map((medication, index) => (
            <AdherenceItem key={index} medication={medication} />
          ))}
          
          <Card style={[styles.recommendationsCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
            <Text style={[styles.recommendationsTitle, { color: theme.TEXT_PRIMARY }]}>Adherence Recommendations</Text>
            {adherenceData.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.SUCCESS} />
                <Text style={[styles.recommendationText, { color: theme.TEXT_PRIMARY }]}>{recommendation}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card style={[styles.emptyState, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <Ionicons name="bar-chart-outline" size={64} color={theme.GRAY_MEDIUM} />
          <Text style={[styles.emptyTitle, { color: theme.TEXT_PRIMARY }]}>No Adherence Data</Text>
          <Text style={[styles.emptySubtitle, { color: theme.TEXT_SECONDARY }]}>
            Medication adherence data will be calculated once you have filled prescriptions.
          </Text>
        </Card>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Pharmacy Services</Text>
        <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>Prescription management and medication tracking</Text>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab, { borderBottomColor: theme.PRIMARY }]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText, { color: activeTab === 'prescriptions' ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
            Prescriptions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pharmacies' && styles.activeTab, { borderBottomColor: theme.PRIMARY }]}
          onPress={() => setActiveTab('pharmacies')}
        >
          <Text style={[styles.tabText, activeTab === 'pharmacies' && styles.activeTabText, { color: activeTab === 'pharmacies' ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
            Pharmacies
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab, { borderBottomColor: theme.PRIMARY }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText, { color: activeTab === 'history' ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
            History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'adherence' && styles.activeTab, { borderBottomColor: theme.PRIMARY }]}
          onPress={() => setActiveTab('adherence')}
        >
          <Text style={[styles.tabText, activeTab === 'adherence' && styles.activeTabText, { color: activeTab === 'adherence' ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
            Adherence
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'prescriptions' && <PrescriptionsTab />}
      {activeTab === 'pharmacies' && <PharmaciesTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'adherence' && <AdherenceTab />}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.PRIMARY,
  },
  tabText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_SECONDARY,
  },
  activeTabText: {
    color: theme.PRIMARY,
  },
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  prescriptionCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  medicationName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  dosage: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: 'bold',
  },
  prescriptionDetails: {
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  detailText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  instructions: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    fontStyle: 'italic',
    marginBottom: SPACING.MD,
  },
  fillButton: {
    alignSelf: 'flex-start',
  },
  pharmacyCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  pharmacyName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  deliveryBadge: {
    backgroundColor: theme.SUCCESS,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  deliveryText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: 'bold',
  },
  pharmacyDetails: {
    marginBottom: SPACING.MD,
  },
  pharmacyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  historyCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  adherenceCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  adherencePercentage: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
  },
  adherenceDetails: {
    marginBottom: SPACING.MD,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.BUTTON_SECONDARY,
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  overallAdherenceCard: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  overallAdherenceTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  overallAdherencePercentage: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
  },
  recommendationsCard: {
    marginBottom: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  recommendationsTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.MD,
  },
  infoCard: {
    backgroundColor: theme.INFO + '10',
    borderColor: theme.INFO,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  infoTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.INFO,
    marginLeft: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    lineHeight: 20,
  },
});

export default PharmacyScreen;