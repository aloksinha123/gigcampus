
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment.js';
import Project from './models/Project.js';

dotenv.config();

const createEscrowPayment = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const projectId = '6993f0565520a98b77de3048'; // The disputed project
        const project = await Project.findById(projectId);

        if (!project) {
            console.error('Project not found');
            return;
        }

        console.log(`Creating Escrow Payment for project: ${project.title}`);

        // Check if payment already exists
        let payment = await Payment.findOne({
            project: projectId,
            status: { $in: ['escrowed', 'disputed'] }
        });

        if (payment) {
            console.log('Escrow Payment found, updating status to escrowed...');
            // Ensure status is valid for resolution
            payment.status = 'escrowed';
            await payment.save();
            console.log('Payment status updated.');
        } else {
            console.log('No payment found. Creating new one...');
            const amount = project.budget.min || 500;
            payment = await Payment.create({
                project: project._id,
                client: project.client,
                freelancer: project.freelancer,
                amount: amount,
                freelancerAmount: amount * 0.9,
                platformCommission: amount * 0.1,
                status: 'escrowed', // Important!
                escrowedAt: new Date(),
                paymentMethod: 'wallet',
                transactionId: `TXN_${Date.now()}`
            });
            console.log('Escrow Payment Created:', payment._id);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

createEscrowPayment();
