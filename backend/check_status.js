
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // ID from previous context
        const id = '6993f0565520a98b77de3048';

        const project = await Project.findById(id);
        if (!project) {
            console.log('Project not found');
        } else {
            console.log('Project Status:', project.status);
            console.log('Project Client:', project.client);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

check();
