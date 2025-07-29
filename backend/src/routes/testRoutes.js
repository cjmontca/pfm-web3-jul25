const express = require('express');
const router = express.Router();
const fabricClient = require('../fabric-client/fabricClient');
const logger = require('../utils/logger');

// Test endpoint for wine transfer without authentication (development only)
router.post('/transfer/:wineId', async (req, res) => {
    try {
        const { wineId } = req.params;
        const { toOrganization, transferType, notes } = req.body;

        logger.info(`Test transfer for wine ${wineId} to ${toOrganization}`);

        const transferId = `TRANSFER-${wineId}-${Date.now()}`;
        
        const transferData = {
            carrier: 'Test Carrier',
            vehicleId: 'TEST-001',
            departureTime: new Date().toISOString(),
            estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            route: 'Test Route',
            notes: notes || 'Test transfer'
        };

        const result = await fabricClient.invokeChaincode(
            'transfer',
            'initiateTransfer',
            [
                transferId,
                wineId,
                toOrganization,
                transferType || 'sale',
                JSON.stringify(transferData)
            ],
            'VineyardOrgMSP'
        );

        logger.info(`Test transfer ${transferId} completed successfully`);

        res.status(201).json({
            success: true,
            message: 'Test transfer initiated successfully',
            data: JSON.parse(result),
            transferId
        });

    } catch (error) {
        logger.error('Error in test transfer:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to initiate test transfer'
        });
    }
});

// Test endpoint to get all wines
router.get('/wines', async (req, res) => {
    try {
        const result = await fabricClient.queryChaincode(
            'wine-traceability',
            'getAllWines',
            []
        );

        res.json({
            success: true,
            data: JSON.parse(result)
        });

    } catch (error) {
        logger.error('Error getting test wines:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get wines'
        });
    }
});

// Test endpoint to get specific wine
router.get('/wine/:wineId', async (req, res) => {
    try {
        const { wineId } = req.params;
        
        const result = await fabricClient.queryChaincode(
            'wine-traceability',
            'getWine',
            [wineId]
        );

        res.json({
            success: true,
            data: JSON.parse(result)
        });

    } catch (error) {
        logger.error('Error getting test wine:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get wine'
        });
    }
});

module.exports = router;