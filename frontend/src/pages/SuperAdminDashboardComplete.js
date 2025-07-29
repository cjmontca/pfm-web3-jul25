import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Tabs,
    Tab,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    IconButton,
    Tooltip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    LinearProgress,
    Badge
} from '@mui/material';
import {
    AdminPanelSettings,
    AccountBalanceWallet,
    Dashboard,
    Business,
    LocalBar,
    SwapHoriz,
    Emergency,
    Add,
    Visibility,
    Edit,
    Delete,
    Timeline,
    Analytics,
    People,
    Security,
    Warning,
    CheckCircle,
    Error,
    Sync,
    ExitToApp,
    Block,
    Send,
    QrCode
} from '@mui/icons-material';
import { useAuthStore } from '../services/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    CreateWineDialog, 
    TransferDialog, 
    EmergencyDialog 
} from '../components/superadmin/SuperAdminDialogs';

const SuperAdminDashboardComplete = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [dashboardData, setDashboardData] = useState(null);
    const [organizations, setOrganizations] = useState({});
    const [transfers, setTransfers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Dialog states
    const [transferDialog, setTransferDialog] = useState(false);
    const [createWineDialog, setCreateWineDialog] = useState(false);
    const [emergencyDialog, setEmergencyDialog] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState('');
    
    const { user, logout, getWalletAddress, isSuperAdmin } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isSuperAdmin()) {
            navigate('/login');
            return;
        }
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadDashboardData(),
                loadOrganizations(),
                loadTransfers(),
                loadAnalytics(),
                loadUsers()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Error al cargar los datos del sistema');
        } finally {
            setLoading(false);
        }
    };

    const loadDashboardData = async () => {
        const response = await api.get('/super-admin/dashboard');
        setDashboardData(response.data.data);
    };

    const loadOrganizations = async () => {
        const orgIds = ['VineyardOrgMSP', 'WineryOrgMSP', 'DistributorOrgMSP', 'ConsumerOrgMSP'];
        const orgData = {};
        
        for (const orgId of orgIds) {
            try {
                const response = await api.get(`/super-admin/organizations/${orgId}/wines`);
                orgData[orgId] = response.data.data;
            } catch (error) {
                console.error(`Error loading ${orgId}:`, error);
                orgData[orgId] = { wines: [], total: 0 };
            }
        }
        setOrganizations(orgData);
    };

    const loadTransfers = async () => {
        const response = await api.get('/super-admin/transfers');
        setTransfers(response.data.data.transfers || []);
    };

    const loadAnalytics = async () => {
        const response = await api.get('/super-admin/analytics');
        setAnalytics(response.data.data);
    };

    const loadUsers = async () => {
        const response = await api.get('/super-admin/users');
        setUsers(response.data.data.users || []);
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getOrgIcon = (orgId) => {
        const icons = {
            'VineyardOrgMSP': '🍇',
            'WineryOrgMSP': '🍷',
            'DistributorOrgMSP': '📦',
            'ConsumerOrgMSP': '🛒'
        };
        return icons[orgId] || '🏢';
    };

    const getOrgName = (orgId) => {
        const names = {
            'VineyardOrgMSP': 'Viñedos',
            'WineryOrgMSP': 'Bodegas',
            'DistributorOrgMSP': 'Distribuidores',
            'ConsumerOrgMSP': 'Consumidores'
        };
        return names[orgId] || orgId;
    };

    const getStatusColor = (status) => {
        const colors = {
            'VINEYARD': 'success',
            'WINERY': 'primary',
            'DISTRIBUTOR': 'secondary',
            'CONSUMER': 'info',
            'COMPLETED': 'success',
            'PENDING': 'warning',
            'FAILED': 'error'
        };
        return colors[status] || 'default';
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

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header Super-Admin */}
            <Paper elevation={3} sx={{ mb: 4, p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item>
                        <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <AdminPanelSettings sx={{ fontSize: 40 }} />
                        </Avatar>
                    </Grid>
                    <Grid item xs>
                        <Typography variant="h4" gutterBottom>
                            🦸 Super-Administrador - Control Total
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
                            Acceso total a {Object.keys(organizations).length} organizaciones • {dashboardData?.totalWines || 0} lotes de vino
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Button
                            variant="outlined"
                            onClick={() => loadAllData()}
                            startIcon={<Sync />}
                            sx={{ color: 'white', borderColor: 'white', mr: 2 }}
                        >
                            Actualizar
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleLogout}
                            startIcon={<ExitToApp />}
                            sx={{ color: 'white', borderColor: 'white' }}
                        >
                            Salir
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Métricas Rápidas */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <LocalBar sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                {dashboardData?.totalWines || 0}
                            </Typography>
                            <Typography>
                                Lotes Totales
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <SwapHoriz sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                {transfers.length}
                            </Typography>
                            <Typography>
                                Transferencias
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Business sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                4
                            </Typography>
                            <Typography>
                                Organizaciones
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <People sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h4" component="div" gutterBottom>
                                {users.length}
                            </Typography>
                            <Typography>
                                Usuarios Activos
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs del Dashboard */}
            <Paper sx={{ mb: 4 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab icon={<Dashboard />} label="Resumen General" />
                    <Tab icon={<Business />} label="Organizaciones" />
                    <Tab icon={<LocalBar />} label="Lotes de Vino" />
                    <Tab icon={<SwapHoriz />} label="Transferencias" />
                    <Tab icon={<Analytics />} label="Analytics" />
                    <Tab icon={<People />} label="Usuarios" />
                    <Tab icon={<Emergency />} label="Emergencias" />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ p: 3 }}>
                    {/* Tab 0: Resumen General */}
                    {activeTab === 0 && (
                        <Grid container spacing={3}>
                            {/* Estado del Sistema */}
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            🏥 Estado del Sistema
                                        </Typography>
                                        <List>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <CheckCircle color="success" />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary="Fabric Network"
                                                    secondary="Conectado y operativo"
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <CheckCircle color="success" />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary="Smart Contracts"
                                                    secondary="Todos los chaincodes desplegados"
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <CheckCircle color="success" />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary="API Backend"
                                                    secondary="Funcionando correctamente"
                                                />
                                            </ListItem>
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Distribución de Lotes */}
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            📊 Distribución de Lotes
                                        </Typography>
                                        {Object.entries(organizations).map(([orgId, data]) => (
                                            <Box key={orgId} sx={{ mb: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2">
                                                        {getOrgIcon(orgId)} {getOrgName(orgId)}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {data.total || 0}
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(data.total / (dashboardData?.totalWines || 1)) * 100}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Acciones Rápidas */}
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            ⚡ Acciones Rápidas
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<Add />}
                                                    onClick={() => setCreateWineDialog(true)}
                                                >
                                                    Crear Lote
                                                </Button>
                                            </Grid>
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    startIcon={<SwapHoriz />}
                                                    onClick={() => setTransferDialog(true)}
                                                >
                                                    Transferir
                                                </Button>
                                            </Grid>
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    startIcon={<Emergency />}
                                                    onClick={() => setEmergencyDialog(true)}
                                                >
                                                    Emergencia
                                                </Button>
                                            </Grid>
                                            <Grid item>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<Visibility />}
                                                    onClick={() => setActiveTab(2)}
                                                >
                                                    Ver Todos los Lotes
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {/* Tab 1: Organizaciones */}
                    {activeTab === 1 && (
                        <Grid container spacing={3}>
                            {Object.entries(organizations).map(([orgId, data]) => (
                                <Grid item xs={12} md={6} key={orgId}>
                                    <Card>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Typography variant="h3" sx={{ mr: 2 }}>
                                                    {getOrgIcon(orgId)}
                                                </Typography>
                                                <Box>
                                                    <Typography variant="h6">
                                                        {getOrgName(orgId)}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {orgId}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                <Chip
                                                    label={`${data.total || 0} lotes`}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                                <Chip
                                                    icon={<CheckCircle />}
                                                    label="Activa"
                                                    color="success"
                                                    size="small"
                                                />
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<Visibility />}
                                                    onClick={() => {
                                                        setSelectedOrg(orgId);
                                                        setActiveTab(2);
                                                    }}
                                                >
                                                    Ver Lotes
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<Add />}
                                                    onClick={() => {
                                                        setSelectedOrg(orgId);
                                                        setCreateWineDialog(true);
                                                    }}
                                                >
                                                    Crear Lote
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Tab 2: Lotes de Vino */}
                    {activeTab === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h5">
                                    🍷 Gestión de Lotes de Vino
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => setCreateWineDialog(true)}
                                >
                                    Crear Nuevo Lote
                                </Button>
                            </Box>

                            {Object.entries(organizations).map(([orgId, data]) => (
                                <Card key={orgId} sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {getOrgIcon(orgId)} {getOrgName(orgId)} - {data.total || 0} lotes
                                        </Typography>
                                        
                                        {data.wines && data.wines.length > 0 ? (
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>ID Lote</TableCell>
                                                            <TableCell>Estado</TableCell>
                                                            <TableCell>Fecha Creación</TableCell>
                                                            <TableCell>QR</TableCell>
                                                            <TableCell>Acciones</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {data.wines.slice(0, 5).map((wine) => (
                                                            <TableRow key={wine.Key || wine.wineId}>
                                                                <TableCell>
                                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                                        {wine.Key || wine.wineId}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={wine.Record?.currentStatus || 'VINEYARD'}
                                                                        color={getStatusColor(wine.Record?.currentStatus)}
                                                                        size="small"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    {wine.Record?.createdAt ? 
                                                                        new Date(wine.Record.createdAt).toLocaleDateString() : 
                                                                        'N/A'
                                                                    }
                                                                </TableCell>
                                                                <TableCell>
                                                                    <IconButton size="small">
                                                                        <QrCode />
                                                                    </IconButton>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Tooltip title="Ver detalles">
                                                                        <IconButton size="small">
                                                                            <Visibility />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Transferir">
                                                                        <IconButton size="small">
                                                                            <Send />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                                <Typography color="text.secondary">
                                                    No hay lotes registrados en esta organización
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}

                    {/* Tab 3: Transferencias */}
                    {activeTab === 3 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h5">
                                    🔄 Gestión de Transferencias
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<SwapHoriz />}
                                    onClick={() => setTransferDialog(true)}
                                >
                                    Nueva Transferencia
                                </Button>
                            </Box>

                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ID Transferencia</TableCell>
                                            <TableCell>Lote de Vino</TableCell>
                                            <TableCell>Desde</TableCell>
                                            <TableCell>Hacia</TableCell>
                                            <TableCell>Estado</TableCell>
                                            <TableCell>Fecha</TableCell>
                                            <TableCell>Ejecutado Por</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {transfers.map((transfer) => (
                                            <TableRow key={transfer.id}>
                                                <TableCell sx={{ fontFamily: 'monospace' }}>
                                                    {transfer.id}
                                                </TableCell>
                                                <TableCell>{transfer.wineId}</TableCell>
                                                <TableCell>
                                                    {getOrgIcon(transfer.from)} {getOrgName(transfer.from)}
                                                </TableCell>
                                                <TableCell>
                                                    {getOrgIcon(transfer.to)} {getOrgName(transfer.to)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={transfer.status}
                                                        color={getStatusColor(transfer.status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(transfer.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell>{transfer.executedBy}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* Tab 4: Analytics */}
                    {activeTab === 4 && analytics && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            📈 Métricas de Blockchain
                                        </Typography>
                                        <List>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Transacciones Totales"
                                                    secondary={analytics.totalTransactions?.toLocaleString()}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Transacciones Hoy"
                                                    secondary={analytics.transactionsToday}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Tiempo Promedio"
                                                    secondary={analytics.averageTransactionTime}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemText
                                                    primary="Carga de Red"
                                                    secondary={`${analytics.networkLoad}%`}
                                                />
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={analytics.networkLoad}
                                                    sx={{ width: 100, ml: 2 }}
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
                                            🏢 Actividad por Organización
                                        </Typography>
                                        {Object.entries(analytics.organizationActivity || {}).map(([orgId, activity]) => (
                                            <Box key={orgId} sx={{ mb: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2">
                                                        {getOrgIcon(orgId)} {getOrgName(orgId)}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {activity.transactions} txns
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Última actividad: {new Date(activity.lastActivity).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {/* Tab 5: Usuarios */}
                    {activeTab === 5 && (
                        <Box>
                            <Typography variant="h5" gutterBottom>
                                👥 Gestión de Usuarios
                            </Typography>
                            
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Usuario</TableCell>
                                            <TableCell>Organización</TableCell>
                                            <TableCell>Rol</TableCell>
                                            <TableCell>Estado</TableCell>
                                            <TableCell>Último Login</TableCell>
                                            <TableCell>Fecha Creación</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </Avatar>
                                                        {user.username}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {getOrgIcon(user.organization)} {getOrgName(user.organization)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={user.role} size="small" />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.status}
                                                        color={user.status === 'active' ? 'success' : 'error'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(user.lastLogin).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* Tab 6: Operaciones de Emergencia */}
                    {activeTab === 6 && (
                        <Box>
                            <Alert severity="warning" sx={{ mb: 3 }}>
                                <Typography variant="h6">
                                    ⚠️ Panel de Emergencias
                                </Typography>
                                <Typography>
                                    Las operaciones de emergencia son irreversibles y se registran en blockchain.
                                    Usa solo en casos críticos.
                                </Typography>
                            </Alert>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <Block color="error" sx={{ fontSize: 48, mb: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                Congelar Lote
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Bloquea un lote de vino específico para prevenir transferencias
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                onClick={() => setEmergencyDialog(true)}
                                            >
                                                Ejecutar
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <SwapHoriz color="warning" sx={{ fontSize: 48, mb: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                Transferencia Forzada
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Fuerza una transferencia sin validaciones normales
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                onClick={() => setEmergencyDialog(true)}
                                            >
                                                Ejecutar
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <Security color="error" sx={{ fontSize: 48, mb: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                Revocar Certificado
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Revoca certificados de calidad o autenticidad
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                onClick={() => setEmergencyDialog(true)}
                                            >
                                                Ejecutar
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Dialogs */}
            <CreateWineDialog
                open={createWineDialog}
                onClose={() => setCreateWineDialog(false)}
                selectedOrg={selectedOrg}
                onSuccess={(data) => {
                    console.log('Lote creado:', data);
                    loadOrganizations(); // Recargar datos
                }}
            />

            <TransferDialog
                open={transferDialog}
                onClose={() => setTransferDialog(false)}
                onSuccess={(data) => {
                    console.log('Transferencia exitosa:', data);
                    loadTransfers(); // Recargar transferencias
                    loadOrganizations(); // Recargar organizaciones
                }}
            />

            <EmergencyDialog
                open={emergencyDialog}
                onClose={() => setEmergencyDialog(false)}
                onSuccess={(data) => {
                    console.log('Operación de emergencia ejecutada:', data);
                    loadAllData(); // Recargar todos los datos
                }}
            />
        </Container>
    );
};

export default SuperAdminDashboardComplete;