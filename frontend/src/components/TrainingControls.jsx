import React, { useState } from 'react';
import { useTrainingData } from '../hooks/useTrainingData';

const TrainingControls = ({ onStartTraining, onStopTraining, isTraining: externalIsTraining }) => {
  const [numRounds, setNumRounds] = useState(10);
  const [minClients] = useState(2);

  // Use hook only if parent didn't provide control handlers
  const trainingHook = useTrainingData();
  const isControlled = typeof onStartTraining === 'function' && typeof onStopTraining === 'function';

  const isTraining = externalIsTraining != null ? externalIsTraining : trainingHook.isTraining;
  const start = isControlled ? onStartTraining : trainingHook.startTraining;
  const stop = isControlled ? onStopTraining : trainingHook.stopTraining;

  const handleStart = async () => {
    try {
      await start({ num_rounds: numRounds, min_clients: minClients });
    } catch (err) {
      console.error('start training failed', err);
    }
  };

  const handleStop = async () => {
    try {
      await stop();
    } catch (err) {
      console.error('stop training failed', err);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Training Controls</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-700">Number of Rounds</label>
          <input type="range" min="1" max="100" value={numRounds} onChange={(e) => setNumRounds(parseInt(e.target.value))} className="w-full mt-2" />
          <div className="text-xs text-gray-500 flex justify-between mt-1"><span>1</span><span>100</span></div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleStart} disabled={isTraining} className={`flex-1 py-2 rounded-md font-medium ${isTraining ? 'bg-gray-300 text-gray-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
            {isTraining ? 'Training…' : 'Start'}
          </button>
          <button onClick={handleStop} disabled={!isTraining} className={`flex-1 py-2 rounded-md font-medium ${!isTraining ? 'bg-gray-200 text-gray-500' : 'bg-red-600 text-white hover:bg-red-700'}`}>
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingControls;