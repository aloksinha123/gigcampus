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
import ReviewModal from '../components/ReviewModal';

const ProjectDetail = () => {
    const { id } = useParams();
    const { user, logout, updateUser, refreshUser } = useAuth();
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

    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedBidForCheckout, setSelectedBidForCheckout] = useState(null);

    const [activeTab, setActiveTab] = useState('details');
    const [deliverableData, setDeliverableData] = useState({ title: '', description: '', files: [] });
    const [disputeReason, setDisputeReason] = useState('');
    const [showDisputeModal, setShowDisputeModal] = useState(false);

    const [showBidModal, setShowBidModal] = useState(false);
    const [bidData, setBidData] = useState({
        bidAmount: '',
        proposal: '',
        deliveryTime: ''
    });

    const [showSubmitWorkModal, setShowSubmitWorkModal] = useState(false);

    const [analyzingBid, setAnalyzingBid] = useState(false);
    const [bidAnalysisResult, setBidAnalysisResult] = useState(null);
    const [showBidAnalysisModal, setShowBidAnalysisModal] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);

    const [generatingProposal, setGeneratingProposal] = useState(false);
    const [selectedTone, setSelectedTone] = useState('professional');

    const handleGenerateAIProposal = async () => {
        try {
            setGeneratingProposal(true);
            const res = await api.ai.generateProposal(id, selectedTone);
            if (res.data?.success && res.data?.proposal) {
                setBidData(prev => ({ ...prev, proposal: res.data.proposal }));
                success('AI Proposal generated successfully! You can edit it before submitting.');
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
                success('AI Bid Quality Audit Complete!');
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
        success('Improved bid proposal applied to your bid form!');
    };

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
                success('AI Freelancer Recommendation complete!');
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
            if (localStorage.getItem('token')) {
                api.recommendations.trackView({ entityType: 'project', entityId: id })
                    .catch(err => console.error('Failed to log project view history:', err));
            }
        } catch (err) {
            error('Failed to load project details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkUserReview = async () => {
            if (!id || !user?._id || !project || project.status !== 'completed') return;
            try {
                const reviewsRes = await api.reviews.getProjectReviews(id);
                const projectReviews = reviewsRes.data || [];
                const userHasReviewed = projectReviews.some(r => String(r.reviewer._id || r.reviewer) === String(user._id));
                setHasReviewed(userHasReviewed);
            } catch (err) {
                console.error('Failed to check user review status:', err);
            }
        };
        checkUserReview();
    }, [id, user?._id, project?.status]);

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
                success('Project was already completed via milestones -- all payments have been released!');
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

    const getStatusBadge = (status) => {
        const colors = {
            open: 'bg-green-100 text-green-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-gc-soft text-gc-blue',
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
            <div className="min-h-screen bg-gc-near flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gc-blue"></div>
                    <p className="mt-4 text-gc-slate font-medium">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gc-near flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gc-soft flex items-center justify-center">
                        <svg className="w-10 h-10 text-gc-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gc-navy mb-2">Project Not Found</h2>
                    <p className="text-gc-slate mb-6">The project you're looking for doesn't exist.</p>
                    <Link to="/my-projects" className="inline-flex items-center px-6 py-3 bg-gc-blue text-white rounded-lg font-semibold text-sm hover:bg-gc-navy transition-colors">
                        Back to My Projects
                    </Link>
                </div>
            </div>
        );
    }

    const isOwner = String(user?._id) === String(project.client?._id || project.client);

    const canComplete = isOwner && (project.status === 'in_progress' || project.status === 'completed');
    const canEdit = isOwner && project.status === 'open';
    const canDelete = isOwner && project.status === 'open';
    const canBid = user?.role === 'freelancer' && project.status === 'open' && !bids.some(b => b.freelancer._id === user._id);
    const isAssignedFreelancer = user?.role === 'freelancer' && (String(user._id) === String(project.freelancer?._id || project.freelancer));
    const isFreelancer = Boolean(isAssignedFreelancer || (user?.role === 'freelancer' && String(user?._id) === String(project.freelancer?._id || project.freelancer)));
    const canSubmitWork = isAssignedFreelancer && project.status === 'in_progress';
    const canReview = project.status === 'completed' && (isOwner || (String(user?._id) === String(project.freelancer?._id || project.freelancer))) && !hasReviewed;

    return (
        <div className="min-h-screen bg-gc-near">
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

            <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gc-slate mb-6">
                    <Link to="/my-projects" className="hover:text-gc-blue transition-colors">Projects</Link>
                    <svg className="w-4 h-4 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="text-gc-navy font-semibold">Project Details</span>
                </nav>

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-2xl sm:text-4xl font-bold text-gc-navy leading-tight">{project.title}</h1>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusBadge(project.status)}`}>
                                {project.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gc-slate">
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                {project.category}
                            </span>
                        </div>
                    </div>

                    {isOwner && (
                        <div className="flex flex-wrap gap-2">
                            {(project.status === 'in_progress' || project.status === 'disputed') && (
                                <button
                                    onClick={() => setShowDisputeModal(true)}
                                    disabled={project.status === 'disputed'}
                                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                        project.status === 'disputed'
                                            ? 'bg-red-100 text-red-600 cursor-default'
                                            : 'bg-orange-500 text-white hover:bg-orange-600'
                                    }`}
                                >
                                    {project.status === 'disputed' ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    )}
                                    {project.status === 'disputed' ? 'DISPUTE ACTIVE' : 'RAISE DISPUTE'}
                                </button>
                            )}
                            {canComplete && (
                                <button
                                    onClick={handleCompleteProject}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    COMPLETE PROJECT
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gc-blue text-white rounded-lg text-sm font-semibold hover:bg-gc-navy transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    EDIT DETAILS
                                </button>
                            )}
                        </div>
                    )}
                    {canBid && (
                        <button
                            onClick={() => setShowBidModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gc-blue text-white rounded-lg text-sm font-semibold hover:bg-gc-navy transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                            PLACE A BID
                        </button>
                    )}
                    {canSubmitWork && (
                        <button
                            onClick={() => setShowSubmitWorkModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            SUBMIT WORK
                        </button>
                    )}
                    {canReview && (
                        <button
                            onClick={() => setShowReviewModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            LEAVE REVIEW
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="border-b-2 border-gc-border mb-8">
                    <div className="flex gap-0 overflow-x-auto">
                        {[
                            { id: 'details', label: 'Gig Details', show: true },
                            { id: 'bids', label: `Proposals (${bids.length})`, show: project.status === 'open' || isOwner },
                            { id: 'workspace', label: 'Project Workspace', show: project.status !== 'open' },
                            { id: 'milestones', label: 'Milestones', show: project.status !== 'open' },
                            { id: 'timeline', label: 'Timeline', show: true }
                        ].map(tab => tab.show !== false && (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-0.5 ${
                                    activeTab === tab.id
                                        ? 'border-gc-blue text-gc-blue'
                                        : 'border-transparent text-gc-slate hover:text-gc-navy hover:border-gc-border'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white rounded-xl p-6 sm:p-8 border border-gc-border shadow-sm">
                                    <h3 className="text-xs font-bold text-gc-muted uppercase tracking-wider mb-4">Gig Description</h3>
                                    <p className="text-gc-navy text-base leading-relaxed whitespace-pre-wrap">{project.description}</p>
                                </div>

                                {project.requirements?.length > 0 && (
                                    <div className="bg-white rounded-xl p-6 sm:p-8 border border-gc-border shadow-sm">
                                        <h3 className="text-xs font-bold text-gc-muted uppercase tracking-wider mb-4">Asset Requirements</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {project.requirements.map((req, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-gc-soft px-4 py-3 rounded-lg">
                                                    <svg className="w-4 h-4 text-gc-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                    <span className="text-sm text-gc-navy font-medium">{req}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white rounded-xl p-6 border border-gc-border shadow-sm">
                                    <h3 className="text-xs font-bold text-gc-muted uppercase tracking-wider mb-4">Budget & Timeline</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-medium text-gc-slate">Budget Range</p>
                                            <p className="text-2xl font-bold text-gc-navy">₹{project.budget.min} - ₹{project.budget.max}</p>
                                        </div>
                                        <div className="flex items-center gap-4 pt-3 border-t border-gc-border">
                                            <div>
                                                <p className="text-xs font-medium text-gc-slate">Duration</p>
                                                <p className="text-sm font-bold text-gc-navy">{project.timeline}</p>
                                            </div>
                                            <div className="w-px h-8 bg-gc-border"></div>
                                            <div>
                                                <p className="text-xs font-medium text-gc-slate">Proposals</p>
                                                <p className="text-sm font-bold text-gc-navy">{bids.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {project.skills?.length > 0 && (
                                    <div className="bg-white rounded-xl p-6 border border-gc-border shadow-sm">
                                        <h3 className="text-xs font-bold text-gc-muted uppercase tracking-wider mb-3">Required Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {project.skills.map((skill, i) => (
                                                <span key={i} className="inline-block px-3 py-1 bg-gc-soft text-gc-blue rounded-full text-xs font-semibold">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {project.freelancer && (
                                    <div className="bg-white rounded-xl p-6 border border-gc-border shadow-sm">
                                        <h3 className="text-xs font-bold text-gc-muted uppercase tracking-wider mb-3">Assigned Freelancer</h3>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-gc-soft rounded-full flex items-center justify-center text-sm font-bold text-gc-blue">
                                                {project.freelancer.username ? project.freelancer.username[0].toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gc-navy">{project.freelancer.username}</h4>
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                                    <span className="text-xs font-semibold text-gc-navy">{project.freelancer.reputation?.rating?.toFixed(1) || '0.0'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/messages?user=${project.freelancer._id || project.freelancer}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gc-blue border border-gc-border rounded-lg text-sm font-semibold hover:bg-gc-soft transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                            Send Message
                                        </Link>
                                    </div>
                                )}

                                <div className="bg-white rounded-xl p-6 border border-gc-border shadow-sm">
                                    <h3 className="text-xs font-bold text-gc-muted uppercase tracking-wider mb-3">Posted By</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gc-soft rounded-full flex items-center justify-center text-sm font-bold text-gc-blue">
                                            {project.client?.username ? project.client.username[0].toUpperCase() : 'C'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gc-navy">{project.client?.username || 'Client'}</p>
                                            <p className="text-xs text-gc-slate">Project Owner</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bids' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h3 className="text-xl font-bold text-gc-navy">Proposals</h3>
                                {isOwner && (
                                    <button
                                        onClick={handleRecommendFreelancers}
                                        disabled={recommendLoading || bids.length === 0}
                                        title={bids.length === 0 ? "No freelancer proposals available." : ""}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gc-blue text-white rounded-lg text-sm font-semibold hover:bg-gc-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {recommendLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                        )}
                                        <span>Recommend Best Freelancer</span>
                                    </button>
                                )}
                            </div>
                            {bids.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border border-gc-border">
                                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gc-soft flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gc-blue opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <p className="text-gc-slate text-sm font-medium">No proposals submitted yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {bids.map((bid) => (
                                        <div key={bid._id} className="bg-white rounded-xl border border-gc-border p-6 hover:shadow-md transition-shadow">
                                            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gc-soft rounded-full flex items-center justify-center text-lg font-bold text-gc-blue">
                                                        {bid.freelancer.username ? bid.freelancer.username[0].toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-gc-navy">{bid.freelancer.username}</h4>
                                                            <UserPresence userId={bid.freelancer._id} initialIsOnline={bid.freelancer.isOnline} initialLastSeen={bid.freelancer.lastSeen} />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                                            <span className="text-xs font-semibold text-gc-navy">{bid.freelancer.reputation?.rating?.toFixed(1) || '0.0'}</span>
                                                            <span className="text-xs text-gc-slate">{bid.freelancer.reputation?.completedProjects || 0} gigs</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="md:text-right">
                                                    <p className="text-xl font-bold text-gc-blue">₹{bid.price}</p>
                                                    <p className="text-xs text-gc-slate">Delivery: {bid.timeline}</p>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gc-soft/50 rounded-lg mb-4">
                                                <p className="text-sm text-gc-navy leading-relaxed">{bid.proposal}</p>
                                            </div>

                                            <div className="flex justify-between items-center pt-4 border-t border-gc-border">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getBidStatusBadge(bid.status)}`}>{bid.status}</span>
                                                {isOwner && bid.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleRejectBid(bid._id)} className="px-4 py-2 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors">Reject</button>
                                                        <button onClick={() => handleAcceptBid(bid._id, bid.price)} className="px-4 py-2 bg-gc-blue text-white rounded-lg text-sm font-semibold hover:bg-gc-navy transition-colors">Hire Now</button>
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
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gc-navy">Deliverables</h3>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Cloud Drive
                                </span>
                            </div>

                            {project.deliverables?.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border border-gc-border">
                                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gc-soft flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gc-blue opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    </div>
                                    <p className="text-gc-slate text-sm font-medium">No deliverables submitted yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {project.deliverables.map((del, idx) => (
                                        <div key={idx} className="bg-white rounded-xl border border-gc-border p-6 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="text-lg font-bold text-gc-navy">{del.title}</h4>
                                                    <p className="text-xs text-gc-slate mt-1">Submitted {new Date(del.submittedAt).toLocaleString()}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${del.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{del.status}</span>
                                            </div>
                                            <p className="text-sm text-gc-navy leading-relaxed mb-4">{del.description}</p>

                                            {del.files?.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                    {del.files.map((file, fIdx) => (
                                                        <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gc-soft/50 rounded-lg border border-gc-border hover:border-gc-blue transition-colors group">
                                                            <svg className="w-5 h-5 text-gc-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                                            <span className="text-xs font-semibold text-gc-navy truncate">{file.name}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            {isOwner && del.status === 'pending' && (
                                                <div className="flex justify-end gap-2 pt-4 border-t border-gc-border">
                                                    <button onClick={() => error('Feedback feature coming soon')} className="px-4 py-2 text-orange-600 text-sm font-semibold rounded-lg hover:bg-orange-50 transition-colors">Revision Required</button>
                                                    <button onClick={() => handleApproveDeliverable(del._id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">Approve</button>
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
                        <div className="max-w-4xl mx-auto bg-white rounded-xl p-6 border border-gc-border shadow-sm">
                            <ProjectTimeline projectId={id} />
                        </div>
                    )}
                </div>
            </div>

            {showDisputeModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gc-navy">Raise Dispute</h3>
                                    <p className="text-xs text-gc-slate mt-1">Describe the issue for arbitration</p>
                                </div>
                                <button onClick={() => setShowDisputeModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gc-slate hover:bg-gc-soft transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleRaiseDispute} className="space-y-4">
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <p className="text-xs text-orange-700 font-medium">Raising a dispute will pause all payments and notify the GigCampus arbitration team.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gc-slate mb-2">Reason for Dispute</label>
                                    <textarea
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        required
                                        rows="4"
                                        className="w-full px-4 py-3 bg-gc-near border border-gc-border rounded-lg text-sm text-gc-navy focus:outline-none focus:border-gc-blue focus:ring-1 focus:ring-gc-blue transition-colors placeholder:text-gc-muted"
                                        placeholder="Describe the issue in detail..."
                                    />
                                </div>
                                <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors">Initiate Dispute</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showBidModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gc-navy">Submit Proposal</h3>
                                    <p className="text-xs text-gc-slate mt-1">Send your bid for this project</p>
                                </div>
                                <button onClick={() => setShowBidModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gc-slate hover:bg-gc-soft transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handlePlaceBid} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gc-slate mb-2">Bid Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={bidData.bidAmount}
                                        onChange={(e) => setBidData({ ...bidData, bidAmount: e.target.value })}
                                        required
                                        min="1"
                                        className="w-full px-4 py-3 bg-gc-near border border-gc-border rounded-lg text-sm text-gc-navy focus:outline-none focus:border-gc-blue focus:ring-1 focus:ring-gc-blue transition-colors placeholder:text-gc-muted"
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gc-slate mb-2">Delivery Timeline</label>
                                    <input
                                        type="text"
                                        value={bidData.deliveryTime}
                                        onChange={(e) => setBidData({ ...bidData, deliveryTime: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-gc-near border border-gc-border rounded-lg text-sm text-gc-navy focus:outline-none focus:border-gc-blue focus:ring-1 focus:ring-gc-blue transition-colors placeholder:text-gc-muted"
                                        placeholder="e.g., 7 Days"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <label className="text-xs font-semibold text-gc-slate">Proposal</label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedTone}
                                                onChange={(e) => setSelectedTone(e.target.value)}
                                                className="text-xs bg-gc-near border border-gc-border rounded-lg px-2 py-1 text-gc-navy focus:outline-none"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="persuasive">Persuasive</option>
                                                <option value="concise">Concise</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleGenerateAIProposal}
                                                disabled={generatingProposal}
                                                className="inline-flex items-center gap-1.5 bg-gc-blue hover:bg-gc-navy text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                {generatingProposal ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                )}
                                                <span>{generatingProposal ? 'Generating...' : 'AI Draft'}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={bidData.proposal}
                                        onChange={(e) => setBidData({ ...bidData, proposal: e.target.value })}
                                        required
                                        rows="5"
                                        className="w-full px-4 py-3 bg-gc-near border border-gc-border rounded-lg text-sm text-gc-navy focus:outline-none focus:border-gc-blue focus:ring-1 focus:ring-gc-blue transition-colors placeholder:text-gc-muted"
                                        placeholder="Why are you the best fit for this gig?"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button type="button" onClick={handleAnalyzeBid} disabled={analyzingBid} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gc-blue text-white rounded-lg text-sm font-semibold hover:bg-gc-navy transition-colors disabled:opacity-50 cursor-pointer">
                                        {analyzingBid ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                                        <span>{analyzingBid ? 'Analyzing...' : 'Analyze Bid'}</span>
                                    </button>
                                    <button type="submit" disabled={analyzingBid} className="flex-1 px-4 py-3 bg-gc-navy text-white rounded-lg text-sm font-semibold hover:bg-gc-blue transition-colors disabled:opacity-50">Submit Bid</button>
                                </div>
                            </form>
                        </div>
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

            {showRecommendationModal && (
                <RecommendationResultsModal
                    recommendations={recommendationResults}
                    onClose={() => setShowRecommendationModal(false)}
                    projectTitle={project?.title}
                    projectId={id}
                />
            )}

            {showSubmitWorkModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gc-navy">Submit Work</h3>
                                    <p className="text-xs text-gc-slate mt-1">Upload your deliverable</p>
                                </div>
                                <button onClick={() => setShowSubmitWorkModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gc-slate hover:bg-gc-soft transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmitWork} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gc-slate mb-2">Deliverable Title</label>
                                    <input
                                        type="text"
                                        value={deliverableData.title}
                                        onChange={(e) => setDeliverableData({ ...deliverableData, title: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-gc-near border border-gc-border rounded-lg text-sm text-gc-navy focus:outline-none focus:border-gc-blue focus:ring-1 focus:ring-gc-blue transition-colors placeholder:text-gc-muted"
                                        placeholder="e.g., Final Design Files"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gc-slate mb-2">Description</label>
                                    <textarea
                                        value={deliverableData.description}
                                        onChange={(e) => setDeliverableData({ ...deliverableData, description: e.target.value })}
                                        required
                                        rows="4"
                                        className="w-full px-4 py-3 bg-gc-near border border-gc-border rounded-lg text-sm text-gc-navy focus:outline-none focus:border-gc-blue focus:ring-1 focus:ring-gc-blue transition-colors placeholder:text-gc-muted"
                                        placeholder="Describe what you're submitting..."
                                    />
                                </div>
                                <div className="p-3 bg-gc-soft rounded-lg">
                                    <p className="text-xs text-gc-blue font-medium">For file uploads, share a link (Google Drive, Dropbox, etc.) in the description above.</p>
                                </div>
                                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">Submit Deliverable</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showReviewModal && (
                <ReviewModal
                    isOpen={showReviewModal}
                    onClose={() => setShowReviewModal(false)}
                    project={project}
                    reviewee={isOwner ? project.freelancer : project.client}
                    onReviewSubmitted={() => {
                        fetchProjectDetails();
                        if (refreshUser) refreshUser();
                    }}
                />
            )}
        </div>
    );
};

export default ProjectDetail;
