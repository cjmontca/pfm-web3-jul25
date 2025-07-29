FROM node:16-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy chaincode source
COPY . .

# Expose port for chaincode server
EXPOSE 9999

# Start chaincode server
ENV CORE_CHAINCODE_ID_NAME=wine-traceability_1.0
ENV CORE_PEER_ADDRESS=wine-traceability-chaincode:9999
CMD ["node", "index.js"]