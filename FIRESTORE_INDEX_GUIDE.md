# Firestore Index Management Guide

## Overview
This document outlines the required Firestore composite indexes for the LifeLinePlus healthcare application and provides solutions to avoid index requirements where possible.

## Current Index Error
```
The query requires an index. You can create it here: 
https://console.firebase.google.com/v1/r/project/lifelineplus-b7c27/firestore/indexes?create_composite=...
```

## Required Indexes for Collections

### 1. Appointments Query Index
**Collection**: `appointments`
**Fields**:
- `patientId` (Ascending)
- `status` (Ascending) 
- `appointmentDate` (Ascending)

### 2. Notifications Query Index (AVOIDED)
**Collection**: `notifications`
**Fields that would be needed**:
- `userId` (Ascending)
- `timestamp` (Descending)

**Status**: ✅ **RESOLVED** - Using in-memory sorting instead of Firestore orderBy to avoid index requirement

### How to Create the Index

#### Option A: Automatic Creation (Recommended)
1. Click the URL provided in the error message
2. This will automatically create the required index in Firebase Console
3. Wait for the index to build (usually takes a few minutes)

#### Option B: Manual Creation
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `lifelineplus-b7c27`
3. Navigate to **Firestore Database** → **Indexes**
4. Click **Create Index**
5. Configure:
   - **Collection ID**: `appointments`
   - **Fields**:
     - Field: `patientId`, Order: `Ascending`
     - Field: `status`, Order: `Ascending`
     - Field: `appointmentDate`, Order: `Ascending`
6. Click **Create**

## Alternative Query Strategies (Implemented)

To avoid complex index requirements, the application now uses multiple query strategies:

### Strategy 1: Remove orderBy and Sort in Memory
```javascript
// Query without orderBy (avoids index requirement)
const appointmentsQuery = query(
  collection(db, 'appointments'),
  where('patientId', '==', user.uid),
  where('status', 'in', [CONSULTATION_STATUS.PENDING, CONSULTATION_STATUS.CONFIRMED])
);

// Sort results in memory
const sortedAppointments = appointments.sort((a, b) => {
  const dateA = new Date(a.appointmentDate);
  const dateB = new Date(b.appointmentDate);
  return dateA - dateB;
});
```

### Strategy 2: Separate Queries for Each Status
```javascript
// Query each status separately
const pendingQuery = query(
  collection(db, 'appointments'),
  where('patientId', '==', user.uid),
  where('status', '==', CONSULTATION_STATUS.PENDING)
);

const confirmedQuery = query(
  collection(db, 'appointments'),
  where('patientId', '==', user.uid),
  where('status', '==', CONSULTATION_STATUS.CONFIRMED)
);

// Execute queries in parallel and combine results
const [pendingSnapshot, confirmedSnapshot] = await Promise.all([
  getDocs(pendingQuery),
  getDocs(confirmedQuery)
]);
```

### Strategy 3: Notifications In-Memory Sorting
```javascript
// Query without orderBy for notifications (avoids index requirement)
let q = query(
  collection(db, 'notifications'),
  where('userId', '==', userId)
);

// Get all matching notifications
const snapshot = await getDocs(q);
const notifications = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
  timestamp: doc.data().timestamp?.toDate() || new Date()
}));

// Sort in memory by timestamp (newest first) and apply limit
const sortedNotifications = notifications
  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  .slice(0, limitCount);
```

## Additional Indexes That May Be Needed

### For Doctor Appointments
**Collection**: `appointments`
**Fields**:
- `doctorId` (Ascending)
- `status` (Ascending)
- `appointmentDate` (Ascending)

### For Emergency Appointments
**Collection**: `appointments`
**Fields**:
- `type` (Ascending)
- `status` (Ascending)
- `createdAt` (Descending)

### For User Documents
**Collection**: `users/{userId}/documents`
**Fields**:
- `userId` (Ascending)
- `uploadDate` (Descending)

## Best Practices for Index Management

### 1. Query Optimization
- Use simple queries when possible
- Sort in memory for small datasets (< 1000 records)
- Use pagination for large datasets

### 2. Index Strategy
- Create indexes for frequently used queries
- Monitor Firestore usage and costs
- Remove unused indexes to reduce costs

### 3. Alternative Approaches
- Use subcollections to avoid complex queries
- Denormalize data when appropriate
- Consider using Cloud Functions for complex operations

## Implementation Status

### ✅ Fixed Issues
- **ConsultationScreen**: Modified query to avoid index requirement
- **NotificationService**: Removed orderBy clause for notifications query
- **Error Handling**: Added fallback mechanisms for failed queries
- **Memory Sorting**: Implemented client-side sorting for appointments and notifications
- **Real-time Updates**: Notifications now work without requiring composite indexes

### 🔄 Monitoring Required
- Query performance with larger datasets
- Index creation progress in Firebase Console
- User experience during index building

## Firestore Security Rules

Ensure your Firestore security rules support the queries:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read their own appointments
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null && 
        (resource.data.patientId == request.auth.uid || 
         resource.data.doctorId == request.auth.uid);
    }
    
    // Allow users to access their own documents
    match /users/{userId}/documents/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### Index Building Takes Too Long
- Index building can take several minutes to hours for large collections
- Check the Indexes tab in Firebase Console for progress
- Queries will use fallback logic until index is ready

### Query Still Failing After Index Creation
- Verify the index fields match exactly
- Check field names and data types
- Ensure security rules allow the query

### Performance Issues
- Monitor query performance in Firebase Console
- Consider pagination for large result sets
- Use compound queries sparingly

## Monitoring and Maintenance

### Regular Tasks
1. Monitor Firestore usage in Firebase Console
2. Review slow queries and optimize
3. Clean up unused indexes quarterly
4. Update security rules as features evolve

### Alerts to Set Up
- Query performance degradation
- Firestore read/write limits approaching
- Index build failures

## Contact Information
For questions about Firestore optimization, refer to:
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Query Optimization Guide](https://firebase.google.com/docs/firestore/query-data/queries)
- [Index Management](https://firebase.google.com/docs/firestore/query-data/index-overview)