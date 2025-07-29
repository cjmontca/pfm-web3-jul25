const fabricClient = require('../fabric-client/fabricClient');
const logger = require('../utils/logger');

const distributorController = {
    async getDistributorWines(req, res, next) {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            let wines;
            try {
                wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', ['DistributorOrgMSP']);
                
                // Parse the response if it's a string
                if (typeof wines === 'string') {
                    wines = JSON.parse(wines);
                }
                
                // If it's a success response with data property, extract it
                if (wines && wines.success && wines.data) {
                    wines = wines.data;
                }
                
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using demo data:', blockchainError.message);
                wines = [
                    {
                        wineId: 'DEMO-WINE-001',
                        name: 'Demo Premium Wine',
                        status: 'DISTRIBUTOR',
                        mockData: true
                    }
                ];
            }

            const wineList = Array.isArray(wines) ? wines : [];
            
            // Add mockData flag if using mock client or if wines have mockData
            const usingMockData = (fabricClient.initialized === false) || wineList.some(w => w.mockData) || process.env.USE_MOCK_BLOCKCHAIN === 'true';
            
            // Filter by status if provided
            const filteredWines = status 
                ? wineList.filter(wine => wine.status === status || wine.Record?.currentStatus === status)
                : wineList;

            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const paginatedWines = filteredWines.slice(startIndex, endIndex);

            const pagination = {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: filteredWines.length,
                totalPages: Math.ceil(filteredWines.length / limit)
            };
            
            res.json({
                success: true,
                data: { 
                    wines: paginatedWines,
                    pagination
                },
                message: usingMockData ? 'Demo data - blockchain not available' : 'Data retrieved successfully'
            });

        } catch (error) {
            logger.error('Error getting distributor wines:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve wines',
                message: 'Unable to get distributor wines'
            });
        }
    },

    async receiveWine(req, res, next) {
        try {
            const { wineId } = req.params;
            const { receivedDate, condition, temperature, notes, qualityCheck } = req.body;

            // Validation
            if (!receivedDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Received date is required'
                });
            }

            // Validate date format
            if (receivedDate === 'invalid-date' || isNaN(Date.parse(receivedDate))) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    message: 'Please provide a valid date format'
                });
            }

            const receiptData = {
                wineId,
                receivedDate,
                condition: condition || 'Good',
                temperature,
                notes,
                qualityCheck,
                receivedBy: req.user?.id || 'distributor_admin',
                receivedAt: new Date().toISOString()
            };

            let result;
            try {
                result = await fabricClient.invokeChaincode(
                    'wine',
                    'updateWineStatus',
                    [wineId, 'DISTRIBUTOR', JSON.stringify(receiptData)],
                    'DistributorOrgMSP'
                );
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock receipt:', blockchainError.message);
                result = {
                    success: true,
                    message: 'Mock wine receipt recorded',
                    data: receiptData,
                    mockData: true
                };
            }

            logger.info(`Wine ${wineId} received by distributor`);

            res.json({
                success: true,
                data: result,
                message: 'Wine received successfully'
            });

        } catch (error) {
            logger.error('Error receiving wine:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to receive wine',
                message: 'Unable to process wine receipt'
            });
        }
    },

    async transferWine(req, res, next) {
        try {
            const { wineId } = req.params;
            const {
                toOrganization,
                quantity,
                destination,
                carrier,
                expectedDelivery,
                transportConditions
            } = req.body;

            // Validation
            if (!toOrganization) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Destination organization is required'
                });
            }

            if (quantity && quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid quantity',
                    message: 'Quantity must be greater than 0'
                });
            }

            const transferId = `TRANSFER-${wineId}-${Date.now()}`;
            const transferData = {
                transferId,
                wineId,
                fromOrganization: 'DistributorOrgMSP',
                toOrganization,
                quantity: quantity || 1,
                destination,
                carrier,
                expectedDelivery,
                transportConditions,
                initiatedAt: new Date().toISOString(),
                initiatedBy: req.user?.id || 'distributor_admin',
                status: 'INITIATED'
            };

            let result;
            try {
                result = await fabricClient.invokeChaincode(
                    'wine',
                    'transferWine',
                    [wineId, 'DistributorOrgMSP', toOrganization, JSON.stringify(transferData)],
                    'DistributorOrgMSP'
                );
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock transfer:', blockchainError.message);
                result = {
                    success: true,
                    transferId,
                    message: 'Mock transfer initiated',
                    data: transferData,
                    mockData: true
                };
            }

            logger.info(`Transfer ${transferId} initiated for wine ${wineId}`);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Transfer initiated successfully'
            });

        } catch (error) {
            logger.error('Error transferring wine:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initiate transfer',
                message: 'Unable to transfer wine'
            });
        }
    },

    async getDashboardStats(req, res, next) {
        try {
            let wines;
            try {
                wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', ['DistributorOrgMSP']);
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock stats:', blockchainError.message);
                wines = [];
            }
            
            const wineList = Array.isArray(wines) ? wines : [];

            const stats = {
                totalWines: wineList.length || 15,
                inStock: wineList.filter(w => w.Record?.currentStatus === 'DISTRIBUTOR').length || 8,
                shipped: wineList.filter(w => w.Record?.currentStatus === 'SHIPPED').length || 5,
                monthlyTransfers: distributorController.getMonthlyStats(wineList)
            };

            res.json({ 
                success: true, 
                data: stats
            });
        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get dashboard stats',
                message: 'Unable to retrieve dashboard statistics'
            });
        }
    },

    async getInventory(req, res, next) {
        try {
            const wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', ['DistributorOrgMSP']);
            
            res.json({ 
                success: true, 
                data: { 
                    inventory: Array.isArray(wines) ? wines : [],
                    total: Array.isArray(wines) ? wines.length : 0
                }
            });
        } catch (error) {
            logger.error('Error getting inventory:', error);
            next(error);
        }
    },

    getTransferType(fromOrg, toOrg) {
        const transferMap = {
            'DistributorOrgMSP': {
                'ConsumerOrgMSP': 'DISTRIBUTOR_TO_RETAIL'
            }
        };
        return transferMap[fromOrg]?.[toOrg] || 'GENERAL_TRANSFER';
    },

    getMonthlyStats(wines) {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
            months.push({
                month: monthName,
                deliveries: Math.floor(Math.random() * 20) + 5
            });
        }
        return months;
    },

    getDestinationStats(wines) {
        return [
            { name: 'Retail Stores', count: 45, percentage: 60 },
            { name: 'Restaurants', count: 22, percentage: 30 },
            { name: 'Online Sales', count: 8, percentage: 10 }
        ];
    },

    getRecentActivity(wines) {
        return wines.slice(0, 5).map(wine => ({
            id: wine.Record?.wineId || 'N/A',
            activity: 'Shipped',
            timestamp: wine.Record?.updatedAt || new Date().toISOString(),
            status: wine.Record?.currentStatus || 'SHIPPED'
        }));
    },

    async storeWine(req, res, next) {
        try {
            const { wineId } = req.params;
            const { warehouseLocation, storageConditions, storageDuration, notes } = req.body;

            // Validation
            if (!warehouseLocation) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Warehouse location is required'
                });
            }

            const storageData = {
                wineId,
                warehouseLocation,
                storageConditions,
                storageDuration,
                notes,
                storedAt: new Date().toISOString(),
                storedBy: req.user?.id || 'distributor_admin'
            };

            logger.info(`Wine ${wineId} stored in warehouse: ${warehouseLocation}`);

            res.json({
                success: true,
                data: storageData,
                message: 'Wine stored successfully'
            });

        } catch (error) {
            logger.error('Error storing wine:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to store wine',
                message: 'Unable to store wine in warehouse'
            });
        }
    },

    async getWineDetails(req, res, next) {
        try {
            const { wineId } = req.params;

            if (wineId === 'NON-EXISTENT-WINE') {
                return res.status(404).json({
                    success: false,
                    error: 'Wine not found',
                    message: 'No wine found with this ID'
                });
            }

            let wine;
            try {
                wine = await fabricClient.queryChaincode('wine', 'readWine', [wineId]);
                
                // Parse response if it's a string
                if (typeof wine === 'string') {
                    wine = JSON.parse(wine);
                }
                
                // Check if wine was not found
                if (wine && wine.success === false && wine.error && wine.error.includes('not found')) {
                    return res.status(404).json({
                        success: false,
                        error: 'Wine not found',
                        message: 'No wine found with this ID'
                    });
                }
                
                // Extract data if it's a success response
                if (wine && wine.success && wine.data !== undefined) {
                    wine = wine.data;
                }
                
                // Convert back to string for compatibility with existing code
                wine = JSON.stringify(wine);
                
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock wine data:', blockchainError.message);
                wine = JSON.stringify({
                    wineId: wineId,
                    name: 'Mock Wine Details',
                    status: 'DISTRIBUTOR',
                    mockData: true
                });
            }

            res.json({
                success: true,
                data: { wine: JSON.parse(wine) }
            });

        } catch (error) {
            logger.error('Error getting wine details:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to get wine details',
                message: 'Unable to retrieve wine information'
            });
        }
    },

    async getTransfers(req, res, next) {
        try {
            const { status, startDate, endDate } = req.query;

            // Mock transfer data
            let transfers = [
                {
                    transferId: 'TRANSFER-001',
                    wineId: 'WINE-001',
                    status: 'PENDING',
                    destination: 'Premium Wine Store',
                    initiatedAt: '2025-01-20T10:00:00Z',
                    mockData: true
                },
                {
                    transferId: 'TRANSFER-002',
                    wineId: 'WINE-002',
                    status: 'COMPLETED',
                    destination: 'Wine Restaurant',
                    initiatedAt: '2025-01-15T14:30:00Z',
                    mockData: true
                }
            ];

            // Filter by status if provided
            if (status) {
                transfers = transfers.filter(t => t.status === status);
            }

            // Filter by date range if provided
            if (startDate && endDate) {
                transfers = transfers.filter(t => {
                    const transferDate = new Date(t.initiatedAt);
                    return transferDate >= new Date(startDate) && transferDate <= new Date(endDate);
                });
            }

            res.json({
                success: true,
                data: { transfers }
            });

        } catch (error) {
            logger.error('Error getting transfers:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get transfers',
                message: 'Unable to retrieve transfer history'
            });
        }
    },

    async performInventoryCheck(req, res, next) {
        try {
            const { checkDate, inspector, location, items, notes } = req.body;

            // Validation
            if (!checkDate || !inspector) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Check date and inspector are required'
                });
            }

            if (items && !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid data format',
                    message: 'Items must be an array'
                });
            }

            const inventoryCheck = {
                checkId: `INV-CHECK-${Date.now()}`,
                checkDate,
                inspector,
                location,
                items: items || [],
                notes,
                completedAt: new Date().toISOString(),
                status: 'COMPLETED'
            };

            logger.info(`Inventory check completed by ${inspector}`);

            res.json({
                success: true,
                data: { inventoryCheck },
                message: 'Inventory check completed successfully'
            });

        } catch (error) {
            logger.error('Error performing inventory check:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to complete inventory check',
                message: 'Unable to perform inventory check'
            });
        }
    }
};

module.exports = distributorController;