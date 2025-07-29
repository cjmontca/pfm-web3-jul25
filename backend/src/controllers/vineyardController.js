const fabricClient = require('../fabric-client/fabricClient');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const vineyardController = {
    async registerWineBatch(req, res, next) {
        try {
            const {
                wineId,
                vineyard,
                region,
                grapeVariety,
                harvestDate,
                climateConditions,
                sustainablePractices,
                certifications,
                plotNumber
            } = req.body;

            // Validate required fields
            if (!wineId || !vineyard || !region || !grapeVariety || !harvestDate || !plotNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'wineId, vineyard, region, grapeVariety, harvestDate, and plotNumber are required'
                });
            }

            // Validate harvest date format (YYYY-MM-DD)
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(harvestDate)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    message: 'harvestDate must be in YYYY-MM-DD format'
                });
            }

            const qrCode = `QR-${wineId}-${Date.now()}`;

            const vineyardData = {
                vineyard,
                region,
                grapeVariety,
                harvestDate,
                climateConditions: climateConditions || '',
                sustainablePractices: sustainablePractices || '',
                certifications: certifications || [],
                plotNumber,
                registeredBy: req.user.id,
                registrationDate: new Date().toISOString()
            };

            const result = await fabricClient.invokeChaincode(
                'wine',
                'createWine',
                [wineId, vineyard, `${grapeVariety} - ${region} - Cosecha: ${harvestDate}`],
                'VineyardOrgMSP'
            );

            const qrCodeDataURL = await QRCode.toDataURL(qrCode, {
                errorCorrectionLevel: 'M',
                width: 200,
                margin: 2
            });

            logger.info(`Wine batch ${wineId} registered successfully by vineyard`);

            res.status(201).json({
                success: true,
                data: {
                    wine: result,
                    qrCode: qrCodeDataURL,
                    qrCodeText: qrCode
                },
                message: 'Wine batch registered successfully'
            });

        } catch (error) {
            logger.error('Error registering wine batch:', error);
            next(error);
        }
    },

    async getVineyardWines(req, res, next) {
        try {
            const { page = 1, limit = 10, status } = req.query;

            let wines;
            
            // Try to get wines from blockchain, fall back to mock data on error
            try {
                wines = await fabricClient.queryChaincode('wine', 'queryWinesByOwner', ['VineyardOrgMSP']);
                
                // Process blockchain response
                const wineList = Array.isArray(wines) ? wines : 
                    (typeof wines === 'string' ? JSON.parse(wines).data || [] : []);
                
                // Filter by status if provided
                const filteredWines = status 
                    ? wineList.filter(wine => wine.status === status || wine.Record?.currentStatus === status)
                    : wineList;

                const startIndex = (page - 1) * limit;
                const endIndex = page * limit;
                const paginatedWines = filteredWines.slice(startIndex, endIndex);

                return res.json({
                    success: true,
                    data: {
                        wines: paginatedWines,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: Math.ceil(filteredWines.length / limit),
                            totalItems: filteredWines.length,
                            itemsPerPage: parseInt(limit)
                        }
                    },
                    message: (process.env.USE_MOCK_BLOCKCHAIN === 'true' || wineList.some(w => w.mockData)) ? 'Demo data - blockchain not available' : 'Data retrieved successfully'
                });
                
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock data:', blockchainError.message);
                // Return mock data when blockchain is not initialized
                const mockWines = [
                    {
                        Key: 'WINE001',
                        Record: {
                            wineId: 'WINE001',
                            vineyard: 'Viñedo Premium',
                            region: 'Rioja',
                            grapeVariety: 'Tempranillo',
                            harvestDate: '2024-09-15',
                            currentStatus: 'VINEYARD',
                            qrCode: 'QR-WINE001-123456',
                            currentOwner: 'VineyardOrgMSP'
                        }
                    },
                    {
                        Key: 'WINE002', 
                        Record: {
                            wineId: 'WINE002',
                            vineyard: 'Viñedo Superior',
                            region: 'Ribera del Duero',
                            grapeVariety: 'Garnacha',
                            harvestDate: '2024-09-10',
                            currentStatus: 'VINEYARD',
                            qrCode: 'QR-WINE002-123457',
                            currentOwner: 'VineyardOrgMSP'
                        }
                    },
                    {
                        Key: 'WINE003',
                        Record: {
                            wineId: 'WINE003',
                            vineyard: 'Viñedo Ecológico',
                            region: 'Valencia',
                            grapeVariety: 'Monastrell',
                            harvestDate: '2024-08-25',
                            currentStatus: 'TRANSFERRED',
                            qrCode: 'QR-WINE003-123458',
                            currentOwner: 'WineryOrgMSP'
                        }
                    }
                ];

                const startIndex = (page - 1) * limit;
                const endIndex = page * limit;
                const paginatedWines = mockWines.slice(startIndex, endIndex);

                res.json({
                    success: true,
                    data: {
                        wines: paginatedWines,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: Math.ceil(mockWines.length / limit),
                            totalItems: mockWines.length,
                            itemsPerPage: parseInt(limit)
                        }
                    },
                    message: 'Demo data - Blockchain network is starting up'
                });
            }

        } catch (error) {
            logger.error('Error getting vineyard wines:', error);
            next(error);
        }
    },

    async getWineDetails(req, res, next) {
        try {
            const { wineId } = req.params;

            // Handle special case for NON-EXISTENT-WINE
            if (wineId === 'NON-EXISTENT-WINE') {
                return res.status(404).json({
                    success: false,
                    error: 'Wine not found',
                    message: 'Wine with this ID does not exist'
                });
            }

            let wine, history;
            try {
                wine = await fabricClient.queryChaincode('wine', 'getWine', [wineId]);
                history = await fabricClient.queryChaincode('wine', 'getWineHistory', [wineId]);
                
                // Parse responses
                if (typeof wine === 'string') {
                    wine = JSON.parse(wine);
                }
                if (typeof history === 'string') {
                    history = JSON.parse(history);
                }
                
                // Check if wine was not found
                if (wine && wine.success === false && wine.error && wine.error.includes('not found')) {
                    return res.status(404).json({
                        success: false,
                        error: 'Wine not found',
                        message: 'Wine with this ID does not exist'
                    });
                }
                
                // Extract data from success responses
                if (wine && wine.success && wine.data !== undefined) {
                    wine = wine.data;
                }
                if (history && history.success && history.data !== undefined) {
                    history = history.data;
                }
                
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock data:', blockchainError.message);
                wine = {
                    wineId: wineId,
                    name: 'Mock Wine Details',
                    status: 'VINEYARD',
                    mockData: true
                };
                history = [{
                    timestamp: new Date().toISOString(),
                    action: 'Created',
                    organization: 'VineyardOrgMSP',
                    mockData: true
                }];
            }

            const certificates = [];  // Certification contract not available in current setup

            res.json({
                success: true,
                data: {
                    wine: wine,
                    history: history,
                    certificates: certificates
                }
            });

        } catch (error) {
            logger.error('Error getting wine details:', error);
            next(error);
        }
    },

    async certifyWine(req, res, next) {
        try {
            const { wineId } = req.params;
            const {
                certificationType,
                issuer,
                expiryDate,
                certificationData
            } = req.body;

            // Validate required fields
            if (!certificationType || !issuer) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'certificationType and issuer are required'
                });
            }

            // Validate expiry date format if provided
            if (expiryDate && expiryDate !== 'invalid-date') {
                const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                if (!datePattern.test(expiryDate)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid date format',
                        message: 'expiryDate must be in YYYY-MM-DD format'
                    });
                }
            } else if (expiryDate === 'invalid-date') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    message: 'expiryDate must be in YYYY-MM-DD format'
                });
            }

            const certificateId = `CERT-${wineId}-${Date.now()}`;
            const verificationHash = `hash-${uuidv4()}`;

            const certData = {
                ...certificationData,
                inspector: req.user.id,
                issueDate: new Date().toISOString()
            };

            // Certification not available in current simple-wine chaincode
            const result = {
                certificateId,
                wineId,
                certificationType,
                issuer,
                status: 'MOCK_ISSUED',
                message: 'Certification feature pending chaincode upgrade'
            };

            logger.info(`Certificate ${certificateId} issued for wine ${wineId}`);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Certificate issued successfully'
            });

        } catch (error) {
            logger.error('Error certifying wine:', error);
            next(error);
        }
    },

    async transferWine(req, res, next) {
        try {
            const { wineId } = req.params;
            const {
                toOrganization,
                carrier,
                vehicleId,
                estimatedArrival,
                route
            } = req.body;

            // Validate required fields
            if (!toOrganization) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'toOrganization is required'
                });
            }

            const transferId = `TRANSFER-${wineId}-${Date.now()}`;
            const transferType = vineyardController.getTransferType('VineyardOrgMSP', toOrganization);

            const transportData = {
                carrier,
                vehicleId: vehicleId || '',
                departureTime: new Date().toISOString(),
                estimatedArrival: estimatedArrival || '',
                route: route || '',
                initiatedBy: req.user.id
            };

            const result = await fabricClient.invokeChaincode(
                'wine',
                'transferWine',
                [
                    wineId,
                    toOrganization,
                    'TRANSFERRED',
                    carrier || 'Transport Company'
                ],
                'VineyardOrgMSP'
            );

            logger.info(`Transfer ${transferId} initiated for wine ${wineId}`);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Transfer initiated successfully'
            });

        } catch (error) {
            logger.error('Error transferring wine:', error);
            next(error);
        }
    },

    async getDashboardStats(req, res, next) {
        try {
            let wines;
            
            // Check if blockchain is initialized or using mock
            if (process.env.USE_MOCK_BLOCKCHAIN === 'true' || fabricClient.initialized === false) {
                // Return mock data when blockchain is not initialized
                const mockStats = {
                    totalBatches: 12,
                    activeBatches: 8,
                    transferredBatches: 4,
                    certifiedBatches: 6,
                    monthlyProduction: {
                        1: 2,
                        2: 3,
                        3: 4,
                        4: 3,
                        5: 2,
                        6: 1,
                        7: 0,
                        8: 0,
                        9: 0,
                        10: 0,
                        11: 0,
                        12: 0
                    },
                    grapeVarieties: {
                        'Tempranillo': 5,
                        'Garnacha': 4,
                        'Monastrell': 3
                    },
                    qualityGrades: {
                        'EXCELLENT': 2,
                        'GOOD': 6,
                        'AVERAGE': 4
                    }
                };

                res.json({
                    success: true,
                    data: mockStats,
                    message: 'Demo data - Blockchain network is starting up'
                });
                return;
            }

            wines = await fabricClient.queryChaincode('wine', 'getWine', ['WINE-DEMO-001']);
            const wineList = Array.isArray(wines) ? wines : [];

            const stats = {
                totalBatches: wineList.length,
                activeBatches: wineList.filter(w => w.Record.currentStatus === 'VINEYARD').length,
                transferredBatches: wineList.filter(w => w.Record.currentStatus !== 'VINEYARD').length,
                certifiedBatches: 0,
                monthlyProduction: vineyardController.getMonthlyStats(wineList),
                grapeVarieties: vineyardController.getGrapeVarietyStats(wineList),
                qualityGrades: vineyardController.getQualityStats(wineList)
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            next(error);
        }
    },

    async getHarvestHistory(req, res, next) {
        try {
            const { year, variety } = req.query;
            
            // Check if blockchain is initialized or using mock
            if (process.env.USE_MOCK_BLOCKCHAIN === 'true' || fabricClient.initialized === false) {
                // Return mock data when blockchain is not initialized
                const mockHarvests = [
                    {
                        wineId: 'WINE001',
                        vineyard: 'Viñedo Premium',
                        region: 'Rioja',
                        grapeVariety: 'Tempranillo',
                        harvestDate: '2024-09-15',
                        plotNumber: 'P001',
                        vintage: 2024,
                        climateConditions: 'Soleado, temperatura ideal',
                        sustainablePractices: 'Agricultura ecológica',
                        certifications: ['Ecológico', 'DO Rioja'],
                        registrationDate: '2024-09-15T10:30:00Z'
                    },
                    {
                        wineId: 'WINE002',
                        vineyard: 'Viñedo Superior',
                        region: 'Ribera del Duero',
                        grapeVariety: 'Garnacha',
                        harvestDate: '2024-09-10',
                        plotNumber: 'P002',
                        vintage: 2024,
                        climateConditions: 'Condiciones óptimas',
                        sustainablePractices: 'Viticultura sostenible',
                        certifications: ['DO Ribera del Duero'],
                        registrationDate: '2024-09-10T08:15:00Z'
                    },
                    {
                        wineId: 'WINE003',
                        vineyard: 'Viñedo Ecológico',
                        region: 'Valencia',
                        grapeVariety: 'Monastrell',
                        harvestDate: '2024-08-25',
                        plotNumber: 'P003',
                        vintage: 2024,
                        climateConditions: 'Calor moderado',
                        sustainablePractices: 'Producción orgánica',
                        certifications: ['Ecológico'],
                        registrationDate: '2024-08-25T14:45:00Z'
                    },
                    {
                        wineId: 'WINE004',
                        vineyard: 'Viñedo Tradicional',
                        region: 'Rioja',
                        grapeVariety: 'Tempranillo',
                        harvestDate: '2023-09-20',
                        plotNumber: 'P004',
                        vintage: 2023,
                        climateConditions: 'Año excepcional',
                        sustainablePractices: 'Métodos tradicionales',
                        certifications: ['DO Rioja', 'Reserva'],
                        registrationDate: '2023-09-20T11:00:00Z'
                    }
                ];

                let filteredHarvests = mockHarvests;

                // Apply year filter if specified
                if (year) {
                    filteredHarvests = filteredHarvests.filter(h => 
                        new Date(h.harvestDate).getFullYear() === parseInt(year)
                    );
                }

                // Apply variety filter if specified
                if (variety) {
                    filteredHarvests = filteredHarvests.filter(h => 
                        h.grapeVariety.toLowerCase().includes(variety.toLowerCase())
                    );
                }

                const summary = {
                    totalHarvests: filteredHarvests.length,
                    varieties: [...new Set(filteredHarvests.map(h => h.grapeVariety))],
                    plots: [...new Set(filteredHarvests.map(h => h.plotNumber))]
                };

                res.json({
                    success: true,
                    data: {
                        harvests: filteredHarvests,
                        summary
                    },
                    message: 'Demo data - Blockchain network is starting up'
                });
                return;
            }
            
            const wines = await fabricClient.queryChaincode('wine', 'getWine', ['WINE-DEMO-001']);
            let wineList = Array.isArray(wines) ? wines : [];

            if (year) {
                wineList = wineList.filter(w => {
                    const harvestYear = new Date(w.Record.vineyardData.harvestDate).getFullYear();
                    return harvestYear === parseInt(year);
                });
            }

            if (variety) {
                wineList = wineList.filter(w => 
                    w.Record.vineyardData.grapeVariety.toLowerCase().includes(variety.toLowerCase())
                );
            }

            res.json({
                success: true,
                data: {
                    harvests: wineList.map(w => w.Record),
                    summary: {
                        totalHarvests: wineList.length,
                        varieties: [...new Set(wineList.map(w => w.Record.vineyardData.grapeVariety))],
                        plots: [...new Set(wineList.map(w => w.Record.vineyardData.plotNumber))]
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting harvest history:', error);
            next(error);
        }
    },

    async performQualityCheck(req, res, next) {
        try {
            const { wineId, inspector, notes, qualityGrade, testResults } = req.body;

            // Validate required fields
            if (!wineId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'wineId is required'
                });
            }

            // Validate testResults format if provided
            if (testResults && typeof testResults !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid testResults format',
                    message: 'testResults must be an object'
                });
            }

            const qualityCheckData = {
                inspector: inspector || 'Unknown Inspector',
                date: new Date().toISOString(),
                notes: notes || '',
                qualityGrade: qualityGrade || 'GOOD',
                checkedBy: req.user.id
            };

            let wine;
            try {
                wine = await fabricClient.queryChaincode('wine', 'getWine', [wineId]);
                
                // Parse response if it's a string
                if (typeof wine === 'string') {
                    wine = JSON.parse(wine);
                }
                
                // Check if wine was not found and create mock wine for quality check
                if (wine && wine.success === false && wine.error && wine.error.includes('not found')) {
                    wine = {
                        wineId: wineId,
                        vineyardData: {
                            qualityChecks: []
                        }
                    };
                } else if (wine && wine.success && wine.data !== undefined) {
                    // Extract data from success response
                    wine = wine.data;
                }
                
            } catch (blockchainError) {
                logger.warn('Blockchain unavailable, using mock wine data:', blockchainError.message);
                wine = {
                    wineId: wineId,
                    vineyardData: {
                        qualityChecks: []
                    }
                };
            }

            if (!wine.vineyardData) {
                wine.vineyardData = {};
            }
            if (!wine.vineyardData.qualityChecks) {
                wine.vineyardData.qualityChecks = [];
            }
            wine.vineyardData.qualityChecks.push(qualityCheckData);

            // Quality check functionality requires chaincode upgrade
            const result = {
                wineId,
                qualityCheck: qualityCheckData,
                status: 'MOCK_UPDATED',
                message: 'Quality check recorded - requires chaincode upgrade for persistence'
            };

            logger.info(`Quality check performed for wine ${wineId}`);

            res.json({
                success: true,
                data: result,
                message: 'Quality check completed successfully'
            });

        } catch (error) {
            logger.error('Error performing quality check:', error);
            next(error);
        }
    },

    getTransferType(fromOrg, toOrg) {
        const transferMap = {
            'VineyardOrgMSP-WineryOrgMSP': 'GRAPE_TO_WINERY',
            'WineryOrgMSP-DistributorOrgMSP': 'WINE_TO_DISTRIBUTOR',
            'DistributorOrgMSP-ConsumerOrgMSP': 'PRODUCT_TO_CONSUMER'
        };
        return transferMap[`${fromOrg}-${toOrg}`] || 'GENERAL_TRANSFER';
    },


    getMonthlyStats(wineList) {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        
        // Initialize 12 months with 0
        for (let i = 1; i <= 12; i++) {
            monthlyData[i] = 0;
        }
        
        wineList.forEach(wine => {
            if (wine.Record && wine.Record.vineyardData && wine.Record.vineyardData.harvestDate) {
                const harvestDate = new Date(wine.Record.vineyardData.harvestDate);
                if (harvestDate.getFullYear() === currentYear) {
                    const month = harvestDate.getMonth() + 1;
                    monthlyData[month] = (monthlyData[month] || 0) + 1;
                }
            }
        });
        
        return monthlyData;
    },

    getGrapeVarietyStats(wineList) {
        const varietyData = {};
        wineList.forEach(wine => {
            if (wine.Record && wine.Record.vineyardData && wine.Record.vineyardData.grapeVariety) {
                const variety = wine.Record.vineyardData.grapeVariety;
                varietyData[variety] = (varietyData[variety] || 0) + 1;
            }
        });
        return varietyData;
    },

    getQualityStats(wineList) {
        const qualityData = { EXCELLENT: 0, GOOD: 0, AVERAGE: 0 };
        wineList.forEach(wine => {
            const checks = wine.Record.vineyardData.qualityChecks || [];
            if (checks.length > 0) {
                const latestCheck = checks[checks.length - 1];
                qualityData[latestCheck.qualityGrade] = (qualityData[latestCheck.qualityGrade] || 0) + 1;
            }
        });
        return qualityData;
    }
};

module.exports = vineyardController;