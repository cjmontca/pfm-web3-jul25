const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const authRoutes = require('../../src/routes/authRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('🔐 Authentication Tests', () => {
  describe('POST /auth/login', () => {
    it('should login successfully with valid vineyard credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'vineyard_admin',
          password: 'password123',
          organization: 'VineyardOrgMSP'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.organization).toBe('VineyardOrgMSP');
      expect(response.body.data.tokens.accessToken).toBeDefined();
      
      // Verify JWT token
      const token = response.body.data.tokens.accessToken;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      expect(decoded.username).toBe('vineyard_admin');
      expect(decoded.organization).toBe('VineyardOrgMSP');
    });

    it('should login successfully with valid winery credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'winery_admin',
          password: 'password123',
          organization: 'WineryOrgMSP'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.organization).toBe('WineryOrgMSP');
    });

    it('should login successfully with valid distributor credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'distributor_admin',
          password: 'password123',
          organization: 'DistributorOrgMSP'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.organization).toBe('DistributorOrgMSP');
    });

    it('should login successfully with valid consumer credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'consumer_admin',
          password: 'password123',
          organization: 'ConsumerOrgMSP'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.organization).toBe('ConsumerOrgMSP');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'invalid_user',
          password: 'wrong_password',
          organization: 'VineyardOrgMSP'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'vineyard_admin',
          password: 'wrong_password',
          organization: 'VineyardOrgMSP'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject mismatched organization', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'vineyard_admin',
          password: 'password123',
          organization: 'WineryOrgMSP'  // Wrong organization
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid organization for this user');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'vineyard_admin'
          // Missing password and organization
        });

      expect(response.status).toBe(400);
    });

    it('should validate input format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: '',
          password: '',
          organization: ''
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBeDefined();
      expect(response.body.data.organization).toBeDefined();
    });
  });

  describe('JWT Token Tests', () => {
    it('should generate valid JWT tokens', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'vineyard_admin',
          password: 'password123',
          organization: 'VineyardOrgMSP'
        });

      const token = loginResponse.body.data.tokens.accessToken;
      expect(token).toBeDefined();

      // Verify token structure
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      expect(decoded.id).toBe('vineyard_admin');
      expect(decoded.username).toBe('vineyard_admin');
      expect(decoded.organization).toBe('VineyardOrgMSP');
      expect(decoded.role).toBe('admin');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should include correct expiration time', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'vineyard_admin',
          password: 'password123',
          organization: 'VineyardOrgMSP'
        });

      const token = loginResponse.body.data.tokens.accessToken;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      // Check that token expires in approximately 24 hours
      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(24 * 60 * 60); // 24 hours in seconds
    });
  });
});