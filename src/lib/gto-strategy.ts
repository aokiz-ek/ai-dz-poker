import { Position, GtoStrategy, HandRange, Card } from '@/types/poker';
import { HandRangeManager } from './hand-ranges';
import { getHandCode } from './poker-utils';
import { getPositionChinese } from './translations';

export interface PreflopStrategy {
  position: Position;
  action: 'open' | 'call' | '3bet' | 'fold';
  ranges: {
    [key: string]: HandRange; // 例如：'raise', 'call', 'fold'
  };
}

export class GtoStrategyEngine {
  private static preflopStrategies: Partial<Record<Position, PreflopStrategy>> = {};
  
  // 使用简化的GTO翻前范围初始化
  static initializePreflopStrategies(): void {
    this.preflopStrategies = {
      'UTG': {
        position: 'UTG',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-99, AKs-ATs, AKo-AQo, KQs, KJs'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('88-22, A9s-A2s, AJo-A2o, KQo-K2o, QJs-Q2s, QJo-Q2o, JTs-J2s, JTo-J2o, T9s-T2s, T9o-T2o, 98s-92s, 98o-92o, 87s-82s, 87o-82o, 76s-72s, 76o-72o, 65s-62s, 65o-62o, 54s-52s, 54o-52o, 43s-42s, 43o-42o, 32s, 32o')
        }
      },
      'UTG1': {
        position: 'UTG1',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-88, AKs-A9s, AKo-AJo, KQs, KJs, KTs, QJs'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('77-22, A8s-A2s, ATo-A2o, KQo-K2o, KTs-K2s, QTs-Q2s, QJo-Q2o, JTs-J2s, JTo-J2o, T9s-T2s, T9o-T2o, 98s-92s, 98o-92o, 87s-82s, 87o-82o, 76s-72s, 76o-72o, 65s-62s, 65o-62o, 54s-52s, 54o-52o, 43s-42s, 43o-42o, 32s, 32o')
        }
      },
      'MP': {
        position: 'MP',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-77, AKs-A8s, AKo-ATo, KQs, KJs, KTs, K9s, QJs, QTs, JTs'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('66-22, A7s-A2s, A9o-A2o, KQo-K2o, K8s-K2s, QJo-Q2o, Q9s-Q2s, JTo-J2o, J9s-J2s, T9s-T2s, T9o-T2o, 98s-92s, 98o-92o, 87s-82s, 87o-82o, 76s-72s, 76o-72o, 65s-62s, 65o-62o, 54s-52s, 54o-52o, 43s-42s, 43o-42o, 32s, 32o')
        }
      },
      'MP1': {
        position: 'MP1',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-66, AKs-A7s, AKo-A9o, KQs-K9s, KQo, KJo, QJs-Q9s, QJo, JTs, JTo, T9s'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('55-22, A6s-A2s, A8o-A2o, K8s-K2s, KTo-K2o, Q8s-Q2s, QTo-Q2o, J9s-J2s, J9o-J2o, T8s-T2s, T9o-T2o, 98s-92s, 98o-92o, 87s-82s, 87o-82o, 76s-72s, 76o-72o, 65s-62s, 65o-62o, 54s-52s, 54o-52o, 43s-42s, 43o-42o, 32s, 32o')
        }
      },
      'CO': {
        position: 'CO',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-55, AKs-A5s, AKo-A8o, KQs-K8s, KQo-KJo, QJs-Q8s, QJo-QTo, JTs-J8s, JTo, T9s-T8s, 98s, 87s'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('44-22, A4s-A2s, A7o-A2o, K7s-K2s, KTo-K2o, Q7s-Q2s, Q9o-Q2o, J7s-J2s, J9o-J2o, T7s-T2s, T9o-T2o, 97s-92s, 98o-92o, 86s-82s, 87o-82o, 76s-72s, 76o-72o, 65s-62s, 65o-62o, 54s-52s, 54o-52o, 43s-42s, 43o-42o, 32s, 32o')
        }
      },
      'BTN': {
        position: 'BTN',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-22, AKs-A2s, AKo-A5o, KQs-K5s, KQo-K9o, QJs-Q7s, QJo-QTo, JTs-J7s, JTo-J9o, T9s-T7s, T9o, 98s-96s, 98o, 87s-85s, 87o, 76s-74s, 76o, 65s-63s, 54s-53s, 43s'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('A4o-A2o, K4s-K2s, K8o-K2o, Q6s-Q2s, Q9o-Q2o, J6s-J2s, J8o-J2o, T6s-T2s, T8o-T2o, 95s-92s, 97o-92o, 84s-82s, 86o-82o, 73s-72s, 75o-72o, 62s, 65o-62o, 52s, 54o-52o, 42s, 43o-42o, 32o')
        }
      },
      'SB': {
        position: 'SB',
        action: 'open',
        ranges: {
          'raise': HandRangeManager.parseRange('AA-22, AKs-A2s, AKo-A3o, KQs-K4s, KQo-K8o, QJs-Q6s, QJo-Q9o, JTs-J6s, JTo-J8o, T9s-T6s, T9o-T8o, 98s-95s, 98o-97o, 87s-84s, 87o-86o, 76s-73s, 76o-75o, 65s-62s, 65o-64o, 54s-52s, 54o-53o, 43s-42s, 43o, 32s'),
          'call': HandRangeManager.parseRange(''),
          'fold': HandRangeManager.parseRange('A2o, K3s-K2s, K7o-K2o, Q5s-Q2s, Q8o-Q2o, J5s-J2s, J7o-J2o, T5s-T2s, T7o-T2o, 94s-92s, 96o-92o, 83s-82s, 85o-82o, 72s, 74o-72o, 65o-62o, 52o, 42o, 32o')
        }
      },
      'BB': {
        position: 'BB',
        action: 'call',
        ranges: {
          'call': HandRangeManager.parseRange('AA-22, AKs-A2s, AKo-A2o, KQs-K2s, KQo-K2o, QJs-Q2s, QJo-Q2o, JTs-J2s, JTo-J2o, T9s-T2s, T9o-T2o, 98s-92s, 98o-92o, 87s-82s, 87o-82o, 76s-72s, 76o-72o, 65s-62s, 65o-62o, 54s-52s, 54o-52o, 43s-42s, 43o-42o, 32s, 32o'),
          'raise': HandRangeManager.parseRange('AA-QQ, AKs, AKo'),
          'fold': HandRangeManager.parseRange('')
        }
      }
    };
  }

  // 获取特定手牌的GTO建议
  static getGtoRecommendation(
    holeCards: [Card, Card],
    position: Position,
    facingAction: 'none' | 'raise' | 'call' | '3bet' = 'none'
  ): GtoStrategy & { recommendation: string } {
    const handCode = getHandCode(holeCards[0], holeCards[1]);
    const strategy = this.preflopStrategies[position];
    
    if (!strategy) {
      return {
        fold: 100,
        recommendation: 'Position strategy not found - fold recommended'
      };
    }

    // 检查每个行动范围
    for (const [action, range] of Object.entries(strategy.ranges)) {
      if (range[handCode] && range[handCode] > 0) {
        const frequency = range[handCode] * 100;
        
        if (action === 'raise') {
          return {
            fold: 0,
            raise: frequency,
            recommendation: `GTO建议在${getPositionChinese(position)}用${handCode}加注`
          };
        } else if (action === 'call') {
          return {
            fold: 0,
            call: frequency,
            recommendation: `GTO建议在${getPositionChinese(position)}用${handCode}跟注`
          };
        } else if (action === 'fold') {
          return {
            fold: frequency,
            recommendation: `GTO建议在${getPositionChinese(position)}用${handCode}弃牌`
          };
        }
      }
    }

    // 如果在任何范围中找不到，默认为弃牌
    return {
      fold: 100,
      recommendation: `GTO建议在${getPositionChinese(position)}用${handCode}弃牌`
    };
  }

  // 比较玩家行动与GTO建议
  static analyzeAction(
    holeCards: [Card, Card],
    position: Position,
    playerAction: 'fold' | 'call' | 'raise',
    facingAction: 'none' | 'raise' | 'call' | '3bet' = 'none'
  ): {
    gtoRecommendation: GtoStrategy & { recommendation: string };
    playerAction: string;
    analysis: string;
    score: number; // 0-100分，其中100分是完美的GTO策略
  } {
    const gtoRec = this.getGtoRecommendation(holeCards, position, facingAction);
    const handCode = getHandCode(holeCards[0], holeCards[1]);
    
    let score = 0;
    let analysis = '';

    // 分析行动
    if (playerAction === 'fold' && gtoRec.fold && gtoRec.fold > 50) {
      score = 100;
      analysis = `优秀！在${getPositionChinese(position)}弃掉${handCode}符合GTO策略。`;
    } else if (playerAction === 'call' && gtoRec.call && gtoRec.call > 50) {
      score = 100;
      analysis = `很好！在${getPositionChinese(position)}用${handCode}跟注是GTO最优选择。`;
    } else if (playerAction === 'raise' && gtoRec.raise && gtoRec.raise > 50) {
      score = 100;
      analysis = `完美！在${getPositionChinese(position)}用${handCode}加注遵循GTO原理。`;
    } else if (playerAction === 'fold') {
      if (gtoRec.raise && gtoRec.raise > 50) {
        score = 20;
        analysis = `太紧了！你在${getPositionChinese(position)}弃掉了${handCode}，但GTO建议用这手牌加注。`;
      } else if (gtoRec.call && gtoRec.call > 50) {
        score = 30;
        analysis = `太紧了！你在${getPositionChinese(position)}弃掉了${handCode}，但GTO建议跟注。`;
      }
    } else if (playerAction === 'call') {
      if (gtoRec.fold && gtoRec.fold > 50) {
        score = 40;
        analysis = `太松了！你在${getPositionChinese(position)}用${handCode}跟注，但GTO建议弃牌。`;
      } else if (gtoRec.raise && gtoRec.raise > 50) {
        score = 70;
        analysis = `错失价值！你在${getPositionChinese(position)}用${handCode}跟注，但GTO建议加注获取价值。`;
      }
    } else if (playerAction === 'raise') {
      if (gtoRec.fold && gtoRec.fold > 50) {
        score = 10;
        analysis = `太激进了！你在${getPositionChinese(position)}用${handCode}加注，但GTO建议弃掉这手牌。`;
      } else if (gtoRec.call && gtoRec.call > 50) {
        score = 60;
        analysis = `过度游戏！你在${getPositionChinese(position)}用${handCode}加注，但GTO建议只需跟注。`;
      }
    }

    return {
      gtoRecommendation: gtoRec,
      playerAction: playerAction.toUpperCase(),
      analysis,
      score
    };
  }

  // 获取手牌强度排名（1-169，其中1是AA）
  static getHandRanking(holeCards: [Card, Card]): number {
    const handCode = getHandCode(holeCards[0], holeCards[1]);
    const rankings = this.getHandRankings();
    return rankings.indexOf(handCode) + 1;
  }

  // 获取从最强到最弱排序的所有手牌
  private static getHandRankings(): string[] {
    return [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'AKo', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
      'AQo', 'KQo', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
      'AJo', 'KJo', 'QJo', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
      'ATo', 'KTo', 'QTo', 'JTo', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
      'A9o', 'K9o', 'Q9o', 'J9o', 'T9o', '98s', '97s', '96s', '95s', '94s', '93s', '92s',
      'A8o', 'K8o', 'Q8o', 'J8o', 'T8o', '98o', '87s', '86s', '85s', '84s', '83s', '82s',
      'A7o', 'K7o', 'Q7o', 'J7o', 'T7o', '97o', '87o', '76s', '75s', '74s', '73s', '72s',
      'A6o', 'K6o', 'Q6o', 'J6o', 'T6o', '96o', '86o', '76o', '65s', '64s', '63s', '62s',
      'A5o', 'K5o', 'Q5o', 'J5o', 'T5o', '95o', '85o', '75o', '65o', '54s', '53s', '52s',
      'A4o', 'K4o', 'Q4o', 'J4o', 'T4o', '94o', '84o', '74o', '64o', '54o', '43s', '42s',
      'A3o', 'K3o', 'Q3o', 'J3o', 'T3o', '93o', '83o', '73o', '63o', '53o', '43o', '32s',
      'A2o', 'K2o', 'Q2o', 'J2o', 'T2o', '92o', '82o', '72o', '62o', '52o', '42o', '32o'
    ];
  }

  // Initialize the engine
  static initialize(): void {
    this.initializePreflopStrategies();
  }
}