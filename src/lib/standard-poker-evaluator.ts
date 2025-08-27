import { Card, Rank } from '@/types/poker'

/**
 * 德州扑克牌型等级枚举（按强度从小到大）
 */
export enum PokerHandRank {
  HIGH_CARD = 1,           // 高牌
  ONE_PAIR = 2,            // 一对
  TWO_PAIR = 3,            // 两对
  THREE_OF_KIND = 4,       // 三条
  STRAIGHT = 5,            // 顺子
  FLUSH = 6,               // 同花
  FULL_HOUSE = 7,          // 葫芦
  FOUR_OF_KIND = 8,        // 四条
  STRAIGHT_FLUSH = 9,      // 同花顺
  ROYAL_FLUSH = 10         // 皇家同花顺
}

/**
 * 标准德州扑克手牌评估结果
 */
export interface PokerHandEvaluation {
  playerId: string
  playerName: string
  holeCards: [Card, Card]           // 玩家底牌
  
  // 最佳5张组合
  bestFiveCards: [Card, Card, Card, Card, Card]  // 7选5的最佳组合
  handRank: PokerHandRank           // 牌型等级
  handStrength: number              // 综合强度值（用于直接比较）
  
  // 详细比牌信息
  primaryValue: number              // 主要点数
  secondaryValue?: number           // 次要点数（葫芦的对子等）
  kickers: number[]                 // 踢脚牌点数数组（降序排列）
  
  // 牌型描述
  handDescription: string           // "四条K带2"
  readableDescription: string       // 用户友好的描述
}

/**
 * 玩家手牌排名结果
 */
export interface PokerPlayerRanking {
  playerId: string
  playerName: string
  rank: number                     // 1, 2, 3, 4... (可能并列)
  handEvaluation: PokerHandEvaluation
  isWinner: boolean               // 是否并列第一
  isFolded: boolean              // 是否已弃牌
}

/**
 * 标准德州扑克7选5手牌评估器
 * 严格遵循国际德州扑克规则
 */
export class StandardPokerEvaluator {
  
  /**
   * 将牌面值转换为数字（便于比较）
   * A=14, K=13, Q=12, J=11, 10=10, 9=9...2=2
   */
  private static cardRankToNumber(rank: Rank): number {
    switch (rank) {
      case 'A': return 14
      case 'K': return 13
      case 'Q': return 12
      case 'J': return 11
      case '10': return 10
      default: return parseInt(rank as string)
    }
  }
  
  /**
   * 将数字转换回牌面值
   */
  private static numberToCardRank(num: number): string {
    switch (num) {
      case 14: return 'A'
      case 13: return 'K'
      case 12: return 'Q'
      case 11: return 'J'
      default: return num.toString()
    }
  }
  
  /**
   * 评估玩家的最佳手牌组合
   * 从7张牌(2底牌+5公共牌)中选出最强的5张
   */
  static evaluateBestHand(
    playerId: string,
    playerName: string,
    holeCards: [Card, Card], 
    communityCards: Card[]
  ): PokerHandEvaluation {
    
    if (communityCards.length !== 5) {
      throw new Error('德州扑克必须有5张公共牌')
    }
    
    const allCards = [...holeCards, ...communityCards] // 7张牌
    const allCombinations = this.generate5CardCombinations(allCards) // C(7,5) = 21种组合
    
    let bestEvaluation: Partial<PokerHandEvaluation> | null = null
    let maxStrength = -1
    
    // 评估所有21种组合，找出最强的
    for (const fiveCards of allCombinations) {
      const evaluation = this.evaluate5CardHand(fiveCards)
      
      if (evaluation.handStrength > maxStrength) {
        maxStrength = evaluation.handStrength
        bestEvaluation = {
          ...evaluation,
          bestFiveCards: fiveCards as [Card, Card, Card, Card, Card]
        }
      }
    }
    
    if (!bestEvaluation) {
      throw new Error('无法评估手牌')
    }
    
    return {
      playerId,
      playerName,
      holeCards,
      ...bestEvaluation
    } as PokerHandEvaluation
  }
  
  /**
   * 生成7选5的所有组合 (21种)
   */
  private static generate5CardCombinations(cards: Card[]): Card[][] {
    const combinations: Card[][] = []
    const n = cards.length
    
    // 递归生成组合
    const generateCombinations = (start: number, currentCombination: Card[]) => {
      if (currentCombination.length === 5) {
        combinations.push([...currentCombination])
        return
      }
      
      for (let i = start; i < n; i++) {
        currentCombination.push(cards[i])
        generateCombinations(i + 1, currentCombination)
        currentCombination.pop()
      }
    }
    
    generateCombinations(0, [])
    return combinations
  }
  
  /**
   * 评估5张牌的手牌强度
   * 返回可直接比较的强度值
   */
  private static evaluate5CardHand(fiveCards: Card[]): Partial<PokerHandEvaluation> {
    // 转换为数字便于处理
    const ranks = fiveCards.map(card => this.cardRankToNumber(card.rank)).sort((a, b) => b - a)
    const suits = fiveCards.map(card => card.suit)
    
    // 统计牌面值出现次数
    const rankCounts = new Map<number, number>()
    ranks.forEach(rank => {
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1)
    })
    
    // 统计花色
    const suitCounts = new Map<string, number>()
    suits.forEach(suit => {
      suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1)
    })
    
    const isFlush = Math.max(...suitCounts.values()) === 5
    const isStraight = this.checkStraight(ranks)
    const isRoyalStraight = this.checkRoyalStraight(ranks)
    
    // 按照德州扑克标准判定牌型
    return this.classifyHand(rankCounts, ranks, isFlush, isStraight, isRoyalStraight)
  }
  
  /**
   * 检查是否为顺子
   */
  private static checkStraight(sortedRanks: number[]): boolean {
    // 标准顺子检查
    for (let i = 0; i < 4; i++) {
      if (sortedRanks[i] - sortedRanks[i + 1] !== 1) {
        break
      }
      if (i === 3) return true // 连续5张
    }
    
    // 特殊情况：A-2-3-4-5 (轮子顺子)
    if (sortedRanks[0] === 14 && sortedRanks[1] === 5 && sortedRanks[2] === 4 && 
        sortedRanks[3] === 3 && sortedRanks[4] === 2) {
      return true
    }
    
    return false
  }
  
  /**
   * 检查是否为皇家顺子 (A-K-Q-J-10)
   */
  private static checkRoyalStraight(sortedRanks: number[]): boolean {
    return sortedRanks[0] === 14 && sortedRanks[1] === 13 && sortedRanks[2] === 12 && 
           sortedRanks[3] === 11 && sortedRanks[4] === 10
  }
  
  /**
   * 分类手牌并计算强度值
   */
  private static classifyHand(
    rankCounts: Map<number, number>, 
    sortedRanks: number[],
    isFlush: boolean, 
    isStraight: boolean,
    isRoyalStraight: boolean
  ): Partial<PokerHandEvaluation> {
    
    const counts = Array.from(rankCounts.values()).sort((a, b) => b - a)
    const ranksArray = Array.from(rankCounts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0])
    
    // 皇家同花顺
    if (isFlush && isRoyalStraight) {
      return {
        handRank: PokerHandRank.ROYAL_FLUSH,
        handStrength: 10000000,
        primaryValue: 14,
        kickers: [],
        handDescription: '皇家同花顺',
        readableDescription: '皇家同花顺 (A-K-Q-J-10 同花色)'
      }
    }
    
    // 同花顺
    if (isFlush && isStraight) {
      const highCard = this.getStraightHighCard(sortedRanks)
      return {
        handRank: PokerHandRank.STRAIGHT_FLUSH,
        handStrength: 9000000 + highCard,
        primaryValue: highCard,
        kickers: [],
        handDescription: `${this.numberToCardRank(highCard)}高同花顺`,
        readableDescription: `${this.numberToCardRank(highCard)}高同花顺`
      }
    }
    
    // 四条
    if (counts[0] === 4) {
      const fourKind = ranksArray[0][0]
      const kicker = ranksArray[1][0]
      return {
        handRank: PokerHandRank.FOUR_OF_KIND,
        handStrength: 8000000 + fourKind * 100 + kicker,
        primaryValue: fourKind,
        kickers: [kicker],
        handDescription: `四条${this.numberToCardRank(fourKind)}`,
        readableDescription: `四条${this.numberToCardRank(fourKind)}带${this.numberToCardRank(kicker)}`
      }
    }
    
    // 葫芦
    if (counts[0] === 3 && counts[1] === 2) {
      const trips = ranksArray[0][0]
      const pair = ranksArray[1][0]
      return {
        handRank: PokerHandRank.FULL_HOUSE,
        handStrength: 7000000 + trips * 100 + pair,
        primaryValue: trips,
        secondaryValue: pair,
        kickers: [],
        handDescription: `${this.numberToCardRank(trips)}满${this.numberToCardRank(pair)}`,
        readableDescription: `${this.numberToCardRank(trips)}满${this.numberToCardRank(pair)} (葫芦)`
      }
    }
    
    // 同花
    if (isFlush) {
      return {
        handRank: PokerHandRank.FLUSH,
        handStrength: 6000000 + sortedRanks[0] * 10000 + sortedRanks[1] * 1000 + sortedRanks[2] * 100 + sortedRanks[3] * 10 + sortedRanks[4],
        primaryValue: sortedRanks[0],
        kickers: sortedRanks.slice(1),
        handDescription: `${this.numberToCardRank(sortedRanks[0])}高同花`,
        readableDescription: `${this.numberToCardRank(sortedRanks[0])}高同花`
      }
    }
    
    // 顺子
    if (isStraight) {
      const highCard = this.getStraightHighCard(sortedRanks)
      return {
        handRank: PokerHandRank.STRAIGHT,
        handStrength: 5000000 + highCard,
        primaryValue: highCard,
        kickers: [],
        handDescription: `${this.numberToCardRank(highCard)}高顺子`,
        readableDescription: `${this.numberToCardRank(highCard)}高顺子`
      }
    }
    
    // 三条
    if (counts[0] === 3) {
      const trips = ranksArray[0][0]
      const kickers = ranksArray.slice(1).map(r => r[0])
      return {
        handRank: PokerHandRank.THREE_OF_KIND,
        handStrength: 4000000 + trips * 10000 + kickers[0] * 100 + kickers[1],
        primaryValue: trips,
        kickers,
        handDescription: `三条${this.numberToCardRank(trips)}`,
        readableDescription: `三条${this.numberToCardRank(trips)}`
      }
    }
    
    // 两对
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = ranksArray.slice(0, 2).map(r => r[0]).sort((a, b) => b - a)
      const kicker = ranksArray[2][0]
      return {
        handRank: PokerHandRank.TWO_PAIR,
        handStrength: 3000000 + pairs[0] * 10000 + pairs[1] * 100 + kicker,
        primaryValue: pairs[0],
        secondaryValue: pairs[1],
        kickers: [kicker],
        handDescription: `${this.numberToCardRank(pairs[0])}${this.numberToCardRank(pairs[1])}两对`,
        readableDescription: `${this.numberToCardRank(pairs[0])}和${this.numberToCardRank(pairs[1])}两对`
      }
    }
    
    // 一对
    if (counts[0] === 2) {
      const pair = ranksArray[0][0]
      const kickers = ranksArray.slice(1).map(r => r[0])
      return {
        handRank: PokerHandRank.ONE_PAIR,
        handStrength: 2000000 + pair * 10000 + kickers[0] * 1000 + kickers[1] * 100 + kickers[2],
        primaryValue: pair,
        kickers,
        handDescription: `一对${this.numberToCardRank(pair)}`,
        readableDescription: `一对${this.numberToCardRank(pair)}`
      }
    }
    
    // 高牌
    return {
      handRank: PokerHandRank.HIGH_CARD,
      handStrength: 1000000 + sortedRanks[0] * 10000 + sortedRanks[1] * 1000 + sortedRanks[2] * 100 + sortedRanks[3] * 10 + sortedRanks[4],
      primaryValue: sortedRanks[0],
      kickers: sortedRanks.slice(1),
      handDescription: `${this.numberToCardRank(sortedRanks[0])}高牌`,
      readableDescription: `${this.numberToCardRank(sortedRanks[0])}高牌`
    }
  }
  
  /**
   * 获取顺子的高牌（处理A-2-3-4-5的特殊情况）
   */
  private static getStraightHighCard(sortedRanks: number[]): number {
    // A-2-3-4-5 轮子顺子，5是高牌
    if (sortedRanks[0] === 14 && sortedRanks[1] === 5) {
      return 5
    }
    return sortedRanks[0]
  }
}