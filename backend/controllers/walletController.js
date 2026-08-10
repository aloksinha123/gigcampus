import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import payoutService, { isPayoutsEnabled } from '../services/razorpayPayoutService.js';
import { recordFraudSignal } from '../services/fraudDetectionService.js';

// @desc    Get user's wallet balance + bank details
// @route   GET /api/v1/wallet/balance
// @access  Private
export const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('wallet username email');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Mask account number for security
        const bankDetails = user.wallet?.bankDetails
            ? {
                ...user.wallet.bankDetails.toObject(),
                accountNumber: user.wallet.bankDetails.accountNumber
                    ? `****${user.wallet.bankDetails.accountNumber.slice(-4)}`
                    : undefined
            }
            : null;

        res.json({
            success: true,
            username: user.username,
            email: user.email,
            balance: user.wallet?.balance || 0,
            totalWithdrawn: user.wallet?.totalWithdrawn || 0,
            pendingWithdrawal: user.wallet?.pendingWithdrawal || 0,
            hasBankDetails: Boolean(user.wallet?.bankDetails?.razorpayFundAccountId || user.wallet?.bankDetails?.upiId),
            bankDetails,
            payoutsEnabled: isPayoutsEnabled()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Save / Update bank account or UPI details
// @route   POST /api/v1/wallet/bank-details
// @access  Private (Freelancer)
export const saveBankDetails = async (req, res) => {
    try {
        const { mode, accountHolderName, accountNumber, ifscCode, bankName, upiId } = req.body;

        if (!mode || !['NEFT', 'UPI', 'RTGS', 'IMPS'].includes(mode)) {
            return res.status(400).json({ success: false, message: 'Invalid mode. Use NEFT, UPI, RTGS, or IMPS.' });
        }

        if (mode === 'UPI') {
            if (!upiId || !/^[\w.\-]+@[\w]+$/.test(upiId)) {
                return res.status(400).json({ success: false, message: 'Invalid UPI ID format (e.g. name@upi)' });
            }
        } else {
            if (!accountHolderName || !accountNumber || !ifscCode) {
                return res.status(400).json({ success: false, message: 'Account holder name, account number, and IFSC are required.' });
            }
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
                return res.status(400).json({ success: false, message: 'Invalid IFSC code format (e.g. HDFC0001234).' });
            }
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Step 1: Create or reuse Razorpay Contact
        let contactId = user.wallet?.razorpayContactId;
        if (!contactId) {
            const contact = await payoutService.createContact(user);
            contactId = contact.id;
        }

        // Step 2: Create Fund Account with bank details
        const bankPayload = { mode, accountHolderName, accountNumber, ifscCode: ifscCode?.toUpperCase(), bankName, upiId };
        const fundAccount = await payoutService.createFundAccount(contactId, bankPayload);

        // Step 3: Validate IFSC if bank transfer mode
        let ifscInfo = null;
        if (mode !== 'UPI' && ifscCode) {
            const validation = await payoutService.validateIFSC(ifscCode.toUpperCase());
            if (validation.valid) {
                ifscInfo = validation.bank;
            }
        }

        // Step 4: Persist on User document
        user.wallet = user.wallet || {};
        user.wallet.razorpayContactId = contactId;
        user.wallet.bankDetails = {
            accountHolderName: accountHolderName || undefined,
            accountNumber: accountNumber || undefined,
            ifscCode: ifscCode?.toUpperCase() || undefined,
            bankName: bankName || ifscInfo?.BANK || undefined,
            upiId: upiId || undefined,
            mode,
            razorpayFundAccountId: fundAccount.id,
            isVerified: !fundAccount.simulated,
            addedAt: new Date()
        };

        await user.save();

        res.json({
            success: true,
            message: 'Bank details saved successfully.',
            fundAccountId: fundAccount.id,
            mode,
            bankName: bankName || ifscInfo?.BANK,
            simulated: Boolean(fundAccount.simulated)
        });
    } catch (error) {
        console.error('Save Bank Details Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Get saved bank details (masked)
// @route   GET /api/v1/wallet/bank-details
// @access  Private
export const getBankDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('wallet');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (!user.wallet?.bankDetails?.razorpayFundAccountId && !user.wallet?.bankDetails?.upiId) {
            return res.json({ success: true, hasBankDetails: false, bankDetails: null });
        }

        const bd = user.wallet.bankDetails.toObject();

        res.json({
            success: true,
            hasBankDetails: true,
            bankDetails: {
                mode: bd.mode,
                bankName: bd.bankName,
                accountHolderName: bd.accountHolderName,
                accountNumberMasked: bd.accountNumber ? `****${bd.accountNumber.slice(-4)}` : undefined,
                ifscCode: bd.ifscCode,
                upiId: bd.upiId,
                isVerified: bd.isVerified,
                addedAt: bd.addedAt
            },
            payoutsEnabled: isPayoutsEnabled()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Remove saved bank details
// @route   DELETE /api/v1/wallet/bank-details
// @access  Private
export const deleteBankDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.wallet?.pendingWithdrawal > 0) {
            return res.status(400).json({ success: false, message: 'Cannot remove bank details while a withdrawal is in progress.' });
        }

        user.wallet.bankDetails = undefined;
        await user.save();

        res.json({ success: true, message: 'Bank details removed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Initiate real withdrawal via Razorpay Payouts
// @route   POST /api/v1/wallet/withdraw
// @access  Private (Freelancer)
export const withdrawFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user._id;

        // 1. Check for rapid withdrawals: 3+ in 30 minutes
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        const recentWithdrawalsCount = await Transaction.countDocuments({
            user: userId,
            type: 'withdrawal',
            createdAt: { $gte: thirtyMinsAgo }
        });
        if (recentWithdrawalsCount >= 3) {
            await recordFraudSignal(userId, 'RAPID_WITHDRAWALS', req, {
                withdrawalsCount: recentWithdrawalsCount + 1,
                timeWindow: '30 mins'
            });
        }

        // 2. Check for unusual withdrawal amount: > 2x recent 30-day average
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const pastWithdrawals = await Transaction.find({
            user: userId,
            type: 'withdrawal',
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
        });
        if (pastWithdrawals.length > 0) {
            const sum = pastWithdrawals.reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);
            const avg = sum / pastWithdrawals.length;
            if (amount > 2 * avg) {
                await recordFraudSignal(userId, 'UNUSUAL_WITHDRAWAL', req, {
                    requestedAmount: amount,
                    averageAmount: avg,
                    pastWithdrawalsCount: pastWithdrawals.length
                });
            }
        }

        // --- Validation ---
        if (!amount || typeof amount !== 'number' || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if ((user.wallet?.balance || 0) < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: ₹${user.wallet?.balance?.toFixed(2) || 0}`
            });
        }

        const fundAccountId = user.wallet?.bankDetails?.razorpayFundAccountId;
        if (!fundAccountId) {
            return res.status(400).json({
                success: false,
                message: 'Please add a bank account or UPI ID before withdrawing.'
            });
        }

        const mode = user.wallet.bankDetails.mode || 'NEFT';

        // --- Initiate Real Payout via Razorpay X ---
        const payout = await payoutService.createPayout({
            fundAccountId,
            amountInRupees: amount,
            mode,
            purpose: 'payout',
            narration: `GigCampus Earnings - ${user.username}`
        });

        // --- Deduct from wallet, track pending ---
        user.wallet.balance -= amount;
        user.wallet.pendingWithdrawal = (user.wallet.pendingWithdrawal || 0) + amount;
        await user.save();

        // --- Create Transaction Record ---
        const transactionId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const txn = await Transaction.create({
            user: userId,
            type: 'withdrawal',
            amount: -amount,
            balanceAfter: user.wallet.balance,
            status: payout.status === 'processed' ? 'completed' : 'pending',
            description: `Withdrawal via ${mode} to ${
                mode === 'UPI' ? user.wallet.bankDetails.upiId : `****${user.wallet.bankDetails.accountNumber?.slice(-4) || '???'}`
            }`,
            transactionId,
            razorpayPayoutId: payout.id,
            withdrawalMode: mode,
            payoutStatus: payout.status || 'pending',
            utrNumber: payout.utr || null
        });

        const estimatedTime = {
            NEFT: '2–4 hours (banking hours)',
            RTGS: '30 minutes (banking hours)',
            IMPS: '5–10 minutes',
            UPI: 'Instant (usually within 1 minute)'
        }[mode] || '2-4 hours';

        res.json({
            success: true,
            message: `Withdrawal of ₹${amount} initiated successfully!`,
            payout: {
                id: payout.id,
                amount,
                mode,
                status: payout.status || 'pending',
                estimatedTime,
                simulated: Boolean(payout.simulated)
            },
            newBalance: user.wallet.balance,
            transactionId: txn._id
        });
    } catch (error) {
        console.error('Withdrawal Error:', error.response?.data || error.message);

        // Re-credit wallet if payout API failed after deduction
        try {
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { 'wallet.balance': amount || 0, 'wallet.pendingWithdrawal': -(amount || 0) }
            });
        } catch (rollbackErr) {
            console.error('CRITICAL: Wallet rollback failed:', rollbackErr.message);
        }

        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Get status of a specific payout
// @route   GET /api/v1/wallet/withdrawal/:id/status
// @access  Private
export const getWithdrawalStatus = async (req, res) => {
    try {
        const txn = await Transaction.findById(req.params.id);

        if (!txn || txn.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (!txn.razorpayPayoutId) {
            return res.json({ success: true, status: txn.status, payoutStatus: txn.payoutStatus });
        }

        // Fetch live status from Razorpay
        const payout = await payoutService.getPayoutStatus(txn.razorpayPayoutId);

        // Auto-update if processed
        if (payout.status === 'processed' && txn.payoutStatus !== 'processed') {
            txn.payoutStatus = 'processed';
            txn.status = 'completed';
            txn.utrNumber = payout.utr || txn.utrNumber;

            // Release from pending
            await User.findByIdAndUpdate(req.user._id, {
                $inc: {
                    'wallet.pendingWithdrawal': -(Math.abs(txn.amount)),
                    'wallet.totalWithdrawn': Math.abs(txn.amount)
                }
            });

            await txn.save();
        }

        res.json({
            success: true,
            payoutId: payout.id,
            status: payout.status,
            utr: payout.utr,
            amount: (payout.amount || 0) / 100,
            mode: payout.mode,
            failureReason: payout.failure_reason || null,
            simulated: Boolean(payout.simulated)
        });
    } catch (error) {
        console.error('Get Payout Status Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Get wallet transaction history
// @route   GET /api/v1/wallet/transactions
// @access  Private
export const getWalletTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// @desc    Deposit funds to wallet after Razorpay payment verification
// @route   POST /api/v1/wallet/deposit
// @access  Private
export const depositFunds = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification required. Provide razorpay_order_id, razorpay_payment_id, and razorpay_signature.'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // 1. Verify HMAC signature to ensure request integrity
        const crypto = await import('crypto');
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
        }

        const expectedSignature = crypto.default
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const sigBuffer = Buffer.from(expectedSignature, 'utf-8');
        const recvBuffer = Buffer.from(razorpay_signature, 'utf-8');
        const validSignature = sigBuffer.length === recvBuffer.length && crypto.default.timingSafeEqual(sigBuffer, recvBuffer);

        if (!validSignature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // 2. Fetch payment from Razorpay to confirm it is actually captured
        let rzpPayment;
        try {
            const razorpayService = (await import('../services/razorpayService.js')).default;
            rzpPayment = await razorpayService.fetchPayment(razorpay_payment_id);
        } catch {
            return res.status(400).json({ success: false, message: 'Could not verify payment with Razorpay' });
        }

        if (rzpPayment.status !== 'captured') {
            return res.status(400).json({
                success: false,
                message: `Payment not completed. Status: ${rzpPayment.status}`
            });
        }

        const paidAmount = rzpPayment.amount / 100;

        // 3. Idempotency — prevent double-crediting
        const existingTxn = await Transaction.findOne({ transactionId: razorpay_payment_id });
        if (existingTxn) {
            return res.status(409).json({ success: false, message: 'This payment has already been processed' });
        }

        // 4. Credit wallet with the Razorpay-verified amount (not client-supplied)
        user.wallet.balance = (user.wallet?.balance || 0) + paidAmount;
        await user.save();

        await Transaction.create({
            user: user._id,
            type: 'deposit',
            amount: paidAmount,
            balanceAfter: user.wallet.balance,
            description: `Razorpay Wallet Deposit (Order: ${razorpay_order_id})`,
            transactionId: razorpay_payment_id
        });

        res.json({
            success: true,
            message: 'Funds deposited successfully',
            amount: paidAmount,
            newBalance: user.wallet.balance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
