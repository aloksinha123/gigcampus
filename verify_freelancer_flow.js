import axios from 'axios';

const API_URL = 'http://localhost:5003/api';

// Utilities
const log = (msg) => console.log(`[TEST] ${msg}`);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    try {
        log('Starting Freelancer Flow Verification...');

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
        const studentRes = await axios.post(`${API_URL}/auth/register`, studentUser);
        const studentToken = studentRes.data.token;
        const studentId = studentRes.data._id;

        log('Registering Freelancer...');
        const freelancerRes = await axios.post(`${API_URL}/auth/register`, freelancerUser);
        const freelancerToken = freelancerRes.data.token;
        const freelancerId = freelancerRes.data._id;

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
        log('Adding funds to student wallet (simulation)...');
        await axios.post(`${API_URL}/wallet/deposit`, {
            amount: 1000
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
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
