import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003';
            const token = localStorage.getItem('token');

            const newSocket = io(SOCKET_URL, {
                transports: ['websocket'],
                autoConnect: true,
                auth: { token }
            });

            newSocket.on('connect', () => {
                console.log('Socket connected with auth token');
                setConnected(true);

                // Join personal room for private notifications
                const userString = localStorage.getItem('user');
                if (userString) {
                    try {
                        const userData = JSON.parse(userString);
                        newSocket.emit('joinPersonal', userData._id);
                    } catch (e) {
                        console.error('Failed to parse user string for socket room:', e);
                    }
                }
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setConnected(false);
            });

            // Listen for user online event
            newSocket.on('user-online', ({ userId, isOnline }) => {
                if (!userId) return;
                console.log(`🟢 Real-time Event: User ${userId} is ONLINE`);
                setOnlineUsers(prev => ({
                    ...prev,
                    [userId.toString()]: { isOnline: true, lastSeen: null }
                }));
            });

            // Listen for user offline event
            newSocket.on('user-offline', ({ userId, isOnline, lastSeen }) => {
                if (!userId) return;
                console.log(`⚪ Real-time Event: User ${userId} is OFFLINE (Last seen: ${lastSeen})`);
                setOnlineUsers(prev => ({
                    ...prev,
                    [userId.toString()]: { isOnline: false, lastSeen }
                }));
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        } else {
            setSocket(null);
            setConnected(false);
            setOnlineUsers({});
        }
    }, [isAuthenticated]);

    const getUserPresence = (userId, initialIsOnline = false, initialLastSeen = null) => {
        if (!userId) return { isOnline: false, lastSeen: null };
        const key = userId.toString();
        if (onlineUsers[key] !== undefined) {
            return onlineUsers[key];
        }
        return {
            isOnline: Boolean(initialIsOnline),
            lastSeen: initialLastSeen
        };
    };

    const joinProject = (projectId) => {
        if (socket) {
            socket.emit('joinProject', projectId);
        }
    };

    const leaveProject = (projectId) => {
        if (socket) {
            socket.emit('leaveProject', projectId);
        }
    };

    const sendMessage = (projectId, message) => {
        if (socket) {
            socket.emit('sendMessage', { projectId, message });
        }
    };

    const onNewMessage = (callback) => {
        if (socket) {
            socket.on('newMessage', callback);
        }
    };

    const onBidReceived = (callback) => {
        if (socket) {
            socket.on('bidReceived', callback);
        }
    };

    const emitTyping = (projectId, username) => {
        if (socket) {
            socket.emit('typing', { projectId, username });
        }
    };

    const emitStopTyping = (projectId) => {
        if (socket) {
            socket.emit('stopTyping', { projectId });
        }
    };

    const value = {
        socket,
        connected,
        onlineUsers,
        getUserPresence,
        joinProject,
        leaveProject,
        sendMessage,
        onNewMessage,
        onBidReceived,
        emitTyping,
        emitStopTyping
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
