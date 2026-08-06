import React from 'react';

const ErrorState = ({
    message = 'Unable to Connect to Server',
    description = 'Could not establish connection with GigCampus backend service. Please check if the backend server is running.',
    onRetry
}) => {
    return (
        <div className="bg-rose-50/90 border-2 border-rose-200 p-10 sm:p-14 rounded-[3rem] text-center max-w-lg mx-auto shadow-sm my-10 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 border border-rose-200 shadow-inner">
                🔌
            </div>
            <h3 className="text-2xl font-black text-rose-900 tracking-tight uppercase mb-3">
                {message}
            </h3>
            <p className="text-xs font-semibold text-rose-700 mb-8 max-w-md mx-auto leading-relaxed">
                {description}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto cursor-pointer"
                >
                    <span>🔄</span> Retry Connection
                </button>
            )}
        </div>
    );
};

export default ErrorState;
