import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { PlayerAction, ActionType } from '@/types/poker'
import TrainingPokerTable from '@/components/TrainingPokerTable'
import TrainingActionButtons from '@/components/TrainingActionButtons'
import ActionHistory from '@/components/training/ActionHistory'
import { 
  TrainingGameEngine, 
  type TrainingGameState, 
  type GameProgressResult 
} from '@/lib/training-game-engine'

type TrainingMode = 
  | 'general'          // 综合训练
  | 'position'         // 位置专项
  | 'stack_depth'      // 筹码深度  
  | 'opponent_type'    // 对手类型
  | 'special_spots'    // 特殊场景
  | 'multiway'         // 多人奖池
  | 'river_bluff'      // 河牌诈唬
  | 'defense'          // 防守训练
  | 'time_pressure'    // 限时训练

interface PlayerActionDisplay {
  playerId: string
  playerName: string
  action: ActionType
  amount?: number
  position: string
  timestamp: number
}

// GTO Strategy Helper Functions
const getGTORecommendation = (gameState: TrainingGameState | null, handResult: any): string => {
  if (!gameState || !handResult) return '无建议'
  
  // Based on the current scenario's recommended action
  const recommendedAction = gameState.currentScenario.recommendedAction.action
  return recommendedAction.toUpperCase()
}

const getGTOFrequency = (gameState: TrainingGameState | null, handResult: any): string => {
  if (!gameState || !handResult) return '0%'
  
  // Return the GTO frequency from the current scenario
  return `${gameState.currentScenario.recommendedAction.gtoFrequency}%`
}

const getGTOReasoning = (gameState: TrainingGameState | null, handResult: any): string => {
  if (!gameState || !handResult) return '无分析'
  
  // Enhanced reasoning based on position, stack depth, and game stage
  const reasoning = gameState.currentScenario.recommendedAction.reasoning
  
  // Add context about position and stage
  const heroPlayer = gameState.players.find(p => p.id === 'hero')
  const position = heroPlayer?.position || 'unknown'
  const stage = gameState.stage
  
  return `${reasoning} 在${stage}阶段从${position}位置，这个决策符合平衡策略。`
}

const TrainingSimulator: React.FC = () => {
  const [gameState, setGameState] = useState<TrainingGameState | null>(null)
  const [isWaitingForAction, setIsWaitingForAction] = useState(false)
  const [showGtoHint, setShowGtoHint] = useState(false)
  const [currentTab, setCurrentTab] = useState<'performance' | 'strategy' | 'options' | ''>('')
  const [gameMessage, setGameMessage] = useState<string>('')
  const [handResult, setHandResult] = useState<any>(null)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('general')
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [actionHistory, setActionHistory] = useState<PlayerActionDisplay[]>([])
  const [practicePosition, setPracticePosition] = useState(3) // Default to button position
  const [showPositionSelector, setShowPositionSelector] = useState(false)
  
  // 倒计时相关状态
  const [countdownTime, setCountdownTime] = useState(10)
  const [isCountdownPaused, setIsCountdownPaused] = useState(false)
  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null)

  // Initialize training scenario
  useEffect(() => {
    initializeTrainingScenario()
  }, [practicePosition, trainingMode])

  // Auto-process AI actions when needed
  useEffect(() => {
    if (gameState && !isWaitingForAction && !isProcessingAction && !handResult) {
      processAITurnsIfNeeded()
    }
  }, [gameState, isWaitingForAction, isProcessingAction, handResult])

  // 倒计时管理
  useEffect(() => {
    if (handResult && !isCountdownPaused) {
      // 开始倒计时
      setCountdownTime(10)
      const timer = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            // 倒计时结束，自动关闭面板
            setHandResult(null)
            initializeTrainingScenario()
            return 10
          }
          return prev - 1
        })
      }, 1000)
      
      setCountdownTimer(timer)
      
      return () => {
        if (timer) clearInterval(timer)
      }
    } else if (!handResult && countdownTimer) {
      // 清理倒计时
      clearInterval(countdownTimer)
      setCountdownTimer(null)
      setCountdownTime(10)
      setIsCountdownPaused(false)
    }
  }, [handResult, isCountdownPaused])

  // 暂停/继续倒计时
  const toggleCountdown = () => {
    setIsCountdownPaused(!isCountdownPaused)
  }

  // 手动关闭面板
  const closeResultPanel = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      setCountdownTimer(null)
    }
    setHandResult(null)
    setCountdownTime(10)
    setIsCountdownPaused(false)
    initializeTrainingScenario()
  }

  const initializeTrainingScenario = () => {
    const newGameState = TrainingGameEngine.generateNextScenario(trainingMode, practicePosition)
    setGameState(newGameState)
    setIsWaitingForAction(true)
    setHandResult(null)
    setGameMessage('')
    setIsProcessingAction(false)
    setActionHistory([]) // 重置操作历史
  }

  const getValidActions = (): ActionType[] => {
    if (!gameState || !isWaitingForAction) return []
    
    const heroPlayer = gameState.players.find(p => p.id === 'hero')
    if (!heroPlayer) return []
    
    const actions: ActionType[] = ['fold']
    const currentBet = Math.max(...gameState.players.map(p => p.currentBet))
    
    if (heroPlayer.currentBet === currentBet) {
      actions.push('check')
    } else {
      actions.push('call')
    }
    
    if (heroPlayer.stack > 0) {
      actions.push('raise', 'all-in')
    }
    
    return actions
  }

  const handlePlayerAction = async (action: PlayerAction) => {
    if (!gameState || isProcessingAction) return
    
    console.log('Player action:', action)
    setIsProcessingAction(true)
    setIsWaitingForAction(false)
    
    // 记录玩家操作到历史中
    const heroPlayer = gameState.players.find(p => p.id === 'hero')
    if (heroPlayer) {
      const actionRecord: PlayerActionDisplay = {
        playerId: heroPlayer.id,
        playerName: heroPlayer.name,
        action: action.type,
        amount: action.amount,
        position: heroPlayer.position,
        timestamp: Date.now()
      }
      setActionHistory(prev => [...prev, actionRecord])
    }
    
    try {
      // Process the player action through game engine
      const result: GameProgressResult = await TrainingGameEngine.processPlayerAction(
        gameState, 
        action.type, 
        action.amount
      )

      // Update game state
      setGameState(result.gameState)

      // 记录游戏引擎返回的AI操作到历史中
      if (result.aiActions && result.aiActions.length > 0) {
        const aiActionRecords = result.aiActions.map(aiAction => ({
          playerId: aiAction.playerId,
          playerName: aiAction.playerName,
          action: aiAction.action,
          amount: aiAction.amount,
          position: aiAction.position,
          timestamp: Date.now() + Math.random() * 100 // 稍微错开时间戳
        }))
        setActionHistory(prev => [...prev, ...aiActionRecords])
      }

      // Handle different game progression results
      if (result.isHandComplete && result.handResult) {
        // Hand is complete - show results
        setHandResult(result.handResult)
        setGameMessage(result.handResult.analysis)
        
        // 现在使用倒计时来控制自动关闭，不需要setTimeout
        
      } else if (result.nextAction === 'wait_for_player') {
        // Wait for next player action
        setIsWaitingForAction(true)
        setIsProcessingAction(false)
        if (result.message) {
          setGameMessage(result.message)
        }
        
      } else if (result.nextAction === 'ai_action') {
        // AI is thinking - will be handled by game engine
        setGameMessage('对手思考中...')
        setIsProcessingAction(false)
        
      } else if (result.nextAction === 'next_street') {
        // Moving to next street
        setGameMessage(result.message || '进入下一街道')
        setIsWaitingForAction(true)
        setIsProcessingAction(false)
      }
      
    } catch (error) {
      console.error('Error processing player action:', error)
      setIsProcessingAction(false)
      setIsWaitingForAction(true)
    }
  }

  const replayCurrentHand = () => {
    initializeTrainingScenario()
  }

  const practiceNextHand = () => {
    // Generate a new training scenario
    initializeTrainingScenario()
  }

  const toggleGtoHint = () => {
    setShowGtoHint(!showGtoHint)
  }

  const getTrainingModeDisplayName = (mode: TrainingMode): string => {
    const modeNames = {
      general: '综合训练',
      position: '位置专项',
      stack_depth: '筹码深度',
      opponent_type: '对手类型',
      special_spots: '特殊场景',
      multiway: '多人奖池',
      river_bluff: '河牌诈唬',
      defense: '防守训练',
      time_pressure: '限时训练'
    }
    return modeNames[mode]
  }

  const trainingModes: { mode: TrainingMode; name: string; description: string; icon: string }[] = [
    { mode: 'general', name: '综合训练', description: '全面的GTO策略练习', icon: '🎯' },
    { mode: 'position', name: '位置专项', description: '不同位置的策略差异', icon: '📍' },
    { mode: 'stack_depth', name: '筹码深度', description: '深资源vs浅资源策略', icon: '💰' },
    { mode: 'opponent_type', name: '对手类型', description: '针对不同风格的调整', icon: '👥' },
    { mode: 'special_spots', name: '特殊场景', description: '3bet pot, 4bet pot等', icon: '⚡' },
    { mode: 'multiway', name: '多人奖池', description: '3+人参与的复杂决策', icon: '👫' },
    { mode: 'river_bluff', name: '河牌诈唬', description: '河牌圈的诈唬艺术', icon: '🎭' },
    { mode: 'defense', name: '防守训练', description: '应对激进对手', icon: '🛡️' },
    { mode: 'time_pressure', name: '限时训练', description: '快速决策能力', icon: '⏰' }
  ]

  const practicePositions: { index: number; name: string; code: string; description: string; icon: string }[] = [
    { index: 0, name: 'UTG', code: 'utg', description: '枪口位 - 最早行动', icon: '🎯' },
    { index: 1, name: '中位', code: 'mp', description: '中间位置 - 平衡策略', icon: '🎲' },
    { index: 2, name: '后位', code: 'co', description: '后位 - 更多机会', icon: '🎪' },
    { index: 3, name: '庄位', code: 'button', description: '按钮位 - 最有利', icon: '👑' },
    { index: 4, name: '小盲', code: 'sb', description: '小盲注 - 被动位置', icon: '💎' },
    { index: 5, name: '大盲', code: 'bb', description: '大盲注 - 防守位置', icon: '🔥' }
  ]

  const handleModeChange = (newMode: TrainingMode) => {
    setTrainingMode(newMode)
    setShowModeSelector(false)
    // 切换模式后重新初始化场景
    setTimeout(() => {
      initializeTrainingScenario()
    }, 100)
  }

  const handlePositionChange = (newPosition: number) => {
    setPracticePosition(newPosition)
    setShowPositionSelector(false)
    // 切换位置后重新初始化场景
    setTimeout(() => {
      initializeTrainingScenario()
    }, 100)
  }

  const getCurrentPositionName = (): string => {
    const position = practicePositions.find(p => p.index === practicePosition)
    return position ? position.name : '未知'
  }

  const processAITurnsIfNeeded = async () => {
    if (!gameState || isWaitingForAction || isProcessingAction || handResult) {
      console.log('AI处理跳过:', {
        hasGameState: !!gameState,
        isWaitingForAction,
        isProcessingAction,
        hasHandResult: !!handResult
      })
      return
    }
    
    // Check if it's the hero's turn
    const currentPlayerIndex = gameState.currentPlayer
    const currentPlayer = gameState.players[currentPlayerIndex]
    
    console.log('AI处理检查:', {
      currentPlayerIndex,
      currentPlayerName: currentPlayer?.name,
      currentPlayerPosition: currentPlayer?.position,
      currentPlayerId: currentPlayer?.id,
      isFolded: currentPlayer?.folded,
      gameStage: gameState.stage
    })
    
    // 安全检查：确保currentPlayer存在且索引有效
    if (!currentPlayer || currentPlayerIndex < 0 || currentPlayerIndex >= gameState.players.length) {
      console.error('Invalid current player index:', currentPlayerIndex, 'players:', gameState.players.length)
      setIsWaitingForAction(true)
      return
    }
    
    // 检查玩家是否已弃牌
    if (currentPlayer.folded) {
      console.warn('Current player is folded, skipping:', currentPlayer.name)
      setIsWaitingForAction(true)
      return
    }
    
    if (currentPlayer.id === 'hero') {
      console.log('轮到英雄玩家，等待用户操作')
      setIsWaitingForAction(true)
      return
    }
    
    console.log('开始处理AI操作:', currentPlayer.name, currentPlayer.position)
    
    // Process AI actions automatically
    setIsProcessingAction(true)
    
    try {
      // Simulate AI thinking delay - 缩短为更快的训练体验
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
      
      // Get AI action
      const aiAction = getAIAction(currentPlayer)
      
      console.log('AI操作决策:', {
        playerName: currentPlayer.name,
        action: aiAction.type,
        amount: aiAction.amount
      })
      
      // 验证AI操作的有效性
      if (!aiAction || !aiAction.type) {
        console.error('Invalid AI action:', aiAction, 'for player:', currentPlayer.name)
        setIsProcessingAction(false)
        setIsWaitingForAction(true)
        return
      }
      
      // Process the action through game engine
      const result = await TrainingGameEngine.processPlayerAction(
        gameState,
        aiAction.type,
        aiAction.amount
      )
      
      console.log('游戏引擎处理结果:', {
        nextAction: result.nextAction,
        isHandComplete: result.isHandComplete,
        newCurrentPlayer: result.gameState?.currentPlayer,
        newCurrentPlayerName: result.gameState?.players[result.gameState?.currentPlayer]?.name
      })
      
      // 验证result的有效性
      if (!result || !result.gameState) {
        console.error('Invalid game engine result:', result)
        setIsProcessingAction(false)
        setIsWaitingForAction(true)
        return
      }
      
      setGameState(result.gameState)
      
      if (result.isHandComplete && result.handResult) {
        setHandResult(result.handResult)
        setGameMessage(result.handResult.analysis)
        setIsProcessingAction(false)
        console.log('手牌结束，显示结果面板')
        // 现在使用倒计时来控制自动关闭
      } else {
        setIsProcessingAction(false)
        // 添加超时保护，防止无限递归
        if (result.nextAction === 'ai_action') {
          console.log('继续AI操作，100ms后重新检查')
          setTimeout(() => {
            // 再次检查状态，防止重复处理
            if (!isProcessingAction && !handResult) {
              processAITurnsIfNeeded()
            }
          }, 100)
        } else if (result.nextAction === 'wait_for_player') {
          console.log('等待玩家操作')
          setIsWaitingForAction(true)
        } else {
          // 未知状态，默认等待玩家操作
          console.warn('Unknown next action:', result.nextAction, '默认等待玩家操作')
          setIsWaitingForAction(true)
        }
      }
    } catch (error) {
      console.error('AI处理异常:', error, 'player:', currentPlayer.name)
      setIsProcessingAction(false)
      setIsWaitingForAction(true)
    }
  }
  
  const getAIAction = (player: any): { type: ActionType, amount?: number } => {
    if (!gameState) {
      console.error('getAIAction called without gameState')
      return { type: 'fold' }
    }
    
    // Simple AI logic
    const random = Math.random()
    const currentBet = Math.max(...gameState.players.map(p => p.currentBet))
    const callAmount = currentBet - player.currentBet
    
    console.log('AI决策分析:', {
      playerName: player.name,
      playerPosition: player.position,
      playerCurrentBet: player.currentBet,
      currentBet,
      callAmount,
      playerStack: player.stack,
      random: random.toFixed(3)
    })
    
    if (callAmount === 0) {
      // Can check
      if (random < 0.6) {
        console.log('AI选择: CHECK')
        return { type: 'check' }
      }
      if (random < 0.85) {
        const raiseAmount = Math.min(gameState.minRaise, player.stack)
        console.log('AI选择: RAISE', raiseAmount)
        return { type: 'raise', amount: raiseAmount }
      }
      console.log('AI选择: FOLD (无需跟注时)')
      return { type: 'fold' }
    } else {
      // Need to call or fold
      if (callAmount > player.stack) {
        console.log('AI选择: ALL-IN (跟注超过筹码)')
        return { type: 'all-in', amount: player.stack }
      }
      if (random < 0.5) {
        console.log('AI选择: CALL', callAmount)
        return { type: 'call' }
      }
      if (random < 0.75) {
        const raiseAmount = Math.min(currentBet * 2, player.stack)
        console.log('AI选择: RAISE', raiseAmount)
        return { type: 'raise', amount: raiseAmount }
      }
      console.log('AI选择: FOLD (需要跟注时)')
      return { type: 'fold' }
    }
  }

  if (!gameState) {
    return <div className="min-h-screen bg-poker-bg-dark flex items-center justify-center">
      <div className="text-poker-text-primary">正在加载训练场景...</div>
    </div>
  }

  return (
    <>
      <Head>
        <title>GTO训练模拟器 - AI策略决策训练系统</title>
        <meta name="description" content="实时策略决策GTO训练" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>

      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden relative">
        {/* Safe Area Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        
        {/* Fixed Header Section */}
        <header className="flex-shrink-0 relative z-30">
          {/* Mobile Header */}
          <div className="md:hidden bg-black/40 backdrop-blur-xl border-b border-white/10">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Link 
                    href="/gto-hall" 
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors active:scale-95"
                  >
                    <span className="text-white text-lg">←</span>
                  </Link>
                  <div className="text-white text-sm font-medium">GTO训练</div>
                </div>
                <div className="flex items-center space-x-1 bg-emerald-500/20 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-300 text-xs font-medium">在线</span>
                </div>
              </div>
              {/* 移动端选择器按钮区域 */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  className="flex-1 px-3 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-white/90 text-xs hover:bg-blue-500/30 transition-all active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span>{getTrainingModeDisplayName(trainingMode)}</span>
                    <span className="text-blue-300">▼</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowPositionSelector(!showPositionSelector)}
                  className="flex-1 px-3 py-2 bg-green-500/20 border border-green-400/30 rounded-lg text-white/90 text-xs hover:bg-green-500/30 transition-all active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span>{getCurrentPositionName()} 练习</span>
                    <span className="text-green-300">▼</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex bg-black/30 backdrop-blur-xl border-b border-white/10 px-6 py-4 items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link 
                href="/gto-hall" 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors group"
              >
                <span className="text-white text-lg group-hover:transform group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-white/90 text-sm font-medium">返回大厅</span>
              </Link>
              
              <div className="h-8 w-px bg-white/20"></div>
              
              <div className="flex flex-col">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-white">GTO策略训练</h1>
                  <button
                    onClick={() => setShowModeSelector(!showModeSelector)}
                    className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg text-white/90 text-sm hover:bg-white/10 transition-all"
                  >
                    {getTrainingModeDisplayName(trainingMode)} ▼
                  </button>
                  <button
                    onClick={() => setShowPositionSelector(!showPositionSelector)}
                    className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg text-white/90 text-sm hover:bg-white/10 transition-all"
                  >
                    {getCurrentPositionName()} 练习 ▼
                  </button>
                </div>
                <div className="text-white/70 text-sm">
                  {gameState.currentScenario.description} • 正确率 {gameState.trainingProgress.handsPlayed > 0 
                    ? Math.round((gameState.trainingProgress.correctDecisions / gameState.trainingProgress.handsPlayed) * 100) 
                    : 0}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-300 text-sm font-medium">训练进行中</span>
                </div>
                <div className="h-4 w-px bg-white/20"></div>
                <div className="text-white text-sm">
                  已完成 <span className="font-bold text-blue-300">{gameState.trainingProgress.handsPlayed}</span> 手
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Game Area - Fixed Height */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          {/* Action History - Fixed Height */}
          <div className="flex-shrink-0 px-4 py-3 bg-black/20">
            <ActionHistory 
              actions={actionHistory}
              currentPlayer={gameState?.players.find(p => p.id === 'hero')?.id}
            />
          </div>

          {/* Poker Table - Flexible */}
          <div className="flex-1 min-h-0 relative">
            <TrainingPokerTable
              gameState={gameState}
              currentPlayerId="hero"
              onPlayerAction={handlePlayerAction}
              showAllCards={!!handResult} // 手牌结束时显示所有非弃牌玩家的手牌
              readOnly={!!handResult}
            />
          </div>

          {/* Dynamic Message Area - Fixed Position */}
          <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none">
            <div className="flex flex-col items-center space-y-3">
              {/* GTO Analysis Panel */}
              {showGtoHint && (
                <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-400/30 rounded-2xl p-4 shadow-xl max-w-md w-full pointer-events-auto">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <span className="text-white font-semibold text-sm">GTO建议</span>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-3 mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white/80 text-xs">推荐</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        gameState.currentScenario.recommendedAction.action === 'fold' ? 'bg-red-500/20 text-red-300' :
                        gameState.currentScenario.recommendedAction.action === 'call' ? 'bg-green-500/20 text-green-300' :
                        'bg-orange-500/20 text-orange-300'
                      }`}>
                        {gameState.currentScenario.recommendedAction.action.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-white/90 text-xs leading-relaxed">
                      {gameState.currentScenario.recommendedAction.reasoning}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 text-xs">频率</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                          style={{ width: `${gameState.currentScenario.recommendedAction.gtoFrequency}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-semibold text-xs">
                        {gameState.currentScenario.recommendedAction.gtoFrequency}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Game Messages */}
              {gameMessage && (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl px-4 py-2 shadow-lg pointer-events-auto">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-white font-medium text-sm">{gameMessage}</span>
                  </div>
                </div>
              )}

              {/* Enhanced Hand Result Panel - 全屏模态框 */}
              {handResult && (
                <div 
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto z-50"
                  onClick={(e) => {
                    // 点击背景关闭面板
                    if (e.target === e.currentTarget) {
                      closeResultPanel()
                    }
                  }}
                >
                  <div className="bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 max-w-sm sm:max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-hidden">
                  {/* Header Section - 移动端优化 */}
                  <div className={`
                    px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10
                    ${handResult.heroResult === 'win' 
                      ? 'bg-gradient-to-r from-emerald-500/30 to-green-500/20' 
                      : 'bg-gradient-to-r from-red-500/30 to-red-500/20'
                    }
                  `}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="text-2xl sm:text-3xl">
                          {handResult.heroResult === 'win' ? '🎉' : '💔'}
                        </div>
                        <div>
                          <div className="text-lg sm:text-xl font-bold text-white">
                            {handResult.heroResult === 'win' ? '成功!' : '失败'}
                          </div>
                          <div className="text-xs sm:text-sm opacity-80 text-white/90">
                            奖池: ¥{Math.round(gameState?.pot || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 sm:space-x-3 flex-wrap">
                        <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border ${
                          handResult.showdown 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' 
                            : 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                        }`}>
                          {handResult.showdown ? '🎯 结算' : '💭 退出'}
                        </div>
                        
                        {/* 倒计时显示和控制 - 移动端优化 */}
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {/* 倒计时显示 */}
                          <div className="flex items-center space-x-1 bg-white/10 px-1.5 sm:px-2 py-1 rounded-full border border-white/20">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isCountdownPaused ? 'bg-orange-400' : 'bg-green-400'} animate-pulse`}></div>
                            <span className="text-white text-xs sm:text-sm font-mono">
                              {countdownTime}s
                            </span>
                          </div>
                          
                          {/* 暂停/继续按钮 */}
                          <button
                            onClick={toggleCountdown}
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-full transition-all duration-200 group"
                            title={isCountdownPaused ? "继续倒计时" : "暂停倒计时"}
                          >
                            {isCountdownPaused ? (
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/60 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/60 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                              </svg>
                            )}
                          </button>
                          
                          {/* 关闭按钮 */}
                          <button
                            onClick={closeResultPanel}
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-full transition-all duration-200 group"
                            title="关闭面板"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/60 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Sections - 可滚动内容区域 */}
                  <div className="bg-black/40 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Community Cards Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-300">🎰</span>
                        <h3 className="text-base sm:text-lg font-semibold text-white">公共牌</h3>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                        <div className="flex space-x-2 sm:space-x-3 justify-center">
                          {gameState?.communityCards.map((card, index) => (
                            <div key={index} className="w-10 h-14 sm:w-12 sm:h-16 bg-white rounded border border-gray-300 flex flex-col items-center justify-between p-1 shadow-sm">
                              <div className={`text-sm sm:text-base font-bold ${
                                ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'
                              }`}>
                                {card.rank}
                              </div>
                              <div className={`text-xl sm:text-2xl ${
                                ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'
                              }`}>
                                {card.suit === 'hearts' ? '♥' : 
                                 card.suit === 'diamonds' ? '♦' : 
                                 card.suit === 'clubs' ? '♣' : '♠'}
                              </div>
                              <div className={`text-sm sm:text-base font-bold rotate-180 ${
                                ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'
                              }`}>
                                {card.rank}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Player Cards Display Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-300">🃏</span>
                        <h3 className="text-base sm:text-lg font-semibold text-white">玩家手牌</h3>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {gameState?.players
                            .filter(player => !player.folded)
                            .map((player, index) => {
                              // 判断是否为成功方 - 使用winnerId确保只有一个成功者
                              const isWinner = handResult.winnerId === player.id
                              
                              return (
                              <div key={player.id} className={`flex items-center space-x-3 p-2 rounded-lg border-2 transition-all ${
                                isWinner 
                                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/10 border-emerald-400/50 shadow-lg' 
                                  : 'bg-black/20 border-transparent'
                              }`}>
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold relative ${
                                    player.id === 'hero' 
                                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40' 
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                                  }`}>
                                    {player.id === 'hero' ? '👑' : index + 1}
                                    {isWinner && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">🏆</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-medium text-white truncate">
                                      {player.name}
                                    </div>
                                    {isWinner && (
                                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/40 font-medium">
                                        成功
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-white/60">
                                    {player.position} • ${Math.round(player.stack).toLocaleString()}
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  {player.cards?.map((card, cardIndex) => (
                                    <div key={cardIndex} className="w-6 h-8 sm:w-8 sm:h-10 bg-white rounded border border-gray-300 flex flex-col items-center justify-between p-0.5 text-xs shadow-sm">
                                      <div className={`font-bold ${
                                        ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'
                                      }`}>
                                        {card.rank}
                                      </div>
                                      <div className={`text-lg leading-none ${
                                        ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'
                                      }`}>
                                        {card.suit === 'hearts' ? '♥' : 
                                         card.suit === 'diamonds' ? '♦' : 
                                         card.suit === 'clubs' ? '♣' : '♠'}
                                      </div>
                                      <div className={`font-bold rotate-180 ${
                                        ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'
                                      }`}>
                                        {card.rank}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )})}
                        </div>
                      </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-300">📊</span>
                        <h3 className="text-base sm:text-lg font-semibold text-white">牌局分析</h3>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                        <p className="text-white/90 text-sm leading-relaxed">
                          {handResult.analysis}
                        </p>
                      </div>
                    </div>

                    {/* GTO Strategy Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-300">🎯</span>
                        <h3 className="text-base sm:text-lg font-semibold text-white">GTO策略建议</h3>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 rounded-lg p-3 sm:p-4 border border-yellow-400/20">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white/80 text-sm">推荐行动</span>
                            <span className="text-yellow-300 font-semibold text-sm sm:text-base">
                              {getGTORecommendation(gameState, handResult)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/80 text-sm">频率建议</span>
                            <span className="text-white text-sm">
                              {getGTOFrequency(gameState, handResult)}
                            </span>
                          </div>
                          <div className="text-xs text-white/70 mt-2 p-2 bg-black/20 rounded">
                            💡 {getGTOReasoning(gameState, handResult)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics - 移动端优化 */}
                    {gameState?.trainingProgress && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-300">📈</span>
                          <h3 className="text-base sm:text-lg font-semibold text-white">训练统计</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div className="bg-white/5 rounded-lg p-2 sm:p-3 text-center border border-white/10">
                            <div className="text-lg sm:text-2xl font-bold text-blue-300">
                              {Math.round(gameState.trainingProgress.handsPlayed).toLocaleString()}
                            </div>
                            <div className="text-xs text-white/60">总手数</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 sm:p-3 text-center border border-white/10">
                            <div className="text-lg sm:text-2xl font-bold text-green-300">
                              {Math.round((gameState.trainingProgress.correctDecisions / Math.max(gameState.trainingProgress.handsPlayed, 1)) * 100)}%
                            </div>
                            <div className="text-xs text-white/60">准确率</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 sm:p-3 text-center border border-white/10">
                            <div className="text-lg sm:text-2xl font-bold text-yellow-300">
                              {Math.round(gameState.trainingProgress.currentStreak).toLocaleString()}
                            </div>
                            <div className="text-xs text-white/60">连胜</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessingAction && (
                <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl px-4 py-2 shadow-lg pointer-events-auto">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-white font-medium text-sm">处理中...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Fixed Bottom Section */}
        <footer className="flex-shrink-0 relative z-20">
          {/* Quick Actions Bar */}
          <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="px-4 pt-4 pb-2">
              <div className="flex justify-center space-x-3 max-w-sm mx-auto">
                <button
                  onClick={replayCurrentHand}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-purple-500/25 active:scale-95 touch-manipulation"
                >
                  🔄 重练
                </button>
                
                <button
                  onClick={practiceNextHand}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 active:scale-95 touch-manipulation"
                >
                  ▶️ 下一手
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons - 固定高度容器 */}
          <div className="bg-black/80 backdrop-blur-xl border-t border-white/10">
            <div className="h-20 flex items-center justify-center py-3">
              {(() => {
                const heroPlayer = gameState?.players.find(p => p.id === 'hero')
                return heroPlayer && !isProcessingAction && !handResult && isWaitingForAction && (
                  <TrainingActionButtons
                    validActions={getValidActions()}
                    currentBet={Math.max(...gameState.players.map(p => p.currentBet))}
                    playerStack={heroPlayer.stack}
                    potSize={gameState.pot}
                    minRaise={gameState.minRaise}
                    onAction={(action) => handlePlayerAction({
                      playerId: 'hero',
                      type: action.type,
                      amount: action.amount
                    })}
                    isWaitingForAction={isWaitingForAction}
                  />
                )
              })()}
            </div>
          </div>

          {/* Collapsible Bottom Panel */}
          <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 safe-area-pb">
            {/* Panel Content */}
            {currentTab === 'performance' && (
              <div className="px-4 py-3">
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-2xl p-4 max-w-sm mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                        </svg>
                      </div>
                      <span className="text-white font-semibold text-sm">训练统计</span>
                    </div>
                    <button 
                      onClick={() => setCurrentTab('')}
                      className="text-white/60 hover:text-white p-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-white mb-1">
                        {gameState.trainingProgress.handsPlayed}
                      </div>
                      <div className="text-white/70 text-xs">练习手牌</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-emerald-300 mb-1">
                        {gameState.trainingProgress.correctDecisions}
                      </div>
                      <div className="text-white/70 text-xs">正确决策</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 text-xs">正确率</span>
                      <span className="text-emerald-300 font-bold text-sm">
                        {gameState.trainingProgress.handsPlayed > 0 
                          ? Math.round((gameState.trainingProgress.correctDecisions / gameState.trainingProgress.handsPlayed) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-green-400 transition-all duration-500"
                        style={{ 
                          width: `${gameState.trainingProgress.handsPlayed > 0 
                            ? (gameState.trainingProgress.correctDecisions / gameState.trainingProgress.handsPlayed) * 100 
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-white/80 text-xs">连胜</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-orange-300 font-bold text-sm">
                          {gameState.trainingProgress.currentStreak}
                        </span>
                        <span className="text-orange-300 text-xs">🔥</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Options Panel */}
            {currentTab === 'options' && (
              <div className="px-4 py-3">
                <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-2xl p-4 max-w-sm mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-5 h-5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-2">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </div>
                      <span className="text-white font-semibold text-sm">训练设置</span>
                    </div>
                    <button 
                      onClick={() => setCurrentTab('')}
                      className="text-white/60 hover:text-white p-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <span className="text-white text-sm">GTO提示</span>
                      <button
                        onClick={toggleGtoHint}
                        className={`relative w-10 h-5 rounded-full transition-all duration-200 ${
                          showGtoHint ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                          showGtoHint ? 'translate-x-5' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (confirm('重置训练进度？')) {
                          initializeTrainingScenario()
                          setCurrentTab('')
                        }
                      }}
                      className="w-full py-2.5 text-sm text-white font-medium bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/30 rounded-lg hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200"
                    >
                      重置进度
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Bar */}
            <div className="flex items-center justify-around px-2 py-3">
              <button
                onClick={() => setCurrentTab(currentTab === 'performance' ? '' : 'performance')}
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${
                  currentTab === 'performance' 
                    ? 'bg-blue-500/20 text-blue-300 scale-105' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                <span className="text-xs font-medium">表现</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('')
                  toggleGtoHint()
                }}
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${
                  showGtoHint
                    ? 'bg-purple-500/20 text-purple-300 scale-105' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-xs font-medium">策略</span>
              </button>

              <button
                onClick={() => setCurrentTab(currentTab === 'options' ? '' : 'options')}
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${
                  currentTab === 'options' 
                    ? 'bg-emerald-500/20 text-emerald-300 scale-105' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                <span className="text-xs font-medium">选项</span>
              </button>
            </div>
          </div>
        </footer>

        {/* Overlay Layer - Dropdowns and Modals */}
        <div className="absolute inset-0 pointer-events-none z-40">
          {/* Training Mode Selector Dropdown */}
          {showModeSelector && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
              <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl max-w-4xl w-full max-h-[70vh] overflow-y-auto">
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">选择训练模式</h3>
                    <button
                      onClick={() => setShowModeSelector(false)}
                      className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {trainingModes.map((mode) => (
                      <button
                        key={mode.mode}
                        onClick={() => handleModeChange(mode.mode)}
                        className={`text-left p-3 md:p-4 rounded-xl transition-all duration-200 border ${
                          trainingMode === mode.mode
                            ? 'bg-blue-500/20 border-blue-400/50 text-white scale-105'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 active:scale-95'
                        }`}
                      >
                        <div className="flex items-start space-x-2 md:space-x-3">
                          <span className="text-xl md:text-2xl">{mode.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm md:text-base mb-1">{mode.name}</div>
                            <div className="text-xs md:text-sm opacity-80">{mode.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Position Selector Dropdown */}
          {showPositionSelector && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
              <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl max-w-2xl w-full max-h-[70vh] overflow-y-auto">
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">选择练习位置</h3>
                    <button
                      onClick={() => setShowPositionSelector(false)}
                      className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    {practicePositions.map((position) => (
                      <button
                        key={position.index}
                        onClick={() => handlePositionChange(position.index)}
                        className={`text-left p-3 md:p-4 rounded-xl transition-all duration-200 border ${
                          practicePosition === position.index
                            ? 'bg-green-500/20 border-green-400/50 text-white scale-105'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 active:scale-95'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-2xl">{position.icon}</span>
                          <div className="text-center">
                            <div className="font-semibold text-sm mb-1">{position.name}</div>
                            <div className="text-xs opacity-80">{position.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </>
  )
}

export default TrainingSimulator