"use client"

import React from 'react';
import { Card } from '@/types/poker';

interface GtoAnalysis {
  gtoRecommendation: {
    fold?: number;
    call?: number;
    raise?: number;
    recommendation: string;
  };
  playerAction: string;
  analysis: string;
  score: number;
}

interface GtoFeedbackProps {
  analysis: GtoAnalysis | null;
  holeCards?: [Card, Card];
  position?: string;
  onClose: () => void;
  visible: boolean;
}

const GtoFeedback: React.FC<GtoFeedbackProps> = ({
  analysis,
  holeCards,
  position,
  onClose,
  visible
}) => {
  if (!visible || !analysis) return null;

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    if (score >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const suitColors = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-black',
    spades: 'text-black'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">GTO Analysis</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Hand and Position Info */}
          {holeCards && position && (
            <div className="flex items-center justify-center mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex space-x-2 mr-4">
                {holeCards.map((card, index) => (
                  <div
                    key={index}
                    className="w-12 h-16 bg-white rounded shadow border flex flex-col justify-between p-1 text-center"
                  >
                    <div className={`text-xs font-bold ${suitColors[card.suit]}`}>
                      {card.rank}
                    </div>
                    <div className={`text-lg ${suitColors[card.suit]}`}>
                      {suitSymbols[card.suit]}
                    </div>
                    <div className={`text-xs font-bold transform rotate-180 ${suitColors[card.suit]}`}>
                      {card.rank}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-700">Position: {position}</div>
              </div>
            </div>
          )}

          {/* Score */}
          <div className="text-center mb-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold ${getScoreColor(analysis.score)}`}>
              <span className="text-2xl mr-2">{analysis.score}</span>
              <span>{getScoreLabel(analysis.score)}</span>
            </div>
          </div>

          {/* Action Comparison */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Your Action</div>
                <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium">
                  {analysis.playerAction}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">GTO Suggests</div>
                <div className="bg-green-100 text-green-800 px-3 py-2 rounded font-medium">
                  {analysis.gtoRecommendation.fold && analysis.gtoRecommendation.fold > 50 ? 'FOLD' :
                   analysis.gtoRecommendation.call && analysis.gtoRecommendation.call > 50 ? 'CALL' :
                   analysis.gtoRecommendation.raise && analysis.gtoRecommendation.raise > 50 ? 'RAISE' : 'MIXED'}
                </div>
              </div>
            </div>
          </div>

          {/* GTO Frequencies */}
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">GTO Strategy Breakdown</div>
            <div className="space-y-2">
              {analysis.gtoRecommendation.fold && analysis.gtoRecommendation.fold > 0 && (
                <div className="flex items-center">
                  <span className="w-12 text-xs text-gray-600">Fold:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${analysis.gtoRecommendation.fold}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 w-8">
                    {Math.round(analysis.gtoRecommendation.fold)}%
                  </span>
                </div>
              )}
              
              {analysis.gtoRecommendation.call && analysis.gtoRecommendation.call > 0 && (
                <div className="flex items-center">
                  <span className="w-12 text-xs text-gray-600">Call:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${analysis.gtoRecommendation.call}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 w-8">
                    {Math.round(analysis.gtoRecommendation.call)}%
                  </span>
                </div>
              )}
              
              {analysis.gtoRecommendation.raise && analysis.gtoRecommendation.raise > 0 && (
                <div className="flex items-center">
                  <span className="w-12 text-xs text-gray-600">Raise:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${analysis.gtoRecommendation.raise}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 w-8">
                    {Math.round(analysis.gtoRecommendation.raise)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Text */}
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">Analysis</div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              {analysis.analysis}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Continue Playing
          </button>
        </div>
      </div>
    </div>
  );
};

export default GtoFeedback;