import React, { useEffect, useState } from 'react';
import { HandScore } from '@/types/training';
import { ActionType } from '@/types/poker';
import { getActionChinese, getFeedbackTypeChinese, getScoreGradeChinese } from '@/lib/translations';

interface FeedbackModalProps {
  score: HandScore;
  playerAction: ActionType;
  isVisible: boolean;
  onContinue: () => void;
  onNextHand?: () => void;
  autoAdvanceDelay?: number;
  currentHand?: number;
  totalHands?: number;
}

export default function FeedbackModal({
  score,
  playerAction,
  isVisible,
  onContinue,
  onNextHand,
  autoAdvanceDelay = 10000,
  currentHand = 1,
  totalHands = 10
}: FeedbackModalProps) {
  const [countdown, setCountdown] = useState(Math.floor(autoAdvanceDelay / 1000));
  const [showDetails, setShowDetails] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 初始化和显示详情
  useEffect(() => {
    if (!isVisible) return;

    setCountdown(Math.floor(autoAdvanceDelay / 1000));
    setIsPaused(false); // 重置暂停状态
    
    // 显示详情延迟
    const detailsTimer = setTimeout(() => {
      setShowDetails(true);
    }, 800);

    return () => {
      clearTimeout(detailsTimer);
      setShowDetails(false);
    };
  }, [isVisible, autoAdvanceDelay]);

  // 倒计时逻辑
  useEffect(() => {
    if (!isVisible || isPaused || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, isPaused, countdown, onContinue]);

  // 切换暂停状态
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (!isVisible) return null;

  // 根据分数类型获取样式
  const getStyleByType = (type: string) => {
    switch (type) {
      case 'excellent':
        return {
          bgGradient: 'from-green-500 to-emerald-600',
          textColor: 'text-green-800',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '🎉',
          emoji: '🌟'
        };
      case 'good':
        return {
          bgGradient: 'from-blue-500 to-indigo-600',
          textColor: 'text-blue-800',
          bgColor: 'bg-blue-50', 
          borderColor: 'border-blue-200',
          icon: '👍',
          emoji: '✨'
        };
      case 'improvement':
        return {
          bgGradient: 'from-yellow-500 to-orange-500',
          textColor: 'text-yellow-800',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '💡',
          emoji: '📈'
        };
      case 'mistake':
        return {
          bgGradient: 'from-red-500 to-red-600',
          textColor: 'text-red-800',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '❌',
          emoji: '🎯'
        };
      default:
        return {
          bgGradient: 'from-gray-500 to-gray-600',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: 'ℹ️',
          emoji: '🤔'
        };
    }
  };

  const style = getStyleByType(score.feedback.type);

  // 获取行动的中文标签
  const getActionLabel = (action: ActionType) => {
    return getActionChinese(action);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Header with score */}
        <div className={`bg-gradient-to-r ${style.bgGradient} text-white p-6 rounded-t-xl text-center`}>
          <div className="text-4xl mb-2">{style.icon}</div>
          <h2 className="text-2xl font-bold mb-2">{score.feedback.title}</h2>
          <div className="text-3xl font-bold bg-white/20 rounded-lg py-2 px-4 inline-block">
            {score.finalScore}分
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Player decision */}
          <div className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4 mb-6`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${style.textColor} font-medium`}>你的选择</div>
                <div className="text-lg font-bold text-gray-900">
                  {getActionLabel(playerAction)}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm ${style.textColor}`}>基础得分</div>
                <div className="text-lg font-bold">{score.baseScore}</div>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              {style.emoji} 分析说明
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              {score.feedback.explanation}
            </p>
          </div>

          {/* Detailed analysis (shown after delay) */}
          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 animate-in slide-in-from-bottom-2 duration-500">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 GTO 分析</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {score.feedback.gtoAnalysis}
              </p>
              
              {/* Score breakdown */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500">基础分</div>
                  <div className="font-bold text-gray-900">{score.baseScore}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500">速度奖励</div>
                  <div className="font-bold text-green-600">+{score.speedBonus}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500">难度系数</div>
                  <div className="font-bold text-blue-600">×{score.difficultyMultiplier}</div>
                </div>
              </div>
            </div>
          )}

          {/* Continue button with countdown */}
          <div className="text-center">
            {/* 按钮组 */}
            <div className="flex gap-3 mb-3">
              {currentHand < totalHands ? (
                <>
                  {/* 下一题按钮 - 直接跳转到下一手决策 */}
                  <button
                    onClick={() => {
                      setIsPaused(true);
                      setCountdown(0);
                      onNextHand ? onNextHand() : onContinue();
                    }}
                    className={`flex-1 py-4 px-6 bg-gradient-to-r ${style.bgGradient} text-white rounded-lg font-semibold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200`}
                  >
                    下一题 {countdown > 0 && !isPaused && `(${countdown}s)`}
                  </button>
                  
                  {/* 继续训练按钮（经典流程：指导→决策） */}
                  <button
                    onClick={() => {
                      setIsPaused(true);
                      setCountdown(0);
                      onContinue();
                    }}
                    className="flex-1 py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    继续训练
                  </button>
                </>
              ) : (
                /* 最后一题显示完成训练 */
                <button
                  onClick={onContinue}
                  className={`w-full py-4 px-6 bg-gradient-to-r ${style.bgGradient} text-white rounded-lg font-semibold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200`}
                >
                  完成训练 {countdown > 0 && !isPaused && `(${countdown}s)`}
                </button>
              )}
            </div>
            
            {countdown > 0 && (
              <div className="flex items-center justify-center gap-4">
                <p className="text-xs text-gray-500">
                  {isPaused ? '倒计时已暂停' : `${countdown} 秒后自动继续`}
                </p>
                <button
                  onClick={togglePause}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full transition-all duration-200"
                >
                  {isPaused ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      恢复
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                      暂停
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* 进度提示 */}
            <p className="text-xs text-gray-400 mt-2">
              第 {currentHand} 题 / 共 {totalHands} 题
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}