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
      case 'active': return COLORS.SUCCESS;
      case 'filled': return COLORS.INFO;
      case 'expired': return COLORS.WARNING;
      case 'cancelled': return COLORS.ERROR;
      default: return COLORS.GRAY_MEDIUM;
    }
  };

  const getAdherenceColor = (adherence) => {
    if (adherence >= 90) return COLORS.SUCCESS;
    if (adherence >= 80) return COLORS.WARNING;
    return COLORS.ERROR;
  };

  const PrescriptionItem = ({ prescription }) => (
    <Card style={styles.prescriptionCard}>
      <View style={styles.prescriptionHeader}>
        <View>
          <Text style={styles.medicationName}>{prescription.medication}</Text>
          <Text style={styles.dosage}>{prescription.dosage}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getPrescriptionStatusColor(prescription.status) }]}>
          <Text style={styles.statusText}>{prescription.status}</Text>
        </View>
      </View>
      
      <View style={styles.prescriptionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Prescribed by {prescription.doctorName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Prescribed on {new Date(prescription.prescribedDate).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Quantity: {prescription.quantity} | Refills: {prescription.refills}</Text>
        </View>
        
        {prescription.insuranceCoverage && (
          <View style={styles.detailRow}>
            <Ionicons name="card" size={16} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.detailText}>
              Insurance: {prescription.insuranceCoverage.provider} (Copay: ${prescription.insuranceCoverage.copay})
            </Text>
          </View>
        )}
      </View>
      
      <Text style={styles.instructions}>{prescription.instructions}</Text>
      
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
    <Card style={styles.pharmacyCard}>
      <View style={styles.pharmacyHeader}>
        <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
        {pharmacy.deliveryAvailable && (
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryText}>Delivery</Text>
          </View>
        )}
      </View>
      
      <View style={styles.pharmacyDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>{pharmacy.address}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>{pharmacy.phone}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>{pharmacy.hours}</Text>
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
    <Card style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.medicationName}>{medication.medication}</Text>
        <Text style={styles.dosage}>{medication.dosage}</Text>
      </View>
      
      <View style={styles.historyDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Prescribed by {medication.prescribedBy}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>
            {new Date(medication.startDate).toLocaleDateString()} - 
            {medication.endDate ? new Date(medication.endDate).toLocaleDateString() : ' Ongoing'}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getPrescriptionStatusColor(medication.status) }]}>
          <Text style={styles.statusText}>{medication.status}</Text>
        </View>
      </View>
    </Card>
  );

  const AdherenceItem = ({ medication }) => (
    <Card style={styles.adherenceCard}>
      <View style={styles.adherenceHeader}>
        <Text style={styles.medicationName}>{medication.name}</Text>
        <Text style={[styles.adherencePercentage, { color: getAdherenceColor(medication.adherence) }]}>
          {medication.adherence}%
        </Text>
      </View>
      
      <View style={styles.adherenceDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>
            Last fill: {new Date(medication.lastFill).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>
            Next fill: {new Date(medication.nextFill).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Days supply: {medication.daysSupply}</Text>
        </View>
      </View>
      
      <View style={styles.progressBarContainer}>
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
        <Card style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.GRAY_MEDIUM} />
          <Text style={styles.emptyTitle}>No Prescriptions</Text>
          <Text style={styles.emptySubtitle}>
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
      
      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color={COLORS.INFO} />
          <Text style={styles.infoTitle}>Pharmacy Services</Text>
        </View>
        <Text style={styles.infoText}>
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
        <Card style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color={COLORS.GRAY_MEDIUM} />
          <Text style={styles.emptyTitle}>No Medication History</Text>
          <Text style={styles.emptySubtitle}>
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
          <Card style={styles.overallAdherenceCard}>
            <Text style={styles.overallAdherenceTitle}>Overall Medication Adherence</Text>
            <Text style={[styles.overallAdherencePercentage, { color: getAdherenceColor(adherenceData.overallAdherence) }]}>
              {adherenceData.overallAdherence}%
            </Text>
            <View style={styles.progressBarContainer}>
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
          
          <Card style={styles.recommendationsCard}>
            <Text style={styles.recommendationsTitle}>Adherence Recommendations</Text>
            {adherenceData.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={64} color={COLORS.GRAY_MEDIUM} />
          <Text style={styles.emptyTitle}>No Adherence Data</Text>
          <Text style={styles.emptySubtitle}>
            Medication adherence data will be calculated once you have filled prescriptions.
          </Text>
        </Card>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pharmacy Services</Text>
        <Text style={styles.subtitle}>Prescription management and medication tracking</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText]}>
            Prescriptions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pharmacies' && styles.activeTab]}
          onPress={() => setActiveTab('pharmacies')}
        >
          <Text style={[styles.tabText, activeTab === 'pharmacies' && styles.activeTabText]}>
            Pharmacies
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'adherence' && styles.activeTab]}
          onPress={() => setActiveTab('adherence')}
        >
          <Text style={[styles.tabText, activeTab === 'adherence' && styles.activeTabText]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.PRIMARY,
  },
  tabContent: {
    flex: 1,
    padding: SPACING.MD,
  },
  prescriptionCard: {
    marginBottom: SPACING.MD,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  medicationName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  dosage: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
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
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  instructions: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontStyle: 'italic',
    marginBottom: SPACING.MD,
  },
  fillButton: {
    alignSelf: 'flex-start',
  },
  pharmacyCard: {
    marginBottom: SPACING.MD,
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
    color: COLORS.TEXT_PRIMARY,
  },
  deliveryBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  deliveryText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
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
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  adherenceCard: {
    marginBottom: SPACING.MD,
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
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  overallAdherenceCard: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  overallAdherenceTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  overallAdherencePercentage: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
  },
  recommendationsCard: {
    marginBottom: SPACING.LG,
  },
  recommendationsTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  recommendationText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.MD,
  },
  infoCard: {
    backgroundColor: COLORS.INFO + '10',
    borderColor: COLORS.INFO,
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
    color: COLORS.INFO,
    marginLeft: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
});

export default PharmacyScreen;