import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  LocalBar,
  Inventory,
  Assessment,
  LocalShipping,
} from '@mui/icons-material';
import { wineryAPI } from '../services/api';
import { toast } from 'react-toastify';

function WineryDashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, winesResponse] = await Promise.all([
        wineryAPI.getDashboardStats(),
        wineryAPI.getWines()
      ]);
      
      setDashboardStats(statsResponse.data.data);
      setWines(winesResponse.data.data.wines || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
      // Set default values to prevent crashes
      setDashboardStats({
        totalWines: 0,
        inProduction: 0,
        bottled: 0,
        aged: 0
      });
      setWines([]);
    } finally {
      setLoading(false);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Winery Dashboard
        </Typography>
        <Button variant="contained" startIcon={<LocalBar />}>
          Process Wine
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LocalBar sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.totalWines || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Total Wines
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
                <Inventory sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.inProduction || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    In Production
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
                <Assessment sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.bottled || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Bottled
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
                <LocalShipping sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {dashboardStats?.aged || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Aged
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Wines Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>Wine Production</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Wine ID</TableCell>
                  <TableCell>Grape Variety</TableCell>
                  <TableCell>Production Stage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wines.slice(0, 10).map((wine, index) => (
                  <TableRow key={wine.Key || index}>
                    <TableCell>{wine.Record?.wineId || `WINE-${index + 1}`}</TableCell>
                    <TableCell>{wine.Record?.vineyardData?.grapeVariety || 'N/A'}</TableCell>
                    <TableCell>Fermentation</TableCell>
                    <TableCell>
                      <Chip 
                        label={wine.Record?.currentStatus || 'WINERY'} 
                        color={getStatusColor(wine.Record?.currentStatus || 'WINERY')}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined">
                        Process
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {wines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No wines in production
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WineryDashboard;