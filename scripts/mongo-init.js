// MongoDB initialization script for Wine Traceability System

db = db.getSiblingDB('wine_traceability');

// Create application user
db.createUser({
  user: 'wineapp',
  pwd: 'wineapp2024',
  roles: [
    {
      role: 'readWrite',
      db: 'wine_traceability'
    }
  ]
});

// Create collections with indexes
db.createCollection('users');
db.createCollection('wines');
db.createCollection('certificates');
db.createCollection('transfers');
db.createCollection('audit_logs');

// Create indexes for performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "organization": 1 });

db.wines.createIndex({ "wineId": 1 }, { unique: true });
db.wines.createIndex({ "qrCode": 1 }, { unique: true });
db.wines.createIndex({ "currentOwner": 1 });
db.wines.createIndex({ "currentStatus": 1 });
db.wines.createIndex({ "createdAt": 1 });

db.certificates.createIndex({ "certificateId": 1 }, { unique: true });
db.certificates.createIndex({ "wineId": 1 });
db.certificates.createIndex({ "issuedBy": 1 });
db.certificates.createIndex({ "status": 1 });

db.transfers.createIndex({ "transferId": 1 }, { unique: true });
db.transfers.createIndex({ "wineId": 1 });
db.transfers.createIndex({ "fromOrganization": 1 });
db.transfers.createIndex({ "toOrganization": 1 });
db.transfers.createIndex({ "status": 1 });

db.audit_logs.createIndex({ "timestamp": 1 });
db.audit_logs.createIndex({ "userId": 1 });
db.audit_logs.createIndex({ "action": 1 });

print('MongoDB initialization completed for Wine Traceability System');