'use client';

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AchievementEngine } from '@/lib/achievement-engine';
import { UserAchievements, Achievement, AchievementProgress } from '@/types/achievements';

// 成就类别定义
interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    id: 'training',
    name: '训练成就',
    description: '通过各种训练场景获得的成就',
    icon: '🎯',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'performance',
    name: '表现成就',
    description: '基于训练表现和技能水平的成就',
    icon: '🏆',
    color: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'milestone',
    name: '里程碑成就',
    description: '重要学习节点和进度里程碑',
    icon: '🎖️',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'special',
    name: '特殊成就',
    description: '隐藏和特殊条件触发的稀有成就',
    icon: '💎',
    color: 'from-green-500 to-teal-600'
  }
];

// 成就稀有度配置
const getRarityConfig = (rarity: string) => {
  switch (rarity) {
    case 'legendary':
      return {
        name: '传奇',
        color: 'from-yellow-400 via-yellow-500 to-orange-500',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-600',
        glow: 'shadow-yellow-500/25'
      };
    case 'epic':
      return {
        name: '史诗',
        color: 'from-purple-400 via-purple-500 to-pink-500',
        borderColor: 'border-purple-400',
        textColor: 'text-purple-600',
        glow: 'shadow-purple-500/25'
      };
    case 'rare':
      return {
        name: '稀有',
        color: 'from-blue-400 via-blue-500 to-cyan-500',
        borderColor: 'border-blue-400',
        textColor: 'text-blue-600',
        glow: 'shadow-blue-500/25'
      };
    default:
      return {
        name: '普通',
        color: 'from-gray-400 to-gray-500',
        borderColor: 'border-gray-400',
        textColor: 'text-gray-600',
        glow: 'shadow-gray-500/25'
      };
  }
};

// 成就卡片组件
const AchievementCard: React.FC<{
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: AchievementProgress;
}> = ({ achievement, isUnlocked, progress }) => {
  const rarityConfig = getRarityConfig(achievement.rarity);
  
  return (
    <div className={`
      relative group bg-white/90 backdrop-blur-sm rounded-xl border-2 p-6 transition-all duration-300
      ${isUnlocked 
        ? `${rarityConfig.borderColor} shadow-lg hover:shadow-xl hover:-translate-y-1 ${rarityConfig.glow}` 
        : 'border-gray-200 opacity-60'
      }
    `}>
      {/* 稀有度指示器 */}
      {isUnlocked && (
        <div className="absolute top-0 right-0 overflow-hidden">
          <div className={`
            transform rotate-45 translate-x-6 -translate-y-2 
            bg-gradient-to-r ${rarityConfig.color} 
            text-white text-xs font-bold px-8 py-1
          `}>
            {rarityConfig.name}
          </div>
        </div>
      )}

      {/* 成就图标 */}
      <div className={`
        w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl
        ${isUnlocked 
          ? `bg-gradient-to-br ${rarityConfig.color} shadow-lg` 
          : 'bg-gray-200'
        }
      `}>
        {isUnlocked ? achievement.icon : '🔒'}
      </div>

      {/* 成就信息 */}
      <div className="text-center">
        <h3 className={`
          text-lg font-bold mb-2 
          ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}
        `}>
          {isUnlocked ? achievement.name : '???'}
        </h3>
        
        <p className={`
          text-sm mb-4 leading-relaxed
          ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}
        `}>
          {isUnlocked ? achievement.description : '完成特定条件后解锁'}
        </p>

        {/* 进度条（如果适用） */}
        {isUnlocked && progress && progress.targetProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>进度</span>
              <span>{progress.currentProgress}/{progress.targetProgress}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${rarityConfig.color}`}
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* 奖励信息 */}
        {isUnlocked && achievement.rewards && (achievement.rewards.title || achievement.rewards.badge || achievement.rewards.experience) && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <div className="text-xs text-gray-500 mb-2">奖励</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {achievement.rewards.title && (
                <span 
                  className={`px-2 py-1 rounded-full text-xs bg-gradient-to-r ${rarityConfig.color} text-white`}
                >
                  📛 {achievement.rewards.title}
                </span>
              )}
              {achievement.rewards.badge && (
                <span 
                  className={`px-2 py-1 rounded-full text-xs bg-gradient-to-r ${rarityConfig.color} text-white`}
                >
                  🏅 {achievement.rewards.badge}
                </span>
              )}
              {achievement.rewards.experience && (
                <span 
                  className={`px-2 py-1 rounded-full text-xs bg-gradient-to-r ${rarityConfig.color} text-white`}
                >
                  ⚡ {achievement.rewards.experience} EXP
                </span>
              )}
            </div>
          </div>
        )}

        {/* 解锁时间 */}
        {isUnlocked && progress && progress.unlockedAt && (
          <div className="text-xs text-gray-400 mt-3">
            解锁于: {new Date(progress.unlockedAt).toLocaleDateString('zh-CN')}
          </div>
        )}
      </div>

      {/* 悬停效果 */}
      {isUnlocked && (
        <div className={`
          absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300
          ${rarityConfig.color}
        `} />
      )}
    </div>
  );
};

// 主组件
export default function Achievements() {
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // 初始化成就系统
      AchievementEngine.initialize();
      const userData = AchievementEngine.getUserAchievements();
      const achievements = AchievementEngine.getAllAchievements();
      
      // 获取已解锁的成就ID列表
      const unlockedAchievementIds = achievements
        .filter(achievement => {
          // 使用AchievementEngine的公共方法检查解锁状态
          try {
            return AchievementEngine.checkAchievementUnlocked(achievement.id);
          } catch {
            return false;
          }
        })
        .map(achievement => achievement.id);
      
      setUserAchievements(userData);
      setAllAchievements(achievements);
      setUnlockedIds(unlockedAchievementIds);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载成就数据中...</p>
        </div>
      </div>
    );
  }

  if (!userAchievements) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <p className="text-gray-600 mb-4">无法加载成就数据</p>
          <Link href="/training" className="text-indigo-600 hover:text-indigo-800">
            前往训练页面开始解锁成就
          </Link>
        </div>
      </div>
    );
  }

  // 过滤成就
  const filteredAchievements = selectedCategory === 'all' 
    ? allAchievements
    : allAchievements.filter(a => a.category === selectedCategory);

  const unlockedAchievements = filteredAchievements.filter(a => unlockedIds.includes(a.id));
  const lockedAchievements = filteredAchievements.filter(a => !unlockedIds.includes(a.id));

  // 计算统计数据
  const totalUnlocked = unlockedIds.length;
  const totalAchievements = allAchievements.length;
  const completionRate = totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;

  // 按稀有度分组
  const achievementsByRarity = unlockedAchievements.reduce((acc, achievement) => {
    const rarity = achievement.rarity;
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <>
      <Head>
        <title>成就中心 - AI Poker GTO</title>
        <meta name="description" content="查看你在GTO训练中获得的所有成就和里程碑" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm font-medium mb-4">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                  成就中心
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  🏆 我的成就
                </h1>
                <p className="text-gray-600">
                  追踪你的GTO学习进程，解锁更多成就徽章
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/training" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                  <span>🎯</span>
                  继续训练
                </Link>
                
                <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  返回首页
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">{totalUnlocked}</div>
              <div className="text-sm text-gray-600">已解锁成就</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 mb-2">{completionRate}%</div>
              <div className="text-sm text-gray-600">完成度</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{achievementsByRarity.legendary?.length || 0}</div>
              <div className="text-sm text-gray-600">传奇成就</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{userAchievements?.recentUnlocks?.length || 0}</div>
              <div className="text-sm text-gray-600">本月新增</div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">整体进度</h2>
              <div className="text-sm text-gray-600">
                {totalUnlocked}/{totalAchievements} 个成就
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 h-4 rounded-full transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>完成度: {completionRate}%</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>已解锁</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span>未解锁</span>
                </div>
              </div>
            </div>
          </div>

          {/* 类别筛选器 */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              全部成就
            </button>
            {ACHIEVEMENT_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                    : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-md'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          {/* 成就网格 */}
          <div className="space-y-8">
            {/* 已解锁成就 */}
            {unlockedAchievements.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-yellow-500">🏆</span>
                  已解锁成就
                  <span className="text-sm font-normal text-gray-500">({unlockedAchievements.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {unlockedAchievements.map(achievement => (
                    <AchievementCard 
                      key={achievement.id} 
                      achievement={achievement} 
                      isUnlocked={true}
                      progress={AchievementEngine.getAchievementProgress(achievement.id) || undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 未解锁成就 */}
            {lockedAchievements.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-gray-400">🔒</span>
                  待解锁成就
                  <span className="text-sm font-normal text-gray-500">({lockedAchievements.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lockedAchievements.map(achievement => (
                    <AchievementCard 
                      key={achievement.id} 
                      achievement={achievement} 
                      isUnlocked={false}
                      progress={AchievementEngine.getAchievementProgress(achievement.id) || undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 空状态 */}
            {filteredAchievements.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">该类别暂无成就</h3>
                <p className="text-gray-600 mb-6">尝试选择其他类别或开始训练来解锁新成就</p>
                <Link href="/training" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                  <span>🚀</span>
                  开始训练
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}