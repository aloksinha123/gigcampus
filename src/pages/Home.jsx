import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Home = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const isRoleSelectionEnabled = import.meta.env.VITE_ENABLE_ROLE_SELECTION === 'true';
        if (isAuthenticated && !isRoleSelectionEnabled) {
            const role = user?.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'freelancer') navigate('/freelancer/dashboard');
            else navigate('/student/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    const handleGetStarted = (role) => {
        if (isAuthenticated) {
            const isRoleSelectionEnabled = import.meta.env.VITE_ENABLE_ROLE_SELECTION === 'true';
            const targetRole = isRoleSelectionEnabled ? role : (user?.role || role);
            if (targetRole === 'admin') navigate('/admin');
            else if (targetRole === 'freelancer') navigate('/freelancer/dashboard');
            else navigate('/student/dashboard');
        } else {
            navigate('/register', { state: { role } });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Navbar */}
            {/* Navbar */}
            <Navbar variant="transparent" />

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl mb-6">
                            <span className="text-5xl">🎯</span>
                        </div>
                    </div>
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
                        Your Campus
                        <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Freelance Hub
                        </span>
                    </h1>
                    <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Connect students with talented freelancers. Post projects, submit bids, and build your future in our thriving marketplace with secure payments and real-time collaboration.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/projects" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-8 py-4 rounded-xl hover:from-blue-600 hover:to-cyan-700 transition font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                            Browse Projects
                        </Link>
                        <Link to="/register" className="border-2 border-white/30 text-white px-8 py-4 rounded-xl hover:bg-white/10 transition font-semibold text-lg backdrop-blur-sm">
                            Get Started Free
                        </Link>
                    </div>
                </div>

                {/* User Type Cards */}
                <div className="mb-20">
                    <h2 className="text-4xl font-bold text-center text-white mb-12">Choose Your Path</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Student Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition duration-300 border border-white/20 hover:border-blue-400/50 group hover:-translate-y-2 transform">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition duration-300">
                                    <span className="text-4xl">🎓</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Student</h3>
                                <p className="text-white/80 mb-8 leading-relaxed">
                                    Post projects, hire talented freelancers, and bring your ideas to life with affordable, quality work.
                                </p>
                                <ul className="text-left text-white/70 mb-8 space-y-2">
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Post unlimited projects</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Review competitive bids</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Secure payment escrow</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Real-time chat</li>
                                </ul>
                                <button
                                    onClick={() => handleGetStarted('student')}
                                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-xl hover:from-blue-600 hover:to-cyan-700 transition font-semibold shadow-lg"
                                >
                                    Start as Student
                                </button>
                            </div>
                        </div>

                        {/* Freelancer Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition duration-300 border border-white/20 hover:border-emerald-400/50 group hover:-translate-y-2 transform">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition duration-300">
                                    <span className="text-4xl">💼</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Freelancer</h3>
                                <p className="text-white/80 mb-8 leading-relaxed">
                                    Find projects, showcase your skills, and earn money by completing tasks for students.
                                </p>
                                <ul className="text-left text-white/70 mb-8 space-y-2">
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Browse open projects</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Submit competitive bids</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Build your portfolio</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Earn reputation</li>
                                </ul>
                                <button
                                    onClick={() => handleGetStarted('freelancer')}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-green-700 transition font-semibold shadow-lg"
                                >
                                    Start as Freelancer
                                </button>
                            </div>
                        </div>

                        {/* Admin Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition duration-300 border border-white/20 hover:border-purple-400/50 group hover:-translate-y-2 transform">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition duration-300">
                                    <span className="text-4xl">👑</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Admin</h3>
                                <p className="text-white/80 mb-8 leading-relaxed">
                                    Manage the platform, resolve disputes, and ensure quality for all users.
                                </p>
                                <ul className="text-left text-white/70 mb-8 space-y-2">
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> User management</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Dispute resolution</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Platform oversight</li>
                                    <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Analytics dashboard</li>
                                </ul>
                                <button
                                    onClick={() => handleGetStarted('admin')}
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-700 transition font-semibold shadow-lg"
                                >
                                    Admin Access
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
                    <div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <div className="text-4xl font-bold text-white mb-2">5000+</div>
                        <div className="text-white/70 font-medium">Active Users</div>
                    </div>
                    <div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <div className="text-4xl font-bold text-white mb-2">2500+</div>
                        <div className="text-white/70 font-medium">Projects Completed</div>
                    </div>
                    <div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <div className="text-4xl font-bold text-white mb-2">100+</div>
                        <div className="text-white/70 font-medium">Universities</div>
                    </div>
                    <div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <div className="text-4xl font-bold text-white mb-2">98%</div>
                        <div className="text-white/70 font-medium">Satisfaction</div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-white/20 mb-20">
                    <h2 className="text-4xl font-bold text-center text-white mb-12">Platform Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="text-center group">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Secure Escrow</h3>
                            <p className="text-white/80">Payments held safely until project completion with automatic release</p>
                        </div>
                        <div className="text-center group">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Real-Time Chat</h3>
                            <p className="text-white/80">Instant messaging with file sharing for seamless collaboration</p>
                        </div>
                        <div className="text-center group">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Reputation System</h3>
                            <p className="text-white/80">Build trust with reviews and ratings that showcase your quality</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 bg-black/20 backdrop-blur-md text-white py-12 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            🚀 GigCampus
                        </h3>
                        <p className="text-white/80 mb-6">Your Campus Freelance Hub</p>
                        <div className="flex justify-center space-x-8 mb-6">
                            <Link to="/projects" className="text-white/60 hover:text-white transition">Projects</Link>
                            <Link to="/portfolio" className="text-white/60 hover:text-white transition">Portfolio</Link>
                            <a href="#" className="text-white/60 hover:text-white transition">About</a>
                            <a href="#" className="text-white/60 hover:text-white transition">Contact</a>
                        </div>
                        <p className="text-white/50 text-sm">&copy; 2024 GigCampus. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
