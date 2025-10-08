import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { fetchFirstAidGuides, seedFirstAidGuides } from '../../services/firstAidService';
import { db } from '../../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const FirstAidManagementScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [firstAidGuides, setFirstAidGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'emergency',
    difficulty: 'Beginner',
    time: '',
    description: '',
    icon: 'medical',
    color: COLORS.EMERGENCY,
    steps: []
  });

  // Load First Aid Guides
  useEffect(() => {
    loadFirstAidGuides();
  }, []);

  const loadFirstAidGuides = async () => {
    try {
      setLoading(true);
      const guides = await fetchFirstAidGuides();
      setFirstAidGuides(guides);
    } catch (error) {
      console.error('Error loading First Aid Guides:', error);
      Alert.alert('Error', 'Failed to load First Aid Guides');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Handle step input changes
  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    setFormData({
      ...formData,
      steps: updatedSteps
    });
  };

  // Add a new step
  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { step: formData.steps.length + 1, title: '', description: '', tips: '' }
      ]
    });
  };

  // Remove a step
  const removeStep = (index) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index);
    // Re-number steps
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      step: i + 1
    }));
    setFormData({
      ...formData,
      steps: renumberedSteps
    });
  };

  // Open modal for adding/editing
  const openModal = (guide = null) => {
    if (guide) {
      setFormData({
        ...guide,
        steps: guide.steps || []
      });
      setIsEditing(true);
      setSelectedGuide(guide);
    } else {
      setFormData({
        title: '',
        category: 'emergency',
        difficulty: 'Beginner',
        time: '',
        description: '',
        icon: 'medical',
        color: COLORS.EMERGENCY,
        steps: [{ step: 1, title: '', description: '', tips: '' }]
      });
      setIsEditing(false);
      setSelectedGuide(null);
    }
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedGuide(null);
  };

  // Save guide (add or update)
  const saveGuide = async () => {
    try {
      if (isEditing) {
        // Update existing guide
        const guideRef = doc(db, 'firstAidGuides', selectedGuide.id);
        await updateDoc(guideRef, {
          ...formData,
          updatedAt: new Date()
        });
        Alert.alert('Success', 'First Aid Guide updated successfully');
      } else {
        // Add new guide
        await addDoc(collection(db, 'firstAidGuides'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        Alert.alert('Success', 'First Aid Guide added successfully');
      }
      
      closeModal();
      loadFirstAidGuides(); // Refresh the list
    } catch (error) {
      console.error('Error saving guide:', error);
      Alert.alert('Error', 'Failed to save First Aid Guide');
    }
  };

  // Delete guide
  const deleteGuide = async (guide) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${guide.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const guideRef = doc(db, 'firstAidGuides', guide.id);
              await deleteDoc(guideRef);
              Alert.alert('Success', 'First Aid Guide deleted successfully');
              loadFirstAidGuides(); // Refresh the list
            } catch (error) {
              console.error('Error deleting guide:', error);
              Alert.alert('Error', 'Failed to delete First Aid Guide');
            }
          }
        }
      ]
    );
  };

  // Render a guide item
  const renderGuideItem = ({ item }) => (
    <Card style={styles.guideCard}>
      <View style={styles.guideHeader}>
        <View style={[styles.guideIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={24} color={COLORS.WHITE} />
        </View>
        <View style={styles.guideInfo}>
          <Text style={styles.guideTitle}>{item.title}</Text>
          <Text style={styles.guideDescription}>{item.description}</Text>
          <View style={styles.guideMeta}>
            <Text style={styles.metaText}>{item.category}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>{item.difficulty}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openModal(item)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.WHITE} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteGuide(item)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.WHITE} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>First Aid Guide Management</Text>
        <Text style={styles.subtitle}>Create, update, and manage First Aid Guides</Text>
      </View>

      <View style={styles.actionsContainer}>
        <Button
          title="Add New Guide"
          onPress={() => openModal()}
          icon={<Ionicons name="add" size={20} color={COLORS.WHITE} />}
          style={styles.addButton}
        />
        <Button
          title="Refresh Guides"
          onPress={loadFirstAidGuides}
          variant="outline"
          icon={<Ionicons name="refresh" size={20} color={COLORS.PRIMARY} />}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading First Aid Guides...</Text>
        </View>
      ) : (
        <FlatList
          data={firstAidGuides}
          keyExtractor={(item) => item.id}
          renderItem={renderGuideItem}
          contentContainerStyle={styles.guidesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={COLORS.GRAY_MEDIUM} />
              <Text style={styles.emptyText}>No First Aid Guides found</Text>
              <Text style={styles.emptySubtext}>Create your first guide by tapping "Add New Guide"</Text>
            </View>
          }
        />
      )}

      {/* Modal for adding/editing guides */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit First Aid Guide' : 'Add New First Aid Guide'}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>Guide Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(value) => handleInputChange('title', value)}
                  placeholder="Enter guide title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Enter guide description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.category}
                    onChangeText={(value) => handleInputChange('category', value)}
                    placeholder="e.g., emergency, wounds"
                  />
                </View>

                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Difficulty</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.difficulty}
                    onChangeText={(value) => handleInputChange('difficulty', value)}
                    placeholder="e.g., Beginner"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Time Required</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.time}
                    onChangeText={(value) => handleInputChange('time', value)}
                    placeholder="e.g., 5-10 minutes"
                  />
                </View>

                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Icon Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.icon}
                    onChangeText={(value) => handleInputChange('icon', value)}
                    placeholder="e.g., medical"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Color (Hex)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.color}
                  onChangeText={(value) => handleInputChange('color', value)}
                  placeholder="e.g., #E53E3E"
                />
              </View>
            </Card>

            <Card style={styles.formCard}>
              <View style={styles.stepsHeader}>
                <Text style={styles.formTitle}>Steps</Text>
                <Button
                  title="Add Step"
                  onPress={addStep}
                  size="small"
                  icon={<Ionicons name="add" size={16} color={COLORS.WHITE} />}
                />
              </View>

              {formData.steps.map((step, index) => (
                <View key={index} style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepNumber}>Step {step.step}</Text>
                    {formData.steps.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeStep(index)}
                        style={styles.removeStepButton}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                      style={styles.input}
                      value={step.title}
                      onChangeText={(value) => handleStepChange(index, 'title', value)}
                      placeholder="Enter step title"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={step.description}
                      onChangeText={(value) => handleStepChange(index, 'description', value)}
                      placeholder="Enter step description"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tips</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={step.tips}
                      onChangeText={(value) => handleStepChange(index, 'tips', value)}
                      placeholder="Enter helpful tips"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={closeModal}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title={isEditing ? "Update Guide" : "Add Guide"}
              onPress={saveGuide}
              style={styles.saveButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingVertical: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  addButton: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  guidesList: {
    padding: SPACING.MD,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyText: {
    fontSize: FONT_SIZES.LG,
    color: theme.TEXT_PRIMARY,
    fontWeight: 'bold',
    marginTop: SPACING.MD,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    marginTop: SPACING.XS,
    textAlign: 'center',
  },
  guideCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  guideIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  guideInfo: {
    flex: 1,
  },
  guideTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  guideDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  guideMeta: {
    flexDirection: 'row',
  },
  metaText: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
    marginRight: SPACING.XS,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.SM,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.ERROR,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
  },
  actionButtonText: {
    color: theme.WHITE,
    fontWeight: 'bold',
    marginLeft: SPACING.XS,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  closeButton: {
    padding: SPACING.XS,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.MD,
  },
  formCard: {
    marginBottom: SPACING.MD,
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
  },
  formTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.SM,
    padding: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    backgroundColor: theme.INPUT_BACKGROUND,
    color: theme.TEXT_PRIMARY,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  stepContainer: {
    marginBottom: SPACING.LG,
    padding: SPACING.MD,
    backgroundColor: theme.BUTTON_SECONDARY,
    borderRadius: BORDER_RADIUS.SM,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  stepNumber: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  removeStepButton: {
    padding: SPACING.XS,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  cancelButton: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  saveButton: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
});

export default FirstAidManagementScreen;