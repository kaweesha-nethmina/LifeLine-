# Lab Results Feature Documentation

## Overview
This feature allows doctors to upload lab test results for their patients and enables patients to view their own lab results. The implementation includes:

1. A dedicated upload modal component for doctors
2. Integration with Supabase storage for file storage
3. Firestore for metadata storage
4. Display of lab results in patient health records

## Components

### 1. LabResultUploadModal (`src/components/LabResultUploadModal.js`)
A reusable modal component that allows doctors to:
- Select a title for the lab result
- Choose a file (PDF or image) from device storage
- Capture a new image using the camera
- View doctor information (name and license)
- Upload the file with all required metadata

### 2. DoctorPatientsScreen (`src/screens/doctor/DoctorPatientsScreen.js`)
Updated to include:
- A new "Lab Results" action button on each patient card
- Integration with the LabResultUploadModal
- File upload functionality using Supabase storage
- Metadata storage in Firestore

### 3. HealthRecordsScreen (`src/screens/HealthRecordsScreen.js`)
Updated to include:
- A "Lab Results" quick action card
- A dedicated "Recent Lab Results" section
- Display of lab results with doctor information
- Navigation to MedicalHistoryScreen with lab results filter

### 4. MedicalHistoryScreen (`src/screens/MedicalHistoryScreen.js`)
Updated to include:
- Lab results in the medical history timeline
- Filtering by lab results
- Detailed view of lab results with doctor information

## Data Structure

### Firestore Collections
1. `users/{userId}/labResults` - Stores metadata for each lab result
   - `title`: String - Title of the lab result
   - `fileName`: String - Original file name
   - `fileType`: String - MIME type of the file
   - `fileSize`: Number - Size of the file in bytes
   - `fileUrl`: String - Public URL to the file in storage
   - `doctorName`: String - Name of the doctor who uploaded
   - `doctorLicense`: String - License number of the doctor
   - `uploadDate`: Timestamp - When the file was uploaded
   - `uploadedBy`: String - User ID of the doctor
   - `uploadedByName`: String - Name of the doctor
   - `patientId`: String - User ID of the patient
   - `patientName`: String - Name of the patient
   - `status`: String - Status of the lab result

### Supabase Storage
Files are stored in the `healthcare-documents` bucket with the path:
`documents/{doctorId}/lab_results/{timestamp}_{fileName}`

## Implementation Details

### For Doctors
1. Navigate to the Patients screen
2. Select a patient
3. Tap the "Lab Results" button
4. Enter a title for the lab result
5. Select or capture a file
6. Confirm upload

### For Patients
1. Navigate to Health Records
2. View recent lab results in the dedicated section
3. Tap "View All" to see all lab results in Medical History
4. Tap any lab result to view details and file URL

## Future Enhancements
1. Integration with a PDF viewer for better file viewing experience
2. File download functionality
3. Search and filter capabilities for lab results
4. Notifications when new lab results are uploaded
5. Sharing functionality to share lab results with other doctors