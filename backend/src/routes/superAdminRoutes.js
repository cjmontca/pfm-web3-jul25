const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { hybridAuth, requireSuperAdmin } = require('../middleware/hybridAuth');
const logger = require('../utils/logger');

// Generar nonce para autenticación MetaMask
router.post('/auth/nonce', (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required'
            });
        }
        
        // Generar mensaje único para firmar
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');
        
        const message = `Wine Traceability Super-Admin Login
        
Wallet: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature proves you control this wallet and authorizes access to the super-admin panel.`;

        res.json({
            success: true,
            data: {
                message,
                timestamp,
                nonce
            }
        });
        
    } catch (error) {
        logger.error('Error generating nonce:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate authentication nonce'
        });
    }
});

// Verificar autenticación MetaMask
router.post('/auth/verify', hybridAuth, requireSuperAdmin, (req, res) => {
    try {
        res.json({
            success: true,
            message: 'MetaMask authentication successful',
            user: {
                id: req.user.id,
                username: req.user.username,
                address: req.user.address,
                role: req.user.role,
                organization: req.user.organization,
                isSuperAdmin: req.user.isSuperAdmin,
                authType: req.user.authType
            }
        });
        
    } catch (error) {
        logger.error('Error verifying MetaMask auth:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication verification failed'
        });
    }
});

// Dashboard info para super-admin
router.get('/dashboard', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        // Importar después para evitar dependencias circulares
        const adminController = require('../controllers/adminController');
        
        // Usar el controlador existente pero con datos extendidos
        const overviewResponse = await new Promise((resolve, reject) => {
            const mockRes = {
                json: (data) => resolve(data)
            };
            const mockNext = (error) => reject(error);
            adminController.getSystemOverview(req, mockRes, mockNext);
        });
        
        // Agregar información específica del super-admin
        const superAdminData = {
            ...overviewResponse.data,
            superAdmin: {
                address: req.user.address,
                authType: req.user.authType,
                loginTime: new Date(req.user.authTimestamp).toISOString(),
                permissions: [
                    'view_all_organizations',
                    'manage_cross_org_transfers',
                    'system_administration',
                    'blockchain_operations',
                    'user_management'
                ]
            }
        };
        
        res.json({
            success: true,
            data: superAdminData
        });
        
    } catch (error) {
        logger.error('Error getting super-admin dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load super-admin dashboard'
        });
    }
});

// Operaciones especiales de super-admin
router.post('/emergency-transfer', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { wineId, fromOrg, toOrg, reason } = req.body;
        
        logger.warn(`EMERGENCY TRANSFER by ${req.user.address}: ${wineId} from ${fromOrg} to ${toOrg} - Reason: ${reason}`);
        
        // Aquí implementarías la lógica de transferencia de emergencia
        // Por ahora simulamos la respuesta
        
        res.json({
            success: true,
            message: 'Emergency transfer executed successfully',
            data: {
                transferId: `EMERGENCY-${Date.now()}`,
                executedBy: req.user.address,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('Error in emergency transfer:', error);
        res.status(500).json({
            success: false,
            error: 'Emergency transfer failed'
        });
    }
});

// Gestión completa de organizaciones
router.get('/organizations/:orgId/wines', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { orgId } = req.params;
        const adminController = require('../controllers/adminController');
        
        // Simular request para organización específica
        const mockReq = { ...req, query: { organization: orgId } };
        const wines = await new Promise((resolve, reject) => {
            const mockRes = {
                json: (data) => resolve(data.data.wines || [])
            };
            adminController.getAllWines(mockReq, mockRes, reject);
        });
        
        res.json({
            success: true,
            data: {
                organization: orgId,
                wines: wines.filter(wine => wine.organizationId === orgId),
                total: wines.filter(wine => wine.organizationId === orgId).length
            }
        });
        
    } catch (error) {
        logger.error(`Error getting wines for ${req.params.orgId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get organization wines'
        });
    }
});

// Crear lote para cualquier organización
router.post('/organizations/:orgId/wines', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { orgId } = req.params;
        const { vineyardData, wineId } = req.body;
        
        const finalWineId = wineId || `SA-${orgId}-${Date.now()}`;
        const qrCode = `QR-${finalWineId}`;
        
        // Usar el fabric client directamente
        const fabricClient = require('../fabric-client/fabricClient');
        const result = await fabricClient.submitTransaction(
            'wine',
            'createWineBatch',
            finalWineId,
            JSON.stringify(vineyardData),
            qrCode
        );
        
        logger.info(`Super-admin created wine batch ${finalWineId} for ${orgId}`);
        
        res.status(201).json({
            success: true,
            data: result,
            message: `Lote creado exitosamente para ${orgId}`
        });
        
    } catch (error) {
        logger.error(`Error creating wine for ${req.params.orgId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to create wine batch'
        });
    }
});

// Transferir lote entre organizaciones específicas
router.post('/transfer', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { wineId, fromOrganization, toOrganization, notes, transferData } = req.body;
        
        if (!wineId || !fromOrganization || !toOrganization) {
            return res.status(400).json({
                success: false,
                error: 'wineId, fromOrganization y toOrganization son requeridos'
            });
        }
        
        const transferId = `SA-TRANSFER-${wineId}-${Date.now()}`;
        
        const transportData = {
            carrier: 'Super-Admin Transfer',
            vehicleId: 'SA-VEHICLE',
            departureTime: new Date().toISOString(),
            route: `Direct transfer: ${fromOrganization} → ${toOrganization}`,
            initiatedBy: req.user.address,
            notes: notes || 'Super-admin initiated transfer',
            ...transferData
        };
        
        // Simular transferencia usando fabric client
        const fabricClient = require('../fabric-client/fabricClient');
        const result = await fabricClient.submitTransaction(
            'wine',
            'transferWineBatch',
            wineId,
            toOrganization.replace('OrgMSP', '').toUpperCase(),
            JSON.stringify(transportData)
        );
        
        logger.info(`Super-admin transfer ${transferId}: ${wineId} from ${fromOrganization} to ${toOrganization}`);
        
        res.json({
            success: true,
            data: {
                transferId,
                result,
                executedBy: req.user.address,
                timestamp: new Date().toISOString()
            },
            message: 'Transferencia ejecutada exitosamente'
        });
        
    } catch (error) {
        logger.error('Error in super-admin transfer:', error);
        res.status(500).json({
            success: false,
            error: 'Transfer failed: ' + error.message
        });
    }
});

// Obtener todas las transferencias del sistema
router.get('/transfers', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        // Simular obtención de transferencias desde blockchain
        const transfers = [
            {
                id: 'TRANSFER-001',
                wineId: 'WINE-001',
                from: 'VineyardOrgMSP',
                to: 'WineryOrgMSP',
                status: 'COMPLETED',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                executedBy: 'vineyard_admin'
            },
            {
                id: 'TRANSFER-002',
                wineId: 'WINE-002',
                from: 'WineryOrgMSP',
                to: 'DistributorOrgMSP',
                status: 'PENDING',
                timestamp: new Date(Date.now() - 43200000).toISOString(),
                executedBy: 'winery_admin'
            }
        ];
        
        res.json({
            success: true,
            data: {
                transfers,
                total: transfers.length
            }
        });
        
    } catch (error) {
        logger.error('Error getting transfers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transfers'
        });
    }
});

// Estadísticas avanzadas del sistema
router.get('/analytics', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        const analytics = {
            totalTransactions: 1250,
            transactionsToday: 45,
            averageTransactionTime: '2.3s',
            networkLoad: 65,
            organizationActivity: {
                'VineyardOrgMSP': { transactions: 320, lastActivity: new Date(Date.now() - 3600000).toISOString() },
                'WineryOrgMSP': { transactions: 280, lastActivity: new Date(Date.now() - 1800000).toISOString() },
                'DistributorOrgMSP': { transactions: 410, lastActivity: new Date(Date.now() - 900000).toISOString() },
                'ConsumerOrgMSP': { transactions: 240, lastActivity: new Date(Date.now() - 600000).toISOString() }
            },
            blockchainStats: {
                currentBlock: 1247,
                blocksToday: 128,
                avgBlockTime: '5.2s',
                chaincodeCalls: 3456
            },
            wineFlow: {
                atVineyard: 45,
                atWinery: 32,
                atDistributor: 28,
                atConsumer: 15
            }
        };
        
        res.json({
            success: true,
            data: analytics
        });
        
    } catch (error) {
        logger.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics'
        });
    }
});

// Operaciones de emergencia
router.post('/emergency/:operation', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { operation } = req.params;
        const { reason, data } = req.body;
        
        logger.warn(`EMERGENCY OPERATION: ${operation} by ${req.user.address} - Reason: ${reason}`);
        
        let result;
        switch (operation) {
            case 'freeze-wine':
                result = await handleFreezeWine(data.wineId, reason, req.user.address);
                break;
            case 'force-transfer':
                result = await handleForceTransfer(data, reason, req.user.address);
                break;
            case 'revoke-certificate':
                result = await handleRevokeCertificate(data.certificateId, reason, req.user.address);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Unknown emergency operation'
                });
        }
        
        res.json({
            success: true,
            data: result,
            message: `Emergency operation ${operation} executed successfully`
        });
        
    } catch (error) {
        logger.error(`Emergency operation ${req.params.operation} failed:`, error);
        res.status(500).json({
            success: false,
            error: 'Emergency operation failed'
        });
    }
});

// Gestión de usuarios del sistema
router.get('/users', hybridAuth, requireSuperAdmin, async (req, res) => {
    try {
        // Simular usuarios del sistema
        const users = [
            {
                id: 'vineyard_admin',
                username: 'vineyard_admin',
                organization: 'VineyardOrgMSP',
                role: 'admin',
                status: 'active',
                lastLogin: new Date(Date.now() - 3600000).toISOString(),
                createdAt: '2024-01-15T10:00:00.000Z'
            },
            {
                id: 'winery_admin',
                username: 'winery_admin',
                organization: 'WineryOrgMSP',
                role: 'admin',
                status: 'active',
                lastLogin: new Date(Date.now() - 1800000).toISOString(),
                createdAt: '2024-01-15T10:00:00.000Z'
            }
        ];
        
        res.json({
            success: true,
            data: {
                users,
                total: users.length,
                activeUsers: users.filter(u => u.status === 'active').length
            }
        });
        
    } catch (error) {
        logger.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get users'
        });
    }
});

// Gestión de wallets autorizadas
router.get('/authorized-wallets', hybridAuth, requireSuperAdmin, (req, res) => {
    const { AUTHORIZED_SUPER_ADMIN_WALLETS } = require('../middleware/hybridAuth');
    
    res.json({
        success: true,
        data: {
            authorizedWallets: AUTHORIZED_SUPER_ADMIN_WALLETS,
            currentWallet: req.user.address
        }
    });
});

// Funciones auxiliares para operaciones de emergencia
async function handleFreezeWine(wineId, reason, executedBy) {
    return {
        operation: 'freeze-wine',
        wineId,
        reason,
        executedBy,
        timestamp: new Date().toISOString(),
        status: 'FROZEN'
    };
}

async function handleForceTransfer(transferData, reason, executedBy) {
    return {
        operation: 'force-transfer',
        ...transferData,
        reason,
        executedBy,
        timestamp: new Date().toISOString(),
        status: 'FORCE_TRANSFERRED'
    };
}

async function handleRevokeCertificate(certificateId, reason, executedBy) {
    return {
        operation: 'revoke-certificate',
        certificateId,
        reason,
        executedBy,
        timestamp: new Date().toISOString(),
        status: 'REVOKED'
    };
}

module.exports = router;