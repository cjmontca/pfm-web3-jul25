import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Agriculture,
  Add,
  QrCode,
  Timeline,
  Assessment,
  Visibility,
  LocalShipping,
  CheckCircle,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { vineyardAPI } from '../services/api';
import { toast } from 'react-toastify';
import QRCode from 'qrcode.react';

const grapeVarieties = [
  'Tempranillo',
  'Garnacha',
  'Mazuelo',
  'Graciano',
  'Chardonnay',
  'Sauvignon Blanc',
  'Albariño',
  'Verdejo',
];

const certificationTypes = [
  'DO Rioja',
  'DO Ribera del Duero',
  'DO Rueda',
  'Organic',
  'Biodynamic',
  'Sustainable',
];

function VineyardDashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState(null);
  const [transferData, setTransferData] = useState({
    toOrganization: '',
    notes: '',
  });
  const [formData, setFormData] = useState({
    wineId: '',
    vineyard: '',
    region: '',
    grapeVariety: '',
    harvestDate: '',
    climateConditions: '',
    sustainablePractices: '',
    certifications: [],
    plotNumber: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, winesResponse] = await Promise.all([
        vineyardAPI.getDashboardStats(),
        vineyardAPI.getWines()
      ]);
      
      setDashboardStats(statsResponse.data.data);
      setWines(winesResponse.data.data.wines || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCertificationChange = (e) => {
    setFormData(prev => ({
      ...prev,
      certifications: e.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.wineId || !formData.vineyard || !formData.region || 
          !formData.grapeVariety || !formData.harvestDate || !formData.plotNumber) {
        toast.error('Please fill in all required fields');
        return;
      }

      const result = await vineyardAPI.registerBatch(formData);
      
      if (result.data.success) {
        toast.success('Wine batch registered successfully!');
        setDialogOpen(false);
        setSelectedWine(result.data.data);
        setQrDialogOpen(true);
        loadDashboardData();
        
        // Reset form
        setFormData({
          wineId: '',
          vineyard: '',
          region: '',
          grapeVariety: '',
          harvestDate: '',
          climateConditions: '',
          sustainablePractices: '',
          certifications: [],
          plotNumber: '',
        });
      }
    } catch (error) {
      toast.error('Failed to register wine batch');
      console.error(error);
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferData.toOrganization) {
        toast.error('Please select a destination organization');
        return;
      }

      const result = await vineyardAPI.transferWine(selectedWine.wineId, transferData);
      const orgName = transferData.toOrganization.replace('OrgMSP', '');
      toast.success(`Wine successfully transferred to ${orgName}`);
      setTransferDialogOpen(false);
      setTransferData({ toOrganization: '', notes: '' });
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to initiate wine transfer');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'VINEYARD': 'primary',
      'WINERY': 'secondary',
      'DISTRIBUTOR': 'warning',
      'CONSUMER': 'success',
      'IN_TRANSFER': 'info',
    };
    return colors[status] || 'default';
  };

  const monthlyData = dashboardStats?.monthlyProduction ? 
    Object.entries(dashboardStats.monthlyProduction).map(([month, count]) => ({
      month,
      batches: count
    })) : [];

  const varietyData = dashboardStats?.grapeVarieties ? 
    Object.entries(dashboardStats.grapeVarieties).map(([variety, count]) => ({
      name: variety,
      value: count
    })) : [];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Vineyard Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Register New Batch
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Agriculture sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.totalBatches || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Total Batches
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.activeBatches || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Active Batches
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LocalShipping sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.transferredBatches || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Transferred
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.certifiedBatches || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Certified
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Monthly Production</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="batches" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Grape Varieties</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={varietyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {varietyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Wine Batches Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>Recent Wine Batches</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Wine ID</TableCell>
                  <TableCell>Grape Variety</TableCell>
                  <TableCell>Plot</TableCell>
                  <TableCell>Harvest Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wines.slice(0, 10).map((wine) => (
                  <TableRow key={wine.Key || wine.Record?.wineId}>
                    <TableCell>{wine.Record?.wineId}</TableCell>
                    <TableCell>{wine.Record?.vineyardData?.grapeVariety}</TableCell>
                    <TableCell>{wine.Record?.vineyardData?.plotNumber}</TableCell>
                    <TableCell>{wine.Record?.vineyardData?.harvestDate?.split('T')[0]}</TableCell>
                    <TableCell>
                      <Chip 
                        label={wine.Record?.currentStatus} 
                        color={getStatusColor(wine.Record?.currentStatus)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedWine(wine.Record);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View QR Code">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedWine(wine.Record);
                            setQrDialogOpen(true);
                          }}
                        >
                          <QrCode />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Transfer Wine">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedWine(wine.Record);
                            setTransferDialogOpen(true);
                          }}
                        >
                          <LocalShipping />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Register Batch Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Register New Wine Batch</DialogTitle>
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
                label="Vineyard Name"
                name="vineyard"
                value={formData.vineyard}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Grape Variety"
                name="grapeVariety"
                value={formData.grapeVariety}
                onChange={handleInputChange}
                required
              >
                {grapeVarieties.map((variety) => (
                  <MenuItem key={variety} value={variety}>
                    {variety}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Harvest Date"
                name="harvestDate"
                type="date"
                value={formData.harvestDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plot Number"
                name="plotNumber"
                value={formData.plotNumber}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Climate Conditions"
                name="climateConditions"
                value={formData.climateConditions}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Sustainable Practices"
                name="sustainablePractices"
                value={formData.sustainablePractices}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                SelectProps={{ multiple: true }}
                label="Certifications"
                name="certifications"
                value={formData.certifications}
                onChange={handleCertificationChange}
              >
                {certificationTypes.map((cert) => (
                  <MenuItem key={cert} value={cert}>
                    {cert}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Register Batch
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code for Wine Batch</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" p={2}>
            {selectedWine?.qrCode && (
              <>
                <QRCode value={selectedWine.qrCode} size={200} />
                <Typography variant="body2" mt={2} textAlign="center">
                  Wine ID: {selectedWine.wineId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  QR Code: {selectedWine.qrCode}
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Wine Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Wine Batch Details</DialogTitle>
        <DialogContent>
          {selectedWine && (
            <Grid container spacing={3} mt={1}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <Typography><strong>Wine ID:</strong> {selectedWine.wineId}</Typography>
                <Typography><strong>Status:</strong> {selectedWine.currentStatus}</Typography>
                <Typography><strong>Current Owner:</strong> {selectedWine.currentOwner}</Typography>
                <Typography><strong>Created:</strong> {new Date(selectedWine.createdAt).toLocaleDateString()}</Typography>
                <Typography><strong>Updated:</strong> {new Date(selectedWine.updatedAt).toLocaleDateString()}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Vineyard Information</Typography>
                <Typography><strong>Vineyard:</strong> {selectedWine.vineyardData?.vineyard}</Typography>
                <Typography><strong>Region:</strong> {selectedWine.vineyardData?.region}</Typography>
                <Typography><strong>Grape Variety:</strong> {selectedWine.vineyardData?.grapeVariety}</Typography>
                <Typography><strong>Harvest Date:</strong> {selectedWine.vineyardData?.harvestDate ? new Date(selectedWine.vineyardData.harvestDate).toLocaleDateString() : 'N/A'}</Typography>
                <Typography><strong>Plot Number:</strong> {selectedWine.vineyardData?.plotNumber}</Typography>
              </Grid>
              
              {selectedWine.vineyardData?.climateConditions && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Climate Conditions</Typography>
                  <Typography>{selectedWine.vineyardData.climateConditions}</Typography>
                </Grid>
              )}
              
              {selectedWine.vineyardData?.sustainablePractices && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Sustainable Practices</Typography>
                  <Typography>{selectedWine.vineyardData.sustainablePractices}</Typography>
                </Grid>
              )}
              
              {selectedWine.vineyardData?.certifications && selectedWine.vineyardData.certifications.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Certifications</Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedWine.vineyardData.certifications.map((cert, index) => (
                      <Chip key={index} label={cert} size="small" />
                    ))}
                  </Box>
                </Grid>
              )}
              
              {selectedWine.qrCode && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>QR Code</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <QRCode value={selectedWine.qrCode} size={100} />
                    <Typography variant="body2" color="text.secondary">
                      {selectedWine.qrCode}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Wine Batch</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Typography variant="body1" gutterBottom>
              Transfer <strong>{selectedWine?.wineId}</strong> to another organization
            </Typography>
            
            <TextField
              fullWidth
              select
              label="Destination Organization"
              value={transferData.toOrganization}
              onChange={(e) => setTransferData(prev => ({ ...prev, toOrganization: e.target.value }))}
              margin="normal"
              required
            >
              <MenuItem value="WineryOrgMSP">Winery</MenuItem>
              <MenuItem value="DistributorOrgMSP">Distributor</MenuItem>
              <MenuItem value="ConsumerOrgMSP">Consumer</MenuItem>
            </TextField>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Transfer Notes"
              value={transferData.notes}
              onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
              margin="normal"
              placeholder="Add any notes about this transfer..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTransfer} variant="contained">
            Transfer Wine
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VineyardDashboard;