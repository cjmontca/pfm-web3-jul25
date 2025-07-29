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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  Business,
  LocalBar,
  Assessment,
  SwapHoriz,
  Add,
  Visibility,
  CheckCircle,
  Error,
  Warning,
  Inventory,
  LocalShipping,
  Store,
  Agriculture,
  Timeline,
  TrendingUp,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const organizationColors = {
  'VineyardOrgMSP': '#4CAF50',
  'WineryOrgMSP': '#9C27B0', 
  'DistributorOrgMSP': '#FF9800',
  'ConsumerOrgMSP': '#2196F3'
};

const organizationNames = {
  'VineyardOrgMSP': 'Vineyard',
  'WineryOrgMSP': 'Winery',
  'DistributorOrgMSP': 'Distributor', 
  'ConsumerOrgMSP': 'Consumer'
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function AdminDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [systemOverview, setSystemOverview] = useState(null);
  const [organizations, setOrganizations] = useState({});
  const [allWines, setAllWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createWineOpen, setCreateWineOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState(null);

  // Form states
  const [newWine, setNewWine] = useState({
    organization: 'VineyardOrgMSP',
    wineId: '',
    vineyardData: {
      grapesType: '',
      harvestDate: '',
      region: '',
      vineyard: '',
      vintage: new Date().getFullYear(),
      terroir: {},
      sustainability: {}
    }
  });

  const [transferData, setTransferData] = useState({
    toOrganization: '',
    notes: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewResponse, organizationsResponse, winesResponse] = await Promise.all([
        adminAPI.getSystemOverview(),
        adminAPI.getAllOrganizations(), 
        adminAPI.getAllWines()
      ]);
      
      setSystemOverview(overviewResponse.data.data);
      setOrganizations(organizationsResponse.data.data.organizations || {});
      setAllWines(winesResponse.data.data.wines || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
      // Set default values to prevent crashes
      setSystemOverview({
        totalWines: 0,
        organizationStats: {},
        statusDistribution: {},
        systemHealth: {},
        recentTransactions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWine = async () => {
    try {
      await adminAPI.createWineBatch({
        ...newWine,
        vineyardData: {
          ...newWine.vineyardData,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success('Wine batch created successfully');
      setCreateWineOpen(false);
      setNewWine({
        organization: 'VineyardOrgMSP',
        wineId: '',
        vineyardData: {
          grapesType: '',
          harvestDate: '',
          region: '',
          vineyard: '',
          vintage: new Date().getFullYear(),
          terroir: {},
          sustainability: {}
        }
      });
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to create wine batch');
      console.error(error);
    }
  };

  const handleTransferWine = async () => {
    try {
      await adminAPI.transferWineBetweenOrgs({
        wineId: selectedWine.Record.wineId,
        fromOrganization: selectedWine.organizationId,
        toOrganization: transferData.toOrganization,
        notes: transferData.notes
      });
      
      toast.success('Transfer initiated successfully');
      setTransferDialogOpen(false);
      setTransferData({ toOrganization: '', notes: '' });
      setSelectedWine(null);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to initiate transfer');
      console.error(error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const openTransferDialog = (wine) => {
    setSelectedWine(wine);
    setTransferDialogOpen(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'VINEYARD': '#4CAF50',
      'PROCESSING': '#9C27B0',
      'SHIPPED': '#FF9800', 
      'SOLD': '#2196F3'
    };
    return colors[status] || '#757575';
  };

  const formatChartData = (data) => {
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data).map(([key, value]) => ({
      name: organizationNames[key] || key,
      value: value,
      color: organizationColors[key] || '#8884d8'
    }));
  };

  const formatStatusChartData = (statusData) => {
    if (!statusData || typeof statusData !== 'object') return [];
    return Object.entries(statusData).map(([status, count]) => ({
      name: status,
      value: count,
      color: getStatusColor(status)
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Dashboard sx={{ mr: 2, fontSize: '2rem' }} />
        System Administration Dashboard
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="System Overview" />
        <Tab label="Organizations" />
        <Tab label="Wine Management" />
        <Tab label="Analytics" />
      </Tabs>

      {/* System Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Key Metrics Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Wine Batches
                    </Typography>
                    <Typography variant="h4">
                      {systemOverview?.totalWines || 0}
                    </Typography>
                  </Box>
                  <LocalBar color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Active Peers
                    </Typography>
                    <Typography variant="h4">
                      {systemOverview?.systemHealth?.peersActive || 0}
                    </Typography>
                  </Box>
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Block Height
                    </Typography>
                    <Typography variant="h4">
                      {systemOverview?.systemHealth?.lastBlockHeight || 0}
                    </Typography>
                  </Box>
                  <Timeline color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Network Status
                    </Typography>
                    <Typography variant="h6" color={systemOverview?.systemHealth?.fabricConnected ? 'success.main' : 'error.main'}>
                      {systemOverview?.systemHealth?.fabricConnected ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                  {systemOverview?.systemHealth?.fabricConnected ? 
                    <CheckCircle color="success" sx={{ fontSize: 40 }} /> :
                    <Error color="error" sx={{ fontSize: 40 }} />
                  }
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Wine Distribution by Organization</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatChartData(systemOverview?.organizationStats)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formatChartData(systemOverview?.organizationStats).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Wine Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatStatusChartData(systemOverview?.statusDistribution)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {formatStatusChartData(systemOverview?.statusDistribution).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Transactions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent System Transactions</Typography>
                <List>
                  {(systemOverview?.recentTransactions || []).slice(0, 5).map((tx, index) => (
                    <React.Fragment key={tx.id}>
                      <ListItem>
                        <ListItemIcon>
                          {tx.status === 'SUCCESS' ? 
                            <CheckCircle color="success" /> : 
                            <Warning color="warning" />
                          }
                        </ListItemIcon>
                        <ListItemText
                          primary={`${tx.operation} - ${tx.organization}`}
                          secondary={new Date(tx.timestamp).toLocaleString()}
                        />
                        <Chip 
                          label={tx.status} 
                          color={tx.status === 'SUCCESS' ? 'success' : 'warning'}
                          size="small"
                        />
                      </ListItem>
                      {index < 4 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Organizations Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {Object.entries(organizations).map(([orgId, orgData]) => (
            <Grid item xs={12} sm={6} md={3} key={orgId}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" style={{ color: organizationColors[orgId] }}>
                      {orgData.name}
                    </Typography>
                    <Business style={{ color: organizationColors[orgId] }} />
                  </Box>
                  <Typography variant="h4" gutterBottom>
                    {orgData.totalWines}
                  </Typography>
                  <Typography color="textSecondary">
                    Total Wine Batches
                  </Typography>
                  <Box mt={2}>
                    <Button 
                      size="small" 
                      onClick={() => setTabValue(2)}
                      startIcon={<Visibility />}
                    >
                      View Wines
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Wine Management Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box mb={3}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateWineOpen(true)}
            sx={{ mr: 2 }}
          >
            Create Wine Batch
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>All Wine Batches</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Wine ID</TableCell>
                    <TableCell>Organization</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allWines.map((wine) => (
                    <TableRow key={wine.Record?.wineId || Math.random()}>
                      <TableCell>{wine.Record?.wineId || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={wine.organizationName} 
                          style={{ 
                            backgroundColor: organizationColors[wine.organizationId] + '20',
                            color: organizationColors[wine.organizationId]
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={wine.Record?.currentStatus || 'Unknown'} 
                          style={{ 
                            backgroundColor: getStatusColor(wine.Record?.currentStatus) + '20',
                            color: getStatusColor(wine.Record?.currentStatus)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {wine.Record?.createdAt ? 
                          new Date(wine.Record.createdAt).toLocaleDateString() : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Transfer to another organization">
                          <IconButton 
                            onClick={() => openTransferDialog(wine)}
                            size="small"
                          >
                            <SwapHoriz />
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
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>System Analytics</Typography>
        <Alert severity="info">
          Advanced analytics and reporting features will be implemented here.
          This includes trend analysis, performance metrics, and detailed reports.
        </Alert>
      </TabPanel>

      {/* Create Wine Dialog */}
      <Dialog open={createWineOpen} onClose={() => setCreateWineOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Wine Batch</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Organization"
                value={newWine.organization}
                onChange={(e) => setNewWine({ ...newWine, organization: e.target.value })}
              >
                <MenuItem value="VineyardOrgMSP">Vineyard</MenuItem>
                <MenuItem value="WineryOrgMSP">Winery</MenuItem>
                <MenuItem value="DistributorOrgMSP">Distributor</MenuItem>
                <MenuItem value="ConsumerOrgMSP">Consumer</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Wine ID (optional)"
                value={newWine.wineId}
                onChange={(e) => setNewWine({ ...newWine, wineId: e.target.value })}
                helperText="Leave empty to auto-generate"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Grape Type"
                value={newWine.vineyardData.grapesType}
                onChange={(e) => setNewWine({
                  ...newWine,
                  vineyardData: { ...newWine.vineyardData, grapesType: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Region"
                value={newWine.vineyardData.region}
                onChange={(e) => setNewWine({
                  ...newWine,
                  vineyardData: { ...newWine.vineyardData, region: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vineyard"
                value={newWine.vineyardData.vineyard}
                onChange={(e) => setNewWine({
                  ...newWine,
                  vineyardData: { ...newWine.vineyardData, vineyard: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Vintage Year"
                value={newWine.vineyardData.vintage}
                onChange={(e) => setNewWine({
                  ...newWine,
                  vineyardData: { ...newWine.vineyardData, vintage: parseInt(e.target.value) }
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateWineOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateWine} variant="contained">Create Wine Batch</Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Wine Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Wine Batch</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Wine ID: {selectedWine?.Record?.wineId}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
            From: {selectedWine?.organizationName}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Transfer To Organization"
                value={transferData.toOrganization}
                onChange={(e) => setTransferData({ ...transferData, toOrganization: e.target.value })}
              >
                {Object.entries(organizationNames)
                  .filter(([orgId]) => orgId !== selectedWine?.organizationId)
                  .map(([orgId, orgName]) => (
                    <MenuItem key={orgId} value={orgId}>{orgName}</MenuItem>
                  ))
                }
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Transfer Notes"
                value={transferData.notes}
                onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                helperText="Optional notes about the transfer"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleTransferWine} 
            variant="contained"
            disabled={!transferData.toOrganization}
          >
            Initiate Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminDashboard;