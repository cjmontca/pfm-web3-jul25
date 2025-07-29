const logger = require('../utils/logger');

class MockFabricClient {
    constructor() {
        this.initialized = false;
        this.mockData = {
            wines: new Map(),
            transfers: new Map(),
            certificates: new Map()
        };
        this.transactionId = 1000;
    }

    async initializeNetwork() {
        return await this.initialize();
    }

    async initialize() {
        try {
            logger.info('Initializing Mock Fabric Client for development...');
            
            // Simulate initialization delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.initialized = true;
            logger.info('Mock Fabric Client initialized successfully');
            
            // Create some sample data
            this.createSampleData();
            
            return true;
        } catch (error) {
            logger.error('Error initializing mock fabric client:', error);
            throw error;
        }
    }

    createSampleData() {
        // Sample wines for testing
        this.mockData.wines.set('WINE001', {
            id: 'WINE001',
            vineyardId: 'VINEYARD001',
            variety: 'Cabernet Sauvignon',
            vintage: '2023',
            region: 'Rioja',
            status: 'produced',
            currentOwner: 'VineyardOrgMSP',
            timestamp: new Date().toISOString()
        });

        this.mockData.wines.set('WINE002', {
            id: 'WINE002',
            vineyardId: 'VINEYARD001',
            variety: 'Tempranillo',
            vintage: '2023',
            region: 'Rioja',
            status: 'produced',
            currentOwner: 'VineyardOrgMSP',
            timestamp: new Date().toISOString()
        });

        this.mockData.wines.set('TEST-WINE-001', {
            id: 'TEST-WINE-001',
            vineyardId: 'VINEYARD001',
            variety: 'Merlot',
            vintage: '2024',
            region: 'Ribera del Duero',
            status: 'distributed',
            currentOwner: 'DistributorOrgMSP',
            timestamp: new Date().toISOString()
        });

        logger.info('Sample wine data created for development');
    }

    async invokeChaincode(contractName, functionName, args = [], orgMSP = 'VineyardOrgMSP') {
        if (!this.initialized) {
            logger.warn('Mock blockchain not initialized, initializing now...');
            await this.initialize();
        }

        logger.info(`Mock invoking ${contractName}.${functionName} with args:`, args);

        try {
            let result;
            
            switch (functionName) {
                case 'createWine':
                case 'createWineBatch':
                    result = await this.mockCreateWine(args, orgMSP);
                    break;
                case 'updateWineStatus':
                    result = await this.mockUpdateWineStatus(args, orgMSP);
                    break;
                case 'transferWine':
                    result = await this.mockTransferWine(args, orgMSP);
                    break;
                case 'initiateTransfer':
                    result = await this.mockInitiateTransfer(args, orgMSP);
                    break;
                case 'completeTransfer':
                    result = await this.mockCompleteTransfer(args, orgMSP);
                    break;
                case 'getWine':
                case 'readWine':
                    result = await this.mockGetWine(args);
                    break;
                case 'getWineHistory':
                    result = await this.mockGetWineHistory(args);
                    break;
                case 'queryWinesByStatus':
                    result = await this.mockQueryWinesByStatus(args);
                    break;
                case 'verifyAuthenticity':
                    result = await this.mockVerifyAuthenticity(args);
                    break;
                case 'getAllWines':
                    result = await this.mockGetAllWines();
                    break;
                case 'getTransfer':
                    result = await this.mockGetTransfer(args);
                    break;
                case 'queryCertificatesByWine':
                    result = await this.mockQueryCertificatesByWine(args);
                    break;
                case 'queryWinesByOwner':
                    result = await this.mockQueryWinesByOwner(args);
                    break;
                case 'getWineNutritionalInfo':
                    result = await this.mockGetWineNutritionalInfo(args);
                    break;
                default:
                    result = { success: true, message: `Mock ${functionName} executed successfully`, data: null };
            }

            logger.info(`Mock transaction ${functionName} completed successfully`);
            return JSON.stringify(result);

        } catch (error) {
            logger.error(`Error in mock ${functionName}:`, error);
            throw error;
        }
    }

    async mockCreateWine(args, orgMSP) {
        const [wineId, vineyardId, variety, vintage, region] = args;
        
        const wine = {
            id: wineId,
            vineyardId,
            variety,
            vintage,
            region,
            status: 'produced',
            currentOwner: orgMSP,
            timestamp: new Date().toISOString(),
            txId: `mock_tx_${this.transactionId++}`
        };

        this.mockData.wines.set(wineId, wine);
        
        return {
            success: true,
            message: 'Mock wine created successfully',
            data: wine
        };
    }

    async mockInitiateTransfer(args, orgMSP) {
        const [transferId, wineId, toOrganization, transferType, details] = args;
        
        const wine = this.mockData.wines.get(wineId);
        if (!wine) {
            throw new Error(`Wine ${wineId} not found`);
        }

        const transfer = {
            id: transferId,
            wineId,
            fromOrganization: wine.currentOwner,
            toOrganization,
            transferType,
            status: 'initiated',
            details: details || '',
            timestamp: new Date().toISOString(),
            txId: `mock_tx_${this.transactionId++}`
        };

        this.mockData.transfers.set(transferId, transfer);

        return {
            success: true,
            message: 'Transfer initiated successfully',
            data: transfer
        };
    }

    async mockCompleteTransfer(args, orgMSP) {
        const [transferId] = args;
        
        const transfer = this.mockData.transfers.get(transferId);
        if (!transfer) {
            throw new Error(`Transfer ${transferId} not found`);
        }

        // Update transfer status
        transfer.status = 'completed';
        transfer.completedAt = new Date().toISOString();
        transfer.completedBy = orgMSP;

        // Update wine ownership
        const wine = this.mockData.wines.get(transfer.wineId);
        if (wine) {
            wine.currentOwner = transfer.toOrganization;
            wine.lastTransfer = transferId;
        }

        return {
            success: true,
            message: 'Transfer completed successfully',
            data: transfer
        };
    }

    async mockGetWine(args) {
        const [wineId] = args;
        const wine = this.mockData.wines.get(wineId);
        
        if (!wine) {
            return {
                success: false,
                error: `Wine ${wineId} not found`,
                data: null
            };
        }

        return {
            success: true,
            data: wine
        };
    }

    async mockGetAllWines() {
        const wines = Array.from(this.mockData.wines.values());
        
        return {
            success: true,
            data: wines
        };
    }

    async mockGetTransfer(args) {
        const [transferId] = args;
        const transfer = this.mockData.transfers.get(transferId);
        
        if (!transfer) {
            throw new Error(`Transfer ${transferId} not found`);
        }

        return {
            success: true,
            data: transfer
        };
    }

    async mockUpdateWineStatus(args, orgMSP) {
        const [wineId, status, data] = args;
        const wine = this.mockData.wines.get(wineId);
        
        if (!wine) {
            // Create new wine if it doesn't exist
            const newWine = {
                id: wineId,
                status: status,
                currentOwner: orgMSP,
                timestamp: new Date().toISOString(),
                data: data
            };
            this.mockData.wines.set(wineId, newWine);
        } else {
            wine.status = status;
            wine.currentOwner = orgMSP;
            wine.updatedAt = new Date().toISOString();
            if (data) wine.data = data;
        }

        return {
            success: true,
            message: `Mock wine status updated to ${status}`,
            data: this.mockData.wines.get(wineId)
        };
    }

    async mockTransferWine(args, orgMSP) {
        const [wineId, fromOrg, toOrg, transferData] = args;
        let wine = this.mockData.wines.get(wineId);
        
        if (!wine) {
            // Create wine if it doesn't exist for testing purposes
            wine = {
                id: wineId,
                status: 'produced',
                currentOwner: fromOrg || 'VineyardOrgMSP',
                timestamp: new Date().toISOString()
            };
            this.mockData.wines.set(wineId, wine);
        }

        wine.currentOwner = toOrg;
        wine.updatedAt = new Date().toISOString();

        const transfer = {
            id: `TRANSFER-${this.transactionId++}`,
            wineId,
            fromOrg,
            toOrg,
            transferData,
            status: 'COMPLETED',
            timestamp: new Date().toISOString()
        };

        this.mockData.transfers.set(transfer.id, transfer);

        return {
            success: true,
            message: 'Mock wine transfer completed',
            data: transfer
        };
    }

    async mockGetWineHistory(args) {
        const [wineId] = args;
        
        // Mock history data
        const history = [
            {
                timestamp: new Date().toISOString(),
                action: 'CREATED',
                organization: 'VineyardOrgMSP',
                details: 'Wine batch created'
            },
            {
                timestamp: new Date(Date.now() + 86400000).toISOString(),
                action: 'TRANSFERRED',
                organization: 'WineryOrgMSP',
                details: 'Transferred to winery'
            }
        ];

        return {
            success: true,
            data: history
        };
    }

    async mockQueryWinesByStatus(args) {
        const [status] = args;
        const wines = Array.from(this.mockData.wines.values())
            .filter(wine => wine.status === status);

        return {
            success: true,
            data: wines
        };
    }

    async mockVerifyAuthenticity(args) {
        const [qrCode] = args;
        
        return {
            success: true,
            authentic: true,
            wine: {
                wineId: qrCode.replace('QR-', ''),
                name: 'Mock Verified Wine',
                status: 'CONSUMER',
                verified: true
            }
        };
    }

    async mockQueryCertificatesByWine(args) {
        const [wineId] = args;
        
        // Return empty array for wine without certificates
        if (wineId === 'WINE-WITHOUT-CERTIFICATES') {
            return {
                success: true,
                data: []
            };
        }
        
        // Return mock certificates for other wines
        const certificates = [
            {
                type: 'Organic Certification',
                issuer: 'Organic Wine Council',
                issuedDate: '2024-01-15',
                expiryDate: '2025-01-15',
                valid: true,
                certificateId: 'ORG-2024-001',
                mockData: true
            }
        ];
        
        return {
            success: true,
            data: certificates
        };
    }

    async mockQueryWinesByOwner(args) {
        const [ownerMSP] = args;
        const wines = Array.from(this.mockData.wines.values())
            .filter(wine => wine.currentOwner === ownerMSP);
        
        return {
            success: true,
            data: wines
        };
    }

    async mockGetWineNutritionalInfo(args) {
        const [wineId] = args;
        
        return {
            success: true,
            data: {
                alcoholContent: '13.5%',
                calories: '125 per 150ml',
                allergens: ['Sulfites'],
                additives: ['Natural cork', 'SO2'],
                organicCertified: true,
                mockData: true
            }
        };
    }

    async queryChaincode(contractName, functionName, args = []) {
        return await this.invokeChaincode(contractName, functionName, args);
    }

    isInitialized() {
        return this.initialized;
    }
}

module.exports = MockFabricClient;