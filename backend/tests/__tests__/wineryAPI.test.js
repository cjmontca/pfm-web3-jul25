const request = require('supertest');
const express = require('express');

// Mock the auth middleware before requiring wineryRoutes
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = global.testUtils.createMockUser('WineryOrgMSP');
    next();
  }
}));

const wineryRoutes = require('../../src/routes/wineryRoutes');

// Create test app with authentication
const app = express();
app.use(express.json());
app.use('/winery', wineryRoutes);

describe('🍷 Winery API Tests', () => {
  describe('POST /winery/process-wine', () => {
    it('should process wine successfully', async () => {
      const processData = {
        wineId: `TEST-WINE-${Date.now()}`,
        sourceBatch: 'GRAPE-BATCH-001',
        fermentationData: {
          startDate: '2025-01-20',
          temperature: '18°C',
          duration: '15 days',
          yeastType: 'Selected wine yeast'
        },
        processNotes: 'Premium fermentation process'
      };

      const response = await request(app)
        .post('/winery/process-wine')
        .send(processData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine processing started successfully');
    });

    it('should require wine ID', async () => {
      const incompleteData = {
        sourceBatch: 'GRAPE-BATCH-001'
        // Missing wineId
      };

      const response = await request(app)
        .post('/winery/process-wine')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /winery/wines', () => {
    it('should return winery wines', async () => {
      const response = await request(app)
        .get('/winery/wines');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wines).toBeDefined();
      expect(Array.isArray(response.body.data.wines)).toBe(true);
    });

    it('should return demo data when blockchain not initialized', async () => {
      const response = await request(app)
        .get('/winery/wines');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Demo data');
    });
  });

  describe('POST /winery/wine/:wineId/age', () => {
    it('should start aging process successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const ageData = {
        agingType: 'Oak barrel aging',
        barrelType: 'French oak',
        duration: '12 months',
        temperature: '15°C',
        humidity: '70%'
      };

      const response = await request(app)
        .post(`/winery/wine/${wineId}/age`)
        .send(ageData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Aging process started successfully');
    });

    it('should require aging type', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const incompleteData = {
        duration: '12 months'
        // Missing agingType
      };

      const response = await request(app)
        .post(`/winery/wine/${wineId}/age`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /winery/wine/:wineId/bottle', () => {
    it('should bottle wine successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const bottleData = {
        bottleDate: '2025-12-31',
        bottleType: '750ml Bordeaux bottle',
        closureType: 'Natural cork',
        labelDesign: 'Premium label',
        batchSize: 500
      };

      const response = await request(app)
        .post(`/winery/wine/${wineId}/bottle`)
        .send(bottleData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine bottled successfully');
    });

    it('should require bottle date', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const incompleteData = {
        bottleType: '750ml bottle'
        // Missing bottleDate
      };

      const response = await request(app)
        .post(`/winery/wine/${wineId}/bottle`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /winery/wine/:wineId/transfer', () => {
    it('should transfer wine to distributor successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        toOrganization: 'DistributorOrgMSP',
        quantity: 100,
        carrier: 'Premium Wine Logistics',
        expectedDelivery: '2025-02-15'
      };

      const response = await request(app)
        .post(`/winery/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer initiated successfully');
    });

    it('should require destination organization', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        quantity: 100
        // Missing toOrganization
      };

      const response = await request(app)
        .post(`/winery/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /winery/dashboard-stats', () => {
    it('should return winery dashboard statistics', async () => {
      const response = await request(app)
        .get('/winery/dashboard-stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalWines).toBeDefined();
      expect(response.body.data.processing).toBeDefined();
      expect(response.body.data.aging).toBeDefined();
      expect(response.body.data.bottled).toBeDefined();
    });

    it('should return valid statistics structure', async () => {
      const response = await request(app)
        .get('/winery/dashboard-stats');

      const stats = response.body.data;
      expect(typeof stats.totalWines).toBe('number');
      expect(typeof stats.processing).toBe('number');
      expect(typeof stats.aging).toBe('number');
      expect(typeof stats.bottled).toBe('number');
    });
  });

  describe('GET /winery/wine/:wineId', () => {
    it('should return wine details', async () => {
      const wineId = 'TEST-WINE-001';
      
      const response = await request(app)
        .get(`/winery/wine/${wineId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
    });

    it('should handle non-existent wine ID', async () => {
      const response = await request(app)
        .get('/winery/wine/NON-EXISTENT-WINE');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Wine Processing Workflow', () => {
    it('should handle complete wine processing workflow', async () => {
      const wineId = `WORKFLOW-WINE-${Date.now()}`;

      // 1. Process wine
      const processResponse = await request(app)
        .post('/winery/process-wine')
        .send({
          wineId,
          sourceBatch: 'GRAPE-BATCH-001',
          fermentationData: {
            startDate: '2025-01-20',
            temperature: '18°C'
          }
        });

      expect(processResponse.status).toBe(201);

      // 2. Start aging
      const ageResponse = await request(app)
        .post(`/winery/wine/${wineId}/age`)
        .send({
          agingType: 'Oak barrel aging',
          duration: '12 months'
        });

      expect(ageResponse.status).toBe(200);

      // 3. Bottle wine
      const bottleResponse = await request(app)
        .post(`/winery/wine/${wineId}/bottle`)
        .send({
          bottleDate: '2025-12-31',
          bottleType: '750ml bottle'
        });

      expect(bottleResponse.status).toBe(200);

      // 4. Transfer to distributor
      const transferResponse = await request(app)
        .post(`/winery/wine/${wineId}/transfer`)
        .send({
          toOrganization: 'DistributorOrgMSP',
          quantity: 100
        });

      expect(transferResponse.status).toBe(201);
    });
  });
});