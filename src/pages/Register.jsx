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
      case 'student': return 'bg-gc-blue';
      case 'freelancer': return 'bg-emerald-500';
      case 'admin': return 'bg-gc-blue';
      default: return 'bg-gc-blue';
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
            <h2 className="text-3xl font-bold text-gc-navy mb-2">
              {registeredSuccess ? 'Check Your Inbox 📩' : 'Create Account'}
            </h2>
            {!registeredSuccess && <p className="text-gc-muted">Join as a {formData.role}</p>}
          </div>

          {registeredSuccess ? (
            <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-gc-soft text-gc-blue rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner border border-gc-light">
                ✉️
              </div>
              <div className="space-y-2">
                <p className="text-gc-navy text-base font-semibold">
                  Verification email sent to <span className="text-gc-blue underline">{formData.email}</span>
                </p>
                <p className="text-gc-muted text-xs leading-relaxed">
                  Please click the link inside the verification email to activate your account before logging in.
                </p>
              </div>

              <div className="pt-4">
                <Link
                  to="/login"
                  className="block w-full py-3.5 px-6 bg-gc-blue hover:bg-gc-navy text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm text-center"
                >
                  Proceed to Login →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gc-navy mb-2 font-medium">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue"
                    placeholder="johndoe"
                  />
                </div>

                <div>
                  <label className="block text-gc-navy mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-gc-navy mb-2 font-medium">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy focus:outline-none focus:ring-2 focus:ring-gc-blue"
                  >
                    <option value="student" className="bg-white text-gc-navy">Student (Post Projects)</option>
                    <option value="freelancer" className="bg-white text-gc-navy">Freelancer (Work on Projects)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gc-navy mb-2 font-medium">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-gc-navy mb-2 font-medium">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gc-border rounded-xl text-gc-navy placeholder-gc-muted focus:outline-none focus:ring-2 focus:ring-gc-blue"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${getRoleColor()} text-white py-3 px-6 rounded-xl hover:opacity-90 transition font-semibold shadow-lg disabled:opacity-50`}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gc-muted">
                  Already have an account?{' '}
                  <Link to="/login" className="text-gc-blue hover:text-gc-navy font-semibold">
                    Login
                  </Link>
                </p>
              </div>

              <div className="mt-6 text-center">
                <Link to="/" className="text-gc-muted hover:text-gc-navy text-sm">
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
