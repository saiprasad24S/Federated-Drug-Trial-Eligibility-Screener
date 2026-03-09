// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FederatedTrainingLogger
 * @dev Smart contract for logging federated learning training metadata
 * @notice Stores training round information including accuracy, model hash, and timestamp
 * @custom:security No patient data is stored - only training metadata for audit purposes
 */
contract FederatedTrainingLogger is Ownable {
    // Struct to represent a training log entry
    struct TrainingLog {
        uint256 roundNumber;
        uint256 accuracy;    // Scaled by 1000 (e.g., 0.856 = 856)
        string modelHash;
        uint256 timestamp;
    }

    // Array to store all training logs
    TrainingLog[] public trainingLogs;

    // Event emitted when a new training log is added
    event TrainingLogAdded(
        uint256 indexed roundNumber,
        uint256 accuracy,
        string modelHash,
        uint256 timestamp
    );

    /**
     * @dev Constructor - sets the contract deployer as owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a new training log entry
     * @param roundNumber The federated learning round number
     * @param accuracy The model accuracy scaled by 1000 (e.g., 856 for 85.6%)
     * @param modelHash SHA256 hash of the model parameters
     * @param timestamp Unix timestamp of the training round
     * @notice Only the contract owner (backend server) can call this function
     */
    function addTrainingLog(
        uint256 roundNumber,
        uint256 accuracy,
        string calldata modelHash,
        uint256 timestamp
    ) external onlyOwner {
        // Validate inputs
        require(roundNumber > 0, "Round number must be greater than 0");
        require(accuracy <= 1000, "Accuracy must be <= 1000 (100.0%)");
        require(bytes(modelHash).length == 64, "Model hash must be 64 characters (SHA256)");
        require(timestamp <= block.timestamp + 3600, "Timestamp cannot be more than 1 hour in future");

        // Create and store the log
        TrainingLog memory newLog = TrainingLog({
            roundNumber: roundNumber,
            accuracy: accuracy,
            modelHash: modelHash,
            timestamp: timestamp
        });

        trainingLogs.push(newLog);

        // Emit event
        emit TrainingLogAdded(roundNumber, accuracy, modelHash, timestamp);
    }

    /**
     * @dev Get the total number of training logs
     * @return The number of logs stored
     */
    function getLogCount() external view returns (uint256) {
        return trainingLogs.length;
    }

    /**
     * @dev Get a specific training log by index
     * @param index The index of the log to retrieve
     * @return roundNumber, accuracy, modelHash, timestamp
     */
    function getTrainingLog(uint256 index) external view returns (
        uint256 roundNumber,
        uint256 accuracy,
        string memory modelHash,
        uint256 timestamp
    ) {
        require(index < trainingLogs.length, "Index out of bounds");

        TrainingLog memory log = trainingLogs[index];
        return (log.roundNumber, log.accuracy, log.modelHash, log.timestamp);
    }

    /**
     * @dev Get multiple training logs in a single call (gas efficient for batch reading)
     * @param startIndex The starting index
     * @param count The number of logs to retrieve
     * @return Array of TrainingLog structs
     */
    function getTrainingLogs(uint256 startIndex, uint256 count) external view returns (TrainingLog[] memory) {
        require(startIndex < trainingLogs.length, "Start index out of bounds");
        require(count > 0 && count <= 50, "Count must be between 1 and 50");

        uint256 endIndex = startIndex + count;
        if (endIndex > trainingLogs.length) {
            endIndex = trainingLogs.length;
        }

        TrainingLog[] memory logs = new TrainingLog[](endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            logs[i - startIndex] = trainingLogs[i];
        }

        return logs;
    }

    /**
     * @dev Get the latest training log
     * @return The most recent training log
     */
    function getLatestLog() external view returns (
        uint256 roundNumber,
        uint256 accuracy,
        string memory modelHash,
        uint256 timestamp
    ) {
        require(trainingLogs.length > 0, "No training logs available");

        TrainingLog memory latestLog = trainingLogs[trainingLogs.length - 1];
        return (latestLog.roundNumber, latestLog.accuracy, latestLog.modelHash, latestLog.timestamp);
    }

    /**
     * @dev Get logs for a specific round number
     * @param roundNumber The round number to search for
     * @return Array of indices where this round appears
     * @notice In practice, round numbers should be unique, but this allows for flexibility
     */
    function getLogsByRound(uint256 roundNumber) external view returns (uint256[] memory) {
        uint256 count = 0;

        // First pass: count matches
        for (uint256 i = 0; i < trainingLogs.length; i++) {
            if (trainingLogs[i].roundNumber == roundNumber) {
                count++;
            }
        }

        // Second pass: collect indices
        uint256[] memory indices = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < trainingLogs.length; i++) {
            if (trainingLogs[i].roundNumber == roundNumber) {
                indices[index] = i;
                index++;
            }
        }

        return indices;
    }
}