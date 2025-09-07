import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import {
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy
} from '../services/firebase';
import { supabaseStorage } from '../services/supabase';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';

const UploadDocumentScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [user?.uid]); // Reload when user changes

  const loadDocuments = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        console.log('No user logged in');
        setDocuments([]);
        return;
      }

      console.log('Loading documents from Firebase for user:', user.uid);
      
      // Query user's documents from Firestore
      // Removed orderBy to avoid composite index requirement
      const documentsRef = collection(db, 'users', user.uid, 'documents');
      const q = query(documentsRef); // Removed orderBy('uploadDate', 'desc') to avoid composite index
      const querySnapshot = await getDocs(q);
      
      const userDocuments = [];
      querySnapshot.forEach((doc) => {
        userDocuments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort in memory instead of using Firestore orderBy
      userDocuments.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      console.log('Loaded documents:', userDocuments.length);
      setDocuments(userDocuments);
    } catch (error) {
      console.error('Error loading documents from Firebase:', error);
      Alert.alert('Error', 'Failed to load documents. Please check your internet connection.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
      console.error('Document picker error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  };

  // Helper function to save metadata
  const saveMetadata = async (fileName, file, publicUrl, filePath, fullFileName) => {
    // Prepare document metadata for Firestore
    const documentData = {
      name: fileName,
      originalName: file.name || fileName, // Use fileName as fallback if file.name is undefined
      type: file.mimeType || file.type || 'application/octet-stream', // Add file.type as fallback
      size: file.size || 0,
      downloadURL: publicUrl,
      supabaseFilePath: filePath, // Store Supabase path instead of Firebase path
      uploadDate: new Date().toISOString(),
      category: getDocumentCategory(file.mimeType || file.type || file.name),
      userId: user.uid,
      storageProvider: 'supabase' // Mark as Supabase storage
    };
    
    console.log('Saving document metadata to Firebase Firestore...');
    console.log('Document metadata:', JSON.stringify(documentData, null, 2));
    
    // Save document metadata to Firestore (Firebase)
    const docRef = await addDoc(
      collection(db, 'users', user.uid, 'documents'),
      documentData
    );
    
    console.log('Document metadata saved with ID:', docRef.id);
    
    // Add to local state
    const newDocument = {
      id: docRef.id,
      ...documentData,
      uri: publicUrl // For local display
    };
    
    setDocuments(prev => [newDocument, ...prev]);
    Alert.alert('Success', 'Document uploaded successfully to Supabase!');
  };

  const uploadDocument = async (file) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to upload documents');
      return;
    }

    setUploading(true);
    try {
      console.log('Starting upload for file:', file.name || 'Unknown');
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = file.name || `document_${timestamp}`;
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fullFileName = `${timestamp}_${sanitizedFileName}`;
      
      console.log('Uploading to Supabase Storage...');
      console.log('File details:', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || file.type,
        size: file.size
      });
      
      // Prepare file object for React Native upload
      const fileForUpload = {
        uri: file.uri,
        type: file.mimeType || file.type || 'application/octet-stream',
        name: fullFileName,
        size: file.size
      };
      
      console.log('Starting Supabase upload with file object:', fileForUpload);
      const { data: uploadData, error: uploadError } = await supabaseStorage.uploadFile(
        user.uid,
        fileForUpload,
        fullFileName
      );
      
      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }
      
      console.log('Upload successful, getting public URL...');
      
      // Get public URL for the uploaded file
      const filePath = `documents/${user.uid}/${fullFileName}`;
      const publicUrl = supabaseStorage.getPublicUrl(filePath);
      
      console.log('Public URL obtained:', publicUrl.substring(0, 50) + '...');
      
      // Save metadata using helper function
      await saveMetadata(fileName, file, publicUrl, filePath, fullFileName);
      
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload document';
      if (error.message?.includes('unauthorized')) {
        errorMessage = 'You do not have permission to upload files';
      } else if (error.message?.includes('canceled')) {
        errorMessage = 'Upload was cancelled';
      } else if (error.message?.includes('Supabase upload failed')) {
        errorMessage = error.message;
      }
      
      Alert.alert('Upload Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };
  
  // Helper function to determine document category
  const getDocumentCategory = (mimeTypeOrName) => {
    const type = (mimeTypeOrName || '').toLowerCase();
    
    if (type.includes('pdf')) return 'PDF Documents';
    if (type.includes('image')) return 'Images';
    if (type.includes('blood') || type.includes('test') || type.includes('lab')) return 'Lab Results';
    if (type.includes('prescription') || type.includes('rx')) return 'Prescriptions';
    if (type.includes('insurance')) return 'Insurance';
    if (type.includes('xray') || type.includes('scan') || type.includes('mri')) return 'Medical Imaging';
    
    return 'General';
  };

  const deleteDocument = async (docId) => {
    const documentToDelete = documents.find(doc => doc.id === docId);
    
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${documentToDelete?.name || 'this document'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.uid) {
                Alert.alert('Error', 'Please log in to delete documents');
                return;
              }
              
              console.log('Deleting document:', docId);
              
              // If document has a Supabase file path, delete from Supabase Storage
              if (documentToDelete?.supabaseFilePath) {
                console.log('Deleting from Supabase Storage:', documentToDelete.supabaseFilePath);
                const { error: deleteError } = await supabaseStorage.deleteFile(
                  documentToDelete.supabaseFilePath
                );
                
                if (deleteError) {
                  console.warn('Supabase delete error (continuing with Firestore delete):', deleteError);
                } else {
                  console.log('File deleted from Supabase Storage');
                }
              }
              
              // Delete metadata from Firestore (Firebase)
              console.log('Deleting from Firestore...');
              await deleteDoc(doc(db, 'users', user.uid, 'documents', docId));
              console.log('Document metadata deleted from Firestore');
              
              // Remove from local state
              setDocuments(prev => prev.filter(doc => doc.id !== docId));
              Alert.alert('Success', 'Document deleted successfully');
              
            } catch (error) {
              console.error('Delete error:', error);
              
              let errorMessage = 'Failed to delete document';
              if (error.message?.includes('unauthorized')) {
                errorMessage = 'You do not have permission to delete this file';
              }
              
              Alert.alert('Delete Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const getDocumentIcon = (type) => {
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('image')) return 'image';
    return 'document';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const UploadOptionCard = ({ title, subtitle, icon, color, onPress }) => (
    <TouchableOpacity style={styles.uploadOption} onPress={onPress}>
      <View style={[styles.uploadIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={32} color={COLORS.WHITE} />
      </View>
      <View style={styles.uploadText}>
        <Text style={styles.uploadTitle}>{title}</Text>
        <Text style={styles.uploadSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
    </TouchableOpacity>
  );

  const DocumentCard = ({ document }) => {
    const handleOpenDocument = async () => {
      if (document.downloadURL) {
        try {
          // Check if the URL can be opened
          const supported = await Linking.canOpenURL(document.downloadURL);
          
          if (supported) {
            // Open the document in the device's default viewer
            await Linking.openURL(document.downloadURL);
          } else {
            // Fallback: Show alert with URL
            Alert.alert(
              'View Document',
              `Document URL: ${document.downloadURL}`,
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
        }
      } else {
        Alert.alert('Error', 'Document URL not available');
      }
    };

    return (
      <Card style={styles.documentCard}>
        <TouchableOpacity onPress={handleOpenDocument}>
          <View style={styles.documentHeader}>
            <View style={styles.documentIconContainer}>
              <Ionicons 
                name={getDocumentIcon(document.type)} 
                size={24} 
                color={COLORS.PRIMARY} 
              />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={styles.documentMeta}>
                {formatFileSize(document.size)} • {new Date(document.uploadDate).toLocaleDateString()}
              </Text>
              <Text style={styles.documentCategory}>{document.category}</Text>
              {document.storageProvider && (
                <Text style={styles.storageProvider}>
                  Stored on: {document.storageProvider === 'supabase' ? 'Supabase' : 'Firebase'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteDocument(document.id)}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
            </TouchableOpacity>
          </View>
          {document.type.includes('image') && (document.downloadURL || document.uri) && (
            <Image 
              source={{ uri: document.downloadURL || document.uri }} 
              style={styles.documentPreview}
              onError={(error) => console.log('Image load error:', error)}
            />
          )}
          {/* Visual indicator that the document is clickable */}
          <View style={styles.documentFooter}>
            <Text style={styles.openDocumentText}>Tap to open document</Text>
            <Ionicons name="open-outline" size={16} color={COLORS.PRIMARY} />
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upload Documents</Text>
          <Text style={styles.subtitle}>
            Keep your medical documents safe and accessible
          </Text>
        </View>

        {/* Upload Options */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Document</Text>
          
          <UploadOptionCard
            title="Take Photo"
            subtitle="Capture document with camera"
            icon="camera"
            color={COLORS.PRIMARY}
            onPress={takePhoto}
          />
          
          <UploadOptionCard
            title="Choose from Gallery"
            subtitle="Select image from photos"
            icon="image"
            color={COLORS.SUCCESS}
            onPress={pickImage}
          />
          
          <UploadOptionCard
            title="Browse Files"
            subtitle="Select PDF or other documents"
            icon="document"
            color={COLORS.INFO}
            onPress={pickDocument}
          />
        </Card>

        {/* Upload Progress */}
        {uploading && (
          <Card style={styles.uploadProgress}>
            <View style={styles.progressContent}>
              <Ionicons name="cloud-upload" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.progressText}>Uploading document...</Text>
            </View>
          </Card>
        )}

        {/* Documents List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            My Documents ({documents.length})
          </Text>
          
          {documents.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color={COLORS.GRAY_MEDIUM} />
              <Text style={styles.emptyTitle}>No Documents</Text>
              <Text style={styles.emptySubtitle}>
                Upload your medical documents to keep them organized and secure
              </Text>
            </Card>
          ) : (
            documents.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))
          )}
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.INFO} />
            <Text style={styles.tipsTitle}>Tips for Better Documents</Text>
          </View>
          <Text style={styles.tipsText}>
            • Ensure documents are well-lit and clear{'\n'}
            • Use PDF format for multi-page documents{'\n'}
            • Keep file sizes under 10MB for faster uploads{'\n'}
            • Organize documents by category for easy access
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  header: {
    marginBottom: SPACING.LG,
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
  section: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  uploadText: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  uploadSubtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  uploadProgress: {
    marginBottom: SPACING.MD,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
  },
  progressText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
    fontWeight: '600',
  },
  documentCard: {
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.WHITE,
  },
  
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  
  documentInfo: {
    flex: 1,
  },
  
  documentName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  
  documentMeta: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS / 2,
  },
  
  documentCategory: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  
  storageProvider: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.SUCCESS,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  
  deleteButton: {
    padding: SPACING.SM,
  },
  
  documentPreview: {
    width: '100%',
    height: 150,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.SM,
  },
  
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  
  openDocumentText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginRight: SPACING.XS,
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
  
  tipsCard: {
    backgroundColor: COLORS.INFO + '10',
    marginBottom: SPACING.XL,
  },
  
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  
  tipsTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.INFO,
    marginLeft: SPACING.SM,
  },
  
  tipsText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
});

export default UploadDocumentScreen;