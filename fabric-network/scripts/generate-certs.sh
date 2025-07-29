#!/bin/bash

# ====================================================================
# Certificate Generation Script using Fabric CA
# This script replaces cryptogen with a proper Fabric CA setup
# ====================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[CERT-GEN]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check if Fabric binaries are available
check_fabric_binaries() {
    print_step "Checking Fabric binaries..."
    
    # 🔧 Configurar PATH para usar binarios locales PRIMERO
    if [ -d "bin" ]; then
        export PATH=$(pwd)/bin:$PATH
        print_info "Usando binarios locales de Fabric desde bin/"
    fi
    
    # 🔍 Verificar binarios locales específicamente
    local_fabric_ca_client="$(pwd)/bin/fabric-ca-client"
    
    if [ -f "$local_fabric_ca_client" ]; then
        print_success "✅ fabric-ca-client encontrado localmente - NO SE NECESITA DESCARGA"
    elif ! command -v fabric-ca-client &> /dev/null; then
        print_warning "fabric-ca-client not found. Installing Fabric binaries..."
        
        # 🔒 PROTEGER configtx.yaml personalizado antes de la descarga
        if [ -f "config/configtx.yaml" ]; then
            print_info "Respaldando configtx.yaml personalizado..."
            cp config/configtx.yaml config/configtx.yaml.backup.wine
        fi
        
        # Download Fabric binaries
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.9 1.5.5 -d -s
        
        # 🔒 RESTAURAR configtx.yaml personalizado después de la descarga
        if [ -f "config/configtx.yaml.backup.wine" ]; then
            print_info "Restaurando configtx.yaml personalizado..."
            mv config/configtx.yaml.backup.wine config/configtx.yaml
            print_success "✅ configtx.yaml del proyecto de vinos restaurado"
        fi
        
        # Add to PATH
        export PATH=$PATH:$PWD/bin
        
        if [ -d "$PWD/bin" ]; then
            print_success "Fabric binaries installed in $PWD/bin"
        else
            print_error "Failed to install Fabric binaries"
            exit 1
        fi
    else
        print_success "fabric-ca-client found"
    fi
    
    # Verify other required binaries
    if ! command -v configtxgen &> /dev/null; then
        if [ -f "$PWD/bin/configtxgen" ]; then
            export PATH=$PATH:$PWD/bin
            print_success "configtxgen found in $PWD/bin"
        else
            print_error "configtxgen not found"
            exit 1
        fi
    else
        print_success "configtxgen found"
    fi
    
    if ! command -v peer &> /dev/null; then
        if [ -f "$PWD/bin/peer" ]; then
            export PATH=$PATH:$PWD/bin
            print_success "peer binary found in $PWD/bin"
        else
            print_error "peer binary not found"
            exit 1
        fi
    else
        print_success "peer binary found"
    fi
}

# Main function
main() {
    print_step "Starting certificate generation with Fabric CA..."
    
    # Check if we're in the right directory
    if [ ! -f "config/configtx.yaml" ]; then
        print_error "configtx.yaml not found. Please run this script from the fabric-network directory."
        exit 1
    fi
    
    # Check and install Fabric binaries if needed
    check_fabric_binaries
    
    # Make sure fabric-ca-setup.sh is executable
    chmod +x scripts/fabric-ca-setup.sh
    
    # Run the Fabric CA setup
    print_step "Executing Fabric CA setup..."
    ./scripts/fabric-ca-setup.sh
    
    if [ $? -eq 0 ]; then
        print_success "Certificate generation completed successfully!"
        print_step "Generated organizations:"
        ls -la organizations/
    else
        print_error "Certificate generation failed!"
        exit 1
    fi
}

# Execute main function
main "$@"