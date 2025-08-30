/**
 * AI Health Assistant Service for LifeLine+ Healthcare App
 * Provides symptom checking, preliminary diagnosis, and health recommendations
 */

// Symptom database - in a real app, this would be more comprehensive and possibly fetched from an API
const SYMPTOM_DATABASE = {
  // Common symptoms with associated conditions
  'fever': {
    conditions: ['flu', 'common cold', 'COVID-19', 'infection'],
    severity: 'moderate',
    recommendations: [
      'Rest and stay hydrated',
      'Monitor temperature regularly',
      'Consider over-the-counter fever reducers',
      'Seek medical attention if fever exceeds 103°F (39.4°C)'
    ]
  },
  'headache': {
    conditions: ['tension headache', 'migraine', 'sinusitis', 'dehydration'],
    severity: 'mild',
    recommendations: [
      'Rest in a quiet, dark room',
      'Stay hydrated',
      'Apply cold or warm compress',
      'Consider over-the-counter pain relievers'
    ]
  },
  'chest_pain': {
    conditions: ['heart attack', 'angina', 'acid reflux', 'muscle strain'],
    severity: 'severe',
    recommendations: [
      'Seek immediate medical attention if severe',
      'Do not drive yourself to the hospital',
      'Call emergency services (911)',
      'Take aspirin if not allergic'
    ]
  },
  'shortness_of_breath': {
    conditions: ['asthma', 'COPD', 'heart failure', 'pulmonary embolism'],
    severity: 'severe',
    recommendations: [
      'Sit upright and try to remain calm',
      'Use prescribed inhaler if available',
      'Seek immediate medical attention if severe',
      'Call emergency services if breathing becomes very difficult'
    ]
  },
  'abdominal_pain': {
    conditions: ['appendicitis', 'food poisoning', 'ulcers', 'gallstones'],
    severity: 'moderate',
    recommendations: [
      'Monitor pain location and intensity',
      'Avoid solid foods if severe',
      'Stay hydrated',
      'Seek medical attention if pain worsens or persists'
    ]
  },
  'joint_pain': {
    conditions: ['arthritis', 'injury', 'gout', 'inflammation'],
    severity: 'mild',
    recommendations: [
      'Rest the affected joint',
      'Apply ice for acute injuries',
      'Consider anti-inflammatory medication',
      'Gentle stretching exercises'
    ]
  },
  'nausea': {
    conditions: ['food poisoning', 'pregnancy', 'migraine', 'medication side effect'],
    severity: 'mild',
    recommendations: [
      'Stay hydrated with small sips of water',
      'Avoid solid foods until nausea passes',
      'Try ginger tea or crackers',
      'Rest and avoid strong odors'
    ]
  },
  'fatigue': {
    conditions: ['anemia', 'depression', 'sleep disorder', 'thyroid issues'],
    severity: 'mild',
    recommendations: [
      'Ensure adequate sleep (7-9 hours)',
      'Maintain a balanced diet',
      'Regular exercise',
      'Manage stress levels'
    ]
  },
  'cough': {
    conditions: ['common cold', 'bronchitis', 'asthma', 'COVID-19'],
    severity: 'mild',
    recommendations: [
      'Stay hydrated',
      'Use a humidifier',
      'Honey for soothing throat',
      'Avoid irritants like smoke'
    ]
  },
  'dizziness': {
    conditions: ['dehydration', 'low blood pressure', 'inner ear issues', 'medication side effect'],
    severity: 'moderate',
    recommendations: [
      'Sit or lie down immediately',
      'Stay hydrated',
      'Avoid sudden movements',
      'Seek medical attention if persistent or severe'
    ]
  }
};

// Medical conditions with detailed information
const CONDITION_DATABASE = {
  'flu': {
    description: 'Influenza is a viral infection that attacks your respiratory system.',
    symptoms: ['fever', 'cough', 'sore throat', 'runny nose', 'body aches', 'fatigue'],
    treatment: 'Rest, fluids, over-the-counter medications for symptom relief',
    when_to_see_doctor: 'If symptoms worsen after a week, difficulty breathing, high fever'
  },
  'common_cold': {
    description: 'A viral infection of your nose and throat (upper respiratory tract).',
    symptoms: ['runny nose', 'sore throat', 'cough', 'mild fever', 'sneezing'],
    treatment: 'Rest, fluids, over-the-counter cold medications',
    when_to_see_doctor: 'If symptoms persist beyond 10 days, high fever, severe headache'
  },
  'COVID-19': {
    description: 'A contagious disease caused by the SARS-CoV-2 virus.',
    symptoms: ['fever', 'cough', 'shortness_of_breath', 'loss_of_taste_or_smell', 'fatigue'],
    treatment: 'Rest, fluids, follow CDC guidelines for isolation',
    when_to_see_doctor: 'Difficulty breathing, persistent chest pain, confusion, bluish lips'
  },
  'heart_attack': {
    description: 'Occurs when blood flow to part of the heart is blocked.',
    symptoms: ['chest_pain', 'shortness_of_breath', 'nausea', 'cold_sweat', 'lightheadedness'],
    treatment: 'Immediate emergency medical attention required',
    when_to_see_doctor: 'Immediately - call 911'
  },
  'migraine': {
    description: 'A neurological condition characterized by intense headaches.',
    symptoms: ['headache', 'nausea', 'sensitivity_to_light', 'sensitivity_to_sound'],
    treatment: 'Prescription medications, rest in dark room, avoid triggers',
    when_to_see_doctor: 'If headaches become more frequent or severe, new neurological symptoms'
  }
};

class AIHealthAssistant {
  /**
   * Analyze symptoms and provide preliminary assessment
   * @param {Array} symptoms - Array of reported symptoms
   * @returns {Object} Assessment with possible conditions and recommendations
   */
  static analyzeSymptoms(symptoms) {
    if (!symptoms || symptoms.length === 0) {
      return {
        message: 'Please describe your symptoms for an assessment.',
        severity: 'unknown',
        conditions: [],
        recommendations: ['Describe your symptoms for personalized health advice.'],
        disclaimer: 'This is not a substitute for professional medical advice, diagnosis, or treatment.'
      };
    }

    // Count occurrences of each condition
    const conditionCounts = {};
    const allRecommendations = [];
    let maxSeverity = 'mild';

    // Process each symptom
    symptoms.forEach(symptom => {
      const normalizedSymptom = symptom.toLowerCase().replace(/\s+/g, '_');
      const symptomData = SYMPTOM_DATABASE[normalizedSymptom];
      
      if (symptomData) {
        // Update severity level
        if (symptomData.severity === 'severe') {
          maxSeverity = 'severe';
        } else if (symptomData.severity === 'moderate' && maxSeverity === 'mild') {
          maxSeverity = 'moderate';
        }
        
        // Add recommendations
        allRecommendations.push(...symptomData.recommendations);
        
        // Count conditions
        symptomData.conditions.forEach(condition => {
          conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
        });
      }
    });

    // Sort conditions by frequency
    const sortedConditions = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([condition, count]) => ({ name: condition, matches: count }));

    // Get detailed condition information
    const conditionDetails = sortedConditions.slice(0, 3).map(condition => {
      const details = CONDITION_DATABASE[condition.name.replace(/\s+/g, '_')];
      return {
        name: condition.name,
        matches: condition.matches,
        ...details
      };
    });

    // Generate appropriate message based on severity
    let message = '';
    if (maxSeverity === 'severe') {
      message = 'You are experiencing severe symptoms that may require immediate medical attention.';
    } else if (maxSeverity === 'moderate') {
      message = 'Your symptoms suggest a moderate condition that may benefit from medical evaluation.';
    } else {
      message = 'Your symptoms appear to be mild. Here are some recommendations for self-care.';
    }

    return {
      message,
      severity: maxSeverity,
      conditions: conditionDetails,
      recommendations: [...new Set(allRecommendations)], // Remove duplicates
      disclaimer: 'This assessment is based on general medical knowledge and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.'
    };
  }

  /**
   * Get health recommendations based on user profile
   * @param {Object} userProfile - User's health profile
   * @returns {Array} Personalized health recommendations
   */
  static getHealthRecommendations(userProfile) {
    const recommendations = [];
    
    // Age-based recommendations
    if (userProfile.age) {
      const age = parseInt(userProfile.age);
      if (age >= 65) {
        recommendations.push('Consider regular bone density screenings');
        recommendations.push('Stay up to date with pneumonia and flu vaccines');
        recommendations.push('Monitor blood pressure and cholesterol regularly');
      } else if (age >= 40) {
        recommendations.push('Consider regular cancer screenings as recommended');
        recommendations.push('Maintain heart-healthy lifestyle');
        recommendations.push('Regular eye and dental checkups');
      } else {
        recommendations.push('Maintain a balanced diet and regular exercise');
        recommendations.push('Get adequate sleep (7-9 hours)');
        recommendations.push('Stay hydrated throughout the day');
      }
    }
    
    // Gender-based recommendations
    if (userProfile.gender) {
      if (userProfile.gender.toLowerCase() === 'female') {
        recommendations.push('Regular gynecological checkups');
        recommendations.push('Consider bone health and calcium intake');
      } else if (userProfile.gender.toLowerCase() === 'male') {
        recommendations.push('Regular prostate health screenings after age 50');
        recommendations.push('Monitor heart health');
      }
    }
    
    // Medical history based recommendations
    if (userProfile.medicalHistory && Array.isArray(userProfile.medicalHistory)) {
      if (userProfile.medicalHistory.includes('diabetes')) {
        recommendations.push('Monitor blood sugar levels regularly');
        recommendations.push('Maintain a balanced diet low in refined sugars');
        recommendations.push('Regular foot examinations');
      }
      
      if (userProfile.medicalHistory.includes('hypertension')) {
        recommendations.push('Monitor blood pressure regularly');
        recommendations.push('Reduce sodium intake');
        recommendations.push('Regular cardiovascular exercise');
      }
      
      if (userProfile.medicalHistory.includes('asthma')) {
        recommendations.push('Keep inhaler accessible');
        recommendations.push('Avoid known triggers');
        recommendations.push('Regular pulmonary function tests');
      }
    }
    
    // Lifestyle recommendations
    recommendations.push('Regular physical activity (at least 150 minutes per week)');
    recommendations.push('Balanced diet rich in fruits and vegetables');
    recommendations.push('Adequate sleep (7-9 hours for most adults)');
    recommendations.push('Stay hydrated (8-10 glasses of water daily)');
    recommendations.push('Limit alcohol consumption');
    recommendations.push('Avoid smoking and secondhand smoke');
    
    return recommendations;
  }

  /**
   * Generate a health score based on user profile and habits
   * @param {Object} userProfile - User's health profile
   * @param {Object} healthData - User's health tracking data
   * @returns {Object} Health score and breakdown
   */
  static calculateHealthScore(userProfile, healthData = {}) {
    let score = 100; // Start with perfect score
    const breakdown = [];
    
    // Age factor
    if (userProfile.age) {
      const age = parseInt(userProfile.age);
      if (age > 65) {
        score -= 10;
        breakdown.push({ factor: 'Age (65+)', impact: -10, reason: 'Increased health risks with age' });
      } else if (age > 40) {
        score -= 5;
        breakdown.push({ factor: 'Age (40+)', impact: -5, reason: 'Moderate health risks with age' });
      }
    }
    
    // Medical history factor
    if (userProfile.medicalHistory && Array.isArray(userProfile.medicalHistory)) {
      const chronicConditions = userProfile.medicalHistory.length;
      const deduction = Math.min(chronicConditions * 5, 20); // Max 20 point deduction
      if (deduction > 0) {
        score -= deduction;
        breakdown.push({ 
          factor: 'Medical History', 
          impact: -deduction, 
          reason: `${chronicConditions} chronic condition(s) may impact overall health` 
        });
      }
    }
    
    // Lifestyle factors from health data
    if (healthData.exerciseFrequency) {
      const exerciseScore = Math.min(healthData.exerciseFrequency * 2, 10); // Max 10 points
      score += exerciseScore;
      breakdown.push({ 
        factor: 'Physical Activity', 
        impact: exerciseScore, 
        reason: `Regular exercise contributes positively to health` 
      });
    }
    
    if (healthData.sleepHours) {
      const sleepHours = parseFloat(healthData.sleepHours);
      let sleepScore = 0;
      if (sleepHours >= 7 && sleepHours <= 9) {
        sleepScore = 5; // Optimal sleep
      } else if (sleepHours >= 6 || sleepHours <= 10) {
        sleepScore = 2; // Acceptable sleep
      } else {
        sleepScore = -3; // Poor sleep
      }
      score += sleepScore;
      breakdown.push({ 
        factor: 'Sleep Quality', 
        impact: sleepScore, 
        reason: `${sleepHours} hours of sleep per night` 
      });
    }
    
    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));
    
    // Health status description
    let status = '';
    if (score >= 80) {
      status = 'Excellent';
    } else if (score >= 60) {
      status = 'Good';
    } else if (score >= 40) {
      status = 'Fair';
    } else {
      status = 'Poor';
    }
    
    return {
      score,
      status,
      breakdown,
      recommendations: this.getHealthRecommendations(userProfile)
    };
  }
}

export default AIHealthAssistant;