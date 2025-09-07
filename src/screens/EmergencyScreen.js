import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Button from '../components/Button';
import { COLORS, FONT_SIZES, SPACING } from '../constants';

const EmergencyScreen = ({ navigation }) => {
  const emergencyContacts = [
    { name: 'Ambulance', number: '911', icon: 'medical' },
    { name: 'Fire Department', number: '911', icon: 'flame' },
    { name: 'Police', number: '911', icon: 'shield' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* SOS Button */}
          <Card style={styles.sosCard}>
            <View style={styles.sosContainer}>
              <TouchableOpacity
                style={styles.sosButton}
                onPress={() => navigation.navigate('SOS')}
              >
                <Ionicons name="warning" size={60} color={COLORS.WHITE} />
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
              <Text style={styles.sosDescription}>
                Press and hold for 3 seconds in case of emergency
              </Text>
            </View>
          </Card>

          {/* Emergency Contacts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {emergencyContacts.map((contact, index) => (
              <Card key={index} style={styles.contactCard}>
                <View style={styles.contactItem}>
                  <View style={styles.contactIcon}>
                    <Ionicons name={contact.icon} size={24} color={COLORS.EMERGENCY} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                  <Button
                    title="Call"
                    onPress={() => {}}
                    variant="emergency"
                    size="small"
                  />
                </View>
              </Card>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Features</Text>
            <Button
              title="Share Live Location"
              onPress={() => navigation.navigate('EmergencyMap')}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="location" size={20} color={COLORS.PRIMARY} />}
            />
            <Button
              title="First Aid Guide"
              onPress={() => navigation.navigate('FirstAid')}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="book" size={20} color={COLORS.PRIMARY} />}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  sosCard: {
    backgroundColor: COLORS.EMERGENCY_LIGHT,
    marginBottom: SPACING.XL,
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.EMERGENCY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosText: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginTop: SPACING.SM,
  },
  sosDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  section: {
    marginBottom: SPACING.XL,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  contactCard: {
    marginBottom: SPACING.SM,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.EMERGENCY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  contactNumber: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  actionButton: {
    marginBottom: SPACING.MD,
  },
});

export default EmergencyScreen;