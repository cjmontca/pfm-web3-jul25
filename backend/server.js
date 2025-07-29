const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const fabricClient = require('./src/fabric-client/fabricClient');

const vineyardRoutes = require('./src/routes/vineyardRoutes');
const wineryRoutes = require('./src/routes/wineryRoutes');
const distributorRoutes = require('./src/routes/distributorRoutes');
const consumerRoutes = require('./src/routes/consumerRoutes');
const certificateRoutes = require('./src/routes/certificateRoutes');
const transferRoutes = require('./src/routes/transferRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/vineyard', vineyardRoutes);
app.use('/api/winery', wineryRoutes);
app.use('/api/distributor', distributorRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Test routes for development
if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_BLOCKCHAIN === 'true') {
    const testRoutes = require('./src/routes/testRoutes');
    app.use('/api/test', testRoutes);
}

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Test blockchain connectivity
app.get('/api/test-blockchain', async (req, res) => {
    try {
        const result = await fabricClient.queryChaincode('wine-traceability', 'getAllWines', []);
        res.json({
            success: true,
            message: 'Blockchain connected successfully',
            data: JSON.parse(result)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Simple test endpoint for wine transfer (development only)
app.post('/api/test-transfer/:wineId', async (req, res) => {
    try {
        const { wineId } = req.params;
        const { toOrganization, transferType, notes } = req.body;

        logger.info(`Test transfer for wine ${wineId} to ${toOrganization}`);

        const transferId = `TRANSFER-${wineId}-${Date.now()}`;
        
        const result = await fabricClient.invokeChaincode(
            'transfer',
            'initiateTransfer',
            [
                transferId,
                wineId,
                toOrganization || 'WineryOrgMSP',
                transferType || 'sale',
                JSON.stringify({notes: notes || 'Test transfer'})
            ],
            'VineyardOrgMSP'
        );

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

app.get('/api/network-status', async (req, res) => {
    try {
        const status = await fabricClient.getNetworkStatus();
        res.json(status);
    } catch (error) {
        logger.error('Error getting network status:', error);
        res.status(500).json({
            error: 'Failed to get network status',
            details: error.message
        });
    }
});

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        logger.info('Starting server...');
        
        app.listen(PORT, () => {
            logger.info(`Wine Traceability Backend Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Health check: http://localhost:${PORT}/api/health`);
        });
        
        // Initialize Fabric network after server starts
        try {
            await fabricClient.initializeNetwork();
            logger.info('Fabric network initialized successfully');
        } catch (fabricError) {
            logger.error('Failed to initialize Fabric network (server will continue without blockchain):', fabricError);
        }
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

startServer();