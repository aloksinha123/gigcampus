import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

// ─── Status Badge Helper ───────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        processed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        queued: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        reversed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    const cls = map[status?.toLowerCase()] || map.pending;
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cls}`}>
            {status || 'pending'}
        </span>
    );
};

// ─── Transaction Type Icon ─────────────────────────────────────────────────
const TxnIcon = ({ type }) => {
    const icons = {
        deposit: { icon: '⬇️', cls: 'bg-emerald-500/10 text-emerald-400' },
        withdrawal: { icon: '⬆️', cls: 'bg-rose-500/10 text-rose-400' },
        escrow_payment: { icon: '🔒', cls: 'bg-blue-500/10 text-blue-400' },
        payment_received: { icon: '💰', cls: 'bg-purple-500/10 text-purple-400' },
        refund: { icon: '↩️', cls: 'bg-amber-500/10 text-amber-400' },
    };
    const { icon, cls } = icons[type] || { icon: '💳', cls: 'bg-slate-500/10 text-slate-400' };
    return (
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${cls}`}>
            {icon}
        </span>
    );
};

const Wallet = () => {
    const { user } = useAuth();
    const { error: showError, success: showSuccess } = useNotification();

    const [activeTab, setActiveTab] = useState('overview');
    const [wallet, setWallet] = useState({ balance: 0, totalWithdrawn: 0, pendingWithdrawal: 0, hasBankDetails: false, bankDetails: null, payoutsEnabled: false });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTxn, setLoadingTxn] = useState(false);

    // Withdraw form
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [lastPayout, setLastPayout] = useState(null);

    // Bank details form
    const [bankMode, setBankMode] = useState('NEFT');
    const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' });
    const [savingBank, setSavingBank] = useState(false);
    const [deletingBank, setDeletingBank] = useState(false);

    const fetchWallet = useCallback(async () => {
        try {
            setLoading(true);
            const [balRes] = await Promise.all([api.wallet.getBalance()]);
            setWallet(balRes.data);
        } catch (err) {
            showError('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoadingTxn(true);
            const res = await api.wallet.getTransactions();
            setTransactions(res.data?.transactions || res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTxn(false);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
        fetchTransactions();
    }, []);

    // ── Handle Withdrawal ──────────────────────────────────────────────────
    const handleWithdraw = async (e) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt < 100) return showError('Minimum withdrawal is ₹100.');
        if (amt > wallet.balance) return showError(`Insufficient balance. Available: ₹${wallet.balance}`);
        if (!wallet.hasBankDetails) {
            showError('Please add a bank account or UPI ID first.');
            setActiveTab('bank');
            return;
        }

        try {
            setWithdrawing(true);
            const res = await api.wallet.withdraw({ amount: amt });
            setLastPayout(res.data.payout);
            showSuccess(`₹${amt} withdrawal initiated! ${res.data.payout?.estimatedTime ? `ETA: ${res.data.payout.estimatedTime}` : ''}`);
            setWithdrawAmount('');
            await fetchWallet();
            await fetchTransactions();
        } catch (err) {
            showError(err.response?.data?.message || 'Withdrawal failed. Please try again.');
        } finally {
            setWithdrawing(false);
        }
    };

    // ── Handle Save Bank Details ───────────────────────────────────────────
    const handleSaveBankDetails = async (e) => {
        e.preventDefault();
        try {
            setSavingBank(true);
            const payload = { mode: bankMode, ...bankForm };
            await api.wallet.saveBankDetails(payload);
            showSuccess('Bank details saved successfully! You can now withdraw funds.');
            await fetchWallet();
            setActiveTab('withdraw');
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save bank details.');
        } finally {
            setSavingBank(false);
        }
    };

    const handleDeleteBank = async () => {
        if (!window.confirm('Remove your saved bank/UPI details?')) return;
        try {
            setDeletingBank(true);
            await api.wallet.deleteBankDetails();
            showSuccess('Bank details removed.');
            await fetchWallet();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to remove bank details.');
        } finally {
            setDeletingBank(false);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'withdraw', label: 'Withdraw', icon: '⬆️' },
        { id: 'bank', label: 'Bank Details', icon: '🏦' }
    ];

    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans pb-24">
            <Navbar variant="dark" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Header */}
                <div className="mb-8 sm:mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold mb-3 border border-emerald-500/20">
                        <span>💰 Earnings Wallet</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                        My <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400">Wallet</span>
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
                        Manage your GigCampus earnings, view transaction history, and withdraw to your bank account.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-28">
                        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-emerald-500 mb-4"></div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading wallet...</p>
                    </div>
                ) : (
                    <>
                        {/* Balance Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
                            {/* Available Balance */}
                            <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-2xl sm:rounded-[2rem] p-5 sm:p-7 border border-emerald-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8"></div>
                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Available Balance</p>
                                <p className="text-3xl sm:text-4xl font-black text-white">₹{(wallet.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <button
                                    onClick={() => setActiveTab('withdraw')}
                                    className="mt-4 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition active:scale-95 cursor-pointer min-h-[44px]"
                                >
                                    Withdraw ⬆️
                                </button>
                            </div>

                            {/* Pending */}
                            <div className="bg-slate-900/60 rounded-2xl sm:rounded-[2rem] p-5 sm:p-7 border border-slate-800">
                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Pending Withdrawal</p>
                                <p className="text-2xl sm:text-3xl font-black text-white">₹{(wallet.pendingWithdrawal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs text-slate-500 mt-4 font-medium">Being processed by Razorpay</p>
                            </div>

                            {/* Total Withdrawn */}
                            <div className="bg-slate-900/60 rounded-2xl sm:rounded-[2rem] p-5 sm:p-7 border border-slate-800">
                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-400 mb-2">Total Withdrawn</p>
                                <p className="text-2xl sm:text-3xl font-black text-white">₹{(wallet.totalWithdrawn || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs text-slate-500 mt-4 font-medium">All-time lifetime earnings out</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
                            {/* Tab Bar */}
                            <div className="flex border-b border-slate-800">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3.5 sm:py-4 text-xs font-black uppercase tracking-wider transition cursor-pointer min-h-[44px] ${
                                            activeTab === tab.id
                                                ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/5'
                                                : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span className="text-[11px] sm:text-xs">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="p-8">
                                {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
                                {activeTab === 'overview' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-lg font-black text-white">Transaction History</h2>
                                            <span className="text-xs text-slate-500">{transactions.length} transactions</span>
                                        </div>

                                        {loadingTxn ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
                                            </div>
                                        ) : transactions.length === 0 ? (
                                            <div className="text-center py-14">
                                                <p className="text-4xl mb-3">📭</p>
                                                <p className="text-slate-400 font-bold">No transactions yet</p>
                                                <p className="text-slate-600 text-xs mt-1">Your earnings and withdrawals will appear here.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {transactions.map(txn => (
                                                    <div key={txn._id} className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/60 hover:border-slate-700 transition">
                                                        <TxnIcon type={txn.type} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{txn.description || txn.type}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">
                                                                {new Date(txn.createdAt).toLocaleString()} • {txn.withdrawalMode || txn.type}
                                                            </p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className={`text-sm font-black ${txn.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {txn.amount >= 0 ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </p>
                                                            <StatusBadge status={txn.payoutStatus || txn.status} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── WITHDRAW TAB ─────────────────────────────────────── */}
                                {activeTab === 'withdraw' && (
                                    <div className="max-w-lg mx-auto">
                                        <h2 className="text-lg font-black text-white mb-6">Withdraw Earnings</h2>

                                        {!wallet.hasBankDetails && (
                                            <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-6 flex items-start gap-3">
                                                <span className="text-xl">⚠️</span>
                                                <div>
                                                    <p className="text-sm font-black text-amber-300">Bank details required</p>
                                                    <p className="text-xs text-amber-400/80 mt-1">Please add a bank account or UPI ID before withdrawing.</p>
                                                    <button onClick={() => setActiveTab('bank')} className="mt-2 text-xs font-black text-amber-400 hover:text-amber-300 underline cursor-pointer">
                                                        Add Bank Details →
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Current bank info */}
                                        {wallet.hasBankDetails && wallet.bankDetails && (
                                            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 mb-6 flex items-center gap-3">
                                                <span className="text-2xl">{wallet.bankDetails.mode === 'UPI' ? '📱' : '🏦'}</span>
                                                <div>
                                                    <p className="text-xs font-black text-white">{wallet.bankDetails.mode === 'UPI' ? wallet.bankDetails.upiId : wallet.bankDetails.bankName || 'Bank Account'}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold">
                                                        {wallet.bankDetails.mode === 'UPI' ? 'UPI Transfer' : `IFSC: ${wallet.bankDetails.ifscCode} • ${wallet.bankDetails.accountNumberMasked}`}
                                                        {wallet.bankDetails.isVerified && <span className="text-emerald-400 ml-2">✓ Verified</span>}
                                                    </p>
                                                </div>
                                                <button onClick={() => setActiveTab('bank')} className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer">Change</button>
                                            </div>
                                        )}

                                        <form onSubmit={handleWithdraw} className="space-y-6">
                                            {/* Amount Input */}
                                            <div>
                                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Withdrawal Amount (₹)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        min="100"
                                                        max={wallet.balance}
                                                        step="0.01"
                                                        value={withdrawAmount}
                                                        onChange={e => setWithdrawAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-slate-950 text-white text-2xl font-black pl-10 pr-4 py-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition"
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-2">
                                                    <span className="text-[10px] text-slate-500 font-bold">Minimum: ₹100</span>
                                                    <button type="button" onClick={() => setWithdrawAmount(String(wallet.balance))} className="text-[10px] text-emerald-400 font-black cursor-pointer hover:text-emerald-300">Max ₹{wallet.balance}</button>
                                                </div>
                                            </div>

                                            {/* Quick Amount Buttons */}
                                            <div className="flex gap-2 flex-wrap">
                                                {[500, 1000, 2000, 5000].map(amt => (
                                                    <button
                                                        type="button"
                                                        key={amt}
                                                        onClick={() => setWithdrawAmount(String(Math.min(amt, wallet.balance)))}
                                                        disabled={wallet.balance < amt}
                                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                                    >
                                                        ₹{amt.toLocaleString()}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Estimated Time */}
                                            {wallet.bankDetails && (
                                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                    <p className="text-xs font-black text-blue-400">
                                                        ⏱️ Estimated Transfer Time
                                                    </p>
                                                    <p className="text-xs text-blue-300/80 mt-1">
                                                        {{
                                                            NEFT: '2–4 hours (during banking hours)',
                                                            RTGS: '30 minutes (during banking hours)',
                                                            IMPS: '5–10 minutes (24/7)',
                                                            UPI: 'Instant — usually within 1 minute'
                                                        }[wallet.bankDetails.mode] || '2–4 hours'}
                                                    </p>
                                                    {!wallet.payoutsEnabled && (
                                                        <p className="text-[10px] text-amber-400/80 mt-2">⚠️ Razorpay X not configured — withdrawal will be simulated (test mode)</p>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 100 || !wallet.hasBankDetails}
                                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
                                            >
                                                {withdrawing ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                                                        Processing...
                                                    </span>
                                                ) : `Withdraw ₹${parseFloat(withdrawAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </button>
                                        </form>

                                        {/* Success Payout Info */}
                                        {lastPayout && (
                                            <div className="mt-6 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                                <p className="text-sm font-black text-emerald-400 mb-2">✅ Withdrawal Initiated!</p>
                                                <div className="space-y-1 text-xs text-slate-400">
                                                    <div className="flex justify-between"><span>Payout ID:</span><span className="text-slate-200 font-mono">{lastPayout.id}</span></div>
                                                    <div className="flex justify-between"><span>Mode:</span><span className="text-slate-200">{lastPayout.mode}</span></div>
                                                    <div className="flex justify-between"><span>Status:</span><StatusBadge status={lastPayout.status} /></div>
                                                    <div className="flex justify-between"><span>ETA:</span><span className="text-emerald-400">{lastPayout.estimatedTime}</span></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── BANK DETAILS TAB ─────────────────────────────────── */}
                                {activeTab === 'bank' && (
                                    <div className="max-w-lg mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-lg font-black text-white">Bank / UPI Details</h2>
                                            {wallet.hasBankDetails && (
                                                <button
                                                    onClick={handleDeleteBank}
                                                    disabled={deletingBank}
                                                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-black border border-rose-500/20 transition cursor-pointer"
                                                >
                                                    {deletingBank ? 'Removing...' : 'Remove ✕'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Current Bank Details Display */}
                                        {wallet.hasBankDetails && wallet.bankDetails && (
                                            <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 mb-6">
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Saved Account</p>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Mode:</span>
                                                        <span className="text-white font-bold">{wallet.bankDetails.mode}</span>
                                                    </div>
                                                    {wallet.bankDetails.mode === 'UPI' ? (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">UPI ID:</span>
                                                            <span className="text-white font-bold">{wallet.bankDetails.upiId}</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Bank:</span>
                                                                <span className="text-white font-bold">{wallet.bankDetails.bankName || 'Bank Account'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Account:</span>
                                                                <span className="text-white font-bold">{wallet.bankDetails.accountNumberMasked}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">IFSC:</span>
                                                                <span className="text-white font-mono font-bold">{wallet.bankDetails.ifscCode}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Status:</span>
                                                        <StatusBadge status={wallet.bankDetails.isVerified ? 'completed' : 'pending'} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mode Selector */}
                                        <div className="mb-6">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-3">Transfer Mode</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {['NEFT', 'IMPS', 'RTGS', 'UPI'].map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setBankMode(m)}
                                                        className={`py-3 rounded-xl text-xs font-black uppercase transition cursor-pointer border ${
                                                            bankMode === m
                                                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {m === 'UPI' ? '📱 ' : '🏦 '}{m}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-2">
                                                {{
                                                    NEFT: 'National Electronic Fund Transfer — 2–4 hrs during banking hours',
                                                    IMPS: 'Immediate Payment Service — 5–10 min, 24/7',
                                                    RTGS: 'Real Time Gross Settlement — 30 min, min ₹2 lakh',
                                                    UPI: 'UPI — Instant to any UPI-enabled account'
                                                }[bankMode]}
                                            </p>
                                        </div>

                                        {/* Bank Form */}
                                        <form onSubmit={handleSaveBankDetails} className="space-y-4">
                                            {bankMode === 'UPI' ? (
                                                <div>
                                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">UPI ID</label>
                                                    <input
                                                        type="text"
                                                        value={bankForm.upiId}
                                                        onChange={e => setBankForm({ ...bankForm, upiId: e.target.value })}
                                                        placeholder="yourname@upi"
                                                        required
                                                        className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition text-sm font-medium"
                                                    />
                                                    <p className="text-[10px] text-slate-600 mt-1">e.g. 9876543210@ybl, name@okicici, name@paytm</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Account Holder Name</label>
                                                        <input
                                                            type="text"
                                                            value={bankForm.accountHolderName}
                                                            onChange={e => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                                                            placeholder="As on bank records"
                                                            required
                                                            className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition text-sm font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Account Number</label>
                                                        <input
                                                            type="text"
                                                            value={bankForm.accountNumber}
                                                            onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                                            placeholder="Enter your account number"
                                                            required
                                                            className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition text-sm font-medium font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">IFSC Code</label>
                                                        <input
                                                            type="text"
                                                            value={bankForm.ifscCode}
                                                            onChange={e => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                                                            placeholder="e.g. HDFC0001234"
                                                            maxLength={11}
                                                            required
                                                            className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition text-sm font-mono uppercase"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Bank Name (optional)</label>
                                                        <input
                                                            type="text"
                                                            value={bankForm.bankName}
                                                            onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                                                            placeholder="e.g. HDFC Bank, SBI, Axis"
                                                            className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition text-sm font-medium"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                <p className="text-[10px] text-blue-400 font-black">🔒 Secure Storage</p>
                                                <p className="text-[10px] text-blue-300/70 mt-1">Your bank details are encrypted and securely registered with Razorpay. Account numbers are masked in all displays.</p>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={savingBank}
                                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-lg"
                                            >
                                                {savingBank ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                                                        Saving Details...
                                                    </span>
                                                ) : wallet.hasBankDetails ? 'Update Bank Details 🔄' : 'Save Bank Details 🏦'}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Wallet;
