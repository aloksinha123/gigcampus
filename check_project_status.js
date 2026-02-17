
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Fix current working directory
const __dirname = path.resolve();

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const checkProject = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const projectId = '6993f0565520a98b77de3048';
        const Project = (await import('./backend/models/Project.js')).default;
        const Bid = (await import('./backend/models/Bid.js')).default;

        const project = await Project.findById(projectId);
        if (!project) {
            console.log('Project not found');
            return;
        }

        console.log('Project Details:');
        console.log(`ID: ${project._id}`);
        console.log(`Title: ${project.title}`);
        console.log(`Status: ${project.status}`);
        console.log(`Selected Bid: ${project.selectedBid}`);
        console.log(`Freelancer: ${project.freelancer}`);
        console.log('---------------------------');

        const bids = await Bid.find({ project: projectId });
        console.log(`Found ${bids.length} bids for this project:`);
        bids.forEach(bid => {
            console.log(`Bid ID: ${bid._id}, Status: ${bid.status}, Freelancer: ${bid.freelancer}, Price: ${bid.price}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkProject();
