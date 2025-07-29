# 🦸 Super-Administrador con MetaMask

## 📋 Resumen

Este sistema implementa una **autenticación híbrida** que combina:
- **JWT tradicional** para las 4 organizaciones (Viñedo, Bodega, Distribuidor, Consumidor)
- **MetaMask Web3** para el super-administrador con máximos privilegios

## 🏗️ Arquitectura del Sistema Híbrido

```
🔐 Sistema de Autenticación Dual
├── 👥 Organizaciones (JWT tradicional)
│   ├── vineyard_admin / password123 / VineyardOrgMSP
│   ├── winery_admin / password123 / WineryOrgMSP
│   ├── distributor_admin / password123 / DistributorOrgMSP
│   └── consumer_admin / password123 / ConsumerOrgMSP
└── 🦸 Super-Admin (MetaMask Web3)
    └── Wallet: 0x25E93088a2ab13E6C4732122C996e56Ef85fcF79
```

## 🚀 Instalación y Configuración

### 1️⃣ **Instalar Dependencias**

```bash
# Ejecutar script de instalación
./install-metamask-deps.sh

# O manual:
cd backend && npm install ethers
cd ../frontend && npm install ethers web3
```

### 2️⃣ **Configurar Variables de Entorno**

Edita `backend/.env` y añade tu wallet:

```bash
# Super-Admin Wallets (separados por comas)
SUPER_ADMIN_WALLETS=0x25E93088a2ab13E6C4732122C996e56Ef85fcF79,0xTuOtraWallet
```

### 3️⃣ **Reiniciar Servicios**

```bash
# Reiniciar backend
cd backend
npm run dev

# El frontend ya debería estar corriendo
cd ../frontend
npm start
```

## 🔑 Acceso al Sistema

### 👥 **Login Organizacional (JWT)**

```bash
URL: http://localhost:3000
Tab: "Organizaciones"

Usuarios:
- vineyard_admin / password123
- winery_admin / password123  
- distributor_admin / password123
- consumer_admin / password123
```

### 🦸 **Login Super-Admin (MetaMask)**

```bash
URL: http://localhost:3000
Tab: "Super-Administrador"

Requisitos:
- MetaMask instalado y configurado
- Wallet autorizada en SUPER_ADMIN_WALLETS
- Firmar mensaje de autenticación
```

## 🛡️ Seguridad y Funcionamiento

### **Proceso de Autenticación MetaMask**

1. **Detección**: Sistema verifica que MetaMask esté instalado
2. **Conexión**: Usuario conecta su wallet 
3. **Verificación**: Sistema comprueba que la wallet esté autorizada
4. **Nonce**: Backend genera mensaje único con timestamp
5. **Firma**: Usuario firma el mensaje con su clave privada
6. **Validación**: Backend verifica la firma y crea sesión

### **Headers de Autenticación**

```javascript
// JWT (Organizaciones)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// MetaMask (Super-Admin)
X-MetaMask-Auth: {
  "address": "0x25E93088a2ab13E6C4732122C996e56Ef85fcF79",
  "signature": "0x1234567890abcdef...",
  "message": "Wine Traceability Super-Admin Login...",
  "timestamp": 1703123456789
}
```

### **Middleware de Autenticación**

El middleware `hybridAuth` maneja ambos tipos de autenticación:

```javascript
// Detecta tipo de auth automáticamente
if (metaMaskAuth) {
    return handleMetaMaskAuth(req, res, next, metaMaskAuth);
}
if (jwtAuth) {
    return handleJWTAuth(req, res, next, jwtAuth);
}
```

## 🌐 API Endpoints

### **Super-Admin Endpoints**

```bash
# Generar nonce para MetaMask
POST /api/super-admin/auth/nonce
Body: { "address": "0x..." }

# Verificar autenticación MetaMask  
POST /api/super-admin/auth/verify
Headers: X-MetaMask-Auth: {...}

# Dashboard del super-admin
GET /api/super-admin/dashboard
Headers: X-MetaMask-Auth: {...}

# Transferencia de emergencia
POST /api/super-admin/emergency-transfer
Headers: X-MetaMask-Auth: {...}
Body: { "wineId": "WINE001", "fromOrg": "VineyardOrgMSP", "toOrg": "WineryOrgMSP", "reason": "Emergency" }

# Wallets autorizadas
GET /api/super-admin/authorized-wallets
Headers: X-MetaMask-Auth: {...}
```

### **Rutas Protegidas**

```javascript
// Solo super-admin
router.use('/emergency', requireSuperAdmin);

// Organizaciones O super-admin
router.use('/data', orgOrSuperAdmin(['VineyardOrgMSP', 'WineryOrgMSP']));

// Autenticación híbrida
router.use('/protected', hybridAuth);
```

## 🎨 Componentes Frontend

### **MetaMask Login Component**

```jsx
import MetaMaskLogin from '../components/auth/MetaMaskLogin';

<MetaMaskLogin 
    onSuccess={(userData) => navigate('/super-admin/dashboard')}
    onError={(error) => console.error(error)}
/>
```

### **Verificación de Permisos**

```javascript
import { useAuthStore } from '../services/authStore';

const { isSuperAdmin, isMetaMaskAuth, getWalletAddress } = useAuthStore();

if (isSuperAdmin()) {
    // Mostrar funciones de super-admin
}

if (isMetaMaskAuth()) {
    const wallet = getWalletAddress();
    // Mostrar información de wallet
}
```

## 🔧 Configuración Avanzada

### **Múltiples Wallets Autorizadas**

```bash
# En .env
SUPER_ADMIN_WALLETS=0x25E93088a2ab13E6C4732122C996e56Ef85fcF79,0x742d35cc6e3c0532925a3b8d6ac6e8c6b4adbeef,0x123456789abcdef123456789abcdef123456789a
```

### **Timeout de Autenticación**

```javascript
// En hybridAuth.js
const MAX_AUTH_AGE = 5 * 60 * 1000; // 5 minutos

if (now - authTime > MAX_AUTH_AGE) {
    return res.status(401).json({
        error: 'MetaMask authentication expired'
    });
}
```

### **Mensaje de Firma Personalizado**

```javascript
const message = `Wine Traceability Super-Admin Login

Wallet: ${address}
Timestamp: ${timestamp}  
Nonce: ${nonce}

This signature proves you control this wallet and authorizes access to the super-admin panel.`;
```

## 🚨 Solución de Problemas

### **Error: "MetaMask no está instalado"**

```bash
Solución: Instalar MetaMask desde https://metamask.io/download.html
```

### **Error: "Wallet not authorized as super-admin"**

```bash
Solución: 
1. Verificar que tu wallet esté en SUPER_ADMIN_WALLETS
2. Asegurar que la dirección esté en minúsculas
3. Reiniciar el backend después de cambiar .env
```

### **Error: "Invalid MetaMask signature"**

```bash
Posibles causas:
1. Red de MetaMask incorrecta
2. Mensaje modificado durante la firma
3. Timestamp expirado (>5 minutos)

Solución: Refrescar página y intentar de nuevo
```

### **Error: "MetaMask authentication expired"**

```bash
Causa: La firma tiene más de 5 minutos
Solución: Volver a firmar el mensaje
```

## 🎯 Permisos del Super-Admin

El super-administrador tiene acceso a:

```javascript
permissions: [
    'view_all_organizations',      // Ver todas las organizaciones
    'manage_cross_org_transfers',  // Transferencias entre organizaciones
    'system_administration',       // Administración del sistema
    'blockchain_operations',       // Operaciones blockchain
    'user_management'             // Gestión de usuarios
]
```

## 📊 Dashboard Features

El dashboard del super-admin incluye:

- 📈 **Métricas globales** del sistema
- 🏢 **Estado de todas las organizaciones**
- 🔗 **Información de blockchain** (altura, peers)
- 🦸 **Información de la wallet conectada**
- ⚡ **Operaciones de emergencia**
- 🔐 **Lista de permisos activos**

## ✅ Ventajas del Sistema Híbrido

1. **🔒 Seguridad Mejorada**: Super-admin con criptografía asimétrica
2. **🎯 Separación de Roles**: Organizaciones vs Super-Admin
3. **🔄 Compatibilidad**: Mantiene el sistema JWT existente
4. **⚡ Sin Contraseñas**: Super-admin sin credenciales tradicionales
5. **🌐 Web3 Ready**: Preparado para funcionalidades blockchain avanzadas
6. **🔍 Auditabilidad**: Cada acción está firmada criptográficamente

## 📄 Archivos Modificados/Creados

### **Backend**
- `src/middleware/hybridAuth.js` - Middleware de autenticación dual
- `src/routes/superAdminRoutes.js` - Rutas del super-admin
- `server.js` - Registro de rutas super-admin

### **Frontend**
- `src/components/auth/MetaMaskLogin.js` - Componente login MetaMask
- `src/pages/LoginPage.js` - Página login con tabs
- `src/pages/SuperAdminDashboard.js` - Dashboard super-admin
- `src/services/authStore.js` - Store actualizado para ambos auth

### **Configuración**
- `install-metamask-deps.sh` - Script de instalación
- `METAMASK_SETUP.md` - Esta documentación

## 🎉 ¡Sistema Listo!

Una vez configurado, tendrás:

✅ **Sistema JWT** funcionando para organizaciones  
✅ **Login MetaMask** para super-administrador  
✅ **Dashboard exclusivo** con máximos privilegios  
✅ **Seguridad Web3** con firma digital  
✅ **Compatibilidad total** con el sistema existente

## 🎛️ **Dashboard Unificado Super-Admin**

El super-administrador tiene acceso a un **dashboard completo** con control total sobre todas las organizaciones:

### **🖥️ Funcionalidades del Dashboard**

#### **📊 Tab 1: Resumen General**
- **Estado del sistema** (Fabric, Chaincodes, API)
- **Distribución de lotes** por organización
- **Acciones rápidas** (Crear, Transferir, Emergencias)
- **Métricas visuales** en tiempo real

#### **🏢 Tab 2: Organizaciones**
- **Vista de todas las organizaciones** con estadísticas
- **Acceso directo** a lotes de cada organización
- **Creación de lotes** para cualquier organización
- **Estado operativo** de cada organización

#### **🍷 Tab 3: Lotes de Vino**
- **Listado completo** de todos los lotes del sistema
- **Filtrado por organización**
- **Operaciones directas** (Ver, Transferir, QR)
- **Creación masiva** de lotes

#### **🔄 Tab 4: Transferencias**
- **Historial completo** de transferencias
- **Transferencias cross-organizacionales**
- **Estado de transferencias** en tiempo real
- **Nueva transferencia** con validación

#### **📈 Tab 5: Analytics**
- **Métricas de blockchain** (transacciones, bloques)
- **Actividad por organización**
- **Carga de red** y rendimiento
- **Estadísticas operativas**

#### **👥 Tab 6: Usuarios**
- **Gestión de usuarios** de todas las organizaciones
- **Estado de actividad** y último login
- **Roles y permisos** por usuario
- **Administración completa**

#### **🚨 Tab 7: Operaciones de Emergencia**
- **Congelar lotes** en casos críticos
- **Transferencias forzadas** sin validaciones
- **Revocar certificados** de calidad
- **Operaciones irreversibles** con justificación

### **🛠️ Operaciones Disponibles**

```bash
# Crear lote para cualquier organización
POST /api/super-admin/organizations/{orgId}/wines
Body: { wineId, vineyardData }

# Transferir entre organizaciones
POST /api/super-admin/transfer  
Body: { wineId, fromOrganization, toOrganization, notes }

# Operaciones de emergencia
POST /api/super-admin/emergency/{operation}
Body: { reason, data }

# Analytics del sistema
GET /api/super-admin/analytics

# Gestión de usuarios
GET /api/super-admin/users
```

### **⚡ Acciones Rápidas Disponibles**

1. **➕ Crear Lote**: Para cualquier organización desde un formulario
2. **🔄 Transferir**: Entre cualquier organización con validación
3. **🚨 Emergencia**: Operaciones críticas con justificación
4. **👁️ Monitorear**: Vista global de todas las operaciones
5. **🔍 Auditar**: Historial completo de transacciones
6. **⚙️ Administrar**: Control total del sistema

**Acceso:**
- **Organizaciones**: http://localhost:3000 → Tab "Organizaciones"
- **Super-Admin**: http://localhost:3000 → Tab "Super-Administrador" → Dashboard Completo