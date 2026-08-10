import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { success, error } = useNotification();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle', 'success', 'expired', 'error'
    const [statusMsg, setStatusMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            error('Password must be at least 6 characters long');
            return;
        }

        try {
            setLoading(true);
            setStatus('idle');
            setStatusMsg('');

            const res = await api.auth.resetPassword(token, { password, confirmPassword });

            setStatus('success');
            const msg = res.data.message || 'Password updated successfully! You can now log in.';
            setStatusMsg(msg);
            success(msg);
        } catch (err) {
            const errData = err.response?.data;
            const msg = errData?.message || 'Password reset failed. Token may be invalid or expired.';
            setStatusMsg(msg);
            error(msg);

            if (err.response?.status === 410 || errData?.expired) {
                setStatus('expired');
            } else {
                setStatus('error');
            }
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
                        <h2 className="text-3xl font-bold text-gc-navy mb-2">Reset Password</h2>
                        <p className="text-gc-muted text-sm">Enter your new secure password below</p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-emerald-200">
                                ✓
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gc-navy">Password Updated! 🎉</h3>
                                <p className="text-gc-navy text-xs leading-relaxed bg-gc-soft p-4 rounded-2xl border border-gc-light">
                                    {statusMsg}
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="block w-full py-3.5 px-6 bg-gc-blue hover:bg-gc-navy text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                                >
                                    Login with New Password →
                                </Link>
                            </div>
                        </div>
                    ) : status === 'expired' ? (
                        <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-rose-200">
                                ⏰
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gc-navy">Reset Link Expired</h3>
                                <p className="text-gc-navy text-xs leading-relaxed bg-gc-soft p-4 rounded-2xl border border-gc-light">
                                    {statusMsg || 'Password reset links expire after 15 minutes for security.'}
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/forgot-password"
                                    className="block w-full py-3.5 px-6 bg-gc-blue hover:bg-gc-navy text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                                >
                                    Request New Reset Link →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gc-navy mb-2 font-medium text-sm">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-gc-navy mb-2 font-medium text-sm">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gc-blue hover:bg-gc-navy text-white py-3 px-6 rounded-xl transition font-semibold shadow-lg disabled:opacity-50 text-sm cursor-pointer"
                            >
                                {loading ? 'Updating Password...' : '🔒 Reset Password'}
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

export default ResetPassword;
