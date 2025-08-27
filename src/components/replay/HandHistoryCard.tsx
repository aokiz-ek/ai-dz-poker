import React from 'react';
import { Badge, Tooltip, Space } from 'antd';
import { 
  PlayCircleOutlined, 
  TrophyOutlined, 
  CloseOutlined,
  StarFilled,
  ThunderboltOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { CompactHandHistory } from '@/types/hand-history';
import { formatStack } from '@/lib/poker-utils';

interface HandHistoryCardProps {
  hand: CompactHandHistory;
  isSelected?: boolean;
  onSelect: () => void;
  className?: string;
}

interface HandAnalysis {
  profit: number;
  winRate: number;
  handStrength: 'premium' | 'strong' | 'playable' | 'marginal' | 'weak';
  heroPosition: string;
  vpipPercentage: number;
  aggressionLevel: 'passive' | 'moderate' | 'aggressive';
}

const HandHistoryCard: React.FC<HandHistoryCardProps> = ({
  hand,
  isSelected = false,
  onSelect,
  className = ''
}) => {
  
  // Calculate hand analysis data
  const analysis = React.useMemo((): HandAnalysis => {
    // Find hero (player with id 'hero' or player 0)
    const hero = hand.players.find(p => p.id === 'hero') || hand.players[0];
    
    // Calculate profit (simplified - would be more complex in real implementation)
    const profit = hand.result.winners.includes(0) 
      ? hand.result.potSize * 0.6 // Rough estimate
      : -hand.blinds[1] * 2; // Rough loss estimate

    // Determine hand strength based on cards
    const handStrength = getHandStrength(hero?.cards || []);
    
    // Get hero position
    const heroPosition = hero?.position || 'UTG';
    
    // Mock VPIP and aggression data (in real implementation, this would come from statistics)
    const vpipPercentage = Math.floor(Math.random() * 40) + 15; // 15-55%
    const aggressionLevel: 'passive' | 'moderate' | 'aggressive' = 
      ['passive', 'moderate', 'aggressive'][Math.floor(Math.random() * 3)] as any;

    return {
      profit,
      winRate: hand.result.winners.includes(0) ? 100 : 0,
      handStrength,
      heroPosition,
      vpipPercentage,
      aggressionLevel
    };
  }, [hand]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffHours < 48) return '昨天';
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatProfit = (profit: number): string => {
    const sign = profit >= 0 ? '+' : '';
    return `${sign}$${Math.abs(profit).toFixed(2)}`;
  };

  const getHandStrengthColor = (strength: string): string => {
    const colors = {
      premium: 'text-yellow-300 bg-yellow-900 border-yellow-700',
      strong: 'text-green-300 bg-green-900 border-green-700',
      playable: 'text-blue-300 bg-blue-900 border-blue-700',
      marginal: 'text-orange-300 bg-orange-900 border-orange-700',
      weak: 'text-red-300 bg-red-900 border-red-700'
    };
    return colors[strength as keyof typeof colors] || colors.weak;
  };

  const getProfitColor = (profit: number): string => {
    if (profit > 0) return 'text-green-300 bg-green-900 border-green-700';
    if (profit < 0) return 'text-red-300 bg-red-900 border-red-700';
    return 'text-gray-300 bg-gray-900 border-gray-700';
  };

  const getAggressionIcon = (level: string) => {
    switch (level) {
      case 'aggressive': return <ThunderboltOutlined className="text-red-400" />;
      case 'moderate': return <StarFilled className="text-yellow-400" />;
      case 'passive': return <div className="w-3 h-3 rounded-full bg-blue-400" />;
      default: return null;
    }
  };

  return (
    <div 
      className={`hand-history-card ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`手牌 ${hand.id} - ${analysis.profit >= 0 ? '收益' : '损失'} ${formatProfit(analysis.profit)}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-base font-mono text-white font-bold bg-poker-blue px-2 py-1 rounded">
            #{hand.id.slice(-8)}
          </div>
          <div className="text-sm text-poker-text-primary font-medium">
            {formatTimestamp(hand.timestamp)}
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-md font-bold text-base ${analysis.profit >= 0 ? 
          'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {formatProfit(analysis.profit)}
        </div>
      </div>

      {/* Game Info Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Tooltip title="盲注级别">
            <div className="flex items-center bg-poker-bg-elevated px-2 py-1 rounded text-sm text-white font-medium">
              <DollarOutlined className="mr-1 text-poker-secondary" />
              {hand.blinds.join('/')}
            </div>
          </Tooltip>
          
          <Tooltip title="玩家数量">
            <div className="bg-poker-bg-elevated px-2 py-1 rounded text-sm text-white font-medium">
              {hand.players.length}P
            </div>
          </Tooltip>
          
          <Tooltip title="英雄位置">
            <div className="bg-poker-secondary px-2 py-1 rounded text-sm text-poker-bg-dark font-bold">
              {analysis.heroPosition}
            </div>
          </Tooltip>
        </div>

        <div className="flex items-center space-x-2">
          <Tooltip title={`底池大小: $${formatStack(hand.result.potSize)}`}>
            <div className="bg-poker-bg-elevated px-3 py-1 rounded text-sm font-mono text-poker-secondary font-bold">
              ${formatStack(hand.result.potSize)}
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Hand Details Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Hand Strength Badge */}
          <Tooltip title={`手牌强度: ${analysis.handStrength}`}>
            <div className={`px-3 py-1.5 rounded-md font-bold text-sm border-2 ${
              analysis.handStrength === 'premium' ? 'bg-yellow-600 text-white border-yellow-400' :
              analysis.handStrength === 'strong' ? 'bg-green-600 text-white border-green-400' :
              analysis.handStrength === 'playable' ? 'bg-blue-600 text-white border-blue-400' :
              analysis.handStrength === 'marginal' ? 'bg-orange-600 text-white border-orange-400' :
              'bg-red-600 text-white border-red-400'
            }`}>
              {analysis.handStrength === 'premium' && '💎 '}
              {analysis.handStrength === 'strong' && '💪 '}
              {analysis.handStrength === 'playable' && '👍 '}
              {analysis.handStrength === 'marginal' && '⚠️ '}
              {analysis.handStrength === 'weak' && '👎 '}
              {analysis.handStrength.toUpperCase()}
            </div>
          </Tooltip>

          {/* Player Style Indicators */}
          <div className="flex items-center space-x-2">
            <Tooltip title={`VPIP: ${analysis.vpipPercentage}%`}>
              <div className="bg-poker-bg-elevated px-2 py-1 rounded text-sm text-white font-medium border border-poker-secondary">
                VPIP {analysis.vpipPercentage}%
              </div>
            </Tooltip>
            
            <Tooltip title={`侵略性: ${analysis.aggressionLevel}`}>
              <div className={`px-2 py-1 rounded text-sm font-medium ${
                analysis.aggressionLevel === 'aggressive' ? 'bg-red-600 text-white' :
                analysis.aggressionLevel === 'moderate' ? 'bg-yellow-600 text-white' :
                'bg-blue-600 text-white'
              }`}>
                {getAggressionIcon(analysis.aggressionLevel)}
                <span className="ml-1">{analysis.aggressionLevel.toUpperCase()}</span>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Result Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-2 rounded-lg font-bold text-lg ${
            hand.result.winners.includes(0) ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {hand.result.winners.includes(0) ? (
              <div className="flex items-center space-x-1">
                <TrophyOutlined />
                <span>胜</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <CloseOutlined />
                <span>负</span>
              </div>
            )}
          </div>
          
          {hand.result.showdown && (
            <Tooltip title="摊牌">
              <div className="bg-poker-secondary px-2 py-1 rounded text-xs text-poker-bg-dark font-bold">
                摊牌
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-poker-bg-elevated px-2 py-1 rounded text-sm text-white font-medium">
            {hand.actions.length} 动作
          </div>
          {hand.result.showdown && (
            <div className="bg-poker-secondary px-2 py-1 rounded text-xs text-poker-bg-dark font-bold">
              摊牌
            </div>
          )}
          <div className="bg-poker-blue px-2 py-1 rounded text-sm text-white font-medium">
            {['翻牌前', '翻牌', '转牌', '河牌'][hand.snapshots[0]?.stage || 0]}
          </div>
        </div>
        
        <button 
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-poker-secondary to-yellow-500 text-poker-bg-dark text-base font-bold hover:from-yellow-500 hover:to-poker-secondary transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-poker-secondary focus:ring-opacity-50 shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-label="播放回放"
        >
          <PlayCircleOutlined className="text-lg" />
          <span>开始回放</span>
        </button>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-poker-secondary to-transparent opacity-0 hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

// Helper function to determine hand strength
function getHandStrength(cards: any[]): 'premium' | 'strong' | 'playable' | 'marginal' | 'weak' {
  if (!cards || cards.length !== 2) return 'weak';
  
  const [card1, card2] = cards;
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const rank1Index = ranks.indexOf(card1.rank);
  const rank2Index = ranks.indexOf(card2.rank);
  
  // Pocket pairs
  if (rank1Index === rank2Index) {
    if (rank1Index >= 10) return 'premium'; // QQ, KK, AA
    if (rank1Index >= 7) return 'strong';   // 99, TT, JJ
    if (rank1Index >= 4) return 'playable'; // 66, 77, 88
    return 'marginal'; // 22-55
  }
  
  // Suited/unsuited combinations
  const suited = card1.suit === card2.suit;
  const highCard = Math.max(rank1Index, rank2Index);
  const lowCard = Math.min(rank1Index, rank2Index);
  
  // Premium hands
  if (highCard === 12 && lowCard >= 10) return 'premium'; // AK, AQ, AJ
  if (highCard >= 11 && lowCard >= 9 && suited) return 'premium'; // KQs, KJs, QJs
  
  // Strong hands
  if (highCard === 12 && lowCard >= 7) return 'strong'; // AT, A9
  if (highCard >= 10 && lowCard >= 8) return 'strong'; // KT, QT, JT
  
  // Playable hands
  if (suited && highCard >= 9) return 'playable';
  if (highCard >= 9 && lowCard >= 6) return 'playable';
  
  // Marginal hands
  if (suited || highCard >= 8) return 'marginal';
  
  return 'weak';
}

export default HandHistoryCard;