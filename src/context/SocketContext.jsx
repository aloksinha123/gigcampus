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
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003';
            const newSocket = io(SOCKET_URL, {
                transports: ['websocket'],
                autoConnect: true
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                setConnected(true);

                // Join personal room for private notifications
                const userString = localStorage.getItem('user');
                if (userString) {
                    const userData = JSON.parse(userString);
                    newSocket.emit('joinPersonal', userData._id);
                }
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setConnected(false);
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        }
    }, [isAuthenticated]);

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
