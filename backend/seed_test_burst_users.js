import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import User from './models/User.js';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';

async function seed() {
    await mongoose.connect(mongoURI);

    const adminEmail = 'admin_test_burst@gigcampus.com';
    const userEmail = 'user_test_burst@gigcampus.com';

    await User.deleteMany({ email: { $in: [adminEmail, userEmail] } });

    // Seed Admin user
    const admin = await User.create({
        username: 'admin_test_burst',
        email: adminEmail,
        password: 'password123',
        role: 'admin',
        isEmailVerified: true
    });

    // Seed student user
    const user = await User.create({
        username: 'user_test_burst',
        email: userEmail,
        password: 'password123',
        role: 'student',
        isEmailVerified: true
    });

    console.log(`✅ Seeded admin: ${admin.email}`);
    console.log(`✅ Seeded student: ${user.email}`);

    mongoose.connection.close();
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
