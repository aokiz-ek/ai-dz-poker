import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Progress, Slider, Typography, Space, Row, Col } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StepBackwardOutlined, StepForwardOutlined, SettingOutlined } from '@ant-design/icons';
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
    totalSteps: 0
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

  return (
    <div className="hand-replay-viewer" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 标题栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                手牌回放: {handHistory.id}
              </Title>
              <Text type="secondary">
                {new Date(handHistory.timestamp).toLocaleString()}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                type="text" 
                icon={<SettingOutlined />}
                onClick={toggleAnalysis}
              >
                {replayState.showAnalysis ? '隐藏分析' : '显示分析'}
              </Button>
              {onClose && (
                <Button onClick={onClose}>关闭</Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
        {/* 牌桌区域 */}
        <Col span={replayState.showAnalysis ? 16 : 24}>
          <Card 
            title={
              <Space>
                <span>第 {replayState.currentStep + 1} 步</span>
                {currentStep && (
                  <Text type="secondary">
                    {currentStep.description}
                  </Text>
                )}
              </Space>
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* 牌桌渲染区域 */}
            <div style={{ flex: 1, position: 'relative', minHeight: 400 }}>
              {currentGameState && (
                <PokerTable
                  gameState={currentGameState}
                  heroId="hero" // 假设hero是主角
                  readOnly={true}
                  showAllCards={true}  // 回放模式显示所有玩家手牌
                  showEquity={replayState.showAnalysis}
                />
              )}
            </div>

            {/* 进度条 */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <Progress 
                percent={progressPercentage}
                showInfo={false}
                strokeColor="#1890ff"
                style={{ marginBottom: 8 }}
              />
              <Slider
                min={0}
                max={replayState.totalSteps - 1}
                value={replayState.currentStep}
                onChange={handleStepChange}
                tooltip={{ 
                  formatter: (value) => `步骤 ${value! + 1}/${replayState.totalSteps}` 
                }}
              />
            </div>

            {/* 控制按钮 */}
            <ReplayControls
              isPlaying={replayState.isPlaying}
              canStepBackward={replayState.currentStep > 0}
              canStepForward={replayState.currentStep < replayState.totalSteps - 1}
              playbackSpeed={replayState.playbackSpeed}
              onPlay={handlePlay}
              onPause={handlePause}
              onStepBackward={handleStepBackward}
              onStepForward={handleStepForward}
              onSpeedChange={handleSpeedChange}
            />
          </Card>
        </Col>

        {/* GTO分析面板 */}
        {replayState.showAnalysis && (
          <Col span={8}>
            <GtoAnalysisPanel
              handHistory={handHistory}
              currentStep={replayState.currentStep}
              currentGameState={currentGameState}
            />
          </Col>
        )}
      </Row>
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