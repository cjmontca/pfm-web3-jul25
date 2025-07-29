import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Button,
    Avatar,
    Divider,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    AdminPanelSettings,
    AccountBalanceWallet,
    Security,
    Visibility,
    SwapHoriz,
    Emergency,
    ExitToApp,
    Business,
    LocalBar,
    Assessment,
    Settings,
    CheckCircle,
    Error,
    Warning,
    Timeline
} from '@mui/icons-material';
import { useAuthStore } from '../services/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const SuperAdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, logout, getWalletAddress, isSuperAdmin } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isSuperAdmin()) {
            navigate('/login');
            return;
        }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/super-admin/dashboard');
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Error al cargar los datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (loading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress size={60} />
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    const { superAdmin, totalWines, organizationStats, statusDistribution, systemHealth } = dashboardData || {};

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header con información del Super-Admin */}
            <Paper elevation={2} sx={{ mb: 4, p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item>
                        <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <AdminPanelSettings sx={{ fontSize: 40 }} />
                        </Avatar>
                    </Grid>
                    <Grid item xs>
                        <Typography variant="h4" gutterBottom>
                            🦸 Super-Administrador
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <AccountBalanceWallet />
                            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                {formatAddress(getWalletAddress())}
                            </Typography>
                            <Chip
                                icon={<Security />}
                                label="MetaMask Auth"
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Autenticado: {superAdmin?.loginTime ? new Date(superAdmin.loginTime).toLocaleString() : 'N/A'}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Button
                            variant="outlined"
                            onClick={handleLogout}
                            startIcon={<ExitToApp />}
                            sx={{ color: 'white', borderColor: 'white' }}
                        >
                            Cerrar Sesión
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Métricas Principales */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <LocalBar color="primary" sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                {totalWines || 0}
                            </Typography>
                            <Typography color="text.secondary">
                                Lotes Totales
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Business color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                4
                            </Typography>
                            <Typography color="text.secondary">
                                Organizaciones
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Timeline color="success" sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                {systemHealth?.lastBlockHeight || 0}
                            </Typography>
                            <Typography color="text.secondary">
                                Altura Blockchain
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <CheckCircle color={systemHealth?.fabricConnected ? 'success' : 'error'} sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                {systemHealth?.peersActive || 0}
                            </Typography>
                            <Typography color="text.secondary">
                                Peers Activos
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Estado del Sistema */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                🏥 Estado del Sistema
                            </Typography>
                            <List>
                                <ListItem>
                                    <ListItemIcon>
                                        {systemHealth?.fabricConnected ? 
                                            <CheckCircle color="success" /> : 
                                            <Error color="error" />
                                        }
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Fabric Network"
                                        secondary={systemHealth?.fabricConnected ? 'Conectado' : 'Desconectado'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        {systemHealth?.chaincodeDeployed ? 
                                            <CheckCircle color="success" /> : 
                                            <Warning color="warning" />
                                        }
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Smart Contracts"
                                        secondary={systemHealth?.chaincodeDeployed ? 'Desplegados' : 'Pendientes'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <CheckCircle color="success" />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="API Backend"
                                        secondary="Operativo"
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                📊 Distribución por Estado
                            </Typography>
                            {statusDistribution && Object.entries(statusDistribution).map(([status, count]) => (
                                <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2">
                                        {status}
                                    </Typography>
                                    <Chip
                                        label={count}
                                        size="small"
                                        color={count > 0 ? 'primary' : 'default'}
                                    />
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Organizaciones */}
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        🏢 Organizaciones de la Red
                    </Typography>
                    <Grid container spacing={2}>
                        {organizationStats && Object.entries(organizationStats).map(([orgId, count]) => {
                            const orgInfo = {
                                'VineyardOrgMSP': { name: '🍇 Viñedos', color: 'success' },
                                'WineryOrgMSP': { name: '🍷 Bodegas', color: 'primary' },
                                'DistributorOrgMSP': { name: '📦 Distribuidores', color: 'secondary' },
                                'ConsumerOrgMSP': { name: '🛒 Consumidores', color: 'info' }
                            }[orgId] || { name: orgId, color: 'default' };

                            return (
                                <Grid item xs={12} sm={6} md={3} key={orgId}>
                                    <Paper 
                                        elevation={1} 
                                        sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { elevation: 3 } }}
                                    >
                                        <Typography variant="h6" gutterBottom>
                                            {orgInfo.name}
                                        </Typography>
                                        <Chip
                                            label={`${count} lotes`}
                                            color={orgInfo.color}
                                            size="small"
                                        />
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </CardContent>
            </Card>

            {/* Permisos del Super-Admin */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        🔐 Permisos de Super-Administrador
                    </Typography>
                    <Grid container spacing={2}>
                        {superAdmin?.permissions?.map((permission) => (
                            <Grid item key={permission}>
                                <Chip
                                    icon={<Security />}
                                    label={permission.replace(/_/g, ' ')}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                />
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    );
};

export default SuperAdminDashboard;