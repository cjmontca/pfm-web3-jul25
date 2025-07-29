const express = require('express');
const { body } = require('express-validator');
const wineryController = require('../controllers/wineryController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Connect routes to actual controller functions
router.post('/process-wine', 
    auth,
    [
        body('wineId').notEmpty().withMessage('Wine ID is required')
    ],
    validate,
    wineryController.processWine
);

router.get('/wines', auth, wineryController.getWineryWines);

router.get('/wine/:wineId', auth, wineryController.getWineDetails);

router.post('/wine/:wineId/age', 
    auth,
    [
        body('agingType').notEmpty().withMessage('Aging type is required')
    ],
    validate,
    wineryController.ageWine
);

router.post('/wine/:wineId/bottle', 
    auth,
    [
        body('bottleDate').notEmpty().withMessage('Bottle date is required')
    ],
    validate,
    wineryController.bottleWine
);

router.post('/wine/:wineId/transfer', 
    auth,
    [
        body('toOrganization').notEmpty().withMessage('Destination organization is required')
    ],
    validate,
    wineryController.transferWine
);

router.get('/dashboard-stats', auth, wineryController.getDashboardStats);

module.exports = router;