
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';
import User from './models/User.js';

dotenv.config();

const createDisputeDemo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find the user (Client)
        const clientEmail = 'aloksinha081104@gmail.com';
        const client = await User.findOne({ email: clientEmail });

        if (!client) {
            console.error('Client not found:', clientEmail);
            return;
        }

        // 2. Find a freelancer (anyone)
        const freelancer = await User.findOne({ role: 'freelancer' });
        if (!freelancer) {
            console.error('No freelancer found!');
            return;
        }

        console.log(`Creating demo project for Client: ${client.username} and Freelancer: ${freelancer.username}`);

        // 3. Create the In-Progress Project
        const newProject = await Project.create({
            title: 'Dispute Demo Project',
            description: 'This is a test project created to demonstrate the Dispute feature. Please click "Raise Dispute" on this project page.',
            budget: { min: 500, max: 1000 },
            timeline: '1 week',
            category: 'development', // Correct Enum
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Required
            client: client._id,
            freelancer: freelancer._id,
            status: 'in_progress', // CRITICAL: Active status needed for dispute
            createdAt: new Date()
        });

        console.log('------------------------------------------------');
        console.log('✅ DEMO PROJECT CREATED SUCCESSFULLY!');
        console.log(`Project Name: ${newProject.title}`);
        console.log(`Project ID: ${newProject._id}`);
        console.log('------------------------------------------------');
        console.log('👉 Please open this URL in your browser to see the Raise Dispute button:');
        console.log(`   http://localhost:5173/projects/${newProject._id}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

createDisputeDemo();
