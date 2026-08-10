import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = ({ variant = 'light', className = '' }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    let navBaseClasses, brandClasses, linkClasses, mobileMenuBg, mobileTextClasses;

    if (variant === 'transparent') {
        navBaseClasses = 'relative z-50 bg-gc-navy/20 backdrop-blur-md border-b border-white/10';
        brandClasses = 'text-white';
        linkClasses = 'text-white/70 hover:text-white hover:bg-white/10';
        mobileMenuBg = 'bg-gc-navy/95 border-t border-white/10';
        mobileTextClasses = 'text-white/50';
    } else if (variant === 'dark') {
        navBaseClasses = 'sticky top-0 z-50 bg-gc-navy/95 backdrop-blur-xl border-b border-gc-navy/30';
        brandClasses = 'text-white';
        linkClasses = 'text-slate-300 hover:text-white hover:bg-white/10';
        mobileMenuBg = 'bg-gc-navy border-t border-gc-navy/30';
        mobileTextClasses = 'text-slate-400';
    } else {
        navBaseClasses = 'sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-gc border-b border-gc-border';
        brandClasses = 'text-gc-navy';
        linkClasses = 'text-gc-slate hover:text-gc-blue hover:bg-gc-soft/50';
        mobileMenuBg = 'bg-white border-t border-gc-border shadow-gc-lg';
        mobileTextClasses = 'text-gc-muted';
    }

    const getLinks = () => {
        if (!isAuthenticated) {
            return [
                { name: 'Browse Projects', path: '/projects' },
                { name: 'Search', path: '/search' },
                { name: 'Portfolios', path: '/portfolio' },
                { name: 'Login', path: '/login', isButton: false },
                { name: 'Sign Up', path: '/register', isButton: true }
            ];
        }

        const commonLinks = [
            { name: 'Marketplace', path: '/projects' },
            { name: 'Search', path: '/search' },
            { name: 'Messages', path: '/messages' },
        ];

        if (user?.role === 'student') {
            return [
                { name: 'Dashboard', path: '/student/dashboard' },
                ...commonLinks,
                { name: 'My Projects', path: '/my-projects' },
                { name: 'Wallet', path: '/wallet' },
                { name: 'Profile', path: '/profile' },
            ];
        }

        if (user?.role === 'freelancer') {
            return [
                { name: 'Dashboard', path: '/freelancer/dashboard' },
                ...commonLinks,
                { name: 'My Projects', path: '/my-projects' },
                { name: 'Wallet', path: '/wallet' },
                { name: 'Profile', path: '/profile' },
            ];
        }

        if (user?.role === 'admin') {
            return [
                { name: 'Dashboard', path: '/admin' },
                { name: 'Users', path: '/admin/users' },
                { name: 'Projects', path: '/admin/projects' },
                { name: 'Disputes', path: '/admin/disputes' },
                { name: 'Search', path: '/search' }
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
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className={`flex items-center gap-2.5 ${brandClasses}`}>
                        <div className="w-8 h-8 bg-gc-blue rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight">GigCampus</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-1">
                        {links.map((link) => (
                            link.isButton ? (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className="gc-btn-primary ml-2"
                                >
                                    {link.name}
                                </Link>
                            ) : (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-3 py-2 rounded-gc text-sm font-medium transition-all ${linkClasses}`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}

                        {isAuthenticated && (
                            <>
                                <div className="w-px h-6 bg-gc-border mx-2"></div>
                                <NotificationBell />
                                <Link
                                    to="/notification-settings"
                                    className={`p-2 rounded-gc transition-all ${variant === 'transparent' || variant === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-gc-muted hover:text-gc-slate hover:bg-gc-surface'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className={`px-3 py-2 rounded-gc text-sm font-medium transition-all ${variant === 'transparent' || variant === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-gc-muted hover:text-gc-slate hover:bg-gc-surface'}`}
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-2">
                        {isAuthenticated && <NotificationBell />}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle navigation menu"
                            className={`p-2 rounded-gc transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${variant === 'transparent' || variant === 'dark' ? 'text-white hover:bg-white/10' : 'text-gc-slate hover:bg-gc-surface'}`}
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
                <div className={`md:hidden absolute top-full left-0 right-0 ${mobileMenuBg} backdrop-blur-xl shadow-gc-xl z-50 border-b overflow-y-auto max-h-[calc(100vh-4rem)]`}>
                    <div className="px-4 py-4 space-y-1">
                        {isAuthenticated && (
                            <div className="px-4 py-3 border-b border-gc-border/30 mb-2 flex items-center justify-between">
                                <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${mobileTextClasses}`}>Signed in as</p>
                                    <p className={`truncate font-semibold text-sm ${variant === 'transparent' || variant === 'dark' ? 'text-white' : 'text-gc-navy'}`}>{user?.username || 'User'}</p>
                                </div>
                                <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-gc-blue/10 text-gc-blue border border-gc-blue/20">
                                    {user?.role}
                                </span>
                            </div>
                        )}

                        {links.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`block px-4 py-3 rounded-gc text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-gc-blue text-white shadow-gc'
                                            : link.isButton
                                            ? 'bg-gc-blue text-white text-center mt-2'
                                            : `${linkClasses}`
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}

                        {isAuthenticated && (
                            <>
                                <Link
                                    to="/notification-settings"
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`block px-4 py-3 rounded-gc text-sm font-medium transition-all ${
                                        location.pathname === '/notification-settings'
                                            ? 'bg-gc-blue text-white'
                                            : `${linkClasses}`
                                    }`}
                                >
                                    Settings
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className={`w-full text-left block px-4 py-3 rounded-gc text-sm font-medium transition-all min-h-[44px] ${variant === 'transparent' || variant === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-gc-muted hover:text-gc-slate hover:bg-gc-surface'}`}
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
