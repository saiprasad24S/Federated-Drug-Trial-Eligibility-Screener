// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuditLogger {
    struct TrainingLog {
        uint256 roundNumber;
        uint256 accuracy;  // Stored as accuracy * 10000 for precision
        string modelHash;
        uint256 timestamp;
    }

    TrainingLog[] public logs;

    event LogTrainingRound(
        uint256 indexed roundNumber,
        uint256 accuracy,
        string modelHash,
        uint256 timestamp
    );

    /**
     * @dev Log training metadata to blockchain
     * @param roundNumber Current federated learning round
     * @param accuracy Model accuracy (multiplied by 10000)
     * @param modelHash SHA256 hash of model parameters
     * @param timestamp Unix timestamp
     */
    function logTrainingRound(
        uint256 roundNumber,
        uint256 accuracy,
        string memory modelHash,
        uint256 timestamp
    ) public {
        logs.push(TrainingLog(roundNumber, accuracy, modelHash, timestamp));
        emit LogTrainingRound(roundNumber, accuracy, modelHash, timestamp);
    }

    /**
     * @dev Get total number of logged training rounds
     */
    function getLogCount() public view returns (uint256) {
        return logs.length;
    }

    /**
     * @dev Get training log by index
     */
    function getLog(uint256 index) public view returns (
        uint256 roundNumber,
        uint256 accuracy,
        string memory modelHash,
        uint256 timestamp
    ) {
        require(index < logs.length, "Index out of bounds");
        TrainingLog memory log = logs[index];
        return (log.roundNumber, log.accuracy, log.modelHash, log.timestamp);
    }
}