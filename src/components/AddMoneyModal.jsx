import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

// Helper function to dynamically load Razorpay checkout.js script
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const AddMoneyModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, updateUser } = useAuth();
    const { success, error } = useNotification();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleProceedToPay = async (e) => {
        e.preventDefault();

        const numericAmount = Number(amount);
        if (!amount || isNaN(numericAmount) || numericAmount < 1) {
            error('Please enter a valid amount (minimum ₹1)');
            return;
        }

        try {
            setLoading(true);

            // 1. Dynamically load Razorpay SDK
            const isScriptLoaded = await loadRazorpayScript();
            if (!isScriptLoaded) {
                error('Failed to load Razorpay SDK. Please check your internet connection.');
                setLoading(false);
                return;
            }

            // 2. Create Razorpay order via API (POST /api/payments/create-order)
            const response = await api.post('/payments/create-order', { amount: numericAmount });
            const { success: isOrderCreated, order, key } = response.data;

            if (!isOrderCreated || !order) {
                error('Failed to create Razorpay order');
                setLoading(false);
                return;
            }

            // 3. Configure Razorpay checkout options
            const options = {
                key: key,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'GigCampus',
                description: 'Add Money to Wallet',
                order_id: order.id,
                prefill: {
                    name: user?.profile?.fullName || user?.username || '',
                    email: user?.email || '',
                    contact: user?.profile?.phone || ''
                },
                theme: {
                    color: '#6366f1' // Indigo brand theme
                },
                handler: async function (paymentResponse) {
                    console.log('--- Razorpay Payment Completed ---');
                    console.log('razorpay_payment_id:', paymentResponse.razorpay_payment_id);
                    console.log('razorpay_order_id:', paymentResponse.razorpay_order_id);
                    console.log('razorpay_signature:', paymentResponse.razorpay_signature);

                    try {
                        // Sprint 5: Verify signature & fund wallet via backend
                        const verifyRes = await api.post('/payments/verify', {
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature,
                            amount: numericAmount
                        });

                        if (verifyRes.data?.success) {
                            // Update wallet balance in React state immediately
                            const newBalance = verifyRes.data.walletBalance;
                            if (newBalance !== undefined && updateUser) {
                                updateUser({
                                    wallet: {
                                        ...user?.wallet,
                                        balance: newBalance
                                    }
                                });
                            }

                            success(`₹${numericAmount} added successfully.`);

                            if (onSuccess) onSuccess(verifyRes.data);
                            if (onClose) onClose();
                        } else {
                            error('Payment Verification Failed');
                        }
                    } catch (verifyErr) {
                        console.error('Payment verification error:', verifyErr);
                        error(verifyErr.response?.data?.message || 'Payment Verification Failed');
                    }
                },
                modal: {
                    ondismiss: function () {
                        console.log('Razorpay payment modal closed by user');
                        error('Payment cancelled by user');
                    }
                }
            };

            // 4. Initialize & open Razorpay Checkout
            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (failureResponse) {
                console.error('Razorpay payment failed:', failureResponse.error);
                error(failureResponse.error?.description || 'Payment failed');
            });

            rzp.open();
        } catch (err) {
            console.error('Razorpay Order Creation Error:', err);
            error(err.response?.data?.message || 'Network error: Failed to initiate payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        💳 Add Money to Wallet
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold p-1 rounded-lg"
                    >
                        &times;
                    </button>
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Enter the amount in Rupees (₹) to proceed with Razorpay Checkout.
                </p>

                <form onSubmit={handleProceedToPay} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Amount (₹)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                                ₹
                            </span>
                            <input
                                type="number"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="500"
                                disabled={loading}
                                className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                required
                            />
                        </div>
                    </div>

                    {/* Quick Amount Selection */}
                    <div className="flex gap-2">
                        {[100, 500, 1000, 2000].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setAmount(preset.toString())}
                                disabled={loading}
                                className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                +₹{preset}
                            </button>
                        ))}
                    </div>

                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                        <span>🔒</span>
                        <span>Secured by Razorpay. Test mode enabled.</span>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing Order...</span>
                                </>
                            ) : (
                                <span>Proceed to Pay</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3.5 px-5 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMoneyModal;
