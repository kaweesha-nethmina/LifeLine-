import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import LocationService from '../services/locationService';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const EmergencyMapScreen = ({ route, navigation }) => {
  const { location, emergencyId, isEmergencyActive } = route.params || {};
  const { user, userProfile } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(location);
  const [mapRegion, setMapRegion] = useState(null);
  const [nearbyServices, setNearbyServices] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    if (location) {
      setCurrentLocation(location);
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } else {
      getCurrentLocation();
    }
    
    // Load mock nearby services
    loadNearbyServices();
  }, [location]);

  const getCurrentLocation = async () => {
    try {
      const loc = await LocationService.getCurrentLocation();
      setCurrentLocation(loc);
      setMapRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get current location.');
    }
  };

  const loadNearbyServices = () => {
    // Mock nearby emergency services
    const services = [
      {
        id: '1',
        name: 'City General Hospital',
        latitude: (currentLocation?.latitude || 0) + 0.005,
        longitude: (currentLocation?.longitude || 0) + 0.005,
        type: 'hospital',
        distance: '2.3 km'
      },
      {
        id: '2',
        name: 'Emergency Medical Center',
        latitude: (currentLocation?.latitude || 0) - 0.008,
        longitude: (currentLocation?.longitude || 0) + 0.003,
        type: 'hospital',
        distance: '3.1 km'
      },
      {
        id: '3',
        name: 'Fire Department',
        latitude: (currentLocation?.latitude || 0) + 0.002,
        longitude: (currentLocation?.longitude || 0) - 0.007,
        type: 'fire',
        distance: '1.8 km'
      },
      {
        id: '4',
        name: 'Police Station',
        latitude: (currentLocation?.latitude || 0) - 0.004,
        longitude: (currentLocation?.longitude || 0) - 0.006,
        type: 'police',
        distance: '2.7 km'
      }
    ];
    
    setNearbyServices(services);
  };

  const getMarkerIcon = (type) => {
    switch (type) {
      case 'hospital':
        return 'medical';
      case 'fire':
        return 'flame';
      case 'police':
        return 'shield';
      default:
        return 'location';
    }
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case 'hospital':
        return COLORS.SUCCESS;
      case 'fire':
        return COLORS.WARNING;
      case 'police':
        return COLORS.INFO;
      default:
        return COLORS.PRIMARY;
    }
  };

  const centerMapOnUser = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Emergency Map</Text>
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={centerMapOnUser}
        >
          <Ionicons name="locate" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {mapRegion ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
          >
            {/* User Location Marker */}
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude
                }}
                title="Your Location"
                pinColor={COLORS.EMERGENCY}
              >
                <View style={styles.userMarker}>
                  <Ionicons name="person" size={24} color={COLORS.WHITE} />
                </View>
              </Marker>
            )}

            {/* Accuracy Circle */}
            {currentLocation && currentLocation.accuracy && (
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude
                }}
                radius={currentLocation.accuracy}
                fillColor="rgba(255, 0, 0, 0.1)"
                strokeColor="rgba(255, 0, 0, 0.3)"
                strokeWidth={1}
              />
            )}

            {/* Nearby Services Markers */}
            {nearbyServices.map((service) => (
              <Marker
                key={service.id}
                coordinate={{
                  latitude: service.latitude,
                  longitude: service.longitude
                }}
                title={service.name}
                description={service.distance}
              >
                <View style={[
                  styles.serviceMarker,
                  { backgroundColor: getMarkerColor(service.type) }
                ]}>
                  <Ionicons 
                    name={getMarkerIcon(service.type)} 
                    size={20} 
                    color={COLORS.WHITE} 
                  />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Emergency Status */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons 
            name={isEmergencyActive ? "warning" : "checkmark-circle"} 
            size={24} 
            color={isEmergencyActive ? COLORS.EMERGENCY : COLORS.SUCCESS} 
          />
          <Text style={styles.statusTitle}>
            {isEmergencyActive ? 'Emergency Active' : 'Emergency Ready'}
          </Text>
        </View>
        <Text style={styles.statusText}>
          {isEmergencyActive 
            ? 'Emergency services have been notified. Help is on the way.' 
            : 'SOS system is ready. Press the SOS button in case of emergency.'}
        </Text>
        
        {currentLocation && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Current Location:</Text>
            <Text style={styles.locationText}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.accuracyText}>
              Accuracy: ±{Math.round(currentLocation.accuracy)} meters
            </Text>
          </View>
        )}
      </Card>

      {/* Nearby Services List */}
      <Card style={styles.servicesCard}>
        <Text style={styles.servicesTitle}>Nearby Emergency Services</Text>
        {nearbyServices.map((service) => (
          <View key={service.id} style={styles.serviceItem}>
            <View style={[
              styles.serviceIcon,
              { backgroundColor: getMarkerColor(service.type) }
            ]}>
              <Ionicons 
                name={getMarkerIcon(service.type)} 
                size={16} 
                color={COLORS.WHITE} 
              />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDistance}>{service.distance}</Text>
            </View>
          </View>
        ))}
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: SPACING.XS,
  },
  title: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  centerButton: {
    padding: SPACING.XS,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.EMERGENCY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    padding: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  statusTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  locationInfo: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
  },
  locationLabel: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: 'bold',
    marginBottom: SPACING.XS,
  },
  locationText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  accuracyText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.GRAY_MEDIUM,
  },
  servicesCard: {
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    padding: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  servicesTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  serviceIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  serviceDistance: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default EmergencyMapScreen;