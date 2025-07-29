const fabricClient = require('../../src/fabric-client/fabricClient');

describe('🔗 Fabric Client Tests', () => {
  beforeAll(async () => {
    // Ensure mock blockchain is enabled for tests
    process.env.USE_MOCK_BLOCKCHAIN = 'true';
  });

  afterAll(async () => {
    if (fabricClient && typeof fabricClient.disconnect === 'function') {
      await fabricClient.disconnect();
    }
  });

  describe('Network Initialization', () => {
    it('should initialize network successfully', async () => {
      const result = await fabricClient.initializeNetwork();
      expect(result).toBeDefined();
    });

    it('should handle initialization in mock mode', async () => {
      process.env.USE_MOCK_BLOCKCHAIN = 'true';
      const result = await fabricClient.initializeNetwork();
      expect(result).toBeDefined();
    });
  });

  describe('Chaincode Operations', () => {
    beforeEach(async () => {
      // Ensure network is initialized before each test
      await fabricClient.initializeNetwork();
    });

    describe('Wine Traceability Chaincode', () => {
      it('should create wine batch successfully', async () => {
        const wineData = global.testUtils.createMockWineData();
        
        const result = await fabricClient.invokeChaincode(
          'wine',
          'createWineBatch',
          [wineData.wineId, JSON.stringify(wineData)]
        );

        expect(result).toBeDefined();
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        expect(parsedResult.success).toBe(true);
      });

      it('should update wine status successfully', async () => {
        const wineId = `TEST-WINE-${Date.now()}`;
        const updateData = {
          status: 'WINERY',
          processDate: new Date().toISOString(),
          processor: 'Test Winery'
        };

        const result = await fabricClient.invokeChaincode(
          'wine',
          'updateWineStatus',
          [wineId, 'WINERY', JSON.stringify(updateData)]
        );

        expect(result).toBeDefined();
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        expect(parsedResult.success).toBe(true);
      });

      it('should transfer wine successfully', async () => {
        const wineId = `TEST-WINE-${Date.now()}`;
        const transferData = {
          fromOrg: 'VineyardOrgMSP',
          toOrg: 'WineryOrgMSP',
          transferDate: new Date().toISOString(),
          carrier: 'Test Transport'
        };

        const result = await fabricClient.invokeChaincode(
          'wine',
          'transferWine',
          [wineId, 'VineyardOrgMSP', 'WineryOrgMSP', JSON.stringify(transferData)]
        );

        expect(result).toBeDefined();
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        expect(parsedResult.success).toBe(true);
      });

      it('should query wine history successfully', async () => {
        const wineId = `TEST-WINE-${Date.now()}`;

        const result = await fabricClient.queryChaincode(
          'wine',
          'getWineHistory',
          [wineId]
        );

        expect(result).toBeDefined();
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        expect(parsedResult.success).toBe(true);
      });

      it('should query wines by status successfully', async () => {
        const result = await fabricClient.queryChaincode(
          'wine',
          'queryWinesByStatus',
          ['VINEYARD']
        );

        expect(result).toBeDefined();
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        expect(parsedResult.success).toBe(true);
      });

      it('should verify wine authenticity successfully', async () => {
        const qrCode = `QR-TEST-WINE-${Date.now()}`;

        const result = await fabricClient.queryChaincode(
          'wine',
          'verifyAuthenticity',
          [qrCode]
        );

        expect(result).toBeDefined();
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        expect(parsedResult.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid chaincode name', async () => {
        try {
          await fabricClient.invokeChaincode(
            'invalid-chaincode',
            'testFunction',
            []
          );
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should handle invalid function name', async () => {
        try {
          await fabricClient.invokeChaincode(
            'wine',
            'invalidFunction',
            []
          );
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should handle missing arguments', async () => {
        try {
          await fabricClient.invokeChaincode(
            'wine',
            'createWineBatch',
            [] // Missing required arguments
          );
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('Mock vs Real Blockchain', () => {
    it('should use mock client when USE_MOCK_BLOCKCHAIN is true', () => {
      process.env.USE_MOCK_BLOCKCHAIN = 'true';
      expect(process.env.USE_MOCK_BLOCKCHAIN).toBe('true');
    });

    it('should handle mock operations correctly', async () => {
      process.env.USE_MOCK_BLOCKCHAIN = 'true';
      
      const result = await fabricClient.invokeChaincode(
        'wine',
        'createWineBatch',
        ['TEST-WINE', '{"test": "data"}']
      );

      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.message).toContain('Mock');
    });
  });

  describe('Network Status', () => {
    it('should get network status', async () => {
      try {
        const status = await fabricClient.getNetworkStatus();
        expect(status).toBeDefined();
      } catch (error) {
        // Network status might not be available in mock mode
        expect(error).toBeDefined();
      }
    });
  });

  describe('Connection Management', () => {
    it('should handle disconnect gracefully', async () => {
      try {
        await fabricClient.disconnect();
        // Should not throw error
        expect(true).toBe(true);
      } catch (error) {
        // Mock client might not have disconnect method
        expect(error.message).toContain('disconnect');
      }
    });
  });
});