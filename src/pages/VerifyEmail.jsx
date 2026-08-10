import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';

const VerifyEmail = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'expired'
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState('');
    const [resendError, setResendError] = useState('');

    const verificationTriggered = useRef(false);

    useEffect(() => {
        if (token) {
            if (verificationTriggered.current) return;
            verificationTriggered.current = true;
            handleVerify();
        } else {
            setStatus('error');
            setMessage('Verification token missing.');
        }
    }, [token]);

    const handleVerify = async () => {
        try {
            setStatus('verifying');
            const response = await api.auth.verifyEmail(token);
            setStatus('success');
            setMessage(response.data.message || 'Email verified successfully!');
        } catch (err) {
            const errData = err.response?.data;
            setMessage(errData?.message || 'Verification failed. Token may be invalid or expired.');
            if (errData?.email) {
                setEmail(errData.email);
            }
            if (err.response?.status === 410 || errData?.expired) {
                setStatus('expired');
            } else {
                setStatus('error');
            }
        }
    };

    const handleResend = async (e) => {
        e.preventDefault();
        if (!email) {
            setResendError('Please enter your email address.');
            return;
        }

        try {
            setResendLoading(true);
            setResendError('');
            setResendSuccess('');
            const res = await api.auth.resendVerification({ email });
            setResendSuccess(res.data.message || 'A new verification link has been sent to your email.');
        } catch (err) {
            setResendError(err.response?.data?.message || 'Failed to resend verification email.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gc-soft/40 flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gc-border p-8 text-center animate-in fade-in duration-300">
                    
                    {/* Verifying State */}
                    {status === 'verifying' && (
                        <div className="py-8">
                            <div className="w-16 h-16 border-4 border-gc-blue border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
                            <p className="text-sm text-gray-600">Please wait while we confirm your email address...</p>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && (
                        <div className="py-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                                ✓
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Email Verified! 🎉</h2>
                            <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                                {message || 'Your email address has been successfully confirmed. You can now access all GigCampus features.'}
                            </p>
                            <Link
                                to="/login"
                                className="block w-full py-4 px-6 bg-gc-blue hover:bg-gc-navy text-white font-bold rounded-2xl shadow-lg transition active:scale-95"
                            >
                                Proceed to Login →
                            </Link>
                        </div>
                    )}

                    {/* Expired or Error State */}
                    {(status === 'error' || status === 'expired') && (
                        <div className="py-6">
                            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                                {status === 'expired' ? '⏳' : '⚠️'}
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">
                                {status === 'expired' ? 'Link Expired' : 'Verification Failed'}
                            </h2>
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                {message}
                            </p>

                            {/* Resend Form */}
                            <form onSubmit={handleResend} className="mt-6 text-left bg-gray-50 p-5 rounded-2xl border border-gray-200/80">
                                <h3 className="font-bold text-sm text-gray-900 mb-2">Request New Verification Link</h3>
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-2.5 bg-white border border-gc-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gc-blue"
                                        required
                                    />
                                </div>

                                {resendSuccess && (
                                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">
                                        ✓ {resendSuccess}
                                    </div>
                                )}

                                {resendError && (
                                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                                        ⚠️ {resendError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={resendLoading}
                                    className="w-full py-3 bg-gc-blue hover:bg-gc-navy disabled:opacity-50 text-white font-bold text-sm rounded-xl transition cursor-pointer"
                                >
                                    {resendLoading ? 'Sending...' : '📨 Resend Verification Link'}
                                </button>
                            </form>

                            <div className="mt-6">
                                <Link to="/login" className="text-sm text-gc-blue hover:underline font-semibold">
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
