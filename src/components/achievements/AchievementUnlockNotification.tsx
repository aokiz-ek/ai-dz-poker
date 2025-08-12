import React, { useEffect, useState } from 'react';
import { Achievement, AchievementUnlock } from '@/types/achievements';
import { getAchievementRarityChinese } from '@/lib/translations';

interface AchievementUnlockNotificationProps {
  achievement: Achievement;
  unlock: AchievementUnlock;
  isVisible: boolean;
  onClose: () => void;
  autoHideDelay?: number;
}

export default function AchievementUnlockNotification({
  achievement,
  unlock,
  isVisible,
  onClose,
  autoHideDelay = 4000
}: AchievementUnlockNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // 自动隐藏计时器
  useEffect(() => {
    if (!isVisible) return;

    setIsAnimating(true);
    
    const timer = setTimeout(() => {
      onClose();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [isVisible, autoHideDelay, onClose]);

  // 获取稀有度样式
  const getRarityStyles = () => {
    switch (achievement.rarity) {
      case 'common':
        return {
          bg: 'from-gray-500 to-gray-600',
          border: 'border-gray-400',
          glow: 'shadow-gray-500/50',
          particle: 'text-gray-300'
        };
      case 'uncommon':
        return {
          bg: 'from-green-500 to-green-600',
          border: 'border-green-400',
          glow: 'shadow-green-500/50',
          particle: 'text-green-300'
        };
      case 'rare':
        return {
          bg: 'from-blue-500 to-blue-600',
          border: 'border-blue-400',
          glow: 'shadow-blue-500/50',
          particle: 'text-blue-300'
        };
      case 'epic':
        return {
          bg: 'from-purple-500 to-purple-600',
          border: 'border-purple-400',
          glow: 'shadow-purple-500/50',
          particle: 'text-purple-300'
        };
      case 'legendary':
        return {
          bg: 'from-yellow-500 to-orange-500',
          border: 'border-yellow-400',
          glow: 'shadow-yellow-500/50',
          particle: 'text-yellow-300'
        };
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          border: 'border-gray-400',
          glow: 'shadow-gray-500/50',
          particle: 'text-gray-300'
        };
    }
  };

  const styles = getRarityStyles();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300" />
      
      {/* 主通知卡片 */}
      <div 
        className={`
          relative bg-white rounded-2xl shadow-2xl border-2 ${styles.border} 
          ${styles.glow} animate-in zoom-in-95 slide-in-from-bottom-4 duration-500
          pointer-events-auto max-w-sm w-full mx-4
        `}
      >
        
        {/* 顶部横幅 */}
        <div className={`bg-gradient-to-r ${styles.bg} px-6 py-4 rounded-t-2xl text-center`}>
          <div className="text-white">
            <div className="text-sm font-medium mb-1 opacity-90">🎉 成就解锁!</div>
            <div className="text-2xl font-bold">{achievement.name}</div>
          </div>
        </div>

        {/* 成就内容 */}
        <div className="p-6 text-center">
          {/* 大图标 */}
          <div className="text-6xl mb-4 animate-bounce">
            {achievement.icon}
          </div>
          
          {/* 描述 */}
          <p className="text-gray-700 mb-4 leading-relaxed">
            {achievement.description}
          </p>

          {/* 稀有度标签 */}
          <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${styles.bg} text-white font-semibold text-sm mb-4`}>
            {getAchievementRarityChinese(achievement.rarity)}
          </div>

          {/* 奖励信息 */}
          <div className="border-t border-gray-100 pt-4">
            <div className="text-sm text-gray-600 mb-3">🎁 获得奖励:</div>
            <div className="flex justify-center gap-4">
              {achievement.rewards.experience && (
                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-2 rounded-lg">
                  <span className="text-yellow-600">⭐</span>
                  <span className="text-yellow-800 font-semibold">
                    {achievement.rewards.experience} EXP
                  </span>
                </div>
              )}
              
              {achievement.rewards.title && (
                <div className="flex items-center gap-1 bg-purple-50 px-3 py-2 rounded-lg">
                  <span className="text-purple-600">🏷️</span>
                  <span className="text-purple-800 font-semibold">
                    {achievement.rewards.title}
                  </span>
                </div>
              )}
              
              {achievement.rewards.badge && (
                <div className="flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="text-blue-600">🏅</span>
                  <span className="text-blue-800 font-semibold text-xs">
                    新徽章
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full py-3 px-6 bg-gradient-to-r ${styles.bg} text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-200`}
          >
            太棒了！继续努力 🚀
          </button>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 粒子效果 */}
        {achievement.rarity !== 'common' && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 ${styles.particle} rounded-full animate-ping`}
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 200}ms`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </>
        )}

        {/* 传说级别特殊效果 */}
        {achievement.rarity === 'legendary' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* 传说级背景烟花效果 */}
      {achievement.rarity === 'legendary' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '3s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}