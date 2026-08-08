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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-2 sm:px-0">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-5 sm:p-8 border border-white/20">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block mb-4">
                            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                🚀 GigCampus
                            </span>
                        </Link>
                        <h2 className="text-3xl font-bold text-white mb-2">Forgot Password?</h2>
                        <p className="text-white/70 text-sm">Enter your email to receive a password reset link</p>
                    </div>

                    {submitted ? (
                        <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-blue-500/20 text-blue-300 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-blue-400/30">
                                📩
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Reset Link Sent</h3>
                                <p className="text-white/80 text-xs leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
                                    {message}
                                </p>
                                <p className="text-white/60 text-xs">
                                    Please check your inbox (and spam folder). The link will expire in <strong>15 minutes</strong>.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="block w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                                >
                                    Return to Login →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-white/80 mb-2 font-medium text-sm">Registered Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl transition font-semibold shadow-lg disabled:opacity-50 text-sm cursor-pointer"
                            >
                                {loading ? 'Sending Reset Link...' : '📨 Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-white/60 hover:text-white/80 text-sm">
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
