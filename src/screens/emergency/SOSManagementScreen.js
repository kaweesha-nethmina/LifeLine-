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
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  EMERGENCY_STATUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const SOSManagementScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [filteredEmergencies, setFilteredEmergencies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const emergenciesListenerRef = useRef(null);

  useEffect(() => {
    loadEmergencies();
    return () => {
      // Clean up listener when component unmounts
      if (emergenciesListenerRef.current) {
        emergenciesListenerRef.current();
      }
    };
  }, []);

  useEffect(() => {
    filterEmergencies();
  }, [emergencies, searchQuery, filterStatus]);

  const loadEmergencies = async () => {
    try {
      // Set up real-time listener for emergencies
      // Removed orderBy to avoid composite index requirement
      const emergenciesQuery = query(
        collection(db, 'emergencies')
        // Removed orderBy('timestamp', 'desc') to avoid composite index
      );
      
      emergenciesListenerRef.current = onSnapshot(emergenciesQuery, (snapshot) => {
        const emergenciesData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Handle timestamp conversion properly
          const timestamp = data.timestamp ? 
            (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : data.timestamp) : 
            new Date();
          const createdAt = data.createdAt ? 
            (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : data.createdAt) : 
            new Date();
          const updatedAt = data.updatedAt ? 
            (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt) : 
            new Date();
          
          emergenciesData.push({
            id: doc.id,
            ...data,
            timestamp,
            createdAt,
            updatedAt
          });
        });
        
        // Sort in memory instead of using Firestore orderBy
        emergenciesData.sort((a, b) => {
          const dateA = a.timestamp || new Date(0);
          const dateB = b.timestamp || new Date(0);
          return dateB - dateA; // Descending order (newest first)
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
    await loadEmergencies();
    setRefreshing(false);
  };

  const filterEmergencies = () => {
    let filtered = emergencies;

    if (searchQuery) {
      filtered = filtered.filter(emergency =>
        emergency.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emergency.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emergency.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(emergency => emergency.status === filterStatus);
    }

    setFilteredEmergencies(filtered);
  };

  const updateEmergencyStatus = async (emergencyId, newStatus) => {
    try {
      const emergencyRef = doc(db, 'emergencies', emergencyId);
      await updateDoc(emergencyRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      console.log(`Emergency ${emergencyId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating emergency status:', error);
      Alert.alert('Error', 'Failed to update emergency status');
    }
  };

  const handleEmergencyAction = (emergency, action) => {
    switch (action) {
      case 'respond':
        Alert.alert(
          'Respond to Emergency',
          `Assign emergency response unit to ${emergency.patientName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Assign Unit',
              onPress: async () => {
                await updateEmergencyStatus(emergency.id, EMERGENCY_STATUS.IN_PROGRESS);
                Alert.alert('Success', 'Emergency response unit assigned.');
              }
            }
          ]
        );
        break;
      case 'dispatch':
        navigation.navigate('Dispatch', { emergencyId: emergency.id });
        break;
      case 'call':
        Alert.alert('Emergency Call', `Calling ${emergency.patientName} at ${emergency.phone}...`);
        break;
      case 'close':
        Alert.alert(
          'Close Emergency',
          `Mark emergency ${emergency.id} as resolved?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Close',
              style: 'destructive',
              onPress: async () => {
                await updateEmergencyStatus(emergency.id, EMERGENCY_STATUS.COMPLETED);
                Alert.alert('Success', 'Emergency marked as resolved.');
              }
            }
          ]
        );
        break;
      default:
        break;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return COLORS.EMERGENCY;
      case 'high':
        return COLORS.WARNING;
      case 'medium':
        return COLORS.INFO;
      case 'low':
        return COLORS.SUCCESS;
      default:
        return COLORS.GRAY_MEDIUM;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case EMERGENCY_STATUS.PENDING:
        return COLORS.EMERGENCY;
      case EMERGENCY_STATUS.ASSIGNED:
        return COLORS.WARNING;
      case EMERGENCY_STATUS.IN_PROGRESS:
        return COLORS.INFO;
      case EMERGENCY_STATUS.COMPLETED:
        return COLORS.SUCCESS;
      case EMERGENCY_STATUS.CANCELLED:
        return COLORS.GRAY_MEDIUM;
      default:
        return COLORS.INFO;
    }
  };

  const EmergencyCard = ({ emergency }) => (
    <Card style={[styles.emergencyCard, { borderLeftColor: getPriorityColor(emergency.priority) }]}>
      <TouchableOpacity onPress={() => {
        setSelectedEmergency(emergency);
        setShowDetailModal(true);
      }}>
        <View style={styles.emergencyHeader}>
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyId}>#{emergency.id}</Text>
            <Text style={styles.patientName}>{emergency.patientName}</Text>
            <Text style={styles.emergencyType}>{emergency.type}</Text>
            <Text style={styles.emergencyTime}>{formatTimestamp(emergency.timestamp)}</Text>
          </View>
          <View style={styles.emergencyMeta}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(emergency.priority) }]}>
              <Text style={styles.priorityText}>{emergency.priority ? emergency.priority.toUpperCase() : 'N/A'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(emergency.status) }]}>
              <Text style={styles.statusText}>{emergency.status ? emergency.status.replace('_', ' ').toUpperCase() : 'N/A'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.emergencyLocation}>📍 {emergency.location}</Text>
        <Text style={styles.emergencyDescription}>{emergency.description}</Text>
      </TouchableOpacity>

      <View style={styles.emergencyActions}>
        {emergency.status === EMERGENCY_STATUS.PENDING && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.SUCCESS }]}
              onPress={() => handleEmergencyAction(emergency, 'respond')}
            >
              <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
              <Text style={styles.actionText}>Respond</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.PRIMARY }]}
              onPress={() => handleEmergencyAction(emergency, 'dispatch')}
            >
              <Ionicons name="car-sport" size={16} color={COLORS.WHITE} />
              <Text style={styles.actionText}>Dispatch</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.INFO }]}
          onPress={() => handleEmergencyAction(emergency, 'call')}
        >
          <Ionicons name="call" size={16} color={COLORS.WHITE} />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>

        {[EMERGENCY_STATUS.PENDING, EMERGENCY_STATUS.ASSIGNED, EMERGENCY_STATUS.IN_PROGRESS].includes(emergency.status) && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.ERROR }]}
            onPress={() => handleEmergencyAction(emergency, 'close')}
          >
            <Ionicons name="close" size={16} color={COLORS.WHITE} />
            <Text style={styles.actionText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };

  const getFilterCounts = () => {
    return {
      all: emergencies.length,
      pending: emergencies.filter(e => e.status === EMERGENCY_STATUS.PENDING).length,
      assigned: emergencies.filter(e => e.status === EMERGENCY_STATUS.ASSIGNED).length,
      in_progress: emergencies.filter(e => e.status === EMERGENCY_STATUS.IN_PROGRESS).length,
      completed: emergencies.filter(e => e.status === EMERGENCY_STATUS.COMPLETED).length
    };
  };

  const counts = getFilterCounts();

  const EmergencyDetailModal = () => {
    if (!selectedEmergency) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency #{selectedEmergency.id}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Patient Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.patientName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Age:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.age} years</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Medical History:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.medicalHistory}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Emergency Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priority:</Text>
                  <Text style={[styles.detailValue, { color: getPriorityColor(selectedEmergency.priority) }]}>
                    {selectedEmergency.priority ? selectedEmergency.priority.toUpperCase() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedEmergency.status) }]}>
                    {selectedEmergency.status ? selectedEmergency.status.replace('_', ' ').toUpperCase() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{selectedEmergency.description}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="View on Map"
                onPress={() => {
                  setShowDetailModal(false);
                  Alert.alert('Feature Coming Soon', 'Map view will be available soon.');
                }}
                style={styles.modalActionButton}
                variant="outline"
              />
              <Button
                title="Dispatch Unit"
                onPress={() => {
                  setShowDetailModal(false);
                  handleEmergencyAction(selectedEmergency, 'dispatch');
                }}
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.EMERGENCY }]}>{counts.pending}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.WARNING }]}>{counts.assigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.INFO }]}>{counts.in_progress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>{counts.completed}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.GRAY_MEDIUM} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search emergencies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <FilterButton
            status="all"
            title="All"
            count={counts.all}
            active={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
          />
          <FilterButton
            status={EMERGENCY_STATUS.PENDING}
            title="Active"
            count={counts.pending}
            active={filterStatus === EMERGENCY_STATUS.PENDING}
            onPress={() => setFilterStatus(EMERGENCY_STATUS.PENDING)}
          />
          <FilterButton
            status={EMERGENCY_STATUS.ASSIGNED}
            title="Assigned"
            count={counts.assigned}
            active={filterStatus === EMERGENCY_STATUS.ASSIGNED}
            onPress={() => setFilterStatus(EMERGENCY_STATUS.ASSIGNED)}
          />
          <FilterButton
            status={EMERGENCY_STATUS.IN_PROGRESS}
            title="In Progress"
            count={counts.in_progress}
            active={filterStatus === EMERGENCY_STATUS.IN_PROGRESS}
            onPress={() => setFilterStatus(EMERGENCY_STATUS.IN_PROGRESS)}
          />
          <FilterButton
            status={EMERGENCY_STATUS.COMPLETED}
            title="Resolved"
            count={counts.completed}
            active={filterStatus === EMERGENCY_STATUS.COMPLETED}
            onPress={() => setFilterStatus(EMERGENCY_STATUS.COMPLETED)}
          />
        </ScrollView>
      </View>

      {/* Emergency List */}
      <FlatList
        data={filteredEmergencies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EmergencyCard emergency={item} />}
        style={styles.emergencyList}
        contentContainerStyle={styles.emergencyListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <Ionicons name="warning-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Emergencies Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? `No emergencies match "${searchQuery}"` : 'No emergencies in this category'}
            </Text>
          </Card>
        }
      />

      <EmergencyDetailModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
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
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  activeFilterButton: {
    backgroundColor: COLORS.EMERGENCY,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: COLORS.WHITE,
  },
  emergencyList: {
    flex: 1,
  },
  emergencyListContent: {
    padding: SPACING.MD,
  },
  emergencyCard: {
    marginBottom: SPACING.MD,
    borderLeftWidth: 4,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyId: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginBottom: SPACING.XS / 2,
  },
  patientName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  emergencyType: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  emergencyTime: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.GRAY_MEDIUM,
  },
  emergencyMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
    marginBottom: SPACING.XS,
  },
  priorityText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS / 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  emergencyLocation: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.INFO,
    marginBottom: SPACING.SM,
  },
  emergencyDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    marginBottom: SPACING.MD,
  },
  emergencyActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.MD,
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
  },
  actionText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.WHITE,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
    marginTop: SPACING.XL,
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
    paddingHorizontal: SPACING.MD,
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
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  detailLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default SOSManagementScreen;