import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';

// Function to seed First Aid Guide data to Firestore
export const seedFirstAidGuides = async (firstAidGuidesData) => {
  try {
    console.log('Seeding First Aid Guides to Firestore...');
    
    for (const guide of firstAidGuidesData) {
      // Create or update the guide document
      const guideRef = doc(db, 'firstAidGuides', guide.id);
      await setDoc(guideRef, {
        ...guide,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Successfully seeded guide: ${guide.title}`);
    }
    
    console.log('All First Aid Guides seeded successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding First Aid Guides:', error);
    return { success: false, error: error.message };
  }
};

// Function to fetch First Aid Guides from Firestore
export const fetchFirstAidGuides = async () => {
  try {
    console.log('Fetching First Aid Guides from Firestore...');
    
    const firstAidGuidesCollection = collection(db, 'firstAidGuides');
    const q = query(firstAidGuidesCollection);
    const querySnapshot = await getDocs(q);
    
    const guides = [];
    querySnapshot.forEach((doc) => {
      guides.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Successfully fetched ${guides.length} First Aid Guides`);
    return guides;
  } catch (error) {
    console.error('Error fetching First Aid Guides:', error);
    throw error;
  }
};

// The mock data that will be seeded to Firestore
export const firstAidGuidesMockData = [
  {
    id: 'cpr',
    title: 'CPR (Cardiopulmonary Resuscitation)',
    category: 'emergency',
    difficulty: 'Advanced',
    time: '15-30 minutes',
    description: 'Life-saving technique for cardiac emergencies',
    icon: 'heart',
    color: '#E53E3E',
    steps: [
      {
        step: 1,
        title: 'Check Responsiveness',
        description: 'Tap shoulders firmly and shout "Are you OK?" If no response, call 911 immediately.',
        tips: 'Look for normal breathing - gasping is not normal breathing'
      },
      {
        step: 2,
        title: 'Position Your Hands',
        description: 'Place heel of one hand on center of chest between nipples. Place other hand on top, interlacing fingers.',
        tips: 'Keep arms straight and shoulders directly over hands'
      },
      {
        step: 3,
        title: 'Start Compressions',
        description: 'Push hard and fast at least 2 inches deep at a rate of 100-120 compressions per minute.',
        tips: 'Allow complete chest recoil between compressions'
      },
      {
        step: 4,
        title: 'Give Rescue Breaths',
        description: 'Tilt head back, lift chin. Give 2 breaths, each lasting 1 second.',
        tips: 'Watch for chest rise with each breath'
      },
      {
        step: 5,
        title: 'Continue Cycles',
        description: 'Continue 30 compressions followed by 2 breaths until help arrives.',
        tips: 'Switch with another person every 2 minutes if possible'
      }
    ]
  },
  {
    id: 'choking',
    title: 'Choking Relief',
    category: 'breathing',
    difficulty: 'Intermediate',
    time: '2-5 minutes',
    description: 'Help someone who is choking',
    icon: 'hand-left',
    color: '#FF9800',
    steps: [
      {
        step: 1,
        title: 'Assess the Situation',
        description: 'Ask "Are you choking?" If they can speak or cough, encourage coughing.',
        tips: 'Universal choking sign is hands clutched to throat'
      },
      {
        step: 2,
        title: 'Position Behind Person',
        description: 'Stand behind the person and wrap arms around their waist.',
        tips: 'For pregnant women or large individuals, place hands on chest'
      },
      {
        step: 3,
        title: 'Make a Fist',
        description: 'Make fist with one hand, place thumb side just above navel.',
        tips: 'Position well below the breastbone'
      },
      {
        step: 4,
        title: 'Perform Abdominal Thrusts',
        description: 'Grasp fist with other hand and thrust upward and inward forcefully.',
        tips: 'Each thrust should be separate and distinct'
      },
      {
        step: 5,
        title: 'Continue Until Clear',
        description: 'Repeat thrusts until object dislodges or person becomes unconscious.',
        tips: 'If unconscious, begin CPR and call 911'
      }
    ]
  },
  {
    id: 'bleeding',
    title: 'Severe Bleeding Control',
    category: 'wounds',
    difficulty: 'Beginner',
    time: '5-10 minutes',
    description: 'Stop severe bleeding effectively',
    icon: 'water',
    color: '#F44336',
    steps: [
      {
        step: 1,
        title: 'Ensure Safety',
        description: 'Put on gloves if available. Ensure scene is safe.',
        tips: 'Your safety is priority - avoid blood contact when possible'
      },
      {
        step: 2,
        title: 'Apply Direct Pressure',
        description: 'Place clean cloth or gauze directly on wound and press firmly.',
        tips: 'Use palm of hand to apply steady, direct pressure'
      },
      {
        step: 3,
        title: 'Maintain Pressure',
        description: 'Keep pressure continuous. Do not lift to check bleeding.',
        tips: 'Add more cloth on top if blood soaks through'
      },
      {
        step: 4,
        title: 'Elevate if Possible',
        description: 'Raise injured area above heart level if no fracture suspected.',
        tips: 'Only elevate if it does not cause more pain'
      },
      {
        step: 5,
        title: 'Secure Bandage',
        description: 'Wrap bandage around wound to maintain pressure.',
        tips: 'Seek medical attention immediately for severe bleeding'
      }
    ]
  },
  {
    id: 'burns',
    title: 'Burn Treatment',
    category: 'burns',
    difficulty: 'Beginner',
    time: '3-5 minutes',
    description: 'Treat minor to moderate burns',
    icon: 'flame-outline',
    color: '#FF9800',
    steps: [
      {
        step: 1,
        title: 'Stop the Burning',
        description: 'Remove person from heat source. Stop, drop, and roll if clothing is on fire.',
        tips: 'Remove hot or burned clothing if not stuck to skin'
      },
      {
        step: 2,
        title: 'Cool the Burn',
        description: 'Run cool (not cold) water over burn for 10-20 minutes.',
        tips: 'Do not use ice, butter, or home remedies'
      },
      {
        step: 3,
        title: 'Assess Severity',
        description: 'Determine if burn is first, second, or third degree.',
        tips: 'Third degree burns require immediate medical attention'
      },
      {
        step: 4,
        title: 'Cover the Burn',
        description: 'Cover with sterile gauze or clean cloth loosely.',
        tips: 'Do not break blisters or remove stuck clothing'
      },
      {
        step: 5,
        title: 'Manage Pain',
        description: 'Give over-the-counter pain medication if conscious.',
        tips: 'Seek medical attention for burns larger than palm of hand'
      }
    ]
  },
  {
    id: 'fracture',
    title: 'Fracture Care',
    category: 'wounds',
    difficulty: 'Intermediate',
    time: '10-15 minutes',
    description: 'Care for suspected fractures',
    icon: 'medical',
    color: '#2196F3',
    steps: [
      {
        step: 1,
        title: 'Do Not Move Person',
        description: 'Keep person still. Do not try to straighten or move injured area.',
        tips: 'Suspect spinal injury if fall from height or motor vehicle accident'
      },
      {
        step: 2,
        title: 'Control Bleeding',
        description: 'If open fracture, control bleeding without moving bone.',
        tips: 'Do not push bone back under skin'
      },
      {
        step: 3,
        title: 'Immobilize',
        description: 'Splint above and below fracture site using available materials.',
        tips: 'Include joints above and below fracture in splint'
      },
      {
        step: 4,
        title: 'Check Circulation',
        description: 'Check pulse, sensation, and movement below injury.',
        tips: 'Loosen splint if fingers/toes become blue or numb'
      },
      {
        step: 5,
        title: 'Get Medical Help',
        description: 'Call 911 or transport to hospital immediately.',
        tips: 'Do not give food or water in case surgery is needed'
      }
    ]
  }
];

// Categories for First Aid Guides
export const firstAidCategories = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'emergency', name: 'Emergency', icon: 'warning' },
  { id: 'wounds', name: 'Wounds', icon: 'bandage' },
  { id: 'breathing', name: 'Breathing', icon: 'lung' },
  { id: 'burns', name: 'Burns', icon: 'flame' },
  { id: 'poisoning', name: 'Poisoning', icon: 'warning' }
];