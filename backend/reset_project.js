
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';
import Bid from './models/Bid.js';

dotenv.config();

const resetProject = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const projectId = '6993f0565520a98b77de3048';

        // Find existing bids and reset their status to 'pending'
        const bids = await Bid.find({ project: projectId });
        console.log(`Resetting ${bids.length} bids to pending...`);
        await Bid.updateMany({ project: projectId }, { status: 'pending' });

        // Reset project status
        console.log('Resetting Project status...');
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                status: 'open',
                selectedBid: null,
                freelancer: null
            },
            { new: true }
        );

        console.log('Project Status Updated:', updatedProject.status);
        console.log('Selected Bid:', updatedProject.selectedBid);
        console.log('Freelancer:', updatedProject.freelancer);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

resetProject();
