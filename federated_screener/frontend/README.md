# Federated Drug Trial Eligibility Screener - Frontend Dashboard

A React-based dashboard for monitoring federated learning training and blockchain audit logs for drug trial eligibility screening.

## Features

- **Training Controls**: Start federated learning training with configurable parameters
- **Real-time Monitoring**: Live charts showing training accuracy and loss over rounds
- **Blockchain Audit Log**: Immutable record of all training rounds stored on Ethereum
- **Responsive Design**: Modern UI built with Tailwind CSS

## Tech Stack

- **React 18** - Frontend framework
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart library for data visualization
- **Axios** - HTTP client for API calls
- **Ethers.js** - Ethereum blockchain interaction

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running on `http://localhost:8000`
- Ethereum node (Ganache) running on `http://127.0.0.1:8545`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx          # Training progress charts
│   ├── TrainingControls.jsx   # Training configuration and start button
│   └── BlockchainTable.jsx    # Audit log display
├── services/
│   ├── apiService.js          # Backend API communication
│   └── blockchainService.js   # Ethereum blockchain interaction
└── App.jsx                    # Main application component
```

## API Integration

The frontend communicates with the FastAPI backend for:
- Starting training sessions
- Retrieving training logs and status
- Stopping training

## Blockchain Integration

Connects to a local Ethereum network to read audit logs from the `FederatedTrainingLogger` smart contract, ensuring transparency and immutability of training metadata.

## Development

- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint