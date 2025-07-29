#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
CHANNEL_NAME="wine-traceability-channel"
ORDERER_CA=${PWD}/organizations/orderer-org/orderers/orderer.wine-traceability.com/msp/tlscacerts/tlsca.orderer.wine-traceability.com-cert.pem
DELAY=3
MAX_RETRY=5

# Chaincode configurations
WINE_CC_NAME="wine-traceability"
WINE_CC_VERSION="1.0"
WINE_CC_SEQUENCE=1
WINE_CC_INIT_FCN="initLedger"
WINE_CC_END_POLICY="OR('VineyardOrgMSP.peer','WineryOrgMSP.peer','DistributorOrgMSP.peer','ConsumerOrgMSP.peer')"
WINE_CC_COLL_CONFIG=""

CERT_CC_NAME="quality-certification"
CERT_CC_VERSION="1.0"
CERT_CC_SEQUENCE=1
CERT_CC_INIT_FCN="initLedger"
CERT_CC_END_POLICY="AND('VineyardOrgMSP.peer','WineryOrgMSP.peer')"
CERT_CC_COLL_CONFIG=""

TRANSFER_CC_NAME="supply-chain-transfer"
TRANSFER_CC_VERSION="1.0"
TRANSFER_CC_SEQUENCE=1
TRANSFER_CC_INIT_FCN="initLedger"
TRANSFER_CC_END_POLICY="AND('VineyardOrgMSP.peer','WineryOrgMSP.peer','DistributorOrgMSP.peer','ConsumerOrgMSP.peer')"
TRANSFER_CC_COLL_CONFIG=""

print_green "============= Deploying Chaincode ============="

# Function to set environment variables for each organization
setGlobals() {
    local USING_ORG=""
    if [ -z "$OVERRIDE_ORG" ]; then
        USING_ORG=$1
    else
        USING_ORG="${OVERRIDE_ORG}"
    fi
    
    case $USING_ORG in
        1)
            export CORE_PEER_LOCALMSPID="VineyardOrgMSP"
            export CORE_PEER_TLS_ENABLED=false
            export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/vineyard-org/users/Admin@vineyard.wine-traceability.com/msp
            export CORE_PEER_ADDRESS=localhost:7051
            ;;
        2)
            export CORE_PEER_LOCALMSPID="WineryOrgMSP"
            export CORE_PEER_TLS_ENABLED=false
            export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/winery-org/users/Admin@winery.wine-traceability.com/msp
            export CORE_PEER_ADDRESS=localhost:8051
            ;;
        3)
            export CORE_PEER_LOCALMSPID="DistributorOrgMSP"
            export CORE_PEER_TLS_ENABLED=false
            export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/distributor-org/users/Admin@distributor.wine-traceability.com/msp
            export CORE_PEER_ADDRESS=localhost:9051
            ;;
        4)
            export CORE_PEER_LOCALMSPID="ConsumerOrgMSP"
            export CORE_PEER_TLS_ENABLED=false
            export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/consumer-org/users/Admin@consumer.wine-traceability.com/msp
            export CORE_PEER_ADDRESS=localhost:10051
            ;;
        *)
            print_red "Unknown organization: $USING_ORG"
            exit 1
            ;;
    esac
    
    if [ "$VERBOSE" == "true" ]; then
        env | grep CORE
    fi
}

# Function to verify result of command
verifyResult() {
    if [ $1 -ne 0 ]; then
        print_red "!!!!!!!!!!!!!!! $2 !!!!!!!!!!!!!!!!"
        print_red "========= ERROR !!! FAILED to execute End-2-End Scenario ==========="
        exit 1
    fi
}

# Function to package chaincode
packageChaincode() {
    local CC_NAME=$1
    local CC_SRC_PATH=$2
    local CC_RUNTIME_LANGUAGE=$3
    local CC_VERSION=$4
    
    print_yellow "Packaging chaincode $CC_NAME..."
    
    setGlobals 1
    
    peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CC_NAME}_${CC_VERSION} >&log.txt
    res=$?
    verifyResult $res "Chaincode packaging has failed"
    print_green "Chaincode $CC_NAME packaged successfully"
}

# Function to install chaincode on peer
installChaincode() {
    local ORG=$1
    local CC_NAME=$2
    
    setGlobals $ORG
    
    peer lifecycle chaincode install ${CC_NAME}.tar.gz >&log.txt
    res=$?
    verifyResult $res "Chaincode installation on peer0.org${ORG} has failed"
    print_green "Chaincode $CC_NAME installed on peer0.org${ORG}"
}

# Function to query installed chaincode
queryInstalled() {
    local ORG=$1
    setGlobals $ORG
    peer lifecycle chaincode queryinstalled >&log.txt
    res=$?
    verifyResult $res "Query installed on peer0.org${ORG} has failed"
}

# Function to approve chaincode definition for organization
approveForMyOrg() {
    local ORG=$1
    local CC_NAME=$2
    local CC_VERSION=$3
    local CC_SEQUENCE=$4
    local CC_END_POLICY=$5
    local CC_COLL_CONFIG=$6
    local CC_INIT_FCN=$7
    
    setGlobals $ORG
    
    # Extract package ID
    peer lifecycle chaincode queryinstalled --output json | jq -r ".installed_chaincodes[] | select(.label==\"${CC_NAME}_${CC_VERSION}\") | .package_id" > package_id.txt
    PACKAGE_ID=$(cat package_id.txt)
    
    print_yellow "Approving chaincode definition for Org${ORG}..."
    
    if [ "$CC_INIT_FCN" = "NA" ]; then
        peer lifecycle chaincode approveformyorg -o localhost:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --signature-policy "$CC_END_POLICY" >&log.txt
    else
        peer lifecycle chaincode approveformyorg -o localhost:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --init-required --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --signature-policy "$CC_END_POLICY" >&log.txt
    fi
    res=$?
    verifyResult $res "Chaincode definition approval on peer0.org${ORG} has failed"
    print_green "Chaincode definition approved on peer0.org${ORG}"
}

# Function to check commit readiness
checkCommitReadiness() {
    local CC_NAME=$1
    local CC_VERSION=$2
    local CC_SEQUENCE=$3
    local CC_END_POLICY=$4
    local CC_COLL_CONFIG=$5
    local CC_INIT_FCN=$6
    
    print_yellow "Checking the commit readiness of the chaincode definition..."
    setGlobals 1
    
    if [ "$CC_INIT_FCN" = "NA" ]; then
        peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --output json
    else
        peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --init-required --output json
    fi
    res=$?
    verifyResult $res "Checking commit readiness has failed"
}

# Function to commit chaincode definition
commitChaincodeDefinition() {
    local CC_NAME=$1
    local CC_VERSION=$2
    local CC_SEQUENCE=$3
    local CC_END_POLICY=$4
    local CC_COLL_CONFIG=$5
    local CC_INIT_FCN=$6
    
    print_yellow "Committing chaincode definition..."
    
    # Collect peer addresses for all organizations (insecure mode)
    PEER_CONN_PARMS=""
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:7051"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:8051"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:9051"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:10051"
    
    if [ "$CC_INIT_FCN" = "NA" ]; then
        peer lifecycle chaincode commit -o localhost:7050 --channelID $CHANNEL_NAME --name $CC_NAME $PEER_CONN_PARMS --version $CC_VERSION --sequence $CC_SEQUENCE --signature-policy "$CC_END_POLICY" >&log.txt
    else
        peer lifecycle chaincode commit -o localhost:7050 --channelID $CHANNEL_NAME --name $CC_NAME $PEER_CONN_PARMS --version $CC_VERSION --sequence $CC_SEQUENCE --init-required --signature-policy "$CC_END_POLICY" >&log.txt
    fi
    res=$?
    verifyResult $res "Chaincode definition commit failed"
    print_green "Chaincode definition committed on channel '$CHANNEL_NAME'"
}

# Function to query committed chaincode
queryCommitted() {
    local CC_NAME=$1
    setGlobals 1
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME --output json
}

# Function to invoke chaincode init
chaincodeInvokeInit() {
    local CC_NAME=$1
    local CC_INIT_FCN=$2
    
    print_yellow "Invoking chaincode init function..."
    
    # Collect peer addresses for all organizations (insecure mode)
    PEER_CONN_PARMS=""
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:7051"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:8051"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:9051"
    PEER_CONN_PARMS="$PEER_CONN_PARMS --peerAddresses localhost:10051"
    
    setGlobals 1
    
    if [ "$CC_INIT_FCN" != "NA" ]; then
        peer chaincode invoke -o localhost:7050 -C $CHANNEL_NAME -n $CC_NAME $PEER_CONN_PARMS --isInit -c '{"function":"'$CC_INIT_FCN'","Args":[]}' >&log.txt
        res=$?
        verifyResult $res "Invoke execution on $PEERS failed"
        print_green "Invoke transaction successful on $PEERS on channel '$CHANNEL_NAME'"
    fi
}

# Function to deploy a single chaincode
deployChaincode() {
    local CC_NAME=$1
    local CC_SRC_PATH=$2
    local CC_RUNTIME_LANGUAGE=$3
    local CC_VERSION=$4
    local CC_SEQUENCE=$5
    local CC_INIT_FCN=$6
    local CC_END_POLICY=$7
    local CC_COLL_CONFIG=$8
    
    print_green "Deploying chaincode: $CC_NAME"
    
    # Package chaincode
    packageChaincode $CC_NAME $CC_SRC_PATH $CC_RUNTIME_LANGUAGE $CC_VERSION
    
    # Install chaincode on all peers
    installChaincode 1 $CC_NAME
    installChaincode 2 $CC_NAME
    installChaincode 3 $CC_NAME
    installChaincode 4 $CC_NAME
    
    # Approve chaincode definition for all organizations
    approveForMyOrg 1 $CC_NAME $CC_VERSION $CC_SEQUENCE "$CC_END_POLICY" "$CC_COLL_CONFIG" $CC_INIT_FCN
    approveForMyOrg 2 $CC_NAME $CC_VERSION $CC_SEQUENCE "$CC_END_POLICY" "$CC_COLL_CONFIG" $CC_INIT_FCN
    approveForMyOrg 3 $CC_NAME $CC_VERSION $CC_SEQUENCE "$CC_END_POLICY" "$CC_COLL_CONFIG" $CC_INIT_FCN
    approveForMyOrg 4 $CC_NAME $CC_VERSION $CC_SEQUENCE "$CC_END_POLICY" "$CC_COLL_CONFIG" $CC_INIT_FCN
    
    # Check commit readiness
    checkCommitReadiness $CC_NAME $CC_VERSION $CC_SEQUENCE "$CC_END_POLICY" "$CC_COLL_CONFIG" $CC_INIT_FCN
    
    # Commit chaincode definition
    commitChaincodeDefinition $CC_NAME $CC_VERSION $CC_SEQUENCE "$CC_END_POLICY" "$CC_COLL_CONFIG" $CC_INIT_FCN
    
    # Query committed chaincode
    queryCommitted $CC_NAME
    
    # Invoke init function
    chaincodeInvokeInit $CC_NAME $CC_INIT_FCN
    
    print_green "Chaincode $CC_NAME deployed successfully!"
}

# Main execution
export FABRIC_CFG_PATH=${PWD}/config
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID="VineyardOrgMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/vineyard-org/peers/peer0.vineyard.wine-traceability.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/vineyard-org/users/Admin@vineyard.wine-traceability.com/msp
export CORE_PEER_ADDRESS=localhost:7051

case "$1" in
    "wine"|"all")
        print_green "Deploying Wine Traceability Chaincode..."
        deployChaincode $WINE_CC_NAME "./chaincode/wine-traceability" "node" $WINE_CC_VERSION $WINE_CC_SEQUENCE $WINE_CC_INIT_FCN "$WINE_CC_END_POLICY" "$WINE_CC_COLL_CONFIG"
        if [ "$1" != "all" ]; then exit 0; fi
        ;;
esac

case "$1" in
    "cert"|"all")
        print_green "Deploying Quality Certification Chaincode..."
        deployChaincode $CERT_CC_NAME "./chaincode/quality-certification" "node" $CERT_CC_VERSION $CERT_CC_SEQUENCE $CERT_CC_INIT_FCN "$CERT_CC_END_POLICY" "$CERT_CC_COLL_CONFIG"
        if [ "$1" != "all" ]; then exit 0; fi
        ;;
esac

case "$1" in
    "transfer"|"all")
        print_green "Deploying Supply Chain Transfer Chaincode..."
        deployChaincode $TRANSFER_CC_NAME "./chaincode/supply-chain-transfer" "node" $TRANSFER_CC_VERSION $TRANSFER_CC_SEQUENCE $TRANSFER_CC_INIT_FCN "$TRANSFER_CC_END_POLICY" "$TRANSFER_CC_COLL_CONFIG"
        if [ "$1" != "all" ]; then exit 0; fi
        ;;
esac

if [ "$1" != "wine" ] && [ "$1" != "cert" ] && [ "$1" != "transfer" ] && [ "$1" != "all" ]; then
    echo "Usage: $0 {wine|cert|transfer|all}"
    echo "  wine     - Deploy wine traceability chaincode"
    echo "  cert     - Deploy quality certification chaincode"
    echo "  transfer - Deploy supply chain transfer chaincode"
    echo "  all      - Deploy all chaincodes"
    exit 1
fi

print_green "All specified chaincodes deployed successfully!"