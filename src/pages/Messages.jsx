import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';

const Messages = () => {
    const { user, logout } = useAuth();
    const { error } = useNotification();

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:5003', {
            transports: ['websocket'],
            reconnection: true
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('newMessage', (message) => {
            setMessages(prev => {
                // Prevent duplicate messages
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
        });

        newSocket.on('userTyping', ({ username }) => {
            setTyping(true);
        });

        newSocket.on('userStoppedTyping', () => {
            setTyping(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.projectId);
            if (socket) {
                socket.emit('joinProject', selectedConversation.projectId);
            }
        }
        return () => {
            if (selectedConversation && socket) {
                socket.emit('leaveProject', selectedConversation.projectId);
            }
        };
    }, [selectedConversation, socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await api.messages.getConversations();
            setConversations(response.data);
        } catch (err) {
            error('Failed to load conversations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (projectId) => {
        try {
            const response = await api.messages.getProjectMessages(projectId);
            // Backend returns { messages: [...], totalPages, currentPage, total }
            setMessages(response.data.messages || response.data);
            // Mark messages as read
            await api.messages.markAsRead(projectId);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            setSending(true);
            const messageData = {
                project: selectedConversation.projectId,
                receiver: selectedConversation.otherUser._id,
                content: newMessage.trim()
            };

            const response = await api.messages.send(messageData);
            const sentMessage = response.data;

            // Add message to local state
            setMessages(prev => {
                if (prev.some(m => m._id === sentMessage._id)) return prev;
                return [...prev, sentMessage];
            });

            // Emit socket event - REMOVED because backend controller emits it
            if (socket) {
                socket.emit('stopTyping', { projectId: selectedConversation.projectId });
            }

            setNewMessage('');
            scrollToBottom();
        } catch (err) {
            error('Failed to send message');
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleTyping = () => {
        if (socket && selectedConversation) {
            socket.emit('typing', {
                projectId: selectedConversation.projectId,
                username: user.username
            });

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set new timeout to stop typing indicator
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stopTyping', { projectId: selectedConversation.projectId });
            }, 1000);
        }
    };

    const formatTime = (date) => {
        const messageDate = new Date(date);
        const now = new Date();
        const diffInHours = (now - messageDate) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
                    <div className="flex h-full">
                        {/* Conversations List */}
                        <div className="w-1/3 border-r border-gray-200 flex flex-col">
                            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-500">
                                <h2 className="text-xl font-bold text-white">Messages</h2>
                                <p className="text-sm text-blue-100">
                                    {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                        <div className="text-6xl mb-4">💬</div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No messages yet</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Start a conversation by accepting a bid or messaging a freelancer
                                        </p>
                                        <Link
                                            to="/my-projects"
                                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                        >
                                            View My Projects
                                        </Link>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv.projectId}
                                            onClick={() => setSelectedConversation(conv)}
                                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${selectedConversation?.projectId === conv.projectId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                    {conv.otherUser?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-semibold text-gray-800 truncate">
                                                            {conv.otherUser?.username}
                                                        </h3>
                                                        {conv.lastMessage && (
                                                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                                {formatTime(conv.lastMessage.createdAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate mb-1">
                                                        {conv.project?.title}
                                                    </p>
                                                    {conv.lastMessage && (
                                                        <p className="text-sm text-gray-500 truncate">
                                                            {conv.lastMessage.sender === user._id ? 'You: ' : ''}
                                                            {conv.lastMessage.content}
                                                        </p>
                                                    )}
                                                    {conv.unreadCount > 0 && (
                                                        <div className="mt-1">
                                                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                                {conv.unreadCount} new
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 flex flex-col">
                            {!selectedConversation ? (
                                <div className="flex-1 flex items-center justify-center bg-gray-50">
                                    <div className="text-center">
                                        <div className="text-8xl mb-4">💬</div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Select a conversation</h3>
                                        <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 border-b border-gray-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                                    {selectedConversation.otherUser?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-800">
                                                        {selectedConversation.otherUser?.username}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {selectedConversation.project?.title}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                to={`/projects/${selectedConversation.projectId}`}
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                View Project →
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                                        {messages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">👋</div>
                                                    <p className="text-gray-600">No messages yet. Say hi!</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {messages.map((message, index) => {
                                                    const isOwn = message.sender._id === user._id || message.sender === user._id;
                                                    const showDate = index === 0 ||
                                                        new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString();

                                                    return (
                                                        <div key={message._id || index}>
                                                            {showDate && (
                                                                <div className="flex justify-center my-4">
                                                                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                                                        {new Date(message.createdAt).toLocaleDateString('en-US', {
                                                                            weekday: 'long',
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                                                    <div className={`rounded-2xl px-4 py-2 ${isOwn
                                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                                                        : 'bg-white text-gray-800 shadow-sm'
                                                                        }`}>
                                                                        <p className="text-sm break-words">{message.content}</p>
                                                                    </div>
                                                                    <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                                                                        {formatTime(message.createdAt)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {typing && (
                                                    <div className="flex justify-start">
                                                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                                                            <div className="flex gap-1">
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Input */}
                                    <div className="p-4 border-t border-gray-200 bg-white">
                                        <form onSubmit={handleSendMessage} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(e.target.value);
                                                    handleTyping();
                                                }}
                                                placeholder="Type a message..."
                                                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                disabled={sending}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim() || sending}
                                                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-full hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                                            >
                                                {sending ? '...' : '📤 Send'}
                                            </button>
                                        </form>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Messages;
