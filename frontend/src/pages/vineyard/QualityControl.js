import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import { Add, CheckCircle, Warning, Error } from '@mui/icons-material';
import { vineyardAPI } from '../../services/api';
import { toast } from 'react-toastify';

const qualityParameters = [
  { id: 'sugar_content', label: 'Sugar Content (Brix)', unit: '°Bx', min: 18, max: 25 },
  { id: 'acidity', label: 'Acidity (pH)', unit: 'pH', min: 3.0, max: 3.8 },
  { id: 'alcohol_potential', label: 'Alcohol Potential', unit: '%', min: 10, max: 15 },
  { id: 'tannins', label: 'Tannin Level', unit: 'mg/L', min: 500, max: 2000 },
  { id: 'phenolics', label: 'Phenolic Content', unit: 'mg/L', min: 200, max: 800 },
];

const qualityGrades = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'success' },
  { value: 'GOOD', label: 'Good', color: 'primary' },
  { value: 'AVERAGE', label: 'Average', color: 'warning' },
  { value: 'POOR', label: 'Poor', color: 'error' },
];

function QualityControl() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qualityChecks, setQualityChecks] = useState([]);
  const [formData, setFormData] = useState({
    wineId: '',
    testDate: new Date().toISOString().split('T')[0],
    sugar_content: '',
    acidity: '',
    alcohol_potential: '',
    tannins: '',
    phenolics: '',
    overallGrade: '',
    notes: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateOverallGrade = () => {
    const scores = qualityParameters.map(param => {
      const value = parseFloat(formData[param.id]);
      if (isNaN(value)) return null;
      
      if (value >= param.min && value <= param.max) {
        return 100;
      } else if (value < param.min) {
        return Math.max(0, 100 - ((param.min - value) / param.min) * 100);
      } else {
        return Math.max(0, 100 - ((value - param.max) / param.max) * 100);
      }
    }).filter(score => score !== null);

    if (scores.length === 0) return 'AVERAGE';

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avgScore >= 90) return 'EXCELLENT';
    if (avgScore >= 75) return 'GOOD';
    if (avgScore >= 50) return 'AVERAGE';
    return 'POOR';
  };

  const handleSubmit = async () => {
    try {
      if (!formData.wineId) {
        toast.error('Please enter a Wine ID');
        return;
      }

      const overallGrade = calculateOverallGrade();
      const checkData = {
        ...formData,
        overallGrade,
        timestamp: new Date().toISOString(),
      };

      await vineyardAPI.performQualityCheck(checkData);
      
      // Add to local state for display
      setQualityChecks(prev => [checkData, ...prev]);
      
      toast.success('Quality check completed successfully');
      setDialogOpen(false);
      
      // Reset form
      setFormData({
        wineId: '',
        testDate: new Date().toISOString().split('T')[0],
        sugar_content: '',
        acidity: '',
        alcohol_potential: '',
        tannins: '',
        phenolics: '',
        overallGrade: '',
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to perform quality check');
      console.error(error);
    }
  };

  const getParameterStatus = (paramId, value) => {
    const param = qualityParameters.find(p => p.id === paramId);
    if (!param || !value) return 'default';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'default';
    
    if (numValue >= param.min && numValue <= param.max) {
      return 'success';
    } else if (Math.abs(numValue - param.min) <= (param.max - param.min) * 0.1 || 
               Math.abs(numValue - param.max) <= (param.max - param.min) * 0.1) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      default: return null;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Quality Control
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          New Quality Check
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Quality Parameters Reference */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quality Parameters
              </Typography>
              {qualityParameters.map((param) => (
                <Box key={param.id} mb={2}>
                  <Typography variant="body2" fontWeight="bold">
                    {param.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Range: {param.min} - {param.max} {param.unit}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Quality Checks History */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Quality Checks
              </Typography>
              {qualityChecks.length === 0 ? (
                <Alert severity="info">
                  No quality checks performed yet. Click "New Quality Check" to get started.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Wine ID</TableCell>
                        <TableCell>Test Date</TableCell>
                        <TableCell>Overall Grade</TableCell>
                        <TableCell>Sugar Content</TableCell>
                        <TableCell>Acidity</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {qualityChecks.map((check, index) => (
                        <TableRow key={index}>
                          <TableCell>{check.wineId}</TableCell>
                          <TableCell>{check.testDate}</TableCell>
                          <TableCell>
                            <Chip 
                              label={check.overallGrade} 
                              color={qualityGrades.find(g => g.value === check.overallGrade)?.color || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {check.sugar_content} °Bx
                              {getStatusIcon(getParameterStatus('sugar_content', check.sugar_content))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {check.acidity} pH
                              {getStatusIcon(getParameterStatus('acidity', check.acidity))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={check.overallGrade === 'EXCELLENT' ? 'Approved' : 'Review Required'} 
                              color={check.overallGrade === 'EXCELLENT' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quality Check Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Quality Check</DialogTitle>
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
                label="Test Date"
                name="testDate"
                type="date"
                value={formData.testDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            {qualityParameters.map((param) => (
              <Grid item xs={12} sm={6} key={param.id}>
                <TextField
                  fullWidth
                  label={`${param.label} (${param.unit})`}
                  name={param.id}
                  type="number"
                  value={formData[param.id]}
                  onChange={handleInputChange}
                  helperText={`Range: ${param.min} - ${param.max} ${param.unit}`}
                  InputProps={{
                    endAdornment: getStatusIcon(getParameterStatus(param.id, formData[param.id]))
                  }}
                />
              </Grid>
            ))}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional observations or comments..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info">
                Overall Grade: <strong>{calculateOverallGrade()}</strong>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Complete Quality Check
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default QualityControl;