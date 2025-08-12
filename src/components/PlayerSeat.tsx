"use client"

import React from 'react';
import { Player } from '@/types/poker';
import { formatStack } from '@/lib/poker-utils';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  isCurrentPlayer?: boolean;
  isDealer?: boolean;
  showCards?: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
  onClick?: () => void;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentPlayer = false,
  isDealer = false,
  showCards = false,
  position,
  onClick
}) => {
  const positionClasses = {
    top: 'flex-col items-center',
    right: 'flex-row items-center',
    bottom: 'flex-col-reverse items-center',
    left: 'flex-row-reverse items-center'
  };

  const cardContainerClasses = {
    top: 'flex space-x-1 mb-2',
    right: 'flex flex-col space-y-1 ml-2',
    bottom: 'flex space-x-1 mt-2',
    left: 'flex flex-col space-y-1 mr-2'
  };

  return (
    <div 
      className={`relative cursor-pointer ${onClick ? 'hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
      {/* Player Info Container */}
      <div className={`flex ${positionClasses[position]} items-center justify-center min-w-32`}>
        {/* Player Info Card */}
        <div className={`relative text-center ${isCurrentPlayer ? 'bg-yellow-200 border-2 border-yellow-400' : 'bg-white border border-gray-300'} rounded-lg p-3 shadow-lg min-w-28`}>
          {/* Dealer Button */}
          {isDealer && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-gray-400 rounded-full flex items-center justify-center text-xs font-bold z-10">
              D
            </div>
          )}

          {/* Player Name */}
          <div className={`font-semibold text-sm ${player.folded ? 'text-gray-500' : 'text-gray-900'}`}>
            {player.name}
          </div>

          {/* Position */}
          <div className="text-xs text-gray-600">
            {player.position}
          </div>

          {/* Stack */}
          <div className={`text-sm font-medium ${player.isAllIn ? 'text-red-600' : 'text-green-600'}`}>
            ${formatStack(player.stack)}
          </div>

          {/* Current Bet */}
          {player.currentBet > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              Bet: ${formatStack(player.currentBet)}
            </div>
          )}

          {/* Player Status */}
          {player.folded && (
            <div className="text-xs text-red-500 mt-1 font-medium">
              FOLDED
            </div>
          )}
          {player.isAllIn && (
            <div className="text-xs text-red-600 mt-1 font-medium">
              ALL-IN
            </div>
          )}
        </div>

        {/* Cards - positioned outside the info card */}
        {player.cards && (
          <div className={`absolute ${getCardPosition(position)}`}>
            <div className="flex space-x-1">
              <Card 
                card={showCards ? player.cards[0] : undefined} 
                hidden={!showCards} 
                size="sm" 
              />
              <Card 
                card={showCards ? player.cards[1] : undefined} 
                hidden={!showCards} 
                size="sm" 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to position cards relative to player info
function getCardPosition(position: 'top' | 'right' | 'bottom' | 'left'): string {
  switch (position) {
    case 'top': return '-bottom-12 left-1/2 transform -translate-x-1/2';
    case 'right': return '-left-12 top-1/2 transform -translate-y-1/2';
    case 'bottom': return '-top-12 left-1/2 transform -translate-x-1/2';
    case 'left': return '-right-12 top-1/2 transform -translate-y-1/2';
    default: return '-top-12 left-1/2 transform -translate-x-1/2';
  }
}

export default PlayerSeat;