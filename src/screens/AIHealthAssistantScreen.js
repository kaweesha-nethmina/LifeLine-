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
  getSeverityColor
}) => (
  <KeyboardAvoidingView
    style={styles.keyboardAvoidingView}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
  >
    <ScrollView
      ref={scrollViewRef}
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
      contentContainerStyle={styles.scrollViewContent}
    >
      <Card style={styles.inputCard}>
        <Text style={styles.sectionTitle}>Describe Your Symptoms</Text>
        <Text style={styles.subtitle}>
          Enter your symptoms separated by commas or new lines. For example: "headache, fever, fatigue"
        </Text>

        <View style={styles.textInputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.symptomsInput}
            value={symptoms}
            onChangeText={handleSymptomsChange}
            placeholder="e.g., headache, fever, cough, fatigue..."
            placeholderTextColor={COLORS.GRAY_MEDIUM}
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
        <Card style={styles.assessmentCard}>
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
              <Text style={styles.sectionTitle}>Possible Conditions</Text>
              {assessment.conditions.map((condition, index) => (
                <View key={index} style={styles.conditionCard}>
                  <Text style={styles.conditionName}>{condition.name}</Text>
                  <Text style={styles.conditionDescription}>{condition.description}</Text>
                  <Text style={styles.whenToSeeDoctor}>
                    <Text style={styles.whenToSeeDoctorLabel}>When to see a doctor: </Text>
                    {condition.when_to_see_doctor}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {assessment.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {assessment.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
              ))}
            </View>
          )}
          
          <View style={styles.disclaimerCard}>
            <Ionicons name="warning" size={16} color={COLORS.WARNING} />
            <Text style={styles.disclaimerText}>{assessment.disclaimer}</Text>
          </View>
        </Card>
      )}

      {!assessment && (
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.INFO} />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          <Text style={styles.infoText}>
            Our AI Health Assistant analyzes your symptoms to provide preliminary insights.
            It's designed to help you understand potential conditions and decide when to seek
            medical attention, but it's not a substitute for professional medical advice.
          </Text>
          <Text style={styles.infoText}>
            In case of emergency symptoms like chest pain, difficulty breathing, or severe
            injuries, please call emergency services immediately.
          </Text>
        </Card>
      )}
    </ScrollView>
  </KeyboardAvoidingView>
);

const HealthScoreTab = ({ healthScore, getHealthScoreColor }) => (
  <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
    {healthScore && (
      <Card style={styles.healthScoreCard}>
        <Text style={styles.healthScoreTitle}>Your Health Score</Text>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: getHealthScoreColor(healthScore.score) }]}>
            {healthScore.score}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        
        <Text style={[styles.scoreStatus, { color: getHealthScoreColor(healthScore.score) }]}>
          {healthScore.status}
        </Text>
        
        <View style={styles.scoreBreakdown}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          {healthScore.breakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <Text style={styles.breakdownFactor}>{item.factor}</Text>
              <Text style={[styles.breakdownImpact, { color: item.impact >= 0 ? COLORS.SUCCESS : COLORS.ERROR }]}>
                {item.impact > 0 ? '+' : ''}{item.impact}
              </Text>
              <Text style={styles.breakdownReason}>{item.reason}</Text>
            </View>
          ))}
        </View>
      </Card>
    )}

    <Card style={styles.recommendationsCard}>
      <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
      {healthScore?.recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
          <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      ))}
    </Card>

    <Card style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Ionicons name="bar-chart" size={24} color={COLORS.INFO} />
        <Text style={styles.infoTitle}>Understanding Your Health Score</Text>
      </View>
      <Text style={styles.infoText}>
        Your health score is calculated based on various factors including your age, 
        medical history, and lifestyle habits. It's designed to give you a general 
        overview of your health status.
      </Text>
      <Text style={styles.infoText}>
        A higher score indicates better overall health, while a lower score suggests 
        areas where you might want to focus on improvement.
      </Text>
    </Card>
  </ScrollView>
);

const AIHealthAssistantScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
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
    if (score >= 80) return COLORS.SUCCESS;
    if (score >= 60) return COLORS.WARNING;
    if (score >= 40) return COLORS.INFO;
    return COLORS.ERROR;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'severe': return COLORS.ERROR;
      case 'moderate': return COLORS.WARNING;
      case 'mild': return COLORS.SUCCESS;
      default: return COLORS.GRAY_MEDIUM;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Health Assistant</Text>
        <Text style={styles.subtitle}>Symptom checker and health insights</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'symptomChecker' && styles.activeTab]}
          onPress={() => setActiveTab('symptomChecker')}
        >
          <Text style={[styles.tabText, activeTab === 'symptomChecker' && styles.activeTabText]}>
            Symptom Checker
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'healthScore' && styles.activeTab]}
          onPress={() => setActiveTab('healthScore')}
        >
          <Text style={[styles.tabText, activeTab === 'healthScore' && styles.activeTabText]}>
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
        />
      ) : (
        <HealthScoreTab 
          healthScore={healthScore}
          getHealthScoreColor={getHealthScoreColor}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  
  keyboardAvoidingView: {
    flex: 1,
  },
  
  scrollViewContent: {
    paddingBottom: 20,
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
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.PRIMARY,
  },
  tabContent: {
    flex: 1,
    padding: SPACING.MD,
  },
  inputCard: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  symptomsInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    minHeight: 100,
  },
  textInputContainer: {
    marginBottom: SPACING.MD,
  },
  analyzeButton: {
    marginTop: SPACING.SM,
  },
  assessmentCard: {
    marginBottom: SPACING.MD,
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
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  conditionName: {
    fontSize: FONT_SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  conditionDescription: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  whenToSeeDoctor: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  whenToSeeDoctorLabel: {
    fontWeight: 'bold',
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
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  disclaimerCard: {
    backgroundColor: COLORS.WARNING + '10',
    borderColor: COLORS.WARNING,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    flexDirection: 'row',
  },
  disclaimerText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  infoCard: {
    backgroundColor: COLORS.INFO + '10',
    borderColor: COLORS.INFO,
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
    color: COLORS.INFO,
    marginLeft: SPACING.SM,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },
  healthScoreCard: {
    marginBottom: SPACING.MD,
    alignItems: 'center',
  },
  healthScoreTitle: {
    fontSize: FONT_SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
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
    color: COLORS.TEXT_SECONDARY,
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
    borderBottomColor: COLORS.BORDER,
  },
  breakdownFactor: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  breakdownImpact: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    marginBottom: SPACING.XS / 2,
  },
  breakdownReason: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  recommendationsCard: {
    marginBottom: SPACING.MD,
  },
});

export default AIHealthAssistantScreen;