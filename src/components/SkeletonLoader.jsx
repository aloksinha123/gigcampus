import React from 'react';

export const CardSkeleton = () => (
    <div className="gc-card p-6 animate-pulse space-y-4">
        <div className="flex justify-between items-center">
            <div className="w-1/2 h-5 bg-gc-surface rounded-gc"></div>
            <div className="w-16 h-5 bg-gc-surface rounded-full"></div>
        </div>
        <div className="w-full h-12 bg-gc-surface rounded-gc"></div>
        <div className="flex justify-between items-center pt-2">
            <div className="w-1/4 h-8 bg-gc-surface rounded-gc"></div>
            <div className="w-1/4 h-8 bg-gc-soft rounded-gc"></div>
        </div>
    </div>
);

export const PageSkeleton = () => (
    <div className="min-h-screen bg-gc-near p-6 sm:p-12 space-y-6 animate-pulse max-w-6xl mx-auto">
        <div className="w-1/3 h-8 bg-gc-surface rounded-gc"></div>
        <div className="w-full h-40 bg-gc-surface rounded-gc-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
        </div>
    </div>
);

export default {
    CardSkeleton,
    PageSkeleton
};
