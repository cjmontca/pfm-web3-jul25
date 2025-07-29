import React, { useState } from 'react';
import {
    Container,
    Paper,
    Tabs,
    Tab,
    Box,
    Typography,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import {
    Business,
    AdminPanelSettings,
    AccountBalanceWallet,
    Login as LoginIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MetaMaskLogin from '../components/auth/MetaMaskLogin';
import OrganizationLogin from '../components/auth/OrganizationLogin'; // Componente existente
import { useAuthStore } from '../services/authStore';

const LoginPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleOrganizationLoginSuccess = (userData, token) => {
        login(userData, token);
        
        // Redirigir según la organización
        const orgRoutes = {
            'VineyardOrgMSP': '/vineyard/dashboard',
            'WineryOrgMSP': '/winery/dashboard',
            'DistributorOrgMSP': '/distributor/dashboard',
            'ConsumerOrgMSP': '/consumer/dashboard'
        };
        
        const route = orgRoutes[userData.organization] || '/dashboard';
        navigate(route);
    };

    const handleSuperAdminLoginSuccess = (userData) => {
        // Ya manejado por el componente MetaMaskLogin
        navigate('/super-admin/dashboard');
    };

    const handleLoginError = (error) => {
        console.error('Login error:', error);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom>
                    🍷 Wine Traceability
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Sistema de Trazabilidad de Vinos con Blockchain
                </Typography>
            </Box>

            {/* Tabs para tipos de login */}
            <Paper elevation={3}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab 
                        icon={<Business />} 
                        label="Organizaciones" 
                        sx={{ py: 2 }}
                    />
                    <Tab 
                        icon={<AdminPanelSettings />} 
                        label="Super-Administrador" 
                        sx={{ py: 2 }}
                    />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ p: 0 }}>
                    {/* Tab 1: Login de Organizaciones */}
                    {activeTab === 0 && (
                        <Box>
                            <Card elevation={0}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                                        <Business color="primary" sx={{ fontSize: 48, mb: 2 }} />
                                        <Typography variant="h5" gutterBottom>
                                            Acceso por Organización
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Login tradicional para viñedos, bodegas, distribuidores y consumidores
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ mb: 3 }} />

                                    {/* Componente de login existente */}
                                    <OrganizationLogin 
                                        onSuccess={handleOrganizationLoginSuccess}
                                        onError={handleLoginError}
                                    />

                                    {/* Usuarios de ejemplo */}
                                    <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                            👤 Usuarios de Prueba:
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" component="div">
                                            • 🍇 <strong>vineyard_admin</strong> / password123<br/>
                                            • 🍷 <strong>winery_admin</strong> / password123<br/>
                                            • 📦 <strong>distributor_admin</strong> / password123<br/>
                                            • 🛒 <strong>consumer_admin</strong> / password123
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    {/* Tab 2: Login MetaMask Super-Admin */}
                    {activeTab === 1 && (
                        <Box>
                            <MetaMaskLogin 
                                onSuccess={handleSuperAdminLoginSuccess}
                                onError={handleLoginError}
                            />
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Footer Info */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="caption" color="text.secondary">
                    Desarrollado con Hyperledger Fabric • React.js • Node.js
                </Typography>
            </Box>
        </Container>
    );
};

export default LoginPage;