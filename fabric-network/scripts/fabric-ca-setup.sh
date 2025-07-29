#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[CA-SETUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[CA-SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[CA-WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[CA-ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[CA-INFO]${NC} $1"
}

# Function to wait for CA to be ready
wait_for_ca() {
    local ca_name=$1
    local ca_port=$2
    local max_attempts=30
    local attempt=1
    
    print_step "Waiting for $ca_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -k https://localhost:$ca_port/cainfo >/dev/null 2>&1; then
            print_success "$ca_name is ready"
            return 0
        fi
        
        print_step "Attempt $attempt/$max_attempts - $ca_name not ready yet..."
        sleep 5
        ((attempt++))
    done
    
    print_error "$ca_name failed to start after $max_attempts attempts"
    return 1
}

# Function to enroll CA admin
enroll_ca_admin() {
    local org_name=$1
    local ca_port=$2
    local org_dir=$3
    
    print_step "Enrolling CA admin for $org_name..."
    
    mkdir -p $org_dir
    
    export FABRIC_CA_CLIENT_HOME=$org_dir
    
    fabric-ca-client enroll -u https://admin:adminpw@localhost:$ca_port --caname ca-${org_name,,} --tls.certfiles $org_dir/ca-cert.pem
    
    echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-'$ca_port'-ca-'${org_name,,}'.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-'$ca_port'-ca-'${org_name,,}'.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-'$ca_port'-ca-'${org_name,,}'.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-'$ca_port'-ca-'${org_name,,}'.pem
    OrganizationalUnitIdentifier: orderer' > $org_dir/msp/config.yaml
    
    print_success "CA admin enrolled for $org_name"
}

# Function to register and enroll peer
register_enroll_peer() {
    local org_name=$1
    local ca_port=$2
    local org_dir=$3
    local peer_name=$4
    
    print_step "Registering and enrolling $peer_name for $org_name..."
    
    export FABRIC_CA_CLIENT_HOME=$org_dir
    
    fabric-ca-client register --caname ca-${org_name,,} --id.name $peer_name --id.secret peerpw --id.type peer --tls.certfiles $org_dir/ca-cert.pem
    
    fabric-ca-client enroll -u https://$peer_name:peerpw@localhost:$ca_port --caname ca-${org_name,,} -M $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/msp --tls.certfiles $org_dir/ca-cert.pem
    
    cp $org_dir/msp/config.yaml $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/msp/config.yaml
    
    # Enroll for TLS
    fabric-ca-client enroll -u https://$peer_name:peerpw@localhost:$ca_port --caname ca-${org_name,,} -M $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls --enrollment.profile tls --csr.hosts $peer_name.${org_name,,}.wine-traceability.com --csr.hosts localhost --tls.certfiles $org_dir/ca-cert.pem
    
    # Copy TLS certificates
    cp $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls/tlscacerts/* $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls/ca.crt
    cp $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls/signcerts/* $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls/server.crt
    cp $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls/keystore/* $org_dir/peers/$peer_name.${org_name,,}.wine-traceability.com/tls/server.key
    
    print_success "$peer_name registered and enrolled for $org_name"
}

# Function to register and enroll user
register_enroll_user() {
    local org_name=$1
    local ca_port=$2
    local org_dir=$3
    local user_name=$4
    
    print_step "Registering and enrolling $user_name for $org_name..."
    
    export FABRIC_CA_CLIENT_HOME=$org_dir
    
    fabric-ca-client register --caname ca-${org_name,,} --id.name $user_name --id.secret userpw --id.type client --tls.certfiles $org_dir/ca-cert.pem
    
    fabric-ca-client enroll -u https://$user_name:userpw@localhost:$ca_port --caname ca-${org_name,,} -M $org_dir/users/$user_name@${org_name,,}.wine-traceability.com/msp --tls.certfiles $org_dir/ca-cert.pem
    
    cp $org_dir/msp/config.yaml $org_dir/users/$user_name@${org_name,,}.wine-traceability.com/msp/config.yaml
    
    print_success "$user_name registered and enrolled for $org_name"
}

# Function to register and enroll admin
register_enroll_admin() {
    local org_name=$1
    local ca_port=$2
    local org_dir=$3
    
    print_step "Registering and enrolling Admin for $org_name..."
    
    export FABRIC_CA_CLIENT_HOME=$org_dir
    
    fabric-ca-client register --caname ca-${org_name,,} --id.name ${org_name,,}admin --id.secret adminpw --id.type admin --tls.certfiles $org_dir/ca-cert.pem
    
    fabric-ca-client enroll -u https://${org_name,,}admin:adminpw@localhost:$ca_port --caname ca-${org_name,,} -M $org_dir/users/Admin@${org_name,,}.wine-traceability.com/msp --tls.certfiles $org_dir/ca-cert.pem
    
    cp $org_dir/msp/config.yaml $org_dir/users/Admin@${org_name,,}.wine-traceability.com/msp/config.yaml
    
    print_success "Admin registered and enrolled for $org_name"
}

# Function to setup organization
setup_organization() {
    local org_name=$1
    local ca_port=$2
    
    print_step "Setting up $org_name organization..."
    
    local org_dir=${PWD}/organizations/${org_name,,}-org
    mkdir -p $org_dir
    
    # Get CA certificate
    docker cp ca.${org_name,,}.wine-traceability.com:/etc/hyperledger/fabric-ca-server/ca-cert.pem $org_dir/ca-cert.pem
    
    # Enroll CA admin
    enroll_ca_admin $org_name $ca_port $org_dir
    
    # Register and enroll peers
    register_enroll_peer $org_name $ca_port $org_dir "peer0"
    register_enroll_peer $org_name $ca_port $org_dir "peer1"
    
    # Register and enroll users
    register_enroll_user $org_name $ca_port $org_dir "user1"
    register_enroll_admin $org_name $ca_port $org_dir
    
    print_success "$org_name organization setup completed"
}

# Function to setup orderer organization
setup_orderer_organization() {
    print_step "Setting up Orderer organization..."
    
    local org_dir=${PWD}/organizations/orderer-org
    mkdir -p $org_dir
    
    # Get CA certificate
    docker cp ca.orderer.wine-traceability.com:/etc/hyperledger/fabric-ca-server/ca-cert.pem $org_dir/ca-cert.pem
    
    export FABRIC_CA_CLIENT_HOME=$org_dir
    
    # Enroll CA admin
    fabric-ca-client enroll -u https://admin:adminpw@localhost:11054 --caname ca-orderer --tls.certfiles $org_dir/ca-cert.pem
    
    echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer' > $org_dir/msp/config.yaml
    
    # Register and enroll orderer
    fabric-ca-client register --caname ca-orderer --id.name orderer --id.secret ordererpw --id.type orderer --tls.certfiles $org_dir/ca-cert.pem
    
    fabric-ca-client enroll -u https://orderer:ordererpw@localhost:11054 --caname ca-orderer -M $org_dir/orderers/orderer.wine-traceability.com/msp --tls.certfiles $org_dir/ca-cert.pem
    
    cp $org_dir/msp/config.yaml $org_dir/orderers/orderer.wine-traceability.com/msp/config.yaml
    
    # Enroll orderer for TLS
    fabric-ca-client enroll -u https://orderer:ordererpw@localhost:11054 --caname ca-orderer -M $org_dir/orderers/orderer.wine-traceability.com/tls --enrollment.profile tls --csr.hosts orderer.wine-traceability.com --csr.hosts localhost --tls.certfiles $org_dir/ca-cert.pem
    
    # Copy TLS certificates
    cp $org_dir/orderers/orderer.wine-traceability.com/tls/tlscacerts/* $org_dir/orderers/orderer.wine-traceability.com/tls/ca.crt
    cp $org_dir/orderers/orderer.wine-traceability.com/tls/signcerts/* $org_dir/orderers/orderer.wine-traceability.com/tls/server.crt
    cp $org_dir/orderers/orderer.wine-traceability.com/tls/keystore/* $org_dir/orderers/orderer.wine-traceability.com/tls/server.key
    
    # Create MSP directories
    mkdir -p $org_dir/orderers/orderer.wine-traceability.com/msp/tlscacerts
    cp $org_dir/orderers/orderer.wine-traceability.com/tls/tlscacerts/* $org_dir/orderers/orderer.wine-traceability.com/msp/tlscacerts/tlsca.orderer.wine-traceability.com-cert.pem
    
    # Register and enroll admin
    fabric-ca-client register --caname ca-orderer --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin --tls.certfiles $org_dir/ca-cert.pem
    
    fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:11054 --caname ca-orderer -M $org_dir/users/Admin@orderer.wine-traceability.com/msp --tls.certfiles $org_dir/ca-cert.pem
    
    cp $org_dir/msp/config.yaml $org_dir/users/Admin@orderer.wine-traceability.com/msp/config.yaml
    
    print_success "Orderer organization setup completed"
}

# Main function
main() {
    print_step "Starting Fabric CA setup..."
    
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
        print_error "fabric-ca-client is not installed or not in PATH"
        print_step "Installing fabric-ca-client..."
        
        # 🔒 PROTEGER configtx.yaml personalizado antes de la descarga
        if [ -f "config/configtx.yaml" ]; then
            print_info "Respaldando configtx.yaml personalizado..."
            cp config/configtx.yaml config/configtx.yaml.backup.wine
        fi
        
        # Download and install fabric-ca-client
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.9 1.5.5 -s -d
        export PATH=$PATH:$PWD/bin
        
        # 🔒 RESTAURAR configtx.yaml personalizado después de la descarga
        if [ -f "config/configtx.yaml.backup.wine" ]; then
            print_info "Restaurando configtx.yaml personalizado..."
            mv config/configtx.yaml.backup.wine config/configtx.yaml
            print_success "✅ configtx.yaml del proyecto de vinos restaurado"
        fi
        
        if ! command -v fabric-ca-client &> /dev/null; then
            print_error "Failed to install fabric-ca-client"
            exit 1
        fi
        
        print_success "fabric-ca-client installed successfully"
    fi
    
    # Start CAs
    print_step "Starting Certificate Authorities..."
    docker-compose -f docker/docker-compose-ca.yml up -d
    
    # Wait for CAs to be ready
    wait_for_ca "Vineyard CA" 7054
    wait_for_ca "Winery CA" 8054
    wait_for_ca "Distributor CA" 9054
    wait_for_ca "Consumer CA" 10054
    wait_for_ca "Orderer CA" 11054
    
    # Setup organizations
    setup_organization "Vineyard" 7054
    setup_organization "Winery" 8054
    setup_organization "Distributor" 9054
    setup_organization "Consumer" 10054
    setup_orderer_organization
    
    print_success "Fabric CA setup completed successfully!"
}

# Execute main function
main "$@"