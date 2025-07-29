import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import { useAuthStore } from './services/authStore';

import Layout from './components/common/Layout';
import Login from './pages/Login';
import VineyardDashboard from './pages/VineyardDashboard';
import WineryDashboard from './pages/WineryDashboard';
import DistributorDashboard from './pages/DistributorDashboard';
import ConsumerDashboard from './pages/ConsumerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboardComplete from './pages/SuperAdminDashboardComplete';
import PublicTrace from './pages/PublicTrace';
import Profile from './pages/Profile';

// Vineyard pages
import WineBatches from './pages/vineyard/WineBatches';
import HarvestHistory from './pages/vineyard/HarvestHistory';
import QualityControl from './pages/vineyard/QualityControl';
import Certificates from './pages/vineyard/Certificates';

const theme = createTheme({
  palette: {
    primary: {
      main: '#722f37',
      light: '#a05a5a',
      dark: '#4a1e23',
    },
    secondary: {
      main: '#8bc34a',
      light: '#bef67a',
      dark: '#5a9216',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function OrganizationRoute({ organization, children }) {
  const { user } = useAuthStore();
  return user?.organization === organization ? children : <Navigate to="/login" />;
}

function SuperAdminRoute({ children }) {
  const { user, isSuperAdmin } = useAuthStore();
  return isSuperAdmin() ? children : <Navigate to="/login" />;
}

function App() {
  const { isAuthenticated, user } = useAuthStore();

  const getDashboardRoute = () => {
    if (!user) return '/login';
    
    // Si es super-admin con MetaMask
    if (user.isSuperAdmin || user.authType === 'metamask') {
      return '/super-admin/dashboard';
    }
    
    switch (user.organization) {
      case 'VineyardOrgMSP':
        return '/vineyard';
      case 'WineryOrgMSP':
        return '/winery';
      case 'DistributorOrgMSP':
        return '/distributor';
      case 'ConsumerOrgMSP':
        return '/consumer';
      case 'SystemAdminMSP':
        return '/admin';
      default:
        return '/login';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/trace" element={<PublicTrace />} />
            
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to={getDashboardRoute()} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            <Route
              path="/vineyard"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="VineyardOrgMSP">
                    <Layout>
                      <VineyardDashboard />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vineyard/batches"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="VineyardOrgMSP">
                    <Layout>
                      <WineBatches />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vineyard/harvest"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="VineyardOrgMSP">
                    <Layout>
                      <HarvestHistory />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vineyard/quality"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="VineyardOrgMSP">
                    <Layout>
                      <QualityControl />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vineyard/certificates"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="VineyardOrgMSP">
                    <Layout>
                      <Certificates />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/winery"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="WineryOrgMSP">
                    <Layout>
                      <WineryDashboard />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/distributor"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="DistributorOrgMSP">
                    <Layout>
                      <DistributorDashboard />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/consumer"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="ConsumerOrgMSP">
                    <Layout>
                      <ConsumerDashboard />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <OrganizationRoute organization="SystemAdminMSP">
                    <Layout>
                      <AdminDashboard />
                    </Layout>
                  </OrganizationRoute>
                </ProtectedRoute>
              }
            />

            {/* Super-Admin Routes */}
            <Route
              path="/super-admin/dashboard"
              element={
                <SuperAdminRoute>
                  <SuperAdminDashboardComplete />
                </SuperAdminRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;