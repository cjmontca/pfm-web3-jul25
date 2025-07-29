const express = require('express');
const consumerController = require('../controllers/consumerController');

const router = express.Router();

// Wine tracing and verification
router.get('/trace/:qrCode', consumerController.traceByQR);
router.get('/wine/:wineId/verify', consumerController.verifyWine);
router.get('/wine/:wineId/history', consumerController.getWineHistory);
router.get('/wine/:wineId/certificates', consumerController.getWineCertificates);
router.get('/wine/:wineId/nutritional-info', consumerController.getWineNutritionalInfo);

// Wine reviews
router.post('/wine/:wineId/review', consumerController.submitWineReview);
router.get('/wine/:wineId/reviews', consumerController.getWineReviews);

// Search and recommendations
router.get('/search', consumerController.searchWines);
router.get('/recommendations', consumerController.getWineRecommendations);

module.exports = router;