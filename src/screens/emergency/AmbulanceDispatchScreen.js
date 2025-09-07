import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location'; // Add this import for location permissions
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import LocationService from '../../services/locationService';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const AmbulanceDispatchScreen = ({ navigation, route }) => {
  const { userProfile } = useAuth();
  const { emergencyId } = route.params || {};
  
  const [ambulances, setAmbulances] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showAddAmbulanceModal, setShowAddAmbulanceModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false); // New state for map modal
  const [filterStatus, setFilterStatus] = useState('all');
  const [newAmbulance, setNewAmbulance] = useState({
    callSign: '',
    type: 'Basic Life Support',
    currentLocation: '',
    selectedLocation: null, // New field for location coordinates
    crew: [''],
    equipment: [''],
    fuelLevel: 100,
    totalCalls: 0,
    status: 'available'
  });
  const emergenciesListenerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    loadAmbulanceData();
    loadEmergencies();
    // Set up real-time updates
    const interval = setInterval(loadAmbulanceData, 10000);
    return () => {
      clearInterval(interval);
      // Clean up emergencies listener
      if (emergenciesListenerRef.current) {
        emergenciesListenerRef.current();
      }
    };
  }, []);

  const loadAmbulanceData = async () => {
    try {
      // Fetch ambulances from Firebase
      // Removed orderBy to avoid composite index requirement
      const ambulancesQuery = query(
        collection(db, 'ambulances')
        // Removed orderBy('updatedAt', 'desc') to avoid composite index
      );
      
      const ambulancesSnapshot = await getDocs(ambulancesQuery);
      const ambulancesData = [];
      
      ambulancesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Handle timestamp conversion properly
        const updatedAt = data.updatedAt ? 
          (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt) : 
          new Date();
        
        ambulancesData.push({
          id: doc.id,
          ...data,
          updatedAt
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      ambulancesData.sort((a, b) => {
        const dateA = a.updatedAt || new Date(0);
        const dateB = b.updatedAt || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
      
      setAmbulances(ambulancesData);
      
      // Fetch dispatches from Firebase
      // Removed orderBy to avoid composite index requirement
      const dispatchesQuery = query(
        collection(db, 'dispatches')
        // Removed orderBy('dispatchTime', 'desc') to avoid composite index
      );
      
      const dispatchesSnapshot = await getDocs(dispatchesQuery);
      const dispatchesData = [];
      
      dispatchesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Handle timestamp conversion properly
        const dispatchTime = data.dispatchTime ? 
          (typeof data.dispatchTime.toDate === 'function' ? data.dispatchTime.toDate() : data.dispatchTime) : 
          new Date();
        const estimatedArrival = data.estimatedArrival ? 
          (typeof data.estimatedArrival.toDate === 'function' ? data.estimatedArrival.toDate() : data.estimatedArrival) : 
          new Date();
        
        dispatchesData.push({
          id: doc.id,
          ...data,
          dispatchTime,
          estimatedArrival
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      dispatchesData.sort((a, b) => {
        const dateA = a.dispatchTime || new Date(0);
        const dateB = b.dispatchTime || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
      
      setDispatches(dispatchesData);
    } catch (error) {
      console.error('Error loading ambulance data:', error);
    }
  };

  // Add function to load emergencies
  const loadEmergencies = async () => {
    try {
      // Fetch emergencies from Firebase
      const emergenciesQuery = query(collection(db, 'emergencies'));
      
      // Store the unsubscribe function in ref for cleanup
      emergenciesListenerRef.current = onSnapshot(emergenciesQuery, (snapshot) => {
        const emergenciesData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Handle timestamp conversion properly
          const timestamp = data.timestamp ? 
            (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : data.timestamp) : 
            new Date();
          
          emergenciesData.push({
            id: doc.id,
            ...data,
            timestamp
          });
        });
        
        // Sort by timestamp
        emergenciesData.sort((a, b) => {
          const dateA = a.timestamp || new Date(0);
          const dateB = b.timestamp || new Date(0);
          return new Date(dateB) - new Date(dateA);
        });
        
        setEmergencies(emergenciesData);
      }, (error) => {
        console.error('Error listening to emergencies:', error);
        setEmergencies([]);
      });
    } catch (error) {
      console.error('Error loading emergencies:', error);
      setEmergencies([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAmbulanceData();
    setRefreshing(false);
  };

  const handleDispatchAmbulance = async (ambulance, emergency) => {
    Alert.alert(
      'Dispatch Ambulance',
      `Dispatch ${ambulance?.callSign || 'ambulance'} to emergency ${emergency?.id || 'location'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch',
          onPress: async () => {
            try {
              // Update ambulance status in Firebase
              const ambulanceRef = doc(db, 'ambulances', ambulance?.id || '');
              await updateDoc(ambulanceRef, {
                status: 'dispatched',
                currentEmergency: emergency?.id || emergencyId || '',
                updatedAt: serverTimestamp()
              });
              
              // Add to dispatch list in Firebase
              const newDispatch = {
                ambulanceId: ambulance?.id || '',
                emergencyId: emergency?.id || emergencyId || '',
                dispatchTime: serverTimestamp(),
                status: 'en_route',
                estimatedArrival: new Date(Date.now() + 15 * 60000).toISOString() // 15 minutes
              };
              
              const dispatchRef = await addDoc(collection(db, 'dispatches'), newDispatch);
              
              // Update local state
              const updatedAmbulances = ambulances.map(a =>
                a.id === (ambulance?.id || '') 
                  ? { ...a, status: 'dispatched', currentEmergency: emergency?.id || emergencyId || '' }
                  : a
              );
              setAmbulances(updatedAmbulances);
              
              const newDispatchWithId = {
                id: dispatchRef.id,
                ...newDispatch
              };
              
              setDispatches([newDispatchWithId, ...dispatches]);
              
              setShowDispatchModal(false);
              Alert.alert('Success', `${ambulance?.callSign || 'Ambulance'} has been dispatched.`);
            } catch (error) {
              console.error('Error dispatching ambulance:', error);
              Alert.alert('Error', 'Failed to dispatch ambulance');
            }
          }
        }
      ]
    );
  };

  // Function to add a new ambulance
  const handleAddAmbulance = async () => {
    if (!newAmbulance.callSign || !newAmbulance.currentLocation) {
      Alert.alert('Error', 'Please fill in all required fields (Call Sign and Location)');
      return;
    }

    try {
      const ambulanceData = {
        ...newAmbulance,
        crew: newAmbulance.crew.filter(member => member.trim() !== ''),
        equipment: newAmbulance.equipment.filter(item => item.trim() !== ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'ambulances'), ambulanceData);
      
      // Update local state
      setAmbulances([...ambulances, { id: docRef.id, ...ambulanceData }]);
      
      // Reset form and close modal
      setNewAmbulance({
        callSign: '',
        type: 'Basic Life Support',
        currentLocation: '',
        crew: [''],
        equipment: [''],
        fuelLevel: 100,
        totalCalls: 0,
        status: 'available'
      });
      setShowAddAmbulanceModal(false);
      
      Alert.alert('Success', 'Ambulance added successfully');
    } catch (error) {
      console.error('Error adding ambulance:', error);
      Alert.alert('Error', 'Failed to add ambulance');
    }
  };

  // Function to remove an ambulance
  const handleRemoveAmbulance = async (ambulanceId, callSign) => {
    Alert.alert(
      'Remove Ambulance',
      `Are you sure you want to remove ambulance ${callSign}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'ambulances', ambulanceId));
              
              // Update local state
              const updatedAmbulances = ambulances.filter(a => a.id !== ambulanceId);
              setAmbulances(updatedAmbulances);
              
              Alert.alert('Success', 'Ambulance removed successfully');
            } catch (error) {
              console.error('Error removing ambulance:', error);
              Alert.alert('Error', 'Failed to remove ambulance');
            }
          }
        }
      ]
    );
  };

  // Function to update crew member
  const updateCrewMember = (index, value) => {
    const updatedCrew = [...newAmbulance.crew];
    updatedCrew[index] = value;
    setNewAmbulance({ ...newAmbulance, crew: updatedCrew });
  };

  // Function to add new crew member field
  const addCrewMember = () => {
    setNewAmbulance({ ...newAmbulance, crew: [...newAmbulance.crew, ''] });
  };

  // Function to remove crew member field
  const removeCrewMember = (index) => {
    if (newAmbulance.crew.length > 1) {
      const updatedCrew = newAmbulance.crew.filter((_, i) => i !== index);
      setNewAmbulance({ ...newAmbulance, crew: updatedCrew });
    }
  };

  // Function to update equipment
  const updateEquipment = (index, value) => {
    const updatedEquipment = [...newAmbulance.equipment];
    updatedEquipment[index] = value;
    setNewAmbulance({ ...newAmbulance, equipment: updatedEquipment });
  };

  // Function to add new equipment field
  const addEquipment = () => {
    setNewAmbulance({ ...newAmbulance, equipment: [...newAmbulance.equipment, ''] });
  };

  // Function to remove equipment field
  const removeEquipment = (index) => {
    if (newAmbulance.equipment.length > 1) {
      const updatedEquipment = newAmbulance.equipment.filter((_, i) => i !== index);
      setNewAmbulance({ ...newAmbulance, equipment: updatedEquipment });
    }
  };

  // Function to open map for location selection
  const openMapForLocation = async () => {
    console.log('openMapForLocation called');
    try {
      // Request location permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to select location on map');
        return;
      }
      // Close the add ambulance modal and open the map modal
      setShowAddAmbulanceModal(false);
      setShowMapModal(true);
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  // Function to use current location
  const useCurrentLocation = async () => {
    try {
      // Request location permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get current location');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      if (location && location.coords) {
        const { latitude, longitude } = location.coords;
        setNewAmbulance({
          ...newAmbulance,
          selectedLocation: { latitude, longitude },
          currentLocation: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        });
        Alert.alert('Success', 'Current location set');
      } else {
        Alert.alert('Error', 'Unable to get current location');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return COLORS.GRAY_MEDIUM;
    
    switch (status) {
      case 'available':
        return COLORS.SUCCESS;
      case 'dispatched':
        return COLORS.WARNING;
      case 'on_scene':
        return COLORS.INFO;
      case 'transporting':
        return COLORS.PRIMARY;
      case 'out_of_service':
        return COLORS.ERROR;
      default:
        return COLORS.GRAY_MEDIUM;
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return 'help-circle';
    
    switch (status) {
      case 'available':
        return 'checkmark-circle';
      case 'dispatched':
        return 'car-sport';
      case 'on_scene':
        return 'location';
      case 'transporting':
        return 'medical';
      case 'out_of_service':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const AmbulanceCard = ({ ambulance }) => (
    <Card style={[styles.ambulanceCard, { borderLeftColor: getStatusColor(ambulance.status) }]}>
      <View style={styles.ambulanceHeader}>
        <View style={styles.ambulanceInfo}>
          <Text style={styles.callSign}>{ambulance.callSign || 'N/A'}</Text>
          <Text style={styles.vehicleType}>{ambulance.type || 'N/A'}</Text>
          <Text style={styles.location}>📍 {ambulance.currentLocation || 'Location not available'}</Text>
          <Text style={styles.crew}>Crew: {ambulance.crew && ambulance.crew.length > 0 ? ambulance.crew.join(', ') : 'No crew assigned'}</Text>
        </View>
        <View style={styles.ambulanceStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ambulance.status) }]}>
            <Ionicons 
              name={getStatusIcon(ambulance.status)} 
              size={12} 
              color={COLORS.WHITE} 
            />
            <Text style={styles.statusText}>
              {ambulance.status ? ambulance.status.replace('_', ' ').toUpperCase() : 'N/A'}
            </Text>
          </View>
          <Text style={styles.eta}>ETA: {ambulance.eta || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.ambulanceStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{ambulance.equipment ? ambulance.equipment.length : 0}</Text>
          <Text style={styles.statLabel}>Equipment</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{ambulance.fuelLevel || 0}%</Text>
          <Text style={styles.statLabel}>Fuel</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{ambulance.totalCalls || 0}</Text>
          <Text style={styles.statLabel}>Calls Today</Text>
        </View>
      </View>

      <View style={styles.ambulanceActions}>
        {ambulance.status === 'available' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.PRIMARY }]}
            onPress={() => {
              setSelectedAmbulance(ambulance);
              setShowDispatchModal(true);
            }}
          >
            <Ionicons name="send" size={16} color={COLORS.WHITE} />
            <Text style={styles.actionText}>Dispatch</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.INFO }]}
          onPress={() => Alert.alert('Feature Coming Soon', 'Live tracking will be available soon.')}
        >
          <Ionicons name="location" size={16} color={COLORS.WHITE} />
          <Text style={styles.actionText}>Track</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.SUCCESS }]}
          onPress={() => Alert.alert('Radio Contact', `Contacting ${ambulance.callSign}...`)}
        >
          <Ionicons name="radio" size={16} color={COLORS.WHITE} />
          <Text style={styles.actionText}>Radio</Text>
        </TouchableOpacity>
        
        {/* Remove Ambulance Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.ERROR }]}
          onPress={() => handleRemoveAmbulance(ambulance.id, ambulance.callSign)}
        >
          <Ionicons name="trash" size={16} color={COLORS.WHITE} />
          <Text style={styles.actionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const DispatchCard = ({ dispatch }) => {
    const ambulance = ambulances.find(a => a.id === dispatch.ambulanceId);
    
    return (
      <Card style={styles.dispatchCard}>
        <View style={styles.dispatchHeader}>
          <Text style={styles.dispatchId}>Dispatch #{dispatch.id || 'N/A'}</Text>
          <Text style={styles.dispatchTime}>
            {dispatch.dispatchTime ? new Date(dispatch.dispatchTime).toLocaleTimeString() : 'Time not available'}
          </Text>
        </View>
        
        <View style={styles.dispatchDetails}>
          <Text style={styles.dispatchAmbulance}>
            {ambulance?.callSign ? `${ambulance.callSign} →` : ''} Emergency #{dispatch.emergencyId || 'N/A'}
          </Text>
          <Text style={styles.dispatchStatus}>
            Status: {dispatch.status ? dispatch.status.replace('_', ' ').toUpperCase() : 'N/A'}
          </Text>
          <Text style={styles.dispatchEta}>
            ETA: {dispatch.estimatedArrival ? new Date(dispatch.estimatedArrival).toLocaleTimeString() : 'N/A'}
          </Text>
        </View>
      </Card>
    );
  };

  const DispatchModal = () => (
    <Modal
      visible={showDispatchModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDispatchModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dispatch {selectedAmbulance?.callSign || 'Ambulance'}</Text>
            <TouchableOpacity onPress={() => setShowDispatchModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>Select Emergency or Location</Text>
            
            {/* Emergency List */}
            <View style={styles.emergencyList}>
              {emergencies && emergencies.length > 0 ? (
                emergencies.map((emergency) => (
                  <TouchableOpacity
                    key={emergency.id}
                    style={styles.emergencyOption}
                    onPress={() => handleDispatchAmbulance(selectedAmbulance, emergency)}
                  >
                    <View style={styles.emergencyInfo}>
                      <Text style={styles.emergencyId}>#{emergency.id || 'N/A'}</Text>
                      <Text style={styles.emergencyLocation}>{emergency.location || 'Location not specified'}</Text>
                      <Text style={styles.emergencyType}>{emergency.type || 'Type not specified'}</Text>
                      {/* Add patient details */}
                      <Text style={styles.patientName}>{emergency.patientName || 'Patient name not available'}</Text>
                      <Text style={styles.patientPhone}>{emergency.phone || 'Phone not available'}</Text>
                    </View>
                    <View style={[styles.priorityIndicator, { 
                      backgroundColor: emergency.priority === 'critical' ? COLORS.EMERGENCY :
                                     emergency.priority === 'high' ? COLORS.WARNING : 
                                     emergency.priority === 'medium' ? COLORS.INFO : COLORS.GRAY_MEDIUM
                    }]} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noEmergenciesText}>No emergencies available</Text>
              )}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowDispatchModal(false)}
              style={styles.modalActionButton}
              variant="outline"
            />
            <Button
              title="Custom Location"
              onPress={() => Alert.alert('Feature Coming Soon', 'Custom location dispatch will be available soon.')}
              style={styles.modalActionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const FilterButton = ({ status, title, count, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        active && styles.activeFilterButtonText
      ]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const getFilterCounts = () => {
    return {
      all: ambulances ? ambulances.length : 0,
      available: ambulances ? ambulances.filter(a => a.status === 'available').length : 0,
      dispatched: ambulances ? ambulances.filter(a => a.status === 'dispatched').length : 0,
      on_scene: ambulances ? ambulances.filter(a => a.status === 'on_scene').length : 0
    };
  };

  const counts = getFilterCounts();
  const filteredAmbulances = filterStatus === 'all' 
    ? ambulances 
    : ambulances.filter(a => a.status === filterStatus);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Add Ambulance Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ambulance Dispatch</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowAddAmbulanceModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.headerButtonText}>Add Ambulance</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>{counts.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.WARNING }]}>{counts.dispatched}</Text>
          <Text style={styles.statLabel}>Dispatched</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.INFO }]}>{counts.on_scene}</Text>
          <Text style={styles.statLabel}>On Scene</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{counts.all}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <FilterButton
            status="all"
            title="All"
            count={counts.all}
            active={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
          />
          <FilterButton
            status="available"
            title="Available"
            count={counts.available}
            active={filterStatus === 'available'}
            onPress={() => setFilterStatus('available')}
          />
          <FilterButton
            status="dispatched"
            title="Dispatched"
            count={counts.dispatched}
            active={filterStatus === 'dispatched'}
            onPress={() => setFilterStatus('dispatched')}
          />
          <FilterButton
            status="on_scene"
            title="On Scene"
            count={counts.on_scene}
            active={filterStatus === 'on_scene'}
            onPress={() => setFilterStatus('on_scene')}
          />
        </ScrollView>
      </View>

      {/* Ambulances List */}
      <FlatList
        data={filteredAmbulances}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AmbulanceCard ambulance={item} />}
        style={styles.ambulanceList}
        contentContainerStyle={styles.ambulanceListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Ambulances Found</Text>
            <Text style={styles.emptySubtitle}>
              No ambulances match the current filter
            </Text>
            <Button
              title="Add Ambulance"
              onPress={() => setShowAddAmbulanceModal(true)}
              style={styles.addAmbulanceButton}
            />
          </Card>
        }
      />

      {showAddAmbulanceModal && !showMapModal && (
        <AddAmbulanceModal 
          visible={showAddAmbulanceModal && !showMapModal}
          onClose={() => setShowAddAmbulanceModal(false)}
          newAmbulance={newAmbulance}
          setNewAmbulance={setNewAmbulance}
          handleAddAmbulance={handleAddAmbulance}
          updateCrewMember={updateCrewMember}
          addCrewMember={addCrewMember}
          removeCrewMember={removeCrewMember}
          updateEquipment={updateEquipment}
          addEquipment={addEquipment}
          removeEquipment={removeEquipment}
          openMapForLocation={openMapForLocation}
          useCurrentLocation={useCurrentLocation}
        />
      )}
      
      {showMapModal && (
        <MapSelectionModal 
          visible={showMapModal}
          onClose={() => {
            console.log('MapSelectionModal onClose called');
            setShowMapModal(false);
            // Reopen the add ambulance modal
            setShowAddAmbulanceModal(true);
          }}
          newAmbulance={newAmbulance}
          setNewAmbulance={setNewAmbulance}
          setShowMapModal={setShowMapModal}
          setShowAddAmbulanceModal={setShowAddAmbulanceModal} // Add this prop
        />
      )}
      
      <DispatchModal />
    </SafeAreaView>
  );
};

// Add Ambulance Modal Component - NOW WITH MAP SELECTION
const AddAmbulanceModal = ({ 
  visible, 
  onClose, 
  newAmbulance, 
  setNewAmbulance, 
  handleAddAmbulance,
  updateCrewMember,
  addCrewMember,
  removeCrewMember,
  updateEquipment,
  addEquipment,
  removeEquipment,
  openMapForLocation,
  useCurrentLocation
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Ambulance</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Call Sign *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter call sign (e.g., AMB-001)"
              value={newAmbulance.callSign}
              onChangeText={(text) => setNewAmbulance({ ...newAmbulance, callSign: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setNewAmbulance({ ...newAmbulance, type: 'Basic Life Support' })}
              >
                <Text style={[styles.pickerText, newAmbulance.type === 'Basic Life Support' && styles.selectedPickerText]}>
                  Basic Life Support
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setNewAmbulance({ ...newAmbulance, type: 'Advanced Life Support' })}
              >
                <Text style={[styles.pickerText, newAmbulance.type === 'Advanced Life Support' && styles.selectedPickerText]}>
                  Advanced Life Support
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Select location from map"
              value={newAmbulance.currentLocation}
              editable={false}
            />
            <View style={styles.locationButtons}>
              <Button
                title="Select on Map"
                onPress={openMapForLocation}
                style={styles.locationButton}
              />
              <Button
                title="Use Current Location"
                onPress={useCurrentLocation}
                style={styles.locationButton}
                variant="outline"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Crew Members</Text>
            {newAmbulance.crew.map((member, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder={`Crew member ${index + 1}`}
                  value={member}
                  onChangeText={(text) => updateCrewMember(index, text)}
                />
                {newAmbulance.crew.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCrewMember(index)}
                  >
                    <Ionicons name="remove-circle" size={24} color={COLORS.ERROR} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addCrewMember}>
              <Ionicons name="add-circle" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.addButtonText}>Add Crew Member</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Equipment</Text>
            {newAmbulance.equipment.map((item, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder={`Equipment ${index + 1}`}
                  value={item}
                  onChangeText={(text) => updateEquipment(index, text)}
                />
                {newAmbulance.equipment.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeEquipment(index)}
                  >
                    <Ionicons name="remove-circle" size={24} color={COLORS.ERROR} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addEquipment}>
              <Ionicons name="add-circle" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.addButtonText}>Add Equipment</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fuel Level (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter fuel level"
              value={newAmbulance.fuelLevel.toString()}
              onChangeText={(text) => setNewAmbulance({ ...newAmbulance, fuelLevel: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Initial Status</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setNewAmbulance({ ...newAmbulance, status: 'available' })}
              >
                <Text style={[styles.pickerText, newAmbulance.status === 'available' && styles.selectedPickerText]}>
                  Available
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setNewAmbulance({ ...newAmbulance, status: 'out_of_service' })}
              >
                <Text style={[styles.pickerText, newAmbulance.status === 'out_of_service' && styles.selectedPickerText]}>
                  Out of Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            onPress={onClose}
            style={styles.modalActionButton}
            variant="outline"
          />
          <Button
            title="Add Ambulance"
            onPress={handleAddAmbulance}
            style={styles.modalActionButton}
          />
        </View>
      </View>
    </View>
  </Modal>
);

// Map Selection Modal
const MapSelectionModal = ({ 
  visible, 
  onClose, 
  newAmbulance, 
  setNewAmbulance,
  setShowMapModal,
  setShowAddAmbulanceModal // Add this prop
}) => {
  const mapRef = useRef(null);
  
  useEffect(() => {
    console.log('MapSelectionModal visible:', visible);
  }, [visible]);
  
  // Function to handle map press
  const handleMapPress = (e) => {
    console.log('Map pressed:', e.nativeEvent);
    const { coordinate } = e.nativeEvent;
    if (coordinate && coordinate.latitude !== undefined && coordinate.longitude !== undefined) {
      console.log('Setting location:', coordinate);
      setNewAmbulance(prev => ({
        ...prev,
        selectedLocation: { ...coordinate },
        currentLocation: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
      }));
    } else {
      console.log('Invalid coordinate:', coordinate);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.mapModalContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Select Location</Text>
          <TouchableOpacity 
            style={styles.mapCloseButton}
            onPress={() => {
              console.log('Close button pressed');
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
        
        <MapView
          ref={mapRef}
          style={styles.mapView}
          initialRegion={{
            latitude: 6.9271,
            longitude: 79.8612,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onPress={(e) => {
            console.log('MapView pressed:', e.nativeEvent);
            handleMapPress(e);
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          rotateEnabled={true}
          pitchEnabled={true}
          zoomEnabled={true}
          scrollEnabled={true}
          zoomControlEnabled={true}
          moveOnMarkerPress={false}
          onMapReady={() => console.log('Map is ready')}
          provider={MapView.PROVIDER_GOOGLE}
        >
          {newAmbulance.selectedLocation && (
            <Marker
              coordinate={newAmbulance.selectedLocation}
              pinColor={COLORS.EMERGENCY}
            />
          )}
        </MapView>
        
        <View style={styles.mapFooter}>
          <Text style={styles.mapInstruction}>
            Tap on the map to select a location
          </Text>
          {newAmbulance.selectedLocation && (
            <Button
              title="Confirm Location"
              onPress={() => {
                console.log('Confirm location pressed');
                setShowMapModal(false);
                // Reopen the add ambulance modal
                setShowAddAmbulanceModal(true);
              }}
              style={styles.confirmLocationButton}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
  statsHeader: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  statNumber: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  controlsContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  activeFilterButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: COLORS.WHITE,
  },
  ambulanceList: {
    flex: 1,
    padding: SPACING.MD,
  },
  ambulanceListContent: {
    gap: SPACING.MD,
  },
  ambulanceCard: {
    marginBottom: SPACING.MD,
    borderLeftWidth: 4,
  },
  ambulanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  ambulanceInfo: {
    flex: 1,
  },
  callSign: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  vehicleType: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  location: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.INFO,
    marginBottom: SPACING.XS / 2,
  },
  crew: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  ambulanceStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
    marginBottom: SPACING.XS,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    marginLeft: SPACING.XS / 2,
    fontWeight: '600',
  },
  eta: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  ambulanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    marginBottom: SPACING.SM,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  ambulanceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.SM,
    minWidth: 80,
    margin: SPACING.XS,
  },
  actionText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
  dispatchCard: {
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.PRIMARY + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  dispatchId: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  dispatchTime: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  dispatchDetails: {
    gap: SPACING.XS / 2,
  },
  dispatchAmbulance: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  dispatchStatus: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  dispatchEta: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  addAmbulanceButton: {
    marginTop: SPACING.MD,
  },
  // Map selection styles
  locationButtons: {
    flexDirection: 'row',
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  locationButton: {
    flex: 1,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  mapTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  mapCloseButton: {
    padding: SPACING.XS,
  },
  mapView: {
    flex: 1,
  },
  mapFooter: {
    padding: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  mapInstruction: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  confirmLocationButton: {
    marginTop: SPACING.SM,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: SPACING.MD,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  emergencyList: {
    maxHeight: 300,
  },
  emergencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyId: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  emergencyLocation: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  emergencyType: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  patientName: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  patientPhone: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noEmergenciesText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: SPACING.MD,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
  // New styles for Add Ambulance feature
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
  formGroup: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  flexInput: {
    flex: 1,
    marginRight: SPACING.XS,
  },
  removeButton: {
    padding: SPACING.XS,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  addButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
  pickerContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.MD,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  selectedPickerText: {
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  locationButtons: {
    flexDirection: 'row',
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  locationButton: {
    flex: 1,
  },
  addAmbulanceButton: {
    marginTop: SPACING.MD,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  mapTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  mapCloseButton: {
    padding: SPACING.XS,
  },
  mapView: {
    flex: 1,
  },
  mapFooter: {
    padding: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  mapInstruction: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  confirmLocationButton: {
    marginTop: SPACING.SM,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AmbulanceDispatchScreen;