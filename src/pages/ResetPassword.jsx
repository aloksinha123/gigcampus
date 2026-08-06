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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block mb-4">
                            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                🚀 GigCampus
                            </span>
                        </Link>
                        <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                        <p className="text-white/70 text-sm">Enter your new secure password below</p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-emerald-400/30">
                                ✓
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Password Updated! 🎉</h3>
                                <p className="text-white/80 text-xs leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
                                    {statusMsg}
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="block w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                                >
                                    Login with New Password →
                                </Link>
                            </div>
                        </div>
                    ) : status === 'expired' ? (
                        <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-rose-400/30">
                                ⏰
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Reset Link Expired</h3>
                                <p className="text-white/80 text-xs leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
                                    {statusMsg || 'Password reset links expire after 15 minutes for security.'}
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/forgot-password"
                                    className="block w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                                >
                                    Request New Reset Link →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-white/80 mb-2 font-medium text-sm">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-white/80 mb-2 font-medium text-sm">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl transition font-semibold shadow-lg disabled:opacity-50 text-sm cursor-pointer"
                            >
                                {loading ? 'Updating Password...' : '🔒 Reset Password'}
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

export default ResetPassword;
