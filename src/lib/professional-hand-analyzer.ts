import { Card, Rank, Suit, HandStrengthResult, GameStage, Player } from '@/types/poker';
import { HandEvaluator } from '@/lib/hand-evaluator';

/**
 * 专业手牌分析结果
 */
export interface ProfessionalHandAnalysis {
  handStrength: HandStrengthResult;
  equity: number; // 胜率百分比 (0-100)
  potOdds: number; // 底池赔率
  impliedOdds: number; // 隐含赔率
  effectiveStackDepth: number; // 有效筹码深度
  position: 'early' | 'middle' | 'late' | 'blinds';
  handCategory: 'premium' | 'strong' | 'medium' | 'weak' | 'trash';
  playability: number; // 可玩性评分 (0-10)
  recommendation: {
    action: 'fold' | 'call' | 'raise' | 'all-in';
    confidence: number; // 信心度 (0-100)
    reasoning: string;
  };
}

/**
 * 胜率计算结果
 */
export interface EquityCalculation {
  heroEquity: number;
  opponentEquities: number[];
  drawEquity: number;
  realizableEquity: number; // 可实现胜率
  analysis: string;
}

/**
 * 专业德州扑克手牌分析器
 * 
 * 提供专业级别的手牌分析，包括：
 * 1. 精确的胜率计算
 * 2. 位置和筹码深度分析
 * 3. 专业的决策建议
 * 4. 复杂的数学计算
 */
export class ProfessionalHandAnalyzer {

  /**
   * 分析手牌并提供专业建议
   */
  static analyzeHand(
    holeCards: [Card, Card],
    communityCards: Card[],
    gameStage: GameStage,
    position: string,
    stackSize: number,
    potSize: number,
    betToCall: number,
    opponents: number
  ): ProfessionalHandAnalysis {
    
    // 1. 基础手牌强度评估
    const handStrength = this.evaluateHandStrength(holeCards, communityCards);
    
    // 2. 胜率计算
    const equity = this.calculateEquity(holeCards, communityCards, opponents);
    
    // 3. 赔率计算
    const potOdds = betToCall > 0 ? (potSize / betToCall) * 100 : 0;
    const impliedOdds = this.calculateImpliedOdds(potOdds, stackSize, potSize);
    
    // 4. 位置和深度分析
    const positionType = this.categorizePosition(position);
    const effectiveStackDepth = stackSize / (potSize || 1);
    
    // 5. 手牌分类
    const handCategory = this.categorizeHand(holeCards, communityCards, gameStage);
    
    // 6. 可玩性评分
    const playability = this.calculatePlayability(
      holeCards, communityCards, positionType, effectiveStackDepth
    );
    
    // 7. 决策建议
    const recommendation = this.generateRecommendation(
      handStrength, equity, potOdds, positionType, handCategory, gameStage
    );

    return {
      handStrength,
      equity,
      potOdds,
      impliedOdds,
      effectiveStackDepth,
      position: positionType,
      handCategory,
      playability,
      recommendation
    };
  }

  /**
   * 评估手牌强度（增强版）
   */
  private static evaluateHandStrength(
    holeCards: [Card, Card], 
    communityCards: Card[]
  ): HandStrengthResult {
    if (communityCards.length >= 3) {
      // 翻后：使用完整评估
      return HandEvaluator.evaluateBestHand(holeCards, communityCards);
    } else {
      // 翻前：基于起手牌强度
      return this.evaluatePreflopStrength(holeCards);
    }
  }

  /**
   * 翻前起手牌强度评估
   */
  private static evaluatePreflopStrength(holeCards: [Card, Card]): HandStrengthResult {
    const [card1, card2] = holeCards;
    const rank1 = this.getRankValue(card1.rank);
    const rank2 = this.getRankValue(card2.rank);
    const suited = card1.suit === card2.suit;
    const pair = rank1 === rank2;
    
    let strength = 0;
    let description = '';
    let rank: any = 'high-card';

    if (pair) {
      // 口袋对子
      strength = 1000 + rank1 * 100; // 基础1000分 + 对子大小
      rank = 'pair';
      
      if (rank1 >= 10) {
        description = `口袋${card1.rank}${card1.rank} - 超强起手牌`;
        strength += 500; // 大对子额外奖励
      } else if (rank1 >= 7) {
        description = `口袋${card1.rank}${card1.rank} - 强起手牌`;
        strength += 200;
      } else {
        description = `口袋${card1.rank}${card1.rank} - 中等起手牌`;
      }
    } else {
      // 非对子
      const highRank = Math.max(rank1, rank2);
      const lowRank = Math.min(rank1, rank2);
      const gap = highRank - lowRank - 1;
      
      strength = highRank * 50 + lowRank * 10;
      
      if (suited) {
        strength += 100; // 同花奖励
        description = `${this.getRankName(highRank)}${this.getRankName(lowRank)}同花`;
      } else {
        description = `${this.getRankName(highRank)}${this.getRankName(lowRank)}杂色`;
      }
      
      // 连接性奖励
      if (gap === 0) {
        strength += 80; // 连牌
        description += ' - 强连接性';
      } else if (gap === 1) {
        strength += 40; // 单缺
        description += ' - 好连接性';
      }
      
      // 高牌奖励
      if (highRank === 14) { // A
        strength += 100;
        if (lowRank >= 10) {
          description += ' - 强起手牌';
        }
      } else if (highRank >= 12) { // K, Q
        strength += 50;
      }
    }

    return {
      rank,
      strength: Math.min(9999, strength), // 限制最大值
      kickers: [card1.rank, card2.rank],
      description
    };
  }

  /**
   * 计算胜率（蒙特卡洛模拟简化版）
   */
  private static calculateEquity(
    holeCards: [Card, Card],
    communityCards: Card[],
    opponents: number
  ): number {
    if (communityCards.length === 0) {
      // 翻前胜率估算
      return this.estimatePreflopEquity(holeCards, opponents);
    }
    
    // 翻后胜率（简化计算）
    const handStrength = HandEvaluator.evaluateBestHand(holeCards, communityCards);
    
    // 基于手牌强度和对手数量估算胜率
    let baseEquity = 0;
    
    switch (handStrength.rank) {
      case 'royal-flush': baseEquity = 99; break;
      case 'straight-flush': baseEquity = 95; break;
      case 'four-of-a-kind': baseEquity = 90; break;
      case 'full-house': baseEquity = 85; break;
      case 'flush': baseEquity = 75; break;
      case 'straight': baseEquity = 70; break;
      case 'three-of-a-kind': baseEquity = 60; break;
      case 'two-pair': baseEquity = 45; break;
      case 'pair': baseEquity = 30; break;
      default: baseEquity = 15; break;
    }
    
    // 根据对手数量调整
    const opponentFactor = Math.pow(0.8, opponents - 1);
    
    return Math.round(baseEquity * opponentFactor);
  }

  /**
   * 翻前胜率估算
   */
  private static estimatePreflopEquity(holeCards: [Card, Card], opponents: number): number {
    const [card1, card2] = holeCards;
    const rank1 = this.getRankValue(card1.rank);
    const rank2 = this.getRankValue(card2.rank);
    const suited = card1.suit === card2.suit;
    const pair = rank1 === rank2;
    
    let equity = 50; // 基础50%
    
    if (pair) {
      // 口袋对子
      if (rank1 >= 13) equity = 85; // AA, KK
      else if (rank1 >= 11) equity = 80; // QQ, JJ  
      else if (rank1 >= 8) equity = 70; // 88-TT
      else equity = 60; // 小对子
    } else {
      const highRank = Math.max(rank1, rank2);
      const lowRank = Math.min(rank1, rank2);
      
      if (highRank === 14) { // A
        if (lowRank >= 12) equity = 75; // AK, AQ
        else if (lowRank >= 10) equity = 65; // AJ, AT
        else if (lowRank >= 7) equity = 60; // A9-A7
        else equity = 55; // 小A
      } else if (highRank >= 12) { // K, Q
        if (lowRank >= 11) equity = 70; // KQ
        else if (lowRank >= 9) equity = 60; // KJ-K9, QJ-Q9
        else equity = 50;
      } else {
        equity = 45; // 其他组合
      }
      
      if (suited) equity += 5; // 同花奖励
    }
    
    // 多人对局调整
    const multiplayerFactor = Math.pow(0.85, opponents - 1);
    
    return Math.round(equity * multiplayerFactor);
  }

  /**
   * 计算隐含赔率
   */
  private static calculateImpliedOdds(potOdds: number, stackSize: number, potSize: number): number {
    const potentialWin = Math.min(stackSize, potSize * 3); // 假设最多能赢3倍底池
    return potOdds * (potentialWin / potSize);
  }

  /**
   * 位置分类
   */
  private static categorizePosition(position: string): 'early' | 'middle' | 'late' | 'blinds' {
    const pos = position.toLowerCase();
    if (pos.includes('utg') || pos.includes('早位')) return 'early';
    if (pos.includes('mp') || pos.includes('中位')) return 'middle';
    if (pos.includes('co') || pos.includes('btn') || pos.includes('庄')) return 'late';
    return 'blinds';
  }

  /**
   * 手牌分类
   */
  private static categorizeHand(
    holeCards: [Card, Card], 
    communityCards: Card[], 
    stage: GameStage
  ): 'premium' | 'strong' | 'medium' | 'weak' | 'trash' {
    if (communityCards.length === 0) {
      // 翻前分类
      const strength = this.evaluatePreflopStrength(holeCards).strength;
      if (strength >= 1500) return 'premium';
      if (strength >= 1200) return 'strong';
      if (strength >= 900) return 'medium';
      if (strength >= 600) return 'weak';
      return 'trash';
    } else {
      // 翻后分类
      const handResult = HandEvaluator.evaluateBestHand(holeCards, communityCards);
      if (['royal-flush', 'straight-flush', 'four-of-a-kind'].includes(handResult.rank)) return 'premium';
      if (['full-house', 'flush', 'straight'].includes(handResult.rank)) return 'strong';
      if (['three-of-a-kind', 'two-pair'].includes(handResult.rank)) return 'medium';
      if (handResult.rank === 'pair') return 'weak';
      return 'trash';
    }
  }

  /**
   * 计算可玩性评分
   */
  private static calculatePlayability(
    holeCards: [Card, Card],
    communityCards: Card[],
    position: 'early' | 'middle' | 'late' | 'blinds',
    stackDepth: number
  ): number {
    let playability = 5; // 基础分数
    
    // 位置调整
    switch (position) {
      case 'late': playability += 2; break;
      case 'middle': playability += 1; break;
      case 'blinds': playability -= 1; break;
    }
    
    // 筹码深度调整
    if (stackDepth > 100) playability += 1; // 深筹码
    if (stackDepth < 20) playability -= 1; // 浅筹码
    
    // 手牌特性调整
    const [card1, card2] = holeCards;
    if (card1.suit === card2.suit) playability += 1; // 同花
    
    const rank1 = this.getRankValue(card1.rank);
    const rank2 = this.getRankValue(card2.rank);
    const gap = Math.abs(rank1 - rank2);
    
    if (gap <= 1 && !this.isPair(holeCards)) playability += 1; // 连牌
    if (gap >= 5) playability -= 1; // 断连
    
    return Math.max(0, Math.min(10, playability));
  }

  /**
   * 生成专业决策建议
   */
  private static generateRecommendation(
    handStrength: HandStrengthResult,
    equity: number,
    potOdds: number,
    position: 'early' | 'middle' | 'late' | 'blinds',
    category: 'premium' | 'strong' | 'medium' | 'weak' | 'trash',
    stage: GameStage
  ): { action: 'fold' | 'call' | 'raise' | 'all-in'; confidence: number; reasoning: string } {
    
    let action: 'fold' | 'call' | 'raise' | 'all-in' = 'fold';
    let confidence = 50;
    let reasoning = '';
    
    // 基于手牌类别的基础决策
    switch (category) {
      case 'premium':
        action = 'raise';
        confidence = 90;
        reasoning = '超强牌力，应该价值下注最大化收益';
        break;
        
      case 'strong':
        if (equity >= 60) {
          action = 'raise';
          confidence = 80;
          reasoning = '强牌力，胜率高，适合加注建池';
        } else {
          action = 'call';
          confidence = 70;
          reasoning = '强牌力但需要谨慎，跟注观察';
        }
        break;
        
      case 'medium':
        if (equity >= 40 && potOdds >= 3) {
          action = 'call';
          confidence = 60;
          reasoning = '中等牌力，有合适赔率可以跟注';
        } else {
          action = 'fold';
          confidence = 65;
          reasoning = '中等牌力但赔率不够，应该弃牌';
        }
        break;
        
      case 'weak':
        if (potOdds >= 5 && position === 'late') {
          action = 'call';
          confidence = 50;
          reasoning = '弱牌但位置有利且赔率合适';
        } else {
          action = 'fold';
          confidence = 75;
          reasoning = '弱牌力，不值得投资';
        }
        break;
        
      default: // trash
        action = 'fold';
        confidence = 95;
        reasoning = '垃圾牌，应该立即弃牌止损';
    }
    
    // 位置调整
    if (position === 'early' && category !== 'premium') {
      confidence += 10; // 前位更需要强牌
    } else if (position === 'late' && category !== 'trash') {
      confidence -= 5; // 后位可以更宽泛
    }
    
    // 阶段调整
    if (stage === 'river' && category === 'weak') {
      confidence += 15; // 河牌圈对弱牌更严格
    }
    
    return {
      action,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasoning
    };
  }

  // 辅助方法
  private static getRankValue(rank: Rank): number {
    const values: Record<Rank, number> = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    };
    return values[rank];
  }

  private static getRankName(value: number): string {
    const names: Record<number, string> = {
      14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T'
    };
    return names[value] || value.toString();
  }

  private static isPair(cards: [Card, Card]): boolean {
    return cards[0].rank === cards[1].rank;
  }

  /**
   * 快速分析接口（用于实时决策）
   */
  static quickAnalysis(
    holeCards: [Card, Card],
    communityCards: Card[],
    opponents: number
  ): {
    strength: number;
    equity: number;
    category: string;
    recommendation: string;
  } {
    const handStrength = this.evaluateHandStrength(holeCards, communityCards);
    const equity = this.calculateEquity(holeCards, communityCards, opponents);
    const category = this.categorizeHand(holeCards, communityCards, 
      communityCards.length === 0 ? 'preflop' : 'flop');
    
    let recommendation = 'FOLD';
    if (category === 'premium') recommendation = 'RAISE';
    else if (category === 'strong') recommendation = equity >= 60 ? 'RAISE' : 'CALL';
    else if (category === 'medium') recommendation = equity >= 40 ? 'CALL' : 'FOLD';
    
    return {
      strength: handStrength.strength,
      equity,
      category: category.toUpperCase(),
      recommendation
    };
  }
}