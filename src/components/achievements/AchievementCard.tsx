import React from 'react';
import { Achievement, AchievementProgress, AchievementRarity } from '@/types/achievements';
import { getAchievementRarityChinese } from '@/lib/translations';

interface AchievementCardProps {
  achievement: Achievement;
  progress?: AchievementProgress;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  className?: string;
}

export default function AchievementCard({
  achievement,
  progress,
  size = 'medium',
  showProgress = true,
  className = ''
}: AchievementCardProps) {
  
  // 根据稀有度获取样式
  const getRarityStyle = (rarity: AchievementRarity) => {
    switch (rarity) {
      case 'common':
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          accent: 'text-gray-600',
          glow: 'shadow-gray-200'
        };
      case 'uncommon':
        return {
          border: 'border-green-300',
          bg: 'bg-green-50',
          accent: 'text-green-600',
          glow: 'shadow-green-200'
        };
      case 'rare':
        return {
          border: 'border-blue-300',
          bg: 'bg-blue-50',
          accent: 'text-blue-600',
          glow: 'shadow-blue-200'
        };
      case 'epic':
        return {
          border: 'border-purple-300',
          bg: 'bg-purple-50',
          accent: 'text-purple-600',
          glow: 'shadow-purple-200'
        };
      case 'legendary':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          accent: 'text-yellow-600',
          glow: 'shadow-yellow-200'
        };
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          accent: 'text-gray-600',
          glow: 'shadow-gray-200'
        };
    }
  };

  // 获取稀有度标签
  const getRarityLabel = (rarity: AchievementRarity): string => {
    return getAchievementRarityChinese(rarity);
  };

  // 获取尺寸样式
  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          card: 'p-3',
          icon: 'text-2xl',
          title: 'text-sm font-semibold',
          description: 'text-xs',
          rarity: 'text-xs px-2 py-0.5'
        };
      case 'large':
        return {
          card: 'p-6',
          icon: 'text-5xl',
          title: 'text-xl font-bold',
          description: 'text-base',
          rarity: 'text-sm px-3 py-1'
        };
      default: // medium
        return {
          card: 'p-4',
          icon: 'text-3xl',
          title: 'text-lg font-semibold',
          description: 'text-sm',
          rarity: 'text-xs px-2 py-1'
        };
    }
  };

  const isUnlocked = progress?.isUnlocked || false;
  const isCompleted = progress?.isCompleted || false;
  const progressPercentage = progress?.progressPercentage || 0;
  
  const rarityStyle = getRarityStyle(achievement.rarity);
  const sizeStyles = getSizeStyles(size);

  return (
    <div className={`
      relative bg-white rounded-xl border-2 transition-all duration-300
      ${isUnlocked ? rarityStyle.border : 'border-gray-200'}
      ${isUnlocked ? `shadow-lg ${rarityStyle.glow}` : 'shadow-md'}
      ${isUnlocked ? 'hover:scale-105' : 'hover:scale-102'}
      ${!isUnlocked ? 'opacity-70' : ''}
      ${sizeStyles.card}
      ${className}
    `}>
      
      {/* 解锁状态指示器 */}
      {isUnlocked && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* 稀有度标签 */}
      <div className="flex items-start justify-between mb-3">
        <div className={`inline-flex items-center rounded-full border ${rarityStyle.border} ${rarityStyle.bg} ${rarityStyle.accent} ${sizeStyles.rarity} font-medium`}>
          {getRarityLabel(achievement.rarity)}
        </div>
        
        {achievement.isHidden && !isUnlocked && (
          <div className="text-gray-400 text-xs">🔒 隐藏</div>
        )}
      </div>

      {/* 成就图标和信息 */}
      <div className="text-center mb-4">
        <div className={`${sizeStyles.icon} ${!isUnlocked ? 'grayscale' : ''} transition-all duration-300`}>
          {achievement.icon}
        </div>
        <h3 className={`${sizeStyles.title} text-gray-900 mt-2`}>
          {achievement.name}
        </h3>
      </div>

      {/* 描述 */}
      <p className={`${sizeStyles.description} text-gray-600 text-center mb-4`}>
        {achievement.description}
      </p>

      {/* 奖励信息 */}
      {(achievement.rewards.experience || achievement.rewards.title) && (
        <div className="border-t border-gray-100 pt-3 mb-4">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            {achievement.rewards.experience && (
              <div className="flex items-center gap-1">
                <span>⭐</span>
                <span>{achievement.rewards.experience} EXP</span>
              </div>
            )}
            {achievement.rewards.title && (
              <div className="flex items-center gap-1">
                <span>🏷️</span>
                <span className="truncate max-w-20">{achievement.rewards.title}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 进度条 */}
      {showProgress && progress && !isCompleted && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>进度</span>
            <span>{progress.currentProgress}/{progress.targetProgress}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                progressPercentage > 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gray-200'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500">
            {Math.round(progressPercentage)}%
          </div>
        </div>
      )}

      {/* 解锁时间 */}
      {isUnlocked && progress?.unlockedAt && (
        <div className="text-center text-xs text-gray-400 mt-3">
          解锁于 {new Date(progress.unlockedAt).toLocaleDateString()}
        </div>
      )}

      {/* 特殊效果：传说级成就的光晕效果 */}
      {achievement.rarity === 'legendary' && isUnlocked && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}