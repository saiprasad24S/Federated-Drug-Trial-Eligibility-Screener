import React, { useState } from 'react';

const TrainingControls = ({ onStartTraining, isTraining }) => {
  const [numRounds, setNumRounds] = useState(10);
  const [minClients, setMinClients] = useState(2);

  const handleStartTraining = () => {
    onStartTraining({ numRounds, minClients });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Training Controls</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Rounds
          </label>
          <input
            type="number"
            value={numRounds}
            onChange={(e) => setNumRounds(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Clients
          </label>
          <input
            type="number"
            value={minClients}
            onChange={(e) => setMinClients(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="10"
          />
        </div>
        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isTraining
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isTraining ? 'Training in Progress...' : 'Start Federated Training'}
        </button>
      </div>
    </div>
  );
};

export default TrainingControls;