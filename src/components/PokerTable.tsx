"use client"

import React from 'react';
import { GameState, PlayerAction, ActionType } from '@/types/poker';
import { formatPot } from '@/lib/poker-utils';
import PlayerSeat from './PlayerSeat';
import CommunityCards from './CommunityCards';
import ActionButtons from './ActionButtons';

interface PokerTableProps {
  gameState: GameState;
  currentPlayerId?: string;
  onPlayerAction: (action: PlayerAction) => void;
  showAllCards?: boolean; // For training/analysis mode
}

const PokerTable: React.FC<PokerTableProps> = ({
  gameState,
  currentPlayerId,
  onPlayerAction,
  showAllCards = false
}) => {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerTurn = currentPlayer && 
    gameState.players[gameState.currentPlayer]?.id === currentPlayerId;

  const handleAction = (actionType: ActionType, amount?: number) => {
    if (!currentPlayer) return;
    
    onPlayerAction({
      type: actionType,
      amount,
      playerId: currentPlayer.id
    });
  };

  const getValidActions = (): ActionType[] => {
    if (!currentPlayer || !isCurrentPlayerTurn) return [];
    
    const actions: ActionType[] = ['fold'];
    const currentBet = Math.max(...gameState.players.map(p => p.currentBet));
    
    if (currentPlayer.currentBet === currentBet) {
      actions.push('check');
    } else {
      actions.push('call');
    }
    
    if (currentPlayer.stack > 0) {
      actions.push('bet', 'raise', 'all-in');
    }
    
    return actions;
  };

  // Position players around the table
  const getPlayerPosition = (playerIndex: number): 'top' | 'right' | 'bottom' | 'left' => {
    const totalPlayers = gameState.players.length;
    
    if (totalPlayers === 2) {
      // For heads-up: player 0 (You) at bottom, player 1 (opponent) at top
      return playerIndex === 0 ? 'bottom' : 'top';
    } else if (totalPlayers === 3) {
      const positions: ('bottom' | 'right' | 'top')[] = ['bottom', 'right', 'top'];
      return positions[playerIndex];
    } else if (totalPlayers === 4) {
      const positions: ('bottom' | 'right' | 'top' | 'left')[] = ['bottom', 'right', 'top', 'left'];
      return positions[playerIndex];
    } else {
      // For more players, distribute around table
      const angle = (playerIndex / totalPlayers) * 2 * Math.PI;
      if (angle < Math.PI / 4 || angle >= 7 * Math.PI / 4) return 'bottom';
      if (angle < 3 * Math.PI / 4) return 'right';
      if (angle < 5 * Math.PI / 4) return 'top';
      return 'left';
    }
  };

  return (
    <div className="relative w-full  bg-gradient-to-br from-green-800 to-green-900">
      {/* Table Surface */}
      <div className="relative mx-auto max-w-5xl px-4 py-16">
        {/* Main Table Area */}
        <div className="poker-table w-full h-80 relative overflow-visible shadow-2xl border-8 border-yellow-600 rounded-full mx-auto max-w-3xl">
          {/* Table felt pattern */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent"></div>
          
          {/* Community Cards Area */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <CommunityCards cards={gameState.communityCards} stage={gameState.stage} />
          </div>

          {/* Pot Display */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-full shadow-lg">
            <div className="text-center">
              <div className="text-sm font-medium">Pot</div>
              <div className="text-lg font-bold">${formatPot(gameState.pot)}</div>
            </div>
          </div>

          {/* Players positioned around table */}
          {gameState.players.map((player, index) => {
            const position = getPlayerPosition(index);
            const isCurrentTurnPlayer = index === gameState.currentPlayer;
            const isDealer = index === gameState.dealer;
            const shouldShowCards = showAllCards || player.id === currentPlayerId;

            return (
              <div
                key={player.id}
                className={`absolute ${getPositionClasses(position, gameState.players.length, index)}`}
              >
                <PlayerSeat
                  player={player}
                  isCurrentPlayer={isCurrentTurnPlayer}
                  isDealer={isDealer}
                  showCards={shouldShowCards}
                  position={position}
                />
              </div>
            );
          })}

          {/* Game Stage Indicator */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded">
            <div className="text-sm">
              <div>Stage: {gameState.stage.charAt(0).toUpperCase() + gameState.stage.slice(1)}</div>
              <div>Game ID: {gameState.id.slice(-8)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel - Outside the table */}
      <div className="mt-8 flex justify-center">
        {currentPlayer && isCurrentPlayerTurn && (
          <ActionButtons
            validActions={getValidActions()}
            currentBet={Math.max(...gameState.players.map(p => p.currentBet))}
            playerStack={currentPlayer.stack}
            potSize={gameState.pot}
            minRaise={gameState.minRaise}
            onAction={handleAction}
          />
        )}

        {/* Waiting indicator */}
        {currentPlayer && !isCurrentPlayerTurn && (
          <div className="bg-gray-800 text-white px-6 py-3 rounded-lg">
            <div className="text-center">
              <div className="text-sm">Waiting for</div>
              <div className="font-semibold">
                {gameState.players[gameState.currentPlayer]?.name || 'Other Player'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get positioning classes based on table position
function getPositionClasses(
  position: 'top' | 'right' | 'bottom' | 'left',
  totalPlayers: number,
  playerIndex: number
): string {
  // For 2 players: position them with more distance
  if (totalPlayers === 2) {
    if (position === 'bottom') {
      return 'absolute bottom-4 left-1/2 transform -translate-x-1/2';
    } else { // top position
      return 'absolute top-4 left-1/2 transform -translate-x-1/2';
    }
  }
  
  // For 3 players
  if (totalPlayers === 3) {
    const positions = {
      bottom: 'absolute bottom-4 left-1/2 transform -translate-x-1/2',
      right: 'absolute right-4 top-1/3 transform -translate-y-1/2',
      top: 'absolute top-4 left-1/2 transform -translate-x-1/2'
    };
    return positions[position as keyof typeof positions] || positions.bottom;
  }
  
  // For 4 players: use standard positions with adequate spacing
  if (totalPlayers === 4) {
    const positions = {
      bottom: 'absolute bottom-4 left-1/2 transform -translate-x-1/2',
      right: 'absolute right-4 top-1/2 transform -translate-y-1/2',
      top: 'absolute top-4 left-1/2 transform -translate-x-1/2',
      left: 'absolute left-4 top-1/2 transform -translate-y-1/2'
    };
    return positions[position];
  }

  // For more than 4 players, distribute around the table
  if (totalPlayers > 4) {
    const angle = (playerIndex / totalPlayers) * 2 * Math.PI;
    
    // Map angles to positions
    if (angle < Math.PI / 4 || angle >= 7 * Math.PI / 4) {
      return 'absolute bottom-4 left-1/2 transform -translate-x-1/2';
    } else if (angle < 3 * Math.PI / 4) {
      return 'absolute right-4 top-1/2 transform -translate-y-1/2';
    } else if (angle < 5 * Math.PI / 4) {
      return 'absolute top-4 left-1/2 transform -translate-x-1/2';
    } else {
      return 'absolute left-4 top-1/2 transform -translate-y-1/2';
    }
  }

  // Default fallback
  return 'absolute bottom-4 left-1/2 transform -translate-x-1/2';
}

export default PokerTable;