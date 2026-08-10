import React, { useState } from 'react';

const MockCheckout = ({ amount, onConfirm, onCancel, projectName }) => {
    const [loading, setLoading] = useState(false);
    const [cardData, setCardData] = useState({
        number: '**** **** **** 4242',
        expiry: '12/26',
        cvc: '***'
    });

    const handleConfirm = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
            setLoading(false);
            onConfirm();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gc-navy p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-md">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold">Secure Escrow</h2>
                    <p className="text-blue-100 text-sm mt-1">Funds will be held safely until project completion</p>
                </div>

                <div className="p-8">
                    {/* Summary */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 text-sm">Project</span>
                            <span className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{projectName}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-gray-800 font-bold">Total Amount</span>
                            <span className="text-blue-600 font-black">${amount}</span>
                        </div>
                    </div>

                    {/* Mock Card Form */}
                    <form onSubmit={handleConfirm} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={cardData.number}
                                    readOnly
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                    <div className="w-6 h-4 bg-blue-600 rounded-sm"></div>
                                    <div className="w-6 h-4 bg-orange-400 rounded-sm"></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry</label>
                                <input
                                    type="text"
                                    value={cardData.expiry}
                                    readOnly
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CVC</label>
                                <input
                                    type="text"
                                    value={cardData.cvc}
                                    readOnly
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="pt-6 space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gc-blue text-white font-bold py-4 rounded-xl hover:bg-gc-navy hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    `Pay $${amount} & Escrow`
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="w-full text-gray-500 font-semibold py-2 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex justify-center gap-6 grayscale opacity-50">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" className="h-4" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" alt="Mastercard" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-5" alt="Stripe" />
                </div>
            </div>
        </div>
    );
};

export default MockCheckout;
