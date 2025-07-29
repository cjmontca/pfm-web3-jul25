const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const users = new Map();

const generateTokens = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        organization: user.organization,
        role: user.role
    };

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    return { accessToken };
};

const authController = {
    async register(req, res, next) {
        try {
            const { username, email, password, organization, role, fullName } = req.body;

            const existingUser = Array.from(users.values()).find(
                user => user.username === username || user.email === email
            );

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'User with this username or email already exists'
                });
            }

            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const newUser = {
                id: userId,
                username,
                email,
                password: hashedPassword,
                organization,
                role,
                fullName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            };

            users.set(userId, newUser);

            const tokens = generateTokens(newUser);

            logger.info(`User ${username} registered successfully for organization ${organization}`);

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        email: newUser.email,
                        organization: newUser.organization,
                        role: newUser.role,
                        fullName: newUser.fullName
                    },
                    tokens
                },
                message: 'User registered successfully'
            });

        } catch (error) {
            logger.error('Error registering user:', error);
            next(error);
        }
    },

    async login(req, res, next) {
        try {
            const { username, password, organization } = req.body;

            const user = Array.from(users.values()).find(
                user => user.username === username && user.organization === organization
            );

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is inactive'
                });
            }

            const tokens = generateTokens(user);

            user.lastLogin = new Date().toISOString();
            users.set(user.id, user);

            logger.info(`User ${username} logged in successfully`);

            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        organization: user.organization,
                        role: user.role,
                        fullName: user.fullName
                    },
                    tokens
                },
                message: 'Login successful'
            });

        } catch (error) {
            logger.error('Error during login:', error);
            next(error);
        }
    },

    async refreshToken(req, res, next) {
        try {
            const user = users.get(req.user.id);

            if (!user || !user.isActive) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found or inactive'
                });
            }

            const tokens = generateTokens(user);

            res.json({
                success: true,
                data: { tokens },
                message: 'Token refreshed successfully'
            });

        } catch (error) {
            logger.error('Error refreshing token:', error);
            next(error);
        }
    },

    async logout(req, res, next) {
        try {
            logger.info(`User ${req.user.username} logged out`);

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            logger.error('Error during logout:', error);
            next(error);
        }
    },

    async getProfile(req, res, next) {
        try {
            const user = users.get(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    organization: user.organization,
                    role: user.role,
                    fullName: user.fullName,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                }
            });

        } catch (error) {
            logger.error('Error getting profile:', error);
            next(error);
        }
    },

    async updateProfile(req, res, next) {
        try {
            const { fullName, email } = req.body;
            const user = users.get(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (email && email !== user.email) {
                const existingUser = Array.from(users.values()).find(
                    u => u.email === email && u.id !== user.id
                );

                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        error: 'Email already in use'
                    });
                }
            }

            user.fullName = fullName || user.fullName;
            user.email = email || user.email;
            user.updatedAt = new Date().toISOString();

            users.set(user.id, user);

            logger.info(`User ${user.username} updated profile`);

            res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    organization: user.organization,
                    role: user.role,
                    fullName: user.fullName,
                    updatedAt: user.updatedAt
                },
                message: 'Profile updated successfully'
            });

        } catch (error) {
            logger.error('Error updating profile:', error);
            next(error);
        }
    },

    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = users.get(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
            
            user.password = hashedNewPassword;
            user.updatedAt = new Date().toISOString();

            users.set(user.id, user);

            logger.info(`User ${user.username} changed password`);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            logger.error('Error changing password:', error);
            next(error);
        }
    }
};

const initializeDefaultUsers = () => {
    const defaultUsers = [
        {
            id: 'admin_vineyard',
            username: 'vineyard_admin',
            email: 'admin@vineyard.wine-traceability.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdU5n7D8kD0/z1vKy', // password123
            organization: 'VineyardOrgMSP',
            role: 'admin',
            fullName: 'Vineyard Administrator',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'admin_winery',
            username: 'winery_admin',
            email: 'admin@winery.wine-traceability.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdU5n7D8kD0/z1vKy', // password123
            organization: 'WineryOrgMSP',
            role: 'admin',
            fullName: 'Winery Administrator',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'admin_distributor',
            username: 'distributor_admin',
            email: 'admin@distributor.wine-traceability.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdU5n7D8kD0/z1vKy', // password123
            organization: 'DistributorOrgMSP',
            role: 'admin',
            fullName: 'Distributor Administrator',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'admin_consumer',
            username: 'consumer_admin',
            email: 'admin@consumer.wine-traceability.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdU5n7D8kD0/z1vKy', // password123
            organization: 'ConsumerOrgMSP',
            role: 'admin',
            fullName: 'Consumer Administrator',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'admin_general',
            username: 'system_admin',
            email: 'admin@wine-traceability.com',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdU5n7D8kD0/z1vKy', // password123
            organization: 'SystemAdminMSP',
            role: 'super_admin',
            fullName: 'System Administrator',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    defaultUsers.forEach(user => {
        users.set(user.id, user);
    });

    logger.info('Default users initialized');
};

initializeDefaultUsers();

module.exports = authController;