import 'dotenv/config';
import mongoose from 'mongoose';
import jsonwebtoken from 'jsonwebtoken';
import axios from 'axios';
import User from './models/User.js';
import Project from './models/Project.js';
import ProjectFavorite from './models/ProjectFavorite.js';
import FreelancerFavorite from './models/FreelancerFavorite.js';
import RecentlyViewed from './models/RecentlyViewed.js';

const BACKEND_URL = 'http://localhost:5003/api/v1';

async function verifyFeatures() {
    console.log('🧪 Starting Favorites & Recommendations System Integration Verification...');

    // 1. Connect to database
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Fetch some test users
    const freelancer = await User.findOne({ role: 'freelancer' });
    const student = await User.findOne({ role: 'student' });
    const project = await Project.findOne({ status: 'open' });

    if (!freelancer || !student || !project) {
        console.log('❌ Test data missing. Make sure database has at least 1 open project, 1 student, and 1 freelancer.');
        await mongoose.disconnect();
        return;
    }

    console.log(`Test Student: @${student.username} (${student._id})`);
    console.log(`Test Freelancer: @${freelancer.username} (${freelancer._id})`);
    console.log(`Test Project: "${project.title}" (${project._id})`);

    const studentToken = jsonwebtoken.sign({ id: student._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const freelancerToken = jsonwebtoken.sign({ id: freelancer._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    try {
        // --- FEATURE 1 & 2: FAVORITES & BOOKMARKS ---
        console.log('\n--- VERIFYING BOOKMARKS & FAVORITES ---');
        
        // Clean old records
        await ProjectFavorite.deleteMany({ user: freelancer._id });
        await FreelancerFavorite.deleteMany({ user: student._id });

        // A. Bookmark Project
        console.log('1. Bookmarking project...');
        const bookmarkAdd = await axios.post(`${BACKEND_URL}/favorites/projects/${project._id}`, {}, {
            headers: { Authorization: `Bearer ${freelancerToken}` }
        });
        console.log('Bookmark response status:', bookmarkAdd.status, bookmarkAdd.data);

        // B. Prevent Duplicate Bookmarks
        console.log('2. Trying duplicate bookmark...');
        try {
            await axios.post(`${BACKEND_URL}/favorites/projects/${project._id}`, {}, {
                headers: { Authorization: `Bearer ${freelancerToken}` }
            });
            console.log('❌ Failed: Allowed duplicate bookmark.');
        } catch (err) {
            console.log('✅ Success: Blocked duplicate bookmark (Status:', err.response?.status, err.response?.data?.message, ')');
        }

        // C. Favorite Freelancer
        console.log('3. Favoriting freelancer...');
        const favAdd = await axios.post(`${BACKEND_URL}/favorites/freelancers/${freelancer._id}`, {}, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log('Favorite response status:', favAdd.status, favAdd.data);

        // D. Prevent Self-Favoriting
        console.log('4. Trying self-favoriting...');
        try {
            await axios.post(`${BACKEND_URL}/favorites/freelancers/${freelancer._id}`, {}, {
                headers: { Authorization: `Bearer ${freelancerToken}` }
            });
            console.log('❌ Failed: Allowed self-favoriting.');
        } catch (err) {
            console.log('✅ Success: Blocked self-favoriting (Status:', err.response?.status, err.response?.data?.message, ')');
        }

        // --- FEATURE 5: RECENTLY VIEWED ROTATION ---
        console.log('\n--- VERIFYING RECENTLY VIEWED ROTATION ---');
        await RecentlyViewed.deleteMany({ user: freelancer._id });

        // Add 22 views to trigger rotation (max 20)
        console.log('Adding 22 project views to verify rotation capping...');
        for (let i = 0; i < 22; i++) {
            // Create temporary projects to view unique ones
            const tempProj = await Project.create({
                title: `Temp Project ${i}`,
                description: 'Temporary verification project description.',
                category: 'development',
                budget: { min: 100, max: 200 },
                timeline: '1 Day',
                deadline: new Date(Date.now() + 86400000),
                client: student._id
            });

            await axios.post(`${BACKEND_URL}/recommendations/recently-viewed`, {
                entityType: 'project',
                entityId: tempProj._id
            }, {
                headers: { Authorization: `Bearer ${freelancerToken}` }
            });

            // Clean database records right after logging view
            await Project.deleteOne({ _id: tempProj._id });
        }

        // Check total count inside collection
        const totalViews = await RecentlyViewed.countDocuments({ user: freelancer._id, entityType: 'project' });
        console.log(`Total views logged: ${totalViews}`);
        if (totalViews === 20) {
            console.log('✅ Success: Cron views list correctly capped at 20!');
        } else {
            console.log('❌ Failed: Capping count limit is not 20.');
        }

        // --- FEATURE 3 & 4: HYBRID RECOMMENDATIONS ENGINE ---
        console.log('\n--- VERIFYING RECOMMENDATION SCORING ---');
        
        // Project recommendations for freelancer
        console.log('1. Querying project recommendations...');
        const recProj = await axios.get(`${BACKEND_URL}/recommendations/projects`, {
            headers: { Authorization: `Bearer ${freelancerToken}` }
        });
        console.log(`Recommendations Count: ${recProj.data.recommendations?.length}`);
        if (recProj.data.recommendations?.length > 0) {
            console.log('Sample score & reason:', {
                score: recProj.data.recommendations[0].matchScore,
                reason: recProj.data.recommendations[0].reason
            });
            console.log('✅ Project Recommendations: PASS');
        }

        // Freelancer recommendations for student
        console.log('2. Querying freelancer recommendations...');
        const recFree = await axios.get(`${BACKEND_URL}/recommendations/freelancers`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`Recommendations Count: ${recFree.data.recommendations?.length}`);
        if (recFree.data.recommendations?.length > 0) {
            console.log('Sample score & reason:', {
                score: recFree.data.recommendations[0].matchScore,
                reason: recFree.data.recommendations[0].reason
            });
            console.log('✅ Freelancer Recommendations: PASS');
        }

        // Cleanup test entries
        console.log('\n🧹 Cleaning up test logs...');
        await ProjectFavorite.deleteMany({ user: freelancer._id });
        await FreelancerFavorite.deleteMany({ user: student._id });
        await RecentlyViewed.deleteMany({ user: freelancer._id });
        console.log('✅ Cleanup finished.');

    } catch (err) {
        console.error('❌ Verification Run Error:', err.response?.data || err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB. Verification complete!');
    }
}

verifyFeatures();
