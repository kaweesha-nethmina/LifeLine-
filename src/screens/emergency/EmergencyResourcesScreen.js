import React, { useState, useEffect } from 'react';
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
  TextInput
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';

const EmergencyResourcesScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [resources, setResources] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    loadResources();
    // Set up real-time updates
    const interval = setInterval(loadResources, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadResources = async () => {
    try {
      // Fetch resources from Firebase
      // Removed orderBy to avoid composite index requirement
      const resourcesQuery = query(
        collection(db, 'emergencyResources')
        // Removed orderBy('lastUpdated', 'desc') to avoid composite index
      );
      
      const resourcesSnapshot = await getDocs(resourcesQuery);
      const resourcesData = [];
      
      resourcesSnapshot.forEach((doc) => {
        resourcesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      resourcesData.sort((a, b) => {
        const dateA = a.lastUpdated ? (typeof a.lastUpdated.toDate === 'function' ? a.lastUpdated.toDate() : a.lastUpdated) : new Date(0);
        const dateB = b.lastUpdated ? (typeof b.lastUpdated.toDate === 'function' ? b.lastUpdated.toDate() : b.lastUpdated) : new Date(0);
        return new Date(dateB) - new Date(dateA);
      });
      
      setResources(resourcesData);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResources();
    setRefreshing(false);
  };

  const handleResourceAction = async (resource, action) => {
    switch (action) {
      case 'request':
        setSelectedResource(resource);
        setShowRequestModal(true);
        break;
      case 'contact':
        Alert.alert('Contact Resource', `Contacting ${resource.contactPerson} at ${resource.phone}...`);
        break;
      case 'location':
        Alert.alert('Feature Coming Soon', 'GPS navigation to resource location will be available soon.');
        break;
      case 'reserve':
        Alert.alert(
          'Reserve Resource',
          `Reserve ${resource.name} for emergency use?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reserve',
              onPress: async () => {
                try {
                  // Update resource status in Firebase
                  const resourceRef = doc(db, 'emergencyResources', resource.id);
                  await updateDoc(resourceRef, {
                    status: 'reserved',
                    lastUpdated: serverTimestamp()
                  });
                  
                  // Update local state
                  const updatedResources = resources.map(r =>
                    r.id === resource.id ? { ...r, status: 'reserved' } : r
                  );
                  setResources(updatedResources);
                  
                  Alert.alert('Success', `${resource.name} has been reserved.`);
                } catch (error) {
                  console.error('Error reserving resource:', error);
                  Alert.alert('Error', 'Failed to reserve resource');
                }
              }
            }
          ]
        );
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return COLORS.SUCCESS;
      case 'in_use':
        return COLORS.WARNING;
      case 'reserved':
        return COLORS.INFO;
      case 'maintenance':
        return COLORS.ERROR;
      case 'unavailable':
        return COLORS.GRAY_MEDIUM;
      default:
        return COLORS.TEXT_SECONDARY;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return 'checkmark-circle';
      case 'in_use':
        return 'play-circle';
      case 'reserved':
        return 'bookmark';
      case 'maintenance':
        return 'construct';
      case 'unavailable':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medical':
        return 'medical';
      case 'equipment':
        return 'hardware-chip';
      case 'vehicle':
        return 'car-sport';
      case 'facility':
        return 'business';
      case 'personnel':
        return 'people';
      default:
        return 'cube';
    }
  };

  const ResourceCard = ({ resource }) => (
    <Card style={[styles.resourceCard, { borderLeftColor: getStatusColor(resource.status) }]}>
      <View style={styles.resourceHeader}>
        <View style={styles.resourceInfo}>
          <View style={styles.resourceTitleRow}>
            <Ionicons 
              name={getCategoryIcon(resource.category)} 
              size={20} 
              color={COLORS.PRIMARY} 
            />
            <Text style={styles.resourceName}>{resource.name}</Text>
          </View>
          <Text style={styles.resourceCategory}>{resource.category ? resource.category.toUpperCase() : 'N/A'}</Text>
          <Text style={styles.resourceDescription}>{resource.description}</Text>
          <Text style={styles.resourceLocation}>📍 {resource.location}</Text>
        </View>
        <View style={styles.resourceStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(resource.status) }]}>
            <Ionicons 
              name={getStatusIcon(resource.status)} 
              size={12} 
              color={COLORS.WHITE} 
            />
            <Text style={styles.statusText}>
              {resource.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.resourceQuantity}>Qty: {resource.quantity}</Text>
        </View>
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Contact:</Text>
          <Text style={styles.detailValue}>{resource.contactPerson}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{resource.phone}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Last Updated:</Text>
          <Text style={styles.detailValue}>{resource.lastUpdated}</Text>
        </View>
      </View>

      <View style={styles.resourceActions}>
        {resource.status === 'available' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.PRIMARY }]}
              onPress={() => handleResourceAction(resource, 'request')}
            >
              <Ionicons name="send" size={16} color={COLORS.WHITE} />
              <Text style={styles.actionText}>Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.INFO }]}
              onPress={() => handleResourceAction(resource, 'reserve')}
            >
              <Ionicons name="bookmark" size={16} color={COLORS.WHITE} />
              <Text style={styles.actionText}>Reserve</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.SUCCESS }]}
          onPress={() => handleResourceAction(resource, 'contact')}
        >
          <Ionicons name="call" size={16} color={COLORS.WHITE} />
          <Text style={styles.actionText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.WARNING }]}
          onPress={() => handleResourceAction(resource, 'location')}
        >
          <Ionicons name="location" size={16} color={COLORS.WHITE} />
          <Text style={styles.actionText}>Location</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const CategoryButton = ({ category, title, icon, count, active, onPress }) => (
    <TouchableOpacity
      style={[styles.categoryButton, active && styles.activeCategoryButton]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={active ? COLORS.WHITE : COLORS.PRIMARY} 
      />
      <Text style={[
        styles.categoryButtonText,
        active && styles.activeCategoryButtonText
      ]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const RequestModal = () => {
    const [requestReason, setRequestReason] = useState('');
    const [urgencyLevel, setUrgencyLevel] = useState('medium');

    const submitRequest = () => {
      if (!requestReason.trim()) {
        Alert.alert('Error', 'Please provide a reason for the request.');
        return;
      }

      Alert.alert(
        'Request Submitted',
        `Your request for ${selectedResource?.name} has been submitted and will be processed shortly.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRequestModal(false);
              setRequestReason('');
              setUrgencyLevel('medium');
            }
          }
        ]
      );
    };

    if (!selectedResource) return null;

    return (
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Resource</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.resourceRequestName}>{selectedResource.name}</Text>
              <Text style={styles.resourceRequestDescription}>
                {selectedResource.description}
              </Text>

              <Text style={styles.inputLabel}>Urgency Level</Text>
              <View style={styles.urgencyButtons}>
                {['low', 'medium', 'high', 'critical'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.urgencyButton,
                      urgencyLevel === level && styles.activeUrgencyButton
                    ]}
                    onPress={() => setUrgencyLevel(level)}
                  >
                    <Text style={[
                      styles.urgencyButtonText,
                      urgencyLevel === level && styles.activeUrgencyButtonText
                    ]}>
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Reason for Request</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describe why this resource is needed..."
                value={requestReason}
                onChangeText={setRequestReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowRequestModal(false)}
                style={styles.modalActionButton}
                variant="outline"
              />
              <Button
                title="Submit Request"
                onPress={submitRequest}
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getFilteredResources = () => {
    let filtered = resources;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(resource => resource.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getCategoryCounts = () => {
    return {
      all: resources.length,
      medical: resources.filter(r => r.category === 'medical').length,
      equipment: resources.filter(r => r.category === 'equipment').length,
      vehicle: resources.filter(r => r.category === 'vehicle').length,
      facility: resources.filter(r => r.category === 'facility').length,
      personnel: resources.filter(r => r.category === 'personnel').length
    };
  };

  const counts = getCategoryCounts();
  const filteredResources = getFilteredResources();

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.GRAY_MEDIUM} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.GRAY_MEDIUM} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <CategoryButton
            category="all"
            title="All"
            icon="grid"
            count={counts.all}
            active={selectedCategory === 'all'}
            onPress={() => setSelectedCategory('all')}
          />
          <CategoryButton
            category="medical"
            title="Medical"
            icon="medical"
            count={counts.medical}
            active={selectedCategory === 'medical'}
            onPress={() => setSelectedCategory('medical')}
          />
          <CategoryButton
            category="equipment"
            title="Equipment"
            icon="hardware-chip"
            count={counts.equipment}
            active={selectedCategory === 'equipment'}
            onPress={() => setSelectedCategory('equipment')}
          />
          <CategoryButton
            category="vehicle"
            title="Vehicles"
            icon="car-sport"
            count={counts.vehicle}
            active={selectedCategory === 'vehicle'}
            onPress={() => setSelectedCategory('vehicle')}
          />
          <CategoryButton
            category="facility"
            title="Facilities"
            icon="business"
            count={counts.facility}
            active={selectedCategory === 'facility'}
            onPress={() => setSelectedCategory('facility')}
          />
          <CategoryButton
            category="personnel"
            title="Personnel"
            icon="people"
            count={counts.personnel}
            active={selectedCategory === 'personnel'}
            onPress={() => setSelectedCategory('personnel')}
          />
        </ScrollView>
      </View>

      {/* Resources List */}
      <ScrollView
        style={styles.resourcesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredResources.length === 0 ? (
          <Card style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={COLORS.GRAY_MEDIUM} />
            <Text style={styles.emptyTitle}>No Resources Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? `No resources match "${searchQuery}"` 
                : 'No resources in this category'
              }
            </Text>
          </Card>
        ) : (
          filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))
        )}
      </ScrollView>

      <RequestModal />
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  searchContainer: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.INPUT_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  categoryContainer: {
    backgroundColor: theme.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    backgroundColor: theme.BUTTON_SECONDARY,
  },
  activeCategoryButton: {
    backgroundColor: theme.PRIMARY,
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    fontWeight: '500',
    marginLeft: SPACING.XS,
  },
  activeCategoryButtonText: {
    color: theme.WHITE,
  },
  resourcesList: {
    flex: 1,
    padding: SPACING.MD,
  },
  resourceCard: {
    marginBottom: SPACING.MD,
    borderLeftWidth: 4,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS / 2,
  },
  resourceName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  resourceCategory: {
    fontSize: FONT_SIZES.XS,
    color: theme.PRIMARY,
    fontWeight: 'bold',
    marginBottom: SPACING.XS / 2,
  },
  resourceDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: SPACING.XS / 2,
  },
  resourceLocation: {
    fontSize: FONT_SIZES.SM,
    color: theme.INFO,
  },
  resourceStatus: {
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
    color: theme.WHITE,
    marginLeft: SPACING.XS / 2,
    fontWeight: '600',
  },
  resourceQuantity: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  resourceDetails: {
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
    marginBottom: SPACING.SM,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS / 2,
  },
  detailLabel: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_PRIMARY,
    fontWeight: '600',
  },
  resourceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
    gap: SPACING.XS,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    minWidth: 65,
    flex: 1,
    maxWidth: '48%',
  },
  actionText: {
    fontSize: FONT_SIZES.XS,
    color: theme.WHITE,
    fontWeight: 'bold',
    marginLeft: SPACING.XS / 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
    marginTop: SPACING.XL,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.CARD_BACKGROUND,
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
    color: theme.TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: SPACING.MD,
  },
  resourceRequestName: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.PRIMARY,
    marginBottom: SPACING.XS,
  },
  resourceRequestDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    marginTop: SPACING.SM,
  },
  urgencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: theme.BUTTON_SECONDARY,
    marginHorizontal: SPACING.XS / 2,
    alignItems: 'center',
  },
  activeUrgencyButton: {
    backgroundColor: theme.EMERGENCY,
  },
  urgencyButtonText: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    fontWeight: 'bold',
  },
  activeUrgencyButtonText: {
    color: theme.WHITE,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    minHeight: 100,
    backgroundColor: theme.INPUT_BACKGROUND,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },
});

export default EmergencyResourcesScreen;