import React, { useState, useEffect } from 'react';
import { 
  Achievement, 
  UserAchievements, 
  AchievementProgress, 
  AchievementCategory, 
  AchievementRarity,
  Title
} from '@/types/achievements';
import { AchievementEngine } from '@/lib/achievement-engine';
import AchievementCard from './AchievementCard';
import { getAchievementCategoryChinese, getAchievementRarityChinese } from '@/lib/translations';

interface AchievementsPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function AchievementsPanel({ isVisible, onClose }: AchievementsPanelProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, AchievementProgress>>(new Map());
  const [availableTitles, setAvailableTitles] = useState<Title[]>([]);
  
  // 筛选状态
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'all'>('all');
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 当前视图
  const [currentView, setCurrentView] = useState<'achievements' | 'titles' | 'stats'>('achievements');

  // 初始化数据
  useEffect(() => {
    if (isVisible) {
      AchievementEngine.initialize();
      loadData();
    }
  }, [isVisible]);

  const loadData = () => {
    const allAchievements = AchievementEngine.getAllAchievements();
    const userData = AchievementEngine.getUserAchievements();
    const titles = AchievementEngine.getAvailableTitles();
    
    setAchievements(allAchievements);
    setUserAchievements(userData);
    setAvailableTitles(titles);

    // 加载进度数据
    const progressData = new Map<string, AchievementProgress>();
    allAchievements.forEach(achievement => {
      const progress = AchievementEngine.getAchievementProgress(achievement.id);
      if (progress) {
        progressData.set(achievement.id, progress);
      }
    });
    setProgressMap(progressData);
  };

  // 筛选成就
  const filteredAchievements = achievements.filter(achievement => {
    const progress = progressMap.get(achievement.id);
    
    // 类别筛选
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
      return false;
    }
    
    // 稀有度筛选
    if (selectedRarity !== 'all' && achievement.rarity !== selectedRarity) {
      return false;
    }
    
    // 解锁状态筛选
    if (showOnlyUnlocked && !progress?.isUnlocked) {
      return false;
    }
    
    // 搜索筛选
    if (searchQuery && !achievement.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !achievement.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  // 处理称号选择
  const handleTitleSelect = (titleId: string) => {
    const success = AchievementEngine.setActiveTitle(titleId);
    if (success) {
      loadData(); // 重新加载数据
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🏆 成就中心</h2>
              <p className="opacity-90">追踪你的GTO学习成就和进度</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 用户统计概览 */}
          {userAchievements && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{userAchievements.unlockedAchievements}</div>
                <div className="text-sm opacity-90">已解锁成就</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{userAchievements.completionRate}%</div>
                <div className="text-sm opacity-90">完成率</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{userAchievements.currentLevel}</div>
                <div className="text-sm opacity-90">当前等级</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{userAchievements.totalExperience}</div>
                <div className="text-sm opacity-90">总经验值</div>
              </div>
            </div>
          )}
        </div>

        {/* 导航标签 */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setCurrentView('achievements')}
              className={`px-6 py-3 font-semibold transition-colors ${
                currentView === 'achievements' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 成就列表
            </button>
            <button
              onClick={() => setCurrentView('titles')}
              className={`px-6 py-3 font-semibold transition-colors ${
                currentView === 'titles' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏷️ 称号收集
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className={`px-6 py-3 font-semibold transition-colors ${
                currentView === 'stats' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 详细统计
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {/* 成就列表视图 */}
          {currentView === 'achievements' && (
            <>
              {/* 筛选工具栏 */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-4">
                  {/* 搜索框 */}
                  <div className="flex-1 min-w-64">
                    <input
                      type="text"
                      placeholder="搜索成就..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  {/* 类别筛选 */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as AchievementCategory | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">所有类别</option>
                    <option value="training">{getAchievementCategoryChinese('training')}</option>
                    <option value="performance">{getAchievementCategoryChinese('performance')}</option>
                    <option value="consistency">{getAchievementCategoryChinese('consistency')}</option>
                    <option value="speed">{getAchievementCategoryChinese('speed')}</option>
                    <option value="mastery">{getAchievementCategoryChinese('mastery')}</option>
                    <option value="special">{getAchievementCategoryChinese('special')}</option>
                  </select>
                  
                  {/* 稀有度筛选 */}
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value as AchievementRarity | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">所有稀有度</option>
                    <option value="common">{getAchievementRarityChinese('common')}</option>
                    <option value="uncommon">{getAchievementRarityChinese('uncommon')}</option>
                    <option value="rare">{getAchievementRarityChinese('rare')}</option>
                    <option value="epic">{getAchievementRarityChinese('epic')}</option>
                    <option value="legendary">{getAchievementRarityChinese('legendary')}</option>
                  </select>
                </div>

                {/* 开关选项 */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyUnlocked}
                      onChange={(e) => setShowOnlyUnlocked(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">仅显示已解锁</span>
                  </label>
                </div>
              </div>

              {/* 成就网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAchievements.map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    progress={progressMap.get(achievement.id)}
                    showProgress={true}
                  />
                ))}
              </div>

              {filteredAchievements.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <div>没有找到匹配的成就</div>
                </div>
              )}
            </>
          )}

          {/* 称号视图 */}
          {currentView === 'titles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">可用称号</h3>
                {availableTitles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTitles.map(title => (
                      <div
                        key={title.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          title.isActive 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleTitleSelect(title.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{title.icon}</span>
                              <span className="font-semibold" style={{ color: title.color }}>
                                {title.name}
                              </span>
                              {title.isActive && (
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                  使用中
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{title.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">🏷️</div>
                    <div>暂无可用称号，继续完成成就来解锁！</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 统计视图 */}
          {currentView === 'stats' && userAchievements && (
            <div className="space-y-6">
              {/* 分类统计 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">分类完成情况</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(userAchievements.categoryProgress).map(([category, progress]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        {getAchievementCategoryChinese(category as AchievementCategory)}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {progress.unlocked}/{progress.total}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 稀有度统计 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">稀有度收集情况</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(userAchievements.rarityProgress).map(([rarity, progress]) => (
                    <div key={rarity} className="text-center">
                      <div className="text-2xl mb-2">
                        {rarity === 'common' && '🥉'}
                        {rarity === 'uncommon' && '🥈'}
                        {rarity === 'rare' && '🥇'}
                        {rarity === 'epic' && '💜'}
                        {rarity === 'legendary' && '👑'}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {getAchievementRarityChinese(rarity as AchievementRarity)}
                      </div>
                      <div className="font-bold">{progress.unlocked}/{progress.total}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 经验值进度 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">等级进度</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">等级 {userAchievements.currentLevel}</span>
                    <span className="text-sm text-gray-600">
                      还需 {userAchievements.experienceToNext} EXP 到下一级
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full"
                      style={{ 
                        width: `${Math.max(10, 100 - (userAchievements.experienceToNext / (userAchievements.totalExperience + userAchievements.experienceToNext)) * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600 mt-2">
                    总经验值: {userAchievements.totalExperience}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}