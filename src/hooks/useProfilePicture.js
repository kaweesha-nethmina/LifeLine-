import { useState, useCallback, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Hook for fetching user profile pictures on-demand
 * This hook implements lazy loading of profile pictures to improve performance
 * by only loading images when they're actually needed (similar to how it's done in ChatScreen)
 */
const useProfilePicture = () => {
  // Cache to store already fetched profile pictures
  const profilePicturesRef = useRef({});

  /**
   * Fetch profile picture URL for a user
   * @param {string} userId - Firebase user ID
   * @returns {Promise<string|null>} Profile picture URL or null if not found
   */
  const fetchUserProfilePicture = useCallback(async (userId) => {
    try {
      // Check if we already have the profile picture URL cached
      if (profilePicturesRef.current[userId]) {
        return profilePicturesRef.current[userId];
      }

      // Validate user ID
      if (!userId) {
        console.warn('Cannot fetch profile picture: userId is missing');
        return null;
      }

      // Fetch user data from Firestore to get profile picture URL
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profilePictureURL = userData.profilePictureURL;
        
        // Update profile pictures cache
        profilePicturesRef.current = {
          ...profilePicturesRef.current,
          [userId]: profilePictureURL
        };
        
        return profilePictureURL;
      } else {
        console.warn(`User document not found for userId: ${userId}`);
      }
    } catch (error) {
      console.error('Error fetching user profile picture:', error);
    }
    return null;
  }, []);

  /**
   * Get profile picture URL from cache
   * @param {string} userId - Firebase user ID
   * @returns {string|null} Profile picture URL or null if not in cache
   */
  const getCachedProfilePicture = useCallback((userId) => {
    return profilePicturesRef.current[userId] || null;
  }, []);

  /**
   * Clear profile picture cache
   */
  const clearCache = useCallback(() => {
    profilePicturesRef.current = {};
  }, []);

  return {
    fetchUserProfilePicture,
    getCachedProfilePicture,
    clearCache
  };
};

export default useProfilePicture;