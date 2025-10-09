# Lab Results Security Rules

This document outlines the Firebase Firestore security rules needed for the patient-uploaded lab results feature.

## Collection Structure

The lab results are stored in the following structure:
```
users/{userId}/labResults/{labResultId}
```

Each lab result document contains:
- `title`: String - Title of the lab result
- `fileName`: String - Original file name
- `fileType`: String - MIME type of the file
- `fileSize`: Number - Size of the file in bytes
- `fileUrl`: String - URL to access the file
- `supabaseFilePath`: String - Path to the file in Supabase Storage
- `storageProvider`: String - Storage provider (e.g., 'supabase')
- `uploadDate`: Timestamp - When the file was uploaded
- `patientId`: String - ID of the patient who owns this result
- `patientName`: String - Name of the patient
- `doctorId`: String (optional) - ID of the doctor (for doctor-uploaded results)
- `doctorName`: String (optional) - Name of the doctor
- `doctorLicense`: String (optional) - License number of the doctor
- `uploadedBy`: String - 'patient' or 'doctor'
- `status`: String - Status of the lab result (e.g., 'pending_review', 'uploaded')
- `createdAt`: Timestamp - When the record was created
- `updatedAt`: Timestamp - When the record was last updated

## Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own lab results
    match /users/{userId}/labResults/{labResultId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Doctors can read lab results of their patients
    match /users/{userId}/labResults/{labResultId} {
      allow read: if request.auth != null 
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'doctor';
    }
    
    // Admin users can read all lab results
    match /users/{userId}/labResults/{labResultId} {
      allow read: if request.auth != null 
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Chat Security Rules

For the chat functionality related to lab results, the existing chat security rules should suffice, as messages are stored in:
```
messages/{messageId}
```

With fields:
- `doctorId`: String
- `patientId`: String
- `labResultId`: String (optional)
- `labResultTitle`: String (optional)

The existing rules for the messages collection should already allow doctors and patients to communicate.

## Implementation Notes

1. The `uploadedBy` field is used to distinguish between patient-uploaded and doctor-uploaded lab results
2. Patient-uploaded results have a status of 'pending_review' initially
3. Doctor-uploaded results have a status of 'uploaded'
4. Both types of results are stored in the same collection but can be filtered by the `uploadedBy` field
5. The `labResultId` field in chat messages links conversations to specific lab results