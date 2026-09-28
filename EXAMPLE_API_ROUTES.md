# Example Vercel API Routes

These are example Vercel serverless functions you can use in your backend.

## File Structure in Your Vercel Project

```
your-backend-project/
├── api/
│   ├── auth/
│   │   ├── student/
│   │   │   ├── signup.js
│   │   │   └── signin.js
│   │   ├── tutor/
│   │   │   └── signin.js
│   │   └── admin/
│   │       └── signin.js
│   ├── students/
│   │   └── me.js
│   ├── tutors/
│   │   ├── index.js
│   │   └── me.js
│   ├── bookings/
│   │   ├── index.js
│   │   └── [id].js
│   ├── classes.js
│   └── review-sessions/
│       ├── index.js
│       └── [id].js
├── lib/
│   ├── mongodb.js
│   └── auth.js
├── package.json
└── vercel.json
```

---

## Setup Files

### `lib/mongodb.js`

```javascript
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase() {
  const client = await clientPromise;
  return client.db('tutoring'); // Your database name
}
```

### `lib/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export function createToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function authenticateRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new Error('No token provided');
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Invalid token');
  }
  
  return decoded;
}
```

---

## Authentication Endpoints

### `api/auth/student/signup.js`

```javascript
import { getDatabase } from '../../../lib/mongodb';
import { createToken } from '../../../lib/auth';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = await getDatabase();
    const students = db.collection('students');

    // Check if user exists
    const existing = await students.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await students.insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      bookings: []
    });

    // Create token
    const token = createToken({
      userId: result.insertedId.toString(),
      email,
      type: 'student'
    });

    res.status(201).json({
      success: true,
      token,
      user: { name, email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### `api/auth/student/signin.js`

```javascript
import { getDatabase } from '../../../lib/mongodb';
import { createToken } from '../../../lib/auth';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    const db = await getDatabase();
    const students = db.collection('students');

    // Find user
    const user = await students.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = createToken({
      userId: user._id.toString(),
      email: user.email,
      type: 'student'
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### `api/auth/tutor/signin.js`

```javascript
import { getDatabase } from '../../../lib/mongodb';
import { createToken } from '../../../lib/auth';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    const db = await getDatabase();
    const tutors = db.collection('tutors');

    // Find tutor
    const tutor = await tutors.findOne({ email });
    if (!tutor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, tutor.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = createToken({
      userId: tutor._id.toString(),
      email: tutor.email,
      type: 'tutor'
    });

    // Remove password from response
    const { password: _, ...tutorData } = tutor;

    res.status(200).json({
      success: true,
      token,
      tutor: tutorData
    });
  } catch (error) {
    console.error('Tutor signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### `api/auth/admin/signin.js`

```javascript
import { createToken } from '../../../lib/auth';

const ADMIN_EMAIL = 'tutoring.axsbg@gmail.com';
const ADMIN_PASSWORD = 'Seaborg35';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken({
      email,
      type: 'admin',
      isAdmin: true
    });

    res.status(200).json({
      success: true,
      token,
      isAdmin: true
    });
  } catch (error) {
    console.error('Admin signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Student Endpoints

### `api/students/me.js`

```javascript
import { getDatabase } from '../../lib/mongodb';
import { authenticateRequest } from '../../lib/auth';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    const user = await authenticateRequest(req);
    if (user.type !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = await getDatabase();
    const students = db.collection('students');

    if (req.method === 'GET') {
      const student = await students.findOne(
        { _id: new ObjectId(user.userId) },
        { projection: { password: 0 } }
      );

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.status(200).json(student);
    } else if (req.method === 'DELETE') {
      // Delete student account
      await students.deleteOne({ _id: new ObjectId(user.userId) });

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Students/me error:', error);
    res.status(401).json({ error: error.message });
  }
}
```

---

## Booking Endpoints

### `api/bookings/index.js`

```javascript
import { getDatabase } from '../../lib/mongodb';
import { authenticateRequest } from '../../lib/auth';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await authenticateRequest(req);
    if (user.type !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = await getDatabase();
    const students = db.collection('students');

    const booking = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };

    // Add booking to student's account
    await students.updateOne(
      { _id: new ObjectId(user.userId) },
      { $push: { bookings: booking } }
    );

    // TODO: Send email to student and tutor
    // await sendConfirmationEmail(booking);
    // await sendTutorNotification(booking);

    res.status(201).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### `api/bookings/[id].js`

```javascript
import { getDatabase } from '../../lib/mongodb';
import { authenticateRequest } from '../../lib/auth';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await authenticateRequest(req);
    if (user.type !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.query;
    const db = await getDatabase();
    const students = db.collection('students');

    // Remove booking from student's account
    await students.updateOne(
      { _id: new ObjectId(user.userId) },
      { $pull: { bookings: { id } } }
    );

    res.status(200).json({
      success: true,
      message: 'Booking cancelled'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Tutor Endpoints

### `api/tutors/index.js`

```javascript
import { getDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDatabase();
    const tutors = db.collection('tutors');

    const allTutors = await tutors.find(
      {},
      { projection: { password: 0 } }
    ).toArray();

    res.status(200).json(allTutors);
  } catch (error) {
    console.error('Get tutors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### `api/tutors/me.js`

```javascript
import { getDatabase } from '../../lib/mongodb';
import { authenticateRequest } from '../../lib/auth';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    const user = await authenticateRequest(req);
    if (user.type !== 'tutor') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = await getDatabase();
    const tutors = db.collection('tutors');
    const students = db.collection('students');

    if (req.method === 'GET') {
      const tutor = await tutors.findOne(
        { _id: new ObjectId(user.userId) },
        { projection: { password: 0 } }
      );

      if (!tutor) {
        return res.status(404).json({ error: 'Tutor not found' });
      }

      res.status(200).json(tutor);
    } else if (req.method === 'PUT') {
      const updates = req.body;
      
      // Update tutor data
      await tutors.updateOne(
        { _id: new ObjectId(user.userId) },
        { $set: updates }
      );

      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Tutors/me error:', error);
    res.status(401).json({ error: error.message });
  }
}
```

---

## Classes Endpoint

### `api/classes.js`

```javascript
import { getDatabase } from '../lib/mongodb';

export default async function handler(req, res) {
  try {
    const db = await getDatabase();
    const classes = db.collection('classes');

    if (req.method === 'GET') {
      const classData = await classes.findOne({});
      res.status(200).json(classData || {});
    } else if (req.method === 'PUT') {
      // Admin only - add authentication check
      await classes.replaceOne({}, req.body, { upsert: true });
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## package.json Dependencies

```json
{
  "dependencies": {
    "mongodb": "^6.3.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "resend": "^3.0.0"
  }
}
```

---

## Environment Variables (.env.local)

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tutoring?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-change-this
RESEND_API_KEY=re_your_api_key_here
```

---

Deploy these to Vercel and your backend will be ready!
