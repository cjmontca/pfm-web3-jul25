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
  IconButton,
  Tooltip,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  QrCode,
  LocalShipping,
  Edit,
  Delete,
} from '@mui/icons-material';
import { vineyardAPI } from '../../services/api';
import { toast } from 'react-toastify';
import QRCode from 'qrcode.react';

const organizations = [
  { value: 'WineryOrgMSP', label: 'Winery' },
  { value: 'DistributorOrgMSP', label: 'Distributor' },
  { value: 'ConsumerOrgMSP', label: 'Consumer' },
];

function WineBatches() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState(null);
  const [transferData, setTransferData] = useState({
    toOrganization: '',
    notes: '',
  });

  useEffect(() => {
    loadWines();
  }, []);

  const loadWines = async () => {
    try {
      setLoading(true);
      const response = await vineyardAPI.getWines();
      setWines(response.data.data.wines || []);
    } catch (error) {
      toast.error('Failed to load wine batches');
      console.error(error);
    } finally {
      setLoading(false);
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
      loadWines();
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Wine Batches Management
      </Typography>

      <Card>
        <CardContent>
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
                {wines.map((wine) => (
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

      {/* Details Dialog */}
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
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
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
              {organizations.map((org) => (
                <MenuItem key={org.value} value={org.value}>
                  {org.label}
                </MenuItem>
              ))}
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

export default WineBatches;