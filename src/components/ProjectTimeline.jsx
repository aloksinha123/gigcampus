import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ACTION_CONFIG = {
    PROJECT_CREATED: { icon: '🚀', label: 'Project Created', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    BID_SUBMITTED: { icon: '📩', label: 'Bid Submitted', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    BID_ACCEPTED: { icon: '🤝', label: 'Bid Accepted', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    ESCROW_CREATED: { icon: '🔒', label: 'Escrow Funds Created', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    DELIVERABLE_SUBMITTED: { icon: '📦', label: 'Deliverable Submitted', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    PAYMENT_RELEASED: { icon: '💸', label: 'Payment Released', color: 'bg-green-100 text-green-800 border-green-200' },
    PROJECT_COMPLETED: { icon: '🎉', label: 'Project Completed', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    REVIEW_SUBMITTED: { icon: '⭐', label: 'Review Submitted', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
};

const ProjectTimeline = ({ projectId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchTimeline();
        }
    }, [projectId]);

    const fetchTimeline = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projects/${projectId}/timeline`);
            setActivities(response.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch project timeline:', err);
            setError(err.response?.data?.message || 'Failed to load timeline');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                Loading activity timeline...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 text-sm">
                No activity events recorded yet.
            </div>
        );
    }

    return (
        <div className="space-y-4 py-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⏱️ Project Activity Timeline
            </h3>

            <div className="relative border-l-2 border-indigo-100 ml-4 space-y-6">
                {activities.map((item) => {
                    const cfg = ACTION_CONFIG[item.action] || {
                        icon: '📌',
                        label: item.action,
                        color: 'bg-gray-100 text-gray-800 border-gray-200'
                    };
                    const formattedDate = new Date(item.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    });
                    const userName = item.user?.profile?.fullName || item.user?.username || 'User';

                    return (
                        <div key={item._id} className="relative pl-6">
                            {/* Circle Marker */}
                            <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-sm shadow-sm">
                                {cfg.icon}
                            </div>

                            {/* Activity Card */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-700">
                                            {userName}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {formattedDate}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectTimeline;
