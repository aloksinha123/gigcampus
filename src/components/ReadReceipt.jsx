import React from 'react';

/**
 * Message Read Receipt Status Component (Sender side only)
 * - sent: ✓ (Gray)
 * - delivered: ✓✓ (Slate)
 * - read: ✓✓ (Blue/Emerald)
 */
const ReadReceipt = ({ status = 'sent', isSender = true }) => {
    // Only the message sender sees read receipts
    if (!isSender) return null;

    const currentStatus = status || 'sent';

    if (currentStatus === 'read') {
        return (
            <span
                className="inline-flex items-center text-blue-500 font-black text-xs tracking-tighter select-none ml-1.5"
                title="Read"
            >
                ✓✓
            </span>
        );
    }

    if (currentStatus === 'delivered') {
        return (
            <span
                className="inline-flex items-center text-gray-400 font-bold text-xs tracking-tighter select-none ml-1.5"
                title="Delivered"
            >
                ✓✓
            </span>
        );
    }

    // Default: 'sent'
    return (
        <span
            className="inline-flex items-center text-gray-400 font-medium text-xs tracking-tighter select-none ml-1.5"
            title="Sent"
        >
            ✓
        </span>
    );
};

export default ReadReceipt;
