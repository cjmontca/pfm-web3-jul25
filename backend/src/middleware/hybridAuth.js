const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Lista de wallets autorizadas como super-admin (configurable)
const AUTHORIZED_SUPER_ADMIN_WALLETS = process.env.SUPER_ADMIN_WALLETS 
    ? process.env.SUPER_ADMIN_WALLETS.split(',').map(w => w.toLowerCase())
    : [
        '0x25E93088a2ab13E6C4732122C996e56Ef85fcF79', // Ejemplo - cambiar por tu wallet
        '0x123456789abcdef123456789abcdef123456789a'   // Wallet adicional
    ];

// Verificar firma de MetaMask
const verifyMetaMaskSignature = (message, signature, address) => {
    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
        logger.error('Error verifying MetaMask signature:', error);
        return false;
    }
};

// Middleware híbrido que soporta JWT y MetaMask
const hybridAuth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const metaMaskAuth = req.header('X-MetaMask-Auth');
        
        // Verificar si es autenticación MetaMask
        if (metaMaskAuth) {
            return handleMetaMaskAuth(req, res, next, metaMaskAuth);
        }
        
        // Verificar si es autenticación JWT tradicional
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return handleJWTAuth(req, res, next, authHeader);
        }
        
        return res.status(401).json({
            success: false,
            error: 'No authentication provided'
        });
        
    } catch (error) {
        logger.error('Hybrid auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during authentication'
        });
    }
};

// Manejar autenticación JWT (organizaciones)
const handleJWTAuth = (req, res, next, authHeader) => {
    try {
        const token = authHeader.substring(7);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No JWT token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = {
            ...decoded,
            authType: 'jwt',
            isSuperAdmin: false
        };
        
        logger.info(`JWT User ${decoded.id} (${decoded.organization}) authenticated`);
        next();
        
    } catch (error) {
        logger.error('JWT auth error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid JWT token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'JWT token expired'
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'JWT verification failed'
        });
    }
};

// Manejar autenticación MetaMask (super-admin)
const handleMetaMaskAuth = (req, res, next, metaMaskAuth) => {
    try {
        const authData = JSON.parse(metaMaskAuth);
        const { address, signature, message, timestamp } = authData;
        
        // Validar estructura de datos
        if (!address || !signature || !message || !timestamp) {
            return res.status(401).json({
                success: false,
                error: 'Incomplete MetaMask authentication data'
            });
        }
        
        // Verificar que la wallet está autorizada
        if (!AUTHORIZED_SUPER_ADMIN_WALLETS.includes(address.toLowerCase())) {
            logger.warn(`Unauthorized wallet attempted access: ${address}`);
            return res.status(403).json({
                success: false,
                error: 'Wallet not authorized as super-admin'
            });
        }
        
        // Verificar que el timestamp no sea muy antiguo (5 minutos)
        const now = Date.now();
        const authTime = parseInt(timestamp);
        const MAX_AUTH_AGE = 5 * 60 * 1000; // 5 minutos
        
        if (now - authTime > MAX_AUTH_AGE) {
            return res.status(401).json({
                success: false,
                error: 'MetaMask authentication expired'
            });
        }
        
        // Verificar la firma
        if (!verifyMetaMaskSignature(message, signature, address)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid MetaMask signature'
            });
        }
        
        // Autenticación exitosa - crear usuario super-admin
        req.user = {
            id: address,
            username: 'super_admin',
            address: address,
            organization: 'SuperAdminMSP',
            role: 'super_admin',
            fullName: 'Super Administrador',
            authType: 'metamask',
            isSuperAdmin: true,
            authTimestamp: authTime
        };
        
        logger.info(`MetaMask Super-Admin ${address} authenticated`);
        next();
        
    } catch (error) {
        logger.error('MetaMask auth error:', error);
        return res.status(401).json({
            success: false,
            error: 'MetaMask authentication failed'
        });
    }
};

// Middleware específico para super-admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.user || !req.user.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Super-admin access required'
        });
    }
    next();
};

// Middleware que permite tanto organizaciones como super-admin
const orgOrSuperAdmin = (allowedOrgs = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        // Si es super-admin, permitir acceso
        if (req.user.isSuperAdmin) {
            return next();
        }
        
        // Si es organización, verificar permisos
        if (allowedOrgs.length === 0 || allowedOrgs.includes(req.user.organization)) {
            return next();
        }
        
        return res.status(403).json({
            success: false,
            error: 'Access denied: insufficient permissions'
        });
    };
};

module.exports = { 
    hybridAuth, 
    requireSuperAdmin, 
    orgOrSuperAdmin,
    AUTHORIZED_SUPER_ADMIN_WALLETS 
};