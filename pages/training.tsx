"use client"

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { TrainingScenarioManager, type TrainingScenario } from '@/lib/training-scenarios';
import { SessionSummary as ISessionSummary } from '@/types/training';
import TrainingSession from '@/components/training/TrainingSession';
import SessionSummary from '@/components/training/SessionSummary';
import AchievementsPanel from '@/components/achievements/AchievementsPanel';
import { AchievementEngine } from '@/lib/achievement-engine';
import { UserAchievements } from '@/types/achievements';
import { getDifficultyChinese } from '@/lib/translations';

// 训练进度数据类型
interface ScenarioProgress {
  scenarioId: string;
  completed: boolean;
  bestScore: number;
  attempts: number;
  unlocked: boolean;
  stars: number; // 0-3 stars based on best score
}

// 获取星级评价
function getStarsFromScore(score: number): number {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 60) return 1;
  return 0;
}

// 难度标签样式
function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'advanced':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

// 难度中文标签
function getDifficultyLabel(difficulty: string) {
  switch (difficulty) {
    case 'beginner': return '初级';
    case 'intermediate': return '中级'; 
    case 'advanced': return '高级';
    case 'easy': return '简单';
    case 'medium': return '中等';
    case 'hard': return '困难';
    default: return getDifficultyChinese(difficulty as any) || '未知';
  }
}

export default function Training() {
  const [scenarios] = useState<TrainingScenario[]>(TrainingScenarioManager.getAllScenarios());
  const [progress, setProgress] = useState<Record<string, ScenarioProgress>>({});
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [currentView, setCurrentView] = useState<'lobby' | 'training' | 'summary'>('lobby');
  const [sessionSummary, setSessionSummary] = useState<ISessionSummary | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null);

  // 初始化进度数据和成就系统
  useEffect(() => {
    // 初始化成就系统
    AchievementEngine.initialize();
    const userData = AchievementEngine.getUserAchievements();
    setUserAchievements(userData);
    
    // 初始化训练进度数据
    const initProgress: Record<string, ScenarioProgress> = {};
    scenarios.forEach((scenario, index) => {
      const savedProgress = localStorage.getItem(`scenario-${scenario.id}`);
      const parsed = savedProgress ? JSON.parse(savedProgress) : null;
      
      // 修复解锁逻辑：第一个场景默认解锁，其他场景检查前一个场景的最高分
      let isUnlocked = false;
      if (index === 0) {
        // 第一个场景默认解锁
        isUnlocked = true;
      } else {
        // 检查是否已保存为解锁状态
        if (parsed?.unlocked) {
          isUnlocked = true;
        } else {
          // 检查前一个场景的分数（从localStorage中获取）
          const prevScenario = scenarios[index - 1];
          const prevSaved = localStorage.getItem(`scenario-${prevScenario.id}`);
          const prevParsed = prevSaved ? JSON.parse(prevSaved) : null;
          isUnlocked = (prevParsed?.bestScore || 0) >= 70;
        }
      }
      
      initProgress[scenario.id] = {
        scenarioId: scenario.id,
        completed: parsed?.completed || false,
        bestScore: parsed?.bestScore || 0,
        attempts: parsed?.attempts || 0,
        unlocked: isUnlocked,
        stars: parsed ? getStarsFromScore(parsed.bestScore) : 0
      };
      
      console.log(`🔍 场景 "${scenario.name}" 解锁状态:`, isUnlocked);
    });
    setProgress(initProgress);
    console.log('📋 初始化完成，所有场景进度:', initProgress);
  }, [scenarios]);

  // 监听状态变化
  useEffect(() => {
    console.log('🔄 视图状态变化:', currentView);
  }, [currentView]);
  
  useEffect(() => {
    console.log('🎯 选中场景变化:', selectedScenario?.name);
  }, [selectedScenario]);
  
  // 计算总体进度
  const totalProgress = Object.values(progress).reduce((acc, curr) => {
    return acc + (curr.completed ? 1 : 0);
  }, 0);
  const progressPercentage = Math.round((totalProgress / scenarios.length) * 100);

  // 开始训练场景
  const startScenario = (scenario: TrainingScenario) => {
    console.log('🎯 开始训练场景:', scenario.name);
    console.log('📊 场景进度:', progress[scenario.id]);
    console.log('🔓 是否解锁:', progress[scenario.id]?.unlocked);
    
    if (!progress[scenario.id]?.unlocked) {
      console.log('❌ 场景未解锁，无法开始训练');
      return;
    }
    
    console.log('✅ 设置选中场景和切换视图');
    setSelectedScenario(scenario);
    setCurrentView('training');
  };

  // 返回大厅
  const returnToLobby = () => {
    setCurrentView('lobby');
    setSelectedScenario(null);
    setSessionSummary(null);
  };

  // 处理训练完成
  const handleTrainingComplete = (summary: ISessionSummary) => {
    setSessionSummary(summary);
    
    // 更新本地进度数据
    if (selectedScenario) {
      const updatedProgress = {
        ...progress[selectedScenario.id],
        bestScore: Math.max(progress[selectedScenario.id]?.bestScore || 0, summary.averageScore),
        attempts: (progress[selectedScenario.id]?.attempts || 0) + 1,
        completed: summary.averageScore >= 70,
        stars: getStarsFromScore(Math.max(progress[selectedScenario.id]?.bestScore || 0, summary.averageScore))
      };
      
      // 保存到 localStorage
      localStorage.setItem(`scenario-${selectedScenario.id}`, JSON.stringify(updatedProgress));
      
      // 更新状态
      setProgress(prev => ({
        ...prev,
        [selectedScenario.id]: updatedProgress
      }));
      
      // 检查是否解锁下一个场景
      if (summary.unlockNextScenario) {
        const currentIndex = scenarios.findIndex(s => s.id === selectedScenario.id);
        const nextScenario = scenarios[currentIndex + 1];
        
        if (nextScenario) {
          const nextProgress = {
            ...progress[nextScenario.id],
            unlocked: true
          };
          localStorage.setItem(`scenario-${nextScenario.id}`, JSON.stringify(nextProgress));
          setProgress(prev => ({
            ...prev,
            [nextScenario.id]: nextProgress
          }));
        }
      }
    }
    
    setCurrentView('summary');
  };

  // 重试当前场景
  const retryCurrentScenario = () => {
    if (selectedScenario) {
      setCurrentView('training');
      setSessionSummary(null);
    }
  };

  // 渲染星级
  const renderStars = (stars: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${stars >= star ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  // 训练界面
  console.log('🔍 当前视图:', currentView, '选中场景:', selectedScenario?.name);
  if (currentView === 'training' && selectedScenario) {
    return (
      <>
        <Head>
          <title>{selectedScenario.name} - AI Poker GTO 训练</title>
          <meta name="description" content={selectedScenario.description} />
        </Head>
        
        <TrainingSession
          scenario={selectedScenario}
          onComplete={handleTrainingComplete}
          onExit={returnToLobby}
        />
      </>
    );
  }

  // 会话总结界面
  if (currentView === 'summary' && sessionSummary) {
    return (
      <>
        <Head>
          <title>训练总结 - AI Poker GTO</title>
          <meta name="description" content="查看你的GTO训练表现和改进建议" />
        </Head>
        
        <SessionSummary
          summary={sessionSummary}
          onReturnToLobby={returnToLobby}
          onRetry={retryCurrentScenario}
        />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>GTO 策略训练营 - AI Poker GTO</title>
        <meta name="description" content="通过6个专业训练场景系统化学习GTO策略" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></div>
                  GTO 策略训练营
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  场景化 GTO 训练
                </h1>
                <p className="text-gray-600">
                  通过6个专业训练场景，系统化掌握扑克GTO策略
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAchievements(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <span className="text-lg">🏆</span>
                  成就中心
                  {userAchievements && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {userAchievements.unlockedAchievements}/{userAchievements.totalAchievements}
                    </span>
                  )}
                </button>
                
                <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  返回策略矩阵
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">学习进度总览</h2>
              <div className="text-sm text-gray-600">
                已完成 {totalProgress}/{scenarios.length} 个场景
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>完成度: {progressPercentage}%</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>已掌握</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>进行中</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span>未解锁</span>
                </div>
              </div>
            </div>
          </div>

          {/* Training Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => {
              const scenarioProgress = progress[scenario.id];
              const isLocked = !scenarioProgress?.unlocked;
              
              return (
                <div
                  key={scenario.id}
                  className={`group relative bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 ${
                    isLocked 
                      ? 'opacity-60 cursor-not-allowed' 
                      : 'hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300'
                  }`}
                >
                  {/* 状态指示器 */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-xl overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isLocked 
                          ? 'bg-gray-300 w-0' 
                          : scenarioProgress?.completed 
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 w-full'
                            : scenarioProgress?.attempts > 0 
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 w-1/2'
                              : 'bg-gradient-to-r from-blue-400 to-indigo-500 w-1/4'
                      }`}
                    />
                  </div>
                  
                  {/* Scenario Header */}
                  <div className="flex items-start justify-between mb-4 pt-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyStyle(scenario.difficulty)}`}>
                      {getDifficultyLabel(scenario.difficulty)}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 状态徽章 */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isLocked 
                          ? 'bg-gray-100 text-gray-400'
                          : scenarioProgress?.completed
                            ? 'bg-green-100 text-green-600'
                            : scenarioProgress?.attempts > 0
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-blue-100 text-blue-600'
                      }`}>
                        {isLocked ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        ) : scenarioProgress?.completed ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : scenarioProgress?.attempts > 0 ? (
                          <span className="font-bold">{scenarioProgress.attempts}</span>
                        ) : (
                          <span className="font-bold">!</span>
                        )}
                      </div>
                      
                      {/* 星级显示 */}
                      {!isLocked && renderStars(scenarioProgress?.stars || 0)}
                    </div>
                  </div>

                  {/* Scenario Content */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {scenario.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {scenario.description}
                    </p>
                    
                    {/* Scenario Details */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{scenario.position}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                        </svg>
                        <span>{scenario.stackSizes.player}筹码</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {scenarioProgress && (
                    <div className="border-t border-gray-100 pt-4">
                      {scenarioProgress.completed ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">已完成</span>
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              最高分: {scenarioProgress.bestScore}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startScenario(scenario);
                            }}
                            className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
                          >
                            重新挑战 ⭐
                          </button>
                        </div>
                      ) : scenarioProgress.attempts > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-yellow-600 font-medium">进行中</div>
                            <div className="text-sm text-gray-500">
                              {scenarioProgress.attempts} 次尝试
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startScenario(scenario);
                            }}
                            className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
                          >
                            继续训练 💪
                          </button>
                        </div>
                      ) : !isLocked ? (
                        <div className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startScenario(scenario);
                            }}
                            className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
                          >
                            🚀 开始训练
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="py-2 px-4 bg-gray-100 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              <span>需要完成前面的场景解锁</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Hover Effect */}
                  {!isLocked && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/0 to-purple-600/0 group-hover:from-indigo-500/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* 成就面板 */}
      <AchievementsPanel 
        isVisible={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
    </>
  );
}