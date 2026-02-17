import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';

// @desc    Get user's wallet balance
// @route   GET /api/wallet/balance
// @access  Private
export const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('wallet username email');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            username: user.username,
            email: user.email,
            balance: user.wallet.balance || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get wallet transaction history
// @route   GET /api/wallet/transactions
// @access  Private
export const getWalletTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Withdraw funds from wallet
// @route   POST /api/wallet/withdraw
// @access  Private (Freelancer)
export const withdrawFunds = async (req, res) => {
    try {
        const { amount, bankAccount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid withdrawal amount' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct from wallet
        user.wallet.balance -= amount;
        await user.save();

        // Create transaction record
        await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: -amount,
            balanceAfter: user.wallet.balance,
            description: `Withdrawal to bank account: ${bankAccount || 'Default'}`,
            transactionId: `WD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase()
        });

        res.json({
            message: 'Withdrawal request submitted successfully',
            amount,
            newBalance: user.wallet.balance,
            bankAccount: bankAccount || 'Default account',
            status: 'pending',
            estimatedTime: '2-3 business days'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Deposit funds to wallet (Mock)
// @route   POST /api/wallet/deposit
// @access  Private
export const depositFunds = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid deposit amount' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.wallet.balance = (user.wallet.balance || 0) + amount;
        await user.save();

        // Create transaction record
        await Transaction.create({
            user: user._id,
            type: 'deposit',
            amount: amount,
            balanceAfter: user.wallet.balance,
            description: 'Mock deposit for development',
            transactionId: `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase()
        });

        res.json({
            message: 'Funds deposited successfully',
            amount,
            newBalance: user.wallet.balance
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
