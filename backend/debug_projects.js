
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';
import User from './models/User.js';

dotenv.config();

const debugProjects = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const projects = await Project.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('client', 'username email')
            .populate('freelancer', 'username email');

        console.log('\n--- Recent Projects ---');
        projects.forEach(p => {
            console.log(`\nID: ${p._id}`);
            console.log(`Title: ${p.title}`);
            console.log(`Status: ${p.status}`);
            console.log(`Client: ${p.client?.username} (${p.client?.email})`);
            console.log(`Freelancer: ${p.freelancer?.username || 'None'}`);
        });
        console.log('\n--- End ---');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

debugProjects();
