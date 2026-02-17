import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { ...notification, id }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const success = useCallback((message) => {
        addNotification({ type: 'success', message });
    }, [addNotification]);

    const error = useCallback((message) => {
        addNotification({ type: 'error', message });
    }, [addNotification]);

    const info = useCallback((message) => {
        addNotification({ type: 'info', message });
    }, [addNotification]);

    const warning = useCallback((message) => {
        addNotification({ type: 'warning', message });
    }, [addNotification]);

    const value = {
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        info,
        warning
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        </NotificationContext.Provider>
    );
};

const NotificationContainer = ({ notifications, onRemove }) => {
    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`px-6 py-4 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-md animate-slide-in ${notification.type === 'success' ? 'bg-green-500 text-white' :
                            notification.type === 'error' ? 'bg-red-500 text-white' :
                                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                                    'bg-blue-500 text-white'
                        }`}
                >
                    <span>{notification.message}</span>
                    <button
                        onClick={() => onRemove(notification.id)}
                        className="ml-4 text-white hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};

export default NotificationContext;
