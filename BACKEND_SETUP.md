# Backend Setup Guide - MongoDB + Vercel

This document outlines exactly what you need to implement in your Vercel + MongoDB backend to replace localStorage.

## MongoDB Collections

### 1. **students** Collection

```javascript
{
  _id: ObjectId,
  name: String,              // "John Doe"
  email: String,             // "student@example.com" (unique index)
  password: String,          // hashed with bcrypt
  createdAt: Date,           // new Date()
  bookings: [
    {
      id: String,            // Date.now().toString()
      subject: String,       // "Chemistry"
      class: String,         // "CHEM 101"
      tutor: String,         // "Dr. Smith"
      tutorEmail: String,    // "tutor@example.com"
      date: String,          // "Mon Apr 14"
      startTime: String,     // "9:00 AM"
      endTime: String,       // "10:00 AM"
      duration: Number,      // 60 (minutes)
      location: String,      // "In Person" or "Virtual (Zoom)"
      studentName: String,   // Redundant but useful
      studentEmail: String,  // Redundant but useful
      topics: String,        // "Chemical bonding, stoichiometry"
      createdAt: String      // ISO date string
    }
  ]
}
```

**Indexes:**
- `email` (unique)

---

### 2. **tutors** Collection

```javascript
{
  _id: ObjectId,
  name: String,              // "Dr. Sarah Smith"
  email: String,             // "tutor@example.com" (unique index)
  password: String,          // hashed with bcrypt
  subjects: [String],        // ["Chemistry", "Organic Chemistry"]
  weeklyAvailability: {
    Monday: [
      { startTime: String, endTime: String }    // { startTime: "09:00", endTime: "17:00" }
    ],
    Tuesday: [
      { startTime: String, endTime: String }
    ],
    Wednesday: [
      { startTime: String, endTime: String }
    ],
    Thursday: [
      { startTime: String, endTime: String }
    ],
    Friday: [
      { startTime: String, endTime: String }
    ],
    Saturday: [
      { startTime: String, endTime: String }
    ],
    Sunday: [
      { startTime: String, endTime: String }
    ]
  },
  unavailableDates: [String],  // ["2026-04-20", "2026-04-21"] (ISO date strings)
  classesITeach: [String]      // ["CHEM 101", "CHEM 102", "Organic Chemistry 1"]
}
```

**Indexes:**
- `email` (unique)

---

### 3. **classes** Collection

```javascript
{
  _id: ObjectId,
  Chemistry: [String],           // ["CHEM 101", "CHEM 102", "CHEM 201", ...]
  Biology: [String],             // ["Life Science 107", "Life Science 7A", ...]
  Math: [String],                // ["Math 31A", "Math 31B", ...]
  Physics: [String],             // ["Physics 1A", "Physics 1B", ...]
  "Computer Science": [String]   // ["CS 31", "CS 32", ...]
}
```

**Note:** There should be only ONE document in this collection.

---

### 4. **reviewSessions** Collection

```javascript
{
  _id: ObjectId,
  className: String,    // "CHEM 101"
  date: String,         // "Monday, April 15"
  time: String,         // "6:00 PM - 8:00 PM"
  location: String      // "Science Hall Room 201"
}
```

---

### 5. **emailTemplates** Collection

```javascript
{
  _id: ObjectId,
  type: String,         // "confirmation"
  template: String      // Email template with {{variables}}
}
```

**Default confirmation template:**
```
Dear {{studentName}},

Your tutoring session has been confirmed!

Session Details:
- Class: {{class}}
- Tutor: {{tutor}} ({{tutorEmail}})
- Date: {{date}}
- Time: {{startTime}} - {{endTime}}
- Duration: {{duration}}
- Location: {{location}}
- Topics: {{topics}}

We look forward to seeing you!

Best regards,
Alpha Chi Sigma Tutoring Team
```

---

### 6. **admin** Collection (Optional)

```javascript
{
  _id: ObjectId,
  email: String,        // "tutoring.axsbg@gmail.com"
  password: String      // hashed "Seaborg35"
}
```

**Or:** Just hardcode admin credentials in your API routes.

---

## Required API Endpoints

### **Authentication Endpoints**

#### `POST /api/auth/student/signup`
**Request:**
```json
{
  "name": "John Doe",
  "email": "student@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "name": "John Doe",
    "email": "student@example.com",
    "createdAt": "2026-04-15T..."
  }
}
```

#### `POST /api/auth/student/signin`
**Request:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "name": "John Doe",
    "email": "student@example.com"
  }
}
```

#### `POST /api/auth/tutor/signin`
**Request:**
```json
{
  "email": "tutor@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "tutor": {
    "name": "Dr. Smith",
    "email": "tutor@example.com",
    "weeklyAvailability": {...},
    "classesITeach": [...]
  }
}
```

#### `POST /api/auth/admin/signin`
**Request:**
```json
{
  "email": "tutoring.axsbg@gmail.com",
  "password": "Seaborg35"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "isAdmin": true
}
```

---

### **Student Endpoints**

#### `GET /api/students/me`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "name": "John Doe",
  "email": "student@example.com",
  "bookings": [...]
}
```

#### `DELETE /api/students/me`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

#### `POST /api/bookings`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "subject": "Chemistry",
  "class": "CHEM 101",
  "tutor": "Dr. Smith",
  "tutorEmail": "tutor@example.com",
  "date": "Mon Apr 14",
  "startTime": "9:00 AM",
  "endTime": "10:00 AM",
  "duration": 60,
  "location": "In Person",
  "topics": "Chemical bonding"
}
```
**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "1713196800000",
    ...
  }
}
```
**Action:** Also send confirmation email to student and notification email to tutor.

#### `DELETE /api/bookings/:bookingId`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled"
}
```

---

### **Tutor Endpoints**

#### `GET /api/tutors`
**Response:**
```json
[
  {
    "_id": "...",
    "name": "Dr. Smith",
    "email": "tutor@example.com",
    "weeklyAvailability": {...},
    "unavailableDates": [...],
    "classesITeach": [...]
  }
]
```

#### `GET /api/tutors/me`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "name": "Dr. Smith",
  "email": "tutor@example.com",
  "weeklyAvailability": {...},
  "unavailableDates": [...],
  "classesITeach": [...]
}
```

#### `PUT /api/tutors/me/availability`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "weeklyAvailability": {
    "Monday": [{"startTime": "09:00", "endTime": "17:00"}],
    ...
  }
}
```

#### `PUT /api/tutors/me/unavailable-dates`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "unavailableDates": ["2026-04-20", "2026-04-21"]
}
```

#### `PUT /api/tutors/me/classes`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "classesITeach": ["CHEM 101", "CHEM 102"]
}
```

#### `GET /api/tutors/me/sessions`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
[
  {
    "id": "...",
    "class": "CHEM 101",
    "studentName": "John Doe",
    "studentEmail": "student@example.com",
    "date": "Mon Apr 14",
    "startTime": "9:00 AM",
    ...
  }
]
```

---

### **Admin Endpoints**

#### `POST /api/admin/tutors`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "name": "Dr. Smith",
  "email": "tutor@example.com",
  "password": "password123",
  "subjects": ["Chemistry"]
}
```

#### `DELETE /api/admin/tutors/:tutorId`
**Headers:** `Authorization: Bearer {token}`

#### `GET /api/admin/sessions`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
[
  {
    "id": "...",
    "studentName": "John Doe",
    "studentEmail": "student@example.com",
    "tutor": "Dr. Smith",
    "tutorEmail": "tutor@example.com",
    "class": "CHEM 101",
    ...
  }
]
```

#### `PUT /api/admin/classes`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "Chemistry": ["CHEM 101", "CHEM 102"],
  "Biology": ["Life Science 107"],
  ...
}
```

#### `GET /api/classes`
**Response:**
```json
{
  "Chemistry": ["CHEM 101", "CHEM 102"],
  "Biology": ["Life Science 107"],
  ...
}
```

#### `POST /api/admin/review-sessions`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "className": "CHEM 101",
  "date": "Monday, April 15",
  "time": "6:00 PM - 8:00 PM",
  "location": "Science Hall Room 201"
}
```

#### `DELETE /api/admin/review-sessions/:sessionId`
**Headers:** `Authorization: Bearer {token}`

#### `GET /api/review-sessions`
**Response:**
```json
[
  {
    "_id": "...",
    "className": "CHEM 101",
    "date": "Monday, April 15",
    "time": "6:00 PM - 8:00 PM",
    "location": "Science Hall Room 201"
  }
]
```

#### `PUT /api/admin/email-template`
**Headers:** `Authorization: Bearer {token}`
**Request:**
```json
{
  "template": "Dear {{studentName}},\n\nYour session..."
}
```

#### `GET /api/admin/email-template`
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "template": "Dear {{studentName}}..."
}
```

---

## Password Security

**CRITICAL:** Always hash passwords before storing:

```javascript
const bcrypt = require('bcrypt');

// On signup
const hashedPassword = await bcrypt.hash(password, 10);

// On signin
const isMatch = await bcrypt.compare(password, user.password);
```

---

## JWT Token Authentication

Use JWT for secure authentication:

```javascript
const jwt = require('jsonwebtoken');

// Create token
const token = jwt.sign(
  { userId: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify token (middleware)
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

---

## Email Sending

Use **Resend** (recommended for Vercel):

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Alpha Chi Sigma Tutoring <tutoring@yourdomain.com>',
  to: studentEmail,
  subject: 'Tutoring Session Confirmed',
  html: emailTemplate
});
```

---

## Environment Variables

Add to your Vercel project:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-here
RESEND_API_KEY=re_...
```

---

## Data Usage

**MongoDB** will use minimal storage:
- Students: ~1KB per student
- Tutors: ~2KB per tutor
- Classes: ~1KB total
- Review Sessions: ~500 bytes each
- Bookings: ~500 bytes each

**Estimated for 1000 students, 50 tutors, 5000 bookings:**
- Total: ~4MB of data
- Monthly cost: Essentially $0 on MongoDB free tier

---

## Next Steps

1. Create these collections in your MongoDB database
2. Implement the API endpoints in Vercel
3. Frontend will use these APIs instead of localStorage
4. Test with Postman or similar tool before connecting frontend

Let me know when you're ready and I'll update the frontend code to use your API!
