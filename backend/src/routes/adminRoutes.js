const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

// Apply authentication to all admin routes
router.use(auth);

// System overview and analytics
router.get('/overview', adminController.getSystemOverview);
router.get('/organizations', adminController.getAllOrganizations);
router.get('/wines', adminController.getAllWines);

// Admin operations
router.post('/transfer', adminController.transferWineBetweenOrgs);
router.post('/wine/create', adminController.createWineBatch);

module.exports = router;