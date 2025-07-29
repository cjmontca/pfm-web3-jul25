import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      authType: null, // 'jwt' | 'metamask'

      login: (userData, token) => {
        // Determinar tipo de autenticación
        const authType = userData.authType || (userData.address ? 'metamask' : 'jwt');
        
        // Configurar headers según el tipo de auth
        if (authType === 'metamask') {
          api.defaults.headers['X-MetaMask-Auth'] = token;
          delete api.defaults.headers['Authorization'];
        } else {
          api.defaults.headers['Authorization'] = `Bearer ${token}`;
          delete api.defaults.headers['X-MetaMask-Auth'];
        }
        
        set({
          user: userData,
          token,
          authType,
          isAuthenticated: true,
          loading: false
        });
      },

      logout: () => {
        // Limpiar headers
        delete api.defaults.headers['Authorization'];
        delete api.defaults.headers['X-MetaMask-Auth'];
        
        set({
          user: null,
          token: null,
          authType: null,
          isAuthenticated: false,
          loading: false
        });
      },

      updateUser: (userData) => {
        set(state => ({
          user: { ...state.user, ...userData }
        }));
      },

      setLoading: (loading) => {
        set({ loading });
      },

      clearAuth: () => {
        // Limpiar headers
        delete api.defaults.headers['Authorization'];
        delete api.defaults.headers['X-MetaMask-Auth'];
        
        set({
          user: null,
          token: null,
          authType: null,
          isAuthenticated: false,
          loading: false
        });
      },

      // Verificar si es super-admin
      isSuperAdmin: () => {
        const state = get();
        return state.user && state.user.isSuperAdmin === true;
      },

      // Verificar si es autenticación MetaMask
      isMetaMaskAuth: () => {
        const state = get();
        return state.authType === 'metamask';
      },

      // Obtener wallet address si es MetaMask
      getWalletAddress: () => {
        const state = get();
        return state.user && state.authType === 'metamask' ? state.user.address : null;
      },

      // Restaurar headers al cargar la app
      restoreAuthHeaders: () => {
        const state = get();
        if (state.isAuthenticated && state.token) {
          if (state.authType === 'metamask') {
            api.defaults.headers['X-MetaMask-Auth'] = state.token;
          } else {
            api.defaults.headers['Authorization'] = `Bearer ${state.token}`;
          }
        }
      }
    }),
    {
      name: 'wine-traceability-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        authType: state.authType,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // Restaurar headers después de la hidratación
        if (state) {
          state.restoreAuthHeaders();
        }
      }
    }
  )
);