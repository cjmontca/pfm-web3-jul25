const request = require('supertest');
const express = require('express');

// Mock the auth middleware before requiring distributorRoutes
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = global.testUtils.createMockUser('DistributorOrgMSP');
    next();
  }
}));

const distributorRoutes = require('../../src/routes/distributorRoutes');

// Create test app with authentication
const app = express();
app.use(express.json());
app.use('/distributor', distributorRoutes);

describe('🚚 Distributor API Tests', () => {
  describe('GET /distributor/wines', () => {
    it('should return distributor wines inventory', async () => {
      const response = await request(app)
        .get('/distributor/wines');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wines).toBeDefined();
      expect(Array.isArray(response.body.data.wines)).toBe(true);
    });

    it('should support pagination for wine inventory', async () => {
      const response = await request(app)
        .get('/distributor/wines')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.itemsPerPage).toBe(10);
    });

    it('should filter wines by status', async () => {
      const response = await request(app)
        .get('/distributor/wines')
        .query({ status: 'DISTRIBUTOR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return demo data when blockchain not initialized', async () => {
      const response = await request(app)
        .get('/distributor/wines');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Demo data');
    });
  });

  describe('POST /distributor/wine/:wineId/receive', () => {
    it('should receive wine from winery successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const receiptData = {
        receivedDate: '2025-01-25',
        condition: 'Excellent condition',
        temperature: '14°C',
        notes: 'Premium wine received in perfect condition',
        qualityCheck: {
          inspector: 'Test Quality Inspector',
          visualInspection: 'Excellent',
          temperatureCheck: 'Compliant'
        }
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/receive`)
        .send(receiptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine received successfully');
    });

    it('should require received date', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const incompleteData = {
        condition: 'Good condition'
        // Missing receivedDate
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/receive`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should validate date format', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const invalidData = {
        receivedDate: 'invalid-date',
        condition: 'Good'
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/receive`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /distributor/wine/:wineId/store', () => {
    it('should store wine in warehouse successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const storageData = {
        warehouseLocation: 'Warehouse A - Section 3',
        storageConditions: {
          temperature: '15°C',
          humidity: '65%',
          lighting: 'UV protected'
        },
        storageDuration: '6 months',
        notes: 'Optimal storage conditions maintained'
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/store`)
        .send(storageData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine stored successfully');
    });

    it('should require warehouse location', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const incompleteData = {
        storageConditions: { temperature: '15°C' }
        // Missing warehouseLocation
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/store`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /distributor/wine/:wineId/transfer', () => {
    it('should transfer wine to consumer successfully', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        toOrganization: 'ConsumerOrgMSP',
        quantity: 50,
        destination: 'Premium Wine Store Madrid',
        carrier: 'Premium Wine Logistics',
        expectedDelivery: '2025-02-10',
        transportConditions: {
          temperature: '15°C',
          vehicle: 'Refrigerated truck'
        }
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer initiated successfully');
    });

    it('should require destination organization', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        quantity: 50
        // Missing toOrganization
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(400);
    });

    it('should validate quantity', async () => {
      const wineId = `TEST-WINE-${Date.now()}`;
      const transferData = {
        toOrganization: 'ConsumerOrgMSP',
        quantity: -5 // Invalid negative quantity
      };

      const response = await request(app)
        .post(`/distributor/wine/${wineId}/transfer`)
        .send(transferData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /distributor/dashboard-stats', () => {
    it('should return distributor dashboard statistics', async () => {
      const response = await request(app)
        .get('/distributor/dashboard-stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalWines).toBeDefined();
      expect(response.body.data.inStock).toBeDefined();
      expect(response.body.data.shipped).toBeDefined();
      expect(response.body.data.monthlyTransfers).toBeDefined();
    });

    it('should return valid statistics structure', async () => {
      const response = await request(app)
        .get('/distributor/dashboard-stats');

      const stats = response.body.data;
      expect(typeof stats.totalWines).toBe('number');
      expect(typeof stats.inStock).toBe('number');
      expect(typeof stats.shipped).toBe('number');
      expect(typeof stats.monthlyTransfers).toBe('object');
    });
  });

  describe('GET /distributor/wine/:wineId', () => {
    it('should return wine details from distributor inventory', async () => {
      const wineId = 'TEST-WINE-001';
      
      const response = await request(app)
        .get(`/distributor/wine/${wineId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
    });

    it('should handle non-existent wine ID', async () => {
      const response = await request(app)
        .get('/distributor/wine/NON-EXISTENT-WINE');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /distributor/transfers', () => {
    it('should return transfer history', async () => {
      const response = await request(app)
        .get('/distributor/transfers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transfers).toBeDefined();
      expect(Array.isArray(response.body.data.transfers)).toBe(true);
    });

    it('should filter transfers by status', async () => {
      const response = await request(app)
        .get('/distributor/transfers')
        .query({ status: 'PENDING' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter transfers by date range', async () => {
      const response = await request(app)
        .get('/distributor/transfers')
        .query({ 
          startDate: '2025-01-01',
          endDate: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /distributor/inventory-check', () => {
    it('should perform inventory check successfully', async () => {
      const inventoryData = {
        checkDate: '2025-01-25',
        inspector: 'Test Inventory Inspector',
        location: 'Warehouse A',
        items: [
          {
            wineId: 'TEST-WINE-001',
            expectedQuantity: 100,
            actualQuantity: 98,
            condition: 'Excellent'
          }
        ],
        notes: 'Minor discrepancy found, investigating'
      };

      const response = await request(app)
        .post('/distributor/inventory-check')
        .send(inventoryData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inventoryCheck).toBeDefined();
      expect(response.body.message).toBe('Inventory check completed successfully');
    });

    it('should require check date and inspector', async () => {
      const incompleteData = {
        location: 'Warehouse A'
        // Missing checkDate and inspector
      };

      const response = await request(app)
        .post('/distributor/inventory-check')
        .send(incompleteData);

      expect(response.status).toBe(400);
    });

    it('should validate items array format', async () => {
      const invalidData = {
        checkDate: '2025-01-25',
        inspector: 'Test Inspector',
        items: 'invalid-format' // Should be array
      };

      const response = await request(app)
        .post('/distributor/inventory-check')
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('Distribution Workflow', () => {
    it('should handle complete distribution workflow', async () => {
      const wineId = `WORKFLOW-WINE-${Date.now()}`;

      // 1. Receive wine
      const receiveResponse = await request(app)
        .post(`/distributor/wine/${wineId}/receive`)
        .send({
          receivedDate: '2025-01-25',
          condition: 'Excellent'
        });

      expect(receiveResponse.status).toBe(200);

      // 2. Store wine
      const storeResponse = await request(app)
        .post(`/distributor/wine/${wineId}/store`)
        .send({
          warehouseLocation: 'Warehouse A',
          storageConditions: { temperature: '15°C' }
        });

      expect(storeResponse.status).toBe(200);

      // 3. Transfer to consumer
      const transferResponse = await request(app)
        .post(`/distributor/wine/${wineId}/transfer`)
        .send({
          toOrganization: 'ConsumerOrgMSP',
          quantity: 50,
          destination: 'Test Wine Store'
        });

      expect(transferResponse.status).toBe(201);
    });
  });
});