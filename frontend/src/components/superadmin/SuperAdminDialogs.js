import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    Typography,
    Alert,
    Box,
    Chip,
    FormControl,
    InputLabel,
    Select,
    CircularProgress
} from '@mui/material';
import {
    Add,
    SwapHoriz,
    Emergency,
    Warning
} from '@mui/icons-material';
import api from '../../services/api';

// Dialog para crear lotes de vino
export const CreateWineDialog = ({ open, onClose, selectedOrg, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        organization: selectedOrg || '',
        wineId: '',
        vineyard: '',
        region: '',
        grapeVariety: '',
        harvestDate: new Date().toISOString().split('T')[0],
        climateConditions: '',
        sustainablePractices: '',
        certifications: '',
        plotNumber: ''
    });

    const organizations = [
        { id: 'VineyardOrgMSP', name: '🍇 Viñedos', icon: '🍇' },
        { id: 'WineryOrgMSP', name: '🍷 Bodegas', icon: '🍷' },
        { id: 'DistributorOrgMSP', name: '📦 Distribuidores', icon: '📦' },
        { id: 'ConsumerOrgMSP', name: '🛒 Consumidores', icon: '🛒' }
    ];

    const grapeVarieties = [
        'Tempranillo', 'Garnacha', 'Monastrell', 'Bobal', 'Airén',
        'Albariño', 'Godello', 'Verdejo', 'Macabeo', 'Chardonnay',
        'Cabernet Sauvignon', 'Merlot', 'Syrah', 'Pinot Noir'
    ];

    const handleChange = (field) => (event) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.organization || !formData.vineyard || !formData.grapeVariety) {
            setError('Organización, viñedo y variedad de uva son obligatorios');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const vineyardData = {
                vineyard: formData.vineyard,
                region: formData.region,
                grapeVariety: formData.grapeVariety,
                harvestDate: formData.harvestDate,
                climateConditions: formData.climateConditions,
                sustainablePractices: formData.sustainablePractices,
                certifications: formData.certifications.split(',').map(c => c.trim()).filter(c => c),
                plotNumber: formData.plotNumber
            };

            const response = await api.post(`/super-admin/organizations/${formData.organization}/wines`, {
                wineId: formData.wineId || undefined,
                vineyardData
            });

            if (onSuccess) onSuccess(response.data);
            onClose();
            
            // Reset form
            setFormData({
                organization: '',
                wineId: '',
                vineyard: '',
                region: '',
                grapeVariety: '',
                harvestDate: new Date().toISOString().split('T')[0],
                climateConditions: '',
                sustainablePractices: '',
                certifications: '',
                plotNumber: ''
            });

        } catch (error) {
            console.error('Error creating wine:', error);
            setError(error.response?.data?.error || 'Error al crear el lote de vino');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Add color="primary" />
                Crear Nuevo Lote de Vino
            </DialogTitle>
            
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Organización</InputLabel>
                            <Select
                                value={formData.organization}
                                onChange={handleChange('organization')}
                                label="Organización"
                            >
                                {organizations.map(org => (
                                    <MenuItem key={org.id} value={org.id}>
                                        {org.icon} {org.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="ID del Lote (opcional)"
                            value={formData.wineId}
                            onChange={handleChange('wineId')}
                            placeholder="Se generará automáticamente si se deja vacío"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Viñedo"
                            value={formData.vineyard}
                            onChange={handleChange('vineyard')}
                            required
                            placeholder="Ej: Bodegas Marqués de Riscal"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Región"
                            value={formData.region}
                            onChange={handleChange('region')}
                            placeholder="Ej: Rioja, Ribera del Duero"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Variedad de Uva</InputLabel>
                            <Select
                                value={formData.grapeVariety}
                                onChange={handleChange('grapeVariety')}
                                label="Variedad de Uva"
                                required
                            >
                                {grapeVarieties.map(variety => (
                                    <MenuItem key={variety} value={variety}>
                                        {variety}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Fecha de Cosecha"
                            type="date"
                            value={formData.harvestDate}
                            onChange={handleChange('harvestDate')}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Condiciones Climáticas"
                            value={formData.climateConditions}
                            onChange={handleChange('climateConditions')}
                            multiline
                            rows={2}
                            placeholder="Describe las condiciones del año..."
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Prácticas Sostenibles"
                            value={formData.sustainablePractices}
                            onChange={handleChange('sustainablePractices')}
                            multiline
                            rows={2}
                            placeholder="Agricultura ecológica, biodiversidad..."
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Certificaciones (separadas por comas)"
                            value={formData.certifications}
                            onChange={handleChange('certifications')}
                            placeholder="DO Rioja, Ecológico, etc."
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Número de Parcela"
                            value={formData.plotNumber}
                            onChange={handleChange('plotNumber')}
                            placeholder="Ej: Parcela-A1"
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                >
                    {loading ? 'Creando...' : 'Crear Lote'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Dialog para transferencias
export const TransferDialog = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        wineId: '',
        fromOrganization: '',
        toOrganization: '',
        notes: '',
        carrier: '',
        vehicleId: '',
        route: ''
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

    const handleSubmit = async () => {
        if (!formData.wineId || !formData.fromOrganization || !formData.toOrganization) {
            setError('ID del lote, organización origen y destino son obligatorios');
            return;
        }

        if (formData.fromOrganization === formData.toOrganization) {
            setError('La organización origen debe ser diferente a la de destino');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const transferData = {
                carrier: formData.carrier,
                vehicleId: formData.vehicleId,
                route: formData.route
            };

            const response = await api.post('/super-admin/transfer', {
                wineId: formData.wineId,
                fromOrganization: formData.fromOrganization,
                toOrganization: formData.toOrganization,
                notes: formData.notes,
                transferData
            });

            if (onSuccess) onSuccess(response.data);
            onClose();
            
            // Reset form
            setFormData({
                wineId: '',
                fromOrganization: '',
                toOrganization: '',
                notes: '',
                carrier: '',
                vehicleId: '',
                route: ''
            });

        } catch (error) {
            console.error('Error transferring wine:', error);
            setError(error.response?.data?.error || 'Error al realizar la transferencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SwapHoriz color="primary" />
                Transferir Lote Entre Organizaciones
            </DialogTitle>
            
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="ID del Lote de Vino"
                            value={formData.wineId}
                            onChange={handleChange('wineId')}
                            required
                            placeholder="Ej: WINE-001, SA-VineyardOrgMSP-123456"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Organización Origen</InputLabel>
                            <Select
                                value={formData.fromOrganization}
                                onChange={handleChange('fromOrganization')}
                                label="Organización Origen"
                                required
                            >
                                {organizations.map(org => (
                                    <MenuItem key={org.id} value={org.id}>
                                        {org.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Organización Destino</InputLabel>
                            <Select
                                value={formData.toOrganization}
                                onChange={handleChange('toOrganization')}
                                label="Organización Destino"
                                required
                            >
                                {organizations.map(org => (
                                    <MenuItem key={org.id} value={org.id}>
                                        {org.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Transportista"
                            value={formData.carrier}
                            onChange={handleChange('carrier')}
                            placeholder="Nombre de la empresa de transporte"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="ID del Vehículo"
                            value={formData.vehicleId}
                            onChange={handleChange('vehicleId')}
                            placeholder="Matrícula o ID del vehículo"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Ruta"
                            value={formData.route}
                            onChange={handleChange('route')}
                            placeholder="Descripción de la ruta de transporte"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Notas de la Transferencia"
                            value={formData.notes}
                            onChange={handleChange('notes')}
                            multiline
                            rows={3}
                            placeholder="Información adicional sobre la transferencia..."
                        />
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="info.dark">
                        <strong>Nota:</strong> Esta transferencia será ejecutada inmediatamente y 
                        registrada en blockchain como una operación de super-administrador.
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <SwapHoriz />}
                >
                    {loading ? 'Transfiriendo...' : 'Ejecutar Transferencia'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Dialog para operaciones de emergencia
export const EmergencyDialog = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        operation: '',
        wineId: '',
        certificateId: '',
        fromOrg: '',
        toOrg: '',
        reason: ''
    });

    const emergencyOperations = [
        { id: 'freeze-wine', name: '🧊 Congelar Lote', description: 'Bloquea un lote para prevenir transferencias' },
        { id: 'force-transfer', name: '⚡ Transferencia Forzada', description: 'Fuerza una transferencia sin validaciones' },
        { id: 'revoke-certificate', name: '🚫 Revocar Certificado', description: 'Revoca un certificado de calidad' }
    ];

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

    const handleSubmit = async () => {
        if (!formData.operation || !formData.reason) {
            setError('Operación y razón son obligatorios');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let data = {};
            
            switch (formData.operation) {
                case 'freeze-wine':
                    if (!formData.wineId) {
                        setError('ID del lote es obligatorio para congelar');
                        return;
                    }
                    data.wineId = formData.wineId;
                    break;
                    
                case 'force-transfer':
                    if (!formData.wineId || !formData.fromOrg || !formData.toOrg) {
                        setError('ID del lote, organización origen y destino son obligatorios');
                        return;
                    }
                    data = {
                        wineId: formData.wineId,
                        fromOrganization: formData.fromOrg,
                        toOrganization: formData.toOrg
                    };
                    break;
                    
                case 'revoke-certificate':
                    if (!formData.certificateId) {
                        setError('ID del certificado es obligatorio');
                        return;
                    }
                    data.certificateId = formData.certificateId;
                    break;
            }

            const response = await api.post(`/super-admin/emergency/${formData.operation}`, {
                reason: formData.reason,
                data
            });

            if (onSuccess) onSuccess(response.data);
            onClose();
            
            // Reset form
            setFormData({
                operation: '',
                wineId: '',
                certificateId: '',
                fromOrg: '',
                toOrg: '',
                reason: ''
            });

        } catch (error) {
            console.error('Error executing emergency operation:', error);
            setError(error.response?.data?.error || 'Error al ejecutar la operación de emergencia');
        } finally {
            setLoading(false);
        }
    };

    const selectedOperation = emergencyOperations.find(op => op.id === formData.operation);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'error.main' }}>
                <Emergency color="error" />
                Operación de Emergencia
            </DialogTitle>
            
            <DialogContent>
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        ⚠️ ADVERTENCIA
                    </Typography>
                    <Typography>
                        Las operaciones de emergencia son <strong>irreversibles</strong> y se registran 
                        permanentemente en blockchain. Úsalas solo en casos críticos.
                    </Typography>
                </Alert>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Tipo de Operación</InputLabel>
                            <Select
                                value={formData.operation}
                                onChange={handleChange('operation')}
                                label="Tipo de Operación"
                                required
                            >
                                {emergencyOperations.map(op => (
                                    <MenuItem key={op.id} value={op.id}>
                                        <Box>
                                            <Typography variant="body1">
                                                {op.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {op.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {selectedOperation && (
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                                <Typography variant="body2" color="warning.dark">
                                    <strong>{selectedOperation.name}:</strong> {selectedOperation.description}
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {(formData.operation === 'freeze-wine' || formData.operation === 'force-transfer') && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ID del Lote de Vino"
                                value={formData.wineId}
                                onChange={handleChange('wineId')}
                                required
                                placeholder="Ej: WINE-001, SA-VineyardOrgMSP-123456"
                            />
                        </Grid>
                    )}

                    {formData.operation === 'force-transfer' && (
                        <>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Organización Origen</InputLabel>
                                    <Select
                                        value={formData.fromOrg}
                                        onChange={handleChange('fromOrg')}
                                        label="Organización Origen"
                                        required
                                    >
                                        {organizations.map(org => (
                                            <MenuItem key={org.id} value={org.id}>
                                                {org.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Organización Destino</InputLabel>
                                    <Select
                                        value={formData.toOrg}
                                        onChange={handleChange('toOrg')}
                                        label="Organización Destino"
                                        required
                                    >
                                        {organizations.map(org => (
                                            <MenuItem key={org.id} value={org.id}>
                                                {org.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </>
                    )}

                    {formData.operation === 'revoke-certificate' && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ID del Certificado"
                                value={formData.certificateId}
                                onChange={handleChange('certificateId')}
                                required
                                placeholder="Ej: CERT-001, QUALITY-123456"
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Razón de la Operación de Emergencia"
                            value={formData.reason}
                            onChange={handleChange('reason')}
                            multiline
                            rows={4}
                            required
                            placeholder="Describe detalladamente la razón por la cual es necesaria esta operación de emergencia..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Warning />}
                >
                    {loading ? 'Ejecutando...' : 'EJECUTAR EMERGENCIA'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};