# Federated Drug Trial Eligibility Screener

A privacy-preserving federated learning system for drug trial eligibility prediction using medical data, with blockchain-based audit logging.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FL Clients    │    │   FL Server     │    │   Blockchain    │
│   (Hospitals)   │◄──►│   (Coordinator) │◄──►│   (Audit Log)   │
│                 │    │                 │    │                 │
│ - Local Training│    │ - FedAvg        │    │ - Metadata Only │
│ - Privacy       │    │ - Aggregation   │    │ - Immutable     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              ▲
                              │
                       ┌─────────────────┐
                       │   FastAPI       │
                       │   REST API      │
                       │                 │
                       │ - Start FL      │
                       │ - Get Logs      │
                       │ - Get Metrics   │
                       └─────────────────┘
```

## Features

- **Federated Learning**: Privacy-preserving distributed training using Flower
- **Neural Network**: TensorFlow/Keras model for eligibility prediction
- **Blockchain Audit**: Ethereum-based immutable logging of training metadata
- **REST API**: FastAPI endpoints for system control and monitoring
- **Modular Design**: Separated concerns for maintainability

## Setup

### Prerequisites

- Python 3.8+
- Node.js & npm (for Ganache)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd federated_screener
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up blockchain (local Ganache):
```bash
npm install -g ganache
ganache
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your blockchain settings
```

### Smart Contract Deployment

#### Prerequisites

- Node.js & npm
- Truffle or Hardhat
- Ganache (for local testing)

#### Local Deployment (Ganache)

1. **Install dependencies**:
```bash
npm install -g truffle
npm install @openzeppelin/contracts
```

2. **Start Ganache**:
```bash
ganache
```

3. **Create Truffle project**:
```bash
mkdir blockchain-deployment
cd blockchain-deployment
truffle init
```

4. **Copy contract**:
```bash
cp ../blockchain/FederatedTrainingLogger.sol contracts/
```

5. **Install OpenZeppelin**:
```bash
npm install @openzeppelin/contracts
```

6. **Update truffle-config.js**:
```javascript
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "^0.8.19",
    },
  },
};
```

7. **Create migration file** (`migrations/2_deploy_contracts.js`):
```javascript
const FederatedTrainingLogger = artifacts.require("FederatedTrainingLogger");

module.exports = function(deployer) {
  deployer.deploy(FederatedTrainingLogger);
};
```

8. **Deploy contract**:
```bash
truffle migrate --network development
```

9. **Update .env**:
```bash
CONTRACT_ADDRESS=0xYourDeployedContractAddress
PRIVATE_KEY=0xYourPrivateKeyFromGanache
```

#### Sepolia Testnet Deployment

1. **Install Hardhat**:
```bash
npm install --save-dev hardhat
npx hardhat init
```

2. **Configure Hardhat** (`hardhat.config.js`):
```javascript
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

3. **Copy contract to contracts folder**:
```bash
cp ../blockchain/FederatedTrainingLogger.sol contracts/
```

4. **Create deployment script** (`scripts/deploy.js`):
```javascript
const { ethers } = require("hardhat");

async function main() {
  const FederatedTrainingLogger = await ethers.getContractFactory("FederatedTrainingLogger");
  const logger = await FederatedTrainingLogger.deploy();

  await logger.deployed();

  console.log("FederatedTrainingLogger deployed to:", logger.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

5. **Deploy to Sepolia**:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

6. **Update .env**:
```bash
BLOCKCHAIN_LOCAL=false
INFURA_PROJECT_ID=your_infura_project_id
CONTRACT_ADDRESS=0xYourSepoliaContractAddress
PRIVATE_KEY=0xYourSepoliaPrivateKey
```

#### Contract Features

- **Access Control**: Only contract owner can add training logs
- **Gas Efficient**: Batch reading functions and optimized storage
- **Event Logging**: Emits events for off-chain monitoring
- **Validation**: Input validation for data integrity
- **Public Read Access**: Anyone can read training logs for transparency

#### Security Notes

- Only the contract owner can add training logs
- All data is publicly readable for transparency
- No patient data is stored - only training metadata
- Events are emitted for off-chain monitoring

## Usage

### Start the API Server

```bash
python api/main.py
```

### API Endpoints

#### Start Federated Learning
```bash
curl -X POST "http://localhost:8000/start-fl" \
     -H "Content-Type: application/json" \
     -d '{"num_rounds": 10}'
```

#### Get Training Logs
```bash
curl "http://localhost:8000/training-logs"
```

#### Get Model Metrics
```bash
curl "http://localhost:8000/model-metrics"
```

#### Health Check
```bash
curl "http://localhost:8000/health"
```

## Configuration

### Environment Variables

- `BLOCKCHAIN_LOCAL`: Use local Ganache (true) or Sepolia testnet (false)
- `INFURA_PROJECT_ID`: Infura project ID for testnet
- `PRIVATE_KEY`: Ethereum private key for transaction signing
- `CONTRACT_ADDRESS`: Deployed smart contract address

### Switching to Testnet

1. Set `BLOCKCHAIN_LOCAL=false` in `.env`
2. Add your `INFURA_PROJECT_ID`
3. Fund your account with Sepolia ETH
4. Deploy contract to Sepolia and update `CONTRACT_ADDRESS`

## Security Considerations

- **Private Keys**: Never commit private keys to version control
- **Patient Data**: No sensitive medical data is stored on blockchain
- **Access Control**: Implement authentication for API endpoints in production
- **Rate Limiting**: Add rate limiting to prevent abuse

## Development

### Project Structure

```
federated_screener/
├── api/                    # FastAPI REST endpoints
├── blockchain/            # Ethereum interaction
├── clients/               # FL client implementations
├── fl_server/            # FL server configuration
├── model.py              # Neural network model
├── data_utils.py         # Data preprocessing
├── requirements.txt      # Python dependencies
└── .env.example          # Environment template
```

### Running Tests

```bash
# Unit tests
python -m pytest

# Integration tests
python -m pytest tests/integration/
```

## License

MIT License - see LICENSE file for details.