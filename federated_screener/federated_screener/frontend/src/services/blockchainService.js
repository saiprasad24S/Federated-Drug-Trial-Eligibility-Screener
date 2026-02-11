import { ethers } from 'ethers';

// Contract ABI - simplified for the logger contract
const CONTRACT_ABI = [
  "event TrainingRoundLogged(uint256 indexed round, uint256 accuracy, uint256 loss, uint256 timestamp)",
  "function getTrainingRound(uint256 round) view returns (uint256, uint256, uint256, uint256)",
  "function getTotalRounds() view returns (uint256)"
];

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Update with deployed address

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Connect to local Ethereum node (Ganache)
      this.provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
    } catch (error) {
      console.error('Error initializing blockchain service:', error);
    }
  }

  async getTotalRounds() {
    try {
      if (!this.contract) await this.initialize();
      const totalRounds = await this.contract.getTotalRounds();
      return totalRounds.toNumber();
    } catch (error) {
      console.error('Error getting total rounds:', error);
      return 0;
    }
  }

  async getTrainingRound(round) {
    try {
      if (!this.contract) await this.initialize();
      const roundData = await this.contract.getTrainingRound(round);
      return {
        round: roundData[0].toNumber(),
        accuracy: roundData[1].toNumber() / 10000, // Convert from basis points
        loss: roundData[2].toNumber() / 10000,
        timestamp: roundData[3].toNumber()
      };
    } catch (error) {
      console.error(`Error getting training round ${round}:`, error);
      return null;
    }
  }

  async getAllTrainingRounds() {
    try {
      const totalRounds = await this.getTotalRounds();
      const rounds = [];

      for (let i = 1; i <= totalRounds; i++) {
        const roundData = await this.getTrainingRound(i);
        if (roundData) {
          rounds.push(roundData);
        }
      }

      return rounds;
    } catch (error) {
      console.error('Error getting all training rounds:', error);
      return [];
    }
  }

  // Listen for new training round events
  onTrainingRoundLogged(callback) {
    if (!this.contract) return;

    this.contract.on('TrainingRoundLogged', (round, accuracy, loss, timestamp, event) => {
      callback({
        round: round.toNumber(),
        accuracy: accuracy.toNumber() / 10000,
        loss: loss.toNumber() / 10000,
        timestamp: timestamp.toNumber(),
        txHash: event.transactionHash
      });
    });
  }
}

export const blockchainService = new BlockchainService();