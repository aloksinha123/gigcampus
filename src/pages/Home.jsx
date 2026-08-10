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

    const handleAdminAccess = () => {
        if (isAuthenticated && user?.role === 'admin') {
            navigate('/admin');
            return;
        }
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gc-white">
            <Navbar variant="light" />

            {/* SECTION 1 - HERO */}
            <section className="relative bg-gc-white overflow-hidden">
                {/* Dot grid pattern */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #90E0EF 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4 }} />
                <div className="absolute inset-0 bg-gradient-to-br from-gc-white via-gc-soft/50 to-gc-white" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Text */}
                        <div>
                            <div className="inline-flex items-center gap-2 bg-gc-soft border border-gc-light rounded-full px-4 py-1.5 mb-6">
                                <svg className="w-4 h-4 text-gc-blue" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-sm font-medium text-gc-navy">The campus freelance marketplace</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gc-navy leading-tight mb-6">
                                Where Campus Talent
                                <span className="block gc-gradient-text">Meets Real Work</span>
                            </h1>

                            <p className="text-lg text-gc-slate max-w-xl mb-8 leading-relaxed">
                                Connect with skilled freelancers on campus. Post projects, hire talent, and build your portfolio with secure payments and real-time collaboration.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                                <Link to="/projects" className="gc-btn-primary text-center min-h-[44px] flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Explore Gigs
                                </Link>
                                <Link to="/register" className="gc-btn-secondary text-center min-h-[44px] flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Post a Project
                                </Link>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <span className="inline-flex items-center gap-1.5 bg-gc-soft/80 text-gc-navy text-sm font-medium px-3 py-1.5 rounded-full border border-gc-light">
                                    <svg className="w-4 h-4 text-gc-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Secure Escrow
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-gc-soft/80 text-gc-navy text-sm font-medium px-3 py-1.5 rounded-full border border-gc-light">
                                    <svg className="w-4 h-4 text-gc-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Real-time Chat
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-gc-soft/80 text-gc-navy text-sm font-medium px-3 py-1.5 rounded-full border border-gc-light">
                                    <svg className="w-4 h-4 text-gc-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    Reputation System
                                </span>
                            </div>
                        </div>

                        {/* Right: Product preview composition */}
                        <div className="relative hidden lg:block">
                            <div className="relative w-full h-[480px]">
                                {/* Card 1: Project listing */}
                                <div className="absolute top-0 left-4 w-72 bg-white rounded-xl border border-gc-border p-5 shadow-gc-lg transition hover:-translate-y-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="gc-badge bg-emerald-100 text-emerald-700 text-xs">Open</span>
                                        <span className="text-xs text-gc-muted">2h ago</span>
                                    </div>
                                    <h4 className="font-semibold text-gc-navy mb-1">React Dashboard Redesign</h4>
                                    <p className="text-sm text-gc-slate mb-3">Looking for a skilled frontend developer...</p>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gc-blue">$450</span>
                                        <span className="text-xs text-gc-muted">12 proposals</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="gc-badge bg-gc-soft text-gc-navy text-xs">React</span>
                                        <span className="gc-badge bg-gc-soft text-gc-navy text-xs">Tailwind</span>
                                        <span className="gc-badge bg-gc-soft text-gc-navy text-xs">TypeScript</span>
                                    </div>
                                </div>

                                {/* Card 2: Freelancer profile */}
                                <div className="absolute top-16 right-0 w-64 bg-white rounded-xl border border-gc-border p-5 shadow-gc-lg transition hover:-translate-y-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-gc-blue rounded-full flex items-center justify-center text-white font-bold text-sm">SA</div>
                                        <div>
                                            <p className="font-semibold text-gc-navy text-sm">Sarah Ahmed</p>
                                            <p className="text-xs text-gc-muted">Frontend Developer</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mb-3">
                                        {[1,2,3,4,5].map(i => (
                                            <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                        <span className="text-xs text-gc-muted ml-1">4.9</span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-gc-slate">
                                        <span><strong className="text-gc-navy">23</strong> projects</span>
                                        <span><strong className="text-gc-navy">98%</strong> success</span>
                                    </div>
                                </div>

                                {/* Card 3: Payment released */}
                                <div className="absolute bottom-20 left-0 w-60 bg-white rounded-xl border border-gc-border p-5 shadow-gc-lg transition hover:-translate-y-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-gc-navy">Payment Released</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gc-blue mb-2">$1,250.00</p>
                                    <div className="w-full bg-gc-soft rounded-full h-2 mb-1">
                                        <div className="bg-gc-blue h-2 rounded-full" style={{ width: '75%' }} />
                                    </div>
                                    <p className="text-xs text-gc-muted">Milestone 3 of 4</p>
                                </div>

                                {/* Card 4: Review */}
                                <div className="absolute bottom-0 right-8 w-64 bg-white rounded-xl border border-gc-border p-5 shadow-gc-lg transition hover:-translate-y-1">
                                    <div className="flex items-center gap-1 mb-2">
                                        {[1,2,3,4,5].map(i => (
                                            <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gc-slate italic mb-3">"Excellent work! Delivered ahead of schedule and exceeded expectations."</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-gc-cyan rounded-full flex items-center justify-center text-white text-xs font-bold">MK</div>
                                        <span className="text-xs text-gc-navy font-medium">Marcus K.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2 - STATS */}
            <section className="bg-gc-white py-16 border-t border-gc-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '5,000+', label: 'Active Users' },
                            { value: '2,500+', label: 'Projects Completed' },
                            { value: '100+', label: 'Universities' },
                            { value: '98%', label: 'Satisfaction Rate' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <p className="text-3xl sm:text-4xl font-bold text-gc-navy mb-1">{stat.value}</p>
                                <p className="text-sm text-gc-muted font-medium">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 3 - HOW IT WORKS */}
            <section className="bg-gc-soft py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gc-navy mb-4">How It Works</h2>
                        <p className="text-gc-slate max-w-2xl mx-auto">From discovery to payment, GigCampus makes campus freelancing simple and secure.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                        {[
                            { step: 1, title: 'Discover', desc: 'Browse projects or post your own. Find the perfect match for your skills or needs.' },
                            { step: 2, title: 'Connect', desc: 'Send proposals, negotiate terms, and hire the right talent for your project.' },
                            { step: 3, title: 'Collaborate', desc: 'Work together with real-time messaging, file sharing, and milestone tracking.' },
                            { step: 4, title: 'Get Paid', desc: 'Secure escrow payments are released when milestones are approved.' },
                            { step: 5, title: 'Build Trust', desc: 'Earn reviews and ratings to build your reputation on campus.' },
                        ].map((item) => (
                            <div key={item.step} className="text-center">
                                <div className="w-12 h-12 bg-gc-navy rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-white font-bold text-lg">{item.step}</span>
                                </div>
                                <h3 className="font-semibold text-gc-navy mb-2">{item.title}</h3>
                                <p className="text-sm text-gc-slate leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 4 - CORE FEATURES */}
            <section className="bg-gc-near py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gc-navy mb-4">Core Features</h2>
                        <p className="text-gc-slate max-w-2xl mx-auto">Everything you need to succeed in the campus freelance economy.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: 'Gig Marketplace', desc: 'Browse and post projects across dozens of categories tailored for campus life.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
                            { title: 'Project Workspace', desc: 'Dedicated workspace for each project with task boards, files, and progress tracking.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg> },
                            { title: 'Proposals & Hiring', desc: 'Submit competitive proposals or review bids to find the best freelancer for your project.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
                            { title: 'Milestone Payments', desc: 'Break projects into milestones with secure escrow funding and automated releases.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                            { title: 'Wallet & Withdrawals', desc: 'Manage your earnings, track transactions, and withdraw funds to your bank account.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
                            { title: 'Reviews & Reputation', desc: 'Build credibility with verified reviews and a transparent reputation score.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
                            { title: 'Real-Time Messaging', desc: 'Chat instantly with clients and freelancers. Share files and collaborate in real time.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
                            { title: 'Portfolios', desc: 'Showcase your best work with a professional portfolio that impresses potential clients.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                            { title: 'Advanced Search', desc: 'Find exactly what you need with filters for skills, budget, timeline, and ratings.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
                        ].map((feature) => (
                            <div key={feature.title} className="bg-white rounded-gc-lg border border-gc-border p-6 hover:shadow-gc-md hover:border-gc-light transition-all duration-200 group">
                                <div className="w-12 h-12 bg-gc-soft rounded-xl flex items-center justify-center mb-4 text-gc-blue group-hover:bg-gc-blue group-hover:text-white transition-all duration-200">
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold text-gc-navy mb-2">{feature.title}</h3>
                                <p className="text-sm text-gc-slate leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5 - PRODUCT SHOWCASE */}
            <section className="bg-gc-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Marketplace mockup */}
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-gc-navy mb-4">Your Campus Marketplace</h2>
                            <p className="text-gc-slate mb-8 max-w-lg">Browse projects, submit proposals, and manage everything from a single dashboard built for campus freelancers.</p>
                            <div className="space-y-4">
                                {/* Mock project 1 */}
                                <div className="bg-white rounded-gc-lg border border-gc-border p-5 shadow-gc hover:shadow-gc-md transition">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gc-navy">Mobile App UI Design</h4>
                                        <span className="gc-badge bg-emerald-100 text-emerald-700 text-xs">Open</span>
                                    </div>
                                    <p className="text-sm text-gc-slate mb-3">Looking for a UI/UX designer to create wireframes and high-fidelity mockups for a campus event app.</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gc-blue">$300</span>
                                        <span className="text-xs text-gc-muted">8 proposals</span>
                                    </div>
                                </div>
                                {/* Mock project 2 */}
                                <div className="bg-white rounded-gc-lg border border-gc-border p-5 shadow-gc hover:shadow-gc-md transition">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gc-navy">Python Data Analysis</h4>
                                        <span className="gc-badge bg-amber-100 text-amber-700 text-xs">In Progress</span>
                                    </div>
                                    <p className="text-sm text-gc-slate mb-3">Need help cleaning and analyzing survey data from 500+ respondents using pandas and matplotlib.</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gc-blue">$200</span>
                                        <span className="text-xs text-gc-muted">Milestone 2/3</span>
                                    </div>
                                </div>
                                {/* Mock project 3 */}
                                <div className="bg-white rounded-gc-lg border border-gc-border p-5 shadow-gc hover:shadow-gc-md transition">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gc-navy">WordPress Blog Setup</h4>
                                        <span className="gc-badge bg-gc-soft text-gc-navy text-xs">Completed</span>
                                    </div>
                                    <p className="text-sm text-gc-slate mb-3">Full WordPress installation with custom theme, SEO plugins, and initial content for a campus blog.</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gc-blue">$150</span>
                                        <span className="text-xs text-gc-muted">Released</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Wallet + Reviews */}
                        <div className="space-y-6">
                            {/* Wallet card */}
                            <div className="bg-gc-navy rounded-gc-xl p-8 text-white">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold">Your Wallet</h3>
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-gc-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-4xl font-bold mb-1">$3,420.00</p>
                                <p className="text-gc-light text-sm mb-6">Available Balance</p>
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-white text-gc-navy font-semibold py-2.5 rounded-gc text-sm hover:bg-gc-soft transition">Withdraw</button>
                                    <button className="flex-1 border border-white/30 text-white font-semibold py-2.5 rounded-gc text-sm hover:bg-white/10 transition">History</button>
                                </div>
                            </div>

                            {/* Reviews card */}
                            <div className="bg-white rounded-gc-xl border border-gc-border p-8 shadow-gc">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-gc-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gc-navy">Recent Reviews</h3>
                                </div>
                                <div className="flex items-center gap-1 mb-3">
                                    {[1,2,3,4,5].map(i => (
                                        <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                    <span className="text-sm text-gc-muted ml-1">4.9 / 5.0</span>
                                </div>
                                <p className="text-gc-slate text-sm italic mb-4">"Incredible platform for campus freelancers. The escrow system gives me peace of mind on every project."</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gc-cyan rounded-full flex items-center justify-center text-white text-xs font-bold">JR</div>
                                    <div>
                                        <p className="text-sm font-medium text-gc-navy">Jamie Rivera</p>
                                        <p className="text-xs text-gc-muted">Computer Science, Year 3</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 6 - REVIEWS / SOCIAL PROOF */}
            <section className="bg-gc-soft py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gc-navy mb-4">What Our Users Say</h2>
                        <p className="text-gc-slate max-w-2xl mx-auto">Trusted by thousands of students and freelancers across campus.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { initials: 'AL', name: 'Amara Lewis', role: 'Freelance Designer, Year 2', rating: 5, text: 'GigCampus changed how I find work on campus. I landed three clients in my first week and the payment system is seamless.' },
                            { initials: 'DK', name: 'Daniel Kim', role: 'Student, Computer Science', rating: 5, text: 'Posted a project and had five qualified proposals within hours. The quality of talent here is impressive for campus-level work.' },
                            { initials: 'NP', name: 'Nadia Patel', role: 'Freelance Developer, Year 3', rating: 5, text: 'The milestone payment system keeps everything transparent. I feel confident delivering knowing escrow has my back.' },
                        ].map((review) => (
                            <div key={review.name} className="bg-white rounded-gc-xl border border-gc-border p-8 shadow-gc hover:shadow-gc-md transition">
                                <div className="flex items-center gap-1 mb-4">
                                    {[1,2,3,4,5].map(i => (
                                        <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-gc-slate text-sm leading-relaxed mb-6">"{review.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gc-blue rounded-full flex items-center justify-center text-white font-bold text-sm">{review.initials}</div>
                                    <div>
                                        <p className="font-semibold text-gc-navy text-sm">{review.name}</p>
                                        <p className="text-xs text-gc-muted">{review.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 7 - CATEGORIES */}
            <section className="bg-gc-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gc-navy mb-4">Popular Categories</h2>
                        <p className="text-gc-slate max-w-2xl mx-auto">Find talent or work in the most in-demand fields on campus.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: 'Web Development', desc: 'Frontend, backend, and full-stack projects using modern frameworks.', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
                            { title: 'UI/UX Design', desc: 'Wireframes, prototypes, and high-fidelity designs for apps and websites.', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
                            { title: 'Data Science', desc: 'Data analysis, machine learning, visualization, and statistical modeling.', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
                            { title: 'Content Writing', desc: 'Blog posts, copywriting, technical writing, and editing services.', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
                            { title: 'Marketing', desc: 'Social media, SEO, email campaigns, and digital marketing strategy.', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg> },
                            { title: 'Mobile Development', desc: 'iOS, Android, and cross-platform app development with React Native and Flutter.', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
                        ].map((category) => (
                            <div key={category.title} className="bg-white rounded-gc-lg border border-gc-border p-6 hover:shadow-gc-md hover:border-gc-light transition-all duration-200 cursor-pointer group">
                                <div className="w-14 h-14 bg-gc-soft rounded-xl flex items-center justify-center mb-4 text-gc-blue group-hover:bg-gc-blue group-hover:text-white transition-all duration-200">
                                    {category.icon}
                                </div>
                                <h3 className="font-semibold text-gc-navy mb-2">{category.title}</h3>
                                <p className="text-sm text-gc-slate leading-relaxed">{category.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 8 - FINAL CTA */}
            <section className="bg-gc-navy py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Your Next Opportunity Starts Here</h2>
                    <p className="text-gc-light max-w-xl mx-auto mb-8">Join thousands of campus freelancers and students building the future of work.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/projects" className="bg-white text-gc-navy font-semibold px-8 py-3.5 rounded-gc hover:bg-gc-soft transition text-center min-h-[44px] flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Explore Gigs
                        </Link>
                        <Link to="/register" className="border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-gc hover:bg-white/10 transition text-center min-h-[44px] flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Post a Project
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-gc-navy border-t border-white/10 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-gc-blue rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-white font-bold text-lg">GigCampus</span>
                            </div>
                            <p className="text-gc-light text-sm">The campus freelance marketplace connecting talent with opportunity.</p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-3 text-sm">Marketplace</h4>
                            <ul className="space-y-2">
                                <li><Link to="/projects" className="text-gc-light hover:text-white text-sm transition">Browse Projects</Link></li>
                                <li><Link to="/search" className="text-gc-light hover:text-white text-sm transition">Search Freelancers</Link></li>
                                <li><Link to="/portfolio" className="text-gc-light hover:text-white text-sm transition">Portfolios</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-3 text-sm">Account</h4>
                            <ul className="space-y-2">
                                <li><Link to="/login" className="text-gc-light hover:text-white text-sm transition">Login</Link></li>
                                <li><Link to="/register" className="text-gc-light hover:text-white text-sm transition">Sign Up</Link></li>
                                <li><Link to="/messages" className="text-gc-light hover:text-white text-sm transition">Messages</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-3 text-sm">Company</h4>
                            <ul className="space-y-2">
                                <li><Link to="/projects" className="text-gc-light hover:text-white text-sm transition">About</Link></li>
                                <li><Link to="/projects" className="text-gc-light hover:text-white text-sm transition">Contact</Link></li>
                                <li><Link to="/projects" className="text-gc-light hover:text-white text-sm transition">Privacy Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/10 mt-8 pt-8 text-center">
                        <p className="text-gc-light text-sm">&copy; 2025 GigCampus. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
