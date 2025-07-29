import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
} from '@mui/material';
import { LocalBar, Security } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const organizations = [
  { value: 'VineyardOrgMSP', label: 'Vineyard Organization' },
  { value: 'WineryOrgMSP', label: 'Winery Organization' },
  { value: 'DistributorOrgMSP', label: 'Distributor Organization' },
  { value: 'ConsumerOrgMSP', label: 'Consumer Organization' },
];

const roles = [
  { value: 'admin', label: 'Administrator' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Login() {
  const [tabValue, setTabValue] = useState(0);
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    organization: '',
  });
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const { login, register, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginData.username || !loginData.password || !loginData.organization) {
      setError('Please fill in all fields');
      return;
    }

    const result = await login(loginData);
    if (!result.success) {
      setError(result.message);
    } else {
      toast.success('Login successful!');
      navigate('/');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!registerData.username || !registerData.email || !registerData.password || 
        !registerData.organization || !registerData.role || !registerData.fullName) {
      setError('Please fill in all fields');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const result = await register(registerData);
    if (!result.success) {
      setError(result.message);
    } else {
      toast.success('Registration successful!');
      navigate('/');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper elevation={3} sx={{ width: '100%', mt: 4 }}>
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'center' }}>
              <LocalBar sx={{ fontSize: 40, color: 'primary.main', mr: 1 }} />
              <Typography component="h1" variant="h4" color="primary">
                Wine Traceability
              </Typography>
            </Box>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="auth tabs">
                <Tab label="Login" />
                <Tab label="Register" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <TabPanel value={tabValue} index={0}>
              <Box component="form" onSubmit={handleLogin}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="username"
                  label="Username"
                  autoComplete="username"
                  autoFocus
                  value={loginData.username}
                  onChange={handleLoginChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  disabled={loading}
                />
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Organization</InputLabel>
                  <Select
                    name="organization"
                    value={loginData.organization}
                    onChange={handleLoginChange}
                    label="Organization"
                    disabled={loading}
                  >
                    {organizations.map((org) => (
                      <MenuItem key={org.value} value={org.value}>
                        {org.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Security />}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box component="form" onSubmit={handleRegister}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="fullName"
                  label="Full Name"
                  value={registerData.fullName}
                  onChange={handleRegisterChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="username"
                  label="Username"
                  autoComplete="username"
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="email"
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  disabled={loading}
                />
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Organization</InputLabel>
                  <Select
                    name="organization"
                    value={registerData.organization}
                    onChange={handleRegisterChange}
                    label="Organization"
                    disabled={loading}
                  >
                    {organizations.map((org) => (
                      <MenuItem key={org.value} value={org.value}>
                        {org.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={registerData.role}
                    onChange={handleRegisterChange}
                    label="Role"
                    disabled={loading}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Registering...' : 'Register'}
                </Button>
              </Box>
            </TabPanel>
          </Box>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Default login credentials for testing:
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Username: vineyard_admin, Password: password123 (Vineyard Org)
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;