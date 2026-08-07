import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import MockCheckout from '../components/MockCheckout';
import Navbar from '../components/Navbar';
import ProjectTimeline from '../components/ProjectTimeline';
import SmartBidAnalysisModal from '../components/SmartBidAnalysisModal';
import RecommendationResultsModal from '../components/RecommendationResultsModal';
import MilestoneList from '../components/MilestoneList';
import UserPresence from '../components/UserPresence';

const ProjectDetail = () => {
    const { id } = useParams();
    const { user, logout, updateUser } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [bids, setBids] = useState([]);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewData, setReviewData] = useState({
        rating: 5,
        comment: '',
        communication: 5,
        quality: 5,
        professionalism: 5,
        timeliness: 5
    });

    // Payment/Checkout states
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedBidForCheckout, setSelectedBidForCheckout] = useState(null);

    // New Tab and Action states
    const [activeTab, setActiveTab] = useState('details'); // 'details', 'bids', 'deliverables', 'milestones'
    const [deliverableData, setDeliverableData] = useState({ title: '', description: '', files: [] });
    const [disputeReason, setDisputeReason] = useState('');
    const [showDisputeModal, setShowDisputeModal] = useState(false);

    // Bid Modal State
    const [showBidModal, setShowBidModal] = useState(false);
    const [bidData, setBidData] = useState({
        bidAmount: '',
        proposal: '',
        deliveryTime: ''
    });

    // Submit Work Modal State
    const [showSubmitWorkModal, setShowSubmitWorkModal] = useState(false);

    // AI Smart Bid Analyzer State
    const [analyzingBid, setAnalyzingBid] = useState(false);
    const [bidAnalysisResult, setBidAnalysisResult] = useState(null);
    const [showBidAnalysisModal, setShowBidAnalysisModal] = useState(false);

    // AI Proposal Generator State
    const [generatingProposal, setGeneratingProposal] = useState(false);
    const [selectedTone, setSelectedTone] = useState('professional');

    const handleGenerateAIProposal = async () => {
        try {
            setGeneratingProposal(true);
            const res = await api.ai.generateProposal(id, selectedTone);
            if (res.data?.success && res.data?.proposal) {
                setBidData(prev => ({ ...prev, proposal: res.data.proposal }));
                success('✨ AI Proposal generated successfully! You can edit it before submitting.');
            } else {
                error(res.data?.message || 'Failed to generate AI proposal.');
            }
        } catch (err) {
            console.error('AI Proposal Error:', err);
            error(err.response?.data?.message || 'Failed to generate AI proposal.');
        } finally {
            setGeneratingProposal(false);
        }
    };

    const handleAnalyzeBid = async () => {
        if (!bidData.proposal || !bidData.proposal.trim()) {
            error('Please enter a proposal message to analyze.');
            return;
        }

        if (!bidData.bidAmount || Number(bidData.bidAmount) <= 0) {
            error('Please enter a valid bid amount.');
            return;
        }

        let daysNum = 7;
        if (bidData.deliveryTime) {
            const parsed = parseInt(bidData.deliveryTime.replace(/\D/g, ''), 10);
            if (!isNaN(parsed) && parsed > 0) {
                daysNum = parsed;
            }
        }

        try {
            setAnalyzingBid(true);
            const response = await api.ai.analyzeBid({
                projectId: id,
                proposal: bidData.proposal.trim()
            });

            if (response.data?.success || response.data?.score) {
                setBidAnalysisResult(response.data);
                setShowBidAnalysisModal(true);
                success('✨ AI Bid Quality Audit Complete!');
            } else {
                error('Unable to analyze bid proposal.');
            }
        } catch (err) {
            console.error('Bid Analysis error:', err);
            error(err.response?.data?.message || 'Unable to analyze bid proposal.');
        } finally {
            setAnalyzingBid(false);
        }
    };

    const handleApplyImprovedBid = (improvedBidText) => {
        setBidData(prev => ({ ...prev, proposal: improvedBidText }));
        setShowBidAnalysisModal(false);
        success('✨ Improved bid proposal applied to your bid form!');
    };

    // AI Freelancer Recommendation Engine State
    const [recommendLoading, setRecommendLoading] = useState(false);
    const [recommendationResults, setRecommendationResults] = useState(null);
    const [showRecommendationModal, setShowRecommendationModal] = useState(false);

    const handleRecommendFreelancers = async () => {
        try {
            setRecommendLoading(true);

            const response = await api.ai.recommendFreelancers(id);

            if (response.data?.success && Array.isArray(response.data.recommendations)) {
                setRecommendationResults(response.data.recommendations);
                setShowRecommendationModal(true);
                success('✨ AI Freelancer Recommendation complete!');
            } else {
                error('Unable to generate AI freelancer recommendations.');
            }
        } catch (err) {
            console.error('AI Freelancer Recommendation error:', err);
            error(err.response?.data?.message || 'Unable to generate freelancer recommendations.');
        } finally {
            setRecommendLoading(false);
        }
    };

    // Review Modal State - Already declared above

    useEffect(() => {
        fetchProjectDetails();
        fetchBids();
        fetchPayment();
    }, [id]);

    const fetchProjectDetails = async () => {
        try {
            setLoading(true);
            const response = await api.projects.getOne(id);
            setProject(response.data);
        } catch (err) {
            error('Failed to load project details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBids = async () => {
        try {
            const response = await api.bids.getProjectBids(id);
            setBids(response.data);
        } catch (err) {
            console.error('Failed to load bids:', err);
        }
    };

    const fetchPayment = async () => {
        try {
            const response = await api.payments.getByProject(id);
            setPayment(response.data);
        } catch (err) {
            // Silently handle 404 - payment doesn't exist yet (no bid accepted)
            if (err.response?.status !== 404) {
                console.error('Failed to load payment:', err);
            }
        }
    };

    const handleAcceptBid = (bidId, bidAmount) => {
        setSelectedBidForCheckout({ id: bidId, amount: bidAmount });
        setShowCheckout(true);
    };

    const processAcceptBid = async () => {
        if (!selectedBidForCheckout) return;

        try {
            await api.projects.acceptBid(id, selectedBidForCheckout.id);
            success('Bid accepted! Escrow payment created.');
            setShowCheckout(false);
            setSelectedBidForCheckout(null);
            fetchProjectDetails();
            fetchBids();
            fetchPayment();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to accept bid');
        }
    };

    const handleCompleteProject = async () => {
        if (!window.confirm('Mark this project as complete? Payment will be released to the freelancer.')) return;

        try {
            const res = await api.projects.complete(id);
            if (refreshUser) refreshUser();

            if (res.data?.alreadyCompleted) {
                success('Project was already completed via milestones — all payments have been released! 🎉');
            } else {
                success('Payment released successfully. Project completed!');
                setShowReviewModal(true);
            }

            fetchProjectDetails();
            fetchPayment();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to complete project and release payment.');
        }
    };


    const handleDeleteProject = async () => {
        if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

        try {
            await api.projects.delete(id);
            success('Project deleted successfully');
            navigate('/my-projects');
        } catch (err) {
            error(err.response?.data?.message || 'Failed to delete project');
        }
    };



    const handleRejectBid = async (bidId) => {
        if (!window.confirm('Are you sure you want to reject this bid?')) return;
        try {
            await api.projects.rejectBid(id, bidId);
            success('Bid rejected');
            fetchBids();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to reject bid');
        }
    };

    const handleApproveDeliverable = async (deliverableId) => {
        try {
            await api.projects.approveDeliverable(id, deliverableId);
            success('Deliverable approved');
            fetchProjectDetails();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to approve deliverable');
        }
    };

    const handleRaiseDispute = async (e) => {
        e.preventDefault();
        try {
            await api.projects.raiseDispute(id, disputeReason);
            success('Dispute raised. Status updated to DISPUTED.');
            setShowDisputeModal(false);
            setDisputeReason('');
            fetchProjectDetails();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to raise dispute');
        }
    };

    const handlePlaceBid = async (e) => {
        e.preventDefault();
        try {
            await api.bids.submit({
                project: id,
                ...bidData
            });
            success('Bid submitted successfully!');
            setShowBidModal(false);
            setBidData({ bidAmount: '', proposal: '', deliveryTime: '' });
            fetchBids();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit bid');
        }
    };

    const handleSubmitWork = async (e) => {
        e.preventDefault();
        try {
            await api.projects.submitDeliverable(id, deliverableData);
            success('Work submitted successfully!');
            setShowSubmitWorkModal(false);
            setDeliverableData({ title: '', description: '', files: [] });
            fetchProjectDetails();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit work');
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        try {
            const revieweeId = user._id === project.client._id ? project.freelancer._id : project.client._id;

            await api.reviews.submit({
                project: id,
                reviewee: revieweeId,
                rating: parseInt(reviewData.rating),
                comment: reviewData.comment,
                categories: {
                    communication: parseInt(reviewData.communication),
                    quality: parseInt(reviewData.quality),
                    professionalism: parseInt(reviewData.professionalism),
                    timeliness: parseInt(reviewData.timeliness)
                }
            });
            success('Review submitted successfully!');
            setShowReviewModal(false);
            // Ideally should refresh a reviews list here, but currently project details doesn't show reviews list
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit review');
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            open: 'bg-green-100 text-green-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-purple-100 text-purple-800',
            cancelled: 'bg-red-100 text-red-800',
            disputed: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getBidStatusBadge = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            withdrawn: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Project Not Found</h2>
                    <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
                    <Link to="/my-projects" className="text-blue-600 hover:underline">
                        Back to My Projects
                    </Link>
                </div>
            </div>
        );
    }

    const isOwner = String(user?._id) === String(project.client?._id || project.client);

    // Debugging Logs
    console.log('--- Project Detail Debug ---');
    console.log('Project Status:', project.status);
    console.log('Is Owner:', isOwner);
    console.log('User ID:', user?._id);
    console.log('Client ID:', project.client?._id || project.client);
    console.log('--------------------------');
    const canComplete = isOwner && (project.status === 'in_progress' || project.status === 'completed');
    const canEdit = isOwner && project.status === 'open';
    const canDelete = isOwner && project.status === 'open';
    const canBid = user?.role === 'freelancer' && project.status === 'open' && !bids.some(b => b.freelancer._id === user._id);
    const isAssignedFreelancer = user?.role === 'freelancer' && (String(user._id) === String(project.freelancer?._id || project.freelancer));
    const isFreelancer = Boolean(isAssignedFreelancer || (user?.role === 'freelancer' && String(user?._id) === String(project.freelancer?._id || project.freelancer)));
    const canSubmitWork = isAssignedFreelancer && project.status === 'in_progress';
    const canReview = project.status === 'completed' && (isOwner || (String(user?._id) === String(project.freelancer?._id || project.freelancer)));

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Navbar */}
            <Navbar />

            {showCheckout && selectedBidForCheckout && (
                <MockCheckout
                    amount={selectedBidForCheckout.amount}
                    projectName={project.title}
                    onConfirm={processAcceptBid}
                    onCancel={() => {
                        setShowCheckout(false);
                        setSelectedBidForCheckout(null);
                    }}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Section with Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                    <div>
                        <Link to="/my-projects" className="inline-flex items-center text-blue-600 font-bold text-sm mb-4 hover:gap-2 transition-all">
                            <span>←</span> <span className="ml-2 uppercase tracking-widest">Back to Inventory</span>
                        </Link>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-5xl font-black text-gray-900 tracking-tight">{project.title}</h1>
                            <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${getStatusBadge(project.status)}`}>
                                {project.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-gray-500 font-medium font-bold">Gig initiated on {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                    </div>

                    {isOwner && (
                        <div className="flex flex-wrap gap-3">
                            {(project.status === 'in_progress' || project.status === 'disputed') && (
                                <button
                                    onClick={() => setShowDisputeModal(true)}
                                    disabled={project.status === 'disputed'}
                                    className={`px-6 py-4 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2 ${project.status === 'disputed'
                                        ? 'bg-red-500 shadow-red-100 cursor-default hover:translate-y-0'
                                        : 'bg-orange-500 shadow-orange-100 hover:bg-orange-600 hover:-translate-y-1'
                                        }`}
                                >
                                    <span>{project.status === 'disputed' ? '🛑' : '⚠'}</span>
                                    {project.status === 'disputed' ? 'DISPUTE ACTIVE' : 'RAISE DISPUTE'}
                                </button>
                            )}
                            {canComplete && (
                                <button
                                    onClick={handleCompleteProject}
                                    className="px-6 py-4 bg-green-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-green-100 hover:bg-green-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span>✓</span> COMPLETE PROJECT
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span>✎</span> EDIT DETAILS
                                </button>
                            )}
                        </div>
                    )}
                    {canBid && (
                        <button
                            onClick={() => setShowBidModal(true)}
                            className="px-6 py-4 bg-purple-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-purple-100 hover:bg-purple-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span>👋</span> PLACE A BID
                        </button>
                    )}
                    {canSubmitWork && (
                        <button
                            onClick={() => setShowSubmitWorkModal(true)}
                            className="px-6 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span>📤</span> SUBMIT WORK
                        </button>
                    )}
                    {canReview && (
                        <button
                            onClick={() => setShowReviewModal(true)}
                            className="px-6 py-4 bg-yellow-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-600 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span>⭐</span> LEAVE REVIEW
                        </button>
                    )}
                </div>

                {/* Performance Tabs */}
                <div className="flex border-b border-gray-100 mb-10 bg-white/50 backdrop-blur-md rounded-3xl px-6 py-2 sticky top-[80px] z-40 border border-white/20">
                    {[
                        { id: 'details', label: 'Gig Details', icon: '📄', show: true },
                        { id: 'bids', label: `Proposals (${bids.length})`, icon: '🤝', show: project.status === 'open' || isOwner },
                        { id: 'workspace', label: 'Project Workspace', icon: '💻', show: project.status !== 'open' },
                        { id: 'milestones', label: 'Milestones', icon: '🎯', show: project.status !== 'open' },
                        { id: 'timeline', label: 'Timeline', icon: '⏱️' }
                    ].map(tab => tab.show !== false && (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab.id
                                ? 'text-blue-600'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-8 right-8 h-1 bg-blue-600 rounded-full animate-in slide-in-from-bottom-1"></div>}
                        </button>
                    ))}
                </div>

                {/* Tab View Container */}
                <div className="min-h-[500px] animate-in fade-in duration-500">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Left Column: Core Info */}
                            <div className="lg:col-span-2 space-y-10">
                                <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-50">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Gig Description</h3>
                                    <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">{project.description}</p>
                                </div>

                                {project.requirements?.length > 0 && (
                                    <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-50">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Asset Requirements</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {project.requirements.map((req, i) => (
                                                <div key={i} className="flex items-center gap-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-50 text-blue-900 font-bold text-sm">
                                                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</div>
                                                    {req}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Key Stats & Freelancer */}
                            <div className="space-y-8">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-10 rounded-[2.5rem] text-white shadow-2xl">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">Financial Matrix</h3>
                                    <div className="space-y-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Approved Budget Range</p>
                                            <p className="text-3xl font-black italic text-blue-400">₹{project.budget.min} <span className="text-slate-600">to</span> ₹{project.budget.max}</p>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</p>
                                                <p className="text-xl font-bold uppercase">{project.timeline}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</p>
                                                <p className="text-xl font-bold text-blue-400 uppercase tracking-tighter italic">{project.category}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {project.skills?.length > 0 && (
                                        <div className="mt-10 pt-10 border-t border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Required Skillset</p>
                                            <div className="flex flex-wrap gap-2">
                                                {project.skills.map((skill, i) => (
                                                    <span key={i} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-white/5">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {project.freelancer && (
                                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-50">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Collaborating Freelancer</h3>
                                        <div className="flex items-center gap-5 mb-8">
                                            <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-4xl font-black text-blue-600 shadow-inner">
                                                {project.freelancer.username ? project.freelancer.username[0].toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{project.freelancer.username}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-yellow-400">★</span>
                                                    <span className="text-sm font-black text-gray-600">{project.freelancer.reputation?.rating?.toFixed(1) || '0.0'}</span>
                                                    <span className="text-xs font-bold text-gray-400 italic">Reputation Score</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/messages?user=${project.freelancer._id || project.freelancer}`}
                                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-blue-300 transition-all flex items-center justify-center gap-3"
                                        >
                                            <span>💬</span> SECURE CHAT
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'bids' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                                <h3 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter"><span className="text-blue-600">Qualified</span> Proposals</h3>
                                {isOwner && (
                                    <button
                                        onClick={handleRecommendFreelancers}
                                        disabled={recommendLoading || bids.length === 0}
                                        title={bids.length === 0 ? "No freelancer proposals available." : ""}
                                        className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 hover:shadow-purple-300 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                                    >
                                        {recommendLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Analyzing Freelancers...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>✨</span>
                                                <span>Recommend Best Freelancer</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            {bids.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-200">
                                    <div className="text-7xl mb-6 grayscale opacity-20">📂</div>
                                    <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Awaiting Initial Bids from the Marketplace</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {bids.map((bid) => (
                                        <div key={bid._id} className="bg-white border-2 border-transparent hover:border-blue-100 rounded-[2.5rem] p-10 hover:shadow-2xl transition-all group overflow-hidden relative shadow-sm">
                                            {bid.status === 'accepted' && <div className="absolute top-0 right-0 bg-green-500 text-white px-8 py-2 font-black text-[10px] uppercase tracking-widest rotate-45 translate-x-10 translate-y-4">HIRED</div>}

                                            <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                                        {bid.freelancer.username ? bid.freelancer.username[0].toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{bid.freelancer.username}</h4>
                                                            <UserPresence
                                                                userId={bid.freelancer._id}
                                                                initialIsOnline={bid.freelancer.isOnline}
                                                                initialLastSeen={bid.freelancer.lastSeen}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-yellow-400">★</span>
                                                                <span className="text-sm font-black text-gray-700">{bid.freelancer.reputation?.rating?.toFixed(1) || '0.0'}</span>
                                                            </div>
                                                            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{bid.freelancer.reputation?.completedProjects || 0} GIGS FINISHED</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="md:text-right">
                                                    <p className="text-4xl font-black text-blue-600 italic tracking-tighter">₹{bid.price}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">PROPOSED DELIVERY: {bid.timeline}</p>
                                                </div>
                                            </div>

                                            <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 mb-10">
                                                <p className="text-gray-600 font-medium leading-relaxed italic">"{bid.proposal}"</p>
                                            </div>

                                            <div className="flex justify-between items-center pt-8 border-t border-gray-50">
                                                <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${getBidStatusBadge(bid.status)}`}>
                                                    {bid.status}
                                                </span>
                                                {isOwner && bid.status === 'pending' && (
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => handleRejectBid(bid._id)}
                                                            className="px-8 py-4 rounded-2xl font-black text-[11px] text-red-500 hover:bg-red-50 uppercase tracking-widest transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptBid(bid._id, bid.price)}
                                                            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-blue-300 hover:-translate-y-1 transition-all active:scale-95"
                                                        >
                                                            HIRE NOW
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'workspace' && (
                        <div className="max-w-4xl mx-auto space-y-10">
                            <div className="flex justify-between items-center px-4">
                                <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase"><span className="text-blue-600">Gig</span> Assets</h3>
                                <div className="flex items-center gap-3 px-5 py-2 bg-green-50 text-green-600 rounded-full font-black text-[10px] tracking-widest">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                                    SECURE CLOUD DRIVE
                                </div>
                            </div>

                            {project.deliverables?.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                                    <div className="text-8xl mb-8 grayscale opacity-10">📦</div>
                                    <p className="text-gray-400 font-black text-xs uppercase tracking-widest max-w-xs mx-auto text-center leading-loose">The vault is currently empty. Deliverables from your freelancer will materialize here.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {project.deliverables.map((del, idx) => (
                                        <div key={idx} className="bg-white border border-gray-50 rounded-[2.5rem] p-12 shadow-sm hover:shadow-xl transition-all">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">{del.title}</h4>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 bg-gray-50 inline-block px-3 py-1 rounded-lg">
                                                        LOGGED {new Date(del.submittedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${del.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {del.status}
                                                </span>
                                            </div>

                                            <div className="p-8 bg-blue-50/30 rounded-[1.5rem] mb-10 border border-blue-50/50">
                                                <p className="text-gray-700 font-medium leading-relaxed">{del.description}</p>
                                            </div>

                                            {del.files?.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                                                    {del.files.map((file, fIdx) => (
                                                        <a
                                                            key={fIdx}
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
                                                        >
                                                            <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">📂</div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{file.name}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Asset Reference</p>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            {isOwner && del.status === 'pending' && (
                                                <div className="flex justify-end gap-4 pt-10 border-t border-gray-50">
                                                    <button
                                                        onClick={() => error('Feedback feature coming soon')}
                                                        className="px-8 py-4 rounded-2xl font-black text-[11px] text-orange-600 uppercase tracking-widest hover:bg-orange-50 transition-all"
                                                    >
                                                        Revision Required
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveDeliverable(del._id)}
                                                        className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 hover:-translate-y-1 transition-all active:scale-95"
                                                    >
                                                        AUTHORIZE & APPROVE
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'milestones' && (
                        <MilestoneList
                            project={project}
                            isOwner={isOwner}
                            isFreelancer={isFreelancer}
                            toastError={error}
                            toastSuccess={success}
                            onUpdate={fetchProjectDetails}
                        />
                    )}

                    {activeTab === 'timeline' && (
                        <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                            <ProjectTimeline projectId={id} />
                        </div>
                    )}
                </div>
            </div>

            {/* Dispute Modal */}
            {showDisputeModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="p-12">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase"><span className="text-orange-600">Raise</span> Dispute</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Arbitration Request Protocol</p>
                                </div>
                                <button onClick={() => setShowDisputeModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all font-black">X</button>
                            </div>

                            <form onSubmit={handleRaiseDispute} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Specify Grievance Reason</label>
                                    <textarea
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        required
                                        rows="5"
                                        className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-orange-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300 shadow-inner"
                                        placeholder="Detail the project discrepancies for arbitration..."
                                    />
                                </div>
                                <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                                    <p className="text-[10px] text-orange-800 font-bold leading-relaxed uppercase tracking-tight">
                                        Note: Raising a dispute will pause all payments and notify the GigCampus arbitration team.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:shadow-orange-300 hover:-translate-y-1 transition-all active:scale-95"
                                >
                                    INITIATE ARBITRATION
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="text-center mb-10">
                            <span className="text-6xl mb-6 inline-block">🏆</span>
                            <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase mb-2">Gig Complete!</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Collaborator Evaluation Protocol</p>
                        </div>

                        <form onSubmit={handleSubmitReview} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Collaboration Rating</label>
                                <div className="flex justify-center gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewData({ ...reviewData, rating: star })}
                                            className={`text-4xl transition-all hover:scale-125 ${reviewData.rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <textarea
                                    value={reviewData.comment}
                                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                    required
                                    rows="4"
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="Brief evaluation of the freelancer's performance..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-blue-300 hover:-translate-y-1 transition-all"
                            >
                                SUBMIT EVALUATION
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowReviewModal(false)}
                                className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-all"
                            >
                                Skip for Now
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Bid Modal */}
            {showBidModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase"><span className="text-purple-600">Submit</span> Proposal</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Freelancer Bidding Protocol</p>
                            </div>
                            <button onClick={() => setShowBidModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all font-black">X</button>
                        </div>

                        <form onSubmit={handlePlaceBid} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Bid Amount (₹)</label>
                                <input
                                    type="number"
                                    value={bidData.bidAmount}
                                    onChange={(e) => setBidData({ ...bidData, bidAmount: e.target.value })}
                                    required
                                    min="1"
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-purple-200 rounded-[2rem] text-gray-900 font-bold text-xl transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Delivery Timeline</label>
                                <input
                                    type="text"
                                    value={bidData.deliveryTime}
                                    onChange={(e) => setBidData({ ...bidData, deliveryTime: e.target.value })}
                                    required
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-purple-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="e.g., 7 Days"
                                />
                            </div>

                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Proposal / Cover Letter</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedTone}
                                            onChange={(e) => setSelectedTone(e.target.value)}
                                            className="text-xs bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-gray-700 focus:outline-none"
                                        >
                                            <option value="professional">Professional</option>
                                            <option value="persuasive">Persuasive</option>
                                            <option value="concise">Concise</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleGenerateAIProposal}
                                            disabled={generatingProposal}
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-extrabold text-xs tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            {generatingProposal ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Generating Proposal...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>✨</span>
                                                    <span>Generate AI Proposal</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={bidData.proposal}
                                    onChange={(e) => setBidData({ ...bidData, proposal: e.target.value })}
                                    required
                                    rows="6"
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-purple-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="Why are you the best fit for this gig? Click 'Generate AI Proposal' above to auto-draft!"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    type="button"
                                    onClick={handleAnalyzeBid}
                                    disabled={analyzingBid}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:shadow-indigo-300 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {analyzingBid ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            <span>Analyze My Bid</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    disabled={analyzingBid}
                                    className="flex-1 bg-purple-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 hover:shadow-purple-300 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    SUBMIT BID
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBidAnalysisModal && (
                <SmartBidAnalysisModal
                    analysis={bidAnalysisResult}
                    onClose={() => setShowBidAnalysisModal(false)}
                    onReanalyze={handleAnalyzeBid}
                    isAnalyzing={analyzingBid}
                />
            )}

            {/* AI Freelancer Recommendation Modal */}
            {showRecommendationModal && (
                <RecommendationResultsModal
                    recommendations={recommendationResults}
                    onClose={() => setShowRecommendationModal(false)}
                    projectTitle={project?.title}
                />
            )}
            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase"><span className="text-yellow-500">Rate</span> Project</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{project?.title}</p>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all font-black">X</button>
                        </div>

                        <form onSubmit={handleSubmitReview} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Overall Rating</label>
                                <div className="flex gap-2 justify-center py-4 bg-gray-50 rounded-[2rem]">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewData({ ...reviewData, rating: star })}
                                            className={`text-3xl transition-all hover:scale-125 ${reviewData.rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Communication</label>
                                    <input type="number" min="1" max="5" value={reviewData.communication} onChange={e => setReviewData({ ...reviewData, communication: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-center border-none focus:ring-2 focus:ring-yellow-200" />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Quality</label>
                                    <input type="number" min="1" max="5" value={reviewData.quality} onChange={e => setReviewData({ ...reviewData, quality: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-center border-none focus:ring-2 focus:ring-yellow-200" />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Professionalism</label>
                                    <input type="number" min="1" max="5" value={reviewData.professionalism} onChange={e => setReviewData({ ...reviewData, professionalism: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-center border-none focus:ring-2 focus:ring-yellow-200" />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Timeliness</label>
                                    <input type="number" min="1" max="5" value={reviewData.timeliness} onChange={e => setReviewData({ ...reviewData, timeliness: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-center border-none focus:ring-2 focus:ring-yellow-200" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Comment</label>
                                <textarea
                                    value={reviewData.comment}
                                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                    required
                                    rows="4"
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-yellow-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="Share your experience working on this project..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-yellow-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yellow-100 hover:shadow-yellow-300 hover:-translate-y-1 transition-all active:scale-95"
                            >
                                SUBMIT REVIEW
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Submit Work Modal */}
            {console.log('Rendering Submit Work Modal, show:', showSubmitWorkModal)}
            {showSubmitWorkModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase"><span className="text-green-600">Submit</span> Work</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Deliverable Submission Protocol</p>
                            </div>
                            <button onClick={() => setShowSubmitWorkModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all font-black">X</button>
                        </div>

                        <form onSubmit={handleSubmitWork} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Deliverable Title</label>
                                <input
                                    type="text"
                                    value={deliverableData.title}
                                    onChange={(e) => setDeliverableData({ ...deliverableData, title: e.target.value })}
                                    required
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-green-200 rounded-[2rem] text-gray-900 font-bold text-xl transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="e.g., Final Design Files"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Description</label>
                                <textarea
                                    value={deliverableData.description}
                                    onChange={(e) => setDeliverableData({ ...deliverableData, description: e.target.value })}
                                    required
                                    rows="4"
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-green-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="Describe what you're submitting..."
                                />
                            </div>

                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                <p className="text-[10px] text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
                                    💡 Note: For file uploads, please share a link to your files (Google Drive, Dropbox, etc.) in the description above.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 hover:shadow-green-300 hover:-translate-y-1 transition-all active:scale-95"
                            >
                                SUBMIT DELIVERABLE
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showRecommendationModal && (
                <RecommendationResultsModal
                    recommendations={recommendationResults}
                    onClose={() => setShowRecommendationModal(false)}
                    projectTitle={project?.title}
                    projectId={id}
                />
            )}

            {showDisputeModal && (
                <div className="fixed inset-0 bg-orange-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500 border-4 border-orange-100">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase"><span className="text-orange-600">Raise</span> Dispute</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Escalation Protocol</p>
                            </div>
                            <button onClick={() => setShowDisputeModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all font-black">X</button>
                        </div>

                        <form onSubmit={handleRaiseDispute} className="space-y-8">
                            <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 mb-6">
                                <p className="text-xs text-orange-800 font-bold leading-relaxed">
                                    🛑 Escalating a dispute will freeze all funds and require Admin intervention. This action cannot be undone.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Reason for Dispute</label>
                                <textarea
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    required
                                    rows="5"
                                    className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-orange-200 rounded-[2rem] text-gray-900 font-medium transition-all focus:outline-none placeholder:text-gray-300"
                                    placeholder="Please describe the issue in detail..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:shadow-orange-300 hover:-translate-y-1 transition-all active:scale-95"
                            >
                                CONFIRM & ESCALATE
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
