import FraudEvent from '../models/FraudEvent.js';
import User from '../models/User.js';
import { FRAUD_WEIGHTS, RISK_THRESHOLDS, FRAUD_LIMITS } from '../config/fraudConfig.js';
import { logSecurityAudit } from './auditService.js';
import mongoose from 'mongoose';

/**
 * Calculates risk score and maps it to a risk level based on configured weights.
 * @param {Array<string>} signals - Array of fraud signal names
 * @returns {Object} { score: number, riskLevel: string }
 */
export const calculateRiskScore = (signals) => {
    let score = 0;
    const uniqueSignals = Array.from(new Set(signals));
    
    uniqueSignals.forEach(sig => {
        const weight = FRAUD_WEIGHTS[sig] || 0;
        score += weight;
    });

    score = Math.min(score, 100);

    let riskLevel = 'LOW';
    if (score >= 80) {
        riskLevel = 'CRITICAL';
    } else if (score >= 60) {
        riskLevel = 'HIGH';
    } else if (score >= 30) {
        riskLevel = 'MEDIUM';
    }

    return { score, riskLevel };
};

/**
 * Records a single fraud signal, updates active event (if within cooldown), or spawns a new one.
 * @param {string|null} userId - Mongoose ID of the user (can be null for unauthenticated events)
 * @param {string} signalType - Name of the signal triggered
 * @param {Object} req - Express request object for IP/Browser metadata extraction
 * @param {Object} customMetadata - Optional additional contextual information
 * @returns {Promise<Object>} Updated/Created FraudEvent document
 */
export const recordFraudSignal = async (userId, signalType, req = null, customMetadata = {}) => {
    try {
        let resolvedUserId = userId;
        
        // If user is not logged in but email is in request body, resolve identity
        if (!resolvedUserId && req && req.body && req.body.email) {
            try {
                const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
                if (user) resolvedUserId = user._id;
            } catch (err) {
                console.error('Failed to resolve user identity during fraud logging:', err.message);
            }
        }

        // If no user could be resolved, log as an unauthenticated audit entry and exit
        if (!resolvedUserId) {
            console.warn(`⚠️ [UNAUTHENTICATED FRAUD SIGNAL] Type: ${signalType} | Meta: ${JSON.stringify(customMetadata)}`);
            return null;
        }

        const cooldownWindow = FRAUD_LIMITS.COOLDOWN_WINDOW_MINS || 5;
        const cooldownThreshold = new Date(Date.now() - cooldownWindow * 60 * 1000);

        // Check if there is an active event of this type within the cooldown window
        let event = await FraudEvent.findOne({
            userId: resolvedUserId,
            eventType: signalType,
            status: { $in: ['OPEN', 'REVIEWING'] },
            updatedAt: { $gte: cooldownThreshold }
        });

        const clientIp = req ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
        const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'Unknown';

        const mergedMetadata = {
            ipAddress: clientIp,
            userAgent,
            ...customMetadata,
            timestamp: new Date().toISOString()
        };

        if (event) {
            // Deduplicate/Cooldown: Append to existing active alert
            if (!event.signals.includes(signalType)) {
                event.signals.push(signalType);
            }
            
            // Re-evaluate risk score
            const { score, riskLevel } = calculateRiskScore(event.signals);
            event.riskScore = score;
            event.riskLevel = riskLevel;
            event.metadata = { ...event.metadata.toObject(), ...mergedMetadata };
            
            await event.save();
            console.log(`📌 [FRAUD EVENT UPDATED] User: ${resolvedUserId} | EventType: ${signalType} | Risk: ${riskLevel} (${score})`);
            return event;
        } else {
            // Create a new FraudEvent
            const signals = [signalType];
            const { score, riskLevel } = calculateRiskScore(signals);

            const newEvent = await FraudEvent.create({
                userId: resolvedUserId,
                eventType: signalType,
                riskScore: score,
                riskLevel,
                signals,
                status: 'OPEN',
                metadata: mergedMetadata,
                entityType: customMetadata.entityType || null,
                entityId: customMetadata.entityId || null
            });

            console.warn(`🚨 [NEW FRAUD EVENT CREATED] User: ${resolvedUserId} | EventType: ${signalType} | Risk: ${riskLevel} (${score})`);
            
            // Log security audit for serious alerts
            if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
                logSecurityAudit({
                    user: resolvedUserId,
                    action: 'FRAUD_ALERT_TRIGGERED',
                    status: 'WARNING',
                    req,
                    metadata: { eventId: newEvent._id, eventType: signalType, riskLevel, score }
                });
            }

            return newEvent;
        }
    } catch (error) {
        console.error('Error recording fraud signal:', error);
        return null;
    }
};

/**
 * Returns a user's calculated risk profile aggregating all open/reviewing alerts.
 * @param {string} userId - User Mongoose ID
 * @returns {Promise<Object>} Risk Profile Object
 */
export const getUserRiskProfile = async (userId) => {
    try {
        const events = await FraudEvent.find({
            userId,
            status: { $in: ['OPEN', 'REVIEWING'] }
        }).sort({ createdAt: -1 });

        const allSignals = [];
        events.forEach(e => {
            e.signals.forEach(s => allSignals.push(s));
        });

        const { score, riskLevel } = calculateRiskScore(allSignals);

        return {
            userId,
            riskScore: score,
            riskLevel,
            activeAlertsCount: events.length,
            signals: Array.from(new Set(allSignals)),
            events
        };
    } catch (error) {
        console.error('Error fetching user risk profile:', error.message);
        return {
            userId,
            riskScore: 0,
            riskLevel: 'LOW',
            activeAlertsCount: 0,
            signals: [],
            events: []
        };
    }
};

export default {
    calculateRiskScore,
    recordFraudSignal,
    getUserRiskProfile
};
