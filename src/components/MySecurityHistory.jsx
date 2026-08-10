import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MySecurityHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.security.getMyHistory();
            setHistory(res.data || []);
        } catch (err) {
            console.error('Failed to fetch user security history:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'SUCCESS':
                return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">SUCCESS</span>;
            case 'FAILURE':
                return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">FAILURE</span>;
            case 'WARNING':
                return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">WARNING</span>;
            case 'BLOCKED':
                return <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-full">BLOCKED</span>;
            default:
                return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-bold rounded-full">{status}</span>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📜</span>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Security Audit Trail</h2>
                        <p className="text-xs text-gray-500">Your recent login and account security activity</p>
                    </div>
                </div>
                <button
                    onClick={() => { fetchHistory(); setShowModal(true); }}
                    className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-lg transition"
                >
                    View All Security Events ({history.length})
                </button>
            </div>

            {loading ? (
                <div className="py-6 text-center text-xs text-gray-400">Loading security audit events...</div>
            ) : history.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No security events logged yet.</div>
            ) : (
                <div className="space-y-3">
                    {history.slice(0, 4).map((log) => (
                        <div key={log._id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                            <div>
                                <span className="font-bold text-gray-800">{log.action.replace(/_/g, ' ')}</span>
                                <span className="text-gray-400 ml-2">({log.browser} on {log.operatingSystem})</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {getStatusBadge(log.status)}
                                <span className="text-[11px] text-gray-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for all security events */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <h3 className="text-lg font-bold text-gray-900">📜 Full Security Event History</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>
                        <div className="overflow-y-auto space-y-3 flex-1 pr-2">
                            {history.map((log) => (
                                <div key={log._id} className="p-3 border rounded-lg flex items-center justify-between text-xs hover:bg-slate-50">
                                    <div>
                                        <div className="font-bold text-gray-900">{log.action.replace(/_/g, ' ')}</div>
                                        <div className="text-gray-500 text-[11px]">{log.browser} • {log.operatingSystem} • IP: {log.ipAddress}</div>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(log.status)}
                                        <div className="text-[10px] text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySecurityHistory;
