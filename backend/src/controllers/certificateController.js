const fabricClient = require('../fabric-client/fabricClient');
const logger = require('../utils/logger');

const certificateController = {
    async issueCertificate(req, res, next) {
        try {
            const {
                wineId,
                certificateType,
                issuedBy,
                validFrom,
                validUntil,
                description,
                status = 'PENDING'
            } = req.body;

            // Generate certificate ID
            const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const certificateData = {
                certificateId,
                wineId,
                certificateType,
                issuedBy,
                validFrom,
                validUntil,
                description,
                status,
                issuedDate: new Date().toISOString(),
                issuedByUserId: req.user.id,
                organization: req.user.organization
            };

            // Try to invoke blockchain or simulate
            const result = await fabricClient.invokeChaincode(
                'certification',
                'issueCertificate',
                [
                    certificateId,
                    wineId,
                    certificateType,
                    issuedBy,
                    validUntil,
                    JSON.stringify(certificateData)
                ],
                req.user.organization
            );

            logger.info(`Certificate ${certificateId} issued successfully`);

            res.status(201).json({
                success: true,
                data: {
                    certificate: certificateData,
                    transactionResult: result
                },
                message: 'Certificate issued successfully'
            });

        } catch (error) {
            logger.error('Error issuing certificate:', error);
            next(error);
        }
    },

    async verifyCertificate(req, res, next) {
        try {
            const { certificateId } = req.params;
            const result = await fabricClient.queryChaincode('certification', 'verifyCertificate', [certificateId]);
            
            // Handle both simulated (object) and real blockchain (JSON string) responses
            const certificateData = typeof result === 'string' ? JSON.parse(result) : result;
            
            res.json({
                success: true,
                data: certificateData
            });

        } catch (error) {
            logger.error('Error verifying certificate:', error);
            next(error);
        }
    },

    async getCertificatesByWine(req, res, next) {
        try {
            const { wineId } = req.params;
            const certificates = await fabricClient.queryChaincode('certification', 'queryCertificatesByWine', [wineId]);
            
            // Handle both simulated (array) and real blockchain (JSON string) responses
            const certificateData = Array.isArray(certificates) ? certificates : JSON.parse(certificates);
            
            res.json({
                success: true,
                data: { certificates: certificateData }
            });

        } catch (error) {
            logger.error('Error getting certificates by wine:', error);
            next(error);
        }
    },

    async updateCertificateStatus(req, res, next) {
        try {
            res.json({ success: true, message: 'Update certificate status functionality to be implemented' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = certificateController;