// Jest setup file for wine traceability backend tests
require('dotenv').config({ path: '.env.test' });

// Mock console methods to avoid noise in tests
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Global test timeout
jest.setTimeout(30000);

// Mock blockchain network for tests
process.env.USE_MOCK_BLOCKCHAIN = 'true';

// Common test utilities
global.testUtils = {
  createMockWineData: () => ({
    wineId: `TEST-WINE-${Date.now()}`,
    vineyard: 'Test Vineyard',
    region: 'Test Region',
    grapeVariety: 'Tempranillo',
    harvestDate: '2025-01-01',
    plotNumber: 'P001'
  }),
  
  createMockUser: (organization = 'VineyardOrgMSP') => ({
    id: 'test_user',
    username: 'test_admin',
    organization,
    role: 'admin'
  }),
  
  generateAuthToken: () => 'Bearer test-jwt-token-for-testing'
};

// Clean up after tests
afterAll(async () => {
  // Add any cleanup logic here
  if (global.fabricClient && typeof global.fabricClient.disconnect === 'function') {
    await global.fabricClient.disconnect();
  }
});