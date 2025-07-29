#!/bin/bash

# ====================================================================
# Script de Parada Completa - Sistema de Trazabilidad de Vinos
# ====================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[PASO]${NC} $1"
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

# Función principal de parada
stop_system() {
    print_header "DETENIENDO SISTEMA DE TRAZABILIDAD DE VINOS"
    
    print_step "Deteniendo servicios de aplicación..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    docker-compose down --remove-orphans 2>/dev/null || true
    print_success "Servicios de aplicación detenidos"
    
    print_step "Deteniendo red Hyperledger Fabric..."
    if [ -d "fabric-network" ]; then
        cd fabric-network
        if [ -f "scripts/network-setup.sh" ]; then
            chmod +x scripts/*.sh
            ./scripts/network-setup.sh down 2>/dev/null || true
        fi
        cd ..
    fi
    print_success "Red Hyperledger Fabric detenida"
    
    print_step "Limpiando contenedores residuales..."
    # Detener todos los contenedores relacionados con wine-traceability
    docker ps -a | grep wine-traceability | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true
    docker ps -a | grep wine-traceability | awk '{print $1}' | xargs -r docker rm 2>/dev/null || true
    
    # Detener contenedores de Fabric
    docker ps -a | grep -E "(peer|orderer|ca).*wine-traceability" | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true
    docker ps -a | grep -E "(peer|orderer|ca).*wine-traceability" | awk '{print $1}' | xargs -r docker rm 2>/dev/null || true
    
    # Detener específicamente contenedores CA si existen
    print_step "Deteniendo Certificate Authorities..."
    docker-compose -f fabric-network/docker/docker-compose-ca.yml down --volumes 2>/dev/null || true
    
    print_success "Contenedores limpiados"
    
    print_step "Verificando que todos los servicios estén detenidos..."
    local running_containers=$(docker ps | grep wine-traceability | wc -l)
    if [ $running_containers -eq 0 ]; then
        print_success "Todos los servicios han sido detenidos correctamente"
    else
        print_warning "Algunos contenedores aún están ejecutándose"
        docker ps | grep wine-traceability
    fi
    
    echo
    print_success "Sistema detenido completamente"
    echo -e "${CYAN}Para reiniciar el sistema, ejecuta: ${GREEN}./start-wine-traceability.sh${NC}"
}

# Función para limpieza completa (opcional)
deep_clean() {
    print_header "LIMPIEZA PROFUNDA DEL SISTEMA"
    print_warning "Esto eliminará TODOS los datos, volúmenes y configuraciones"
    echo
    read -p "¿Estás seguro de que quieres realizar una limpieza completa? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Eliminando volúmenes Docker..."
        docker volume ls | grep wine-traceability | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
        
        print_step "Eliminando redes Docker..."
        docker network ls | grep wine-traceability | awk '{print $2}' | xargs -r docker network rm 2>/dev/null || true
        
        print_step "Eliminando artefactos de Fabric..."
        rm -rf fabric-network/organizations 2>/dev/null || true
        rm -rf fabric-network/channel-artifacts 2>/dev/null || true
        
        print_step "Eliminando logs..."
        rm -rf backend/logs/* 2>/dev/null || true
        rm -rf logs/* 2>/dev/null || true
        
        print_success "Limpieza profunda completada"
    else
        print_step "Limpieza profunda cancelada"
    fi
}

# Función principal
main() {
    echo -e "${CYAN}Sistema de Trazabilidad de Vinos - Script de Parada${NC}"
    echo
    
    if [ "$1" = "--deep-clean" ] || [ "$1" = "-d" ]; then
        stop_system
        deep_clean
    elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "Uso: $0 [opciones]"
        echo
        echo "Opciones:"
        echo "  --deep-clean, -d    Parar sistema y realizar limpieza profunda"
        echo "  --help, -h          Mostrar esta ayuda"
        echo
        echo "Sin opciones: Parar sistema normalmente"
        exit 0
    else
        stop_system
        echo
        echo -e "${YELLOW}💡 Tip:${NC} Para una limpieza completa (eliminar todos los datos), usa:"
        echo -e "   ${CYAN}$0 --deep-clean${NC}"
    fi
}

# Manejar interrupciones
trap 'print_error "Parada interrumpida"; exit 1' INT TERM

# Ejecutar función principal
main "$@"