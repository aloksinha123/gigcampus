
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';

dotenv.config();

const forceDispute = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const projectId = '6993f0565520a98b77de3048'; // The project in_progress

        console.log(`Forcing Dispute on Project ${projectId}...`);

        const project = await Project.findByIdAndUpdate(
            projectId,
            { status: 'disputed' },
            { new: true }
        );

        if (project) {
            console.log('Project Status Updated to:', project.status);
            console.log('You can now check the Admin Dashboard!');
        } else {
            console.log('Project not found!');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

forceDispute();
