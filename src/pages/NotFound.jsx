import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gc-near text-gc-navy flex items-center justify-center p-6 relative overflow-hidden">

            <div className="max-w-lg w-full text-center space-y-8 relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gc-soft text-gc-blue rounded-full text-xs font-bold border border-gc-light">
                    <span>404 Error Page</span>
                </div>

                <h1 className="text-8xl font-black tracking-tighter italic uppercase text-gc-navy">
                    404
                </h1>

                <div className="space-y-3">
                    <h2 className="text-2xl font-black tracking-tight uppercase">
                        Page <span className="text-gc-blue">Not Found</span>
                    </h2>
                    <p className="text-xs text-gc-muted font-medium max-w-sm mx-auto leading-relaxed">
                        The page or gig project link you are trying to access does not exist or has been moved.
                    </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="/"
                        className="px-8 py-4 bg-gc-blue hover:bg-gc-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gc-blue/20 hover:scale-105 transition text-center"
                    >
                        Back to Home
                    </a>
                    <a
                        href="/marketplace"
                        className="px-8 py-4 bg-gc-surface hover:bg-gc-border text-gc-navy rounded-2xl font-bold text-xs uppercase tracking-widest transition text-center border border-gc-border"
                    >
                        Explore Marketplace
                    </a>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
