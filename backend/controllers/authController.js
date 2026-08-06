import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService.js';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate verification token (unhashed sent in email, hashed stored in DB)
        const unhashedToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with isEmailVerified: false
        const user = await User.create({
            username,
            email,
            password,
            role: role || 'student',
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationExpires: tokenExpires
        });

        if (user) {
            // Send Verification Email (DO NOT send Welcome Email until verified)
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const verificationUrl = `${clientUrl}/verify-email/${unhashedToken}`;

            try {
                const displayName = user.profile?.fullName || user.username || username;
                await sendVerificationEmail(user.email, displayName, verificationUrl);
            } catch (emailError) {
                console.error('⚠️ Verification email dispatch failed:', emailError.message);
            }

            res.status(201).json({
                message: 'Registration successful! Please check your email inbox to verify your account.',
                isEmailVerified: false,
                email: user.email
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify email address using token
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ message: 'Verification token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({ emailVerificationToken: hashedToken });

        if (!user) {
            return res.status(400).json({ message: 'Invalid verification token' });
        }

        if (user.isEmailVerified) {
            return res.status(403).json({ message: 'Email is already verified' });
        }

        // Check expiration (24 hours)
        if (user.emailVerificationExpires && user.emailVerificationExpires.getTime() <= Date.now()) {
            return res.status(410).json({
                message: 'Verification token has expired. Please request a new verification link.',
                expired: true,
                email: user.email
            });
        }

        // Mark as verified & clear token fields
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Send Welcome Email upon successful verification
        try {
            const displayName = user.profile?.fullName || user.username;
            await sendWelcomeEmail(user.email, displayName);
        } catch (welcomeError) {
            console.error('⚠️ Welcome email dispatch failed:', welcomeError.message);
        }

        res.status(200).json({
            message: 'Email verified successfully! You can now log in.',
            isEmailVerified: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if email is verified
        if (user.isEmailVerified === false) {
            return res.status(403).json({
                message: 'Email verification required. Please check your inbox or resend verification link.',
                isEmailVerified: false,
                email: user.email
            });
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            reputation: user.reputation,
            isEmailVerified: user.isEmailVerified,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User account not found' });
        }

        if (user.isEmailVerified) {
            return res.status(403).json({ message: 'Email is already verified' });
        }

        // Generate new token & 24h expiry
        const unhashedToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpires = tokenExpires;
        await user.save();

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const verificationUrl = `${clientUrl}/verify-email/${unhashedToken}`;

        const displayName = user.profile?.fullName || user.username;
        await sendVerificationEmail(user.email, displayName, verificationUrl);

        res.status(200).json({ message: 'A new verification link has been sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.profile = {
                ...user.profile,
                ...req.body
            };

            const updatedUser = await user.save();
            res.json(updatedUser.getPublicProfile());
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
