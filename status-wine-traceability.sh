#!/bin/bash

# ====================================================================
# Script de Estado - Sistema de Trazabilidad de Vinos
# ====================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}"
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
    echo -e "${NC}"
}

print_section() {
    echo -e "${BLUE}$1${NC}"
    echo "----------------------------------------"
}

check_service() {
    local service_name=$1
    local url=$2
    local expected_text=$3
    
    if curl -s -f "$url" | grep -q "$expected_text" 2>/dev/null; then
        echo -e "  ✅ $service_name: ${GREEN}FUNCIONANDO${NC} ($url)"
        return 0
    else
        echo -e "  ❌ $service_name: ${RED}NO DISPONIBLE${NC} ($url)"
        return 1
    fi
}

check_container() {
    local container_name=$1
    if docker ps | grep -q "$container_name"; then
        echo -e "  ✅ $container_name: ${GREEN}EJECUTÁNDOSE${NC}"
        return 0
    else
        echo -e "  ❌ $container_name: ${RED}DETENIDO${NC}"
        return 1
    fi
}

main() {
    print_header "ESTADO DEL SISTEMA DE TRAZABILIDAD DE VINOS"
    
    echo -e "${CYAN}Verificando estado de todos los componentes del sistema...${NC}"
    echo
    
    # Verificar servicios web
    print_section "🌐 SERVICIOS WEB"
    local web_services=0
    local web_total=6
    
    if check_service "Frontend" "http://localhost:3000" "<!DOCTYPE html>"; then ((web_services++)); fi
    if check_service "Backend API" "http://localhost:5000/api/health" "OK"; then ((web_services++)); fi
    if check_service "Network Status" "http://localhost:5000/api/network-status" "status"; then ((web_services++)); fi
    if check_service "MongoDB Express" "http://localhost:8081" "admin"; then ((web_services++)); fi
    if check_service "Redis Commander" "http://localhost:8082" "Redis"; then ((web_services++)); fi
    if check_service "Prometheus" "http://localhost:9090" "Prometheus"; then ((web_services++)); fi
    
    echo
    
    # Verificar contenedores de aplicación
    print_section "🐳 CONTENEDORES DE APLICACIÓN"
    local app_containers=0
    local app_total=5
    
    if check_container "wine-traceability-backend-dev"; then ((app_containers++)); fi
    if check_container "wine-traceability-frontend-dev"; then ((app_containers++)); fi
    if check_container "wine-traceability-mongodb-dev"; then ((app_containers++)); fi
    if check_container "wine-traceability-redis-dev"; then ((app_containers++)); fi
    if check_container "cli"; then ((app_containers++)); fi
    
    echo
    
    # Verificar contenedores de Fabric
    print_section "⛓️ RED HYPERLEDGER FABRIC"
    local fabric_containers=0
    local fabric_total=18
    
    # Certificate Authorities
    if check_container "ca.vineyard.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "ca.winery.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "ca.distributor.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "ca.consumer.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "ca.orderer.wine-traceability.com"; then ((fabric_containers++)); fi
    
    # Orderer
    if check_container "orderer.wine-traceability.com"; then ((fabric_containers++)); fi
    
    # Peers
    if check_container "peer0.vineyard.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer1.vineyard.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer0.winery.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer1.winery.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer0.distributor.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer1.distributor.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer0.consumer.wine-traceability.com"; then ((fabric_containers++)); fi
    if check_container "peer1.consumer.wine-traceability.com"; then ((fabric_containers++)); fi
    
    # CouchDB instances
    if check_container "couchdb0.vineyard"; then ((fabric_containers++)); fi
    if check_container "couchdb0.winery"; then ((fabric_containers++)); fi
    if check_container "couchdb0.distributor"; then ((fabric_containers++)); fi
    if check_container "couchdb0.consumer"; then ((fabric_containers++)); fi
    
    echo
    
    # Verificar chaincode
    print_section "📜 SMART CONTRACTS (CHAINCODE)"
    echo -e "  Verificando chaincode desplegado..."
    if docker exec cli peer lifecycle chaincode querycommitted -C wine-traceability-channel >/dev/null 2>&1; then
        echo -e "  ✅ Chaincode: ${GREEN}DESPLEGADO Y ACTIVO${NC}"
        
        # Obtener lista de chaincode
        local chaincodes=$(docker exec cli peer lifecycle chaincode querycommitted -C wine-traceability-channel 2>/dev/null | grep "Name:" | awk '{print $2}' | tr '\n' ' ')
        echo -e "  📋 Chaincodes activos: ${CYAN}$chaincodes${NC}"
    else
        echo -e "  ❌ Chaincode: ${RED}NO DISPONIBLE${NC}"
    fi
    
    echo
    
    # Verificar puertos
    print_section "🔌 PUERTOS EN USO"
    local important_ports=(3000 5000 7050 7054 8051 8054 9051 9054 10051 10054 11054 27017 6379 9090)
    for port in "${important_ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN | tail -n 1 | awk '{print $1}')
            echo -e "  ✅ Puerto $port: ${GREEN}EN USO${NC} ($process)"
        else
            echo -e "  ❌ Puerto $port: ${RED}LIBRE${NC}"
        fi
    done
    
    echo
    
    # Resumen del estado
    print_section "📊 RESUMEN DEL ESTADO"
    local total_services=$((web_services + app_containers + fabric_containers))
    local total_expected=$((web_total + app_total + fabric_total))
    
    echo -e "  🌐 Servicios Web: ${GREEN}$web_services${NC}/${BLUE}$web_total${NC}"
    echo -e "  🐳 Contenedores App: ${GREEN}$app_containers${NC}/${BLUE}$app_total${NC}"
    echo -e "  ⛓️ Contenedores Fabric: ${GREEN}$fabric_containers${NC}/${BLUE}$fabric_total${NC}"
    echo -e "  📊 Total: ${GREEN}$total_services${NC}/${BLUE}$total_expected${NC}"
    
    echo
    
    # Estado general
    if [ $total_services -eq $total_expected ]; then
        echo -e "${GREEN}🎉 ESTADO GENERAL: TODOS LOS SERVICIOS FUNCIONANDO CORRECTAMENTE${NC}"
        exit_code=0
    elif [ $total_services -gt $((total_expected * 3 / 4)) ]; then
        echo -e "${YELLOW}⚠️ ESTADO GENERAL: LA MAYORÍA DE SERVICIOS FUNCIONAN (VERIFICAR SERVICIOS FALTANTES)${NC}"
        exit_code=1
    else
        echo -e "${RED}🚨 ESTADO GENERAL: MÚLTIPLES SERVICIOS NO FUNCIONAN (VERIFICAR CONFIGURACIÓN)${NC}"
        exit_code=2
    fi
    
    echo
    
    # Información adicional
    if [ "$1" = "--detailed" ] || [ "$1" = "-d" ]; then
        print_section "📋 INFORMACIÓN DETALLADA"
        
        echo -e "${CYAN}Memoria utilizada por contenedores:${NC}"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10
        
        echo
        echo -e "${CYAN}Últimos logs del backend:${NC}"
        docker logs wine-traceability-backend-dev --tail 5 2>/dev/null || echo "  Backend no disponible"
        
        echo
        echo -e "${CYAN}Espacio en disco utilizado:${NC}"
        df -h / | tail -1 | awk '{print "  Usado: " $3 " de " $2 " (" $5 ")"}'
    fi
    
    echo
    print_section "🔧 COMANDOS ÚTILES"
    echo -e "  Ver logs del backend:     ${CYAN}docker logs wine-traceability-backend-dev -f${NC}"
    echo -e "  Ver logs de Fabric:       ${CYAN}docker logs peer0.vineyard.wine-traceability.com -f${NC}"
    echo -e "  Reiniciar sistema:        ${CYAN}./restart-wine-traceability.sh${NC}"
    echo -e "  Parar sistema:            ${CYAN}./stop-wine-traceability.sh${NC}"
    echo -e "  Estado detallado:         ${CYAN}./status-wine-traceability.sh --detailed${NC}"
    
    exit $exit_code
}

# Mostrar ayuda
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Uso: $0 [opciones]"
    echo
    echo "Opciones:"
    echo "  --detailed, -d    Mostrar información detallada adicional"
    echo "  --help, -h        Mostrar esta ayuda"
    echo
    echo "Códigos de salida:"
    echo "  0 - Todos los servicios funcionan correctamente"
    echo "  1 - La mayoría de servicios funcionan"
    echo "  2 - Múltiples servicios no funcionan"
    exit 0
fi

# Ejecutar función principal
main "$@"