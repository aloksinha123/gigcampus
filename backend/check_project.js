import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://gigcampus:gigcampus123@cluster0.osghkwj.mongodb.net/gigcampus?retryWrites=true&w=majority';

async function checkProject() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        const projectId = new mongoose.Types.ObjectId('6a745c98e0b77d3c15b22afb');
        const project = await db.collection('projects').findOne({ _id: projectId });

        console.log('Project Details:');
        console.log('Title:', project?.title);
        console.log('Status:', project?.status);
        console.log('Client ID:', project?.client?.toString());
        console.log('Freelancer ID:', project?.freelancer?.toString());

        const users = await db.collection('users').find({}).toArray();
        console.log('\nAll Users in DB:');
        users.forEach(u => {
            console.log(`User ID: ${u._id} | Username: ${u.username} | Email: ${u.email} | Role: ${u.role}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProject();
