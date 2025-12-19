import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

const TOAST_TYPES = {
    success: { icon: CheckCircle, className: 'bg-green-50 text-green-800 border-green-200' },
    error: { icon: XCircle, className: 'bg-red-50 text-red-800 border-red-200' },
    warning: { icon: AlertTriangle, className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
    info: { icon: Info, className: 'bg-blue-50 text-blue-800 border-blue-200' }
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const notify = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now().toString();
        setNotifications((prev) => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    const success = (msg, duration) => notify(msg, 'success', duration);
    const error = (msg, duration) => notify(msg, 'error', duration);
    const warning = (msg, duration) => notify(msg, 'warning', duration);
    const info = (msg, duration) => notify(msg, 'info', duration);

    return (
        <NotificationContext.Provider value={{ notify: { success, error, warning, info } }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                <AnimatePresence>
                    {notifications.map((notification) => {
                        const TypeConfig = TOAST_TYPES[notification.type] || TOAST_TYPES.info;
                        const Icon = TypeConfig.icon;

                        return (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                layout
                                className={`pointer-events-auto flex items-start p-4 rounded-lg shadow-lg border ${TypeConfig.className} backdrop-blur-sm bg-opacity-95`}
                            >
                                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium">{notification.message}</p>
                                </div>
                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="ml-4 inline-flex flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};
