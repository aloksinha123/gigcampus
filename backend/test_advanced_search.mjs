import 'dotenv/config';
import mongoose from 'mongoose';
import jsonwebtoken from 'jsonwebtoken';
import axios from 'axios';
import User from './models/User.js';
import Project from './models/Project.js';
import SearchHistory from './models/SearchHistory.js';
import SavedFilter from './models/SavedFilter.js';

const BACKEND_URL = 'http://localhost:5003/api/v1/search';

async function verifySearch() {
    console.log('🧪 Starting Advanced Search Engine Integration Verification...');

    // 1. Connect to Database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';
    console.log(`Connecting to database: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 2. Fetch User & Token
    const userDoc = await User.findOne({ role: 'freelancer' });
    if (!userDoc) {
        console.log('❌ No freelancer user found to test search history / saved filters.');
        await mongoose.disconnect();
        return;
    }
    console.log(`Using test user: @${userDoc.username} (${userDoc._id})`);
    const token = jsonwebtoken.sign({ id: userDoc._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    try {
        // 3. Test GET /projects endpoint (Filtering by category & budget)
        console.log('\n🔍 Testing project search endpoint with filters...');
        const projectRes = await axios.get(`${BACKEND_URL}/projects`, {
            params: {
                category: 'development',
                minBudget: 500,
                maxBudget: 15000,
                sortBy: 'newest'
            }
        });
        console.log(`Projects Found: ${projectRes.data.total}`);
        console.log(`Status code: ${projectRes.status} (OK)`);
        if (projectRes.data.projects) {
            console.log('Sample matching project titles:', projectRes.data.projects.slice(0, 3).map(p => p.title));
            console.log('✅ Project Search: PASS');
        }

        // 4. Test GET /freelancers endpoint (Filtering by rating & hourlyRate)
        console.log('\n🔍 Testing freelancer search endpoint...');
        const freelancerRes = await axios.get(`${BACKEND_URL}/freelancers`, {
            params: {
                rating: 3,
                hourlyRate: 150,
                sortBy: 'highestRating'
            }
        });
        console.log(`Freelancers Found: ${freelancerRes.data.total}`);
        console.log(`Status code: ${freelancerRes.status} (OK)`);
        if (freelancerRes.data.freelancers) {
            console.log('Sample freelancers found:', freelancerRes.data.freelancers.slice(0, 3).map(f => `@${f.username}`));
            console.log('✅ Freelancer Search: PASS');
        }

        // 5. Test GET /suggestions endpoint (Autocomplete)
        console.log('\n🔍 Testing search autocomplete suggestions...');
        const sugRes = await axios.get(`${BACKEND_URL}/suggestions`, {
            params: { q: 'dev' }
        });
        console.log('Autocomplete output for "dev":', sugRes.data);
        if (Array.isArray(sugRes.data)) {
            console.log('✅ Search Suggestions: PASS');
        }

        // 6. Test History CRUD (Add and Get)
        console.log('\n🔍 Testing Search History logging endpoints...');
        // Clear any old history for this user first
        await SearchHistory.deleteMany({ user: userDoc._id });

        const historyAdd = await axios.post(`${BACKEND_URL}/history`, {
            query: 'React Native',
            filters: { category: 'development' }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Add to History response status:', historyAdd.status);

        const historyGet = await axios.get(`${BACKEND_URL}/history`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Latest history entries logged:', historyGet.data.map(h => h.query));
        if (historyGet.data.some(h => h.query === 'React Native')) {
            console.log('✅ Search History CRUD: PASS');
        }

        // 7. Test Saved Filters CRUD
        console.log('\n🔍 Testing Saved Filters storage endpoints...');
        // Clear old saved filters
        await SavedFilter.deleteMany({ user: userDoc._id });

        const filterSave = await axios.post(`${BACKEND_URL}/save-filter`, {
            name: 'Dev jobs under 10k',
            type: 'projects',
            filters: { category: 'development', maxBudget: 10000 }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Save Filter response status:', filterSave.status);

        const filterGet = await axios.get(`${BACKEND_URL}/saved-filters`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Saved filter templates cached:', filterGet.data.map(f => f.name));
        if (filterGet.data.some(f => f.name === 'Dev jobs under 10k')) {
            console.log('✅ Saved Filters CRUD: PASS');
        }

        // 8. Clean up
        console.log('\n🧹 Cleaning up test history and saved filters...');
        await SearchHistory.deleteMany({ user: userDoc._id });
        await SavedFilter.deleteMany({ user: userDoc._id });

    } catch (err) {
        console.error('❌ Verification failed:', err.response?.data || err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB. Verification run completed!');
    }
}

verifySearch();
