import { 
  Card, 
  Suit, 
  Rank, 
  DrawType, 
  BoardTexture, 
  BoardTextureType 
} from '@/types/poker';

/**
 * BoardTextureAnalyzer - 公共牌面结构分析引擎
 * 
 * 功能：
 * 1. 分析牌面湿度 (draws available)
 * 2. 分析牌面连接性 (straight possibilities) 
 * 3. 分析牌面同花性 (flush possibilities)
 * 4. 分析牌面配对性 (paired boards)
 * 5. 综合评估牌面类型和强度
 * 
 * 性能目标：<5ms分析时间
 */
export class BoardTextureAnalyzer {
  // 牌面数值映射 (A=14, K=13, Q=12, J=11, 10=10, 9-2对应)
  private static readonly RANK_VALUES: Record<Rank, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };

  /**
   * 分析公共牌面结构
   * @param board - 公共牌 (3-5张)
   * @returns 牌面结构分析结果
   */
  static analyzeBoard(board: Card[]): BoardTexture {
    if (board.length < 3 || board.length > 5) {
      throw new Error('Board analysis requires 3-5 cards');
    }

    // 分析各个维度
    const pairedness = this.analyzePairedness(board);
    const connectedness = this.analyzeConnectedness(board);
    const suitedness = this.analyzeSuitedness(board);
    const availableDraws = this.analyzeAvailableDraws(board);

    // 综合评估牌面类型
    const type = this.classifyBoardType(pairedness, connectedness, suitedness);
    
    // 计算综合牌面强度 (0-100)
    const strength = this.calculateBoardStrength(pairedness, connectedness, suitedness);

    return {
      type,
      strength,
      draws: availableDraws,
      pairedness,
      connectedness, 
      suitedness
    };
  }

  /**
   * 分析牌面配对性 (0-100)
   * 100 = 三条或葫芦牌面, 70 = 一对牌面, 0 = 无对子牌面
   */
  private static analyzePairedness(board: Card[]): number {
    const ranks = board.map(c => c.rank);
    const rankCounts = this.countRanks(ranks);
    const counts = Object.values(rankCounts);
    
    // 检查三条
    if (counts.includes(3)) {
      return 100;
    }
    
    // 检查对子
    const pairs = counts.filter(count => count === 2).length;
    if (pairs === 2) {
      return 85; // 两对牌面
    } else if (pairs === 1) {
      return 70; // 一对牌面
    }
    
    return 0; // 无对子牌面
  }

  /**
   * 分析牌面连接性 (0-100)
   * 100 = 高度连接 (多个顺子可能), 50 = 中等连接, 0 = 彩虹牌面
   */
  private static analyzeConnectedness(board: Card[]): number {
    const values = board
      .map(c => this.RANK_VALUES[c.rank])
      .sort((a, b) => b - a); // 从大到小排序

    let connectedness = 0;
    let maxGaps = 0;
    let totalGaps = 0;

    // 分析相邻牌的间隔
    for (let i = 0; i < values.length - 1; i++) {
      const gap = values[i] - values[i + 1];
      totalGaps += gap;
      
      if (gap === 1) {
        connectedness += 25; // 相邻牌加分
      } else if (gap === 2) {
        connectedness += 15; // 间隔1加分  
      } else if (gap === 3) {
        connectedness += 8;  // 间隔2加分
      }
      
      maxGaps = Math.max(maxGaps, gap);
    }

    // 特殊处理：A-5-4-3-2类型的低端顺子
    if (values.includes(14) && values.includes(5)) {
      const lowCards = values.filter(v => v <= 5).sort((a, b) => b - a);
      if (lowCards.length >= 2) {
        connectedness += 20;
      }
    }

    // 根据最大间隔调整评分
    if (maxGaps >= 8) {
      connectedness = Math.max(0, connectedness - 30); // 彩虹牌面扣分
    }

    return Math.min(100, connectedness);
  }

  /**
   * 分析牌面同花性 (0-100)  
   * 100 = 三张同花或更多, 60 = 两张同花, 0 = 彩虹
   */
  private static analyzeSuitedness(board: Card[]): number {
    const suits = board.map(c => c.suit);
    const suitCounts = this.countSuits(suits);
    const maxSuitCount = Math.max(...Object.values(suitCounts));

    if (maxSuitCount >= 5) {
      return 100; // 已成花
    } else if (maxSuitCount === 4) {
      return 90;  // 四张同花 (河牌圈可能)
    } else if (maxSuitCount === 3) {
      return 75;  // 三张同花听
    } else if (maxSuitCount === 2) {
      return 40;  // 两张同花 (后门听)
    }
    
    return 0; // 彩虹牌面
  }

  /**
   * 分析牌面可用听牌类型
   */
  private static analyzeAvailableDraws(board: Card[]): DrawType[] {
    const draws: DrawType[] = [];
    
    // 分析同花听
    const flushDraws = this.analyzeFlushDraws(board);
    draws.push(...flushDraws);
    
    // 分析顺子听
    const straightDraws = this.analyzeStraightDraws(board);  
    draws.push(...straightDraws);

    return draws;
  }

  /**
   * 分析同花听牌可能性
   */
  private static analyzeFlushDraws(board: Card[]): DrawType[] {
    const draws: DrawType[] = [];
    const suits = board.map(c => c.suit);
    const suitCounts = this.countSuits(suits);
    const maxSuitCount = Math.max(...Object.values(suitCounts));

    if (maxSuitCount === 4) {
      draws.push('flush-draw');
    } else if (maxSuitCount === 3) {
      draws.push('backdoor-flush');
    }

    return draws;
  }

  /**
   * 分析顺子听牌可能性
   */
  private static analyzeStraightDraws(board: Card[]): DrawType[] {
    const draws: DrawType[] = [];
    const values = board
      .map(c => this.RANK_VALUES[c.rank])
      .sort((a, b) => b - a);

    // 检查开口顺子听的可能性
    if (this.hasOpenEndedPossibility(values)) {
      draws.push('open-ended');
    }

    // 检查内听的可能性
    if (this.hasGutshotPossibility(values)) {
      draws.push('gutshot');
    }

    // 检查后门顺子听
    if (board.length <= 4 && this.hasBackdoorStraightPossibility(values)) {
      draws.push('backdoor-straight');
    }

    return draws;
  }

  /**
   * 检查是否有开口顺子听可能
   */
  private static hasOpenEndedPossibility(values: number[]): boolean {
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => b - a);
    
    // 检查是否存在连续的3张或4张牌
    for (let i = 0; i <= uniqueValues.length - 3; i++) {
      const sequence = uniqueValues.slice(i, i + 3);
      if (this.isConsecutiveWithMaxGap(sequence, 1)) {
        return true;
      }
    }

    // 特殊处理A-5-4类型的低端可能
    if (uniqueValues.includes(14) && uniqueValues.includes(5) && uniqueValues.includes(4)) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否有内听可能
   */
  private static hasGutshotPossibility(values: number[]): boolean {
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => b - a);
    
    // 检查是否存在间隔为2的4张牌组合
    for (let i = 0; i <= uniqueValues.length - 2; i++) {
      for (let j = i + 1; j < uniqueValues.length; j++) {
        const gap = uniqueValues[i] - uniqueValues[j];
        if (gap === 3 && uniqueValues.length >= 3) {
          return true; // 可能形成内听
        }
      }
    }

    return false;
  }

  /**
   * 检查是否有后门顺子听可能
   */
  private static hasBackdoorStraightPossibility(values: number[]): boolean {
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => b - a);
    
    // 简化实现：检查是否有2张牌在4张牌的范围内
    for (let i = 0; i < uniqueValues.length - 1; i++) {
      const range = uniqueValues[i] - uniqueValues[i + 1];
      if (range <= 4) {
        return true;
      }
    }

    return false;
  }

  /**
   * 综合分类牌面类型
   */
  private static classifyBoardType(
    pairedness: number, 
    connectedness: number, 
    suitedness: number
  ): BoardTextureType {
    
    // 彩虹牌面：低连接性 + 低同花性
    if (connectedness <= 30 && suitedness <= 30) {
      return 'rainbow';
    }

    // 湿润牌面：高连接性或高同花性
    if (connectedness >= 70 || suitedness >= 70) {
      return 'wet';
    }

    // 协调牌面：中等连接性 + 中等同花性
    if (connectedness >= 40 && suitedness >= 40) {
      return 'coordinated';
    }

    // 干燥牌面：其他情况
    return 'dry';
  }

  /**
   * 计算综合牌面强度
   */
  private static calculateBoardStrength(
    pairedness: number,
    connectedness: number, 
    suitedness: number
  ): number {
    // 加权计算综合强度
    const weights = {
      pairedness: 0.4,   // 配对性权重最高
      connectedness: 0.35, // 连接性权重中等
      suitedness: 0.25    // 同花性权重最低
    };

    const strength = 
      pairedness * weights.pairedness +
      connectedness * weights.connectedness + 
      suitedness * weights.suitedness;

    return Math.round(strength);
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

  private static isConsecutiveWithMaxGap(numbers: number[], maxGap: number): boolean {
    for (let i = 0; i < numbers.length - 1; i++) {
      const gap = numbers[i] - numbers[i + 1];
      if (gap > maxGap) {
        return false;
      }
    }
    return true;
  }
}