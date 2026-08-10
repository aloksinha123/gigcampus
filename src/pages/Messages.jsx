import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import UserPresence from '../components/UserPresence';
import ReadReceipt from '../components/ReadReceipt';
import { triggerBrowserNotification } from '../utils/browserNotification';
import FileAttachmentPreview, { formatFileSize } from '../components/FileAttachmentPreview';

const Messages = () => {
    const { user, logout } = useAuth();
    const { socket, joinProject, leaveProject, sendMessage: socketSendMessage, emitTyping, emitStopTyping } = useSocket();
    const { error } = useNotification();

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [pendingFile, setPendingFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typingUser, setTypingUser] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const isTypingRef = useRef(false);
    const typingTimerRef = useRef(null);
    const selectedConversationRef = useRef(selectedConversation);

    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
        setTypingUser(null);
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [selectedConversation]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 20 MB limit validation
        if (file.size > 20 * 1024 * 1024) {
            error('File size exceeds 20 MB limit.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Executable and script file blockage validation
        const ext = file.name.split('.').pop().toLowerCase();
        const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'js', 'apk', 'vbs', 'msi', 'ps1', 'jar'];
        if (blockedExts.includes(ext)) {
            error('Executable and script files are strictly blocked for security.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setPendingFile(file);
    };

    const stopTypingImmediate = () => {
        if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = null;
        }
        if (isTypingRef.current && selectedConversationRef.current) {
            isTypingRef.current = false;
            socket?.emit('typing-stop', {
                conversationId: selectedConversationRef.current.projectId,
                projectId: selectedConversationRef.current.projectId
            });
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            const receiverId = message.receiver?._id || message.receiver;
            if (receiverId === user?._id) {
                socket.emit('markDelivered', { messageId: message._id, projectId: message.project });

                if (selectedConversationRef.current?.projectId === message.project && !document.hidden) {
                    socket.emit('markRead', { projectId: message.project });
                    api.messages.markAsRead(message.project);
                } else {
                    const senderName = message.sender?.username || 'someone';
                    triggerBrowserNotification({
                        title: 'GigCampus',
                        body: `New chat message from ${senderName}: "${message.content}"`,
                        url: '/messages',
                        tag: `msg-${message._id}`
                    });
                }
            }

            setMessages(prev => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
        };

        const handleTypingStart = ({ conversationId, username }) => {
            if (selectedConversationRef.current?.projectId === conversationId) {
                setTypingUser(username || 'Someone');
            }
        };

        const handleTypingStop = ({ conversationId }) => {
            if (selectedConversationRef.current?.projectId === conversationId) {
                setTypingUser(null);
            }
        };

        const handleMessageDelivered = ({ messageId }) => {
            setMessages(prev =>
                prev.map(m => (m._id === messageId ? { ...m, status: 'delivered' } : m))
            );
        };

        const handleMessageRead = ({ projectId, messageIds }) => {
            setMessages(prev =>
                prev.map(m =>
                    (messageIds?.includes(m._id) || m.project === projectId)
                        ? { ...m, status: 'read', read: true }
                        : m
                )
            );
        };

        socket.on('newMessage', handleNewMessage);
        socket.on('typing-start', handleTypingStart);
        socket.on('typing-stop', handleTypingStop);
        socket.on('userTyping', handleTypingStart);
        socket.on('userStoppedTyping', handleTypingStop);
        socket.on('message-delivered', handleMessageDelivered);
        socket.on('message-read', handleMessageRead);

        return () => {
            socket.off('newMessage', handleNewMessage);
            socket.off('typing-start', handleTypingStart);
            socket.off('typing-stop', handleTypingStop);
            socket.off('userTyping', handleTypingStart);
            socket.off('userStoppedTyping', handleTypingStop);
            socket.off('message-delivered', handleMessageDelivered);
            socket.off('message-read', handleMessageRead);
        };
    }, [socket, user]);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.projectId);
            joinProject(selectedConversation.projectId);
            if (socket) {
                socket.emit('markRead', { projectId: selectedConversation.projectId });
            }
        }
        return () => {
            if (selectedConversation) {
                leaveProject(selectedConversation.projectId);
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
        if ((!newMessage.trim() && !pendingFile) || !selectedConversation) return;

        stopTypingImmediate();

        try {
            setSending(true);
            let attachmentData = null;

            if (pendingFile) {
                const formData = new FormData();
                formData.append('file', pendingFile);
                formData.append('project', selectedConversation.projectId);

                const uploadRes = await api.messages.upload(formData);
                attachmentData = uploadRes.data;
            }

            const messageData = {
                project: selectedConversation.projectId,
                receiver: selectedConversation.otherUser._id,
                content: newMessage.trim(),
                attachment: attachmentData
            };

            const response = await api.messages.send(messageData);
            const sentMessage = response.data;

            // Add message to local state
            setMessages(prev => {
                if (prev.some(m => m._id === sentMessage._id)) return prev;
                return [...prev, sentMessage];
            });

            setNewMessage('');
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            scrollToBottom();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to send message/file');
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setNewMessage(val);

        if (!selectedConversation || !socket) return;

        const convId = selectedConversation.projectId;

        if (val.trim().length > 0) {
            if (!isTypingRef.current) {
                isTypingRef.current = true;
                socket.emit('typing-start', {
                    conversationId: convId,
                    projectId: convId,
                    username: user?.username
                });
            }

            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }

            typingTimerRef.current = setTimeout(() => {
                isTypingRef.current = false;
                socket.emit('typing-stop', {
                    conversationId: convId,
                    projectId: convId
                });
            }, 1500);
        } else {
            stopTypingImmediate();
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
        <div className="min-h-screen bg-gc-near">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
                    <div className="flex h-full relative">
                        {/* Conversations List */}
                        <div className={`w-full md:w-80 lg:w-96 md:border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-4 border-b border-gc-border bg-gc-blue">
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
                                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 min-h-[44px] flex items-center justify-center"
                                        >
                                            View My Projects
                                        </Link>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv.projectId}
                                            onClick={() => setSelectedConversation(conv)}
                                            className={`p-4 border-b border-gc-border cursor-pointer hover:bg-gc-surface transition active:bg-gc-border ${selectedConversation?.projectId === conv.projectId ? 'bg-gc-soft border-l-4 border-l-gc-blue' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gc-blue rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                    {conv.otherUser?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <h3 className="font-semibold text-gray-800 truncate">
                                                                {conv.otherUser?.username}
                                                            </h3>
                                                            <UserPresence
                                                                userId={conv.otherUser?._id}
                                                                initialIsOnline={conv.otherUser?.isOnline}
                                                                initialLastSeen={conv.otherUser?.lastSeen}
                                                                showText={false}
                                                            />
                                                        </div>
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
                        <div className={`w-full md:flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                            {!selectedConversation ? (
                                <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
                                    <div className="text-center">
                                        <div className="text-6xl sm:text-8xl mb-4">💬</div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Select a conversation</h3>
                                        <p className="text-gray-600 text-sm">Choose a conversation from the list to start messaging</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <button
                                                    onClick={() => setSelectedConversation(null)}
                                                    className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 font-bold min-h-[44px] flex items-center justify-center text-sm"
                                                    aria-label="Back to conversations list"
                                                >
                                                    ← Back
                                                </button>
                                                <div className="w-10 h-10 bg-gc-blue rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                                    {selectedConversation.otherUser?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                                                            {selectedConversation.otherUser?.username}
                                                        </h3>
                                                        <UserPresence
                                                            userId={selectedConversation.otherUser?._id}
                                                            initialIsOnline={selectedConversation.otherUser?.isOnline}
                                                            initialLastSeen={selectedConversation.otherUser?.lastSeen}
                                                        />
                                                    </div>
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
                                                                        ? 'bg-gc-blue text-white'
                                                                        : 'bg-white text-gray-800 shadow-sm'
                                                                        }`}>
                                                                        {message.content && <p className="text-sm break-words">{message.content}</p>}
                                                                        <FileAttachmentPreview attachment={message.attachment} />
                                                                    </div>
                                                                    <p className={`text-xs text-gray-500 mt-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                                        <span>{formatTime(message.createdAt)}</span>
                                                                        <ReadReceipt
                                                                            status={message.status || (message.read ? 'read' : 'sent')}
                                                                            isSender={isOwn}
                                                                        />
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {typingUser && (
                                                    <div className="flex justify-start my-2 animate-in fade-in duration-200">
                                                        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex items-center gap-2 text-xs italic text-gray-500">
                                                            <span className="font-semibold text-gray-700 not-italic">{typingUser}</span> is typing
                                                            <div className="flex gap-1 items-center ml-1">
                                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                                        {/* Staging File Preview */}
                                        {pendingFile && (
                                            <div className="mb-3 p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-2xl">📎</span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-xs text-blue-900 truncate">{pendingFile.name}</p>
                                                        <p className="text-[10px] font-semibold text-blue-700">{formatFileSize(pendingFile.size)}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPendingFile(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-black cursor-pointer"
                                                    title="Remove attachment"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                            {/* File Picker Trigger */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={sending}
                                                className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition cursor-pointer flex-shrink-0"
                                                title="Attach File (Images, Documents, PDFs up to 20MB)"
                                            >
                                                <span className="text-xl">📎</span>
                                            </button>

                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={handleInputChange}
                                                placeholder="Type a message..."
                                                className="flex-1 px-4 py-3 border border-gc-border rounded-full focus:outline-none focus:ring-2 focus:ring-gc-blue focus:border-transparent"
                                                disabled={sending}
                                            />
                                            <button
                                                type="submit"
                                                disabled={(!newMessage.trim() && !pendingFile) || sending}
                                                className="bg-gc-blue text-white px-6 py-3 rounded-full hover:bg-gc-navy disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold flex-shrink-0"
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
