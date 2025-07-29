const request = require('supertest');
const express = require('express');

// Mock the auth middleware before requiring consumerRoutes
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = global.testUtils.createMockUser('ConsumerOrgMSP');
    next();
  }
}));

const consumerRoutes = require('../../src/routes/consumerRoutes');

// Create test app with authentication
const app = express();
app.use(express.json());
app.use('/consumer', consumerRoutes);

describe('👥 Consumer API Tests', () => {
  describe('GET /consumer/trace/:qrCode', () => {
    it('should trace wine by QR code successfully', async () => {
      const qrCode = `QR-TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/trace/${qrCode}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
      expect(response.body.data.traceability).toBeDefined();
    });

    it('should handle invalid QR code format', async () => {
      const invalidQrCode = 'INVALID-QR-FORMAT';

      const response = await request(app)
        .get(`/consumer/trace/${invalidQrCode}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle non-existent QR code', async () => {
      const nonExistentQr = 'QR-NON-EXISTENT-WINE';

      const response = await request(app)
        .get(`/consumer/trace/${nonExistentQr}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /consumer/wine/:wineId/verify', () => {
    it('should verify wine authenticity successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/verify`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authentic).toBeDefined();
      expect(response.body.data.verification).toBeDefined();
      expect(typeof response.body.data.authentic).toBe('boolean');
    });

    it('should provide detailed verification information', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/verify`);

      expect(response.status).toBe(200);
      const verification = response.body.data.verification;
      expect(verification.blockchainVerified).toBeDefined();
      expect(verification.certificatesValid).toBeDefined();
      expect(verification.traceabilityComplete).toBeDefined();
    });

    it('should handle invalid wine ID', async () => {
      const response = await request(app)
        .get('/consumer/wine/INVALID-WINE-ID/verify');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /consumer/wine/:wineId/history', () => {
    it('should return complete wine history', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/history`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toBeDefined();
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    it('should include all supply chain stages', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/history`);

      expect(response.status).toBe(200);
      const history = response.body.data.history;
      
      // Verify history structure
      expect(history).toBeDefined();
      if (history.length > 0) {
        expect(history[0].timestamp).toBeDefined();
        expect(history[0].organization).toBeDefined();
        expect(history[0].action).toBeDefined();
      }
    });

    it('should handle non-existent wine history', async () => {
      const response = await request(app)
        .get('/consumer/wine/NON-EXISTENT-WINE/history');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /consumer/wine/:wineId/certificates', () => {
    it('should return wine certificates', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/certificates`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.certificates).toBeDefined();
      expect(Array.isArray(response.body.data.certificates)).toBe(true);
    });

    it('should include certificate details', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/certificates`);

      expect(response.status).toBe(200);
      const certificates = response.body.data.certificates;
      
      if (certificates.length > 0) {
        const cert = certificates[0];
        expect(cert.type).toBeDefined();
        expect(cert.issuer).toBeDefined();
        expect(cert.issuedDate).toBeDefined();
        expect(cert.valid).toBeDefined();
      }
    });

    it('should handle wine with no certificates', async () => {
      const wineId = 'WINE-WITHOUT-CERTIFICATES';

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/certificates`);

      expect(response.status).toBe(200);
      expect(response.body.data.certificates).toEqual([]);
    });
  });

  describe('GET /consumer/wine/:wineId/nutritional-info', () => {
    it('should return nutritional information', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/nutritional-info`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nutritionalInfo).toBeDefined();
    });

    it('should include comprehensive nutritional data', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/nutritional-info`);

      expect(response.status).toBe(200);
      const nutritionalInfo = response.body.data.nutritionalInfo;
      
      expect(nutritionalInfo.alcoholContent).toBeDefined();
      expect(nutritionalInfo.calories).toBeDefined();
      expect(nutritionalInfo.allergens).toBeDefined();
      expect(nutritionalInfo.additives).toBeDefined();
    });
  });

  describe('POST /consumer/wine/:wineId/review', () => {
    it('should submit wine review successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const reviewData = {
        rating: 5,
        title: 'Exceptional Premium Wine',
        comment: 'Outstanding quality and taste. Perfect balance of flavors.',
        purchaseLocation: 'Premium Wine Store Madrid',
        purchaseDate: '2025-01-20',
        verified: true
      };

      const response = await request(app)
        .post(`/consumer/wine/${wineId}/review`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviewId).toBeDefined();
      expect(response.body.message).toBe('Review submitted successfully');
    });

    it('should require rating and comment', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const incompleteData = {
        title: 'Great wine'
        // Missing rating and comment
      };

      const response = await request(app)
        .post(`/consumer/wine/${wineId}/review`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should validate rating range', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const invalidData = {
        rating: 6, // Invalid rating > 5
        comment: 'Good wine'
      };

      const response = await request(app)
        .post(`/consumer/wine/${wineId}/review`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /consumer/wine/:wineId/reviews', () => {
    it('should return wine reviews', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/reviews`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toBeDefined();
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    it('should include review statistics', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/reviews`);

      expect(response.status).toBe(200);
      const summary = response.body.data.summary;
      
      expect(summary.averageRating).toBeDefined();
      expect(summary.totalReviews).toBeDefined();
      expect(summary.ratingDistribution).toBeDefined();
    });

    it('should support pagination for reviews', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;

      const response = await request(app)
        .get(`/consumer/wine/${wineId}/reviews`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /consumer/search', () => {
    it('should search wines by various criteria', async () => {
      const response = await request(app)
        .get('/consumer/search')
        .query({ 
          q: 'Rioja',
          region: 'Rioja',
          variety: 'Tempranillo',
          minRating: 4
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wines).toBeDefined();
      expect(Array.isArray(response.body.data.wines)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/consumer/search')
        .query({ q: 'NonExistentWine' });

      expect(response.status).toBe(200);
      expect(response.body.data.wines).toEqual([]);
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .get('/consumer/search')
        .query({ minRating: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /consumer/recommendations', () => {
    it('should return wine recommendations', async () => {
      const response = await request(app)
        .get('/consumer/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toBeDefined();
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should categorize recommendations', async () => {
      const response = await request(app)
        .get('/consumer/recommendations');

      expect(response.status).toBe(200);
      const recommendations = response.body.data.recommendations;
      
      if (recommendations.length > 0) {
        expect(recommendations[0].category).toBeDefined();
        expect(recommendations[0].reason).toBeDefined();
        expect(recommendations[0].wine).toBeDefined();
      }
    });
  });

  describe('Consumer Authentication Flow', () => {
    it('should handle consumer-specific authentication', async () => {
      // Test that consumer routes work with proper organization
      const response = await request(app)
        .get('/consumer/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Wine Verification Workflow', () => {
    it('should handle complete wine verification workflow', async () => {
      const wineId = `VERIFICATION-WINE-${Date.now()}`;

      // 1. Verify authenticity
      const verifyResponse = await request(app)
        .get(`/consumer/wine/${wineId}/verify`);

      expect(verifyResponse.status).toBe(200);

      // 2. Get complete history
      const historyResponse = await request(app)
        .get(`/consumer/wine/${wineId}/history`);

      expect(historyResponse.status).toBe(200);

      // 3. Check certificates
      const certResponse = await request(app)
        .get(`/consumer/wine/${wineId}/certificates`);

      expect(certResponse.status).toBe(200);

      // 4. Get nutritional info
      const nutritionResponse = await request(app)
        .get(`/consumer/wine/${wineId}/nutritional-info`);

      expect(nutritionResponse.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed QR codes gracefully', async () => {
      const response = await request(app)
        .get('/consumer/trace/MALFORMED-QR');

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle network errors gracefully', async () => {
      // Test with temporarily broken blockchain connection
      const originalEnv = process.env.USE_MOCK_BLOCKCHAIN;
      process.env.USE_MOCK_BLOCKCHAIN = 'false';

      const response = await request(app)
        .get('/consumer/recommendations');

      // Should either work or fail gracefully
      expect([200, 500]).toContain(response.status);

      // Restore original env
      process.env.USE_MOCK_BLOCKCHAIN = originalEnv;
    });
  });
});