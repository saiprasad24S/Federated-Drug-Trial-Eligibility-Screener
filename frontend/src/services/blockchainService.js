import { ethers } from 'ethers';

// Contract ABI - simplified for the logger contract
const CONTRACT_ABI = [
  "event TrainingRoundLogged(uint256 indexed round, uint256 accuracy, uint256 loss, uint256 timestamp)",
  "function getTrainingRound(uint256 round) view returns (uint256, uint256, uint256, uint256)",
  "function getTotalRounds() view returns (uint256)"
];

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this._initFailed = false;
  }

  async initialize() {
    if (this._initFailed) return false;
    try {
      // ethers v6 API — JsonRpcProvider is a top-level export
      this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      // Quick connectivity check (timeout 2s)
      await Promise.race([
        this.provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
      return true;
    } catch (error) {
      // Mark as failed so we don't retry on every call
      this._initFailed = true;
      console.warn('Blockchain service unavailable (no local node). Using backend API for audit logs.');
      this.provider = null;
      this.contract = null;
      return false;
    }
  }

  async getTotalRounds() {
    try {
      if (!this.contract && !(await this.initialize())) return 0;
      const totalRounds = await this.contract.getTotalRounds();
      return Number(totalRounds);
    } catch (error) {
      console.warn('Error getting total rounds:', error.message);
      return 0;
    }
  }

  async getTrainingRound(round) {
    try {
      if (!this.contract && !(await this.initialize())) return null;
      const roundData = await this.contract.getTrainingRound(round);
      return {
        round: Number(roundData[0]),
        accuracy: Number(roundData[1]) / 10000,
        loss: Number(roundData[2]) / 10000,
        timestamp: Number(roundData[3])
      };
    } catch (error) {
      console.warn(`Error getting training round ${round}:`, error.message);
      return null;
    }
  }

  async getAllTrainingRounds() {
    try {
      if (this._initFailed) return [];
      const totalRounds = await this.getTotalRounds();
      if (totalRounds === 0) return [];
      const rounds = [];
      for (let i = 1; i <= totalRounds; i++) {
        const roundData = await this.getTrainingRound(i);
        if (roundData) rounds.push(roundData);
      }
      return rounds;
    } catch (error) {
      console.warn('Error getting all training rounds:', error.message);
      return [];
    }
  }

  // Listen for new training round events
  onTrainingRoundLogged(callback) {
    if (!this.contract) return;
    try {
      this.contract.on('TrainingRoundLogged', (round, accuracy, loss, timestamp, event) => {
        callback({
          round: Number(round),
          accuracy: Number(accuracy) / 10000,
          loss: Number(loss) / 10000,
          timestamp: Number(timestamp),
          txHash: event.log?.transactionHash || ''
        });
      });
    } catch (e) {
      console.warn('Could not subscribe to blockchain events:', e.message);
    }
  }
}

export const blockchainService = new BlockchainService();