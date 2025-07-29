import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  Assignment,
  LocalShipping,
  QrCode,
  AccountCircle,
  ExitToApp,
  Notifications,
  Agriculture,
  LocalBar,
  Store,
  Person,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const getNavigationItems = (organization) => {
  const baseItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '' },
    { text: 'Profile', icon: <Person />, path: '/profile' },
  ];

  switch (organization) {
    case 'VineyardOrgMSP':
      return [
        ...baseItems,
        { text: 'Wine Batches', icon: <Agriculture />, path: '/batches' },
        { text: 'Harvest History', icon: <Inventory />, path: '/harvest' },
        { text: 'Quality Control', icon: <Assignment />, path: '/quality' },
        { text: 'Certificates', icon: <QrCode />, path: '/certificates' },
      ];
    case 'WineryOrgMSP':
      return [
        ...baseItems,
        { text: 'Wine Production', icon: <LocalBar />, path: '/production' },
        { text: 'Inventory', icon: <Inventory />, path: '/inventory' },
        { text: 'Quality Control', icon: <Assignment />, path: '/quality' },
        { text: 'Transfers', icon: <LocalShipping />, path: '/transfers' },
      ];
    case 'DistributorOrgMSP':
      return [
        ...baseItems,
        { text: 'Inventory', icon: <Inventory />, path: '/inventory' },
        { text: 'Shipments', icon: <LocalShipping />, path: '/shipments' },
        { text: 'Orders', icon: <Assignment />, path: '/orders' },
        { text: 'Tracking', icon: <QrCode />, path: '/tracking' },
      ];
    case 'ConsumerOrgMSP':
      return [
        ...baseItems,
        { text: 'Products', icon: <Store />, path: '/products' },
        { text: 'Trace Wine', icon: <QrCode />, path: '/trace' },
        { text: 'Orders', icon: <Assignment />, path: '/orders' },
        { text: 'Verification', icon: <Assignment />, path: '/verify' },
      ];
    default:
      return baseItems;
  }
};

const getOrganizationName = (organization) => {
  const names = {
    'VineyardOrgMSP': 'Vineyard Portal',
    'WineryOrgMSP': 'Winery Portal',
    'DistributorOrgMSP': 'Distributor Portal',
    'ConsumerOrgMSP': 'Consumer Portal',
  };
  return names[organization] || 'Wine Traceability';
};

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    handleClose();
  };

  const handleNavigation = (path) => {
    const basePath = `/${user?.organization?.replace('OrgMSP', '').toLowerCase()}`;
    navigate(path === '' ? basePath : `${basePath}${path}`);
    setMobileOpen(false);
  };

  const navigationItems = getNavigationItems(user?.organization);
  const organizationName = getOrganizationName(user?.organization);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {organizationName}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={
                item.path === '' 
                  ? location.pathname === `/${user?.organization?.replace('OrgMSP', '').toLowerCase()}`
                  : location.pathname === `/${user?.organization?.replace('OrgMSP', '').toLowerCase()}${item.path}`
              }
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Wine Traceability System
          </Typography>
          
          <IconButton color="inherit">
            <Badge badgeContent={0} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <ExitToApp fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;