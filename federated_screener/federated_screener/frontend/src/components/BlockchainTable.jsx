import React from 'react';

const BlockchainTable = ({ blockchainData }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Blockchain Audit Log</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Round
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accuracy
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loss
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction Hash
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blockchainData.map((entry, index) => (
              <tr key={index}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {entry.round}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {entry.accuracy.toFixed(4)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {entry.loss.toFixed(4)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {new Date(entry.timestamp * 1000).toLocaleString()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {entry.txHash.substring(0, 10)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlockchainTable;