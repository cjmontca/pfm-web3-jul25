const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class FabricClient {
    constructor() {
        this.gateway = null;
        this.wallet = null;
        this.network = null;
        this.contracts = {};
        this.initialized = false;
    }

    async initializeNetwork() {
        try {
            logger.info('Initializing Fabric network connection...');
            
            const fabricNetworkPath = path.resolve(__dirname, '../../../fabric-network');
            const channelName = process.env.CHANNEL_NAME || 'wine-traceability';
            
            const walletPath = path.join(__dirname, 'wallet');
            this.wallet = await Wallets.newFileSystemWallet(walletPath);
            
            await this.enrollAdmin();
            
            this.gateway = new Gateway();
            
            const connectionProfile = this.buildConnectionProfile(fabricNetworkPath);
            
            const connectionOptions = {
                wallet: this.wallet,
                identity: 'admin',
                discovery: { enabled: false, asLocalhost: true },
                eventHandlerOptions: {
                    commitTimeout: 100,
                    strategy: null
                }
            };
            
            await this.gateway.connect(connectionProfile, connectionOptions);
            
            this.network = await this.gateway.getNetwork(channelName);
            
            // Load wine traceability contract
            this.contracts = {
                wine: this.network.getContract('wine-traceability')
            };
            
            this.initialized = true;
            logger.info('Wine traceability contract loaded successfully');
            logger.info('Fabric network initialized successfully');
            
        } catch (error) {
            logger.error('Failed to initialize Fabric network:', error);
            throw new Error(`Blockchain network initialization failed: ${error.message}`);
        }
    }

    buildConnectionProfile(fabricNetworkPath) {
        const orgConfigPath = path.join(fabricNetworkPath, 'organizations', 'vineyard-org');
        const peerCertPath = path.join(orgConfigPath, 'peers', 'peer0.vineyard.wine-traceability.com', 'tls', 'ca.crt');
        const ordererCertPath = path.join(fabricNetworkPath, 'organizations', 'ordererOrganizations', 'wine-traceability.com', 'orderers', 'orderer.wine-traceability.com', 'msp', 'tlscacerts', 'tlsca.wine-traceability.com-cert.pem');

        const connectionProfile = {
            name: 'wine-traceability-network',
            version: '1.0.0',
            client: {
                organization: 'vineyard-org',
                connection: {
                    timeout: {
                        peer: {
                            endorser: '300'
                        }
                    }
                }
            },
            organizations: {
                'vineyard-org': {
                    mspid: 'VineyardOrgMSP',
                    peers: ['peer0.vineyard.wine-traceability.com'],
                    certificateAuthorities: ['ca.vineyard.wine-traceability.com']
                }
            },
            peers: {
                'peer0.vineyard.wine-traceability.com': {
                    url: 'grpc://localhost:7051',
                    tlsCACerts: {
                        pem: fs.existsSync(peerCertPath) ? fs.readFileSync(peerCertPath, 'utf8') : ''
                    },
                    grpcOptions: {
                        'ssl-target-name-override': 'peer0.vineyard.wine-traceability.com',
                        'hostnameOverride': 'peer0.vineyard.wine-traceability.com'
                    }
                }
            },
            orderers: {
                'orderer.wine-traceability.com': {
                    url: 'grpc://localhost:7050',
                    tlsCACerts: {
                        pem: fs.existsSync(ordererCertPath) ? fs.readFileSync(ordererCertPath, 'utf8') : ''
                    },
                    grpcOptions: {
                        'ssl-target-name-override': 'orderer.wine-traceability.com',
                        'hostnameOverride': 'orderer.wine-traceability.com'
                    }
                }
            },
            channels: {
                'wine-traceability': {
                    orderers: ['orderer.wine-traceability.com'],
                    peers: {
                        'peer0.vineyard.wine-traceability.com': {
                            endorsingPeer: true,
                            chaincodeQuery: true,
                            ledgerQuery: true,
                            eventSource: true
                        }
                    }
                }
            }
        };

        return connectionProfile;
    }

    async enrollAdmin() {
        try {
            const adminExists = await this.wallet.get('admin');
            if (adminExists) {
                logger.info('Admin identity already exists in wallet');
                return;
            }

            logger.info('Enrolling admin user...');
            
            const fabricNetworkPath = path.resolve(__dirname, '../../../fabric-network');
            const orgConfigPath = path.join(fabricNetworkPath, 'organizations', 'vineyard-org');
            
            const adminCertPath = path.join(orgConfigPath, 'users', 'Admin@vineyard.wine-traceability.com', 'msp', 'signcerts');
            const adminKeyPath = path.join(orgConfigPath, 'users', 'Admin@vineyard.wine-traceability.com', 'msp', 'keystore');

            if (!fs.existsSync(adminCertPath) || !fs.existsSync(adminKeyPath)) {
                throw new Error('Admin certificates not found');
            }

            const certFiles = fs.readdirSync(adminCertPath);
            const keyFiles = fs.readdirSync(adminKeyPath);
            
            if (certFiles.length === 0 || keyFiles.length === 0) {
                throw new Error('Admin certificate or key files are missing');
            }

            const cert = fs.readFileSync(path.join(adminCertPath, certFiles[0]), 'utf8');
            const key = fs.readFileSync(path.join(adminKeyPath, keyFiles[0]), 'utf8');

            const identity = {
                credentials: {
                    certificate: cert,
                    privateKey: key,
                },
                mspId: 'VineyardOrgMSP',
                type: 'X.509',
            };

            await this.wallet.put('admin', identity);
            logger.info('Admin identity imported to wallet successfully');

        } catch (error) {
            logger.error('Failed to enroll admin:', error);
            throw new Error(`Admin enrollment failed: ${error.message}`);
        }
    }

    async invokeChaincode(contractName, functionName, args = [], orgMSP = 'VineyardOrgMSP') {
        if (!this.initialized) {
            throw new Error('Blockchain network not initialized. Cannot invoke chaincode.');
        }

        try {
            const contract = this.contracts[contractName];
            if (!contract) {
                throw new Error(`Contract ${contractName} not found. Available contracts: ${Object.keys(this.contracts).join(', ')}`);
            }

            logger.info(`Invoking ${contractName}.${functionName} with args:`, args);
            
            const result = await contract.submitTransaction(functionName, ...args);
            const response = result.toString();
            
            logger.info(`Transaction ${functionName} submitted successfully`);
            return response ? JSON.parse(response) : null;

        } catch (error) {
            logger.error(`Failed to invoke ${contractName}.${functionName}:`, error);
            throw new Error(`Blockchain transaction failed: ${error.message}`);
        }
    }

    async queryChaincode(contractName, functionName, args = []) {
        if (!this.initialized) {
            throw new Error('Blockchain network not initialized. Cannot query chaincode.');
        }

        try {
            const contract = this.contracts[contractName];
            if (!contract) {
                throw new Error(`Contract ${contractName} not found. Available contracts: ${Object.keys(this.contracts).join(', ')}`);
            }

            logger.info(`Querying ${contractName}.${functionName} with args:`, args);
            
            const result = await contract.evaluateTransaction(functionName, ...args);
            const response = result.toString();
            
            logger.info(`Query ${functionName} executed successfully`);
            return response ? JSON.parse(response) : null;

        } catch (error) {
            logger.error(`Failed to query ${contractName}.${functionName}:`, error);
            throw new Error(`Blockchain query failed: ${error.message}`);
        }
    }

    async getNetworkStatus() {
        if (!this.initialized) {
            return { 
                status: 'disconnected', 
                message: 'Blockchain network not initialized',
                timestamp: new Date().toISOString()
            };
        }

        try {
            const channel = this.network.getChannel();
            
            return {
                status: 'connected',
                channel: channel.getName(),
                contracts: Object.keys(this.contracts),
                mode: 'blockchain-only',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Error getting network status:', error);
            return {
                status: 'error',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async disconnect() {
        try {
            if (this.gateway) {
                await this.gateway.disconnect();
                this.gateway = null;
                this.network = null;
                this.contracts = {};
                this.initialized = false;
                logger.info('Fabric gateway disconnected');
            }
        } catch (error) {
            logger.error('Error disconnecting gateway:', error);
        }
    }
}

// Export singleton instance
const fabricClient = new FabricClient();
module.exports = fabricClient;