import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AddMoneyModal from '../components/AddMoneyModal';
import UserPresence from '../components/UserPresence';
import ActiveSessions from '../components/ActiveSessions';

const Profile = () => {
    const { user, logout, refreshUser } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Payment/Checkout states
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [walletAmount, setWalletAmount] = useState('');
    const [walletLoading, setWalletLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        if (refreshUser) {
            refreshUser();
        }
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await api.wallet.getTransactions();
            setTransactions(response.data);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        }
    };

    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
        fullName: '',
        bio: '',
        skills: '',
        university: '',
        location: '',
        phone: '',
        hourlyRate: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                username: user.username || '',
                email: user.email || '',
                fullName: user.profile?.fullName || '',
                bio: user.profile?.bio || '',
                skills: user.profile?.skills?.join(', ') || '',
                university: user.profile?.university || '',
                location: user.profile?.location || '',
                phone: user.profile?.phone || '',
                hourlyRate: user.profile?.hourlyRate || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setProfileData({
            ...profileData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const updateData = {
                username: profileData.username,
                email: profileData.email,
                profile: {
                    fullName: profileData.fullName,
                    bio: profileData.bio,
                    skills: profileData.skills ? profileData.skills.split(',').map(s => s.trim()) : [],
                    university: profileData.university,
                    location: profileData.location,
                    phone: profileData.phone,
                    hourlyRate: profileData.hourlyRate ? Number(profileData.hourlyRate) : undefined
                }
            };

            const response = await api.auth.updateProfile(updateData);
            setUser(response.data);
            success('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            error('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            error('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);
            await api.auth.updateProfile({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            success('Password updated successfully!');
            setShowPasswordModal(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!walletAmount || Number(walletAmount) <= 0) {
            error('Please enter a valid amount');
            return;
        }
        try {
            setWalletLoading(true);
            const response = await api.wallet.withdraw({ amount: Number(walletAmount) });
            success(response.data.message);
            setUser({ ...user, wallet: { ...user.wallet, balance: response.data.newBalance } });
            setShowWithdrawModal(false);
            setWalletAmount('');
            fetchTransactions();
        } catch (err) {
            error(err.response?.data?.message || 'Withdrawal failed');
        } finally {
            setWalletLoading(false);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!walletAmount || Number(walletAmount) <= 0) {
            error('Please enter a valid amount');
            return;
        }
        try {
            setWalletLoading(true);
            const response = await api.wallet.deposit({ amount: Number(walletAmount) });
            success(response.data.message);
            setUser({ ...user, wallet: { ...user.wallet, balance: response.data.newBalance } });
            setShowDepositModal(false);
            setWalletAmount('');
            fetchTransactions();
        } catch (err) {
            error(err.response?.data?.message || 'Deposit failed');
        } finally {
            setWalletLoading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset to original values
        if (user) {
            setProfileData({
                username: user.username || '',
                email: user.email || '',
                fullName: user.profile?.fullName || '',
                bio: user.profile?.bio || '',
                skills: user.profile?.skills?.join(', ') || '',
                university: user.profile?.university || '',
                location: user.profile?.location || '',
                phone: user.profile?.phone || '',
                hourlyRate: user.profile?.hourlyRate || ''
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">My Profile</h1>
                        <p className="text-gray-600">Manage your account settings and preferences</p>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
                        >
                            ✎ Edit Profile
                        </button>
                    )}
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-32"></div>
                    <div className="px-8 pb-8">
                        {/* Avatar */}
                        <div className="flex items-end -mt-16 mb-6">
                            <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-5xl border-4 border-white shadow-lg">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-6 mb-2">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {profileData.fullName || profileData.username}
                                    </h2>
                                    <UserPresence
                                        userId={user?._id}
                                        initialIsOnline={user?.isOnline}
                                        initialLastSeen={user?.lastSeen}
                                    />
                                </div>
                                <p className="text-gray-600">@{user?.username}</p>
                                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                    {user?.role?.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username *
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={profileData.username}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={profileData.fullName}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* University */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        University
                                    </label>
                                    <input
                                        type="text"
                                        name="university"
                                        value={profileData.university}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={profileData.location}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="City, Country"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Skills */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Skills (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        name="skills"
                                        value={profileData.skills}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="React, Node.js, Python, Design"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Bio */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        name="bio"
                                        value={profileData.bio}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        rows="4"
                                        placeholder="Tell us about yourself..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Hourly Rate (for freelancers) */}
                                {user?.role === 'freelancer' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hourly Rate ($)
                                        </label>
                                        <input
                                            type="number"
                                            name="hourlyRate"
                                            value={profileData.hourlyRate}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {isEditing && (
                                <div className="flex gap-4 mt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                                    >
                                        {loading ? 'Saving...' : '💾 Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        disabled={loading}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Account Settings */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Account Settings</h2>
                    <div className="space-y-4">
                        {/* Change Password */}
                        <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-gray-800">Password</h3>
                                <p className="text-sm text-gray-600">Change your account password</p>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                            >
                                Change Password
                            </button>
                        </div>

                        {/* Account Stats */}
                        <div className="grid grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{user?.reputation?.completedProjects || 0}</p>
                                <p className="text-sm text-gray-600">Completed Projects</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">
                                    {user?.reputation?.score?.toFixed(1) || '0.0'}
                                </p>
                                <p className="text-sm text-gray-600">Rating</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600">{user?.reputation?.totalReviews || 0}</p>
                                <p className="text-sm text-gray-600">Reviews</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">My Wallet</h2>
                            <p className="text-sm text-gray-500">Manage your funds and transactions</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 font-medium">Available Balance</p>
                            <p className="text-3xl font-black text-blue-600">₹{user?.wallet?.balance?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <button
                            onClick={() => setShowDepositModal(true)}
                            className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                            ➕ Deposit Funds
                        </button>
                        {user?.role === 'freelancer' && (
                            <button
                                onClick={() => setShowWithdrawModal(true)}
                                className="bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                                💰 Withdraw Funds
                            </button>
                        )}
                        {user?.role === 'student' && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-center text-xs text-gray-500 italic">
                                Use your balance to hire freelancers
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>📜</span> Transaction History
                        </h3>
                        {transactions.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-500 text-sm">No transactions yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-gray-500 border-b border-gray-100">
                                            <th className="pb-3 font-semibold">Date</th>
                                            <th className="pb-3 font-semibold">Type</th>
                                            <th className="pb-3 font-semibold">Amount</th>
                                            <th className="pb-3 font-semibold text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {transactions.map((tx) => {
                                            const isDeduction = tx.type === 'escrow_payment' || tx.type === 'withdrawal' || tx.amount < 0;
                                            return (
                                                <tr key={tx._id} className="group">
                                                    <td className="py-4 text-gray-600">
                                                        {new Date(tx.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-4">
                                                        <span className="font-medium text-gray-800 capitalize">
                                                            {tx.type.replace('_', ' ')}
                                                        </span>
                                                        {tx.project && (
                                                            <p className="text-xs text-blue-500 truncate max-w-[150px]">
                                                                {tx.project.title}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className={`py-4 font-bold ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                                                        {isDeduction ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Sessions Section */}
                <div className="mb-6">
                    <ActiveSessions />
                </div>

                {/* Password Change Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-2xl font-bold mb-6">Change Password</h2>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                {/* ... existing password form ... */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        minLength="6"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm New Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        minLength="6"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition font-semibold"
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Money / Deposit Modal (Razorpay Integration) */}
                <AddMoneyModal
                    isOpen={showDepositModal}
                    onClose={() => {
                        setShowDepositModal(false);
                        if (refreshUser) refreshUser();
                        fetchTransactions();
                    }}
                />

                {/* Withdraw Modal */}
                {showWithdrawModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-2xl font-bold mb-2">Withdraw Funds</h2>
                            <p className="text-gray-500 mb-6 text-sm">Transfer your earnings to your bank account</p>
                            <form onSubmit={handleWithdraw} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Withdraw ($)</label>
                                    <input
                                        type="number"
                                        max={user?.wallet?.balance}
                                        value={walletAmount}
                                        onChange={(e) => setWalletAmount(e.target.value)}
                                        placeholder={`Max: $${user?.wallet?.balance}`}
                                        className="w-full px-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg text-xs text-green-700">
                                    💡 Withdrawal requests take 2-3 business days to process.
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={walletLoading}
                                        className="flex-1 bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 font-bold disabled:opacity-50"
                                    >
                                        {walletLoading ? 'Processing...' : 'Request Withdrawal'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowWithdrawModal(false)}
                                        className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl hover:bg-gray-200 font-bold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
