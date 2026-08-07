import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay X Payouts API Service
// Requires Razorpay X (Current Account) credentials:
//   RAZORPAY_X_KEY_ID     – Your Razorpay X API key
//   RAZORPAY_X_KEY_SECRET – Your Razorpay X API secret
//   RAZORPAY_ACCOUNT_NUMBER – Your Razorpay X current account number
//
// If credentials are missing, all functions return a graceful fallback so the
// app continues working in test/dev mode without real bank transfers.
// ─────────────────────────────────────────────────────────────────────────────

const RAZORPAY_X_KEY_ID = process.env.RAZORPAY_X_KEY_ID;
const RAZORPAY_X_KEY_SECRET = process.env.RAZORPAY_X_KEY_SECRET;
const RAZORPAY_ACCOUNT_NUMBER = process.env.RAZORPAY_ACCOUNT_NUMBER;

const isPayoutsConfigured = () =>
    Boolean(RAZORPAY_X_KEY_ID && RAZORPAY_X_KEY_SECRET && RAZORPAY_ACCOUNT_NUMBER);

const rzpXAuth = () =>
    Buffer.from(`${RAZORPAY_X_KEY_ID}:${RAZORPAY_X_KEY_SECRET}`).toString('base64');

const rzpXHeaders = () => ({
    Authorization: `Basic ${rzpXAuth()}`,
    'Content-Type': 'application/json'
});

const RZP_X_BASE = 'https://api.razorpay.com/v1';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Create Contact
//    A "Contact" in Razorpay X represents a person you can send money to.
// ─────────────────────────────────────────────────────────────────────────────
export const createContact = async (user) => {
    if (!isPayoutsConfigured()) {
        return { id: `sim_contact_${user._id}`, simulated: true };
    }

    const payload = {
        name: user.profile?.fullName || user.username,
        email: user.email,
        contact: user.profile?.phone || undefined,
        type: 'employee', // freelancer = 'employee' type
        reference_id: user._id.toString(),
        notes: {
            platform: 'GigCampus',
            userId: user._id.toString()
        }
    };

    const response = await axios.post(`${RZP_X_BASE}/contacts`, payload, {
        headers: rzpXHeaders()
    });

    return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create Fund Account
//    Links a bank account or UPI ID to a Contact.
// ─────────────────────────────────────────────────────────────────────────────
export const createFundAccount = async (contactId, bankDetails) => {
    if (!isPayoutsConfigured() || (contactId && contactId.startsWith('sim_'))) {
        return { id: `sim_fa_${Date.now()}`, simulated: true };
    }

    let payload;

    if (bankDetails.mode === 'UPI' && bankDetails.upiId) {
        payload = {
            contact_id: contactId,
            account_type: 'vpa',
            vpa: {
                address: bankDetails.upiId
            }
        };
    } else {
        payload = {
            contact_id: contactId,
            account_type: 'bank_account',
            bank_account: {
                name: bankDetails.accountHolderName,
                ifsc: bankDetails.ifscCode,
                account_number: bankDetails.accountNumber
            }
        };
    }

    const response = await axios.post(`${RZP_X_BASE}/fund_accounts`, payload, {
        headers: rzpXHeaders()
    });

    return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Create Payout
//    Initiates the actual fund transfer from Razorpay X current account.
// ─────────────────────────────────────────────────────────────────────────────
export const createPayout = async ({ fundAccountId, amountInRupees, mode, purpose = 'payout', narration }) => {
    if (!isPayoutsConfigured() || (fundAccountId && fundAccountId.startsWith('sim_'))) {
        return {
            id: `sim_payout_${Date.now()}`,
            status: 'pending',
            amount: amountInRupees * 100,
            currency: 'INR',
            mode,
            simulated: true,
            created_at: Math.floor(Date.now() / 1000)
        };
    }

    const payload = {
        account_number: RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: Math.round(amountInRupees * 100), // paise
        currency: 'INR',
        mode: mode || 'NEFT',
        purpose,
        queue_if_low_balance: true,
        reference_id: `GC-WD-${Date.now()}`,
        narration: narration || 'GigCampus Earnings Withdrawal',
        notes: {
            platform: 'GigCampus'
        }
    };

    const response = await axios.post(`${RZP_X_BASE}/payouts`, payload, {
        headers: rzpXHeaders()
    });

    return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Get Payout Status
//    Polls Razorpay for current status of an initiated payout.
// ─────────────────────────────────────────────────────────────────────────────
export const getPayoutStatus = async (payoutId) => {
    if (!isPayoutsConfigured() || (payoutId && payoutId.startsWith('sim_'))) {
        return {
            id: payoutId,
            status: 'pending',
            simulated: true
        };
    }

    const response = await axios.get(`${RZP_X_BASE}/payouts/${payoutId}`, {
        headers: rzpXHeaders()
    });

    return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Validate IFSC Code (via Razorpay public API)
// ─────────────────────────────────────────────────────────────────────────────
export const validateIFSC = async (ifsc) => {
    try {
        const response = await axios.get(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
        return { valid: true, bank: response.data };
    } catch {
        return { valid: false, bank: null };
    }
};

export const isPayoutsEnabled = isPayoutsConfigured;

export default {
    createContact,
    createFundAccount,
    createPayout,
    getPayoutStatus,
    validateIFSC,
    isPayoutsEnabled
};
