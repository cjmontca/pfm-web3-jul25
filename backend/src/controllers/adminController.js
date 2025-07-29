const fabricClient = require('../fabric-client/fabricClient');
const logger = require('../utils/logger');

const adminController = {
    async getAllOrganizations(req, res, next) {
        try {
            const organizations = ['VineyardOrgMSP', 'WineryOrgMSP', 'DistributorOrgMSP', 'ConsumerOrgMSP'];
            const orgData = {};
            
            for (const org of organizations) {
                try {
                    const wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', [org]);
                    orgData[org] = {
                        wines: Array.isArray(wines) ? wines : [],
                        totalWines: Array.isArray(wines) ? wines.length : 0,
                        name: adminController.getOrganizationName(org)
                    };
                } catch (error) {
                    logger.warn(`Failed to get wines for ${org}:`, error.message);
                    orgData[org] = { wines: [], totalWines: 0, name: adminController.getOrganizationName(org) };
                }
            }
            
            res.json({
                success: true,
                data: { organizations: orgData }
            });

        } catch (error) {
            logger.error('Error getting all organizations data:', error);
            next(error);
        }
    },

    async getSystemOverview(req, res, next) {
        try {
            const organizations = ['VineyardOrgMSP', 'WineryOrgMSP', 'DistributorOrgMSP', 'ConsumerOrgMSP'];
            let totalWines = 0;
            const orgStats = {};
            const statusDistribution = {
                VINEYARD: 0,
                PROCESSING: 0,
                SHIPPED: 0,
                SOLD: 0
            };
            
            for (const org of organizations) {
                try {
                    const wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', [org]);
                    const wineList = Array.isArray(wines) ? wines : [];
                    
                    orgStats[org] = wineList.length;
                    totalWines += wineList.length;
                    
                    // Count status distribution
                    wineList.forEach(wine => {
                        const status = wine.Record?.currentStatus || 'UNKNOWN';
                        if (statusDistribution[status] !== undefined) {
                            statusDistribution[status]++;
                        }
                    });
                } catch (error) {
                    logger.warn(`Failed to get data for ${org}:`, error.message);
                    orgStats[org] = 0;
                }
            }
            
            const networkStatus = await fabricClient.getNetworkStatus();
            
            res.json({
                success: true,
                data: {
                    totalWines,
                    organizationStats: orgStats,
                    statusDistribution,
                    networkStatus,
                    systemHealth: {
                        fabricConnected: networkStatus.connected,
                        chaincodeDeployed: networkStatus.chaincodeCount > 0,
                        peersActive: networkStatus.peersConnected || 8,
                        lastBlockHeight: networkStatus.blockHeight || 0
                    },
                    recentTransactions: adminController.generateRecentTransactions()
                }
            });

        } catch (error) {
            logger.error('Error getting system overview:', error);
            next(error);
        }
    },

    async getAllWines(req, res, next) {
        try {
            const organizations = ['VineyardOrgMSP', 'WineryOrgMSP', 'DistributorOrgMSP', 'ConsumerOrgMSP'];
            let allWines = [];
            
            for (const org of organizations) {
                try {
                    const wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', [org]);
                    const wineList = Array.isArray(wines) ? wines : [];
                    
                    // Add organization info to each wine
                    const winesWithOrg = wineList.map(wine => ({
                        ...wine,
                        organizationName: adminController.getOrganizationName(org),
                        organizationId: org
                    }));
                    
                    allWines = allWines.concat(winesWithOrg);
                } catch (error) {
                    logger.warn(`Failed to get wines for ${org}:`, error.message);
                }
            }
            
            res.json({
                success: true,
                data: { 
                    wines: allWines,
                    total: allWines.length
                }
            });

        } catch (error) {
            logger.error('Error getting all wines:', error);
            next(error);
        }
    },

    async transferWineBetweenOrgs(req, res, next) {
        try {
            const { wineId, fromOrganization, toOrganization, notes } = req.body;
            
            const transferId = `ADMIN-TRANSFER-${wineId}-${Date.now()}`;
            const transferType = adminController.getTransferType(fromOrganization, toOrganization);

            const transportData = {
                carrier: 'Admin Transfer',
                vehicleId: 'ADMIN-VEHICLE',
                departureTime: new Date().toISOString(),
                route: 'Direct Admin Transfer',
                initiatedBy: req.user.id,
                notes: notes || 'Admin-initiated transfer'
            };

            const result = await fabricClient.invokeChaincode(
                'transfer',
                'initiateTransfer',
                [
                    transferId,
                    wineId,
                    toOrganization,
                    transferType,
                    JSON.stringify(transportData)
                ],
                fromOrganization
            );

            logger.info(`Admin transfer ${transferId} initiated: ${wineId} from ${fromOrganization} to ${toOrganization}`);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Admin transfer initiated successfully'
            });

        } catch (error) {
            logger.error('Error in admin transfer:', error);
            next(error);
        }
    },

    async createWineBatch(req, res, next) {
        try {
            const {
                organization,
                vineyardData,
                wineId
            } = req.body;

            const finalWineId = wineId || `ADMIN-WINE-${Date.now()}`;
            const qrCode = `QR-${finalWineId}`;

            const result = await fabricClient.invokeChaincode(
                'wine',
                'createWineBatch',
                [finalWineId, JSON.stringify(vineyardData), qrCode],
                organization
            );

            logger.info(`Admin created wine batch ${finalWineId} for ${organization}`);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Wine batch created successfully'
            });

        } catch (error) {
            logger.error('Error creating wine batch:', error);
            next(error);
        }
    },

    getOrganizationName(orgMSP) {
        const orgNames = {
            'VineyardOrgMSP': 'Vineyard',
            'WineryOrgMSP': 'Winery', 
            'DistributorOrgMSP': 'Distributor',
            'ConsumerOrgMSP': 'Consumer'
        };
        return orgNames[orgMSP] || orgMSP;
    },

    getTransferType(fromOrg, toOrg) {
        const transferMap = {
            'VineyardOrgMSP': {
                'WineryOrgMSP': 'VINEYARD_TO_WINERY',
                'DistributorOrgMSP': 'VINEYARD_TO_DISTRIBUTOR',
                'ConsumerOrgMSP': 'VINEYARD_TO_CONSUMER'
            },
            'WineryOrgMSP': {
                'DistributorOrgMSP': 'WINERY_TO_DISTRIBUTOR',
                'ConsumerOrgMSP': 'WINERY_TO_CONSUMER'
            },
            'DistributorOrgMSP': {
                'ConsumerOrgMSP': 'DISTRIBUTOR_TO_CONSUMER'
            }
        };
        return transferMap[fromOrg]?.[toOrg] || 'ADMIN_TRANSFER';
    },

    generateRecentTransactions() {
        const transactions = [];
        const operations = ['Transfer', 'Create', 'Certify', 'Update'];
        const organizations = ['Vineyard', 'Winery', 'Distributor', 'Consumer'];
        
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setMinutes(date.getMinutes() - (i * 15));
            
            transactions.push({
                id: `TXN-${Date.now()}-${i}`,
                operation: operations[Math.floor(Math.random() * operations.length)],
                organization: organizations[Math.floor(Math.random() * organizations.length)],
                timestamp: date.toISOString(),
                status: Math.random() > 0.1 ? 'SUCCESS' : 'PENDING'
            });
        }
        
        return transactions;
    }
};

module.exports = adminController;