import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Register = () => {
  const location = useLocation();
  const { register } = useAuth();
  const { success, error } = useNotification();

  const publicRoles = ['student', 'freelancer'];
  const routeRole = location.state?.role;
  const initialRole = publicRoles.includes(routeRole) ? routeRole : 'student';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: initialRole
  });
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      error('Passwords do not match');
      return;
    }

    setLoading(true);

    const registerData = { ...formData };
    delete registerData.confirmPassword;
    registerData.role = publicRoles.includes(registerData.role) ? registerData.role : 'student';
    const result = await register(registerData);

    if (result.success) {
      setRegisteredSuccess(true);
      success('Account created! Please check your email to verify your account.');
    } else {
      error(result.error);
    }

    setLoading(false);
  };

  const getRoleColor = () => {
    switch (formData.role) {
      case 'student': return 'from-blue-500 to-cyan-600';
      case 'freelancer': return 'from-emerald-500 to-green-600';
      case 'admin': return 'from-purple-500 to-pink-600';
      default: return 'from-blue-500 to-purple-600';
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
            <h2 className="text-3xl font-bold text-white mb-2">
              {registeredSuccess ? 'Check Your Inbox 📩' : 'Create Account'}
            </h2>
            {!registeredSuccess && <p className="text-white/70">Join as a {formData.role}</p>}
          </div>

          {registeredSuccess ? (
            <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-blue-500/20 text-blue-300 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-blue-400/30">
                ✉️
              </div>
              <div className="space-y-2">
                <p className="text-white text-base font-semibold">
                  Verification email sent to <span className="text-blue-300 underline">{formData.email}</span>
                </p>
                <p className="text-white/70 text-xs leading-relaxed">
                  Please click the link inside the verification email to activate your account before logging in.
                </p>
              </div>

              <div className="pt-4">
                <Link
                  to="/login"
                  className="block w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                >
                  Proceed to Login →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="johndoe"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2 font-medium">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student" className="bg-slate-900 text-white">Student (Post Projects)</option>
                    <option value="freelancer" className="bg-slate-900 text-white">Freelancer (Work on Projects)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/80 mb-2 font-medium">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2 font-medium">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r ${getRoleColor()} text-white py-3 px-6 rounded-xl hover:opacity-90 transition font-semibold shadow-lg disabled:opacity-50`}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-white/70">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
                    Login
                  </Link>
                </p>
              </div>

              <div className="mt-6 text-center">
                <Link to="/" className="text-white/60 hover:text-white/80 text-sm">
                  ← Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
