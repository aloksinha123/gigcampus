/**
 * OpenAPI 3.0.0 Base Specification & Components Definition
 */
export const openapiDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'GigCampus API',
        version: '1.0.0',
        description: 'Production-ready REST API for the GigCampus Freelancing Platform.',
        contact: {
            name: 'GigCampus Support Team',
            email: 'support@gigcampus.com'
        }
    },
    servers: [
        {
            url: 'http://localhost:5003/api',
            description: 'Local Development Server'
        },
        {
            url: '/api',
            description: 'Production API Server'
        }
    ],
    tags: [
        { name: 'Authentication', description: 'User Registration, Login, Email Verification, & Password Management' },
        { name: 'Users', description: 'User Profile Management & Public Freelancer Search' },
        { name: 'Projects', description: 'Project Listings, Marketplace Creation, & Status Updates' },
        { name: 'Bids', description: 'Freelancer Bidding & Proposal Submissions' },
        { name: 'Payments', description: 'Escrow Deposits, Milestone Release, & Payment Disputation' },
        { name: 'AI', description: 'AI Project Description Enhancements & Bid Analysis' },
        { name: 'Messages', description: 'Real-time Project Chat, Attachments, & Read Receipts' },
        { name: 'Notifications', description: 'User System Notifications' },
        { name: 'Admin', description: 'Platform Moderation, Analytics, & Security Audit' },
        { name: 'Sessions', description: 'Multi-Device Active Session Management' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Provide a valid JWT bearer token obtained from /auth/login or /auth/register.'
            }
        },
        schemas: {
            ApiError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error description or validation failure' }
                }
            },
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66a1b2c3d4e5f67890123456' },
                    username: { type: 'string', example: 'alex_developer' },
                    email: { type: 'string', example: 'alex@example.com' },
                    role: { type: 'string', enum: ['student', 'freelancer', 'admin'], example: 'freelancer' },
                    isEmailVerified: { type: 'boolean', example: true },
                    isOnline: { type: 'boolean', example: true },
                    profile: {
                        type: 'object',
                        properties: {
                            fullName: { type: 'string', example: 'Alex Morgan' },
                            bio: { type: 'string', example: 'Full-stack MERN & AI Developer' },
                            skills: { type: 'array', items: { type: 'string' }, example: ['React', 'Node.js', 'MongoDB'] },
                            university: { type: 'string', example: 'Stanford University' },
                            hourlyRate: { type: 'number', example: 45 }
                        }
                    },
                    reputation: {
                        type: 'object',
                        properties: {
                            rating: { type: 'number', example: 4.9 },
                            totalReviews: { type: 'integer', example: 18 }
                        }
                    },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Project: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66a1b2c3d4e5f67890987654' },
                    title: { type: 'string', example: 'Build React Dashboard for E-Commerce' },
                    description: { type: 'string', example: 'Need an experienced freelancer to create a modern Vite + React dashboard.' },
                    category: { type: 'string', example: 'Web Development' },
                    budget: { type: 'number', example: 500 },
                    deadline: { type: 'string', format: 'date-time' },
                    skillsRequired: { type: 'array', items: { type: 'string' }, example: ['React', 'Tailwind'] },
                    status: { type: 'string', enum: ['open', 'in_progress', 'completed', 'cancelled'], example: 'open' },
                    student: { type: 'string', description: 'User ID of project owner' },
                    freelancer: { type: 'string', description: 'User ID of hired freelancer' },
                    bidsCount: { type: 'integer', example: 4 },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Bid: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66b2c3d4e5f6789012345678' },
                    project: { type: 'string', description: 'Project ID' },
                    freelancer: { type: 'string', description: 'Freelancer User ID' },
                    amount: { type: 'number', example: 450 },
                    deliveryTime: { type: 'integer', description: 'Days to complete', example: 7 },
                    proposal: { type: 'string', example: 'I can deliver this project with clean code and complete documentation.' },
                    status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'withdrawn'], example: 'pending' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Payment: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66c3d4e5f678901234567890' },
                    project: { type: 'string', description: 'Project ID' },
                    student: { type: 'string', description: 'Student User ID' },
                    freelancer: { type: 'string', description: 'Freelancer User ID' },
                    amount: { type: 'number', example: 500 },
                    escrowStatus: { type: 'string', enum: ['pending', 'held', 'released', 'refunded', 'disputed'], example: 'held' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Message: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66d4e5f67890123456789012' },
                    project: { type: 'string', description: 'Project ID' },
                    sender: { type: 'string', description: 'User ID of sender' },
                    receiver: { type: 'string', description: 'User ID of receiver' },
                    text: { type: 'string', example: 'Hey! Here is the latest progress update.' },
                    attachments: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string', enum: ['sent', 'delivered', 'read'], example: 'read' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Notification: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66e5f6789012345678901234' },
                    recipient: { type: 'string', description: 'User ID' },
                    title: { type: 'string', example: 'New Bid Received' },
                    message: { type: 'string', example: 'Alex submitted a bid on your project.' },
                    type: { type: 'string', example: 'bid_received' },
                    read: { type: 'boolean', example: false },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            Session: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66f678901234567890123456' },
                    user: { type: 'string' },
                    tokenId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab' },
                    deviceName: { type: 'string', example: 'Windows PC' },
                    browser: { type: 'string', example: 'Google Chrome' },
                    operatingSystem: { type: 'string', example: 'Windows' },
                    ipAddress: { type: 'string', example: '127.0.0.1' },
                    isActive: { type: 'boolean', example: true },
                    lastActivity: { type: 'string', format: 'date-time' }
                }
            },
            AIRecommendation: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    improvedDescription: { type: 'string', example: 'Enhanced project description generated by Gemini AI.' },
                    suggestions: { type: 'array', items: { type: 'string' } }
                }
            }
        }
    }
};
