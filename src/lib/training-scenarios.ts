import { Position } from '@/types/poker';

export interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  position: Position;
  stackSizes: {
    player: number;
    opponent: number;
  };
  blinds: {
    small: number;
    big: number;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focusArea: 'preflop' | 'postflop' | 'mixed';
  tags: string[];
}

export class TrainingScenarioManager {
  private static scenarios: TrainingScenario[] = [
    {
      id: 'btn-vs-bb-deep',
      name: '按钮位对大盲位(深资源)',
      description: '深资源按钮位对大盲位的经典对抗场景，练习位置优势的利用',
      position: 'BTN',
      stackSizes: { player: 10000, opponent: 10000 },
      blinds: { small: 25, big: 50 },
      difficulty: 'beginner',
      focusArea: 'preflop',
      tags: ['位置优势', '深资源', '单挑']
    },
    {
      id: 'utg-6max',
      name: '枪口位开牌(六人桌)',
      description: '六人桌 UTG 位置的紧手范围练习，学习早位置开牌标准',
      position: 'UTG',
      stackSizes: { player: 5000, opponent: 5000 },
      blinds: { small: 25, big: 50 },
      difficulty: 'intermediate',
      focusArea: 'preflop',
      tags: ['早位置', '六人桌', '紧手范围']
    },
    {
      id: 'co-steal',
      name: '关煞位偷盲',
      description: 'CO 位置的偷盲练习，平衡激进和保守的策略',
      position: 'CO',
      stackSizes: { player: 5000, opponent: 4800 },
      blinds: { small: 25, big: 50 },
      difficulty: 'intermediate',
      focusArea: 'preflop',
      tags: ['偷盲', '关煞位', '侵略性']
    },
    {
      id: 'sb-vs-bb',
      name: '小盲位对大盲位',
      description: '小盲对大盲的特殊场景，练习盲位对抗策略',
      position: 'SB',
      stackSizes: { player: 5000, opponent: 5000 },
      blinds: { small: 25, big: 50 },
      difficulty: 'advanced',
      focusArea: 'preflop',
      tags: ['盲位对抗', '单挑', '复杂策略']
    },
    {
      id: 'mp-3bet-defense',
      name: '中位3-Bet防守',
      description: '中位开牌后面对 3-bet 的防守决策训练',
      position: 'MP',
      stackSizes: { player: 5000, opponent: 5200 },
      blinds: { small: 25, big: 50 },
      difficulty: 'advanced',
      focusArea: 'preflop',
      tags: ['3-bet防守', '中位', '范围构建']
    },
    {
      id: 'tournament-bubble',
      name: '锦标赛泡沫期',
      description: '锦标赛泡沫期的紧缩策略练习',
      position: 'BTN',
      stackSizes: { player: 1500, opponent: 2000 },
      blinds: { small: 100, big: 200 },
      difficulty: 'advanced',
      focusArea: 'preflop',
      tags: ['锦标赛', '泡沫期', '短资源']
    }
  ];

  // 获取所有可用场景
  static getAllScenarios(): TrainingScenario[] {
    return [...this.scenarios];
  }

  // 根据难度获取场景
  static getScenariosByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): TrainingScenario[] {
    return this.scenarios.filter(s => s.difficulty === difficulty);
  }

  // 根据重点区域获取场景
  static getScenariosByFocus(focusArea: 'preflop' | 'postflop' | 'mixed'): TrainingScenario[] {
    return this.scenarios.filter(s => s.focusArea === focusArea);
  }

  // 根据ID获取场景
  static getScenarioById(id: string): TrainingScenario | null {
    return this.scenarios.find(s => s.id === id) || null;
  }

  // 根据玩家统计数据推荐场景
  static getRecommendedScenarios(averageScore: number, handsPlayed: number): TrainingScenario[] {
    if (handsPlayed < 10) {
      // 新玩家从初级场景开始
      return this.getScenariosByDifficulty('beginner');
    }
    
    if (averageScore >= 80) {
      // 高分玩家获得高级场景
      return this.getScenariosByDifficulty('advanced');
    } else if (averageScore >= 60) {
      // 表现不错的玩家获得中级场景
      return this.getScenariosByDifficulty('intermediate');
    } else {
      // 需要提高的玩家继续初级场景
      return this.getScenariosByDifficulty('beginner');
    }
  }

  // 为场景训练生成随机手牌
  static generateScenarioHand(scenario: TrainingScenario): {
    playerPosition: Position;
    opponentPositions: Position[];
    stackSizes: { player: number; opponents: number[] };
    blinds: { small: number; big: number };
  } {
    // 目前生成简单的单挑场景
    // 将来可以扩展支持多人场景
    
    const opponentPosition: Position = scenario.position === 'BTN' ? 'BB' : 
                                     scenario.position === 'BB' ? 'BTN' :
                                     scenario.position === 'SB' ? 'BB' :
                                     'BTN'; // 默认对手位置

    return {
      playerPosition: scenario.position,
      opponentPositions: [opponentPosition],
      stackSizes: {
        player: scenario.stackSizes.player,
        opponents: [scenario.stackSizes.opponent]
      },
      blinds: scenario.blinds
    };
  }

  // 获取场景的学习目标
  static getLearningObjectives(scenarioId: string): string[] {
    const objectives: Record<string, string[]> = {
      'btn-vs-bb-deep': [
        '了解位置优势的价值',
        '学习按钮位的宽范围开牌',
        '掌握深筹码下的策略调整',
        '理解对手防守范围'
      ],
      'utg-6max': [
        '掌握早位置的紧手范围',
        '理解为什么 UTG 需要更强的牌',
        '学习多人局面的考虑因素',
        '避免早位置的常见错误'
      ],
      'co-steal': [
        '学习偷盲的最优频率',
        '理解 CO 位置的范围构建',
        '掌握面对防守时的应对',
        '平衡价值牌和诈唬牌'
      ],
      'sb-vs-bb': [
        '理解盲位对抗的特殊性',
        '学习小盲位的混合策略',
        '掌握位置劣势的补偿',
        '理解翻前的复杂决策树'
      ],
      'mp-3bet-defense': [
        '学习面对 3-bet 的防守策略',
        '理解继续范围的构建',
        '掌握 4-bet 的时机选择',
        '平衡弃牌和继续的频率'
      ],
      'tournament-bubble': [
        '理解锦标赛的特殊考量',
        '学习 ICM 压力下的调整',
        '掌握短资源的生存策略',
        '理解风险与收益的平衡'
      ]
    };

    return objectives[scenarioId] || ['提升整体决策水平', '理解 GTO 策略原理'];
  }
}