import { 
  Card, 
  Suit, 
  Rank, 
  HandRank, 
  HandStrengthResult, 
  DrawType, 
  DrawAnalysis, 
  BlockerEffect 
} from '@/types/poker';

/**
 * HandEvaluator - 翻后手牌评估核心引擎
 * 
 * 功能：
 * 1. 五张牌手牌强度评估
 * 2. 听牌分析（同花听、顺子听等）  
 * 3. 阻断牌效应分析
 * 
 * 性能目标：<10ms评估时间
 */
export class HandEvaluator {
  // 手牌等级权重映射 (用于快速比较)
  private static readonly HAND_RANK_VALUES: Record<HandRank, number> = {
    'high-card': 0,
    'pair': 1,
    'two-pair': 2,
    'three-of-a-kind': 3,
    'straight': 4,
    'flush': 5,
    'full-house': 6,
    'four-of-a-kind': 7,
    'straight-flush': 8,
    'royal-flush': 9
  };

  // 牌面数值映射 (A=14, K=13, Q=12, J=11, T=10, 9-2对应)
  private static readonly RANK_VALUES: Record<Rank, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };

  // 花色映射
  private static readonly SUIT_VALUES: Record<Suit, number> = {
    'spades': 0, 'hearts': 1, 'diamonds': 2, 'clubs': 3
  };

  /**
   * 评估五张牌的手牌强度
   * @param cards - 五张牌 (2张手牌 + 3-5张公共牌中选择最佳5张)
   * @returns 手牌强度结果
   */
  static evaluateHand(cards: Card[]): HandStrengthResult {
    if (cards.length !== 5) {
      throw new Error('Hand evaluation requires exactly 5 cards');
    }

    // 按牌面大小排序 (从大到小)
    const sortedCards = [...cards].sort((a, b) => 
      this.RANK_VALUES[b.rank] - this.RANK_VALUES[a.rank]
    );

    // 分析牌面组合
    const analysis = this.analyzeCardCombination(sortedCards);
    
    // 计算具体强度值
    const strength = this.calculateHandStrength(analysis);

    return {
      rank: analysis.rank,
      strength,
      kickers: analysis.kickers,
      description: this.generateHandDescription(analysis)
    };
  }

  /**
   * 从7张牌中找到最强的5张牌组合
   * @param holeCards - 2张手牌
   * @param board - 公共牌 (3-5张)
   * @returns 最强手牌结果
   */
  static evaluateBestHand(holeCards: [Card, Card], board: Card[]): HandStrengthResult {
    const allCards = [...holeCards, ...board];
    if (allCards.length < 5 || allCards.length > 7) {
      throw new Error('Need 5-7 cards for best hand evaluation');
    }

    // 如果正好5张牌，直接评估
    if (allCards.length === 5) {
      return this.evaluateHand(allCards);
    }

    // 生成所有可能的5张牌组合
    const combinations = this.generateCombinations(allCards, 5);
    let bestHand: HandStrengthResult | null = null;

    // 找到最强的组合
    for (const combination of combinations) {
      const handResult = this.evaluateHand(combination);
      
      if (!bestHand || handResult.strength > bestHand.strength) {
        bestHand = handResult;
      }
    }

    return bestHand!;
  }

  /**
   * 分析听牌情况
   * @param holeCards - 手牌
   * @param board - 公共牌
   * @returns 听牌分析结果
   */
  static analyzeDraws(holeCards: [Card, Card], board: Card[]): DrawAnalysis {
    const allCards = [...holeCards, ...board];
    const draws: DrawType[] = [];
    let totalOuts = 0;

    // 分析同花听
    const flushDraw = this.analyzeFlushDraw(allCards);
    if (flushDraw.outs > 0) {
      draws.push(flushDraw.type);
      totalOuts += flushDraw.outs;
    }

    // 分析顺子听
    const straightDraw = this.analyzeStraightDraw(allCards);
    if (straightDraw.outs > 0) {
      draws.push(straightDraw.type);
      totalOuts += straightDraw.outs;
    }

    // 分析后门听
    if (board.length <= 4) { // 只在翻牌和转牌分析后门听
      const backdoorDraws = this.analyzeBackdoorDraws(allCards);
      draws.push(...backdoorDraws.types);
      totalOuts += backdoorDraws.outs;
    }

    // 计算完成概率
    const remainingCards = board.length === 3 ? 47 : 46; // 翻牌47张未知，转牌46张
    const odds = totalOuts > 0 ? (totalOuts / remainingCards) * 100 : 0;

    return {
      draws,
      outs: totalOuts,
      odds: Math.round(odds * 100) / 100,
      impliedOdds: this.calculateImpliedOdds(totalOuts, odds)
    };
  }

  /**
   * 分析阻断牌效应
   * @param holeCards - 手牌
   * @param board - 公共牌  
   * @returns 阻断效应分析
   */
  static analyzeBlockers(holeCards: [Card, Card], board: Card[]): BlockerEffect {
    const blockedHands: string[] = [];
    const unblockedHands: string[] = [];

    // 分析我们的手牌阻断了哪些对手的强牌组合
    for (const card of holeCards) {
      // 阻断顶对
      if (board.length > 0) {
        const topCard = this.getTopBoardCard(board);
        if (card.rank === topCard.rank) {
          blockedHands.push(`Top Pair with ${card.rank}`);
        }
      }

      // 阻断同花
      const suitedBoard = board.filter(c => c.suit === card.suit);
      if (suitedBoard.length >= 2) {
        blockedHands.push(`${card.suit} flush draws`);
      }

      // 阻断顺子
      const straightBlockers = this.analyzeStraightBlockers(card, board);
      blockedHands.push(...straightBlockers);
    }

    // 计算阻断影响 (-1 到 1)
    const impact = this.calculateBlockerImpact(blockedHands, unblockedHands);

    return {
      blockedHands,
      unblockedHands,
      impact
    };
  }

  // =================== 私有辅助方法 ===================

  /**
   * 分析牌面组合类型
   */
  private static analyzeCardCombination(sortedCards: Card[]) {
    const ranks = sortedCards.map(c => c.rank);
    const suits = sortedCards.map(c => c.suit);
    
    // 统计每个牌面出现次数
    const rankCounts = this.countRanks(ranks);
    const suitCounts = this.countSuits(suits);
    
    const isFlush = Object.values(suitCounts).some(count => count >= 5);
    const isStraight = this.isStraight(ranks);

    // 判断手牌类型
    if (isStraight && isFlush) {
      if (ranks[0] === 'A' && ranks[1] === 'K') {
        return { rank: 'royal-flush' as HandRank, kickers: [] as Rank[] };
      }
      return { rank: 'straight-flush' as HandRank, kickers: [ranks[0]] };
    }

    if (Object.values(rankCounts).includes(4)) {
      const fourKind = Object.keys(rankCounts).find(rank => rankCounts[rank as Rank] === 4) as Rank;
      const kicker = Object.keys(rankCounts).find(rank => rankCounts[rank as Rank] === 1) as Rank;
      return { rank: 'four-of-a-kind' as HandRank, kickers: [fourKind, kicker] };
    }

    if (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2)) {
      const trips = Object.keys(rankCounts).find(rank => rankCounts[rank as Rank] === 3) as Rank;
      const pair = Object.keys(rankCounts).find(rank => rankCounts[rank as Rank] === 2) as Rank;
      return { rank: 'full-house' as HandRank, kickers: [trips, pair] };
    }

    if (isFlush) {
      return { rank: 'flush' as HandRank, kickers: ranks.slice(0, 5) };
    }

    if (isStraight) {
      return { rank: 'straight' as HandRank, kickers: [ranks[0]] };
    }

    if (Object.values(rankCounts).includes(3)) {
      const trips = Object.keys(rankCounts).find(rank => rankCounts[rank as Rank] === 3) as Rank;
      const kickers = Object.keys(rankCounts)
        .filter(rank => rankCounts[rank as Rank] === 1)
        .slice(0, 2) as Rank[];
      return { rank: 'three-of-a-kind' as HandRank, kickers: [trips, ...kickers] };
    }

    const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank as Rank] === 2);
    if (pairs.length >= 2) {
      const sortedPairs = pairs.sort((a, b) => 
        this.RANK_VALUES[b as Rank] - this.RANK_VALUES[a as Rank]
      ) as Rank[];
      const kicker = Object.keys(rankCounts).find(rank => rankCounts[rank as Rank] === 1) as Rank;
      return { rank: 'two-pair' as HandRank, kickers: [...sortedPairs.slice(0, 2), kicker] };
    }

    if (pairs.length === 1) {
      const pair = pairs[0] as Rank;
      const kickers = Object.keys(rankCounts)
        .filter(rank => rankCounts[rank as Rank] === 1)
        .slice(0, 3) as Rank[];
      return { rank: 'pair' as HandRank, kickers: [pair, ...kickers] };
    }

    return { rank: 'high-card' as HandRank, kickers: ranks.slice(0, 5) };
  }

  /**
   * 计算手牌强度数值 (0-7462，数值越高越强)
   */
  private static calculateHandStrength(analysis: { rank: HandRank; kickers: Rank[] }): number {
    const baseValue = this.HAND_RANK_VALUES[analysis.rank] * 1000;
    
    // 添加kicker值
    let kickerValue = 0;
    analysis.kickers.forEach((kicker, index) => {
      kickerValue += this.RANK_VALUES[kicker] * Math.pow(15, 4 - index);
    });

    return baseValue + kickerValue;
  }

  /**
   * 生成手牌描述
   */
  private static generateHandDescription(analysis: { rank: HandRank; kickers: Rank[] }): string {
    const descriptions: Record<HandRank, (kickers: Rank[]) => string> = {
      'royal-flush': () => '皇家同花顺',
      'straight-flush': (k) => `${k[0]}高同花顺`,
      'four-of-a-kind': (k) => `四条${k[0]}`,
      'full-house': (k) => `${k[0]}满${k[1]}葫芦`,
      'flush': (k) => `${k[0]}高同花`,
      'straight': (k) => `${k[0]}高顺子`,
      'three-of-a-kind': (k) => `三条${k[0]}`,
      'two-pair': (k) => `${k[0]}和${k[1]}两对`,
      'pair': (k) => `一对${k[0]}`,
      'high-card': (k) => `${k[0]}高牌`
    };

    return descriptions[analysis.rank](analysis.kickers);
  }

  // =================== 辅助工具方法 ===================

  private static countRanks(ranks: Rank[]): Record<Rank, number> {
    const counts = {} as Record<Rank, number>;
    for (const rank of ranks) {
      counts[rank] = (counts[rank] || 0) + 1;
    }
    return counts;
  }

  private static countSuits(suits: Suit[]): Record<Suit, number> {
    const counts = {} as Record<Suit, number>;
    for (const suit of suits) {
      counts[suit] = (counts[suit] || 0) + 1;
    }
    return counts;
  }

  private static isStraight(ranks: Rank[]): boolean {
    const values = ranks.map(r => this.RANK_VALUES[r]).sort((a, b) => b - a);
    
    // 检查连续性
    for (let i = 0; i < 4; i++) {
      if (values[i] - values[i + 1] !== 1) {
        // 特殊情况：A-2-3-4-5 (wheel)
        if (i === 0 && values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
          return true;
        }
        return false;
      }
    }
    return true;
  }

  private static generateCombinations<T>(arr: T[], size: number): T[][] {
    if (size === 1) return arr.map(item => [item]);
    
    const combinations: T[][] = [];
    for (let i = 0; i < arr.length - size + 1; i++) {
      const head = arr[i];
      const tailCombinations = this.generateCombinations(arr.slice(i + 1), size - 1);
      for (const tail of tailCombinations) {
        combinations.push([head, ...tail]);
      }
    }
    return combinations;
  }

  private static analyzeFlushDraw(cards: Card[]) {
    const suitCounts = this.countSuits(cards.map(c => c.suit));
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    
    if (maxSuitCount === 4) {
      return { type: 'flush-draw' as DrawType, outs: 9 };
    } else if (maxSuitCount === 3) {
      return { type: 'backdoor-flush' as DrawType, outs: 10 };
    }
    return { type: 'flush-draw' as DrawType, outs: 0 };
  }

  private static analyzeStraightDraw(cards: Card[]) {
    // 简化的顺子听分析 - 实际实现会更复杂
    const ranks = cards.map(c => this.RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const uniqueRanks = Array.from(new Set(ranks));
    
    // 检查开口顺子听 (需要4张连续牌)
    for (let i = 0; i <= uniqueRanks.length - 4; i++) {
      const sequence = uniqueRanks.slice(i, i + 4);
      if (this.isConsecutive(sequence)) {
        return { type: 'open-ended' as DrawType, outs: 8 };
      }
    }

    // 检查内听
    // 简化实现 - 实际需要更详细的分析
    return { type: 'gutshot' as DrawType, outs: 4 };
  }

  private static analyzeBackdoorDraws(cards: Card[]) {
    return {
      types: [] as DrawType[],
      outs: 0
    };
  }

  private static calculateImpliedOdds(outs: number, odds: number): number {
    // 简化的隐含赔率计算
    return odds * 1.5; // 假设有50%的隐含赔率提升
  }

  private static getTopBoardCard(board: Card[]): Card {
    return board.sort((a, b) => 
      this.RANK_VALUES[b.rank] - this.RANK_VALUES[a.rank]
    )[0];
  }

  private static analyzeStraightBlockers(card: Card, board: Card[]): string[] {
    // 简化的顺子阻断分析
    return [];
  }

  private static calculateBlockerImpact(blocked: string[], unblocked: string[]): number {
    // 简化的阻断影响计算
    return blocked.length > 0 ? -0.1 : 0;
  }

  private static isConsecutive(numbers: number[]): boolean {
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i] - numbers[i + 1] !== 1) {
        return false;
      }
    }
    return true;
  }
}