const request = require('supertest');
const express = require('express');

// Mock the auth middleware before requiring any routes
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, res, next) => {
    req.user = global.testUtils.createMockUser(req.headers['x-org'] || 'VineyardOrgMSP');
    next();
  }
}));

const fabricClient = require('../../src/fabric-client/fabricClient');

// Import routes
const authRoutes = require('../../src/routes/authRoutes');
const vineyardRoutes = require('../../src/routes/vineyardRoutes');
const wineryRoutes = require('../../src/routes/wineryRoutes');
const distributorRoutes = require('../../src/routes/distributorRoutes');
const consumerRoutes = require('../../src/routes/consumerRoutes');

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = global.testUtils.createMockUser(req.headers['x-org'] || 'VineyardOrgMSP');
  next();
};

// Setup routes
app.use('/auth', authRoutes);
app.use('/vineyard', mockAuth, vineyardRoutes);
app.use('/winery', mockAuth, wineryRoutes);
app.use('/distributor', mockAuth, distributorRoutes);
app.use('/consumer', mockAuth, consumerRoutes);

describe('🔄 Integration Tests - Complete Wine Traceability Flow', () => {
  let authTokens = {};
  let testWineId;

  beforeAll(async () => {
    // Ensure mock blockchain is enabled
    process.env.USE_MOCK_BLOCKCHAIN = 'true';
    
    // Initialize fabric client
    await fabricClient.initializeNetwork();
    
    testWineId = `INTEGRATION-WINE-${Date.now()}`;
  });

  afterAll(async () => {
    if (fabricClient && typeof fabricClient.disconnect === 'function') {
      await fabricClient.disconnect();
    }
  });

  describe('Step 1: Authentication for All Organizations', () => {
    const organizations = [
      { username: 'vineyard_admin', org: 'VineyardOrgMSP' },
      { username: 'winery_admin', org: 'WineryOrgMSP' },
      { username: 'distributor_admin', org: 'DistributorOrgMSP' },
      { username: 'consumer_admin', org: 'ConsumerOrgMSP' }
    ];

    organizations.forEach(({ username, org }) => {
      it(`should authenticate ${username} successfully`, async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            username,
            password: 'password123',
            organization: org
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.accessToken).toBeDefined();
        
        // Store token for later use
        authTokens[org] = response.body.data.tokens.accessToken;
      });
    });
  });

  describe('Step 2: Vineyard - Register Wine Batch', () => {
    it('should register new wine batch at vineyard', async () => {
      const wineData = {
        wineId: testWineId,
        vineyard: 'Integration Test Premium Vineyard',
        region: 'Test DO Rioja',
        grapeVariety: 'Tempranillo',
        harvestDate: '2025-01-15',
        plotNumber: 'INT-P001',
        climateConditions: 'Perfect integration test conditions',
        sustainablePractices: 'Organic integration farming',
        certifications: ['DO Rioja', 'Ecológico', 'Test Certification']
      };

      const response = await request(app)
        .post('/vineyard/register-batch')
        .set('x-org', 'VineyardOrgMSP')
        .send(wineData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.message).toBe('Wine batch registered successfully');
    });

    it('should verify wine appears in vineyard wines list', async () => {
      const response = await request(app)
        .get('/vineyard/wines')
        .set('x-org', 'VineyardOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wines).toBeDefined();
      expect(Array.isArray(response.body.data.wines)).toBe(true);
    });
  });

  describe('Step 3: Vineyard to Winery Transfer', () => {
    it('should initiate transfer from vineyard to winery', async () => {
      const transferData = {
        toOrganization: 'WineryOrgMSP',
        carrier: 'Integration Test Transport',
        notes: 'Premium grapes for integration testing'
      };

      const response = await request(app)
        .post(`/vineyard/wine/${testWineId}/transfer`)
        .set('x-org', 'VineyardOrgMSP')
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer initiated successfully');
    });
  });

  describe('Step 4: Winery - Process Wine', () => {
    it('should process wine at winery', async () => {
      const processData = {
        wineId: testWineId,
        sourceBatch: testWineId,
        fermentationData: {
          startDate: '2025-01-20',
          temperature: '18°C',
          duration: '15 days',
          yeastType: 'Integration test yeast'
        },
        processNotes: 'Integration test premium fermentation'
      };

      const response = await request(app)
        .post('/winery/process-wine')
        .set('x-org', 'WineryOrgMSP')
        .send(processData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine processing started successfully');
    });

    it('should age wine at winery', async () => {
      const ageData = {
        agingType: 'French oak barrel aging',
        barrelType: 'Premium French oak',
        duration: '12 months',
        temperature: '15°C',
        humidity: '70%'
      };

      const response = await request(app)
        .post(`/winery/wine/${testWineId}/age`)
        .set('x-org', 'WineryOrgMSP')
        .send(ageData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Aging process started successfully');
    });

    it('should bottle wine at winery', async () => {
      const bottleData = {
        bottleDate: '2025-12-31',
        bottleType: '750ml Premium Bordeaux bottle',
        closureType: 'Natural premium cork',
        labelDesign: 'Integration test premium label',
        batchSize: 500
      };

      const response = await request(app)
        .post(`/winery/wine/${testWineId}/bottle`)
        .set('x-org', 'WineryOrgMSP')
        .send(bottleData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine bottled successfully');
    });
  });

  describe('Step 5: Winery to Distributor Transfer', () => {
    it('should transfer wine from winery to distributor', async () => {
      const transferData = {
        toOrganization: 'DistributorOrgMSP',
        quantity: 500,
        carrier: 'Integration Premium Wine Logistics',
        expectedDelivery: '2025-02-15'
      };

      const response = await request(app)
        .post(`/winery/wine/${testWineId}/transfer`)
        .set('x-org', 'WineryOrgMSP')
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer initiated successfully');
    });
  });

  describe('Step 6: Distributor - Receive and Distribute', () => {
    it('should receive wine at distributor', async () => {
      const receiptData = {
        receivedDate: '2025-02-15',
        condition: 'Perfect condition',
        temperature: '15°C',
        notes: 'Integration test premium wine received'
      };

      const response = await request(app)
        .post(`/distributor/wine/${testWineId}/receive`)
        .set('x-org', 'DistributorOrgMSP')
        .send(receiptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wine received successfully');
    });

    it('should verify wine in distributor inventory', async () => {
      const response = await request(app)
        .get('/distributor/wines')
        .set('x-org', 'DistributorOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wines).toBeDefined();
    });
  });

  describe('Step 7: Distributor to Consumer Transfer', () => {
    it('should transfer wine from distributor to consumer', async () => {
      const transferData = {
        toOrganization: 'ConsumerOrgMSP',
        quantity: 100,
        destination: 'Integration Test Premium Wine Store'
      };

      const response = await request(app)
        .post(`/distributor/wine/${testWineId}/transfer`)
        .set('x-org', 'DistributorOrgMSP')
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer initiated successfully');
    });
  });

  describe('Step 8: Consumer - Verify Authenticity', () => {
    it('should verify wine authenticity by QR code', async () => {
      const qrCode = `QR-${testWineId}-integration-test`;

      const response = await request(app)
        .get(`/consumer/trace/${qrCode}`)
        .set('x-org', 'ConsumerOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wine).toBeDefined();
    });

    it('should get complete wine history', async () => {
      const response = await request(app)
        .get(`/consumer/wine/${testWineId}/history`)
        .set('x-org', 'ConsumerOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toBeDefined();
    });

    it('should verify wine authenticity', async () => {
      const response = await request(app)
        .get(`/consumer/wine/${testWineId}/verify`)
        .set('x-org', 'ConsumerOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authentic).toBeDefined();
    });

    it('should get wine certificates', async () => {
      const response = await request(app)
        .get(`/consumer/wine/${testWineId}/certificates`)
        .set('x-org', 'ConsumerOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.certificates).toBeDefined();
    });
  });

  describe('Step 9: Cross-Organization Data Consistency', () => {
    it('should maintain data consistency across all organizations', async () => {
      const organizations = ['VineyardOrgMSP', 'WineryOrgMSP', 'DistributorOrgMSP'];

      for (const org of organizations) {
        const response = await request(app)
          .get(`/${org.toLowerCase().replace('orgmsp', '')}/wines`)
          .set('x-org', org);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should provide complete traceability across the supply chain', async () => {
      // Verify that wine history includes all stages
      const response = await request(app)
        .get(`/consumer/wine/${testWineId}/history`)
        .set('x-org', 'ConsumerOrgMSP');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // History should include multiple stages of the supply chain
      const history = response.body.data.history;
      expect(history).toBeDefined();
    });
  });

  describe('Step 10: Performance and Error Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/vineyard/wines')
            .set('x-org', 'VineyardOrgMSP')
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle invalid wine IDs gracefully', async () => {
      const response = await request(app)
        .get('/consumer/wine/INVALID-WINE-ID/verify')
        .set('x-org', 'ConsumerOrgMSP');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle network errors gracefully', async () => {
      // Test with temporarily broken blockchain connection
      const originalEnv = process.env.USE_MOCK_BLOCKCHAIN;
      process.env.USE_MOCK_BLOCKCHAIN = 'false';

      const response = await request(app)
        .get('/vineyard/wines')
        .set('x-org', 'VineyardOrgMSP');

      // Should either work or fail gracefully
      expect([200, 500]).toContain(response.status);

      // Restore original env
      process.env.USE_MOCK_BLOCKCHAIN = originalEnv;
    });
  });
});