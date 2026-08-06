import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6 bg-slate-800/80 p-10 rounded-[3rem] border border-slate-700 shadow-2xl backdrop-blur-xl">
                        <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center text-4xl mx-auto border border-rose-500/30">
                            ⚠️
                        </div>
                        <h2 className="text-3xl font-black tracking-tight italic uppercase">
                            Something Went <span className="text-rose-400">Wrong</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            An unexpected error occurred while rendering this page component. Don't worry, your data is completely safe.
                        </p>
                        <div className="pt-4 flex gap-4">
                            <button
                                onClick={() => (window.location.href = '/')}
                                className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                Back to Home
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-900/50 transition cursor-pointer"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
