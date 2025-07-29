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
  TextField,
  MenuItem,
  Button,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import { vineyardAPI } from '../../services/api';
import { toast } from 'react-toastify';

const grapeVarieties = [
  'All Varieties',
  'Tempranillo',
  'Garnacha',
  'Mazuelo',
  'Graciano',
  'Chardonnay',
  'Sauvignon Blanc',
  'Albariño',
  'Verdejo',
];

function HarvestHistory() {
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: '',
    variety: '',
  });
  const [summary, setSummary] = useState({
    totalHarvests: 0,
    varieties: [],
    plots: [],
  });

  useEffect(() => {
    loadHarvestHistory();
  }, [filters]);

  const loadHarvestHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.year) params.year = filters.year;
      if (filters.variety && filters.variety !== 'All Varieties') params.variety = filters.variety;

      const response = await vineyardAPI.getHarvestHistory(params);
      setHarvests(response.data.data.harvests || []);
      setSummary(response.data.data.summary || {});
    } catch (error) {
      toast.error('Failed to load harvest history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      year: '',
      variety: '',
    });
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
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
        Harvest History
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {summary.totalHarvests}
              </Typography>
              <Typography color="text.secondary">
                Total Harvests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {summary.varieties?.length || 0}
              </Typography>
              <Typography color="text.secondary">
                Grape Varieties
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {summary.plots?.length || 0}
              </Typography>
              <Typography color="text.secondary">
                Active Plots
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Year"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
              >
                <MenuItem value="">All Years</MenuItem>
                {getYearOptions().map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Grape Variety"
                value={filters.variety}
                onChange={(e) => handleFilterChange('variety', e.target.value)}
              >
                {grapeVarieties.map((variety) => (
                  <MenuItem key={variety} value={variety}>
                    {variety}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Harvest History Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Harvest Records
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Wine ID</TableCell>
                  <TableCell>Grape Variety</TableCell>
                  <TableCell>Plot Number</TableCell>
                  <TableCell>Harvest Date</TableCell>
                  <TableCell>Vineyard</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {harvests.map((harvest) => (
                  <TableRow key={harvest.id || harvest.wineId}>
                    <TableCell>{harvest.wineId}</TableCell>
                    <TableCell>{harvest.grapeVariety}</TableCell>
                    <TableCell>{harvest.plotNumber}</TableCell>
                    <TableCell>{new Date(harvest.harvestDate).toLocaleDateString()}</TableCell>
                    <TableCell>{harvest.vineyard}</TableCell>
                    <TableCell>{harvest.region}</TableCell>
                    <TableCell>
                      <Chip 
                        label={harvest.status} 
                        color={harvest.status === 'VINEYARD' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {harvests.length === 0 && (
            <Box textAlign="center" py={3}>
              <Typography color="text.secondary">
                No harvest records found for the selected filters.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default HarvestHistory;