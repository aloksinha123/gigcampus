import React from 'react';

export const CardSkeleton = () => (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm animate-pulse space-y-6">
        <div className="flex justify-between items-center">
            <div className="w-1/2 h-6 bg-gray-200 rounded-xl"></div>
            <div className="w-1/6 h-6 bg-gray-200 rounded-full"></div>
        </div>
        <div className="w-full h-16 bg-gray-100 rounded-2xl"></div>
        <div className="flex justify-between items-center pt-4">
            <div className="w-1/4 h-8 bg-gray-200 rounded-xl"></div>
            <div className="w-1/4 h-8 bg-purple-100 rounded-xl"></div>
        </div>
    </div>
);

export const PageSkeleton = () => (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-12 space-y-8 animate-pulse max-w-6xl mx-auto">
        <div className="w-1/3 h-10 bg-gray-200 rounded-2xl"></div>
        <div className="w-full h-48 bg-slate-900/10 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
        </div>
    </div>
);

export default {
    CardSkeleton,
    PageSkeleton
};
