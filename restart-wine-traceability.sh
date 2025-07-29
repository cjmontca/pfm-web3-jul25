#!/bin/bash

# ====================================================================
# Script de Reinicio - Sistema de Trazabilidad de Vinos
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

print_header() {
    echo -e "${PURPLE}"
    echo "========================================================================"
    echo "$1"
    echo "========================================================================"
    echo -e "${NC}"
}

main() {
    print_header "REINICIANDO SISTEMA DE TRAZABILIDAD DE VINOS"
    
    echo -e "${CYAN}Este script detendrá y volverá a iniciar todo el sistema${NC}"
    echo
    
    read -p "¿Quieres continuar con el reinicio? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Reinicio cancelado por el usuario"
        exit 0
    fi
    
    print_step "Paso 1: Deteniendo el sistema..."
    if ./stop-wine-traceability.sh; then
        print_success "Sistema detenido correctamente"
    else
        echo -e "${RED}Error al detener el sistema${NC}"
        exit 1
    fi
    
    echo
    print_step "Paso 2: Esperando 10 segundos antes de reiniciar..."
    sleep 10
    
    print_step "Paso 3: Iniciando el sistema..."
    if ./start-wine-traceability.sh; then
        print_success "Sistema reiniciado correctamente"
    else
        echo -e "${RED}Error al reiniciar el sistema${NC}"
        exit 1
    fi
    
    print_header "¡REINICIO COMPLETADO!"
    echo -e "${GREEN}El sistema ha sido reiniciado exitosamente 🎉${NC}"
}

# Verificar que los scripts existan
if [ ! -f "stop-wine-traceability.sh" ] || [ ! -f "start-wine-traceability.sh" ]; then
    echo -e "${RED}Error: No se encontraron los scripts necesarios${NC}"
    echo "Asegúrate de que stop-wine-traceability.sh y start-wine-traceability.sh estén en el directorio actual"
    exit 1
fi

# Hacer scripts ejecutables
chmod +x stop-wine-traceability.sh
chmod +x start-wine-traceability.sh

# Ejecutar función principal
main "$@"