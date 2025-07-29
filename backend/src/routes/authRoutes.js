const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const validate = require('../middleware/validate');

const router = express.Router();

// Temporary auth for testing blockchain integration
router.post('/login', 
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
        body('organization').notEmpty().withMessage('Organization is required')
    ],
    validate,
    async (req, res) => {
        try {
            const { username, password, organization } = req.body;
            
            // Credenciales válidas para diferentes organizaciones
            const validCredentials = {
                'vineyard_admin': 'VineyardOrgMSP',
                'winery_admin': 'WineryOrgMSP',
                'distributor_admin': 'DistributorOrgMSP',
                'consumer_admin': 'ConsumerOrgMSP'
            };
            
            // Validar credenciales
            if (password === 'password123' && validCredentials[username]) {
                const userOrganization = validCredentials[username];
                
                // Verificar que la organización coincida
                if (organization !== userOrganization) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid organization for this user'
                    });
                }
                
                // Generar token JWT
                const token = jwt.sign(
                    { 
                        id: username, 
                        username: username,
                        organization: userOrganization,
                        role: 'admin' 
                    },
                    process.env.JWT_SECRET || 'fallback-secret',
                    { expiresIn: '24h' }
                );
                
                res.json({
                    success: true,
                    data: {
                        user: {
                            id: username,
                            username: username,
                            organization: userOrganization,
                            role: 'admin'
                        },
                        tokens: {
                            accessToken: token
                        }
                    },
                    message: 'Login successful'
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
);

router.get('/profile', (req, res) => {
    res.json({
        success: true,
        data: {
            id: 'test-user',
            username: 'test_user',
            organization: 'TestOrg',
            role: 'admin'
        }
    });
});

module.exports = router;