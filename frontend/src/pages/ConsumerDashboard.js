import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  QrCode,
  Search,
  VerifiedUser,
  Timeline,
} from '@mui/icons-material';
import QRCode from 'qrcode.react';
import { consumerAPI } from '../services/api';
import { toast } from 'react-toastify';

function ConsumerDashboard() {
  const [qrCode, setQrCode] = useState('');
  const [wineData, setWineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrace = async () => {
    if (!qrCode.trim()) {
      setError('Please enter a QR code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await consumerAPI.traceByQR(qrCode);
      
      if (response.data.success && response.data.data.authentic) {
        setWineData(response.data.data);
        toast.success('Wine verified successfully!');
      } else {
        setError('Wine not found or not authentic');
        setWineData(null);
      }
    } catch (error) {
      setError('Failed to trace wine. Please check the QR code.');
      setWineData(null);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" mb={3}>
        Wine Traceability - Consumer Portal
      </Typography>

      {/* QR Code Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Trace Your Wine
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Enter QR Code"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="QR-WINE001-1234567890"
                InputProps={{
                  startAdornment: <QrCode sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleTrace}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
              >
                {loading ? 'Tracing...' : 'Trace Wine'}
              </Button>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Wine Information */}
      {wineData && wineData.authentic && (
        <Grid container spacing={3}>
          {/* Authentication Status */}
          <Grid item xs={12}>
            <Alert severity="success" icon={<VerifiedUser />}>
              This wine is authentic and verified on the blockchain!
            </Alert>
          </Grid>

          {/* Basic Wine Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2} color="primary">
                  Wine Information
                </Typography>
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Wine ID
                  </Typography>
                  <Typography variant="body1">
                    {wineData.wine.wineId}
                  </Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Status
                  </Typography>
                  <Typography variant="body1">
                    {wineData.wine.currentStatus}
                  </Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Owner
                  </Typography>
                  <Typography variant="body1">
                    {wineData.wine.currentOwner}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Vineyard Information */}
          {wineData.wine.vineyardData && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2} color="primary">
                    Vineyard Origin
                  </Typography>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Vineyard
                    </Typography>
                    <Typography variant="body1">
                      {wineData.wine.vineyardData.vineyard}
                    </Typography>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Region
                    </Typography>
                    <Typography variant="body1">
                      {wineData.wine.vineyardData.region}
                    </Typography>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Grape Variety
                    </Typography>
                    <Typography variant="body1">
                      {wineData.wine.vineyardData.grapeVariety}
                    </Typography>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Harvest Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(wineData.wine.vineyardData.harvestDate)}
                    </Typography>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Plot Number
                    </Typography>
                    <Typography variant="body1">
                      {wineData.wine.vineyardData.plotNumber}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Winery Information */}
          {wineData.wine.wineryData && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2} color="primary">
                    Winery Processing
                  </Typography>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Fermentation Process
                    </Typography>
                    <Typography variant="body1">
                      {wineData.wine.wineryData.fermentationProcess}
                    </Typography>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Fermentation Duration
                    </Typography>
                    <Typography variant="body1">
                      {wineData.wine.wineryData.fermentationDuration}
                    </Typography>
                  </Box>
                  {wineData.wine.wineryData.agingType && (
                    <Box mb={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Aging Type
                      </Typography>
                      <Typography variant="body1">
                        {wineData.wine.wineryData.agingType}
                      </Typography>
                    </Box>
                  )}
                  {wineData.wine.wineryData.agingDuration && (
                    <Box mb={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Aging Duration
                      </Typography>
                      <Typography variant="body1">
                        {wineData.wine.wineryData.agingDuration}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Certificates */}
          {wineData.certificates && wineData.certificates.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2} color="primary">
                    Certifications
                  </Typography>
                  {wineData.certificates.map((cert, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 1 }}>
                      <Typography variant="subtitle2">
                        {cert.Record.certificationType}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Issued by: {cert.Record.issuer}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Valid until: {formatDate(cert.Record.expiryDate)}
                      </Typography>
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Traceability Timeline */}
          {wineData.history && wineData.history.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2} color="primary">
                    <Timeline sx={{ mr: 1 }} />
                    Traceability History
                  </Typography>
                  {wineData.history.map((entry, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          Transaction {entry.TxId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Timestamp: {formatDate(entry.Timestamp.seconds * 1000)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status: {entry.Value.currentStatus}
                        </Typography>
                      </Paper>
                      {index < wineData.history.length - 1 && (
                        <Divider sx={{ my: 1 }} />
                      )}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Instructions */}
      {!wineData && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              How to Use Wine Traceability
            </Typography>
            <Typography variant="body1" paragraph>
              1. Scan the QR code on your wine bottle or enter it manually above
            </Typography>
            <Typography variant="body1" paragraph>
              2. Click "Trace Wine" to verify the authenticity and view the complete history
            </Typography>
            <Typography variant="body1" paragraph>
              3. Explore the journey of your wine from vineyard to your glass
            </Typography>
            <Box mt={3} display="flex" justifyContent="center">
              <QRCode value="QR-DEMO-123456789" size={150} />
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={1}>
              Example QR Code (for demonstration)
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default ConsumerDashboard;