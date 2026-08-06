import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    console.log("Authorization Header:");
    console.log(req.headers.authorization);

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            console.log("Extracted Token:");
            console.log(token);

            if (!token || token === 'undefined' || token === 'null' || !token.trim()) {
                return res.status(401).json({ message: 'Not authorized, token is missing or empty' });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (!req.user.isActive) {
                return res.status(401).json({ message: 'Account is deactivated' });
            }

            return next();
        } catch (error) {
            console.error('JWT Error in protect middleware:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin middleware
export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

// Freelancer middleware
export const freelancer = (req, res, next) => {
    if (req.user && (req.user.role === 'freelancer' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as freelancer' });
    }
};

// Student/Client middleware
export const student = (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as student' });
    }
};
