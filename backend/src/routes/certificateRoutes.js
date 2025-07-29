const express = require('express');
const { body } = require('express-validator');
const certificateController = require('../controllers/certificateController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Issue a new certificate
router.post('/issue', 
    auth,
    [
        body('wineId').notEmpty().withMessage('Wine ID is required'),
        body('certificateType').notEmpty().withMessage('Certificate type is required'),
        body('issuedBy').notEmpty().withMessage('Issued by is required'),
        body('validFrom').isISO8601().withMessage('Valid from date is required'),
        body('validUntil').isISO8601().withMessage('Valid until date is required'),
        body('description').optional().isString()
    ],
    validate,
    certificateController.issueCertificate
);

// Verify a certificate
router.get('/verify/:certificateId', auth, certificateController.verifyCertificate);

// Get certificates by wine ID
router.get('/wine/:wineId', auth, certificateController.getCertificatesByWine);

// Update certificate status
router.put('/:certificateId/status', 
    auth,
    [
        body('status').notEmpty().withMessage('Status is required'),
        body('reason').optional().isString()
    ],
    validate,
    certificateController.updateCertificateStatus
);

module.exports = router;