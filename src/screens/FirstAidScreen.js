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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS
} from '../constants';
import Card from '../components/Card';
import Button from '../components/Button';
import { fetchFirstAidGuides, seedFirstAidGuides, firstAidGuidesMockData } from '../services/firstAidService';

const FirstAidScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [firstAidGuides, setFirstAidGuides] = useState([]);
  const [categories] = useState([
    { id: 'all', name: 'All', icon: 'grid' },
    { id: 'emergency', name: 'Emergency', icon: 'warning' },
    { id: 'wounds', name: 'Wounds', icon: 'bandage' },
    { id: 'breathing', name: 'Breathing', icon: 'lung' },
    { id: 'burns', name: 'Burns', icon: 'flame' },
    { id: 'poisoning', name: 'Poisoning', icon: 'warning' }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load First Aid Guides from Firestore
  useEffect(() => {
    loadFirstAidGuides();
  }, []);

  const loadFirstAidGuides = async () => {
    try {
      setLoading(true);
      const guides = await fetchFirstAidGuides();
      
      // If no guides exist, seed the database with mock data
      if (guides.length === 0) {
        console.log('No First Aid Guides found. Seeding database with mock data...');
        await seedFirstAidGuides(firstAidGuidesMockData);
        const seededGuides = await fetchFirstAidGuides();
        setFirstAidGuides(seededGuides);
      } else {
        setFirstAidGuides(guides);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading First Aid Guides:', err);
      setError('Failed to load First Aid Guides. Please try again later.');
      // Fallback to mock data if Firestore fails
      setFirstAidGuides(firstAidGuidesMockData);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = selectedCategory === 'all' 
    ? firstAidGuides 
    : firstAidGuides.filter(guide => guide.category === selectedCategory);

  const CategoryButton = ({ category, active, onPress }) => (
    <TouchableOpacity
      style={[styles.categoryButton, active && styles.activeCategoryButton]}
      onPress={onPress}
    >
      <Ionicons 
        name={category.icon} 
        size={20} 
        color={active ? COLORS.WHITE : COLORS.TEXT_SECONDARY} 
      />
      <Text style={[
        styles.categoryText,
        active && styles.activeCategoryText
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const FirstAidCard = ({ guide }) => (
    <Card style={styles.guideCard}>
      <TouchableOpacity
        onPress={() => setSelectedGuide(guide)}
      >
        <View style={styles.guideHeader}>
          <View style={[styles.guideIcon, { backgroundColor: guide.color }]}>
            <Ionicons name={guide.icon} size={32} color={COLORS.WHITE} />
          </View>
          <View style={styles.guideInfo}>
            <Text style={styles.guideTitle}>{guide.title}</Text>
            <Text style={styles.guideDescription}>{guide.description}</Text>
            <View style={styles.guideMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.metaText}>{guide.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="bar-chart-outline" size={14} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.metaText}>{guide.difficulty}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.GRAY_MEDIUM} />
        </View>
      </TouchableOpacity>
    </Card>
  );

  const GuideDetailView = () => (
    <SafeAreaView style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedGuide(null)}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.detailTitle}>{selectedGuide.title}</Text>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => Alert.alert('Emergency', 'Call 911 for immediate medical assistance')}
        >
          <Ionicons name="call" size={20} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.detailContent}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={[styles.detailIcon, { backgroundColor: selectedGuide.color }]}>
              <Ionicons name={selectedGuide.icon} size={24} color={COLORS.WHITE} />
            </View>
            <View style={styles.overviewText}>
              <Text style={styles.overviewTitle}>{selectedGuide.title}</Text>
              <Text style={styles.overviewDescription}>{selectedGuide.description}</Text>
            </View>
          </View>
          
          <View style={styles.overviewMeta}>
            <View style={styles.overviewMetaItem}>
              <Ionicons name="time" size={16} color={COLORS.PRIMARY} />
              <Text style={styles.overviewMetaText}>{selectedGuide.time}</Text>
            </View>
            <View style={styles.overviewMetaItem}>
              <Ionicons name="bar-chart" size={16} color={COLORS.PRIMARY} />
              <Text style={styles.overviewMetaText}>{selectedGuide.difficulty}</Text>
            </View>
          </View>
        </Card>

        {selectedGuide.steps.map((step, index) => (
          <Card key={index} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.step}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <Text style={styles.stepDescription}>{step.description}</Text>
            {step.tips && (
              <View style={styles.stepTips}>
                <Ionicons name="bulb" size={16} color={COLORS.WARNING} />
                <Text style={styles.stepTipsText}>{step.tips}</Text>
              </View>
            )}
          </Card>
        ))}

        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={24} color={COLORS.EMERGENCY} />
            <Text style={styles.emergencyTitle}>When to Call 911</Text>
          </View>
          <Text style={styles.emergencyText}>
            • Person is unconscious or unresponsive{'\n'}
            • Severe bleeding that won't stop{'\n'}
            • Difficulty breathing or no breathing{'\n'}
            • Signs of stroke or heart attack{'\n'}
            • Severe burns or major injuries{'\n'}
            • Any life-threatening emergency
          </Text>
          <Button
            title="Call Emergency Services"
            onPress={() => Alert.alert('Emergency', 'This would dial your local emergency number')}
            style={styles.emergencyCallButton}
            variant="danger"
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );

  if (selectedGuide) {
    return <GuideDetailView />;
  }

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading First Aid Guides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            title="Retry" 
            onPress={loadFirstAidGuides} 
            style={styles.retryButton} 
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>First Aid Guide</Text>
        <Text style={styles.subtitle}>Emergency medical procedures and safety tips</Text>
        
        <TouchableOpacity 
          style={styles.emergencyBanner}
          onPress={() => Alert.alert('Emergency', 'Call 911 for immediate medical assistance')}
        >
          <Ionicons name="warning" size={20} color={COLORS.WHITE} />
          <Text style={styles.emergencyBannerText}>Emergency? Call 911</Text>
          <Ionicons name="call" size={20} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              category={category}
              active={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* First Aid Guides */}
      <ScrollView 
        style={styles.guidesList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFirstAidGuides} />
        }
      >
        {filteredGuides.map((guide) => (
          <FirstAidCard key={guide.id} guide={guide} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
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
    marginBottom: SPACING.MD,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.EMERGENCY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
  },
  emergencyBannerText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.WHITE,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  categoriesContainer: {
    backgroundColor: COLORS.WHITE,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  activeCategoryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  categoryText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: COLORS.WHITE,
  },
  guidesList: {
    flex: 1,
    padding: SPACING.MD,
  },
  guideCard: {
    marginBottom: SPACING.MD,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  guideDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  guideMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  metaText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS / 2,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  detailHeader: {
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
  detailTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: COLORS.EMERGENCY,
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
  },
  detailContent: {
    flex: 1,
    padding: SPACING.MD,
  },
  overviewCard: {
    marginBottom: SPACING.MD,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  detailIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  overviewText: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  overviewDescription: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  overviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  overviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewMetaText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.PRIMARY,
    marginLeft: SPACING.XS,
    fontWeight: '600',
  },
  stepCard: {
    marginBottom: SPACING.MD,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  stepDescription: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: SPACING.SM,
  },
  stepTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WARNING + '10',
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.WARNING,
  },
  stepTipsText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
    fontStyle: 'italic',
  },
  emergencyCard: {
    backgroundColor: COLORS.EMERGENCY + '10',
    borderWidth: 1,
    borderColor: COLORS.EMERGENCY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XL,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  emergencyTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.EMERGENCY,
    marginLeft: SPACING.SM,
  },
  emergencyText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 22,
    marginBottom: SPACING.MD,
  },
  emergencyCallButton: {
    backgroundColor: COLORS.EMERGENCY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  
  errorText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  
  retryButton: {
    marginTop: SPACING.MD,
  },
});

export default FirstAidScreen;