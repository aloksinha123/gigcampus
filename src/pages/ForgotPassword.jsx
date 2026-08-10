import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ForgotPassword = () => {
    const { success, error } = useNotification();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await api.auth.forgotPassword({ email });
            setSubmitted(true);
            const successMsg = res.data.message || 'If an account exists for this email, a password reset link has been sent.';
            setMessage(successMsg);
            success('Request processed successfully');
        } catch (err) {
            error(err.response?.data?.message || 'Failed to process password reset request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gc-soft/40 flex items-center justify-center p-4">
            <div className="w-full max-w-md px-2 sm:px-0">
                <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 border border-gc-border">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block mb-4">
                            <span className="text-3xl font-bold text-gc-navy flex items-center justify-center gap-2">
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
                                </svg>
                                GigCampus
                            </span>
                        </Link>
                        <h2 className="text-3xl font-bold text-gc-navy mb-2">Forgot Password?</h2>
                        <p className="text-gc-muted text-sm">Enter your email to receive a password reset link</p>
                    </div>

                    {submitted ? (
                        <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-gc-soft text-gc-blue rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-gc-light">
                                📩
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gc-navy">Reset Link Sent</h3>
                                <p className="text-gc-navy text-xs leading-relaxed bg-gc-soft p-4 rounded-2xl border border-gc-light">
                                    {message}
                                </p>
                                <p className="text-gc-muted text-xs">
                                    Please check your inbox (and spam folder). The link will expire in <strong>15 minutes</strong>.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="block w-full py-3.5 px-6 bg-gc-blue hover:bg-gc-navy text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                                >
                                    Return to Login →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gc-navy mb-2 font-medium text-sm">Registered Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue focus:border-transparent text-sm"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gc-blue hover:bg-gc-navy text-white py-3 px-6 rounded-xl transition font-semibold shadow-lg disabled:opacity-50 text-sm cursor-pointer"
                            >
                                {loading ? 'Sending Reset Link...' : '📨 Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-gc-muted hover:text-gc-navy text-sm">
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
