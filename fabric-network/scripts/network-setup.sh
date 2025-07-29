#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
print_green() {
    echo -e "${GREEN}$1${NC}"
}

print_yellow() {
    echo -e "${YELLOW}$1${NC}"
}

print_red() {
    echo -e "${RED}$1${NC}"
}

# Configuration
FABRIC_CFG_PATH=$(pwd)/config
export PATH=${PWD}/bin:$PATH
CHANNEL_NAME="wine-traceability-channel"
ORDERER_CA=${PWD}/organizations/orderer-org/orderers/orderer.wine-traceability.com/msp/tlscacerts/tlsca.orderer.wine-traceability.com-cert.pem
ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/orderer-org/orderers/orderer.wine-traceability.com/tls/server.crt
ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/orderer-org/orderers/orderer.wine-traceability.com/tls/server.key

print_green "============= Wine Traceability Network Setup ============="

# Function to cleanup previous network
cleanup() {
    print_yellow "Cleaning up previous network..."
    
    # Stop and remove containers
    docker-compose -f docker/docker-compose-4orgs-optimized.yaml down --volumes --remove-orphans 2>/dev/null || true
    docker-compose -f docker/docker-compose-4orgs.yaml down --volumes --remove-orphans
    docker-compose -f docker/docker-compose-ca.yml down --volumes --remove-orphans
    
    # Remove generated artifacts
    rm -rf organizations/orderer-org
    rm -rf organizations/vineyard-org
    rm -rf organizations/winery-org
    rm -rf organizations/distributor-org
    rm -rf organizations/consumer-org
    rm -rf channel-artifacts
    
    # Remove docker volumes
    docker volume prune -f
    
    print_green "Cleanup completed!"
}

# Function to generate crypto materials using Fabric CA
generate_crypto() {
    print_yellow "Setting up Fabric CA and generating crypto materials..."
    
    mkdir -p channel-artifacts
    
    # Setup Fabric CA and generate crypto materials
    ./scripts/fabric-ca-setup.sh
    
    if [ $? -ne 0 ]; then
        print_red "Failed to setup Fabric CA and generate crypto materials"
        exit 1
    fi
    
    print_green "Fabric CA setup and crypto materials generated successfully!"
}

# Function to generate channel configuration (Fabric 2.4+)
generate_genesis() {
    print_yellow "Generating channel configuration for Fabric 2.4+..."
    
    export FABRIC_CFG_PATH=${PWD}/config
    
    # Create channel-artifacts directory
    mkdir -p ./channel-artifacts
    
    # Note: Genesis block not needed for Fabric 2.4+ with BOOTSTRAPMETHOD=none
    
    # Generate channel configuration transaction
    configtxgen -profile WineTraceabilityChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
    
    if [ $? -ne 0 ]; then
        print_red "Failed to generate channel configuration transaction"
        exit 1
    fi
    
    # Note: Anchor peer transactions not needed in Fabric 2.4+ with channel participation API
    # Anchor peers are automatically configured from the channel configuration block
    
    print_green "Genesis block and channel configuration generated successfully!"
}

# Function to start the network
start_network() {
    print_yellow "Starting the Hyperledger Fabric network..."
    
    # Start the network (peers and orderer) - Using optimized config with 1 peer per org
    docker-compose -f docker/docker-compose-4orgs-optimized.yaml up -d
    
    if [ $? -ne 0 ]; then
        print_red "Failed to start the network"
        exit 1
    fi
    
    # Wait for containers to be ready
    print_yellow "Waiting for containers to be ready..."
    sleep 30
    
    print_green "Network started successfully!"
}

# Function to create and join channel
create_channel() {
    print_yellow "Creating channel using osnadmin (Fabric 2.4+)..."
    
    # Create application channel genesis block with both Orderer and Application sections
    configtxgen -profile WineTraceabilityChannelBlock -channelID $CHANNEL_NAME -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block
    
    if [ $? -ne 0 ]; then
        print_red "Failed to generate channel genesis block"
        exit 1
    fi
    
    # Join channel to orderer using osnadmin (HTTP since TLS is disabled for admin interface)
    osnadmin channel join --channelID $CHANNEL_NAME --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:7053
    
    if [ $? -ne 0 ]; then
        print_red "Failed to join channel to orderer using osnadmin"
        exit 1
    fi
    
    print_green "Channel joined to orderer successfully!"
    
    # Set environment for peer operations
    export CORE_PEER_TLS_ENABLED=false
    export CORE_PEER_LOCALMSPID="VineyardOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/vineyard-org/peers/peer0.vineyard.wine-traceability.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/vineyard-org/users/Admin@vineyard.wine-traceability.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    
    # Join vineyard peer to channel (optimized: only peer0)
    peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
    
    # Join winery peer to channel (optimized: only peer0)
    export CORE_PEER_LOCALMSPID="WineryOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/winery-org/peers/peer0.winery.wine-traceability.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/winery-org/users/Admin@winery.wine-traceability.com/msp
    export CORE_PEER_ADDRESS=localhost:8051
    peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
    
    # Join distributor peer to channel (optimized: only peer0)
    export CORE_PEER_LOCALMSPID="DistributorOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/distributor-org/peers/peer0.distributor.wine-traceability.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/distributor-org/users/Admin@distributor.wine-traceability.com/msp
    export CORE_PEER_ADDRESS=localhost:9051
    peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
    
    # Join consumer peer to channel (optimized: only peer0)
    export CORE_PEER_LOCALMSPID="ConsumerOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/consumer-org/peers/peer0.consumer.wine-traceability.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/consumer-org/users/Admin@consumer.wine-traceability.com/msp
    export CORE_PEER_ADDRESS=localhost:9450
    peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
    
    print_green "Channel created and all peers joined successfully!"
}

# Function to update anchor peers
update_anchor_peers() {
    print_yellow "Anchor peers are automatically configured in Fabric 2.4+ (defined in configtx.yaml)..."
    
    # In Fabric 2.4+ with channel participation API, anchor peers are automatically
    # configured from the channel configuration block when defined in configtx.yaml
    # No manual update is needed
    
    print_green "Anchor peers configured automatically from channel configuration!"
}

# Main execution
case "$1" in
    "up")
        cleanup
        generate_crypto
        generate_genesis
        start_network
        create_channel
        update_anchor_peers
        print_green "Wine Traceability Network is ready!"
        ;;
    "down")
        cleanup
        print_green "Network stopped and cleaned up!"
        ;;
    "restart")
        cleanup
        generate_crypto
        generate_genesis
        start_network
        create_channel
        update_anchor_peers
        print_green "Wine Traceability Network restarted!"
        ;;
    *)
        echo "Usage: $0 {up|down|restart}"
        echo "  up      - Start the network"
        echo "  down    - Stop and clean up the network"
        echo "  restart - Restart the network"
        exit 1
        ;;
esac