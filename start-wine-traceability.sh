#!/bin/bash

# ====================================================================
# Script de Inicialización Completa - Sistema de Trazabilidad de Vinos
# ====================================================================

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_step() {
    echo -e "${BLUE}[PASO]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[ÉXITO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}"
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
    echo -e "${NC}"
}

# Función para verificar prerrequisitos
check_prerequisites() {
    print_header "VERIFICANDO PRERREQUISITOS"
    
    local missing_deps=()
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    else
        print_success "Docker encontrado: $(docker --version)"
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    else
        print_success "Docker Compose encontrado: $(docker-compose --version)"
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    else
        print_success "Node.js encontrado: $(node --version)"
    fi
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        print_success "npm encontrado: $(npm --version)"
    fi
    
    # Verificar Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    else
        print_success "Git encontrado: $(git --version)"
    fi
    
    # Verificar curl
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    else
        print_success "curl encontrado"
    fi
    
    # Verificar jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    else
        print_success "jq encontrado"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Faltan las siguientes dependencias: ${missing_deps[*]}"
        print_info "Por favor, instala las dependencias faltantes y vuelve a ejecutar el script."
        print_info "Consulta la documentación en documentation/deployment-guide.md"
        exit 1
    fi
    
    print_success "Todos los prerrequisitos están instalados"
}

# Función para verificar puertos disponibles
check_ports() {
    print_step "Verificando puertos disponibles..."
    
    local required_ports=(80 443 3000 5000 7050 27017 6379 9090 3001)
    local occupied_ports=()
    
    for port in "${required_ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            occupied_ports+=($port)
        fi
    done
    
    if [ ${#occupied_ports[@]} -ne 0 ]; then
        print_warning "Los siguientes puertos están ocupados: ${occupied_ports[*]}"
        read -p "¿Quieres continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Libera los puertos ocupados y vuelve a ejecutar el script."
            exit 1
        fi
    else
        print_success "Todos los puertos están disponibles"
    fi
}

# Función para configurar el entorno
setup_environment() {
    print_header "CONFIGURANDO ENTORNO"
    
    # Crear directorios necesarios
    print_step "Creando directorios necesarios..."
    mkdir -p logs
    mkdir -p backend/logs
    mkdir -p nginx/ssl
    
    # Configurar archivo .env del backend si no existe
    if [ ! -f backend/.env ]; then
        print_step "Creando archivo de configuración del backend..."
        cp backend/.env.example backend/.env
        print_info "Archivo backend/.env creado. Puedes editarlo si necesitas configuración personalizada."
    else
        print_info "Archivo backend/.env ya existe"
    fi
    
    # Configurar archivo .env del frontend si no existe
    if [ ! -f frontend/.env ]; then
        print_step "Creando archivo de configuración del frontend..."
        cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.0.0
EOF
        print_success "Archivo frontend/.env creado"
    else
        print_info "Archivo frontend/.env ya existe"
    fi
    
    # Generar certificados SSL para desarrollo si no existen
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        print_step "Generando certificados SSL para desarrollo..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=ES/ST=Madrid/L=Madrid/O=WineTraceability/CN=localhost" \
            2>/dev/null
        print_success "Certificados SSL generados"
    else
        print_info "Certificados SSL ya existen"
    fi
    
    print_success "Entorno configurado correctamente"
}

# Función para limpiar instalaciones previas
cleanup_previous() {
    print_header "LIMPIANDO INSTALACIONES PREVIAS"
    
    print_step "Deteniendo contenedores existentes..."
    docker-compose down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    
    # Limpiar red Fabric si existe
    if [ -d "fabric-network" ]; then
        cd fabric-network
        if [ -f "scripts/network-setup.sh" ]; then
            print_step "Limpiando red Hyperledger Fabric previa..."
            chmod +x scripts/*.sh
            ./scripts/network-setup.sh down 2>/dev/null || true
        fi
        cd ..
    fi
    
    # Limpiar volúmenes Docker de wine-traceability
    print_step "Limpiando volúmenes Docker..."
    docker volume ls | grep wine-traceability | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
    
    # Limpiar redes Docker de wine-traceability
    print_step "Limpiando redes Docker..."
    docker network ls | grep wine-traceability | awk '{print $2}' | xargs -r docker network rm 2>/dev/null || true
    
    print_success "Limpieza completada"
}

# Función para configurar la red Hyperledger Fabric
setup_fabric_network() {
    print_header "CONFIGURANDO RED HYPERLEDGER FABRIC"
    
    cd fabric-network
    
    # Dar permisos de ejecución a los scripts
    print_step "Configurando permisos de scripts..."
    chmod +x scripts/*.sh
    
    # Verificar e instalar binarios de Fabric si es necesario
    print_step "Verificando binarios de Hyperledger Fabric..."
    
    # 🔧 Configurar PATH para usar binarios locales PRIMERO
    if [ -d "bin" ]; then
        export PATH=$(pwd)/bin:$PATH
        print_info "Usando binarios locales de Fabric desde bin/"
    fi
    
    # 🔍 Verificar binarios locales específicamente
    local_fabric_ca_client="$(pwd)/bin/fabric-ca-client"
    local_configtxgen="$(pwd)/bin/configtxgen"
    
    if [ -f "$local_fabric_ca_client" ] && [ -f "$local_configtxgen" ]; then
        print_success "✅ Binarios de Fabric encontrados localmente - NO SE NECESITA DESCARGA"
    elif ! command -v fabric-ca-client &> /dev/null || ! command -v configtxgen &> /dev/null; then
        print_step "Descargando e instalando binarios de Hyperledger Fabric..."
        
        # 🔒 PROTEGER configtx.yaml personalizado antes de la descarga
        if [ -f "fabric-network/config/configtx.yaml" ]; then
            print_info "Respaldando configtx.yaml personalizado..."
            cp fabric-network/config/configtx.yaml fabric-network/config/configtx.yaml.backup.wine
        fi
        
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.9 1.5.5 -d -s
        export PATH=$PATH:$PWD/bin
        
        # 🔒 RESTAURAR configtx.yaml personalizado después de la descarga
        if [ -f "fabric-network/config/configtx.yaml.backup.wine" ]; then
            print_info "Restaurando configtx.yaml personalizado..."
            mv fabric-network/config/configtx.yaml.backup.wine fabric-network/config/configtx.yaml
            print_success "✅ configtx.yaml del proyecto de vinos restaurado"
        fi
        
        print_success "Binarios de Fabric instalados"
    else
        print_success "Binarios de Fabric encontrados"
    fi
    
    # Iniciar la red Fabric
    print_step "Iniciando red Hyperledger Fabric con Fabric CA (esto puede tomar varios minutos)..."
    if ./scripts/network-setup.sh up; then
        print_success "Red Hyperledger Fabric iniciada correctamente"
    else
        print_error "Error al iniciar la red Fabric"
        cd ..
        exit 1
    fi
    
    # Esperar a que la red esté completamente lista
    print_step "Esperando a que la red esté completamente operativa..."
    sleep 30
    
    # Verificar que los contenedores estén ejecutándose
    print_step "Verificando estado de contenedores Fabric..."
    local fabric_containers=(
        "ca.vineyard.wine-traceability.com"
        "ca.winery.wine-traceability.com"
        "ca.distributor.wine-traceability.com"
        "ca.consumer.wine-traceability.com"
        "ca.orderer.wine-traceability.com"
        "orderer.wine-traceability.com"
        "peer0.vineyard.wine-traceability.com"
        "peer0.winery.wine-traceability.com"
        "peer0.distributor.wine-traceability.com"
        "peer0.consumer.wine-traceability.com"
    )
    
    for container in "${fabric_containers[@]}"; do
        if docker ps | grep -q $container; then
            print_success "✓ $container está ejecutándose"
        else
            print_error "✗ $container no está ejecutándose"
            cd ..
            exit 1
        fi
    done
    
    cd ..
    print_success "Red Hyperledger Fabric configurada correctamente"
}

# Función para desplegar smart contracts
deploy_chaincodes() {
    print_header "DESPLEGANDO SMART CONTRACTS"
    
    cd fabric-network
    
    print_step "Desplegando chaincode de trazabilidad de vinos..."
    if ./scripts/deploy-chaincode.sh wine; then
        print_success "Chaincode de trazabilidad desplegado"
    else
        print_error "Error al desplegar chaincode de trazabilidad"
        cd ..
        exit 1
    fi
    
    print_step "Desplegando chaincode de certificaciones..."
    if ./scripts/deploy-chaincode.sh cert; then
        print_success "Chaincode de certificaciones desplegado"
    else
        print_error "Error al desplegar chaincode de certificaciones"
        cd ..
        exit 1
    fi
    
    print_step "Desplegando chaincode de transferencias..."
    if ./scripts/deploy-chaincode.sh transfer; then
        print_success "Chaincode de transferencias desplegado"
    else
        print_error "Error al desplegar chaincode de transferencias"
        cd ..
        exit 1
    fi
    
    # Verificar chaincode desplegado
    print_step "Verificando chaincode desplegado..."
    if docker exec cli peer lifecycle chaincode querycommitted -C wine-traceability-channel >/dev/null 2>&1; then
        print_success "Todos los chaincodes están operativos"
    else
        print_warning "No se pudo verificar el estado de los chaincodes"
    fi
    
    cd ..
    print_success "Smart contracts desplegados correctamente"
}

# Función para instalar dependencias de la aplicación
install_dependencies() {
    print_header "INSTALANDO DEPENDENCIAS DE LA APLICACIÓN"
    
    # Instalar dependencias del backend
    print_step "Instalando dependencias del backend..."
    cd backend
    if npm install; then
        print_success "Dependencias del backend instaladas"
    else
        print_error "Error al instalar dependencias del backend"
        cd ..
        exit 1
    fi
    cd ..
    
    # Instalar dependencias del frontend
    print_step "Instalando dependencias del frontend..."
    cd frontend
    if npm install; then
        print_success "Dependencias del frontend instaladas"
    else
        print_error "Error al instalar dependencias del frontend"
        cd ..
        exit 1
    fi
    cd ..
    
    print_success "Todas las dependencias instaladas correctamente"
}

# Función para iniciar la aplicación
start_application() {
    print_header "INICIANDO APLICACIÓN"
    
    print_step "Iniciando servicios de la aplicación..."
    if docker-compose -f docker-compose.dev.yml up -d; then
        print_success "Servicios de aplicación iniciados"
    else
        print_error "Error al iniciar servicios de aplicación"
        exit 1
    fi
    
    # Esperar a que los servicios estén listos
    print_step "Esperando a que los servicios estén listos..."
    sleep 60
    
    # Verificar servicios
    print_step "Verificando estado de servicios..."
    local app_services=(
        "wine-traceability-backend-dev"
        "wine-traceability-frontend-dev"
        "wine-traceability-mongodb-dev"
        "wine-traceability-redis-dev"
    )
    
    for service in "${app_services[@]}"; do
        if docker ps | grep -q $service; then
            print_success "✓ $service está ejecutándose"
        else
            print_warning "✗ $service no está ejecutándose correctamente"
        fi
    done
    
    print_success "Aplicación iniciada correctamente"
}

# Función para verificar la instalación
verify_installation() {
    print_header "VERIFICANDO INSTALACIÓN"
    
    print_step "Verificando API backend..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
            print_success "✓ API backend responde correctamente"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                print_warning "✗ API backend no responde después de $max_attempts intentos"
            else
                print_info "Esperando a que el API backend esté lista... (intento $attempt/$max_attempts)"
                sleep 5
            fi
        fi
        ((attempt++))
    done
    
    print_step "Verificando frontend..."
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "✓ Frontend está accesible"
    else
        print_warning "✗ Frontend no está accesible"
    fi
    
    print_step "Verificando estado de la red Fabric..."
    if curl -f http://localhost:5000/api/network-status >/dev/null 2>&1; then
        print_success "✓ Red Fabric está operativa"
    else
        print_warning "✗ Red Fabric no está completamente operativa"
    fi
    
    print_step "Verificando base de datos..."
    if curl -f http://localhost:8081 >/dev/null 2>&1; then
        print_success "✓ MongoDB Express está accesible"
    else
        print_warning "✗ MongoDB Express no está accesible"
    fi
    
    print_success "Verificación completada"
}

# Función para crear usuarios de prueba
create_test_users() {
    print_header "CREANDO USUARIOS DE PRUEBA"
    
    print_step "Esperando a que la API esté completamente lista..."
    sleep 10
    
    # Array de usuarios de prueba
    declare -a test_users=(
        '{"username":"vineyard_admin","email":"admin@vineyard.com","password":"password123","organization":"VineyardOrgMSP","role":"admin","fullName":"Administrador Viñedo"}'
        '{"username":"winery_admin","email":"admin@winery.com","password":"password123","organization":"WineryOrgMSP","role":"admin","fullName":"Administrador Bodega"}'
        '{"username":"distributor_admin","email":"admin@distributor.com","password":"password123","organization":"DistributorOrgMSP","role":"admin","fullName":"Administrador Distribuidor"}'
        '{"username":"consumer_admin","email":"admin@consumer.com","password":"password123","organization":"ConsumerOrgMSP","role":"admin","fullName":"Administrador Consumidor"}'
    )
    
    for user_data in "${test_users[@]}"; do
        local username=$(echo $user_data | jq -r '.username')
        print_step "Creando usuario: $username..."
        
        local response=$(curl -s -X POST http://localhost:5000/api/auth/register \
            -H "Content-Type: application/json" \
            -d "$user_data")
        
        if echo "$response" | jq -r '.success' | grep -q "true"; then
            print_success "✓ Usuario $username creado correctamente"
        else
            print_warning "✗ Usuario $username ya existe o hubo un error"
        fi
    done
    
    print_success "Usuarios de prueba configurados"
}

# Función principal de información final
show_final_info() {
    print_header "¡INSTALACIÓN COMPLETADA!"
    
    echo -e "${GREEN}"
    cat << "EOF"
 ██╗    ██╗██╗███╗   ██╗███████╗    ████████╗██████╗  █████╗  ██████╗███████╗
 ██║    ██║██║████╗  ██║██╔════╝    ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝
 ██║ █╗ ██║██║██╔██╗ ██║█████╗         ██║   ██████╔╝███████║██║     █████╗  
 ██║███╗██║██║██║╚██╗██║██╔══╝         ██║   ██╔══██╗██╔══██║██║     ██╔══╝  
 ╚███╔███╔╝██║██║ ╚████║███████╗       ██║   ██║  ██║██║  ██║╚██████╗███████╗
  ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝╚══════╝       ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝
EOF
    echo -e "${NC}"
    
    echo -e "${CYAN}Sistema de Trazabilidad de Vinos - Trabajo Fin de Máster${NC}"
    echo
    echo -e "${YELLOW}🌐 URLs de Acceso:${NC}"
    echo -e "  • Frontend (Aplicación Web):     ${GREEN}http://localhost:3000${NC}"
    echo -e "  • Backend API:                   ${GREEN}http://localhost:5000${NC}"
    echo -e "  • MongoDB Express:               ${GREEN}http://localhost:8081${NC}"
    echo -e "  • Redis Commander:               ${GREEN}http://localhost:8082${NC}"
    echo -e "  • Prometheus (Métricas):         ${GREEN}http://localhost:9090${NC}"
    echo -e "  • Grafana (Dashboards):          ${GREEN}http://localhost:3001${NC}"
    echo
    echo -e "${YELLOW}👤 Usuarios de Prueba (usuario:contraseña):${NC}"
    echo -e "  • Viñedo:      ${GREEN}vineyard_admin:password123${NC}"
    echo -e "  • Bodega:      ${GREEN}winery_admin:password123${NC}"
    echo -e "  • Distribuidor: ${GREEN}distributor_admin:password123${NC}"
    echo -e "  • Consumidor:   ${GREEN}consumer_admin:password123${NC}"
    echo
    echo -e "${YELLOW}📊 Servicios Monitoreados:${NC}"
    echo -e "  • Grafana Login: ${GREEN}admin:grafana2024${NC}"
    echo -e "  • MongoDB Express: ${GREEN}admin:admin123${NC}"
    echo
    echo -e "${YELLOW}🔧 Comandos Útiles:${NC}"
    echo -e "  • Ver logs del backend:     ${CYAN}docker logs wine-traceability-backend-dev -f${NC}"
    echo -e "  • Ver logs de Fabric:       ${CYAN}docker logs peer0.vineyard.wine-traceability.com -f${NC}"
    echo -e "  • Parar todo el sistema:    ${CYAN}./stop-wine-traceability.sh${NC}"
    echo -e "  • Reiniciar el sistema:     ${CYAN}./restart-wine-traceability.sh${NC}"
    echo
    echo -e "${YELLOW}📚 Documentación:${NC}"
    echo -e "  • README principal:         ${CYAN}./README.md${NC}"
    echo -e "  • Guía de arquitectura:     ${CYAN}./documentation/architecture-design.md${NC}"
    echo -e "  • Guía de despliegue:       ${CYAN}./documentation/deployment-guide.md${NC}"
    echo
    echo -e "${GREEN}¡El sistema está listo para usar! 🎉${NC}"
    echo
}

# Función principal
main() {
    print_header "SISTEMA DE TRAZABILIDAD DE VINOS - HYPERLEDGER FABRIC"
    echo -e "${CYAN}Trabajo Fin de Máster - Ingeniería Blockchain${NC}"
    echo
    
    # Verificar si estamos en el directorio correcto
    if [ ! -f "README.md" ] || [ ! -d "fabric-network" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Por favor, ejecuta este script desde el directorio raíz del proyecto wine-traceability"
        exit 1
    fi
    
    print_info "Este script configurará e iniciará todo el sistema automáticamente"
    print_warning "El proceso puede tomar entre 10-20 minutos dependiendo de tu hardware"
    echo
    
    read -p "¿Quieres continuar con la instalación? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalación cancelada por el usuario"
        exit 0
    fi
    
    # Ejecutar pasos de instalación
    check_prerequisites
    check_ports
    setup_environment
    cleanup_previous
    setup_fabric_network
    deploy_chaincodes
    install_dependencies
    start_application
    verify_installation
    create_test_users
    show_final_info
}

# Manejar interrupciones
trap 'print_error "Instalación interrumpida por el usuario"; exit 1' INT TERM

# Ejecutar función principal
main "$@"