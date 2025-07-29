import React, { useState } from 'react';
import {
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    MenuItem,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import api from '../../services/api';

const OrganizationLogin = ({ onSuccess, onError }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        organization: ''
    });

    const organizations = [
        { id: 'VineyardOrgMSP', name: '🍇 Viñedos' },
        { id: 'WineryOrgMSP', name: '🍷 Bodegas' },
        { id: 'DistributorOrgMSP', name: '📦 Distribuidores' },
        { id: 'ConsumerOrgMSP', name: '🛒 Consumidores' }
    ];

    const handleChange = (field) => (event) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!formData.username || !formData.password || !formData.organization) {
            setError('Todos los campos son obligatorios');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', formData);
            
            if (response.data.success) {
                const { user, token } = response.data;
                if (onSuccess) {
                    onSuccess(user, token);
                }
            } else {
                setError(response.data.message || 'Error en el login');
            }

        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.message || 'Error de conexión';
            setError(errorMessage);
            if (onError) {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <TextField
                fullWidth
                label="Usuario"
                value={formData.username}
                onChange={handleChange('username')}
                required
                disabled={loading}
                sx={{ mb: 2 }}
                placeholder="vineyard_admin"
            />

            <TextField
                fullWidth
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                required
                disabled={loading}
                sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Organización</InputLabel>
                <Select
                    value={formData.organization}
                    onChange={handleChange('organization')}
                    label="Organización"
                    required
                    disabled={loading}
                >
                    {organizations.map(org => (
                        <MenuItem key={org.id} value={org.id}>
                            {org.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                size="large"
            >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
        </Box>
    );
};

export default OrganizationLogin;