"use client"

import React, { useState } from 'react';
import { TrainingScenario, TrainingScenarioManager } from '@/lib/training-scenarios';

interface ScenarioSelectorProps {
  onScenarioSelect: (scenario: TrainingScenario) => void;
  playerStats: {
    handsPlayed: number;
    averageScore: number;
  };
  visible: boolean;
  onClose: () => void;
}

const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  onScenarioSelect,
  playerStats,
  visible,
  onClose
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [selectedFocus, setSelectedFocus] = useState<'all' | 'preflop' | 'postflop' | 'mixed'>('all');

  if (!visible) return null;

  const allScenarios = TrainingScenarioManager.getAllScenarios();
  const recommendedScenarios = TrainingScenarioManager.getRecommendedScenarios(
    playerStats.averageScore,
    playerStats.handsPlayed
  );

  const filteredScenarios = allScenarios.filter(scenario => {
    const matchesDifficulty = selectedDifficulty === 'all' || scenario.difficulty === selectedDifficulty;
    const matchesFocus = selectedFocus === 'all' || scenario.focusArea === selectedFocus;
    return matchesDifficulty && matchesFocus;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return '未知';
    }
  };

  const getFocusLabel = (focus: string) => {
    switch (focus) {
      case 'preflop': return '翻前';
      case 'postflop': return '翻后';
      case 'mixed': return '混合';
      default: return '未知';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold mb-2">选择训练场景</h2>
              <p className="text-blue-100">
                根据您的水平选择合适的训练场景来提升技能
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Player Stats */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">您的统计数据</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">已玩手数:</span>
                <span className="ml-2 font-medium">{playerStats.handsPlayed}</span>
              </div>
              <div>
                <span className="text-gray-600">平均得分:</span>
                <span className={`ml-2 font-medium ${
                  playerStats.averageScore >= 70 ? 'text-green-600' : 
                  playerStats.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {playerStats.averageScore}
                </span>
              </div>
            </div>
          </div>

          {/* Recommended Scenarios */}
          {recommendedScenarios.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center">
                <span className="text-yellow-500 mr-2">⭐</span>
                推荐场景
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendedScenarios.slice(0, 2).map(scenario => (
                  <div
                    key={scenario.id}
                    className="border-2 border-yellow-200 rounded-lg p-4 cursor-pointer hover:border-yellow-300 transition-colors bg-yellow-50"
                    onClick={() => onScenarioSelect(scenario)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(scenario.difficulty)}`}>
                        {getDifficultyLabel(scenario.difficulty)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {scenario.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">筛选条件</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">难度等级</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">全部难度</option>
                  <option value="beginner">初级</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">训练重点</label>
                <select
                  value={selectedFocus}
                  onChange={(e) => setSelectedFocus(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">全部类型</option>
                  <option value="preflop">翻前</option>
                  <option value="postflop">翻后</option>
                  <option value="mixed">混合</option>
                </select>
              </div>
            </div>
          </div>

          {/* All Scenarios */}
          <div>
            <h3 className="font-medium mb-3">所有场景</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScenarios.map(scenario => {
                const isRecommended = recommendedScenarios.some(r => r.id === scenario.id);
                const objectives = TrainingScenarioManager.getLearningObjectives(scenario.id);
                
                return (
                  <div
                    key={scenario.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors ${
                      isRecommended ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onScenarioSelect(scenario)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{scenario.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(scenario.difficulty)}`}>
                        {getDifficultyLabel(scenario.difficulty)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{scenario.description}</p>
                    
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">学习目标:</div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {objectives.slice(0, 2).map((objective, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-1">•</span>
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {getFocusLabel(scenario.focusArea)}
                      </span>
                      <span className="text-gray-500">
                        {scenario.position}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSelector;