import User from '../models/User.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendSecurityAlertEmail
} from '../services/emailService.js';
import { parseUserAgent } from '../utils/uaParser.js';
import { logSecurityAudit } from '../services/auditService.js';
import { recordFraudSignal } from '../services/fraudDetectionService.js';

// Only these roles may be chosen through the public registration endpoint.
// Administrative accounts must be provisioned through a controlled operator flow.
export const PUBLIC_REGISTRATION_ROLES = Object.freeze(['student', 'freelancer']);

/**
 * Strip sensitive token fields from a user object before passing to audit logging.
 * Prevents emailVerificationToken, emailVerificationExpires, passwordResetToken,
 * and passwordResetExpires from ever entering the audit pipeline.
 */
const sanitizeUserForAudit = (user) => {
    if (!user) return null;
    const { emailVerificationToken, emailVerificationExpires, passwordResetToken, passwordResetExpires, ...safe } = user.toObject ? user.toObject() : { ...user };
    return safe;
};

export const resolvePublicRegistrationRole = (role) => {
    if (role === undefined) {
        return { valid: true, role: 'student' };
    }

    if (typeof role !== 'string' || !PUBLIC_REGISTRATION_ROLES.includes(role)) {
        return { valid: false };
    }

    return { valid: true, role };
};

// Generate JWT Token
const generateToken = (id, tokenId) => {
    const payload = tokenId ? { id, tokenId } : { id };
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const publicRole = resolvePublicRegistrationRole(role);

        if (!publicRole.valid) {
            return res.status(400).json({
                message: 'Invalid role. Public registration only supports student or freelancer accounts.'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            logSecurityAudit({ userEmail: email, action: 'USER_REGISTRATION', status: 'FAILURE', req, metadata: { reason: 'User already exists' } });
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate verification token
        const unhashedToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with isEmailVerified: false
        const user = await User.create({
            username,
            email,
            password,
            role: publicRole.role,
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationExpires: tokenExpires
        });

        if (user) {
            logSecurityAudit({ user, userEmail: user.email, action: 'USER_REGISTRATION', status: 'SUCCESS', req });

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
        res.status(500).json({ message: 'Internal server error' });
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
            logSecurityAudit({ action: 'EMAIL_VERIFICATION', status: 'FAILURE', req, metadata: { reason: 'Invalid token' } });
            return res.status(400).json({ message: 'Invalid verification token' });
        }

        if (user.isEmailVerified) {
            return res.status(403).json({ message: 'Email is already verified' });
        }

        if (user.emailVerificationExpires && user.emailVerificationExpires.getTime() <= Date.now()) {
            logSecurityAudit({ user: sanitizeUserForAudit(user), userEmail: user.email, action: 'EMAIL_VERIFICATION', status: 'FAILURE', req, metadata: { reason: 'Token expired' } });
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

        logSecurityAudit({ user: sanitizeUserForAudit(user), userEmail: user.email, action: 'EMAIL_VERIFICATION', status: 'SUCCESS', req });

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
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Authenticate user & get token (with 5-failed-attempts account locking & new device detection)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            logSecurityAudit({ userEmail: email, action: 'LOGIN_FAILURE', status: 'FAILURE', req, metadata: { reason: 'User not found' } });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isLockoutEnabled = process.env.ENABLE_ACCOUNT_LOCK === 'true';

        // Check if account is locked (only when ENABLE_ACCOUNT_LOCK=true)
        if (isLockoutEnabled && user.lockUntil && user.lockUntil.getTime() > Date.now()) {
            const remainingMins = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
            logSecurityAudit({ user, userEmail: user.email, action: 'LOGIN_FAILURE', status: 'BLOCKED', req, metadata: { reason: 'Account locked' } });
            return res.status(429).json({
                message: `Account is temporarily locked due to 5 consecutive failed login attempts. Please try again after ${remainingMins} minutes or contact an admin.`,
                isLocked: true,
                lockUntil: user.lockUntil
            });
        }

        // Auto unlock if lock period passed
        if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = undefined;
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

            if (user.failedLoginAttempts >= 5) {
                await recordFraudSignal(user._id, 'FAILED_LOGIN_BURST', req, { failedAttempts: user.failedLoginAttempts });
            }

            if (isLockoutEnabled && user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lock
                await user.save();

                logSecurityAudit({ user, userEmail: user.email, action: 'ACCOUNT_LOCKED', status: 'WARNING', req, metadata: { failedAttempts: user.failedLoginAttempts } });
                sendSecurityAlertEmail(user.email, user.profile?.fullName || user.username, 'ACCOUNT_LOCKED', { lockTimeMinutes: 15 });

                return res.status(429).json({
                    message: 'Account is temporarily locked due to 5 consecutive failed login attempts. Please try again after 15 minutes.',
                    isLocked: true
                });
            }

            await user.save();
            logSecurityAudit({ user, userEmail: user.email, action: 'LOGIN_FAILURE', status: 'FAILURE', req, metadata: { failedAttempts: user.failedLoginAttempts } });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if email is verified (only when ENABLE_EMAIL_VERIFICATION=true)
        const isEmailVerificationRequired = process.env.ENABLE_EMAIL_VERIFICATION === 'true';
        if (isEmailVerificationRequired && user.isEmailVerified === false) {
            logSecurityAudit({ user, userEmail: user.email, action: 'LOGIN_FAILURE', status: 'BLOCKED', req, metadata: { reason: 'Email unverified' } });
            return res.status(403).json({
                message: 'Email verification required. Please check your inbox or resend verification link.',
                isEmailVerified: false,
                email: user.email
            });
        }

        // Reset failed login count on success
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        // Check for new device login
        const existingSessions = await Session.find({ user: user._id, isActive: true });
        const userAgentStr = req.headers['user-agent'] || '';
        const { browser, operatingSystem, deviceName } = parseUserAgent(userAgentStr);
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
        const ipAddress = rawIp === '::1' ? '127.0.0.1' : rawIp;

        const isKnownDevice = existingSessions.some(s => s.browser === browser && s.operatingSystem === operatingSystem);
        if (existingSessions.length > 0 && !isKnownDevice) {
            logSecurityAudit({ user, userEmail: user.email, action: 'NEW_DEVICE_LOGIN', status: 'WARNING', req, metadata: { browser, operatingSystem, ipAddress } });
            sendSecurityAlertEmail(user.email, user.profile?.fullName || user.username, 'NEW_DEVICE', { browser, operatingSystem, ipAddress, date: new Date().toLocaleString() });
        }

        // Generate unique tokenId for session
        const tokenId = crypto.randomUUID();

        await Session.create({
            user: user._id,
            tokenId,
            deviceName,
            browser,
            operatingSystem,
            ipAddress,
            userAgent: userAgentStr,
            isActive: true,
            lastActivity: new Date()
        });

        logSecurityAudit({ user, userEmail: user.email, action: 'SESSION_CREATED', status: 'SUCCESS', req, metadata: { deviceName, browser, operatingSystem } });
        logSecurityAudit({ user, userEmail: user.email, action: 'LOGIN_SUCCESS', status: 'SUCCESS', req });
        if (user.role === 'admin') {
            logSecurityAudit({ user, userEmail: user.email, action: 'ADMIN_LOGIN', status: 'SUCCESS', req });
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            reputation: user.reputation,
            isEmailVerified: user.isEmailVerified,
            token: generateToken(user._id, tokenId),
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
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
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Forgot Password - request reset link
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const genericMessage = 'If an account exists for this email, a password reset link has been sent.';

        if (!email) {
            return res.status(200).json({ message: genericMessage });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            logSecurityAudit({ userEmail: email, action: 'PASSWORD_RESET_REQUEST', status: 'WARNING', req, metadata: { reason: 'Email not found' } });
            return res.status(200).json({ message: genericMessage });
        }

        const unhashedToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = resetExpires;
        await user.save();

        logSecurityAudit({ user: sanitizeUserForAudit(user), userEmail: user.email, action: 'PASSWORD_RESET_REQUEST', status: 'SUCCESS', req });

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${unhashedToken}`;

        const displayName = user.profile?.fullName || user.username;
        try {
            await sendPasswordResetEmail(user.email, displayName, resetUrl);
        } catch (emailErr) {
            console.error('⚠️ Password reset email dispatch failed:', emailErr.message);
        }

        res.status(200).json({ message: genericMessage });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Reset Password - set new password using valid token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(422).json({ message: 'Password and confirmPassword are required' });
        }

        if (password !== confirmPassword) {
            return res.status(422).json({ message: 'Passwords do not match.' });
        }

        if (password.length < 6) {
            return res.status(422).json({ message: 'Password must be at least 6 characters long.' });
        }

        if (!token) {
            return res.status(400).json({ message: 'Reset token is invalid or has already been used.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({ passwordResetToken: hashedToken });

        if (!user) {
            logSecurityAudit({ action: 'PASSWORD_RESET_SUCCESS', status: 'FAILURE', req, metadata: { reason: 'Invalid or reused token' } });
            return res.status(400).json({ message: 'Reset token is invalid or has already been used.' });
        }

        if (user.passwordResetExpires && user.passwordResetExpires.getTime() <= Date.now()) {
            logSecurityAudit({ user: sanitizeUserForAudit(user), userEmail: user.email, action: 'PASSWORD_RESET_SUCCESS', status: 'FAILURE', req, metadata: { reason: 'Expired token' } });
            return res.status(410).json({
                message: 'Password reset link has expired. Please request a new link.',
                expired: true
            });
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        logSecurityAudit({ user: sanitizeUserForAudit(user), userEmail: user.email, action: 'PASSWORD_RESET_SUCCESS', status: 'SUCCESS', req });
        sendSecurityAlertEmail(user.email, user.profile?.fullName || user.username, 'PASSWORD_CHANGED');

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select(
                '_id username email role profile reputation verified isEmailVerified ' +
                'isOnline lastSeen notificationPreferences createdAt ' +
                'wallet.balance wallet.totalWithdrawn wallet.pendingWithdrawal'
            );
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            const { profile: nestedProfile, currentPassword, newPassword } = req.body;
            const allowedProfileFields = ['fullName', 'bio', 'skills', 'university', 'avatar', 'hourlyRate', 'location', 'phone'];

            if (nestedProfile) {
                const sanitisedProfile = {};
                for (const field of allowedProfileFields) {
                    if (nestedProfile[field] !== undefined) {
                        sanitisedProfile[field] = nestedProfile[field];
                    }
                }
                user.profile = { ...user.profile, ...sanitisedProfile };
            }

            const updatedUser = await user.save();
            res.json(updatedUser.getPublicProfile());
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
