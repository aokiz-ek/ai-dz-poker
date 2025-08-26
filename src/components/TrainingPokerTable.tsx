"use client"

import React from 'react'
import { GameState, PlayerAction, ActionType, Player } from '@/types/poker'
import { formatPot, formatStack, cardToString } from '@/lib/poker-utils'

interface TrainingPokerTableProps {
  gameState: GameState
  currentPlayerId?: string
  onPlayerAction?: (action: PlayerAction) => void
  showAllCards?: boolean
  heroId?: string
  readOnly?: boolean
}

const TrainingPokerTable: React.FC<TrainingPokerTableProps> = ({
  gameState,
  currentPlayerId,
  onPlayerAction,
  showAllCards = false,
  heroId,
  readOnly = false
}) => {
  const currentPlayer = gameState.players.find(p => p.id === (currentPlayerId || heroId))
  const isCurrentPlayerTurn = !readOnly && currentPlayer && 
    gameState.players[gameState.currentPlayer]?.id === (currentPlayerId || heroId)

  // Get 6-player positions - 贴近桌子边缘布局
  const get6PlayerPosition = (playerIndex: number): { 
    position: string,
    classes: string,
    chipPosition: string
  } => {
    const positions = [
      // Player 0: UTG (枪口位) - 左上角，10点钟方向
      { 
        position: 'utg',
        classes: 'absolute top-4 sm:top-6 md:top-8 left-8 sm:left-10 md:left-16 transform -translate-x-1/2 -translate-y-1/2',
        chipPosition: 'absolute top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2'
      },
      // Player 1: MP (中位) - 右上角，2点钟方向
      {
        position: 'mp', 
        classes: 'absolute top-4 sm:top-6 md:top-8 right-8 sm:right-10 md:right-16 transform translate-x-1/2 -translate-y-1/2',
        chipPosition: 'absolute top-1/3 right-1/3 transform translate-x-1/2 -translate-y-1/2'
      },
      // Player 2: CO (后位) - 右边，3点钟方向
      {
        position: 'co',
        classes: 'absolute right-0 sm:right-2 md:right-4 top-1/2 transform translate-x-0 -translate-y-1/2', 
        chipPosition: 'absolute right-1/4 top-1/2 transform translate-x-1/2 -translate-y-1/2'
      },
      // Player 3: BTN (庄位) - 右下角，5点钟方向
      {
        position: 'button',
        classes: 'absolute bottom-4 sm:bottom-6 md:bottom-8 right-8 sm:right-10 md:right-16 transform translate-x-1/2 translate-y-1/2',
        chipPosition: 'absolute bottom-1/3 right-1/3 transform translate-x-1/2 translate-y-1/2'
      },
      // Player 4: SB (小盲) - 左下角，7点钟方向
      {
        position: 'sb',
        classes: 'absolute bottom-4 sm:bottom-6 md:bottom-8 left-8 sm:left-10 md:left-16 transform -translate-x-1/2 translate-y-1/2',
        chipPosition: 'absolute bottom-1/3 left-1/3 transform -translate-x-1/2 translate-y-1/2'
      },
      // Player 5: BB (大盲) - 左边，9点钟方向
      {
        position: 'bb',
        classes: 'absolute left-0 sm:left-2 md:left-4 top-1/2 transform translate-x-0 -translate-y-1/2',
        chipPosition: 'absolute left-1/4 top-1/2 transform -translate-x-1/2 -translate-y-1/2'
      }
    ]
    
    return positions[playerIndex] || positions[0]
  }

  const renderCard = (card: string, isVisible: boolean = true) => {
    if (!isVisible || card === 'back') {
      return (
        <div className="w-8 h-11 md:w-12 md:h-16 bg-gradient-to-br from-blue-900 to-blue-800 rounded border border-blue-700 flex items-center justify-center">
          <div className="w-4 h-6 md:w-6 md:h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-sm opacity-60"></div>
        </div>
      )
    }

    // 检查卡片是否有效
    if (!card || typeof card !== 'string' || card.length < 2) {
      return (
        <div className="w-8 h-11 md:w-12 md:h-16 border-2 border-dashed border-gray-400 rounded opacity-50 flex items-center justify-center">
          <span className="text-gray-500 text-xs">?</span>
        </div>
      )
    }

    // Parse card (e.g., "Ad" = Ace of diamonds)
    const rank = card.slice(0, -1)
    const suit = card.slice(-1)
    
    const getSuitSymbol = (suit: string) => {
      switch(suit.toLowerCase()) {
        case 'd': return '♦'
        case 'h': return '♥'
        case 'c': return '♣'
        case 's': return '♠'
        default: return '?'
      }
    }

    const getSuitColor = (suit: string) => {
      return ['d', 'h'].includes(suit.toLowerCase()) ? 'text-red-600' : 'text-black'
    }

    return (
      <div className="w-8 h-11 md:w-12 md:h-16 bg-white rounded border border-gray-300 flex flex-col items-center justify-between p-1 shadow-sm">
        <div className={`text-sm md:text-base font-bold ${getSuitColor(suit)}`}>
          {rank || '?'}
        </div>
        <div className={`text-lg md:text-2xl ${getSuitColor(suit)}`}>
          {getSuitSymbol(suit)}
        </div>
        <div className={`text-sm md:text-base font-bold ${getSuitColor(suit)} rotate-180`}>
          {rank || '?'}
        </div>
      </div>
    )
  }

  const renderPlayer = (player: Player, playerIndex: number) => {
    const { classes, chipPosition } = get6PlayerPosition(playerIndex)
    
    // 修复当前玩家判断逻辑 - 通过玩家ID而不是索引来判断
    const currentActivePlayer = gameState.players[gameState.currentPlayer]
    const isCurrentTurnPlayer = currentActivePlayer && player.id === currentActivePlayer.id && !player.folded
    
    const isDealer = playerIndex === gameState.dealer
    // 修复手牌显示逻辑：摊牌时显示所有未弃牌玩家的手牌，平时只显示英雄玩家手牌
    const shouldShowCards = (showAllCards && !player.folded) || player.id === currentPlayerId
    const isHero = player.id === currentPlayerId

    // 获取位置头像和颜色
    const getPositionAvatar = (position: string) => {
      const avatars = {
        'utg': '🎯',
        'mp': '🎲',
        'co': '🎪',
        'button': '👑',
        'sb': '💎',
        'bb': '🔥'
      }
      return avatars[position as keyof typeof avatars] || '🎮'
    }

    const getPositionColor = (position: string) => {
      const colors = {
        'utg': 'from-red-500 to-red-600',
        'mp': 'from-orange-500 to-orange-600', 
        'co': 'from-yellow-500 to-yellow-600',
        'button': 'from-green-500 to-green-600',
        'sb': 'from-blue-500 to-blue-600',
        'bb': 'from-purple-500 to-purple-600'
      }
      return colors[position as keyof typeof colors] || 'from-gray-500 to-gray-600'
    }

    return (
      <div key={player.id}>
        {/* Player Info */}
        <div className={classes}>
          {/* 当前行动玩家的增强光环效果 */}
          {isCurrentTurnPlayer && (
            <>
              {/* 外圈动态光环 */}
              <div className="absolute -inset-2 rounded-xl animate-ping">
                <div className="w-full h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-xl opacity-40"></div>
              </div>
              {/* 内圈呼吸光环 */}
              <div className="absolute -inset-1 rounded-xl animate-pulse">
                <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 rounded-xl opacity-50"></div>
              </div>
              {/* 旋转边框效果 */}
              <div className="absolute inset-0 rounded-xl animate-spin" style={{ animationDuration: '3s' }}>
                <div className="w-full h-full border-2 border-gradient rounded-xl opacity-60" style={{
                  background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)',
                  padding: '2px',
                  borderRadius: '12px'
                }}>
                  <div className="w-full h-full bg-transparent rounded-xl"></div>
                </div>
              </div>
            </>
          )}
          
          {/* 英雄玩家的特殊光环 */}
          {isHero && (
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 rounded-xl opacity-20 animate-pulse"></div>
          )}

          <div className={`
            relative bg-black/60 backdrop-blur-md border-2 rounded-lg p-1.5 sm:p-2 min-w-16 sm:min-w-20 max-w-20 sm:max-w-24 transition-all duration-300
            ${isCurrentTurnPlayer ? 'border-3 border-blue-400 shadow-lg ring-2 ring-blue-400/50 scale-102 bg-blue-900/20' : 'border-white/20 hover:border-white/40'}
            ${isHero ? 'border-yellow-400 shadow-md ring-1 ring-yellow-400/40 bg-yellow-900/10' : ''}
            ${player.folded ? 'opacity-40 grayscale' : ''}
          `}>
            {/* Dealer Button */}
            {isDealer && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-500 text-black rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                D
              </div>
            )}

            {/* 位置头像 - 简化版 */}
            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-md border border-white/30">
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${getPositionColor(player.position)} flex items-center justify-center`}>
                {getPositionAvatar(player.position)}
              </div>
            </div>

            
                {/* Player Name & Stack - 移动端优化 */}
            <div className="text-center mb-0.5 sm:mb-1">
              <div className={`text-xs sm:text-xs font-medium truncate max-w-12 sm:max-w-14 md:max-w-16 mx-auto ${
                isCurrentTurnPlayer ? 'text-blue-300' : 'text-white'
              }`}>
                {player.name}
              </div>
              <div className={`text-xs sm:text-xs ${
                isCurrentTurnPlayer ? 'text-blue-200' : 'text-white/70'
              }`}>
                ${formatStack(player.stack)}
              </div>
            </div>

            {/* Player Cards - 移动端优化间距 */}
            {player.cards && player.cards.length > 0 && (
              <div className="flex space-x-1 sm:space-x-1.5 md:space-x-2 justify-center mb-0.5 sm:mb-1">
                {player.cards?.map((card, cardIndex) => (
                  <div key={cardIndex}>
                    {renderCard(cardToString(card), shouldShowCards)}
                  </div>
                ))}
              </div>
            )}

            {/* Current Bet - 简化版 */}
            {player.currentBet > 0 && (
              <div className="text-xs text-center">
                <div className={`px-1.5 py-0.5 rounded text-white font-medium ${
                  isCurrentTurnPlayer ? 'bg-orange-600' : 'bg-gray-600'
                }`}>
                  ${formatStack(player.currentBet)}
                </div>
              </div>
            )}

            {/* 状态标识 - 简化版 */}
            {player.folded && (
              <div className="text-center">
                <div className="text-xs text-red-400">❌ 弃牌</div>
              </div>
            )}
            {player.isAllIn && (
              <div className="text-center">
                <div className="text-xs text-purple-400">🚨 全下</div>
              </div>
            )}
            {isHero && !player.folded && (
              <div className="text-center">
                <div className="text-xs text-yellow-400">👑</div>
              </div>
            )}
          </div>
        </div>

        {/* Chips - 响应式优化显示 */}
        {player.currentBet > 0 && (
          <div className={chipPosition}>
            <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm rounded px-1 md:px-1.5 py-0.5 border border-white/20">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full border shadow-sm ${
                isCurrentTurnPlayer 
                  ? 'bg-gradient-to-br from-yellow-300 to-orange-400 border-yellow-500' 
                  : 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-600'
              }`}></div>
              <div className={`text-xs font-medium ${
                isCurrentTurnPlayer ? 'text-yellow-300' : 'text-white'
              }`}>
                ${formatStack(player.currentBet)}
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black relative overflow-hidden">
      {/* Ambient Lighting Effect */}
      <div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 via-transparent to-transparent"></div>
      
      {/* 简化的游戏状态指示器 */}
      <div className="absolute top-2 left-2 z-20">
        <div className="bg-black/50 backdrop-blur rounded-lg px-3 py-1 border border-white/20">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              gameState.stage === 'preflop' ? 'bg-red-400' :
              gameState.stage === 'flop' ? 'bg-orange-400' :
              gameState.stage === 'turn' ? 'bg-yellow-400' :
              'bg-green-400'
            }`}></div>
            <span className="text-white text-xs">
              {gameState.stage === 'preflop' ? '翻前' :
               gameState.stage === 'flop' ? '翻牌' :
               gameState.stage === 'turn' ? '转牌' :
               '河牌'}
            </span>
          </div>
        </div>
      </div>

      {/* 当前玩家指示器 */}
      <div className="absolute top-2 right-2 z-20">
        <div className="bg-black/50 backdrop-blur rounded-lg px-3 py-1 border border-white/20">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-white text-xs">
              {gameState.players[gameState.currentPlayer]?.name || '未知'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main Table Container - 优化空间利用 */}
      <div className="absolute inset-4 md:inset-6 flex items-center justify-center">
        {/* Professional Poker Table - 移动端优化 */}
        <div className="relative w-full h-full max-w-sm sm:max-w-lg md:max-w-4xl lg:max-w-5xl max-h-64 sm:max-h-72 md:max-h-80 lg:max-h-96">
          {/* Premium Table Surface */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-green-900 to-emerald-900 rounded-full shadow-2xl border-4 border-yellow-500">
            {/* Luxury Felt Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px] rounded-full"></div>
            
            {/* Inner Rail */}
            <div className="absolute inset-2 border-2 border-yellow-600/50 rounded-full"></div>
            
            {/* Table Highlights */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-full"></div>
          </div>

          {/* Community Cards Area - 优化位置和尺寸 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="flex space-x-2 md:space-x-3 justify-center">
              {gameState.communityCards.map((card, index) => (
                <div key={index} className="transform hover:scale-105 transition-transform">
                  {renderCard(cardToString(card), true)}
                </div>
              ))}
              {/* Placeholder cards for upcoming streets */}
              {gameState.communityCards.length < 5 && (
                <>
                  {Array(5 - gameState.communityCards.length).fill(null).map((_, index) => (
                    <div key={`placeholder-${index}`} className="w-8 h-11 md:w-12 md:h-16 border-2 border-dashed border-poker-border-light rounded opacity-30">
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Premium Pot Display - 调整到更靠上位置 */}
          <div className="absolute top-1/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative group">
              {/* Pot Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              
              {/* Pot Container */}
              <div className="relative bg-gradient-to-br from-yellow-500 via-yellow-400 to-orange-500 text-black px-4 md:px-6 py-2 md:py-3 rounded-full shadow-2xl border-2 border-yellow-300">
                <div className="text-center">
                  <div className="text-xs md:text-sm font-bold opacity-80 tracking-wide">POT</div>
                  <div className="text-sm md:text-lg font-black tracking-tight">{formatPot(gameState.pot)}</div>
                </div>
                
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Players */}
          {gameState.players.map((player, index) => renderPlayer(player, index))}

          {/* Game Stage Indicator */}
          <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            <div>{gameState.stage.charAt(0).toUpperCase() + gameState.stage.slice(1)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainingPokerTable