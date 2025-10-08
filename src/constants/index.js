// App Constants
export const APP_NAME = 'LifeLine+';
export const APP_VERSION = '1.0.0';

// User Roles
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  EMERGENCY_OPERATOR: 'emergency_operator'
};

// Emergency Status
export const EMERGENCY_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Consultation Status
export const CONSULTATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  EMERGENCY: 'emergency',
  REMINDER: 'reminder',
  HEALTH_TIP: 'health_tip',
  CONSULTATION: 'consultation'
};

// Colors (Modern Healthcare Theme) - These are default colors, actual theme colors come from ThemeContext
export const COLORS = {
  PRIMARY: '#2E86AB',
  PRIMARYB: '#026932ff',
  SECONDARY: '#A23B72',
  ACCENT: '#F18F01',
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FF9800',
  INFO: '#2196F3',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_LIGHT: '#F5F5F5',
  GRAY_MEDIUM: '#9E9E9E',
  GRAY_DARK: '#424242',
  EMERGENCY: '#E53E3E',
  EMERGENCY_LIGHT: '#FED7D7',
  BACKGROUND: '#F8F9FA',
  CARD_BACKGROUND: '#FFFFFF',
  BORDER: '#E2E8F0',
  TEXT_PRIMARY: '#2D3748',
  TEXT_SECONDARY: '#718096',
  OVERLAY: 'rgba(0, 0, 0, 0.5)'
};

// Fonts
export const FONTS = {
  REGULAR: 'System',
  MEDIUM: 'System',
  BOLD: 'System',
  LIGHT: 'System'
};

// Font Sizes
export const FONT_SIZES = {
  XS: 12,
  SM: 14,
  MD: 16,
  LG: 18,
  XL: 20,
  XXL: 24,
  XXXL: 32
};

// Spacing
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48
};

// Border Radius
export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  CIRCLE: 50
};

// Emergency Contacts
export const EMERGENCY_CONTACTS = {
  AMBULANCE: '911',
  FIRE: '911',
  POLICE: '911',
  POISON_CONTROL: '1-800-222-1222'
};

// Medical Specializations
export const MEDICAL_SPECIALIZATIONS = [
  'General Practitioner',
  'Cardiologist',
  'Dermatologist',
  'Endocrinologist',
  'Gastroenterologist',
  'Neurologist',
  'Oncologist',
  'Orthopedist',
  'Pediatrician',
  'Psychiatrist',
  'Pulmonologist',
  'Radiologist',
  'Surgeon',
  'Urologist'
];

// Languages
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' }
];

// File Types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif'],
  DOCUMENTS: ['pdf', 'doc', 'docx'],
  ALL: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
};

// Max file size (in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500
};