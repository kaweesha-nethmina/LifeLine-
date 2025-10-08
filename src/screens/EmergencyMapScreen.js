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
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();
  const styles = getStyles(theme);
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
        return theme.SUCCESS;
      case 'fire':
        return theme.WARNING;
      case 'police':
        return theme.INFO;
      default:
        return theme.PRIMARY;
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>Emergency Map</Text>
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={centerMapOnUser}
        >
          <Ionicons name="locate" size={24} color={theme.TEXT_PRIMARY} />
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
                pinColor={theme.EMERGENCY}
              >
                <View style={[styles.userMarker, { backgroundColor: theme.EMERGENCY }]}>
                  <Ionicons name="person" size={24} color={theme.WHITE} />
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
                    color={theme.WHITE} 
                  />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.GRAY_LIGHT }]}>
            <Text style={{ color: theme.TEXT_PRIMARY }}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Emergency Status */}
      <Card style={[styles.statusCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
        <View style={styles.statusHeader}>
          <Ionicons 
            name={isEmergencyActive ? "warning" : "checkmark-circle"} 
            size={24} 
            color={isEmergencyActive ? theme.EMERGENCY : theme.SUCCESS} 
          />
          <Text style={[styles.statusTitle, { color: theme.TEXT_PRIMARY }]}>
            {isEmergencyActive ? 'Emergency Active' : 'Emergency Ready'}
          </Text>
        </View>
        <Text style={[styles.statusText, { color: theme.TEXT_SECONDARY }]}>
          {isEmergencyActive 
            ? 'Emergency services have been notified. Help is on the way.' 
            : 'SOS system is ready. Press the SOS button in case of emergency.'}
        </Text>
        
        {currentLocation && (
          <View style={[styles.locationInfo, { backgroundColor: theme.GRAY_LIGHT }]}>
            <Text style={[styles.locationLabel, { color: theme.TEXT_PRIMARY }]}>Current Location:</Text>
            <Text style={[styles.locationText, { color: theme.TEXT_SECONDARY }]}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={[styles.accuracyText, { color: theme.GRAY_MEDIUM }]}>
              Accuracy: ±{Math.round(currentLocation.accuracy)} meters
            </Text>
          </View>
        )}
      </Card>

      {/* Nearby Services List */}
      <Card style={[styles.servicesCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
        <Text style={[styles.servicesTitle, { color: theme.TEXT_PRIMARY }]}>Nearby Emergency Services</Text>
        {nearbyServices.map((service) => (
          <View key={service.id} style={styles.serviceItem}>
            <View style={[
              styles.serviceIcon,
              { backgroundColor: getMarkerColor(service.type) }
            ]}>
              <Ionicons 
                name={getMarkerIcon(service.type)} 
                size={16} 
                color={theme.WHITE} 
              />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceName, { color: theme.TEXT_PRIMARY }]}>{service.name}</Text>
              <Text style={[styles.serviceDistance, { color: theme.TEXT_SECONDARY }]}>{service.distance}</Text>
            </View>
          </View>
        ))}
      </Card>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  backButton: {
    padding: SPACING.XS,
  },
  title: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
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
    backgroundColor: theme.BUTTON_SECONDARY,
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.EMERGENCY,
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
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
    shadowColor: theme.BLACK,
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
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  locationInfo: {
    backgroundColor: theme.BUTTON_SECONDARY,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
  },
  locationLabel: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    fontWeight: 'bold',
    marginBottom: SPACING.XS,
  },
  locationText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  accuracyText: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
  servicesCard: {
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    padding: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: theme.BORDER,
    shadowColor: theme.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  servicesTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
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
    color: theme.TEXT_PRIMARY,
  },
  serviceDistance: {
    fontSize: FONT_SIZES.XS,
    color: theme.TEXT_SECONDARY,
  },
});

export default EmergencyMapScreen;