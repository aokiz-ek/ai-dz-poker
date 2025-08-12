import React, { useState, useEffect, useCallback } from 'react';
import { ActionType } from '@/types/poker';
import { TrainingHand, TrainingSession as ITrainingSession, TrainingDecision, HandScore, SessionSummary, TrainingUIState } from '@/types/training';
import { TrainingScenario } from '@/lib/training-scenarios';
import { TrainingEngine } from '@/lib/training-engine';
import { AchievementEngine } from '@/lib/achievement-engine';
import { Achievement, AchievementUnlock, AchievementCheckResult } from '@/types/achievements';
import { 
  getPositionChinese, 
  getOpponentTypeChinese, 
  formatTimeChinese, 
  getScoreGradeChinese,
  getStackSizeChinese
} from '@/lib/translations';

import TrainingCard from './TrainingCard';
import ActionButtons from './ActionButtons';
import FeedbackModal from './FeedbackModal';
import AchievementUnlockNotification from '@/components/achievements/AchievementUnlockNotification';

interface TrainingSessionProps {
  scenario: TrainingScenario;
  onComplete: (summary: SessionSummary) => void;
  onExit: () => void;
}

export default function TrainingSession({
  scenario,
  onComplete,
  onExit
}: TrainingSessionProps) {
  // 核心状态
  const [session, setSession] = useState<ITrainingSession | null>(null);
  const [currentHand, setCurrentHand] = useState<TrainingHand | null>(null);
  const [uiState, setUIState] = useState<TrainingUIState>({
    phase: 'loading',
    handProgress: { current: 0, total: 10 },
    currentScore: 0,
    sessionScore: 0,
    feedbackType: 'good',
    animationState: 'idle',
    showHint: false
  });
  
  // 反馈状态
  const [currentScore, setCurrentScore] = useState<HandScore | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastDecision, setLastDecision] = useState<TrainingDecision | null>(null);
  
  // 成就系统状态
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<{achievement: Achievement, unlock: AchievementUnlock} | null>(null);
  const [showAchievementNotification, setShowAchievementNotification] = useState(false);

  // 计时器
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionTime, setSessionTime] = useState<number>(0);

  // 初始化训练会话
  useEffect(() => {
    const initializeSession = () => {
      // 初始化训练引擎
      TrainingEngine.initialize();
      
      // 创建训练会话
      const newSession = TrainingEngine.createTrainingSession(scenario, 10);
      setSession(newSession);
      
      // 设置第一手牌
      if (newSession.hands.length > 0) {
        setCurrentHand(newSession.hands[0]);
        setStartTime(Date.now());
        
        setUIState(prev => ({
          ...prev,
          phase: 'instruction',
          handProgress: { current: 1, total: newSession.totalHands },
          animationState: 'idle'
        }));
      }
    };

    initializeSession();
  }, [scenario]);

  // 会话计时器
  useEffect(() => {
    if (!session?.isActive) return;

    const timer = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.isActive, startTime]);

  // 开始当前手牌训练
  const startCurrentHand = useCallback(() => {
    if (!currentHand) return;

    setUIState(prev => ({
      ...prev,
      phase: 'decision',
      animationState: 'dealing'
    }));

    // 发牌动画延迟
    setTimeout(() => {
      setUIState(prev => ({
        ...prev,
        animationState: 'idle'
      }));
    }, 1000);
  }, [currentHand]);

  // 处理玩家决策
  const handlePlayerDecision = useCallback((action: ActionType) => {
    if (!currentHand || !session) return;
    
    const decisionTime = Date.now();
    const responseTime = decisionTime - startTime;

    // 创建决策记录
    const decision: TrainingDecision = {
      handId: currentHand.id,
      playerAction: action,
      responseTime,
      timestamp: new Date(decisionTime)
    };

    setLastDecision(decision);
    
    // 计算评分
    const score = TrainingEngine.scoreDecision(currentHand, decision);
    setCurrentScore(score);

    // 更新会话状态
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        decisions: [...prev.decisions, decision],
        scores: [...prev.scores, score]
      };
    });

    // 计算当前会话平均分
    const allScores = [...(session.scores || []), score];
    const avgScore = allScores.reduce((sum, s) => sum + s.finalScore, 0) / allScores.length;

    // 更新UI状态
    setUIState(prev => ({
      ...prev,
      phase: 'feedback',
      currentScore: score.finalScore,
      sessionScore: Math.round(avgScore),
      feedbackType: score.feedback.type,
      animationState: 'revealing'
    }));

    // 显示反馈
    setShowFeedback(true);
  }, [currentHand, session, startTime]);

  // 继续下一手牌或结束会话（经典流程：指导→决策）
  const continueToNextHand = useCallback(() => {
    if (!session) return;

    setShowFeedback(false);
    setCurrentScore(null);
    setLastDecision(null);

    const nextIndex = session.currentHandIndex + 1;
    
    if (nextIndex < session.totalHands) {
      // 继续下一手牌
      const nextHand = session.hands[nextIndex];
      setCurrentHand(nextHand);
      setSession(prev => prev ? { ...prev, currentHandIndex: nextIndex } : prev);
      setStartTime(Date.now());
      
      setUIState(prev => ({
        ...prev,
        phase: 'instruction',
        handProgress: { current: nextIndex + 1, total: session.totalHands },
        animationState: 'idle'
      }));
    } else {
      // 训练会话结束
      setUIState(prev => ({
        ...prev,
        phase: 'summary',
        animationState: 'celebrating'
      }));

      // 生成会话总结
      const summary = TrainingEngine.generateSessionSummary({
        ...session,
        currentHandIndex: nextIndex,
        isActive: false
      });
      
      // 检查成就解锁
      checkAchievements(summary);
      
      onComplete(summary);
    }
  }, [session, onComplete]);

  // 直接跳转到下一手决策（快捷流程：跳过指导直接进入决策）
  const nextHandDirectly = useCallback(() => {
    if (!session) return;

    setShowFeedback(false);
    setCurrentScore(null);
    setLastDecision(null);

    const nextIndex = session.currentHandIndex + 1;
    
    if (nextIndex < session.totalHands) {
      // 继续下一手牌并直接进入决策阶段
      const nextHand = session.hands[nextIndex];
      setCurrentHand(nextHand);
      setSession(prev => prev ? { ...prev, currentHandIndex: nextIndex } : prev);
      setStartTime(Date.now());
      
      setUIState(prev => ({
        ...prev,
        phase: 'decision',
        handProgress: { current: nextIndex + 1, total: session.totalHands },
        animationState: 'dealing'
      }));

      // 发牌动画延迟
      setTimeout(() => {
        setUIState(prev => ({
          ...prev,
          animationState: 'idle'
        }));
      }, 1000);
    } else {
      // 最后一题，调用常规流程
      continueToNextHand();
    }
  }, [session, continueToNextHand]);

  // 检查成就解锁
  const checkAchievements = useCallback((summary: SessionSummary) => {
    // 更新会话数统计
    const currentSessions = parseInt(localStorage.getItem('total-sessions') || '0') + 1;
    localStorage.setItem('total-sessions', currentSessions.toString());
    localStorage.setItem('last-session-score', summary.averageScore.toString());
    
    // 检查成就
    const achievementResult: AchievementCheckResult = AchievementEngine.checkSessionAchievements(summary);
    
    if (achievementResult.newUnlocks.length > 0) {
      // 将新解锁的成就加入队列
      setAchievementQueue(achievementResult.newUnlocks);
    }
  }, []);

  // 处理成就通知队列
  useEffect(() => {
    if (achievementQueue.length > 0 && !showAchievementNotification && !currentAchievement) {
      const nextAchievement = achievementQueue[0];
      const recentUnlocks = AchievementEngine.getRecentUnlocks();
      const unlock = recentUnlocks.find(u => u.achievementId === nextAchievement.id);
      
      if (unlock) {
        setCurrentAchievement({ achievement: nextAchievement, unlock });
        setShowAchievementNotification(true);
        setAchievementQueue(prev => prev.slice(1)); // 从队列中移除
      }
    }
  }, [achievementQueue, showAchievementNotification, currentAchievement]);

  // 处理成就通知关闭
  const handleAchievementNotificationClose = useCallback(() => {
    if (currentAchievement) {
      AchievementEngine.markUnlockAsShown(currentAchievement.achievement.id);
    }
    setShowAchievementNotification(false);
    setCurrentAchievement(null);
    
    // 如果队列中还有成就，延迟显示下一个
    if (achievementQueue.length > 0) {
      setTimeout(() => {
        // 下一个成就会在上面的useEffect中处理
      }, 500);
    }
  }, [currentAchievement, achievementQueue]);

  // 格式化时间显示（使用中文）
  const formatTime = (seconds: number): string => {
    return formatTimeChinese(seconds);
  };

  if (!session || !currentHand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-gray-800">正在准备训练...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：场景信息 */}
            <div className="flex items-center gap-4">
              <button
                onClick={onExit}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                退出训练
              </button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div>
                <h1 className="text-lg font-bold text-gray-900">{scenario.name}</h1>
                <p className="text-sm text-gray-600">{currentHand.learningPoint}</p>
              </div>
            </div>

            {/* 右侧：进度和统计 */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">手牌进度</div>
                <div className="font-bold text-gray-900">
                  {uiState.handProgress.current}/{uiState.handProgress.total}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500">会话时间</div>
                <div className="font-bold text-gray-900">{formatTime(sessionTime)}</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500">平均分数</div>
                <div className="font-bold text-indigo-600">{uiState.sessionScore}</div>
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(uiState.handProgress.current / uiState.handProgress.total) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Training Area */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {uiState.phase === 'instruction' && (
          <div className="text-center mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">准备开始第 {uiState.handProgress.current} 手</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                你在 {getPositionChinese(currentHand.context.position)} 位置，面对 {getStackSizeChinese(currentHand.context.stackSize)}({currentHand.context.stackSize}BB)。
                观察你的手牌并做出最佳决策。
              </p>
              <button
                onClick={startCurrentHand}
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                开始这一手 🚀
              </button>
            </div>
          </div>
        )}

        {uiState.phase === 'decision' && (
          <div className="space-y-8">
            {/* Hand Display */}
            <div className="text-center">
              <div className="inline-flex gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                <TrainingCard 
                  card={currentHand.holeCards[0]} 
                  isRevealed={true}
                  size="large"
                  className={uiState.animationState === 'dealing' ? 'animate-bounce' : ''}
                />
                <TrainingCard 
                  card={currentHand.holeCards[1]} 
                  isRevealed={true}
                  size="large"
                  className={`${uiState.animationState === 'dealing' ? 'animate-bounce' : ''} [animation-delay:0.2s]`}
                />
              </div>
            </div>

            {/* Game Context */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">位置</div>
                  <div className="font-bold text-gray-900">{getPositionChinese(currentHand.context.position)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">筹码深度</div>
                  <div className="font-bold text-gray-900">
                    {getStackSizeChinese(currentHand.context.stackSize)}
                    <span className="text-gray-500 text-xs ml-1">({currentHand.context.stackSize}BB)</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">盲注</div>
                  <div className="font-bold text-gray-900">
                    {currentHand.context.blinds.small}/{currentHand.context.blinds.big}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">对手类型</div>
                  <div className="font-bold text-gray-900">
                    {getOpponentTypeChinese(currentHand.context.opponentType)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
              <ActionButtons 
                onAction={handlePlayerDecision}
                callAmount={currentHand.context.blinds.big}
                raiseAmount={currentHand.context.blinds.big * 2.5}
                potSize={currentHand.context.blinds.small + currentHand.context.blinds.big}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedback && currentScore && lastDecision && (
        <FeedbackModal
          score={currentScore}
          playerAction={lastDecision.playerAction}
          isVisible={showFeedback}
          onContinue={continueToNextHand}
          onNextHand={nextHandDirectly}
          autoAdvanceDelay={10000}
          currentHand={uiState.handProgress.current}
          totalHands={uiState.handProgress.total}
        />
      )}

      {/* Achievement Unlock Notification */}
      {showAchievementNotification && currentAchievement && (
        <AchievementUnlockNotification
          achievement={currentAchievement.achievement}
          unlock={currentAchievement.unlock}
          isVisible={showAchievementNotification}
          onClose={handleAchievementNotificationClose}
          autoHideDelay={4000}
        />
      )}
    </div>
  );
}