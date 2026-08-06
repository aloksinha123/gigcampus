import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-lg w-full text-center space-y-8 relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30">
                    <span>🔍 404 Error Page</span>
                </div>

                <h1 className="text-8xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500">
                    404
                </h1>

                <div className="space-y-3">
                    <h2 className="text-2xl font-black tracking-tight uppercase">
                        Page <span className="text-purple-400">Not Found</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                        The page or gig project link you are trying to access does not exist or has been moved.
                    </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="/"
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/50 hover:scale-105 transition text-center"
                    >
                        Back to Home
                    </a>
                    <a
                        href="/marketplace"
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest transition text-center border border-slate-700"
                    >
                        Explore Marketplace
                    </a>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
