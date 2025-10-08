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
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();
  const styles = getStyles(theme);
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
      style={[
        styles.categoryButton,
        active && styles.activeCategoryButton,
        { 
          backgroundColor: active ? theme.PRIMARY : theme.GRAY_LIGHT,
          borderColor: theme.BORDER
        }
      ]}
      onPress={onPress}
    >
      <Ionicons 
        name={category.icon} 
        size={20} 
        color={active ? theme.WHITE : theme.TEXT_SECONDARY} 
      />
      <Text style={[
        styles.categoryText,
        active && styles.activeCategoryText,
        { 
          color: active ? theme.WHITE : theme.TEXT_SECONDARY
        }
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const FirstAidCard = ({ guide }) => (
    <Card style={[styles.guideCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <TouchableOpacity
        onPress={() => setSelectedGuide(guide)}
      >
        <View style={styles.guideHeader}>
          <View style={[styles.guideIcon, { backgroundColor: guide.color }]}>
            <Ionicons name={guide.icon} size={32} color={theme.WHITE} />
          </View>
          <View style={styles.guideInfo}>
            <Text style={[styles.guideTitle, { color: theme.TEXT_PRIMARY }]}>{guide.title}</Text>
            <Text style={[styles.guideDescription, { color: theme.TEXT_SECONDARY }]}>{guide.description}</Text>
            <View style={styles.guideMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.TEXT_SECONDARY} />
                <Text style={[styles.metaText, { color: theme.TEXT_SECONDARY }]}>{guide.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="bar-chart-outline" size={14} color={theme.TEXT_SECONDARY} />
                <Text style={[styles.metaText, { color: theme.TEXT_SECONDARY }]}>{guide.difficulty}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.GRAY_MEDIUM} />
        </View>
      </TouchableOpacity>
    </Card>
  );

  const GuideDetailView = () => (
    <SafeAreaView style={[styles.detailContainer, { backgroundColor: theme.BACKGROUND }]}>
      <View style={[styles.detailHeader, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedGuide(null)}
        >
          <Ionicons name="arrow-back" size={24} color={theme.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.detailTitle, { color: theme.TEXT_PRIMARY }]}>{selectedGuide.title}</Text>
        <TouchableOpacity
          style={[styles.emergencyButton, { backgroundColor: theme.EMERGENCY }]}
          onPress={() => Alert.alert('Emergency', 'Call 911 for immediate medical assistance')}
        >
          <Ionicons name="call" size={20} color={theme.WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.detailContent}>
        <Card style={[styles.overviewCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <View style={styles.overviewHeader}>
            <View style={[styles.detailIcon, { backgroundColor: selectedGuide.color }]}>
              <Ionicons name={selectedGuide.icon} size={24} color={theme.WHITE} />
            </View>
            <View style={styles.overviewText}>
              <Text style={[styles.overviewTitle, { color: theme.TEXT_PRIMARY }]}>{selectedGuide.title}</Text>
              <Text style={[styles.overviewDescription, { color: theme.TEXT_SECONDARY }]}>{selectedGuide.description}</Text>
            </View>
          </View>
          
          <View style={[styles.overviewMeta, { borderTopColor: theme.BORDER }]}>
            <View style={styles.overviewMetaItem}>
              <Ionicons name="time" size={16} color={theme.PRIMARY} />
              <Text style={[styles.overviewMetaText, { color: theme.PRIMARY }]}>{selectedGuide.time}</Text>
            </View>
            <View style={styles.overviewMetaItem}>
              <Ionicons name="bar-chart" size={16} color={theme.PRIMARY} />
              <Text style={[styles.overviewMetaText, { color: theme.PRIMARY }]}>{selectedGuide.difficulty}</Text>
            </View>
          </View>
        </Card>

        {selectedGuide.steps.map((step, index) => (
          <Card key={index} style={[styles.stepCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, { backgroundColor: theme.PRIMARY }]}>
                <Text style={[styles.stepNumberText, { color: theme.WHITE }]}>{step.step}</Text>
              </View>
              <Text style={[styles.stepTitle, { color: theme.TEXT_PRIMARY }]}>{step.title}</Text>
            </View>
            <Text style={[styles.stepDescription, { color: theme.TEXT_SECONDARY }]}>{step.description}</Text>
            {step.tips && (
              <View style={[styles.stepTips, { backgroundColor: theme.WARNING + '10', borderLeftColor: theme.WARNING }]}>
                <Ionicons name="bulb" size={16} color={theme.WARNING} />
                <Text style={[styles.stepTipsText, { color: theme.TEXT_PRIMARY }]}>{step.tips}</Text>
              </View>
            )}
          </Card>
        ))}

        <Card style={[styles.emergencyCard, { backgroundColor: theme.EMERGENCY + '10', borderColor: theme.EMERGENCY }]}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={24} color={theme.EMERGENCY} />
            <Text style={[styles.emergencyTitle, { color: theme.EMERGENCY }]}>When to Call 911</Text>
          </View>
          <Text style={[styles.emergencyText, { color: theme.TEXT_PRIMARY }]}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.TEXT_PRIMARY }}>Loading First Aid Guides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.ERROR }]}>{error}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>First Aid Guide</Text>
        <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>Emergency medical procedures and safety tips</Text>
        
        <TouchableOpacity 
          style={[styles.emergencyBanner, { backgroundColor: theme.EMERGENCY }]}
          onPress={() => Alert.alert('Emergency', 'Call 911 for immediate medical assistance')}
        >
          <Ionicons name="warning" size={20} color={theme.WHITE} />
          <Text style={[styles.emergencyBannerText, { color: theme.WHITE }]}>Emergency? Call 911</Text>
          <Ionicons name="call" size={20} color={theme.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={[styles.categoriesContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
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
          <RefreshControl refreshing={loading} onRefresh={loadFirstAidGuides} colors={[theme.PRIMARY]} />
        }
      >
        {filteredGuides.map((guide) => (
          <FirstAidCard key={guide.id} guide={guide} />
        ))}
      </ScrollView>
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
    paddingVertical: SPACING.LG,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  title: {
    fontSize: FONT_SIZES.XL,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  categoriesContainer: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: theme.CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  categoriesScrollView: {
    paddingVertical: SPACING.XS,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.XL,
    marginRight: SPACING.SM,
    borderWidth: 1,
  },
  activeCategoryButton: {
    backgroundColor: theme.PRIMARY,
  },
  categoryText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '500',
    marginLeft: SPACING.XS,
  },
  activeCategoryText: {
    color: theme.WHITE,
  },
  content: {
    flex: 1,
    padding: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  guideCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    marginBottom: SPACING.XS / 2,
  },
  guideDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
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
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  detailHeader: {
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
    padding: SPACING.SM,
  },
  detailTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.MD,
  },
  emergencyButton: {
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
  },
  detailContent: {
    flex: 1,
    padding: SPACING.MD,
  },
  overviewCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
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
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  overviewDescription: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
  },
  overviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: theme.BORDER,
  },
  overviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewMetaText: {
    fontSize: FONT_SIZES.SM,
    color: theme.PRIMARY,
    marginLeft: SPACING.XS,
    fontWeight: '600',
  },
  stepCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
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
    backgroundColor: theme.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.SM,
    color: theme.WHITE,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    flex: 1,
  },
  stepDescription: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: SPACING.SM,
  },
  stepTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.WARNING + '10',
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    borderLeftWidth: 3,
    borderLeftColor: theme.WARNING,
  },
  stepTipsText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
    fontStyle: 'italic',
  },
  emergencyCard: {
    backgroundColor: theme.EMERGENCY + '10',
    borderWidth: 1,
    borderColor: theme.EMERGENCY,
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
    color: theme.EMERGENCY,
    marginLeft: SPACING.SM,
  },
  emergencyText: {
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    lineHeight: 22,
    marginBottom: SPACING.MD,
  },
  emergencyCallButton: {
    backgroundColor: theme.EMERGENCY,
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
    color: theme.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  
  retryButton: {
    marginTop: SPACING.MD,
  },
});

export default FirstAidScreen;