import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
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
import Button from '../components/Button';
import AIHealthAssistant from '../services/aiHealthAssistant';

// Move SymptomCheckerTab outside to prevent re-creation
const SymptomCheckerTab = ({ 
  symptoms, 
  handleSymptomsChange, 
  loading, 
  analyzeSymptoms,
  textInputRef,
  scrollViewRef,
  assessment,
  getSeverityColor,
  theme // Add theme prop
}) => (
  <KeyboardAvoidingView
    style={[styles.keyboardAvoidingView, { backgroundColor: theme.BACKGROUND }]}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
  >
    <ScrollView
      ref={scrollViewRef}
      style={[styles.tabContent, { backgroundColor: theme.BACKGROUND }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
      contentContainerStyle={[styles.scrollViewContent, { backgroundColor: theme.BACKGROUND }]}
    >
      <Card style={[styles.inputCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
        <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Describe Your Symptoms</Text>
        <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>
          Enter your symptoms separated by commas or new lines. For example: "headache, fever, fatigue"
        </Text>

        <View style={styles.textInputContainer}>
          <TextInput
            ref={textInputRef}
            style={[styles.symptomsInput, { 
              borderColor: theme.BORDER, 
              backgroundColor: theme.WHITE, 
              color: theme.TEXT_PRIMARY 
            }]}
            value={symptoms}
            onChangeText={handleSymptomsChange}
            placeholder="e.g., headache, fever, cough, fatigue..."
            placeholderTextColor={theme.GRAY_MEDIUM}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            blurOnSubmit={false}
            scrollEnabled={false}
          />
        </View>

        <Button
          title={loading ? "Analyzing..." : "Analyze Symptoms"}
          onPress={analyzeSymptoms}
          disabled={loading}
          style={styles.analyzeButton}
        />
      </Card>

      {assessment && (
        <Card style={[styles.assessmentCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
          <View style={styles.assessmentHeader}>
            <Ionicons 
              name={assessment.severity === 'severe' ? 'warning' : 'information-circle'} 
              size={24} 
              color={getSeverityColor(assessment.severity)} 
            />
            <Text style={[styles.assessmentTitle, { color: getSeverityColor(assessment.severity) }]}>
              {assessment.message}
            </Text>
          </View>
          
          {assessment.conditions.length > 0 && (
            <View style={styles.conditionsSection}>
              <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Possible Conditions</Text>
              {assessment.conditions.map((condition, index) => (
                <View key={index} style={[styles.conditionCard, { backgroundColor: theme.GRAY_LIGHT }]}>
                  <Text style={[styles.conditionName, { color: theme.TEXT_PRIMARY }]}>{condition.name}</Text>
                  <Text style={[styles.conditionDescription, { color: theme.TEXT_SECONDARY }]}>{condition.description}</Text>
                  <Text style={[styles.whenToSeeDoctor, { color: theme.TEXT_SECONDARY }]}>
                    <Text style={[styles.whenToSeeDoctorLabel, { color: theme.TEXT_PRIMARY }]}>When to see a doctor: </Text>
                    {condition.when_to_see_doctor}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {assessment.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Recommendations</Text>
              {assessment.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.SUCCESS} />
                  <Text style={[styles.recommendationText, { color: theme.TEXT_PRIMARY }]}>{recommendation}</Text>
              </View>
              ))}
            </View>
          )}
          
          <View style={[styles.disclaimerCard, { backgroundColor: theme.WARNING + '10', borderColor: theme.WARNING }]}>
            <Ionicons name="warning" size={16} color={theme.WARNING} />
            <Text style={[styles.disclaimerText, { color: theme.TEXT_SECONDARY }]}>{assessment.disclaimer}</Text>
          </View>
        </Card>
      )}

      {!assessment && (
        <Card style={[styles.infoCard, { backgroundColor: theme.INFO + '10', borderColor: theme.INFO }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="bulb" size={24} color={theme.INFO} />
            <Text style={[styles.infoTitle, { color: theme.INFO }]}>How It Works</Text>
          </View>
          <Text style={[styles.infoText, { color: theme.TEXT_SECONDARY }]}>
            Our AI Health Assistant analyzes your symptoms to provide preliminary insights.
            It's designed to help you understand potential conditions and decide when to seek
            medical attention, but it's not a substitute for professional medical advice.
          </Text>
          <Text style={[styles.infoText, { color: theme.TEXT_SECONDARY }]}>
            In case of emergency symptoms like chest pain, difficulty breathing, or severe
            injuries, please call emergency services immediately.
          </Text>
        </Card>
      )}
    </ScrollView>
  </KeyboardAvoidingView>
);

const HealthScoreTab = ({ healthScore, getHealthScoreColor, theme }) => ( // Add theme prop
  <ScrollView style={[styles.tabContent, { backgroundColor: theme.BACKGROUND }]} showsVerticalScrollIndicator={false}>
    {healthScore && (
      <Card style={[styles.healthScoreCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
        <Text style={[styles.healthScoreTitle, { color: theme.TEXT_PRIMARY }]}>Your Health Score</Text>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: getHealthScoreColor(healthScore.score) }]}>
            {healthScore.score}
          </Text>
          <Text style={[styles.scoreMax, { color: theme.TEXT_SECONDARY }]}>/100</Text>
        </View>
        
        <Text style={[styles.scoreStatus, { color: getHealthScoreColor(healthScore.score) }]}>
          {healthScore.status}
        </Text>
        
        <View style={styles.scoreBreakdown}>
          <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Score Breakdown</Text>
          {healthScore.breakdown.map((item, index) => (
            <View key={index} style={[styles.breakdownItem, { borderBottomColor: theme.BORDER }]}>
              <Text style={[styles.breakdownFactor, { color: theme.TEXT_PRIMARY }]}>{item.factor}</Text>
              <Text style={[styles.breakdownImpact, { color: item.impact >= 0 ? theme.SUCCESS : theme.ERROR }]}>
                {item.impact > 0 ? '+' : ''}{item.impact}
              </Text>
              <Text style={[styles.breakdownReason, { color: theme.TEXT_SECONDARY }]}>{item.reason}</Text>
            </View>
          ))}
        </View>
      </Card>
    )}

    <Card style={[styles.recommendationsCard, { backgroundColor: theme.CARD_BACKGROUND, borderColor: theme.BORDER }]}>
      <Text style={[styles.sectionTitle, { color: theme.TEXT_PRIMARY }]}>Personalized Recommendations</Text>
      {healthScore?.recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Ionicons name="checkmark-circle" size={16} color={theme.SUCCESS} />
          <Text style={[styles.recommendationText, { color: theme.TEXT_PRIMARY }]}>{recommendation}</Text>
        </View>
      ))}
    </Card>

    <Card style={[styles.infoCard, { backgroundColor: theme.INFO + '10', borderColor: theme.INFO }]}>
      <View style={styles.infoHeader}>
        <Ionicons name="bar-chart" size={24} color={theme.INFO} />
        <Text style={[styles.infoTitle, { color: theme.INFO }]}>Understanding Your Health Score</Text>
      </View>
      <Text style={[styles.infoText, { color: theme.TEXT_SECONDARY }]}>
        Your health score is calculated based on various factors including your age, 
        medical history, and lifestyle habits. It's designed to give you a general 
        overview of your health status.
      </Text>
      <Text style={[styles.infoText, { color: theme.TEXT_SECONDARY }]}>
        A higher score indicates better overall health, while a lower score suggests 
        areas where you might want to focus on improvement.
      </Text>
    </Card>
  </ScrollView>
);

const AIHealthAssistantScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [symptoms, setSymptoms] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('symptomChecker'); // symptomChecker, healthScore
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    // Calculate initial health score
    if (userProfile) {
      const score = AIHealthAssistant.calculateHealthScore(userProfile);
      setHealthScore(score);
    }
  }, [userProfile]);

  const handleSymptomsChange = useCallback((text) => {
    setSymptoms(text);
  }, []);

  const analyzeSymptoms = () => {
    if (!symptoms.trim()) {
      Alert.alert('Please enter your symptoms', 'Describe what you\'re experiencing for an assessment.');
      return;
    }

    setLoading(true);
    
    // Dismiss keyboard before processing
    Keyboard.dismiss();
    
    // Simulate processing time
    setTimeout(() => {
      try {
        // Split symptoms by comma or newline
        const symptomArray = symptoms.split(/[,|\n]+/).map(s => s.trim()).filter(s => s);
        const result = AIHealthAssistant.analyzeSymptoms(symptomArray);
        setAssessment(result);
      } catch (error) {
        console.error('Error analyzing symptoms:', error);
        Alert.alert('Error', 'Failed to analyze symptoms. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return theme.SUCCESS;
    if (score >= 60) return theme.WARNING;
    if (score >= 40) return theme.INFO;
    return theme.ERROR;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'severe': return theme.ERROR;
      case 'moderate': return theme.WARNING;
      case 'mild': return theme.SUCCESS;
      default: return theme.GRAY_MEDIUM;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <Text style={[styles.title, { color: theme.TEXT_PRIMARY }]}>AI Health Assistant</Text>
        <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>Symptom checker and health insights</Text>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: theme.CARD_BACKGROUND, borderBottomColor: theme.BORDER }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'symptomChecker' && styles.activeTab, { borderBottomColor: theme.PRIMARY }]}
          onPress={() => setActiveTab('symptomChecker')}
        >
          <Text style={[styles.tabText, activeTab === 'symptomChecker' && styles.activeTabText, { color: activeTab === 'symptomChecker' ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
            Symptom Checker
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'healthScore' && styles.activeTab, { borderBottomColor: theme.PRIMARY }]}
          onPress={() => setActiveTab('healthScore')}
        >
          <Text style={[styles.tabText, activeTab === 'healthScore' && styles.activeTabText, { color: activeTab === 'healthScore' ? theme.PRIMARY : theme.TEXT_SECONDARY }]}>
            Health Score
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'symptomChecker' ? (
        <SymptomCheckerTab 
          symptoms={symptoms}
          handleSymptomsChange={handleSymptomsChange}
          loading={loading}
          analyzeSymptoms={analyzeSymptoms}
          textInputRef={textInputRef}
          scrollViewRef={scrollViewRef}
          assessment={assessment}
          getSeverityColor={getSeverityColor}
          theme={theme} // Pass theme to SymptomCheckerTab
        />
      ) : (
        <HealthScoreTab 
          healthScore={healthScore}
          getHealthScoreColor={getHealthScoreColor}
          theme={theme} // Pass theme to HealthScoreTab
        />
      )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.CARD_BACKGROUND,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.PRIMARY,
  },
  tabText: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: theme.TEXT_SECONDARY,
  },
  activeTabText: {
    color: theme.PRIMARY,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: theme.BACKGROUND,
  },
  tabContent: {
    flex: 1,
    padding: SPACING.MD,
    backgroundColor: theme.BACKGROUND,
  },
  scrollViewContent: {
    backgroundColor: theme.BACKGROUND,
  },
  inputCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  symptomsInput: {
    borderWidth: 1,
    borderColor: theme.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    minHeight: 100,
    backgroundColor: theme.INPUT_BACKGROUND,
  },
  textInputContainer: {
    marginBottom: SPACING.MD,
  },
  analyzeButton: {
    marginTop: SPACING.SM,
  },
  assessmentCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  assessmentTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    marginLeft: SPACING.SM,
    flex: 1,
  },
  conditionsSection: {
    marginBottom: SPACING.MD,
  },
  conditionCard: {
    backgroundColor: theme.BUTTON_SECONDARY,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  conditionName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  conditionDescription: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  whenToSeeDoctor: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  whenToSeeDoctorLabel: {
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
  },
  recommendationsSection: {
    marginBottom: SPACING.MD,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  recommendationText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  disclaimerCard: {
    backgroundColor: theme.WARNING + '10',
    borderColor: theme.WARNING,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    flexDirection: 'row',
  },
  disclaimerText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  infoCard: {
    backgroundColor: theme.INFO + '10',
    borderColor: theme.INFO,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  infoTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.INFO,
    marginLeft: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },
  healthScoreCard: {
    marginBottom: SPACING.MD,
    alignItems: 'center',
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  healthScoreTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.SM,
  },
  scoreText: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: FONT_SIZES.LG,
    color: theme.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  scoreStatus: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    marginBottom: SPACING.LG,
  },
  scoreBreakdown: {
    width: '100%',
  },
  breakdownItem: {
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  breakdownFactor: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  breakdownImpact: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    marginBottom: SPACING.XS / 2,
  },
  breakdownReason: {
    fontSize: FONT_SIZES.SM,
    color: theme.TEXT_SECONDARY,
  },
  recommendationsCard: {
    marginBottom: SPACING.MD,
    backgroundColor: theme.CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
});

export default AIHealthAssistantScreen;