import React from 'react';

const ErrorState = ({
    message = 'Unable to Connect to Server',
    description = 'Could not establish connection with GigCampus backend service. Please check if the backend server is running.',
    onRetry
}) => {
    return (
        <div className="bg-white border border-gc-border p-10 sm:p-14 rounded-gc-xl text-center max-w-lg mx-auto shadow-gc my-10">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-5 border border-red-100">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 2.121a1 1 0 111.414 1.414m-1.414 1.414L3 3m8.293 8.293l1.414 1.414M12 12l4.243 4.243m-4.243-4.243L3.515 3.515" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-gc-navy mb-2">
                {message}
            </h3>
            <p className="text-sm text-gc-muted mb-6 max-w-md mx-auto">
                {description}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="gc-btn-primary"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry Connection
                </button>
            )}
        </div>
    );
};

export default ErrorState;
