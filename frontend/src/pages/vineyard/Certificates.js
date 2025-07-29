import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Visibility,
  Download,
  CheckCircle,
  Schedule,
  Error,
} from '@mui/icons-material';
import { certificateAPI } from '../../services/api';
import { toast } from 'react-toastify';

const certificateTypes = [
  'DO Rioja',
  'DO Ribera del Duero',
  'DO Rueda',
  'Organic Certification',
  'Biodynamic Certification',
  'Sustainable Viticulture',
  'Quality Assurance',
  'Export Certification',
];

const certificateStatuses = [
  { value: 'PENDING', label: 'Pending', color: 'warning' },
  { value: 'APPROVED', label: 'Approved', color: 'success' },
  { value: 'REJECTED', label: 'Rejected', color: 'error' },
  { value: 'EXPIRED', label: 'Expired', color: 'default' },
];

function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [formData, setFormData] = useState({
    wineId: '',
    certificateType: '',
    issuedBy: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    description: '',
  });

  // Mock data for demonstration
  useEffect(() => {
    setCertificates([
      {
        id: 'CERT-001',
        wineId: 'WINE-001',
        certificateType: 'DO Rioja',
        issuedBy: 'Consejo Regulador DOCa Rioja',
        status: 'APPROVED',
        validFrom: '2024-01-15',
        validUntil: '2025-01-15',
        issuedDate: '2024-01-15',
        description: 'Denomination of Origin certification for Rioja wines',
      },
      {
        id: 'CERT-002',
        wineId: 'WINE-002',
        certificateType: 'Organic Certification',
        issuedBy: 'CAAE Andalucía',
        status: 'PENDING',
        validFrom: '2024-02-01',
        validUntil: '2025-02-01',
        issuedDate: '2024-02-01',
        description: 'Organic farming certification',
      },
    ]);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.wineId || !formData.certificateType || !formData.issuedBy) {
        toast.error('Please fill in all required fields');
        return;
      }

      const newCertificate = {
        ...formData,
        id: `CERT-${Date.now()}`,
        status: 'PENDING',
        issuedDate: new Date().toISOString().split('T')[0],
      };

      await certificateAPI.issue(newCertificate);
      
      // Add to local state
      setCertificates(prev => [newCertificate, ...prev]);
      
      toast.success('Certificate request submitted successfully');
      setDialogOpen(false);
      
      // Reset form
      setFormData({
        wineId: '',
        certificateType: '',
        issuedBy: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        description: '',
      });
    } catch (error) {
      toast.error('Failed to submit certificate request');
      console.error(error);
    }
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setViewDialogOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle color="success" />;
      case 'PENDING': return <Schedule color="warning" />;
      case 'REJECTED': return <Error color="error" />;
      default: return null;
    }
  };

  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Certificates Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Request Certificate
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {certificates.length}
              </Typography>
              <Typography color="text.secondary">
                Total Certificates
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {certificates.filter(c => c.status === 'APPROVED').length}
              </Typography>
              <Typography color="text.secondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {certificates.filter(c => c.status === 'PENDING').length}
              </Typography>
              <Typography color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {certificates.filter(c => isExpired(c.validUntil)).length}
              </Typography>
              <Typography color="text.secondary">
                Expired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Certificates Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Certificate Records
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Certificate ID</TableCell>
                  <TableCell>Wine ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Issued By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Valid Until</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell>{certificate.id}</TableCell>
                    <TableCell>{certificate.wineId}</TableCell>
                    <TableCell>{certificate.certificateType}</TableCell>
                    <TableCell>{certificate.issuedBy}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(certificate.status)}
                        <Chip 
                          label={certificate.status} 
                          color={certificateStatuses.find(s => s.value === certificate.status)?.color || 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {certificate.validUntil}
                        {isExpired(certificate.validUntil) && (
                          <Chip label="Expired" color="error" size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Certificate">
                        <IconButton 
                          size="small"
                          onClick={() => handleViewCertificate(certificate)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {certificate.status === 'APPROVED' && (
                        <Tooltip title="Download Certificate">
                          <IconButton size="small">
                            <Download />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {certificates.length === 0 && (
            <Box textAlign="center" py={3}>
              <Typography color="text.secondary">
                No certificates found. Click "Request Certificate" to get started.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Request Certificate Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request New Certificate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Wine ID"
                name="wineId"
                value={formData.wineId}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Certificate Type"
                name="certificateType"
                value={formData.certificateType}
                onChange={handleInputChange}
                required
              >
                {certificateTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Issued By"
                name="issuedBy"
                value={formData.issuedBy}
                onChange={handleInputChange}
                required
                placeholder="Certifying Authority"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valid From"
                name="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valid Until"
                name="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Certificate description and requirements..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Certificate Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Certificate Details</DialogTitle>
        <DialogContent>
          {selectedCertificate && (
            <Grid container spacing={2} mt={1}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Certificate Information</Typography>
                <Typography><strong>Certificate ID:</strong> {selectedCertificate.id}</Typography>
                <Typography><strong>Wine ID:</strong> {selectedCertificate.wineId}</Typography>
                <Typography><strong>Type:</strong> {selectedCertificate.certificateType}</Typography>
                <Typography><strong>Issued By:</strong> {selectedCertificate.issuedBy}</Typography>
                <Typography><strong>Status:</strong> {selectedCertificate.status}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Validity Information</Typography>
                <Typography><strong>Issued Date:</strong> {selectedCertificate.issuedDate}</Typography>
                <Typography><strong>Valid From:</strong> {selectedCertificate.validFrom}</Typography>
                <Typography><strong>Valid Until:</strong> {selectedCertificate.validUntil}</Typography>
                {isExpired(selectedCertificate.validUntil) && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    This certificate has expired
                  </Alert>
                )}
              </Grid>
              {selectedCertificate.description && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Description</Typography>
                  <Typography>{selectedCertificate.description}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedCertificate?.status === 'APPROVED' && (
            <Button variant="contained" startIcon={<Download />}>
              Download Certificate
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Certificates;