const express = require('express');
const { body } = require('express-validator');
const vineyardController = require('../controllers/vineyardController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Real blockchain routes using controllers
router.post('/register-batch', 
    auth,
    [
        body('wineId').notEmpty().withMessage('Wine ID is required'),
        body('vineyard').notEmpty().withMessage('Vineyard name is required'),
        body('region').notEmpty().withMessage('Region is required'),
        body('grapeVariety').notEmpty().withMessage('Grape variety is required'),
        body('harvestDate').isISO8601().withMessage('Valid harvest date is required'),
        body('plotNumber').notEmpty().withMessage('Plot number is required')
    ],
    validate,
    vineyardController.registerWineBatch
);

router.get('/wines', auth, vineyardController.getVineyardWines);

router.get('/wine/:wineId', auth, vineyardController.getWineDetails);

router.get('/dashboard-stats', auth, vineyardController.getDashboardStats);

router.get('/harvest-history', auth, vineyardController.getHarvestHistory);

router.post('/wine/:wineId/transfer', 
    auth,
    [
        body('toOrganization').notEmpty().withMessage('Destination organization is required'),
        body('notes').optional().isString()
    ],
    validate,
    vineyardController.transferWine
);

router.post('/wine/:wineId/certify', 
    auth,
    [
        body('certificationType').notEmpty().withMessage('Certificate type is required'),
        body('issuer').notEmpty().withMessage('Issuer is required'),
        body('expiryDate').isISO8601().withMessage('Valid expiry date is required')
    ],
    validate,
    vineyardController.certifyWine
);

router.post('/quality-check', 
    auth,
    [
        body('wineId').notEmpty().withMessage('Wine ID is required'),
        body('testResults').isObject().withMessage('Test results must be an object')
    ],
    validate,
    vineyardController.performQualityCheck
);

module.exports = router;