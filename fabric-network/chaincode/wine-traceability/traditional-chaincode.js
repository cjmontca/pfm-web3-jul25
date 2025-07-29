const shim = require('fabric-shim');

// Traditional chaincode implementation using fabric-shim directly
const Chaincode = class {
    async Init(stub) {
        console.info('============= START : Initialize Ledger ===========');
        
        const wines = [
            {
                wineId: 'WINE001',
                vineyardData: {
                    vineyard: 'Bodegas Marqués de Riscal',
                    region: 'Rioja',
                    grapeVariety: 'Tempranillo',
                    harvestDate: '2023-09-15',
                    climateConditions: 'Optimal temperature, moderate rainfall',
                    sustainablePractices: 'Organic farming, biodiversity preservation',
                    certifications: ['DO Rioja', 'Organic'],
                    plotNumber: 'Plot-A1'
                },
                wineryData: {
                    fermentationProcess: 'Traditional',
                    fermentationDuration: '21 days',
                    agingType: 'French Oak',
                    agingDuration: '12 months',
                    bottlingDate: '2024-03-15',
                    productionLot: 'LOT-2024-001',
                    enologicalAnalysis: {
                        alcoholContent: '13.5%',
                        pH: '3.6',
                        totalAcidity: '5.2 g/L',
                        residualSugar: '2.1 g/L'
                    }
                },
                distributorData: null,
                consumerData: null,
                currentStatus: 'WINERY',
                currentOwner: 'WineryOrgMSP',
                qrCode: 'QR-WINE001',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                docType: 'wine'
            }
        ];

        for (let i = 0; i < wines.length; i++) {
            await stub.putState('WINE' + i.toString().padStart(3, '0'), Buffer.from(JSON.stringify(wines[i])));
            console.info('Added wine: WINE' + i.toString().padStart(3, '0'));
        }
        
        console.info('============= END : Initialize Ledger ===========');
        return shim.success();
    }

    async Invoke(stub) {
        console.info('============= START : Invoke Chaincode ===========');
        
        const ret = stub.getFunctionAndParameters();
        const method = ret.fcn;
        const args = ret.params;
        
        console.info(`Transaction function: ${method}`);
        console.info(`Transaction arguments:`, args);

        let result;
        
        try {
            switch (method) {
                case 'initLedger':
                    result = await this.initLedger(stub, args);
                    break;
                case 'createWineBatch':
                    result = await this.createWineBatch(stub, args);
                    break;
                case 'readWine':
                    result = await this.readWine(stub, args);
                    break;
                case 'updateWineStatus':
                    result = await this.updateWineStatus(stub, args);
                    break;
                case 'transferWine':
                    result = await this.transferWine(stub, args);
                    break;
                case 'queryWinesByStatus':
                    result = await this.queryWinesByStatus(stub, args);
                    break;
                case 'queryWinesByOwner':
                    result = await this.queryWinesByOwner(stub, args);
                    break;
                case 'getWineHistory':
                    result = await this.getWineHistory(stub, args);
                    break;
                default:
                    throw new Error(`Unknown function: ${method}`);
            }
            
            console.info(`Transaction ${method} completed successfully`);
            return shim.success(Buffer.from(JSON.stringify(result)));
            
        } catch (error) {
            console.error(`Transaction ${method} failed:`, error);
            return shim.error(error.message);
        }
    }

    async initLedger(stub, args) {
        console.info('============= START : Initialize Ledger ===========');
        
        const wines = [
            {
                wineId: 'WINE001',
                vineyardData: {
                    vineyard: 'Bodegas Marqués de Riscal',
                    region: 'Rioja',
                    grapeVariety: 'Tempranillo',
                    harvestDate: '2023-09-15',
                    climateConditions: 'Optimal temperature, moderate rainfall',
                    sustainablePractices: 'Organic farming, biodiversity preservation',
                    certifications: ['DO Rioja', 'Organic'],
                    plotNumber: 'Plot-A1'
                },
                wineryData: {
                    fermentationProcess: 'Traditional',
                    fermentationDuration: '21 days',
                    agingType: 'French Oak',
                    agingDuration: '12 months',
                    bottlingDate: '2024-03-15',
                    productionLot: 'LOT-2024-001',
                    enologicalAnalysis: {
                        alcoholContent: '13.5%',
                        pH: '3.6',
                        totalAcidity: '5.2 g/L',
                        residualSugar: '2.1 g/L'
                    }
                },
                distributorData: null,
                consumerData: null,
                currentStatus: 'WINERY',
                currentOwner: 'WineryOrgMSP',
                qrCode: 'QR-WINE001',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                docType: 'wine'
            }
        ];

        for (let i = 0; i < wines.length; i++) {
            const key = 'WINE' + i.toString().padStart(3, '0');
            await stub.putState(key, Buffer.from(JSON.stringify(wines[i])));
            console.info(`Wine stored with key: ${key}`);
        }
        
        console.info('============= END : Initialize Ledger ===========');
        return { message: 'Ledger initialized successfully', count: wines.length };
    }

    async createWineBatch(stub, args) {
        console.info('============= START : Create Wine Batch ===========');
        
        if (args.length !== 3) {
            throw new Error('Incorrect number of arguments. Expecting 3: wineId, vineyardData, qrCode');
        }

        const [wineId, vineyardDataStr, qrCode] = args;
        
        // Check if wine already exists
        const existingWine = await stub.getState(wineId);
        if (existingWine && existingWine.length > 0) {
            throw new Error(`Wine ${wineId} already exists`);
        }

        const vineyardData = JSON.parse(vineyardDataStr);
        
        const wine = {
            docType: 'wine',
            wineId,
            vineyardData,
            wineryData: null,
            distributorData: null,
            consumerData: null,
            currentStatus: 'VINEYARD',
            currentOwner: 'VineyardOrgMSP',
            qrCode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await stub.putState(wineId, Buffer.from(JSON.stringify(wine)));
        console.info(`Wine ${wineId} created and stored successfully`);
        console.info('============= END : Create Wine Batch ===========');
        
        return wine;
    }

    async readWine(stub, args) {
        if (args.length !== 1) {
            throw new Error('Incorrect number of arguments. Expecting 1: wineId');
        }

        const wineId = args[0];
        console.info(`Reading wine: ${wineId}`);
        
        const wineBytes = await stub.getState(wineId);
        if (!wineBytes || wineBytes.length === 0) {
            throw new Error(`Wine ${wineId} does not exist`);
        }

        const wine = JSON.parse(wineBytes.toString());
        console.info(`Wine ${wineId} retrieved successfully`);
        return wine;
    }

    async updateWineStatus(stub, args) {
        console.info('============= START : Update Wine Status ===========');
        
        if (args.length !== 4) {
            throw new Error('Incorrect number of arguments. Expecting 4: wineId, newStatus, organizationData, newOwner');
        }

        const [wineId, newStatus, organizationDataStr, newOwner] = args;
        
        const wine = await this.readWine(stub, [wineId]);
        const organizationData = JSON.parse(organizationDataStr);

        // Update wine data based on organization
        if (newOwner === 'WineryOrgMSP') {
            wine.wineryData = organizationData;
        } else if (newOwner === 'DistributorOrgMSP') {
            wine.distributorData = organizationData;
        } else if (newOwner === 'ConsumerOrgMSP') {
            wine.consumerData = organizationData;
        }

        wine.currentStatus = newStatus;
        wine.currentOwner = newOwner;
        wine.updatedAt = new Date().toISOString();

        await stub.putState(wineId, Buffer.from(JSON.stringify(wine)));
        console.info(`Wine ${wineId} status updated successfully`);
        console.info('============= END : Update Wine Status ===========');
        
        return wine;
    }

    async transferWine(stub, args) {
        console.info('============= START : Transfer Wine ===========');
        
        if (args.length !== 4) {
            throw new Error('Incorrect number of arguments. Expecting 4: wineId, toOrg, transferType, transferData');
        }

        const [wineId, toOrg, transferType, transferDataStr] = args;
        
        const wine = await this.readWine(stub, [wineId]);
        const transferData = JSON.parse(transferDataStr);

        const transfer = {
            transferId: `TRANSFER-${wineId}-${Date.now()}`,
            wineId,
            fromOrg: wine.currentOwner,
            toOrg,
            transferType,
            transferData,
            status: 'INITIATED',
            initiatedAt: new Date().toISOString(),
            completedAt: null
        };

        wine.currentStatus = 'IN_TRANSFER';
        wine.updatedAt = new Date().toISOString();

        await stub.putState(wineId, Buffer.from(JSON.stringify(wine)));
        await stub.putState(transfer.transferId, Buffer.from(JSON.stringify(transfer)));
        
        console.info(`Transfer ${transfer.transferId} initiated successfully`);
        console.info('============= END : Transfer Wine ===========');
        
        return transfer;
    }

    async queryWinesByStatus(stub, args) {
        if (args.length !== 1) {
            throw new Error('Incorrect number of arguments. Expecting 1: status');
        }

        const status = args[0];
        console.info(`Querying wines with status: ${status}`);
        
        const queryString = {
            selector: {
                docType: 'wine',
                currentStatus: status
            }
        };

        const iterator = await stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(iterator);
        
        console.info(`Found ${results.length} wines with status ${status}`);
        return results;
    }

    async queryWinesByOwner(stub, args) {
        if (args.length !== 1) {
            throw new Error('Incorrect number of arguments. Expecting 1: owner');
        }

        const owner = args[0];
        console.info(`Querying wines owned by: ${owner}`);
        
        const queryString = {
            selector: {
                docType: 'wine',
                currentOwner: owner
            }
        };

        const iterator = await stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(iterator);
        
        console.info(`Found ${results.length} wines owned by ${owner}`);
        return results;
    }

    async getWineHistory(stub, args) {
        if (args.length !== 1) {
            throw new Error('Incorrect number of arguments. Expecting 1: wineId');
        }

        const wineId = args[0];
        console.info(`Getting history for wine: ${wineId}`);
        
        const iterator = await stub.getHistoryForKey(wineId);
        const history = await this.getAllResults(iterator, true);
        
        console.info(`Retrieved ${history.length} history records for wine ${wineId}`);
        return history;
    }

    async getAllResults(iterator, isHistory = false) {
        const allResults = [];
        
        while (true) {
            const res = await iterator.next();
            
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
                
                if (isHistory) {
                    jsonRes.TxId = res.value.tx_id;
                    jsonRes.Timestamp = res.value.timestamp;
                    jsonRes.IsDelete = res.value.is_delete.toString();
                    
                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString());
                    } catch (err) {
                        jsonRes.Value = res.value.value.toString();
                    }
                } else {
                    jsonRes.Key = res.value.key;
                    
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString());
                    } catch (err) {
                        jsonRes.Record = res.value.value.toString();
                    }
                }
                
                allResults.push(jsonRes);
            }
            
            if (res.done) {
                await iterator.close();
                console.info('Iterator closed');
                return allResults;
            }
        }
    }
};

// Start the chaincode
if (require.main === module) {
    shim.start(new Chaincode());
}

module.exports = Chaincode;