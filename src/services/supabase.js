import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Direct configuration for now
const supabaseUrl = 'https://rfgakuzpwnjwysyzppqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZ2FrdXpwd25qd3lzeXpwcHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzU3NDYsImV4cCI6MjA3MjQxMTc0Nn0.q5km-3atFa0ISVOBzfgI_AySVgefQfr-5O-p72-wtuM';

// Debug: Log configuration (remove in production)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key configured:', supabaseKey ? 'Yes' : 'No');
console.log('Supabase Key prefix:', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'None');
console.log('Key validation - starts with eyJ:', supabaseKey.startsWith('eyJ') ? 'Valid' : 'Invalid');

// Create Supabase client
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Error creating Supabase client:', error);
  throw error;
}

export { supabase };

// Storage helper functions for healthcare documents
export const supabaseStorage = {
  /**
   * Simple test upload function to debug connection issues
   */
  debugUpload: async () => {
    try {
      console.log('=== DEBUG UPLOAD TEST ===');
      console.log('Supabase URL:', supabaseUrl);
      console.log('API Key length:', supabaseKey ? supabaseKey.length : 0);
      console.log('API Key starts with eyJ:', supabaseKey.startsWith('eyJ'));
      
      // Create a simple text file
      const testContent = 'Hello Supabase Storage!';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testFileName = `test-${Date.now()}.txt`;
      
      console.log('Attempting to upload test file:', testFileName);
      console.log('Test blob size:', testBlob.size);
      
      // Try to upload directly without user folder structure
      const { data, error } = await supabase.storage
        .from('healthcare-documents')
        .upload(testFileName, testBlob, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('=== DEBUG UPLOAD FAILED ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        console.error('Error details:', error);
        return { success: false, error };
      }
      
      console.log('=== DEBUG UPLOAD SUCCESS ===');
      console.log('Upload result:', data);
      return { success: true, data };
      
    } catch (exception) {
      console.error('=== DEBUG UPLOAD EXCEPTION ===');
      console.error('Exception type:', typeof exception);
      console.error('Exception message:', exception.message);
      console.error('Exception stack:', exception.stack);
      return { success: false, error: exception };
    }
  },
  /**
   * Upload a file to Supabase Storage (React Native compatible)
   * @param {string} userId - Firebase user ID
   * @param {File|Blob|Object} file - File to upload (URI-based for React Native)
   * @param {string} fileName - Name of the file
   * @returns {Promise<{data: object, error: object}>}
   */
  uploadFile: async (userId, file, fileName) => {
    try {
      console.log('Uploading to Supabase Storage:', fileName);
      console.log('User ID:', userId);
      console.log('File type:', typeof file);
      console.log('File properties:', Object.keys(file));
      
      // Check if Supabase is properly configured
      if (!supabaseKey || supabaseKey === 'your-publishable-key-here' || !supabaseKey.startsWith('eyJ')) {
        throw new Error('Supabase API key is not properly configured. Key should start with eyJ.');
      }
      
      // Create the file path: documents/userId/fileName
      const filePath = `documents/${userId}/${fileName}`;
      console.log('Upload path:', filePath);
      
      let uploadData, uploadError;
      
      // Handle React Native file uploads with URI
      if (file.uri) {
        console.log('React Native file upload detected, using fetch with FormData');
        
        // Create FormData for React Native file upload
        const formData = new FormData();
        formData.append('', {
          uri: file.uri,
          type: file.type || 'application/octet-stream',
          name: fileName
        });
        
        // Use the REST API directly for React Native uploads
        const uploadUrl = `${supabaseUrl}/storage/v1/object/healthcare-documents/${filePath}`;
        
        console.log('Uploading via REST API to:', uploadUrl);
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API upload failed:', response.status, errorText);
          uploadError = { message: `Upload failed: ${response.status} - ${errorText}` };
        } else {
          const responseData = await response.json();
          console.log('REST API upload successful:', responseData);
          uploadData = responseData;
        }
        
      } else {
        // Fallback to regular Supabase client for web or blob uploads
        console.log('Using Supabase client for blob/file upload');
        
        const result = await supabase.storage
          .from('healthcare-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        uploadData = result.data;
        uploadError = result.error;
      }

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        console.error('Error details:', JSON.stringify(uploadError, null, 2));
        return { data: null, error: uploadError };
      }

      console.log('Upload successful:', uploadData);
      return { data: uploadData, error: null };
    } catch (error) {
      console.error('Upload exception:', error);
      console.error('Exception details:', error.message);
      return { data: null, error };
    }
  },

  /**
   * Get public URL for a file
   * @param {string} filePath - Path to the file in storage
   * @returns {string} Public URL
   */
  getPublicUrl: (filePath) => {
    const { data } = supabase.storage
      .from('healthcare-documents')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  },

  /**
   * Delete a file from Supabase Storage
   * @param {string} filePath - Path to the file in storage
   * @returns {Promise<{data: object, error: object}>}
   */
  deleteFile: async (filePath) => {
    try {
      console.log('Deleting from Supabase Storage:', filePath);
      
      const { data, error } = await supabase.storage
        .from('healthcare-documents')
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        return { data: null, error };
      }

      console.log('Delete successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Delete exception:', error);
      return { data: null, error };
    }
  },

  /**
   * Create a signed URL for private file access
   * @param {string} filePath - Path to the file in storage
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<{data: object, error: object}>}
   */
  createSignedUrl: async (filePath, expiresIn = 3600) => {
    try {
      const { data, error } = await supabase.storage
        .from('healthcare-documents')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Signed URL error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Signed URL exception:', error);
      return { data: null, error };
    }
  },

  /**
   * Upload profile picture/avatar to Supabase Storage
   * @param {string} userId - Firebase user ID
   * @param {Object} file - File to upload (URI-based for React Native)
   * @returns {Promise<{data: object, error: object}>}
   */
  uploadProfilePicture: async (userId, file) => {
    try {
      console.log('Uploading profile picture to Supabase Storage for user:', userId);
      
      // Generate unique filename for profile picture
      const timestamp = Date.now();
      const fileName = `profile_${timestamp}.jpg`;
      const filePath = `profiles/${userId}/${fileName}`;
      
      console.log('Profile picture upload path:', filePath);
      
      // Prepare file object for React Native upload
      const fileForUpload = {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: fileName,
        size: file.size
      };
      
      // Handle React Native file uploads with URI
      const formData = new FormData();
      formData.append('', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: fileName
      });
      
      // Use the REST API directly for React Native uploads
      const uploadUrl = `${supabaseUrl}/storage/v1/object/healthcare-documents/${filePath}`;
      
      console.log('Uploading profile picture via REST API to:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile picture upload failed:', response.status, errorText);
        return { data: null, error: { message: `Upload failed: ${response.status} - ${errorText}` } };
      }
      
      const responseData = await response.json();
      console.log('Profile picture upload successful:', responseData);
      
      // Get public URL for the uploaded profile picture
      const publicUrl = supabaseStorage.getPublicUrl(filePath);
      
      return { 
        data: { 
          ...responseData, 
          publicUrl,
          filePath 
        }, 
        error: null 
      };
      
    } catch (error) {
      console.error('Profile picture upload exception:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete old profile picture when updating
   * @param {string} filePath - Path to the old profile picture
   * @returns {Promise<{data: object, error: object}>}
   */
  deleteProfilePicture: async (filePath) => {
    try {
      console.log('Deleting old profile picture from Supabase Storage:', filePath);
      
      const { data, error } = await supabase.storage
        .from('healthcare-documents')
        .remove([filePath]);

      if (error) {
        console.error('Profile picture delete error:', error);
        return { data: null, error };
      }

      console.log('Profile picture delete successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Profile picture delete exception:', error);
      return { data: null, error };
    }
  }
};

export default supabase;