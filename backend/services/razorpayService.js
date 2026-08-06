import crypto from 'crypto';
import razorpayInstance from '../config/razorpay.js';

/**
 * Service to create a Razorpay order
 * @param {number} amountInRupees - Amount in INR (Rupees)
 */
export const createOrder = async (amountInRupees) => {
    const options = {
        amount: Math.round(amountInRupees * 100), // Convert rupees to paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        payment_capture: 1
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
};

/**
 * Service to verify Razorpay payment signature using HMAC SHA256
 * @param {Object} paymentDetails - Details including razorpay_order_id, razorpay_payment_id, razorpay_signature
 * @returns {boolean} True if signature is valid, false otherwise
 */
export const verifySignature = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        throw new Error('Razorpay key secret environment variable is missing.');
    }

    // Message string: razorpay_order_id + "|" + razorpay_payment_id
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;

    // Generate expected HMAC SHA256 signature
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8');

    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

/**
 * Service to fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 */
export const fetchPayment = async (paymentId) => {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
};

export default {
    createOrder,
    verifySignature,
    fetchPayment
};
