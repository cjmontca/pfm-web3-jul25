const express = require('express');
const router = express.Router();
const distributorController = require('../controllers/distributorController');
const { auth } = require('../middleware/auth');

// Apply authentication to all distributor routes
router.use(auth);

// Distributor-specific routes
router.get('/wines', distributorController.getDistributorWines);
router.get('/dashboard-stats', distributorController.getDashboardStats);
router.get('/inventory', distributorController.getInventory);
router.get('/wine/:wineId', distributorController.getWineDetails);
router.get('/transfers', distributorController.getTransfers);

// Wine operations
router.post('/wine/:wineId/receive', distributorController.receiveWine);
router.post('/wine/:wineId/store', distributorController.storeWine);
router.post('/wine/:wineId/transfer', distributorController.transferWine);

// Inventory management
router.post('/inventory-check', distributorController.performInventoryCheck);

module.exports = router;