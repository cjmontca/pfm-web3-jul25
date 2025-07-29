const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the auth middleware before requiring vineyardRoutes
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = global.testUtils.createMockUser('VineyardOrgMSP');
    next();
  }
}));

// Mock the validate middleware
jest.mock('../../src/middleware/validate', () => (req, res, next) => {
  next();
});

const vineyardRoutes = require('../../src/routes/vineyardRoutes');

// Create test app with authentication
const app = express();
app.use(express.json());
app.use('/vineyard', vineyardRoutes);

describe('🍇 Vineyard API Tests', () => {
  describe('POST /vineyard/register-batch', () => {
    it('should register wine batch successfully with valid data', async () => {
      const wineData = {
        wineId: `TEST-WINE-${Date.now()}`,
        vineyard: 'Test Premium Vineyard',
        region: 'Test Rioja',
        grapeVariety: 'Tempranillo',
        harvestDate: '2025-01-15',
        plotNumber: 'P001',
        climateConditions: 'Perfect weather conditions',
        sustainablePractices: 'Organic farming',
        certifications: ['DO Rioja', 'Ecológico']
      };

      const response = await request(app)
        .post('/vineyard/register-batch')
        .send(wineData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.qrCodeText).toBeDefined();
      expect(response.body.message).toBe('Wine batch registered successfully');
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        wineId: `TEST-WINE-${Date.now()}`,
        vineyard: 'Test Vineyard'
        // Missing required fields
      };

      const response = await request(app)
        .post('/vineyard/register-batch')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should validate harvest date format', async () => {
      const invalidDateData = {
        wineId: `TEST-WINE-${Date.now()}`,
        vineyard: 'Test Vineyard',
        region: 'Test Region',
        grapeVariety: 'Tempranillo',
        harvestDate: 'invalid-date',
        plotNumber: 'P001'
      };

      const response = await request(app)
        .post('/vineyard/register-batch')
        .send(invalidDateData);

      expect(response.status).toBe(400);
    });

    it('should handle blockchain errors gracefully', async () => {
      const wineData = {
        wineId: '', // Empty wine ID to trigger error
        vineyard: 'Test Vineyard',
        region: 'Test Region', 
        grapeVariety: 'Tempranillo',
        harvestDate: '2025-01-15',
        plotNumber: 'P001'
      };

      const response = await request(app)
        .post('/vineyard/register-batch')
        .send(wineData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /vineyard/wines', () => {
    it('should return vineyard wines with pagination', async () => {
      const response = await request(app)
        .get('/vineyard/wines')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wines).toBeDefined();
      expect(Array.isArray(response.body.data.wines)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.itemsPerPage).toBe(10);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/vineyard/wines')
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.itemsPerPage).toBe(5);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/vineyard/wines')
        .query({ status: 'VINEYARD' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return demo data when blockchain not initialized', async () => {
      const response = await request(app)
        .get('/vineyard/wines');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Demo data');
    });
  });

  describe('GET /vineyard/wine/:wineId', () => {
    it('should return wine details for valid wine ID', async () => {
      const wineId = 'TEST-WINE-001';
      
      const response = await request(app)
        .get(`/vineyard/wine/${wineId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
    });

    it('should handle non-existent wine ID', async () => {
      const response = await request(app)
        .get('/vineyard/wine/NON-EXISTENT-WINE');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /vineyard/dashboard-stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/vineyard/dashboard-stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalBatches).toBeDefined();
      expect(response.body.data.activeBatches).toBeDefined();
      expect(response.body.data.transferredBatches).toBeDefined();
      expect(response.body.data.monthlyProduction).toBeDefined();
      expect(response.body.data.grapeVarieties).toBeDefined();
    });

    it('should return valid statistics structure', async () => {
      const response = await request(app)
        .get('/vineyard/dashboard-stats');

      const stats = response.body.data;
      expect(typeof stats.totalBatches).toBe('number');
      expect(typeof stats.activeBatches).toBe('number');
      expect(typeof stats.transferredBatches).toBe('number');
      expect(typeof stats.monthlyProduction).toBe('object');
      expect(typeof stats.grapeVarieties).toBe('object');
    });
  });

  describe('GET /vineyard/harvest-history', () => {
    it('should return harvest history', async () => {
      const response = await request(app)
        .get('/vineyard/harvest-history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.harvests).toBeDefined();
      expect(Array.isArray(response.body.data.harvests)).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    it('should filter by year', async () => {
      const response = await request(app)
        .get('/vineyard/harvest-history')
        .query({ year: 2024 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by grape variety', async () => {
      const response = await request(app)
        .get('/vineyard/harvest-history')
        .query({ variety: 'Tempranillo' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /vineyard/wine/:wineId/transfer', () => {
    it('should initiate wine transfer successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        toOrganization: 'WineryOrgMSP',
        carrier: 'Test Transport Company',
        notes: 'Test transfer for quality wine batch'
      };

      const response = await request(app)
        .post(`/vineyard/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer initiated successfully');
    });

    it('should require destination organization', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        carrier: 'Test Transport Company'
        // Missing toOrganization
      };

      const response = await request(app)
        .post(`/vineyard/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(400);
    });

    it('should validate organization names', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        toOrganization: 'InvalidOrgMSP'
      };

      const response = await request(app)
        .post(`/vineyard/wine/${wineId}/transfer`)
        .send(transferData);

      // Should either accept or reject based on validation
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('POST /vineyard/wine/:wineId/certify', () => {
    it('should issue certificate successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const certData = {
        certificationType: 'DO Rioja',
        issuer: 'Consejo Regulador DO Rioja',
        expiryDate: '2030-12-31',
        certificationData: {
          inspector: 'Test Inspector',
          testResults: 'Excellent quality'
        }
      };

      const response = await request(app)
        .post(`/vineyard/wine/${wineId}/certify`)
        .send(certData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.certificateId).toBeDefined();
      expect(response.body.message).toBe('Certificate issued successfully');
    });

    it('should require all certificate fields', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const incompleteData = {
        certificationType: 'DO Rioja'
        // Missing required fields
      };

      const response = await request(app)
        .post(`/vineyard/wine/${wineId}/certify`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should validate expiry date format', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const certData = {
        certificationType: 'DO Rioja',
        issuer: 'Test Issuer',
        expiryDate: 'invalid-date'
      };

      const response = await request(app)
        .post(`/vineyard/wine/${wineId}/certify`)
        .send(certData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /vineyard/quality-check', () => {
    it('should perform quality check successfully', async () => {
      const qualityData = {
        wineId: `TEST-WINE-${Date.now()}`,
        inspector: 'Test Quality Inspector',
        notes: 'Excellent grape quality',
        qualityGrade: 'EXCELLENT',
        testResults: {
          sugarContent: '22 Brix',
          acidity: '6.5 pH',
          phenolicContent: 'High'
        }
      };

      const response = await request(app)
        .post('/vineyard/quality-check')
        .send(qualityData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.qualityCheck).toBeDefined();
      expect(response.body.message).toBe('Quality check completed successfully');
    });

    it('should require wine ID and test results', async () => {
      const incompleteData = {
        inspector: 'Test Inspector'
        // Missing wineId and testResults
      };

      const response = await request(app)
        .post('/vineyard/quality-check')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should validate test results format', async () => {
      const invalidData = {
        wineId: `TEST-WINE-${Date.now()}`,
        testResults: 'invalid-format' // Should be object
      };

      const response = await request(app)
        .post('/vineyard/quality-check')
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });
});