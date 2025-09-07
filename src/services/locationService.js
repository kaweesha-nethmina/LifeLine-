import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { db, collection, addDoc, updateDoc, doc } from './firebase';

/**
 * Location Service for LifeLine+ Healthcare App
 * Manages location tracking for emergency services and other location-based features
 */
class LocationService {
  /**
   * Request permission to access location
   */
  static async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  static async getCurrentLocation() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const permissionGranted = await this.requestLocationPermission();
        if (!permissionGranted) {
          throw new Error('Location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Start location tracking
   */
  static async startLocationTracking(callback) {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const permissionGranted = await this.requestLocationPermission();
        if (!permissionGranted) {
          throw new Error('Location permission denied');
        }
      }

      // Watch position updates
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10 // 10 meters
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp
          });
        }
      );

      return locationSubscription;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /**
   * Get address from coordinates
   */
  static async getAddressFromCoordinates(latitude, longitude) {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      return address;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  }

  /**
   * Save emergency location to Firebase
   */
  static async saveEmergencyLocation(userId, locationData) {
    try {
      const emergencyLocation = {
        userId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: new Date(),
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'emergencyLocations'), emergencyLocation);
      console.log('Emergency location saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving emergency location:', error);
      throw error;
    }
  }

  /**
   * Update emergency location in Firebase
   */
  static async updateEmergencyLocation(locationId, locationData) {
    try {
      const locationRef = doc(db, 'emergencyLocations', locationId);
      await updateDoc(locationRef, {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: new Date()
      });
      console.log('Emergency location updated:', locationId);
    } catch (error) {
      console.error('Error updating emergency location:', error);
      throw error;
    }
  }
}

export default LocationService;
