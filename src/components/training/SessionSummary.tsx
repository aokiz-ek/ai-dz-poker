import React, { useState, useEffect } from 'react';
import { SessionSummary as ISessionSummary } from '@/types/training';
import { AchievementEngine } from '@/lib/achievement-engine';
import { Achievement, AchievementUnlock } from '@/types/achievements';

interface SessionSummaryProps {
  summary: ISessionSummary;
  onReturnToLobby: () => void;
  onRetry: () => void;
}

export default function SessionSummary({
  summary,
  onReturnToLobby,
  onRetry
}: SessionSummaryProps) {
  const [recentAchievements, setRecentAchievements] = useState<{achievement: Achievement, unlock: AchievementUnlock}[]>([]);
  
  // 加载最近解锁的成就
  useEffect(() => {
    const recentUnlocks = AchievementEngine.getRecentUnlocks();
    const allAchievements = AchievementEngine.getAllAchievements();
    
    const achievementUnlockPairs = recentUnlocks
      .filter(unlock => !unlock.hasBeenShown)
      .map(unlock => {
        const achievement = allAchievements.find(a => a.id === unlock.achievementId);
        return achievement ? { achievement, unlock } : null;
      })
      .filter(Boolean) as {achievement: Achievement, unlock: AchievementUnlock}[];
    
    setRecentAchievements(achievementUnlockPairs);
  }, []);
  
  // 获取等级评价
  const getGrade = (score: number): { grade: string; color: string; description: string } => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600', description: '完美掌握' };
    if (score >= 85) return { grade: 'A', color: 'text-green-500', description: '优秀' };
    if (score >= 80) return { grade: 'B+', color: 'text-blue-500', description: '良好' };
    if (score >= 75) return { grade: 'B', color: 'text-blue-400', description: '不错' };
    if (score >= 70) return { grade: 'C+', color: 'text-yellow-500', description: '及格' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-500', description: '需要提高' };
    return { grade: 'D', color: 'text-red-500', description: '需要加强练习' };
  };

  const gradeInfo = getGrade(summary.averageScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {summary.unlockNextScenario ? '🏆' : '💪'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {summary.unlockNextScenario ? '训练完成！' : '继续加油！'}
          </h1>
          <p className="text-gray-600">
            完成了 {summary.handsCompleted} 个决策，用时 {Math.floor(summary.duration / 60)} 分 {summary.duration % 60} 秒
          </p>
        </div>

        {/* Score Display */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${gradeInfo.color} mb-2`}>
                {gradeInfo.grade}
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">{gradeInfo.description}</div>
              <div className="text-sm text-gray-600">总体评级</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold text-indigo-600 mb-2">
                {summary.averageScore}
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">平均得分</div>
              <div className="text-sm text-gray-600">满分100分</div>
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            📊 表现分析
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.performance.excellent}</div>
              <div className="text-xs text-green-700 mt-1">完美决策</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.performance.good}</div>
              <div className="text-xs text-blue-700 mt-1">良好决策</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.performance.improvement}</div>
              <div className="text-xs text-yellow-700 mt-1">待改进</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.performance.mistakes}</div>
              <div className="text-xs text-red-700 mt-1">错误决策</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {summary.achievements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              🎉 获得成就
            </h3>
            <div className="space-y-2">
              {summary.achievements.map((achievement, index) => (
                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="text-xl">🏅</div>
                  <div className="font-medium text-yellow-800">{achievement}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {summary.improvements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              📈 进步之处
            </h3>
            <div className="space-y-2">
              {summary.improvements.map((improvement, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="text-lg">✅</div>
                  <div className="text-green-700">{improvement}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {summary.weaknesses.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              🎯 需要改进
            </h3>
            <div className="space-y-2">
              {summary.weaknesses.map((weakness, index) => (
                <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="text-lg">💡</div>
                  <div className="text-orange-700">{weakness}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-8">
          <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
            🔮 下一步建议
          </h3>
          <p className="text-indigo-700">{summary.nextRecommendation}</p>
        </div>

        {/* 新解锁成就 */}
        {recentAchievements.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              🏆 本次训练解锁成就
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentAchievements.map(({achievement, unlock}) => (
                <div key={achievement.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <div className="font-bold text-yellow-800">{achievement.name}</div>
                      <div className="text-xs text-yellow-600">
                        {achievement.rarity === 'common' && '普通'}
                        {achievement.rarity === 'uncommon' && '罕见'}
                        {achievement.rarity === 'rare' && '稀有'}
                        {achievement.rarity === 'epic' && '史诗'}
                        {achievement.rarity === 'legendary' && '传说'}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-yellow-700">{achievement.description}</p>
                  {achievement.rewards.experience && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600">
                      <span>⭐</span>
                      <span>+{achievement.rewards.experience} EXP</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unlock Status */}
        {summary.unlockNextScenario && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔓</div>
              <div>
                <div className="font-bold text-green-800">恭喜解锁下一个场景！</div>
                <div className="text-green-600 text-sm">你已经达到了70分的要求，可以尝试更高雾度的训练。</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            返回大厅
          </button>
          <button
            onClick={onRetry}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
          >
            再试一次
          </button>
        </div>
      </div>
    </div>
  );
}