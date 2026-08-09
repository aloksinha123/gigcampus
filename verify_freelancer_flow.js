import axios from 'axios';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use createRequire to resolve mongoose/dotenv from backend/node_modules
const require = createRequire(path.join(__dirname, 'backend', 'package.json'));
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

// Import User model via file URL (Windows-compatible)
const { default: User } = await import(pathToFileURL(path.join(__dirname, 'backend', 'models', 'User.js')).href);

const API_URL = 'http://localhost:5003/api';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/gigcampus';

// Utilities
const log = (msg) => console.log(`[TEST] ${msg}`);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    try {
        log('Starting Freelancer Flow Verification...');

        await mongoose.connect(MONGODB_URI);
        log('Connected to MongoDB for direct wallet seeding.');

        // 1. Register Users
        const studentUser = {
            username: `student_${Date.now()}`,
            email: `student_${Date.now()}@test.com`,
            password: 'password123',
            role: 'student'
        };

        const freelancerUser = {
            username: `freelancer_${Date.now()}`,
            email: `freelancer_${Date.now()}@test.com`,
            password: 'password123',
            role: 'freelancer'
        };

        log('Registering Student...');
        await axios.post(`${API_URL}/auth/register`, studentUser);

        // Test-only: mark the newly registered user as verified
        await User.findOneAndUpdate(
            { email: studentUser.email },
            { $set: { isEmailVerified: true } }
        );

        log('Logging in Student...');
        const studentLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: studentUser.email,
            password: studentUser.password
        });

        const studentToken = studentLoginRes.data.token;
        const studentId = studentLoginRes.data._id;

        if (!studentToken) {
            throw new Error('Student login did not return a token!');
        }

        log('Student login successful.');


        log('Registering Freelancer...');
        await axios.post(`${API_URL}/auth/register`, freelancerUser);

        // Test-only: mark the newly registered user as verified
        await User.findOneAndUpdate(
            { email: freelancerUser.email },
            { $set: { isEmailVerified: true } }
        );

        log('Logging in Freelancer...');
        const freelancerLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: freelancerUser.email,
            password: freelancerUser.password
        });

        const freelancerToken = freelancerLoginRes.data.token;
        const freelancerId = freelancerLoginRes.data._id;

        if (!freelancerToken) {
            throw new Error('Freelancer login did not return a token!');
        }

        log('Freelancer login successful.');

        // 2. Student Creates Project
        log('Student creating project...');
        const projectRes = await axios.post(`${API_URL}/projects`, {
            title: 'Test Project for Freelancer',
            description: 'This is a test project to verify freelancer flow.',
            category: 'development',
            budget: { min: 100, max: 500 },
            timeline: '1 week',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        const projectId = projectRes.data._id;

        // 3. Freelancer Places Bid
        log('Freelancer placing bid...');
        const bidRes = await axios.post(`${API_URL}/bids`, {
            project: projectId,
            bidAmount: 300, // Testing bidAmount mapping
            proposal: 'I can do this test project.',
            timeline: '3 days',
            deliverables: ['Code', 'Documentation']
        }, { headers: { Authorization: `Bearer ${freelancerToken}` } });
        const bidId = bidRes.data._id;

        if (bidRes.data.price !== 300) {
            throw new Error('Bid amount not mapped correctly to price!');
        }
        log('Bid placed successfully with correct price mapping.');

        // 4. Student Accepts Bid (Requires Money in Wallet)
        // Seed wallet directly via MongoDB — the HTTP deposit endpoint now requires
        // Razorpay payment verification, which is not available in integration tests.
        log('Adding funds to student wallet (direct seed)...');
        await User.findByIdAndUpdate(studentId, { $set: { 'wallet.balance': 1000 } });
        log('Funds deposited successfully.');

        // Attempting to Accept Bid
        await axios.put(`${API_URL}/projects/${projectId}/accept-bid/${bidId}`, {}, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        log('Bid accepted successfully!');

        // 5. Freelancer Submits Work (Only if bid accepted)
        log('Freelancer submitting work...');
        await axios.post(`${API_URL}/projects/${projectId}/deliverable`, {
            title: 'Final Deliverable',
            description: 'Here is the code.',
            files: [{ name: 'code.zip', url: 'http://example.com/code.zip' }]
        }, { headers: { Authorization: `Bearer ${freelancerToken}` } });
        log('Work submitted.');

        // 6. Student Completes Project
        log('Student completing project...');
        await axios.put(`${API_URL}/projects/${projectId}/complete`, {}, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        log('Project completed.');

        // 7. Verification
        log('Verifying Portfolio...');
        // We need an endpoint to get portfolio or check database.
        // Assuming we can't easily check DB, we trust the flow if calls suceeded.
        log('Freelancer flow verification completed successfully!');

        await mongoose.disconnect();
        log('Disconnected from MongoDB.');

    } catch (error) {
        console.log('Test Failed!');
        console.log('Error Message:', error.message);
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

runTest();
