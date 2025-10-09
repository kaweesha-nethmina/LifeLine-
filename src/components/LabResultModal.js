import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import {
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from './Card';
import Button from './Button';
import { db } from '../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const LabResultModal = ({ 
  visible, 
  onClose, 
  labResult,
  currentUser,
  onDelete, // Add onDelete function for patient to delete their own lab results
  onChatPress // Add onChatPress function for chat navigation
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewFile = async () => {
    if (labResult?.fileUrl) {
      console.log('Attempting to open file URL:', labResult.fileUrl);
      setLoadingFile(true);
      setFileError(false);
      
      try {
        // Check if the URL can be opened
        const supported = await Linking.canOpenURL(labResult.fileUrl);
        console.log('URL supported for opening:', supported);
        
        if (supported) {
          // Open the document in the device's default viewer
          await Linking.openURL(labResult.fileUrl);
        } else {
          // Fallback: Show alert with URL
          Alert.alert(
            'View Document',
            `Document URL: ${labResult.fileUrl}`,
            [
              { text: 'OK' },
              {
                text: 'Copy URL',
                onPress: () => {
                  // In a real app, you might copy to clipboard here
                  Alert.alert('Info', 'URL copied to clipboard (feature coming soon)');
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error opening document:', error);
        Alert.alert('Error', 'Unable to open document. Please try again.');
      } finally {
        setLoadingFile(false);
      }
    }
  };

  const handleDownloadFile = async () => {
    if (!labResult?.fileUrl) {
      console.log('No file URL available for download');
      Alert.alert('Error', 'No file available for download');
      return;
    }
    
    console.log('Attempting to download file:', labResult.fileUrl);
    
    try {
      setDownloading(true);
      
      // Check if sharing is available
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'File sharing is not available on your device.');
        setDownloading(false);
        return;
      }
      
      // Create a safe filename
      const fileExtension = getFileExtension();
      const timestamp = Date.now();
      const safeFileName = `${(labResult.title || 'lab_result').replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
      
      // Try multiple approaches for file download
      console.log('FileSystem cacheDirectory:', FileSystem.cacheDirectory);
      console.log('FileSystem documentDirectory:', FileSystem.documentDirectory);
      
      // Approach 1: Try with just the filename (let system handle path)
      try {
        console.log('Attempting download with just filename:', safeFileName);
        const { status, uri } = await FileSystem.downloadAsync(labResult.fileUrl, safeFileName);
        console.log('Simple filename download result:', { status, uri });
        
        if (status === 200 && uri) {
          await Sharing.shareAsync(uri);
          return;
        }
      } catch (simpleError) {
        console.log('Simple filename approach failed:', simpleError.message);
      }
      
      // Approach 2: Try with common directory patterns
      const commonDirectories = [
        FileSystem.cacheDirectory,
        FileSystem.documentDirectory,
        '/tmp/',  // Common temp directory on some systems
        './',     // Current directory
        ''        // Empty string
      ].filter(Boolean); // Remove null/undefined values
      
      console.log('Common directories to try:', commonDirectories);
      
      // If we have directories to try, attempt downloads
      if (commonDirectories.length > 0) {
        for (const directory of commonDirectories) {
          try {
            // Normalize directory path
            let normalizedDirectory = directory;
            if (directory && !directory.endsWith('/')) {
              normalizedDirectory = directory + '/';
            }
            
            const localUri = normalizedDirectory ? `${normalizedDirectory}${safeFileName}` : safeFileName;
            console.log('Trying download to:', localUri);
            
            const { status, uri } = await FileSystem.downloadAsync(labResult.fileUrl, localUri);
            console.log('Download attempt result:', { status, uri });
            
            if (status === 200 && uri) {
              await Sharing.shareAsync(uri);
              return;
            }
          } catch (dirError) {
            console.log('Download failed for directory:', directory, 'Error:', dirError.message);
            continue;
          }
        }
      }
      
      // Approach 3: Final fallback - try to open the URL directly
      console.log('All download approaches failed, trying to open URL directly');
      try {
        const supported = await Linking.canOpenURL(labResult.fileUrl);
        if (supported) {
          await Linking.openURL(labResult.fileUrl);
          setDownloading(false);
          return;
        }
      } catch (linkingError) {
        console.log('Direct URL opening failed:', linkingError.message);
      }
      
      // If we get here, all approaches failed
      Alert.alert('Download Failed', 'Unable to download the file. You can try opening the file directly in your browser by copying this URL: ' + labResult.fileUrl);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', `Failed to download the file: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteLabResult = () => {
    if (!labResult?.id || !currentUser?.uid) {
      Alert.alert('Error', 'Unable to delete lab result');
      return;
    }
    
    Alert.alert(
      'Delete Lab Result',
      `Are you sure you want to delete "${labResult.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              
              // Delete the lab result from Firestore
              const labResultRef = doc(db, 'users', currentUser.uid, 'labResults', labResult.id);
              await deleteDoc(labResultRef);
              
              // Call the onDelete callback if provided
              if (onDelete) {
                onDelete(labResult.id);
              }
              
              // Close the modal and show success message
              onClose();
              Alert.alert('Success', 'Lab result deleted successfully!');
            } catch (error) {
              console.error('Error deleting lab result:', error);
              Alert.alert('Error', `Failed to delete lab result: ${error.message}`);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Add function to handle chat navigation
  const handleOpenChat = () => {
    // Close the modal first
    onClose();
    
    // Call the onChatPress function if provided
    if (onChatPress) {
      onChatPress(labResult);
    } else {
      // Fallback alert if no onChatPress function is provided
      Alert.alert('Chat', 'Chat functionality will be implemented here');
    }
  };

  const isImageFile = () => {
    if (!labResult?.fileType && !labResult?.fileUrl) return false;
    
    // Check by file type
    if (labResult.fileType) {
      const lowerType = labResult.fileType.toLowerCase();
      return lowerType.includes('image') || 
             lowerType.includes('jpeg') || 
             lowerType.includes('jpg') || 
             lowerType.includes('png') ||
             lowerType.includes('gif') ||
             lowerType.includes('bmp');
    }
    
    // Fallback: check by file extension in URL
    if (labResult.fileUrl) {
      const lowerUrl = labResult.fileUrl.toLowerCase();
      return lowerUrl.includes('.jpeg') || 
             lowerUrl.includes('.jpg') || 
             lowerUrl.includes('.png') ||
             lowerUrl.includes('.gif') ||
             lowerUrl.includes('.bmp');
    }
    
    return false;
  };

  const isPdfFile = () => {
    if (!labResult?.fileType) return false;
    return labResult.fileType.includes('pdf');
  };

  const getFileExtension = () => {
    if (!labResult?.fileType) return 'file';
    
    if (labResult.fileType.includes('pdf')) return 'pdf';
    if (labResult.fileType.includes('jpeg')) return 'jpeg';
    if (labResult.fileType.includes('jpg')) return 'jpg';
    if (labResult.fileType.includes('png')) return 'png';
    
    // Try to extract extension from fileType
    const parts = labResult.fileType.split('/');
    return parts.length > 1 ? parts[1] : 'file';
  };

  const getFileIcon = () => {
    if (isImageFile()) {
      return 'image';
    } else if (isPdfFile()) {
      return 'document-text';
    } else {
      return 'document';
    }
  };

  if (!labResult) return null;

  // Determine if this is a patient-uploaded result
  const isPatientUploaded = labResult.uploadedBy === 'patient';
  const isDoctorUploaded = labResult.uploadedBy === 'doctor' || !labResult.uploadedBy;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.CARD_BACKGROUND }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.TEXT_PRIMARY }]}>
              {labResult.title || 'Lab Result Details'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Card style={[styles.infoCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Test Title</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.title || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Date Uploaded</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{formatDate(labResult.uploadDate)}</Text>
              </View>
              
              {isDoctorUploaded && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Doctor</Text>
                    <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.doctorName || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>License Number</Text>
                    <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.doctorLicense || 'N/A'}</Text>
                  </View>
                </>
              )}
              
              {/* Show doctor information for patient-uploaded results as well */}
              {isPatientUploaded && labResult.doctorName && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Doctor</Text>
                  <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.doctorName || 'N/A'}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Patient</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.patientName || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>File Name</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.fileName || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>File Type</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>{labResult.fileType || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>File Size</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>
                  {labResult.fileSize ? `${Math.round(labResult.fileSize / 1024)} KB` : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Source</Text>
                <Text style={[styles.infoValue, { color: theme.TEXT_PRIMARY }]}>
                  {isPatientUploaded ? 'Uploaded by Patient' : 'Uploaded by Doctor'}
                </Text>
              </View>
              
              {isPatientUploaded && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.TEXT_SECONDARY }]}>Status</Text>
                  <Text style={[styles.infoValue, { color: theme.WARNING }]}>Pending Review</Text>
                </View>
              )}
            </Card>

            {labResult.fileUrl && (
              <Card style={[styles.filePreviewCard, { backgroundColor: theme.BACKGROUND, borderColor: theme.BORDER }]}>
                <View style={styles.filePreviewHeader}>
                  <Ionicons name={getFileIcon()} size={24} color={theme.PRIMARY} />
                  <Text style={[styles.filePreviewTitle, { color: theme.TEXT_PRIMARY }]}>File Preview</Text>
                </View>
                
                {isImageFile() ? (
                  <View style={styles.imagePreviewContainer}>
                    {labResult.fileUrl ? (
                      <Image 
                        source={{ uri: labResult.fileUrl }} 
                        style={styles.imagePreview}
                        resizeMode="contain"
                        onError={(error) => {
                          console.log('Image load error:', error);
                          console.log('Image URL:', labResult.fileUrl);
                          setFileError(true);
                          setLoadingFile(false);
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully');
                          setLoadingFile(false);
                          setFileError(false);
                        }}
                        onLoadStart={() => {
                          console.log('Starting to load image');
                          setLoadingFile(true);
                          setFileError(false);
                        }}
                        onLoadEnd={() => {
                          console.log('Finished loading attempt');
                          setLoadingFile(false);
                        }}
                      />
                    ) : (
                      <View style={styles.errorContainer}>
                        <Ionicons name="image-outline" size={48} color={theme.GRAY_MEDIUM} />
                        <Text style={[styles.errorText, { color: theme.ERROR }]}>
                          Image URL not available
                        </Text>
                      </View>
                    )}
                    {loadingFile && (
                      <ActivityIndicator 
                        size="large" 
                        color={theme.PRIMARY} 
                        style={styles.loadingIndicator} 
                      />
                    )}
                    {fileError && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="image-outline" size={48} color={theme.GRAY_MEDIUM} />
                        <Text style={[styles.errorText, { color: theme.ERROR }]}>
                          Failed to load image preview
                        </Text>
                        <Text style={[styles.errorSubtext, { color: theme.TEXT_SECONDARY }]}>
                          Tap "View File" to open the image directly
                        </Text>
                        <Button
                          title="Retry"
                          onPress={() => {
                            setFileError(false);
                            setLoadingFile(true);
                          }}
                          style={styles.retryButton}
                        />
                      </View>
                    )}
                  </View>
                ) : isPdfFile() ? (
                  <View style={styles.pdfPreviewContainer}>
                    <Ionicons name="document-text" size={64} color={theme.INFO} style={styles.pdfIcon} />
                    <Text style={[styles.pdfPreviewText, { color: theme.TEXT_SECONDARY }]}>
                      PDF Document Preview
                    </Text>
                    <Text style={[styles.pdfPreviewSubtext, { color: theme.TEXT_SECONDARY }]}>
                      Tap "View File" to open the full PDF document
                    </Text>
                  </View>
                ) : (
                  <View style={styles.genericFilePreview}>
                    <Ionicons name="document" size={64} color={theme.GRAY_MEDIUM} style={styles.fileIcon} />
                    <Text style={[styles.filePreviewText, { color: theme.TEXT_SECONDARY }]}>
                      {labResult.fileType ? labResult.fileType.split('/')[1]?.toUpperCase() || 'File' : 'Document'}
                    </Text>
                    <Text style={[styles.filePreviewSubtext, { color: theme.TEXT_SECONDARY }]}>
                      Tap "View File" to open this document
                    </Text>
                  </View>
                )}
              </Card>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.iconButton, { backgroundColor: theme.GRAY_LIGHT }]}
            >
              <Ionicons name="close-outline" size={20} color={theme.TEXT_PRIMARY} />
            </TouchableOpacity>
            
            {labResult.fileUrl && (
              <>
                <TouchableOpacity
                  onPress={handleDownloadFile}
                  style={[styles.iconButton, { backgroundColor: theme.SUCCESS }]}
                  disabled={downloading || deleting}
                >
                  <Ionicons 
                    name={downloading ? "download-outline" : "download-outline"} 
                    size={20} 
                    color={theme.WHITE} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleViewFile}
                  style={[styles.iconButton, { backgroundColor: theme.INFO }]}
                  disabled={loadingFile || downloading || deleting}
                >
                  <Ionicons 
                    name={loadingFile ? "eye-outline" : "eye-outline"} 
                    size={20} 
                    color={theme.WHITE} 
                  />
                </TouchableOpacity>
              </>
            )}
            
            {/* Show chat button for doctor-patient communication */}
            {(isDoctorUploaded || isPatientUploaded) && (
              <TouchableOpacity
                onPress={handleOpenChat}
                style={[styles.iconButton, { backgroundColor: theme.PRIMARY }]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.WHITE} />
              </TouchableOpacity>
            )}
            
            {/* Show delete button only if currentUser is the patient who owns this lab result */}
            {currentUser && currentUser.uid === labResult.patientId && (
              <TouchableOpacity
                onPress={handleDeleteLabResult}
                style={[styles.iconButton, { backgroundColor: theme.ERROR }]}
                disabled={deleting || downloading || loadingFile}
              >
                <Ionicons 
                  name={deleting ? "trash-outline" : "trash-outline"} 
                  size={20} 
                  color={theme.WHITE} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  modalContent: {
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    width: '100%',
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
  infoCard: {
    backgroundColor: theme.BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  infoRow: {
    marginBottom: SPACING.SM,
  },
  infoLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  infoValue: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    fontWeight: '500',
  },
  filePreviewCard: {
    backgroundColor: theme.BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  filePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  filePreviewTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.SM,
  },
  pdfPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  pdfIcon: {
    marginBottom: SPACING.MD,
  },
  pdfPreviewText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  pdfPreviewSubtext: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  genericFilePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  fileIcon: {
    marginBottom: SPACING.MD,
  },
  filePreviewText: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  filePreviewSubtext: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  errorText: {
    fontSize: FONT_SIZES.MD,
    color: theme.ERROR,
    textAlign: 'center',
    marginTop: SPACING.SM,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
  retryButton: {
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.LG,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
  },
});

export default LabResultModal;