import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Row, Col, Badge, Tooltip, Progress } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  SettingOutlined, 
  CloseOutlined,
  FullscreenOutlined,
  SoundOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  TableOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { CompactHandHistory, HandSnapshot } from '@/types/hand-history';
import { GameStage } from '@/types/poker';
import { ReplayControls } from './ReplayControls';
import { GtoAnalysisPanel } from './GtoAnalysisPanel';
import PokerTable from '@/components/PokerTable';

const { Title, Text } = Typography;

interface HandReplayViewerProps {
  handHistory: CompactHandHistory;
  onClose?: () => void;
  autoPlay?: boolean;
}

interface ReplayState {
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
  showAnalysis: boolean;
  totalSteps: number;
  isFullscreen: boolean;
  soundEnabled: boolean;
  autoAdvance: boolean;
}

/**
 * 手牌回放查看器
 * 完整重现牌局过程，支持暂停、快进、分析
 */
export const HandReplayViewer: React.FC<HandReplayViewerProps> = ({
  handHistory,
  onClose,
  autoPlay = false
}) => {
  const [replayState, setReplayState] = useState<ReplayState>({
    currentStep: 0,
    isPlaying: autoPlay,
    playbackSpeed: 1,
    showAnalysis: false,
    totalSteps: 0,
    isFullscreen: false,
    soundEnabled: true,
    autoAdvance: true
  });

  const [currentGameState, setCurrentGameState] = useState<any>(null);
  const [replaySteps, setReplaySteps] = useState<ReplayStep[]>([]);

  // 初始化回放数据
  useEffect(() => {
    try {
      // 简化回放步骤生成
      const mockSteps: ReplayStep[] = [
        {
          stepNumber: 0,
          timestamp: handHistory.timestamp,
          gameState: {
            id: handHistory.gameId,
            players: handHistory.players.map(p => ({
              id: p.id,
              name: p.id,
              stack: p.stackSize,
              position: p.position,
              cards: p.cards,
              folded: false,
              isAllIn: false,
              currentBet: 0
            })),
            dealer: 0,
            smallBlind: handHistory.blinds[0],
            bigBlind: handHistory.blinds[1],
            pot: handHistory.result.potSize,
            communityCards: [],
            stage: 'preflop' as const,
            currentPlayer: 0,
            minRaise: handHistory.blinds[1] * 2,
            lastRaise: handHistory.blinds[1]
          },
          description: '牌局开始',
          stage: 'preflop'
        },
        {
          stepNumber: 1,
          timestamp: handHistory.timestamp + 30000,
          gameState: {
            id: handHistory.gameId,
            players: handHistory.players.map(p => ({
              id: p.id,
              name: p.id,
              stack: p.stackSize,
              position: p.position,
              cards: p.cards,
              folded: false,
              isAllIn: false,
              currentBet: 0
            })),
            dealer: 0,
            smallBlind: handHistory.blinds[0],
            bigBlind: handHistory.blinds[1],
            pot: handHistory.result.potSize,
            communityCards: [],
            stage: 'showdown' as const,
            currentPlayer: 0,
            minRaise: handHistory.blinds[1] * 2,
            lastRaise: handHistory.blinds[1]
          },
          description: `牌局结束 - ${handHistory.result.winners.join(', ')} 获胜`,
          stage: 'showdown'
        }
      ];
      
      setReplaySteps(mockSteps);
      setReplayState(prev => ({ ...prev, totalSteps: mockSteps.length }));
      
      if (mockSteps.length > 0) {
        setCurrentGameState(mockSteps[0].gameState);
      }
    } catch (error) {
      console.error('Error initializing replay steps:', error);
      // 设置最小的回放状态
      setReplayState(prev => ({ ...prev, totalSteps: 1 }));
    }
  }, [handHistory]);

  // 自动播放控制
  useEffect(() => {
    if (!replayState.isPlaying || replayState.currentStep >= replayState.totalSteps - 1) {
      return;
    }

    const interval = setInterval(() => {
      setReplayState(prev => {
        const nextStep = prev.currentStep + 1;
        if (nextStep >= prev.totalSteps) {
          return { ...prev, currentStep: prev.totalSteps - 1, isPlaying: false };
        }
        return { ...prev, currentStep: nextStep };
      });
    }, 1000 / replayState.playbackSpeed);

    return () => clearInterval(interval);
  }, [replayState.isPlaying, replayState.currentStep, replayState.playbackSpeed, replayState.totalSteps]);

  // 当步骤改变时更新游戏状态
  useEffect(() => {
    if (replaySteps.length > 0 && replayState.currentStep < replaySteps.length) {
      const step = replaySteps[replayState.currentStep];
      setCurrentGameState(step.gameState);
    }
  }, [replayState.currentStep, replaySteps]);

  // 播放控制处理
  const handlePlay = useCallback(() => {
    setReplayState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const handlePause = useCallback(() => {
    setReplayState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handleStepBackward = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
      isPlaying: false
    }));
  }, []);

  const handleStepForward = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      currentStep: Math.min(prev.totalSteps - 1, prev.currentStep + 1),
      isPlaying: false
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setReplayState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setReplayState(prev => ({ ...prev, currentStep: step, isPlaying: false }));
  }, []);

  const toggleAnalysis = useCallback(() => {
    setReplayState(prev => ({ ...prev, showAnalysis: !prev.showAnalysis }));
  }, []);

  const getCurrentStep = (): ReplayStep | null => {
    if (replaySteps.length === 0 || replayState.currentStep >= replaySteps.length) {
      return null;
    }
    return replaySteps[replayState.currentStep];
  };

  const getProgressPercentage = (): number => {
    if (replayState.totalSteps === 0) return 0;
    return (replayState.currentStep / (replayState.totalSteps - 1)) * 100;
  };

  const currentStep = getCurrentStep();
  const progressPercentage = getProgressPercentage();

  const toggleFullscreen = useCallback(() => {
    setReplayState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const toggleSound = useCallback(() => {
    setReplayState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for handled keys
      const handledKeys = ['Space', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'KeyA', 'KeyF', 'KeyM'];
      if (handledKeys.includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'Space':
          // Play/Pause
          if (replayState.isPlaying) {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case 'ArrowLeft':
          // Step backward
          if (replayState.currentStep > 0) {
            handleStepBackward();
          }
          break;
        case 'ArrowRight':
          // Step forward
          if (replayState.currentStep < replayState.totalSteps - 1) {
            handleStepForward();
          }
          break;
        case 'Home':
          // Jump to start
          setReplayState(prev => ({ ...prev, currentStep: 0, isPlaying: false }));
          break;
        case 'End':
          // Jump to end
          setReplayState(prev => ({ ...prev, currentStep: prev.totalSteps - 1, isPlaying: false }));
          break;
        case 'KeyA':
          // Toggle analysis
          toggleAnalysis();
          break;
        case 'KeyF':
          // Toggle fullscreen
          toggleFullscreen();
          break;
        case 'KeyM':
          // Toggle mute
          toggleSound();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          // Speed shortcuts
          const speeds = [0.5, 1, 1.5, 2];
          const speedIndex = parseInt(event.code.slice(-1)) - 1;
          if (speeds[speedIndex]) {
            handleSpeedChange(speeds[speedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replayState, handlePlay, handlePause, handleStepBackward, handleStepForward, handleSpeedChange, toggleAnalysis, toggleFullscreen, toggleSound]);

  const formatTime = (step: number): string => {
    const minutes = Math.floor(step / 60);
    const seconds = step % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`hand-replay-viewer ${replayState.isFullscreen ? 'fullscreen' : ''} min-h-screen bg-poker-bg-dark flex flex-col`}>
      {/* Enhanced Header */}
      <div className="bg-poker-bg-card border-b border-poker-border-default">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Row justify="space-between" align="middle">
            <Col>
              <Space size="large">
                <div>
                  <Title level={4} className="text-poker-text-primary mb-1">
                    手牌回放: #{handHistory.id.slice(-8)}
                  </Title>
                  <div className="flex items-center space-x-4 text-sm text-poker-text-secondary">
                    <span>{new Date(handHistory.timestamp).toLocaleString()}</span>
                    <Badge count={`${handHistory.blinds.join('/')}`} style={{ backgroundColor: 'var(--poker-blue)' }} />
                    <span>{handHistory.players.length} 玩家</span>
                    <span className={handHistory.result.winners.includes(0) ? 'text-poker-win' : 'text-poker-red'}>
                      {handHistory.result.winners.includes(0) ? '获胜' : '失败'}
                    </span>
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title={
                  <div className="space-y-1 text-xs">
                    <div><kbd className="px-1 bg-gray-800 rounded">空格</kbd> 播放/暂停</div>
                    <div><kbd className="px-1 bg-gray-800 rounded">←→</kbd> 单步控制</div>
                    <div><kbd className="px-1 bg-gray-800 rounded">Home/End</kbd> 跳转</div>
                    <div><kbd className="px-1 bg-gray-800 rounded">A</kbd> 分析 <kbd className="px-1 bg-gray-800 rounded">F</kbd> 全屏 <kbd className="px-1 bg-gray-800 rounded">M</kbd> 静音</div>
                    <div><kbd className="px-1 bg-gray-800 rounded">1-4</kbd> 播放速度</div>
                  </div>
                } placement="bottomRight">
                  <Button 
                    type="text" 
                    icon={<QuestionCircleOutlined />}
                    className="text-poker-text-secondary hover:text-poker-secondary"
                  />
                </Tooltip>
                <Tooltip title="音效 (M)">
                  <Button 
                    type="text" 
                    icon={<SoundOutlined />}
                    className={`${replayState.soundEnabled ? 'text-poker-secondary' : 'text-poker-text-secondary'} hover:text-poker-secondary`}
                    onClick={toggleSound}
                  />
                </Tooltip>
                <Tooltip title="全屏 (F)">
                  <Button 
                    type="text" 
                    icon={<FullscreenOutlined />}
                    className="text-poker-text-secondary hover:text-poker-secondary"
                    onClick={toggleFullscreen}
                  />
                </Tooltip>
                <Tooltip title={`${replayState.showAnalysis ? '隐藏分析' : '显示分析'} (A)`}>
                  <Button 
                    type="text" 
                    icon={<BarChartOutlined />}
                    className={`${replayState.showAnalysis ? 'text-poker-secondary' : 'text-poker-text-secondary'} hover:text-poker-secondary`}
                    onClick={toggleAnalysis}
                  />
                </Tooltip>
                {onClose && (
                  <Button 
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={onClose}
                    className="text-poker-text-secondary hover:text-poker-red"
                  >
                    关闭
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Poker Table Section */}
        <div className={`flex-1 flex flex-col ${replayState.showAnalysis ? 'pr-4' : ''}`}>
          {/* Game Stage Indicators */}
          <div className="bg-poker-bg-elevated border-b border-poker-border-default px-6 py-2">
            <div className="stage-markers">
              {['翻牌前', '翻牌', '转牌', '河牌'].map((stage, index) => (
                <div
                  key={stage}
                  className={`stage-marker ${index <= (currentStep?.stage === 'preflop' ? 0 : 
                    currentStep?.stage === 'flop' ? 1 : 
                    currentStep?.stage === 'turn' ? 2 : 3) ? 'active' : ''}`}
                >
                  {stage}
                </div>
              ))}
            </div>
          </div>

          {/* Poker Table */}
          <div className="flex-1 p-6 bg-poker-bg-dark">
            <Card 
              className="h-full bg-poker-bg-card border-poker-border-default"
              title={
                <div className="flex items-center justify-between">
                  <Space>
                    <TableOutlined className="text-poker-secondary" />
                    <span className="text-poker-text-primary">
                      第 {replayState.currentStep + 1} 步
                    </span>
                    {currentStep && (
                      <Text className="text-poker-text-secondary">
                        {currentStep.description}
                      </Text>
                    )}
                  </Space>
                  <div className="text-poker-text-secondary text-sm">
                    {formatTime(replayState.currentStep)} / {formatTime(replayState.totalSteps - 1)}
                  </div>
                </div>
              }
              bodyStyle={{ height: 'calc(100% - 57px)', padding: '24px' }}
            >
              <div className="h-full relative">
                {currentGameState && (
                  <PokerTable
                    gameState={currentGameState}
                    heroId="hero"
                    readOnly={true}
                    showAllCards={true}
                    showEquity={replayState.showAnalysis}
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Enhanced Timeline and Controls */}
          <div className="bg-poker-bg-card border-t border-poker-border-default p-4">
            {/* Timeline with Action Markers */}
            <div className="poker-timeline">
              <div className="timeline-track" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newStep = Math.round(percentage * (replayState.totalSteps - 1));
                handleStepChange(Math.max(0, Math.min(replayState.totalSteps - 1, newStep)));
              }}>
                <div 
                  className="timeline-progress"
                  style={{ width: `${progressPercentage}%` }}
                />
                <div 
                  className="timeline-cursor"
                  style={{ left: `${progressPercentage}%` }}
                />
                {/* Action markers would go here */}
              </div>
            </div>

            {/* Progress Info */}
            <div className="flex justify-between items-center mb-4 text-sm text-poker-text-secondary">
              <span>步骤 {replayState.currentStep + 1} / {replayState.totalSteps}</span>
              <span>{progressPercentage.toFixed(1)}% 完成</span>
            </div>

            {/* Enhanced Controls */}
            <ReplayControls
              isPlaying={replayState.isPlaying}
              canStepBackward={replayState.currentStep > 0}
              canStepForward={replayState.currentStep < replayState.totalSteps - 1}
              playbackSpeed={replayState.playbackSpeed}
              volume={1}
              isMuted={!replayState.soundEnabled}
              loop={false}
              autoAdvance={replayState.autoAdvance}
              onPlay={handlePlay}
              onPause={handlePause}
              onStepBackward={handleStepBackward}
              onStepForward={handleStepForward}
              onJumpToStart={() => setReplayState(prev => ({ ...prev, currentStep: 0, isPlaying: false }))}
              onJumpToEnd={() => setReplayState(prev => ({ ...prev, currentStep: prev.totalSteps - 1, isPlaying: false }))}
              onSpeedChange={handleSpeedChange}
              onVolumeChange={(volume) => {/* Handle volume change */}}
              onToggleMute={() => setReplayState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              onToggleLoop={() => {/* Handle loop toggle */}}
              onToggleAutoAdvance={() => setReplayState(prev => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
            />
          </div>
        </div>

        {/* GTO Analysis Panel */}
        {replayState.showAnalysis && (
          <div className="w-80 analysis-panel">
            <GtoAnalysisPanel
              handHistory={handHistory}
              currentStep={replayState.currentStep}
              currentGameState={currentGameState}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =================== 辅助函数 ===================

interface ReplayStep {
  stepNumber: number;
  timestamp: number;
  gameState: any;
  action?: {
    playerId: string;
    type: string;
    amount?: number;
  };
  description: string;
  stage: GameStage;
}

function generateReplaySteps(handHistory: CompactHandHistory): ReplayStep[] {
  const steps: ReplayStep[] = [];
  let stepNumber = 0;

  // 初始状态
  steps.push({
    stepNumber: stepNumber++,
    timestamp: handHistory.timestamp,
    gameState: createInitialGameState(handHistory),
    description: '牌局开始，发底牌',
    stage: 'preflop'
  });

  // 根据动作序列生成步骤
  let currentTimestamp = handHistory.timestamp;
  handHistory.actions.forEach((action, index) => {
    currentTimestamp += action.t;
    
    const player = handHistory.players[action.p];
    const actionType = ['fold', 'check', 'call', 'bet', 'raise', 'all-in'][action.a];
    const stage = ['preflop', 'flop', 'turn', 'river'][action.s] as GameStage;

    let description = `${player?.id} ${actionType}`;
    if (action.m) {
      description += ` $${action.m}`;
    }

    steps.push({
      stepNumber: stepNumber++,
      timestamp: currentTimestamp,
      gameState: updateGameStateWithAction(steps[steps.length - 1].gameState, action, handHistory),
      action: {
        playerId: player?.id || '',
        type: actionType,
        amount: action.m
      },
      description,
      stage
    });
  });

  // 添加公共牌步骤
  handHistory.snapshots.forEach(snapshot => {
    if (snapshot.board.length > 0) {
      const stageNames = ['翻牌', '转牌', '河牌'];
      const stageName = stageNames[snapshot.board.length - 3] || '公共牌';
      
      steps.push({
        stepNumber: stepNumber++,
        timestamp: snapshot.timestamp,
        gameState: updateGameStateWithSnapshot(steps[steps.length - 1].gameState, snapshot),
        description: `${stageName}: ${snapshot.board.map(card => `${card.rank}${card.suit[0]}`).join(' ')}`,
        stage: ['flop', 'turn', 'river'][snapshot.stage] as GameStage
      });
    }
  });

  // 结果步骤
  steps.push({
    stepNumber: stepNumber++,
    timestamp: handHistory.timestamp + 60000,
    gameState: updateGameStateWithResult(steps[steps.length - 1].gameState, handHistory.result),
    description: `牌局结束，${handHistory.result.winners.join(', ')} 获胜`,
    stage: 'showdown'
  });

  return steps.sort((a, b) => a.timestamp - b.timestamp);
}

function createInitialGameState(handHistory: CompactHandHistory): any {
  return {
    id: handHistory.gameId,
    players: handHistory.players.map((player, index) => ({
      id: player.id,
      name: player.id,
      stack: player.stackSize,
      position: player.position,
      cards: player.cards,
      folded: false,
      isAllIn: false,
      currentBet: 0
    })),
    dealer: 0,
    smallBlind: handHistory.blinds[0],
    bigBlind: handHistory.blinds[1],
    pot: handHistory.blinds[0] + handHistory.blinds[1],
    communityCards: [],
    stage: 'preflop' as GameStage,
    currentPlayer: 0,
    minRaise: handHistory.blinds[1] * 2,
    lastRaise: handHistory.blinds[1]
  };
}

function updateGameStateWithAction(previousState: any, action: any, handHistory: CompactHandHistory): any {
  const newState = { ...previousState };
  const playerIndex = action.p;
  
  if (newState.players[playerIndex]) {
    const player = { ...newState.players[playerIndex] };
    
    switch (action.a) {
      case 0: // fold
        player.folded = true;
        break;
      case 1: // check
        break;
      case 2: // call
        if (action.m) {
          player.currentBet += action.m;
          player.stack -= action.m;
          newState.pot += action.m;
        }
        break;
      case 3: // bet
      case 4: // raise
        if (action.m) {
          player.currentBet = action.m;
          player.stack -= action.m;
          newState.pot += action.m;
        }
        break;
      case 5: // all-in
        player.isAllIn = true;
        if (action.m) {
          player.currentBet += action.m;
          newState.pot += action.m;
          player.stack = 0;
        }
        break;
    }
    
    newState.players[playerIndex] = player;
  }
  
  return newState;
}

function updateGameStateWithSnapshot(previousState: any, snapshot: HandSnapshot): any {
  return {
    ...previousState,
    communityCards: snapshot.board,
    pot: snapshot.pot,
    stage: ['preflop', 'flop', 'turn', 'river'][snapshot.stage] as GameStage
  };
}

function updateGameStateWithResult(previousState: any, result: any): any {
  return {
    ...previousState,
    stage: 'showdown' as GameStage,
    winner: result.winners[0]
  };
}

export default HandReplayViewer;