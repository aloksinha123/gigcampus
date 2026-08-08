import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigcampus';

async function runTests() {
    console.log('======================================================');
    console.log('🧪  GigCampus Milestone & Escrow Workflow Test Suite  🧪');
    console.log('======================================================\n');


    await mongoose.connect(MONGODB_URI);
    console.log('📦 Connected to MongoDB Atlas.');

    // Import models & services dynamically
    const { default: User } = await import('./models/User.js');
    const { default: Project } = await import('./models/Project.js');
    const { default: Bid } = await import('./models/Bid.js');
    const { default: Milestone } = await import('./models/Milestone.js');
    const { default: Payment } = await import('./models/Payment.js');
    const { default: Transaction } = await import('./models/Transaction.js');
    const { createMilestone, getProjectMilestones, updateMilestone, deleteMilestone, submitMilestone, approveMilestone, rejectMilestone } = await import('./controllers/milestoneController.js');

    // Clean up old test data
    const tempStudentEmail = 'temp_student_test@gigcampus.com';
    const tempFreelancerEmail = 'temp_freelancer_test@gigcampus.com';
    await User.deleteMany({ email: { $in: [tempStudentEmail, tempFreelancerEmail] } });

    // Seed temporary Student and Freelancer
    const student = await User.create({
        username: 'temp_student',
        email: tempStudentEmail,
        password: 'password123',
        role: 'student',
        wallet: { balance: 50000 }
    });

    const freelancer = await User.create({
        username: 'temp_freelancer',
        email: tempFreelancerEmail,
        password: 'password123',
        role: 'freelancer',
        wallet: { balance: 0 }
    });

    console.log('✅ Temporary student and freelancer seeded.');

    // Create a project
    const project = await Project.create({
        title: 'React Website Development',
        description: 'Build a standard landing page with dashboard.',
        client: student._id,
        freelancer: freelancer._id,
        status: 'in_progress',
        budget: { min: 20000, max: 40000 },
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        timeline: '30 Days',
        category: 'development'
    });

    // Create a selected bid
    const bid = await Bid.create({
        project: project._id,
        freelancer: freelancer._id,
        price: 30000,
        timeline: '10 days',
        proposal: 'I can build this easily.',
        status: 'accepted'
    });

    project.selectedBid = bid._id;
    await project.save();

    console.log(`✅ Project created with budget ₹${bid.price}.`);

    let milestone1, milestone2;

    // --- Scenario 4: Budget Validation ---
    console.log('\n--- Scenario 4: Budget Validation ---');
    try {
        // Attempt to create a milestone with ₹35,000 (exceeds budget sum limit of ₹30,000)
        const mockReq = {
            body: {
                projectId: project._id.toString(),
                title: 'Design Milestone',
                description: 'UI/UX designs',
                amount: 35000
            },
            user: student
        };
        const mockRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await createMilestone(mockReq, mockRes);
        if (mockRes.statusCode === 400) {
            console.log('✅ PASS: Budget validation correctly blocked milestone creation (₹35k > ₹30k limit).');
        } else {
            console.log('❌ FAIL: Budget validation allowed exceeding project limit.');
        }
    } catch (err) {
        console.log('❌ FAIL: Scenario 4 crashed:', err.message);
    }

    // --- Scenario 5: Unauthorized Action ---
    console.log('\n--- Scenario 5: Unauthorized Action ---');
    try {
        // Freelancer tries to create a milestone
        const mockReq = {
            body: {
                projectId: project._id.toString(),
                title: 'Design Milestone',
                description: 'UI/UX designs',
                amount: 10000
            },
            user: freelancer
        };
        const mockRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await createMilestone(mockReq, mockRes);
        if (mockRes.statusCode === 403) {
            console.log('✅ PASS: Unauthorized freelancer was blocked from creating milestones.');
        } else {
            console.log('❌ FAIL: Freelancer was allowed to create milestones.');
        }
    } catch (err) {
        console.log('❌ FAIL: Scenario 5 crashed:', err.message);
    }

    // Seed 2 correct milestones within budget limit (₹10,000 + ₹20,000 = ₹30,000)
    milestone1 = await Milestone.create({
        project: project._id,
        student: student._id,
        freelancer: freelancer._id,
        title: 'Phase 1: UI Design',
        description: 'Figma mockups and React structure.',
        amount: 10000,
        status: 'pending',
        order: 1
    });

    milestone2 = await Milestone.create({
        project: project._id,
        student: student._id,
        freelancer: freelancer._id,
        title: 'Phase 2: Backend Development',
        description: 'Mongoose schemas and routing APIs.',
        amount: 20000,
        status: 'pending',
        order: 2
    });

    console.log('✅ Seeding 2 valid milestones (₹10,000 & ₹20,000) completed.');

    // --- Scenario 1: Complete Happy Path & Scenario 9: Multi-Milestone Project ---
    console.log('\n--- Scenario 1: Complete Happy Path (Milestone 1) ---');
    try {
        // Freelancer submits milestone 1 work
        const submitReq = {
            params: { id: milestone1._id.toString() },
            body: { deliverableUrl: 'https://github.com/test/react-app', feedback: 'Here is the UI code.' },
            user: freelancer
        };
        const submitRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await submitMilestone(submitReq, submitRes);
        if (submitRes.statusCode === 200 && submitRes.body.milestone.status === 'submitted') {
            console.log('   Step 1: Freelancer work submission successful (status -> submitted).');
        } else {
            console.log('❌ FAIL: Freelancer submission failed.');
        }

        // Student approves milestone 1
        const approveReq = {
            params: { id: milestone1._id.toString() },
            user: student
        };
        const approveRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        const initialFreelancer = await User.findById(freelancer._id);
        const initialBalance = initialFreelancer.wallet.balance;

        await approveMilestone(approveReq, approveRes);

        const finalFreelancer = await User.findById(freelancer._id);
        const finalBalance = finalFreelancer.wallet.balance;
        const expectedPayout = 10000 * 0.90; // 10% commission fee deducted

        if (approveRes.statusCode === 200 && approveRes.body.milestone.status === 'released' && (finalBalance - initialBalance) === expectedPayout) {
            console.log(`✅ PASS: Happy path complete. Payout ₹${expectedPayout} (90% of ₹10k) credited to freelancer.`);
        } else {
            console.log('❌ FAIL: Happy path payout verification failed.');
        }

        // --- Scenario 9: Multi-Milestone Project Status Check ---
        console.log('\n--- Scenario 9: Multi-Milestone Project ---');
        const checkProject = await Project.findById(project._id);
        if (checkProject.status === 'in_progress') {
            console.log('✅ PASS: Project remains "in_progress" because Milestone 2 is still pending.');
        } else {
            console.log('❌ FAIL: Project marked completed prematurely.');
        }

    } catch (err) {
        console.log('❌ FAIL: Scenario 1 crashed:', err.message);
    }

    // --- Scenario 2: Revision Flow ---
    console.log('\n--- Scenario 2: Revision Flow (Milestone 2) ---');
    try {
        // Freelancer submits Milestone 2
        const submitReq2 = {
            params: { id: milestone2._id.toString() },
            body: { deliverableUrl: 'https://github.com/test/backend', feedback: 'Here is the Backend code.' },
            user: freelancer
        };
        const submitRes2 = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await submitMilestone(submitReq2, submitRes2);

        // Client requests revision (rejection)
        const rejectReq = {
            params: { id: milestone2._id.toString() },
            body: { feedback: 'Please update the API endpoints routing.' },
            user: student
        };
        const rejectRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await rejectMilestone(rejectReq, rejectRes);

        if (rejectRes.statusCode === 200 && rejectRes.body.milestone.status === 'rejected') {
            console.log('   Step 1: Client revision request successful (status -> rejected).');
        } else {
            console.log('❌ FAIL: Client revision request failed.');
        }

        // Freelancer resubmits
        const resubmitReq = {
            params: { id: milestone2._id.toString() },
            body: { deliverableUrl: 'http://github.com/resubmitted', feedback: 'Updated endpoints.' },
            user: freelancer
        };
        const resubmitRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await submitMilestone(resubmitReq, resubmitRes);

        if (resubmitRes.statusCode === 200 && resubmitRes.body.milestone.status === 'submitted') {
            console.log('✅ PASS: Revision flow completed successfully (status -> submitted).');
        } else {
            console.log('❌ FAIL: Resubmission failed.');
        }

    } catch (err) {
        console.log('❌ FAIL: Scenario 2 crashed:', err.message);
    }

    // --- Scenario 3: Duplicate Release Prevention ---
    console.log('\n--- Scenario 3: Duplicate Release Prevention ---');
    try {
        // Approve milestone 2 (first release)
        const approveReq2 = {
            params: { id: milestone2._id.toString() },
            user: student
        };
        const approveRes2 = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        const initialFreelancer = await User.findById(freelancer._id);
        const balanceBefore = initialFreelancer.wallet.balance;

        await approveMilestone(approveReq2, approveRes2);

        const intermediateFreelancer = await User.findById(freelancer._id);
        const balanceAfterFirst = intermediateFreelancer.wallet.balance;

        // Try approving again (second release)
        const approveRes3 = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.body = data; return this; }
        };

        await approveMilestone(approveReq2, approveRes3);

        const finalFreelancer = await User.findById(freelancer._id);
        const balanceAfterSecond = finalFreelancer.wallet.balance;

        if (approveRes3.statusCode === 400 && balanceAfterSecond === balanceAfterFirst) {
            console.log('✅ PASS: Intercepted double-approval request. No duplicate wallet credits occurred.');
        } else {
            console.log('❌ FAIL: Second release occurred or was not blocked correctly.');
        }

        // Verify project completed auto-trigger
        const checkProjectCompleted = await Project.findById(project._id);
        if (checkProjectCompleted.status === 'completed') {
            console.log('✅ PASS: Project auto-completed after all milestones released.');
        } else {
            console.log('❌ FAIL: Project status was not auto-completed.');
        }

    } catch (err) {
        console.log('❌ FAIL: Scenario 3 crashed:', err.message);
    }

    // Clean up
    await User.deleteMany({ email: { $in: [tempStudentEmail, tempFreelancerEmail] } });
    await Project.deleteMany({ _id: project._id });
    await Bid.deleteMany({ project: project._id });
    await Milestone.deleteMany({ project: project._id });

    console.log('\n🧹 Temporary database records cleaned up.');
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
    console.log('\n🎉 Validation finished.');
}

runTests().catch(err => {
    console.error('Fatal error during testing:', err);
    mongoose.connection.close();
});
