import Razorpay from 'razorpay';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
    throw new Error('Razorpay initialization failed: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required.');
}

const razorpayInstance = new Razorpay({
    key_id,
    key_secret
});

export default razorpayInstance;
