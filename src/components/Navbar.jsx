import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = ({ variant = 'light', className = '' }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Base classes
    let navBaseClasses, brandClasses, linkClasses, mobileMenuBg, mobileTextClasses;

    if (variant === 'transparent') {
        navBaseClasses = 'relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20';
        brandClasses = 'text-white';
        linkClasses = 'text-white/80 hover:text-white hover:bg-white/10';
        mobileMenuBg = 'bg-slate-900 border-t border-white/10';
        mobileTextClasses = 'text-white/60';
    } else if (variant === 'dark') {
        navBaseClasses = 'sticky top-0 z-50 bg-[#1e293b]/90 backdrop-blur-xl border-b border-slate-800';
        brandClasses = 'text-white';
        linkClasses = 'text-slate-300 hover:text-white hover:bg-white/10';
        mobileMenuBg = 'bg-[#0f172a] border-t border-slate-800';
        mobileTextClasses = 'text-slate-400';
    } else {
        navBaseClasses = 'sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100';
        brandClasses = 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent';
        linkClasses = 'text-gray-600 hover:text-blue-600 hover:bg-gray-50';
        mobileMenuBg = 'bg-white border-t border-gray-100 shadow-lg';
        mobileTextClasses = 'text-gray-500';
    }

    // Navigation Links Logic
    const getLinks = () => {
        if (!isAuthenticated) {
            return [
                { name: 'Browse Projects', path: '/projects' },
                { name: 'Portfolios', path: '/portfolio' },
                { name: 'Login', path: '/login', isButton: false },
                { name: 'Sign Up', path: '/register', isButton: true, variant: 'primary' }
            ];
        }

        const commonLinks = [
            { name: 'Marketplace', path: '/projects' },
            { name: 'Messages', path: '/messages' },
        ];

        if (user?.role === 'student') {
            return [
                { name: 'Dashboard', path: '/student/dashboard' },
                ...commonLinks,
                { name: 'My Projects', path: '/my-projects' },
                { name: 'Profile', path: '/profile' },
            ];
        }

        if (user?.role === 'freelancer') {
            return [
                { name: 'Dashboard', path: '/freelancer/dashboard' },
                ...commonLinks,
                { name: 'My Projects', path: '/my-projects' },
                { name: 'Profile', path: '/profile' },
            ];
        }

        if (user?.role === 'admin') {
            return [
                { name: 'Dashboard', path: '/admin' },
                { name: 'Users', path: '/admin/users' },
                { name: 'Projects', path: '/admin/projects' },
                { name: 'Disputes', path: '/admin/disputes' },
            ];
        }

        return commonLinks;
    };

    const links = getLinks();

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
    };

    return (
        <nav className={`${navBaseClasses} ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    {/* Logo */}
                    <Link to="/" className={`text-2xl font-black tracking-tight ${brandClasses} flex items-center gap-2`}>
                        <span className="text-3xl">🚀</span> GigCampus
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {links.map((link) => (
                            link.isButton ? (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-xl hover:from-blue-600 hover:to-purple-700 transition font-bold shadow-lg shadow-blue-500/20"
                                >
                                    {link.name}
                                </Link>
                            ) : (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`font-medium transition-colors ${linkClasses}`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}

                        {isAuthenticated && (
                            <>
                                <NotificationBell />
                                <Link
                                    to="/notification-settings"
                                    className={`font-medium transition-colors ${variant === 'transparent' || variant === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Settings ⚙️
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className={`font-medium transition-colors ${variant === 'transparent' || variant === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-gray-500 hover:text-red-600'}`}
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        {isAuthenticated && <NotificationBell />}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2 rounded-lg transition-colors ${variant === 'transparent' || variant === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {isMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className={`md:hidden absolute top-full left-0 right-0 ${mobileMenuBg} backdrop-blur-xl animate-fade-in-down`}>
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        {isAuthenticated && (
                            <div className="px-4 py-3 border-b border-gray-100/10 mb-2">
                                <p className={`text-sm font-medium ${mobileTextClasses}`}>Signed in as</p>
                                <p className={`truncate font-bold ${variant === 'transparent' || variant === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.username || 'User'}</p>
                            </div>
                        )}

                        {links.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${linkClasses}`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        {isAuthenticated && (
                            <button
                                onClick={handleLogout}
                                className={`w-full text-left block px-4 py-3 rounded-xl text-base font-medium transition-colors ${variant === 'transparent' || variant === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
