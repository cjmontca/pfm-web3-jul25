import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    Paper
} from '@mui/material';
import {
    AccountBalanceWallet,
    Security,
    AdminPanelSettings,
    Warning,
    CheckCircle
} from '@mui/icons-material';
import { useAuthStore } from '../../services/authStore';
import api from '../../services/api';

const MetaMaskLogin = ({ onSuccess, onError }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [walletAddress, setWalletAddress] = useState(null);
    const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('detect'); // detect, connect, sign, verify
    const { login } = useAuthStore();

    useEffect(() => {
        checkMetaMaskInstallation();
    }, []);

    const checkMetaMaskInstallation = () => {
        if (typeof window.ethereum !== 'undefined') {
            setIsMetaMaskInstalled(true);
            checkConnection();
        } else {
            setIsMetaMaskInstalled(false);
            setError('MetaMask no está instalado. Por favor, instala MetaMask para continuar.');
        }
    };

    const checkConnection = async () => {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                setStep('sign');
            } else {
                setStep('connect');
            }
        } catch (error) {
            console.error('Error checking connection:', error);
            setStep('connect');
        }
    };

    const connectWallet = async () => {
        if (!isMetaMaskInstalled) {
            setError('MetaMask no está instalado');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Solicitar conexión a MetaMask
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No se seleccionó ninguna cuenta');
            }

            const address = accounts[0];
            setWalletAddress(address);
            setStep('sign');

        } catch (error) {
            console.error('Error connecting wallet:', error);
            setError(error.message || 'Error al conectar con MetaMask');
            if (onError) onError(error);
        } finally {
            setIsConnecting(false);
        }
    };

    const authenticateWithSignature = async () => {
        if (!walletAddress) {
            setError('No hay wallet conectada');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            setStep('verify');

            // 1. Obtener nonce del servidor
            const nonceResponse = await api.post('/super-admin/auth/nonce', {
                address: walletAddress
            });

            const { message, timestamp, nonce } = nonceResponse.data.data;

            // 2. Firmar mensaje con MetaMask
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, walletAddress]
            });

            // 3. Verificar firma en el servidor
            const authHeader = JSON.stringify({
                address: walletAddress,
                signature,
                message,
                timestamp
            });

            // Configurar header personalizado para MetaMask
            const originalHeaders = api.defaults.headers;
            api.defaults.headers['X-MetaMask-Auth'] = authHeader;

            const verifyResponse = await api.post('/super-admin/auth/verify');

            // Restaurar headers
            api.defaults.headers = originalHeaders;

            // 4. Login exitoso
            const userData = verifyResponse.data.user;
            
            // Configurar header para futuras requests
            api.defaults.headers['X-MetaMask-Auth'] = authHeader;
            
            // Actualizar store
            login(userData, authHeader);

            if (onSuccess) {
                onSuccess(userData);
            }

        } catch (error) {
            console.error('Error authenticating:', error);
            const errorMessage = error.response?.data?.error || error.message;
            setError(errorMessage);
            if (onError) onError(error);
        } finally {
            setIsConnecting(false);
        }
    };

    const installMetaMask = () => {
        window.open('https://metamask.io/download.html', '_blank');
    };

    if (!isMetaMaskInstalled) {
        return (
            <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                    <Warning color="warning" sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        MetaMask Requerido
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Para acceder como Super-Administrador necesitas tener MetaMask instalado.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={installMetaMask}
                        startIcon={<AccountBalanceWallet />}
                        size="large"
                    >
                        Instalar MetaMask
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
            <CardContent sx={{ p: 4 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <AdminPanelSettings 
                        color="primary" 
                        sx={{ fontSize: 60, mb: 2 }} 
                    />
                    <Typography variant="h4" gutterBottom>
                        Super-Administrador
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Acceso exclusivo con MetaMask
                    </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Pasos de autenticación */}
                <Box sx={{ mb: 3 }}>
                    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                                icon={<CheckCircle />}
                                label="1. MetaMask Detectado"
                                color="success"
                                variant="outlined"
                            />
                        </Box>
                    </Paper>

                    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                                icon={step === 'connect' ? <AccountBalanceWallet /> : <CheckCircle />}
                                label="2. Conectar Wallet"
                                color={walletAddress ? 'success' : 'default'}
                                variant={step === 'connect' ? 'filled' : 'outlined'}
                            />
                            {walletAddress && (
                                <Typography variant="caption" sx={{ 
                                    fontFamily: 'monospace',
                                    bgcolor: 'grey.100',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1
                                }}>
                                    {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                                </Typography>
                            )}
                        </Box>
                    </Paper>

                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                                icon={<Security />}
                                label="3. Firmar Mensaje"
                                color={step === 'sign' || step === 'verify' ? 'primary' : 'default'}
                                variant={step === 'sign' || step === 'verify' ? 'filled' : 'outlined'}
                            />
                        </Box>
                    </Paper>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {/* Botones de acción */}
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    {step === 'connect' && (
                        <Button
                            variant="contained"
                            onClick={connectWallet}
                            disabled={isConnecting}
                            startIcon={isConnecting ? <CircularProgress size={20} /> : <AccountBalanceWallet />}
                            size="large"
                            fullWidth
                        >
                            {isConnecting ? 'Conectando...' : 'Conectar MetaMask'}
                        </Button>
                    )}

                    {step === 'sign' && (
                        <Button
                            variant="contained"
                            onClick={authenticateWithSignature}
                            disabled={isConnecting}
                            startIcon={isConnecting ? <CircularProgress size={20} /> : <Security />}
                            size="large"
                            fullWidth
                        >
                            {isConnecting ? 'Firmando...' : 'Firmar y Autenticar'}
                        </Button>
                    )}

                    {step === 'verify' && (
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress sx={{ mb: 2 }} />
                            <Typography>
                                Verificando autenticación...
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Información de seguridad */}
                <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        🔒 <strong>Seguridad:</strong> La firma digital de MetaMask demuestra que controlas esta wallet 
                        sin compartir tu clave privada. Solo las wallets pre-autorizadas pueden acceder 
                        al panel de super-administrador.
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default MetaMaskLogin;