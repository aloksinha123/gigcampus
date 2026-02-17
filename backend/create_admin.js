
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const adminEmail = 'admin@gigcampus.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin user already exists:', adminEmail);
            // Optional: Reset password if needed, but for now just inform.
            // existingAdmin.password = 'admin123';
            // await existingAdmin.save();
            // console.log('Admin password reset to: admin123');
        } else {
            console.log('Creating new Admin user...');
            const admin = await User.create({
                username: 'GigAdmin',
                email: adminEmail,
                password: 'admin123',
                role: 'admin',
                verified: true
            });
            console.log('Admin created successfully!');
            console.log('Email:', admin.email);
            console.log('Password: admin123');
        }

    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

createAdmin();
