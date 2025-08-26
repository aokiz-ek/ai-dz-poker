"use client"

import React, { useState } from 'react';
import { ActionType } from '@/types/poker';
import { formatStack } from '@/lib/poker-utils';

interface ActionButtonsProps {
  validActions: ActionType[];
  currentBet: number;
  playerStack: number;
  potSize: number;
  minRaise: number;
  onAction: (action: ActionType, amount?: number) => void;
  disabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  validActions,
  currentBet,
  playerStack,
  potSize,
  minRaise,
  onAction,
  disabled = false
}) => {
  const [betAmount, setBetAmount] = useState<number>(minRaise);
  const [showBetInput, setShowBetInput] = useState<boolean>(false);

  const handleBetAction = (actionType: 'bet' | 'raise') => {
    if (betAmount > playerStack) {
      onAction('all-in');
    } else {
      onAction(actionType, betAmount);
    }
    setShowBetInput(false);
  };

  const getCallAmount = (): number => {
    return Math.min(currentBet, playerStack);
  };

  const getBetButtonLabel = (): string => {
    if (currentBet === 0) return 'Bet';
    return 'Raise';
  };

  const quickBetAmounts = [
    { label: '1/2 Pot', amount: Math.round(potSize / 2) },
    { label: 'Pot', amount: potSize },
    { label: '2x Pot', amount: potSize * 2 },
    { label: 'All-In', amount: playerStack }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 min-w-96">
      <div className="text-lg font-semibold mb-4 text-center">Choose Your Action</div>
      
      {/* Basic Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {validActions.includes('fold') && (
          <button
            onClick={() => onAction('fold')}
            disabled={disabled}
            className="px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            Fold
          </button>
        )}

        {validActions.includes('check') && (
          <button
            onClick={() => onAction('check')}
            disabled={disabled}
            className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            Check
          </button>
        )}

        {validActions.includes('call') && (
          <button
            onClick={() => onAction('call')}
            disabled={disabled}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            Call ${formatStack(getCallAmount())}
          </button>
        )}

        {(validActions.includes('bet') || validActions.includes('raise')) && !showBetInput && (
          <button
            onClick={() => setShowBetInput(true)}
            disabled={disabled}
            className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {getBetButtonLabel()}
          </button>
        )}

        {validActions.includes('all-in') && (
          <button
            onClick={() => onAction('all-in')}
            disabled={disabled}
            className="px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors col-span-2"
          >
            All-In ${formatStack(playerStack)}
          </button>
        )}
      </div>

      {/* Bet/Raise Input */}
      {showBetInput && (
        <div className="border-t pt-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getBetButtonLabel()} Amount
            </label>
            <input
              type="number"
              min={minRaise}
              max={playerStack}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Min: ${formatStack(minRaise)} | Max: ${formatStack(playerStack)}
            </div>
          </div>

          {/* Quick bet buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {quickBetAmounts.map((quick, index) => (
              <button
                key={index}
                onClick={() => setBetAmount(quick.amount)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                disabled={quick.amount > playerStack}
              >
                {quick.label}
              </button>
            ))}
          </div>

          {/* Confirm bet */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleBetAction(currentBet === 0 ? 'bet' : 'raise')}
              disabled={disabled || betAmount < minRaise}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {getBetButtonLabel()} ${formatStack(betAmount)}
            </button>
            <button
              onClick={() => setShowBetInput(false)}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Game Info */}
      <div className="text-xs text-gray-600 mt-4 text-center">
        Pot: ${formatStack(potSize)} | Current Bet: ${formatStack(currentBet)} | Your Stack: ${formatStack(playerStack)}
      </div>
    </div>
  );
};

export default ActionButtons;