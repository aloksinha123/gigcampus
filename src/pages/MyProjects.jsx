import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const MyProjects = () => {
    const { user, logout } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        budgetMin: '',
        budgetMax: '',
        timeline: '',
        deadline: '',
        requirements: '',
        skills: ''
    });

    const handleAiImprove = async () => {
        if (!formData.description || !formData.description.trim()) {
            error('Please enter a short description first to improve with AI.');
            return;
        }

        try {
            setAiLoading(true);
            const response = await api.post('/ai/improve-description', { description: formData.description });

            if (response.data?.success && response.data?.data) {
                const aiData = response.data.data;
                
                let bMin = formData.budgetMin;
                let bMax = formData.budgetMax;
                if (aiData.budget) {
                    const nums = aiData.budget.match(/\d+/g);
                    if (nums && nums.length >= 2) {
                        bMin = nums[0];
                        bMax = nums[1];
                    } else if (nums && nums.length === 1) {
                        bMin = nums[0];
                        bMax = (parseInt(nums[0]) * 2).toString();
                    }
                }

                setFormData(prev => ({
                    ...prev,
                    title: aiData.title || prev.title,
                    description: aiData.summary || prev.description,
                    timeline: aiData.timeline || prev.timeline,
                    requirements: Array.isArray(aiData.requirements) ? aiData.requirements.join(', ') : prev.requirements,
                    skills: Array.isArray(aiData.skills) ? aiData.skills.join(', ') : prev.skills,
                    budgetMin: bMin,
                    budgetMax: bMax
                }));

                success('✨ AI suggestions generated! Please review and edit the fields before saving.');
            } else {
                error('Unable to generate AI suggestions.');
            }
        } catch (err) {
            console.error('AI generation error:', err);
            error(err.response?.data?.message || 'Unable to generate AI suggestions.');
        } finally {
            setAiLoading(false);
        }
    };

    const categories = [
        { value: 'development', label: 'Development' },
        { value: 'design', label: 'Design' },
        { value: 'writing', label: 'Writing' },
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchMyProjects();
    }, [user, navigate]);

    const fetchMyProjects = async () => {
        try {
            setLoading(true);
            const response = await api.projects.getMy();
            setProjects(response.data);
        } catch (err) {
            error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const projectData = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                budget: {
                    min: Number(formData.budgetMin),
                    max: Number(formData.budgetMax)
                },
                timeline: formData.timeline,
                deadline: new Date(formData.deadline).toISOString(),
                requirements: formData.requirements ? formData.requirements.split(',').map(r => r.trim()) : [],
                skills: formData.skills ? formData.skills.split(',').map(s => s.trim()) : []
            };

            await api.projects.create(projectData);
            success('Project launched successfully! 🚀');
            setShowCreateModal(false);
            setFormData({
                title: '',
                description: '',
                category: '',
                budgetMin: '',
                budgetMax: '',
                timeline: '',
                deadline: '',
                requirements: '',
                skills: ''
            });
            fetchMyProjects();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to create project');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this project? This will remove all bids.')) {
            try {
                await api.projects.delete(id);
                success('Project removed');
                fetchMyProjects();
            } catch (err) {
                error('Failed to delete project');
            }
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            open: 'bg-green-100 text-green-700',
            in_progress: 'bg-blue-100 text-blue-700',
            completed: 'bg-purple-100 text-purple-700',
            cancelled: 'bg-red-100 text-red-700',
            disputed: 'bg-yellow-100 text-yellow-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">
                            {user?.role === 'freelancer' ? 'My Active' : 'Project'} <span className="text-blue-600">{user?.role === 'freelancer' ? 'Contracts' : 'Inventory'}</span>
                        </h1>
                        <p className="text-lg text-gray-500 font-medium">
                            {user?.role === 'freelancer'
                                ? 'Review and manage the projects you are currently assigned to.'
                                : 'Draft, manage, and monitor all your active project listings.'}
                        </p>
                    </div>
                    {user?.role === 'student' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all flex items-center gap-2"
                        >
                            <span className="text-xl">➕</span> Post New Listing
                        </button>
                    )}
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <span className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">Total {user?.role === 'freelancer' ? 'Gigs' : 'Ads'}</span>
                        <span className="text-4xl font-black text-gray-900">{projects.length}</span>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <span className="text-green-500 font-black text-xs uppercase tracking-widest mb-1">{user?.role === 'freelancer' ? 'Completed' : 'Live Now'}</span>
                        <span className="text-4xl font-black text-green-600">
                            {user?.role === 'freelancer'
                                ? projects.filter(p => p.status === 'completed').length
                                : projects.filter(p => p.status === 'open').length}
                        </span>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <span className="text-blue-500 font-black text-xs uppercase tracking-widest mb-1">Progressing</span>
                        <span className="text-4xl font-black text-blue-600">{projects.filter(p => p.status === 'in_progress').length}</span>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <span className="text-purple-500 font-black text-xs uppercase tracking-widest mb-1">{user?.role === 'freelancer' ? 'Avg. Pay' : 'Fulfilled'}</span>
                        <span className="text-4xl font-black text-purple-600">
                            {user?.role === 'freelancer'
                                ? `$${(projects.reduce((s, p) => s + (p.budget?.max || 0), 0) / (projects.length || 1)).toFixed(0)}`
                                : projects.filter(p => p.status === 'completed').length}
                        </span>
                    </div>
                </div>

                {/* Main Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Syncing Workspace...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-gray-200 shadow-sm">
                        <div className="text-[120px] mb-8 grayscale animate-pulse">{user?.role === 'freelancer' ? '🎨' : '📝'}</div>
                        <h2 className="text-4xl font-black text-gray-900 mb-4">
                            {user?.role === 'freelancer' ? 'No Assignments Yet' : 'Your Inbox is Empty'}
                        </h2>
                        <p className="text-xl text-gray-500 mb-10 max-w-lg mx-auto font-medium leading-relaxed">
                            {user?.role === 'freelancer'
                                ? 'You haven\'t been assigned to any projects yet. Keep bidding and improve your portfolio to land your first gig!'
                                : 'Start by posting your first project. Once live, freelancers from across the campus will begin placing their bids.'}
                        </p>
                        {user?.role === 'student' ? (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-bold text-lg shadow-xl shadow-blue-200 hover:shadow-blue-400 transition-all active:scale-95"
                            >
                                Create Your First Project Card
                            </button>
                        ) : (
                            <Link
                                to="/projects"
                                className="inline-block bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-bold text-lg shadow-xl shadow-blue-200 hover:shadow-blue-400 transition-all active:scale-95"
                            >
                                Browse Open Projects
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {projects.map(project => (
                            <div key={project._id} className="group bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 hover:shadow-2xl hover:border-blue-100 transition-all flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-gray-400 font-bold text-xs">
                                            ID: #{project._id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-3 group-hover:text-blue-600 transition-colors capitalize">{project.title}</h3>
                                    <p className="text-gray-500 font-medium mb-6 line-clamp-2 max-w-3xl">{project.description}</p>

                                    <div className="flex flex-wrap gap-4">
                                        <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Budget</p>
                                            <p className="font-black text-gray-900 text-lg">${project.budget?.min} - ${project.budget?.max}</p>
                                        </div>
                                        <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Interest</p>
                                            <p className="font-black text-gray-900 text-lg">{project.bidsCount} Bids</p>
                                        </div>
                                        <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Timeframe</p>
                                            <p className="font-black text-gray-900 text-lg">{project.timeline}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto">
                                    <Link
                                        to={`/projects/${project._id}`}
                                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        Manage Bids →
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(project._id)}
                                        className="bg-gray-50 text-gray-400 px-8 py-4 rounded-2xl font-bold text-center hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Premium Create Project Overlay */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in transition-all">
                    <div className="bg-white rounded-[3rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-12 shadow-2xl relative">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-8 right-8 text-3xl font-light text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            ✕
                        </button>

                        <div className="mb-10">
                            <h2 className="text-4xl font-black text-gray-900 mb-2">Build a Project <span className="text-blue-600">Brief</span></h2>
                            <p className="text-gray-500 font-medium font-lg">The more detail you provide, the better talent you will attract.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Project Essence (Title)</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-lg"
                                        placeholder="e.g. Modern UI Design for Campus App"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Core Objectives (Description)</label>
                                        <button
                                            type="button"
                                            onClick={handleAiImprove}
                                            disabled={aiLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-200 hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Generating AI...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>✨</span>
                                                    <span>Improve with AI</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        required
                                        rows="4"
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-lg"
                                        placeholder="Explain the technical and creative requirements of the project..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Vertical (Category)</label>
                                        <div className="relative">
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-lg appearance-none cursor-pointer"
                                            >
                                                <option value="">Select Domain</option>
                                                {categories.map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Velocity (Timeline)</label>
                                        <input
                                            type="text"
                                            name="timeline"
                                            value={formData.timeline}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-lg"
                                            placeholder="e.g. 14 Days"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Budget Floor ($)</label>
                                        <input
                                            type="number"
                                            name="budgetMin"
                                            value={formData.budgetMin}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-lg"
                                            placeholder="500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Budget Ceiling ($)</label>
                                        <input
                                            type="number"
                                            name="budgetMax"
                                            value={formData.budgetMax}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-lg"
                                            placeholder="1000"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Hard Deadline</label>
                                    <input
                                        type="date"
                                        name="deadline"
                                        value={formData.deadline}
                                        onChange={handleChange}
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-lg cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 pt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-100 hover:shadow-blue-300 transition-all active:scale-95"
                                >
                                    Launch Project Card 🚀
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-10 py-5 bg-gray-100 text-gray-500 rounded-[1.5rem] font-black text-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProjects;
