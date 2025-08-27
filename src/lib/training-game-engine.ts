import { GameState, Player, ActionType, Card, Rank, HandStrengthResult, Position } from '@/types/poker'
import { stringToCard } from '@/lib/poker-utils'
import { HandEvaluator } from '@/lib/hand-evaluator'
import { ActionRecorder, DetailedActionRecord } from '@/lib/action-recorder'
import { SidePotCalculator, PlayerBetInfo, SidePotCalculationResult } from '@/lib/side-pot-calculator'
import { ProfessionalHandAnalyzer, ProfessionalHandAnalysis } from '@/lib/professional-hand-analyzer'
import { ShowdownAnalysisReporter, ShowdownAnalysisReport } from '@/lib/showdown-analysis-reporter'
import { DeckManager } from '@/lib/deck-manager'
import { PokerHandResult, PokerHandResultGenerator } from '@/lib/poker-hand-result'
import { PokerPlayerRanking } from '@/lib/standard-poker-evaluator'

interface TrainingGameState extends GameState {
  isTraining: boolean
  currentScenario: TrainingScenario
  practicePosition: number // Index of the position being practiced (0-5)
  trainingProgress: {
    handsPlayed: number
    correctDecisions: number
    currentStreak: number
  }
  actionRecorder: ActionRecorder // 操作记录器
}

interface TrainingScenario {
  id: string
  type: 'preflop' | 'flop' | 'turn' | 'river'
  description: string
  situation: GameSituation
  recommendedAction: TrainingAction
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface GameSituation {
  position: string
  stackSize: number
  potOdds: number
  opponents: number
  aggression: 'passive' | 'aggressive'
}

interface TrainingAction {
  action: ActionType
  amount?: number
  reasoning: string
  gtoFrequency: number
}

export interface GameProgressResult {
  gameState: TrainingGameState
  isHandComplete: boolean
  handResult?: HandResult
  nextAction?: 'wait_for_player' | 'ai_action' | 'next_street' | 'hand_complete'
  message?: string
  aiActions?: Array<{
    playerId: string
    playerName: string
    action: ActionType
    amount?: number
    position: string
  }>
}

interface HandResult {
  // === 🏆 基于手牌强度的胜负判定 ===
  handWinnerId: string              // 手牌最强玩家ID → 界面金色特效
  handWinnerName: string           // 手牌获胜者姓名  
  heroHandResult: 'win' | 'lose' | 'tie'  // 英雄手牌结果 → 顶部成功/失败
  
  // === 📋 手牌排名信息 ===
  handRankings?: PokerPlayerRanking[]  // 完整手牌排名列表
  
  // === 💰 金额分配结果 ===
  winAmount: number            // 兼容性：总奖池金额
  sidePotResult?: SidePotCalculationResult  // 边池计算结果
  
  // === 📊 分析和其他信息 ===
  showdown: boolean           // 是否摊牌
  analysis: string           // 综合分析报告
  
  // === 兼容性字段（保持现有界面不变） ===
  winner: string            // 兼容字段：等同于handWinnerId
  winnerId: string          // 兼容字段：等同于handWinnerId
  winnerName: string        // 兼容字段：等同于handWinnerName
  heroResult: 'win' | 'lose' | 'tie'  // 兼容字段：等同于heroHandResult
  detailedAnalysis?: ShowdownAnalysisReport  // 详细摊牌分析报告
}

export class TrainingGameEngine {
  private static readonly AI_ACTION_DELAY = 1500 // 1.5s delay for AI actions
  private static readonly NEXT_STREET_DELAY = 2000 // 2s delay for next street
  private static lastGeneratedScenarios: string[] = [] // 防重复机制

  // 完整的52张牌池
  private static readonly SUITS = ['h', 'd', 'c', 's'] // 红桃、方块、梅花、黑桃
  private static readonly RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

  /**
   * 将Card对象转换为字符串表示
   */
  private static cardToString(card: Card): string {
    const suitMap = {
      'hearts': 'h',
      'diamonds': 'd', 
      'clubs': 'c',
      'spades': 's'
    };
    return `${card.rank}${suitMap[card.suit]}`;
  }

  /**
   * 批量将Card对象转换为字符串数组
   */
  private static cardsToStrings(cards: Card[]): string[] {
    return cards.map(card => this.cardToString(card));
  }

  /**
   * 使用DeckManager安全生成牌组场景
   */
  private static createSafeTrainingDeck(
    requiredCards: Card[] = []
  ): {
    deck: DeckManager;
    isValid: boolean;
    errors: string[];
  } {
    const deck = new DeckManager();
    const errors: string[] = [];
    
    try {
      // 标记必需的牌为已使用
      if (requiredCards.length > 0) {
        if (!deck.markCardsAsUsed(requiredCards)) {
          errors.push('必需牌有重复或无效');
        }
      }
      
      const isValid = deck.validateNoDuplicates() && errors.length === 0;
      
      return { deck, isValid, errors };
    } catch (error) {
      errors.push(`创建训练牌组失败: ${error}`);
      return { deck, isValid: false, errors };
    }
  }

  /**
   * 根据手牌强度生成训练场景
   */
  private static generateRandomHandScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const { deck, isValid } = this.createSafeTrainingDeck();
    
    if (!isValid) {
      console.warn('随机场景生成失败，使用默认场景');
      return {
        heroCards: ['As', 'Kh'],
        communityCards: ['Qd', 'Jc', '10s'],
        description: '默认训练场景',
        recommendedAction: { action: 'raise', reasoning: '强牌应该价值下注', frequency: 85 }
      };
    }
    
    // 扩展的训练场景类型 - 更多样化
    const scenarioTypes = [
      // 超强牌 - 两对以上
      {
        type: 'premium_hand',
        weight: 0.15,
        descriptions: ['顶set', '两对', '同花', '顺子', '满堂红'],
        action: 'raise' as ActionType,
        reasoning: '超强牌应该价值下注最大化',
        frequency: 90
      },
      // 强牌 - 顶对好踢脚
      {
        type: 'strong_hand',
        weight: 0.20,
        descriptions: ['顶对强踢脚', '超对', '两对潜力'],
        action: 'raise' as ActionType,
        reasoning: '强牌应该下注获得价值',
        frequency: 75
      },
      // 中等强度 - 顶对弱踢脚
      {
        type: 'medium_hand',
        weight: 0.18,
        descriptions: ['顶对弱踢脚', '中对', '底两对'],
        action: 'call' as ActionType,
        reasoning: '中等组合强度需要控制奖池大小',
        frequency: 65
      },
      // 听牌 - 各种听牌组合
      {
        type: 'draw_hand',
        weight: 0.25,
        descriptions: ['坚果同花听', '开端顺子听', '两头顺听', '后门听牌', '组合听牌'],
        action: 'call' as ActionType,
        reasoning: '听牌有合适赔率时跟注',
        frequency: 70
      },
      // 边缘牌 - 弱对子或高牌
      {
        type: 'marginal_hand',
        weight: 0.15,
        descriptions: ['弱对子', '高张无对', 'A高', '口袋对子'],
        action: 'call' as ActionType,
        reasoning: '边缘牌需要谨慎控制风险',
        frequency: 55
      },
      // 弱牌 - 垃圾牌
      {
        type: 'weak_hand',
        weight: 0.07,
        descriptions: ['空气牌', '听牌不中', '低对无改进'],
        action: 'fold' as ActionType,
        reasoning: '弱牌应该弃牌止损',
        frequency: 80
      }
    ]

    // 加权随机选择场景类型
    const random = Math.random()
    let cumulative = 0
    let selectedScenario = scenarioTypes[0]
    
    for (const scenario of scenarioTypes) {
      cumulative += scenario.weight
      if (random <= cumulative) {
        selectedScenario = scenario
        break
      }
    }

    // 生成多样化的手牌
    let heroCards: string[]
    let communityCards: string[]

    try {
      // 先生成英雄手牌
      const heroCardObjs = deck.dealHoleCards();
      heroCards = this.cardsToStrings(heroCardObjs);

      // 根据选中的场景类型生成对应的公共牌（简化版本，避免复杂的board生成）
      const communityCardsCount = 3 + Math.floor(Math.random() * 3);
      const communityCardObjs = deck.dealCards(communityCardsCount);
      communityCards = this.cardsToStrings(communityCardObjs);

    } catch (error) {
      console.error('随机场景发牌失败:', error);
      // 返回安全默认场景
      return {
        heroCards: ['As', 'Kh'],
        communityCards: ['Qd', 'Jc', '10s'],
        description: '默认训练场景',
        recommendedAction: { action: 'raise', reasoning: '强牌应该价值下注', frequency: 85 }
      };
    }

    // 随机选择描述
    const randomDesc = selectedScenario.descriptions[Math.floor(Math.random() * selectedScenario.descriptions.length)]

    return {
      heroCards,
      communityCards,
      description: `${randomDesc} - 决策训练`,
      recommendedAction: {
        action: selectedScenario.action,
        reasoning: selectedScenario.reasoning,
        frequency: selectedScenario.frequency + Math.floor(Math.random() * 10 - 5) // ±5%随机性
      }
    }
  }

  /**
   * 生成超强牌公共牌 - 两对/三条/同花/顺子
   */
  private static generatePremiumHandBoard(heroCards: string[], deck: string[], startIndex: number): string[] {
    const heroRanks = heroCards.map(card => card.slice(0, -1))
    const heroSuits = heroCards.map(card => card.slice(-1))
    
    const premiumType = Math.random()
    
    if (premiumType < 0.4) {
      // 生成三条
      if (heroRanks[0] === heroRanks[1]) {
        // 口袋对子，找第三张
        for (let i = startIndex; i < deck.length; i++) {
          if (deck[i].slice(0, -1) === heroRanks[0]) {
            const communityCards = [deck[i]]
            this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 2 + Math.floor(Math.random() * 3))
            return communityCards
          }
        }
      } else {
        // 非对子，给其中一张配对
        const pairRank = Math.random() < 0.5 ? heroRanks[0] : heroRanks[1]
        for (let i = startIndex; i < deck.length; i++) {
          if (deck[i].slice(0, -1) === pairRank && !heroCards.includes(deck[i])) {
            const communityCards = [deck[i]]
            this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 2 + Math.floor(Math.random() * 3))
            return communityCards
          }
        }
      }
    } else if (premiumType < 0.7) {
      // 生成两对
      if (heroRanks[0] !== heroRanks[1]) {
        const communityCards: string[] = []
        // 给两张手牌都配对
        for (const rank of heroRanks) {
          for (let i = startIndex; i < deck.length; i++) {
            if (deck[i].slice(0, -1) === rank && !heroCards.includes(deck[i]) && !communityCards.includes(deck[i])) {
              communityCards.push(deck[i])
              break
            }
          }
          if (communityCards.length >= 2) break
        }
        this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 1 + Math.floor(Math.random() * 3))
        return communityCards
      }
    }
    
    // 默认强牌场景
    return this.generateStrongHandBoard(heroCards, deck, startIndex)
  }

  /**
   * 生成强牌公共牌 - 顶对强踢脚
   */
  private static generateStrongHandBoard(heroCards: string[], deck: string[], startIndex: number): string[] {
    const heroRanks = heroCards.map(card => card.slice(0, -1))
    
    // 50%概率给英雄一个对子
    if (Math.random() < 0.5 && heroRanks[0] !== heroRanks[1]) {
      const pairCard = Math.random() < 0.5 ? heroRanks[0] : heroRanks[1]
      for (let i = startIndex; i < deck.length; i++) {
        if (deck[i].slice(0, -1) === pairCard) {
          const communityCards = [deck[i]]
          this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 2 + Math.floor(Math.random() * 3))
          return communityCards
        }
      }
    }
    
    // 默认返回随机公共牌
    const streetCards = 3 + Math.floor(Math.random() * 3)
    return deck.slice(startIndex, startIndex + streetCards).filter(card => !heroCards.includes(card))
  }

  /**
   * 生成中等强度公共牌
   */
  private static generateMediumHandBoard(heroCards: string[], deck: string[], startIndex: number): string[] {
    const heroRanks = heroCards.map(card => card.slice(0, -1))
    
    // 30%概率给一个弱对子
    if (Math.random() < 0.3 && heroRanks[0] !== heroRanks[1]) {
      const pairCard = Math.random() < 0.7 ? heroRanks[1] : heroRanks[0] // 更偏向第二张牌
      for (let i = startIndex; i < deck.length; i++) {
        if (deck[i].slice(0, -1) === pairCard) {
          const communityCards = [deck[i]]
          this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 2 + Math.floor(Math.random() * 3))
          return communityCards
        }
      }
    }
    
    const streetCards = 3 + Math.floor(Math.random() * 3)
    return deck.slice(startIndex, startIndex + streetCards).filter(card => !heroCards.includes(card))
  }

  /**
   * 生成弱牌公共牌
   */
  private static generateWeakHandBoard(heroCards: string[], deck: string[], startIndex: number): string[] {
    // 完全随机，避免给英雄任何帮助
    const streetCards = 3 + Math.floor(Math.random() * 3)
    const communityCards: string[] = []
    
    for (let i = startIndex; i < deck.length && communityCards.length < streetCards; i++) {
      if (!heroCards.includes(deck[i])) {
        // 避免给英雄配对
        const heroRanks = heroCards.map(card => card.slice(0, -1))
        if (!heroRanks.includes(deck[i].slice(0, -1))) {
          communityCards.push(deck[i])
        }
      }
    }
    
    // 如果没找到足够的牌，用其余随机牌填充
    if (communityCards.length < streetCards) {
      for (let i = startIndex; i < deck.length && communityCards.length < streetCards; i++) {
        if (!heroCards.includes(deck[i]) && !communityCards.includes(deck[i])) {
          communityCards.push(deck[i])
        }
      }
    }
    
    return communityCards
  }

  /**
   * 添加随机公共牌的辅助函数
   */
  private static addRandomCommunityCards(communityCards: string[], deck: string[], startIndex: number, heroCards: string[], targetCount: number): void {
    for (let i = startIndex; i < deck.length && communityCards.length < targetCount; i++) {
      if (!heroCards.includes(deck[i]) && !communityCards.includes(deck[i])) {
        communityCards.push(deck[i])
      }
    }
  }

  /**
   * 生成听牌公共牌 - 同花听/顺子听/组合听
   */
  private static generateDrawHandBoard(heroCards: string[], deck: string[], startIndex: number): string[] {
    const heroSuits = heroCards.map(card => card.slice(-1))
    const heroRanks = heroCards.map(card => card.slice(0, -1))
    const drawType = Math.random()
    
    if (drawType < 0.4 && heroSuits[0] === heroSuits[1]) {
      // 生成同花听牌 (4张同花色，还需1张)
      const flushSuit = heroSuits[0]
      const communityCards: string[] = []
      
      // 在公共牌中放2张同花色的牌
      let suitCount = 0
      for (let i = startIndex; i < deck.length && suitCount < 2; i++) {
        if (deck[i].slice(-1) === flushSuit && !heroCards.includes(deck[i])) {
          communityCards.push(deck[i])
          suitCount++
        }
      }
      
      this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 3 + Math.floor(Math.random() * 3))
      return communityCards
      
    } else if (drawType < 0.7) {
      // 生成顺子听牌
      const heroRankValues = heroRanks.map(rank => {
        if (rank === 'A') return 14
        if (rank === 'K') return 13  
        if (rank === 'Q') return 12
        if (rank === 'J') return 11
        if (rank === '10') return 10
        return parseInt(rank)
      })
      
      // 尝试生成连续的牌来形成顺子听
      const communityCards: string[] = []
      const minValue = Math.min(...heroRankValues)
      const maxValue = Math.max(...heroRankValues)
      
      // 添加可能构成顺子的牌
      const targetRanks = []
      for (let value = Math.max(2, minValue - 2); value <= Math.min(14, maxValue + 2); value++) {
        let rank = value.toString()
        if (value === 14) rank = 'A'
        else if (value === 13) rank = 'K'
        else if (value === 12) rank = 'Q'
        else if (value === 11) rank = 'J'
        else if (value === 10) rank = '10'
        
        if (!heroRanks.includes(rank)) {
          targetRanks.push(rank)
        }
      }
      
      // 添加1-2张目标rank的牌
      let addedCards = 0
      for (const targetRank of targetRanks.slice(0, 2)) {
        for (let i = startIndex; i < deck.length && addedCards < 2; i++) {
          if (deck[i].slice(0, -1) === targetRank && !heroCards.includes(deck[i]) && !communityCards.includes(deck[i])) {
            communityCards.push(deck[i])
            addedCards++
            break
          }
        }
      }
      
      this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 3 + Math.floor(Math.random() * 3))
      return communityCards
    }
    
    // 默认返回随机听牌场景
    const streetCards = 3 + Math.floor(Math.random() * 3)
    return deck.slice(startIndex, startIndex + streetCards).filter(card => !heroCards.includes(card))
  }

  /**
   * 生成边缘牌公共牌 - 弱对子/高牌
   */
  private static generateMarginalHandBoard(heroCards: string[], deck: string[], startIndex: number): string[] {
    const heroRanks = heroCards.map(card => card.slice(0, -1))
    
    // 20%概率给一个很弱的对子
    if (Math.random() < 0.2 && heroRanks[0] !== heroRanks[1]) {
      // 偏向给较小的牌配对
      const lowerCard = this.getRankValue(heroRanks[0]) < this.getRankValue(heroRanks[1]) ? heroRanks[0] : heroRanks[1]
      for (let i = startIndex; i < deck.length; i++) {
        if (deck[i].slice(0, -1) === lowerCard && !heroCards.includes(deck[i])) {
          const communityCards = [deck[i]]
          this.addRandomCommunityCards(communityCards, deck, startIndex, heroCards, 2 + Math.floor(Math.random() * 3))
          return communityCards
        }
      }
    }
    
    // 默认返回完全随机的公共牌
    const streetCards = 3 + Math.floor(Math.random() * 3)
    return deck.slice(startIndex, startIndex + streetCards).filter(card => !heroCards.includes(card))
  }

  /**
   * 获取牌面值的数值
   */
  private static getRankValue(rank: string): number {
    if (rank === 'A') return 14
    if (rank === 'K') return 13  
    if (rank === 'Q') return 12
    if (rank === 'J') return 11
    if (rank === '10') return 10
    return parseInt(rank)
  }

  /**
   * 根据训练模式生成特定场景
   */
  private static generateTrainingModeScenario(trainingMode: string): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    switch (trainingMode) {
      case 'position':
        return this.generatePositionTrainingScenario()
      case 'stack_depth':
        return this.generateStackDepthScenario()
      case 'opponent_type':
        return this.generateOpponentTypeScenario()
      case 'special_spots':
        return this.generateSpecialSpotsScenario()
      case 'multiway':
        return this.generateMultiwayScenario()
      case 'river_bluff':
        return this.generateRiverBluffScenario()
      case 'defense':
        return this.generateDefenseScenario()
      case 'time_pressure':
        return this.generateTimePressureScenario()
      case 'general':
      default:
        return this.generateRandomHandScenario()
    }
  }

  /**
   * 位置专项训练 - 不同位置的策略差异
   */
  private static generatePositionTrainingScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const { deck, isValid } = this.createSafeTrainingDeck();
    
    if (!isValid) {
      console.warn('位置训练场景生成失败，使用默认场景');
      return {
        heroCards: ['As', 'Kh'],
        communityCards: ['Qd', 'Jc', '10s'],
        description: '默认位置训练',
        recommendedAction: { action: 'raise', reasoning: '强牌应该价值下注', frequency: 85 }
      };
    }
    
    const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']
    const position = positions[Math.floor(Math.random() * positions.length)]
    
    // 根据位置调整手牌范围和策略
    let handStrength: number
    let description: string
    let action: ActionType
    let reasoning: string
    let frequency: number

    if (['UTG', 'MP'].includes(position)) {
      // 前位 - 更紧的范围
      handStrength = Math.random() < 0.7 ? 0.8 : 0.3 // 70%强牌，30%边缘牌
      description = `${position}位 - 紧手范围决策`
      action = handStrength > 0.5 ? 'raise' : 'fold'
      reasoning = '前位需要较强的手牌才能入池'
      frequency = handStrength > 0.5 ? 80 : 85
    } else if (['CO', 'BTN'].includes(position)) {
      // 后位 - 更宽的范围
      handStrength = Math.random() // 全范围
      description = `${position}位 - 位置优势利用`
      action = handStrength > 0.3 ? (handStrength > 0.7 ? 'raise' : 'call') : 'fold'
      reasoning = '后位可以用更宽的范围参与游戏'
      frequency = handStrength > 0.7 ? 75 : handStrength > 0.3 ? 60 : 80
    } else {
      // 盲注位 - 防守策略
      handStrength = 0.4 + Math.random() * 0.6 // 偏中等强度
      description = `${position}位 - 盲注防守决策`
      action = handStrength > 0.6 ? 'raise' : 'call'
      reasoning = '盲注位已投入资金，需要适当防守'
      frequency = handStrength > 0.6 ? 70 : 55
    }

    try {
      const heroCardObjs = deck.dealHoleCards();
      const communityCardsCount = 3 + Math.floor(Math.random() * 3);
      const communityCardObjs = deck.dealCards(communityCardsCount);
      
      // Convert Card objects to strings
      const heroCards = this.cardsToStrings(heroCardObjs);
      const communityCards = this.cardsToStrings(communityCardObjs);

      return {
        heroCards,
        communityCards,
        description,
        recommendedAction: { action, reasoning, frequency }
      };
    } catch (error) {
      console.error('位置训练场景发牌失败:', error);
      return {
        heroCards: ['As', 'Kh'],
        communityCards: ['Qd', 'Jc', '10s'],
        description: '默认位置训练',
        recommendedAction: { action: 'raise', reasoning: '强牌应该价值下注', frequency: 85 }
      };
    }
  }

  /**
   * 筹码深度训练 - 深资源vs浅资源策略
   */
  private static generateStackDepthScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const { deck, isValid } = this.createSafeTrainingDeck();
    
    if (!isValid) {
      return {
        heroCards: ['As', 'Kh'],
        communityCards: ['Qd', 'Jc', '10s'],
        description: '默认深度训练',
        recommendedAction: { action: 'raise', reasoning: '强牌应该价值下注', frequency: 85 }
      };
    }
    
    const isDeepStack = Math.random() < 0.5;
    
    try {
      const heroCardObjs = deck.dealHoleCards();
      const heroCards = this.cardsToStrings(heroCardObjs);
      const communityCardsCount = 3 + Math.floor(Math.random() * 3);
      const communityCardObjs = deck.dealCards(communityCardsCount);
      const communityCards = this.cardsToStrings(communityCardObjs);

      if (isDeepStack) {
      // 深资源 - 更复杂的策略
      return {
        heroCards,
        communityCards,
        description: '深资源场景 - 复杂线路规划',
        recommendedAction: {
          action: Math.random() < 0.4 ? 'call' : Math.random() < 0.7 ? 'raise' : 'fold',
          reasoning: '深资源允许更多复杂的后续操作',
          frequency: 65
        }
      };
    } else {
        // 浅资源 - 更直接的策略
        return {
          heroCards,
          communityCards,
          description: '浅资源场景 - 简化决策树',
          recommendedAction: {
            action: Math.random() < 0.6 ? 'raise' : Math.random() < 0.8 ? 'call' : 'fold',
            reasoning: '浅资源需要更直接的价值导向决策',
            frequency: 75
          }
        };
      }
    } catch (error) {
      console.error('深度训练场景发牌失败:', error);
      return {
        heroCards: ['As', 'Kh'],
        communityCards: ['Qd', 'Jc', '10s'],
        description: '默认深度训练',
        recommendedAction: { action: 'raise', reasoning: '强牌应该价值下注', frequency: 85 }
      };
    }
  }

  /**
   * 对手类型训练 - 针对不同风格的调整
   */
  private static generateOpponentTypeScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const deck = this.shuffleDeck(this.generateDeck())
    const opponentTypes = ['紧手被动', '紧手激进', '松手被动', '松手激进', '鱼玩家', 'TAG高手']
    const opponentType = opponentTypes[Math.floor(Math.random() * opponentTypes.length)]
    
    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

    let action: ActionType
    let reasoning: string
    let frequency: number

    switch (opponentType) {
      case '紧手被动':
        action = Math.random() < 0.6 ? 'raise' : 'call'
        reasoning = '对紧手被动玩家可以更激进地bluff'
        frequency = 70
        break
      case '紧手激进':
        action = Math.random() < 0.4 ? 'call' : Math.random() < 0.7 ? 'fold' : 'raise'
        reasoning = '面对紧手激进需要更谨慎，他们range很强'
        frequency = 60
        break
      case '松手被动':
        action = Math.random() < 0.7 ? 'raise' : 'call'
        reasoning = '对松手被动玩家要价值导向，少bluff'
        frequency = 80
        break
      case '松手激进':
        action = Math.random() < 0.5 ? 'call' : Math.random() < 0.8 ? 'fold' : 'raise'
        reasoning = '松手激进难以阅读，需要平衡策略'
        frequency = 55
        break
      case '鱼玩家':
        action = Math.random() < 0.8 ? 'call' : 'raise'
        reasoning = '对鱼玩家主要价值下注，避免复杂bluff'
        frequency = 85
        break
      default: // TAG高手
        action = Math.random() < 0.33 ? 'call' : Math.random() < 0.66 ? 'raise' : 'fold'
        reasoning = '对TAG高手需要平衡策略，避免被exploit'
        frequency = 50
        break
    }

    return {
      heroCards,
      communityCards,
      description: `vs ${opponentType} - 针对性调整`,
      recommendedAction: { action, reasoning, frequency }
    }
  }

  /**
   * 特殊场景训练 - 3bet pot, 4bet pot等
   */
  private static generateSpecialSpotsScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const deck = this.shuffleDeck(this.generateDeck())
    const scenarios = ['3bet pot', '4bet pot', '5bet pot', 'Cold call', 'Squeeze', 'Resteal']
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
    
    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

    return {
      heroCards,
      communityCards,
      description: `${scenario} - 特殊场景决策`,
      recommendedAction: {
        action: Math.random() < 0.4 ? 'call' : Math.random() < 0.7 ? 'raise' : 'fold',
        reasoning: `${scenario}场景需要考虑range优势和位置`,
        frequency: 65
      }
    }
  }

  /**
   * 多人奖池训练 - 3+人参与的复杂决策
   */
  private static generateMultiwayScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const deck = this.shuffleDeck(this.generateDeck())
    const playerCount = 3 + Math.floor(Math.random() * 3) // 3-5人
    
    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

    return {
      heroCards,
      communityCards,
      description: `${playerCount}人奖池 - 多人复杂决策`,
      recommendedAction: {
        action: Math.random() < 0.6 ? 'call' : Math.random() < 0.8 ? 'fold' : 'raise',
        reasoning: '多人奖池需要更强的组合强度才能激进',
        frequency: 70
      }
    }
  }

  /**
   * 河牌诈唬训练 - 河牌圈的诈唬艺术
   */
  private static generateRiverBluffScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const deck = this.shuffleDeck(this.generateDeck())
    const heroCards = [deck[0], deck[1]]
    const communityCards = deck.slice(2, 7) // 强制河牌圈

    const bluffSpots = ['错过听牌', '阻断牌诈唬', '合并诈唬', '极化诈唬', '价值下注']
    const spot = bluffSpots[Math.floor(Math.random() * bluffSpots.length)]

    return {
      heroCards,
      communityCards,
      description: `河牌圈 - ${spot}`,
      recommendedAction: {
        action: spot === '价值下注' ? 'raise' : Math.random() < 0.4 ? 'raise' : Math.random() < 0.7 ? 'call' : 'fold',
        reasoning: `河牌圈${spot}需要考虑对手的calling range`,
        frequency: spot === '价值下注' ? 85 : 45
      }
    }
  }

  /**
   * 防守训练 - 应对激进对手
   */
  private static generateDefenseScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const deck = this.shuffleDeck(this.generateDeck())
    const defenseSituations = ['面对Cbet', '面对3bet', '面对4bet', '面对河牌大注', '面对全下']
    const situation = defenseSituations[Math.floor(Math.random() * defenseSituations.length)]
    
    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

    return {
      heroCards,
      communityCards,
      description: `防守训练 - ${situation}`,
      recommendedAction: {
        action: Math.random() < 0.5 ? 'call' : Math.random() < 0.8 ? 'fold' : 'raise',
        reasoning: `${situation}时需要平衡防守频率避免被exploit`,
        frequency: 60
      }
    }
  }

  /**
   * 限时训练 - 快速决策能力
   */
  private static generateTimePressureScenario(): {
    heroCards: string[]
    communityCards: string[]
    description: string
    recommendedAction: { action: ActionType, reasoning: string, frequency: number }
  } {
    const deck = this.shuffleDeck(this.generateDeck())
    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

    return {
      heroCards,
      communityCards,
      description: '限时挑战 - 快速GTO决策',
      recommendedAction: {
        action: Math.random() < 0.33 ? 'call' : Math.random() < 0.66 ? 'raise' : 'fold',
        reasoning: '时间压力下保持GTO原则，依赖直觉',
        frequency: 65
      }
    }
  }
  
  /**
   * Process player action and progress the game
   */
  static async processPlayerAction(
    gameState: TrainingGameState, 
    actionType: ActionType, 
    amount?: number
  ): Promise<GameProgressResult> {
    
    // 获取英雄玩家
    const heroPlayer = gameState.players.find(p => p.id === 'hero')
    if (!heroPlayer) {
      throw new Error('Hero player not found')
    }
    
    // 记录玩家操作前的状态
    const potBefore = gameState.pot
    const stackBefore = heroPlayer.stack
    
    // 1. Update game state with player action
    let updatedGameState = this.updatePlayerAction(gameState, 'hero', actionType, amount)
    
    // 记录玩家操作
    const heroAfterAction = updatedGameState.players.find(p => p.id === 'hero')
    if (heroAfterAction) {
      updatedGameState.actionRecorder.recordPlayerAction(
        heroAfterAction,
        actionType,
        amount || 0,
        updatedGameState.stage,
        potBefore,
        updatedGameState.pot,
        stackBefore
      )
    }
    
    // 1.5. Update current player to next active player (unless player folded)
    if (actionType !== 'fold') {
      const nextPlayerIndex = this.findNextPlayerToAct(updatedGameState)
      if (nextPlayerIndex !== -1) {
        updatedGameState.currentPlayer = nextPlayerIndex
      }
    }
    
    // 2. Evaluate player decision
    const isCorrectAction = actionType === gameState.currentScenario.recommendedAction.action
    const updatedProgress = {
      handsPlayed: updatedGameState.trainingProgress.handsPlayed,
      correctDecisions: updatedGameState.trainingProgress.correctDecisions + (isCorrectAction ? 1 : 0),
      currentStreak: isCorrectAction ? updatedGameState.trainingProgress.currentStreak + 1 : 0
    }

    updatedGameState.trainingProgress = updatedProgress

    // 3. Check if hand is complete after player action
    if (actionType === 'fold') {
      // 记录手牌结束
      const remainingPlayer = updatedGameState.players.find(p => p.id !== 'hero' && !p.folded)
      if (remainingPlayer) {
        updatedGameState.actionRecorder.recordHandEnd(
          remainingPlayer.id,
          remainingPlayer.name,
          updatedGameState.pot,
          'fold'
        )
      }
      
      // 🎯 使用新系统处理弃牌结束情况
      const foldResult = PokerHandResultGenerator.generateHandResult(
        updatedGameState.players,
        updatedGameState.communityCards,
        updatedGameState.pot,
        false // 非摊牌
      )
      
      return {
        gameState: updatedGameState,
        isHandComplete: true,
        handResult: {
          winnerId: foldResult.handWinnerId,
          winnerName: foldResult.handWinnerName,
          heroResult: 'lose', // 英雄弃牌必然失败
          
          handRankings: foldResult.handRankings,
          winAmount: updatedGameState.pot,
          sidePotResult: foldResult.sidePotResult,
          
          showdown: false,
          analysis: foldResult.combinedAnalysis,
          
          // 兼容性
          winner: 'opponents',
          detailedAnalysis: this.generateDetailedAnalysisReport(foldResult)
        },
        nextAction: 'hand_complete'
      }
    }

    // 4. Progress to AI actions
    const gameAfterAI = await this.processAIActions(updatedGameState)
    
    return gameAfterAI
  }

  /**
   * Process AI opponent actions automatically
   */
  private static async processAIActions(gameState: TrainingGameState): Promise<GameProgressResult> {
    let currentState = { ...gameState }
    const aiActions: Array<{
      playerId: string
      playerName: string
      action: ActionType
      amount?: number
      position: string
    }> = []
    
    // 继续处理AI操作直到轮到英雄玩家或手牌结束
    let maxIterations = 10 // 防止无限循环
    let iterations = 0
    
    while (iterations < maxIterations) {
      iterations++
      
      // 找到下一个需要行动的玩家
      const currentPlayerIndex = this.findNextPlayerToAct(currentState)
      
      if (currentPlayerIndex === -1) {
        // 没有玩家需要行动，结束当前轮
        if (this.isBettingRoundComplete(currentState)) {
          const nextStreetResult = this.progressToNextStreet(currentState)
          return {
            ...nextStreetResult,
            aiActions
          }
        }
        break
      }
      
      const currentPlayer = currentState.players[currentPlayerIndex]
      
      // 如果轮到英雄玩家，停止AI处理
      if (currentPlayer.id === 'hero') {
        currentState.currentPlayer = currentPlayerIndex
        return {
          gameState: currentState,
          isHandComplete: false,
          nextAction: 'wait_for_player',
          aiActions,
          message: '轮到你了'
        }
      }
      
      // 检查是否还有其他活跃对手
      const activeOpponents = currentState.players.filter(p => 
        p.id !== 'hero' && p.isActive && !p.folded
      )

      if (activeOpponents.length === 0) {
        return this.completeHand(currentState, 'hero')
      }
      
      // 记录AI操作前的状态
      const aiPotBefore = currentState.pot
      const aiStackBefore = currentPlayer.stack
      
      // 处理AI玩家操作
      const aiAction = this.getAIAction(currentPlayer, currentState)
      
      // 记录AI操作
      aiActions.push({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        action: aiAction.type,
        amount: aiAction.amount,
        position: currentPlayer.position
      })
      
      // 更新游戏状态
      currentState = this.updatePlayerAction(currentState, currentPlayer.id, aiAction.type, aiAction.amount)
      
      // 记录AI操作到操作历史中
      const aiPlayerAfterAction = currentState.players[currentPlayerIndex]
      if (aiPlayerAfterAction) {
        currentState.actionRecorder.recordPlayerAction(
          aiPlayerAfterAction,
          aiAction.type,
          aiAction.amount || 0,
          currentState.stage,
          aiPotBefore,
          currentState.pot,
          aiStackBefore
        )
      }
      
      // 添加短暂延迟让AI行动更自然，但保持快速训练体验
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100)) // 100-200ms随机延迟
      
      // 检查AI是否弃牌
      if (aiAction.type === 'fold') {
        const remainingOpponents = currentState.players.filter(p => 
          p.id !== 'hero' && p.isActive && !p.folded
        )
        
        if (remainingOpponents.length === 0) {
          return this.completeHand(currentState, 'hero')
        }
      }
      
      // 检查是否该轮下注结束
      if (this.isBettingRoundComplete(currentState)) {
        const nextStreetResult = this.progressToNextStreet(currentState)
        return {
          ...nextStreetResult,
          aiActions
        }
      }
      
      // 模拟AI思考时间 (移除await，在前端使用不同的延迟机制)
      // await new Promise(resolve => setTimeout(resolve, this.AI_ACTION_DELAY))
    }

    // 如果处理完所有AI，回到等待英雄玩家
    const heroPlayerIndex = currentState.players.findIndex(p => p.id === 'hero')
    if (heroPlayerIndex !== -1 && currentState.players[heroPlayerIndex].isActive && !currentState.players[heroPlayerIndex].folded) {
      currentState.currentPlayer = heroPlayerIndex
      return {
        gameState: currentState,
        isHandComplete: false,
        nextAction: 'wait_for_player',
        aiActions
      }
    }

    return {
      gameState: currentState,
      isHandComplete: false,
      nextAction: 'wait_for_player',
      aiActions
    }
  }

  /**
   * Progress to next street or complete hand
   */
  private static progressToNextStreet(gameState: TrainingGameState): GameProgressResult {
    const currentStage = gameState.stage
    
    switch (currentStage) {
      case 'preflop':
        return this.dealFlop(gameState)
      case 'flop':
        return this.dealTurn(gameState)
      case 'turn':
        return this.dealRiver(gameState)
      case 'river':
        return this.completeHand(gameState, 'showdown')
      default:
        return this.completeHand(gameState, 'hero')
    }
  }

  /**
   * Deal flop cards
   */
  private static dealFlop(gameState: TrainingGameState): GameProgressResult {
    const newState = { ...gameState }
    newState.stage = 'flop'
    
    // 收集已使用的牌，避免重复
    const usedCards: Card[] = []
    newState.players.forEach(player => {
      if (player.cards) {
        usedCards.push(...player.cards)
      }
    })
    usedCards.push(...newState.communityCards)
    
    // 如果已经有公共牌，使用现有的，否则生成新的
    if (newState.communityCards.length >= 3) {
      // 已经有翻牌了，保持不变
    } else {
      // 生成新的翻牌，确保不与已用牌重复
      const newFlop = this.generateSafeCards(3, usedCards)
      newState.communityCards = [...newState.communityCards, ...newFlop]
    }
    
    newState.currentPlayer = 1 // Small blind acts first post-flop
    
    // Reset betting
    newState.players.forEach(p => p.currentBet = 0)
    
    // 记录街道进展
    newState.actionRecorder.recordStreetProgression(
      'preflop',
      'flop',
      newState.communityCards.length,
      newState.pot
    )

    return {
      gameState: newState,
      isHandComplete: false,
      nextAction: 'wait_for_player',
      message: '翻牌圈开始'
    }
  }

  /**
   * 生成安全的牌（不与已使用牌重复）
   */
  private static generateSafeCards(count: number, usedCards: Card[]): Card[] {
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
    
    const safeCards: Card[] = []
    
    // 辅助函数检查牌是否已被使用
    const isCardUsed = (rank: string, suit: string): boolean => {
      return usedCards.some(card => card.rank === rank && card.suit === suit)
    }
    
    let attempts = 0
    while (safeCards.length < count && attempts < 1000) {
      const rank = ranks[Math.floor(Math.random() * ranks.length)]
      const suit = suits[Math.floor(Math.random() * suits.length)]
      
      if (!isCardUsed(rank, suit) && !safeCards.some(card => card.rank === rank && card.suit === suit)) {
        safeCards.push({ rank, suit })
      }
      
      attempts++
    }
    
    if (safeCards.length < count) {
      console.warn(`只能生成${safeCards.length}/${count}张安全牌，可能牌组不足`)
    }
    
    return safeCards
  }

  /**
   * Deal turn card
   */
  private static dealTurn(gameState: TrainingGameState): GameProgressResult {
    const newState = { ...gameState }
    newState.stage = 'turn'
    
    // 收集已使用的牌，避免重复
    const usedCards: Card[] = []
    newState.players.forEach(player => {
      if (player.cards) {
        usedCards.push(...player.cards)
      }
    })
    usedCards.push(...newState.communityCards)
    
    // 如果已经有4张公共牌，保持不变，否则添加转牌
    if (newState.communityCards.length >= 4) {
      // 已经有转牌了，保持不变
    } else {
      // 生成安全的转牌
      const turnCard = this.generateSafeCards(1, usedCards)
      if (turnCard.length > 0) {
        newState.communityCards = [...gameState.communityCards, turnCard[0]]
      }
    }
    
    newState.currentPlayer = 1
    newState.players.forEach(p => p.currentBet = 0)
    
    // 记录街道进展
    newState.actionRecorder.recordStreetProgression(
      'flop',
      'turn',
      newState.communityCards.length,
      newState.pot
    )

    return {
      gameState: newState,
      isHandComplete: false,
      nextAction: 'wait_for_player',
      message: '转牌圈开始'
    }
  }

  /**
   * Deal river card
   */
  private static dealRiver(gameState: TrainingGameState): GameProgressResult {
    const newState = { ...gameState }
    newState.stage = 'river'
    
    // 收集已使用的牌，避免重复
    const usedCards: Card[] = []
    newState.players.forEach(player => {
      if (player.cards) {
        usedCards.push(...player.cards)
      }
    })
    usedCards.push(...newState.communityCards)
    
    // 如果已经有5张公共牌，保持不变，否则添加河牌
    if (newState.communityCards.length >= 5) {
      // 已经有河牌了，保持不变
    } else {
      // 生成安全的河牌
      const riverCard = this.generateSafeCards(1, usedCards)
      if (riverCard.length > 0) {
        newState.communityCards = [...gameState.communityCards, riverCard[0]]
      }
    }
    
    newState.currentPlayer = 1
    newState.players.forEach(p => p.currentBet = 0)
    
    // 记录街道进展
    newState.actionRecorder.recordStreetProgression(
      'turn',
      'river',
      newState.communityCards.length,
      newState.pot
    )

    return {
      gameState: newState,
      isHandComplete: false,
      nextAction: 'wait_for_player',
      message: '河牌圈开始'
    }
  }

  /**
   * Complete current hand
   */
  private static completeHand(
    gameState: TrainingGameState, 
    result: 'hero' | 'opponents' | 'showdown'
  ): GameProgressResult {
    let handResult: HandResult

    switch (result) {
      case 'hero':
        // 🎯 使用新系统处理英雄获胜情况
        const heroResult = PokerHandResultGenerator.generateHandResult(
          gameState.players,
          gameState.communityCards,
          gameState.pot,
          false // 非摊牌
        )
        
        handResult = {
          // 新接口字段
          handWinnerId: 'hero',
          handWinnerName: '主玩家',
          heroHandResult: 'win', // 英雄获胜
          
          handRankings: heroResult.handRankings,
          winAmount: gameState.pot,
          sidePotResult: heroResult.sidePotResult,
          
          showdown: false,
          analysis: heroResult.combinedAnalysis,
          
          // 兼容性字段
          winner: 'hero',
          winnerId: 'hero',
          winnerName: '主玩家',
          heroResult: 'win',
          detailedAnalysis: this.generateDetailedAnalysisReport(heroResult)
        }
        break
      case 'opponents':
        // 🎯 使用新系统处理弃牌情况
        const opponentsResult = PokerHandResultGenerator.generateHandResult(
          gameState.players,
          gameState.communityCards,
          gameState.pot,
          false // 非摊牌
        )
        
        handResult = {
          // 新接口字段
          handWinnerId: opponentsResult.handWinnerId,
          handWinnerName: opponentsResult.handWinnerName,
          heroHandResult: 'lose', // 英雄弃牌必然失败
          
          handRankings: opponentsResult.handRankings,
          winAmount: gameState.pot,
          sidePotResult: opponentsResult.sidePotResult,
          
          showdown: false,
          analysis: opponentsResult.combinedAnalysis,
          
          // 兼容性字段
          winner: 'opponents',
          winnerId: opponentsResult.handWinnerId,
          winnerName: opponentsResult.handWinnerName,
          heroResult: 'lose',
          detailedAnalysis: this.generateDetailedAnalysisReport(opponentsResult)
        }
        break
      case 'showdown':
        // 🎯 使用新的标准德州扑克胜负判定系统
        const standardResult = PokerHandResultGenerator.generateHandResult(
          gameState.players,
          gameState.communityCards,
          gameState.pot,
          true // 摊牌
        )
        
        // 生成详细分析报告（保持兼容性）
        const detailedAnalysis = this.generateDetailedAnalysisReport(standardResult)
        
        handResult = {
          // 基于手牌强度的胜负判定 (新接口)
          handWinnerId: standardResult.handWinnerId,
          handWinnerName: standardResult.handWinnerName,
          heroHandResult: standardResult.heroHandResult,
          
          // 手牌排名信息
          handRankings: standardResult.handRankings,
          
          // 金额分配结果
          winAmount: gameState.pot,
          sidePotResult: standardResult.sidePotResult,
          
          // 分析信息
          showdown: true,
          analysis: standardResult.combinedAnalysis,
          
          // 兼容性字段 (旧接口)
          winner: standardResult.handWinnerId,
          winnerId: standardResult.handWinnerId,
          winnerName: standardResult.handWinnerName,
          heroResult: standardResult.heroHandResult,
          detailedAnalysis
        }
        break
    }

    // Update training progress
    const updatedProgress = {
      handsPlayed: gameState.trainingProgress.handsPlayed + 1,
      correctDecisions: gameState.trainingProgress.correctDecisions,
      currentStreak: gameState.trainingProgress.currentStreak
    }

    return {
      gameState: { ...gameState, trainingProgress: updatedProgress },
      isHandComplete: true,
      handResult,
      nextAction: 'hand_complete'
    }
  }

  /**
   * Update player action in game state
   */
  private static updatePlayerAction(
    gameState: TrainingGameState,
    playerId: string,
    actionType: ActionType,
    amount?: number
  ): TrainingGameState {
    const newState = { ...gameState }
    const playerIndex = newState.players.findIndex(p => p.id === playerId)
    
    if (playerIndex === -1) return newState

    const player = { ...newState.players[playerIndex] }

    switch (actionType) {
      case 'fold':
        player.folded = true
        player.isActive = false
        break
      case 'check':
        // No bet change
        break
      case 'call':
        const callAmount = Math.max(...newState.players.map(p => p.currentBet)) - player.currentBet
        player.currentBet += callAmount
        player.stack -= callAmount
        newState.pot += callAmount
        break
      case 'bet':
      case 'raise':
        const raiseAmount = amount || newState.minRaise
        const totalBet = raiseAmount
        const additionalBet = totalBet - player.currentBet
        player.currentBet = totalBet
        player.stack -= additionalBet
        newState.pot += additionalBet
        break
      case 'all-in':
        const allInAmount = player.stack
        player.currentBet += allInAmount
        player.stack = 0
        newState.pot += allInAmount
        player.isAllIn = true
        break
    }

    newState.players[playerIndex] = player
    return newState
  }

  /**
   * Get AI action (professional decision making)
   */
  private static getAIAction(player: Player, gameState: TrainingGameState): { type: ActionType, amount?: number } {
    // 检查是否有手牌
    if (!player.cards || player.cards.length !== 2) {
      console.warn(`AI玩家 ${player.id} 没有手牌，执行保守决策`)
      return { type: 'fold' }
    }

    const currentBet = Math.max(...gameState.players.map(p => p.currentBet))
    const callAmount = currentBet - player.currentBet
    const activePlayers = gameState.players.filter(p => p.isActive && !p.folded).length
    
    try {
      // 使用专业手牌分析器
      const analysis: ProfessionalHandAnalysis = ProfessionalHandAnalyzer.analyzeHand(
        player.cards as [Card, Card],
        gameState.communityCards,
        gameState.stage,
        player.position,
        player.stack,
        gameState.pot,
        callAmount,
        activePlayers - 1 // 对手数量（排除自己）
      )

      // 基于专业分析做决策
      return this.makeAIDecision(analysis, player, gameState, callAmount)
      
    } catch (error) {
      console.error(`AI分析失败，使用备用逻辑:`, error)
      // 备用逻辑：保守决策
      return this.getFallbackAIAction(player, gameState, callAmount)
    }
  }

  /**
   * 基于专业分析做AI决策
   */
  private static makeAIDecision(
    analysis: ProfessionalHandAnalysis,
    player: Player,
    gameState: TrainingGameState,
    callAmount: number
  ): { type: ActionType, amount?: number } {
    
    const recommendation = analysis.recommendation
    const random = Math.random() * 0.2 + 0.9 // 0.9-1.1 随机因子，增加不可预测性
    const confidence = recommendation.confidence * random
    
    // 基于推荐动作和信心度做决策
    switch (recommendation.action) {
      case 'fold':
        return { type: 'fold' }
        
      case 'call':
        if (callAmount === 0) {
          return { type: 'check' }
        } else if (callAmount <= player.stack) {
          // 有一定概率根据信心度变成加注
          if (confidence > 80 && Math.random() < 0.3) {
            const raiseAmount = Math.min(
              gameState.minRaise + callAmount,
              player.stack
            )
            return { type: 'raise', amount: raiseAmount }
          }
          return { type: 'call' }
        } else {
          return { type: 'all-in', amount: player.stack }
        }
        
      case 'raise':
        if (callAmount === 0) {
          // 可以下注
          const betSize = this.calculateBetSize(analysis, gameState.pot, player.stack)
          if (betSize >= gameState.minRaise) {
            return { type: 'bet', amount: betSize }
          } else {
            return { type: 'check' }
          }
        } else {
          // 需要加注
          const raiseSize = this.calculateRaiseSize(analysis, callAmount, gameState.pot, player.stack)
          if (raiseSize <= player.stack && raiseSize >= gameState.minRaise) {
            return { type: 'raise', amount: raiseSize }
          } else if (callAmount <= player.stack) {
            return { type: 'call' }
          } else {
            return { type: 'fold' }
          }
        }
        
      case 'all-in':
        return { type: 'all-in', amount: player.stack }
        
      default:
        return { type: 'fold' }
    }
  }

  /**
   * 计算下注大小
   */
  private static calculateBetSize(
    analysis: ProfessionalHandAnalysis, 
    potSize: number, 
    stackSize: number
  ): number {
    let betSize = 0
    
    // 基于手牌类别调整下注大小
    switch (analysis.handCategory) {
      case 'premium':
        betSize = potSize * 0.8 // 80%底池
        break
      case 'strong':
        betSize = potSize * 0.6 // 60%底池
        break
      case 'medium':
        betSize = potSize * 0.4 // 40%底池
        break
      default:
        betSize = potSize * 0.3 // 30%底池（诈唬）
    }
    
    // 基于胜率调整
    if (analysis.equity >= 70) {
      betSize *= 1.2 // 高胜率增加下注
    } else if (analysis.equity <= 30) {
      betSize *= 0.7 // 低胜率减少下注
    }
    
    // 限制在筹码范围内
    return Math.min(Math.max(betSize, potSize * 0.2), stackSize)
  }

  /**
   * 计算加注大小
   */
  private static calculateRaiseSize(
    analysis: ProfessionalHandAnalysis,
    callAmount: number,
    potSize: number,
    stackSize: number
  ): number {
    let raiseSize = callAmount
    
    // 基于手牌强度确定加注大小
    switch (analysis.handCategory) {
      case 'premium':
        raiseSize += potSize * 1.0 // 大加注
        break
      case 'strong':
        raiseSize += potSize * 0.7 // 中等加注
        break
      case 'medium':
        raiseSize += potSize * 0.5 // 小加注
        break
      default:
        raiseSize += potSize * 0.4 // 最小加注（诈唬）
    }
    
    // 位置调整
    if (analysis.position === 'late') {
      raiseSize *= 0.8 // 后位可以更小的加注
    } else if (analysis.position === 'early') {
      raiseSize *= 1.1 // 前位需要更大的加注
    }
    
    return Math.min(raiseSize, stackSize)
  }

  /**
   * 备用AI决策逻辑（当专业分析失败时使用）
   */
  private static getFallbackAIAction(
    player: Player, 
    gameState: TrainingGameState, 
    callAmount: number
  ): { type: ActionType, amount?: number } {
    // 简化逻辑：保守但不完全随机
    const random = Math.random()
    
    if (callAmount === 0) {
      if (random < 0.6) return { type: 'check' }
      if (random < 0.8) return { type: 'bet', amount: Math.min(gameState.minRaise, player.stack) }
      return { type: 'fold' }
    } else {
      if (callAmount > player.stack * 0.3) return { type: 'fold' } // 大额跟注直接弃牌
      if (random < 0.4) return { type: 'call' }
      if (random < 0.6) return { type: 'fold' }
      
      const raiseAmount = Math.min(callAmount * 2, player.stack)
      return { type: 'raise', amount: raiseAmount }
    }
  }

  /**
   * Find next player to act in proper seat order
   */
  private static findNextPlayerToAct(gameState: TrainingGameState): number {
    const activePlayers = gameState.players.filter(p => p.isActive && !p.folded)
    
    if (activePlayers.length <= 1) return -1
    
    const currentBet = Math.max(...activePlayers.map(p => p.currentBet))
    
    // 从当前玩家后面开始找，按座位顺序
    let startIndex = (gameState.currentPlayer + 1) % gameState.players.length
    
    for (let i = 0; i < gameState.players.length; i++) {
      const playerIndex = (startIndex + i) % gameState.players.length
      const player = gameState.players[playerIndex]
      
      if (player.isActive && !player.folded && !player.isAllIn) {
        // 如果该玩家还需要跟注或决策
        if (player.currentBet < currentBet) {
          return playerIndex
        }
      }
    }
    
    return -1 // 没有玩家需要行动
  }

  /**
   * Check if betting round is complete
   */
  private static isBettingRoundComplete(gameState: TrainingGameState): boolean {
    const activePlayers = gameState.players.filter(p => p.isActive && !p.folded)
    
    if (activePlayers.length <= 1) return true
    
    const currentBet = Math.max(...activePlayers.map(p => p.currentBet))
    const playersWithCurrentBet = activePlayers.filter(p => p.currentBet === currentBet || p.isAllIn)
    
    return playersWithCurrentBet.length === activePlayers.length
  }

  /**
   * Generate random cards for AI players
   */
  private static generateRandomCards(usedCards: Card[] = []): [Card, Card] {
    const { deck, isValid } = this.createSafeTrainingDeck(usedCards);
    
    if (!isValid || deck.getRemainingCount() < 2) {
      console.warn('无法生成随机牌 - 使用默认安全牌');
      // 返回安全的默认牌
      return [
        { rank: '2', suit: 'hearts' },
        { rank: '3', suit: 'hearts' }
      ];
    }
    
    try {
      return deck.dealHoleCards();
    } catch (error) {
      console.error('发牌失败:', error);
      // 返回安全的默认牌
      return [
        { rank: '2', suit: 'hearts' },
        { rank: '3', suit: 'hearts' }
      ];
    }
  }

  /**
   * Generate next training scenario with specified training mode and practice position (FIXED - 防重复牌)
   */
  static generateNextScenario(trainingMode: string = 'general', practicePosition: number = 3): TrainingGameState {
    console.log('🎯 生成训练场景 - 使用安全发牌系统');
    
    // 根据训练模式生成特定的手牌场景
    const handScenario = this.generateTrainingModeScenario(trainingMode)
    
    // 生成唯一ID避免重复
    const scenarioId = `${trainingMode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    
    // 防止连续重复相同类型的场景
    if (this.lastGeneratedScenarios.length >= 3) {
      this.lastGeneratedScenarios.shift() // 移除最老的记录
    }
    this.lastGeneratedScenarios.push(handScenario.description)
    
    // 使用专业牌组管理器创建安全场景
    const safeScenario = DeckManager.createSafeScenario(
      handScenario.heroCards,
      handScenario.communityCards,
      6 // 6人桌
    )
    
    if (!safeScenario.isValid) {
      console.error('🚨 场景生成失败:', safeScenario.errors);
      console.error('🚨 原始场景数据:', { 
        heroCards: handScenario.heroCards,
        communityCards: handScenario.communityCards
      });
      // 回退到安全的默认场景
      return this.generateSafeDefaultScenario(practicePosition);
    }
    
    console.log('✅ 场景生成成功 - 无重复牌:', safeScenario.deck.getDebugInfo());
    
    // 根据公共牌数量确定游戏阶段
    let stage: 'preflop' | 'flop' | 'turn' | 'river'
    if (safeScenario.communityCards.length === 0) {
      stage = 'preflop'
    } else if (safeScenario.communityCards.length === 3) {
      stage = 'flop' 
    } else if (safeScenario.communityCards.length === 4) {
      stage = 'turn'
    } else {
      stage = 'river'
    }
    
    // 随机生成不同的筹码量和奖池大小  
    const randomHeroStack = 150 + Math.random() * 100 // 150-250
    const basePot = stage === 'flop' ? 12 : stage === 'turn' ? 24 : stage === 'river' ? 36 : 6
    const randomPotMultiplier = 0.8 + Math.random() * 0.4 // 0.8-1.2倍
    
    // Create 6-player table with safe cards
    const playerPositions = ['UTG', '中位', '后位', '庄位', '小盲', '大盲']
    const positionCodes = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'] as Position[]
    const players: Player[] = []
    
    for (let i = 0; i < 6; i++) {
      const isHero = i === practicePosition // Hero is at the practice position
      const baseStack = 150 + Math.random() * 100
      
      let playerCards: [Card, Card]
      if (isHero) {
        playerCards = safeScenario.heroCards
      } else {
        // Use cards from safe scenario
        const otherPlayerIndex = players.filter(p => p.id !== 'hero').length
        if (otherPlayerIndex < safeScenario.otherPlayerCards.length) {
          playerCards = safeScenario.otherPlayerCards[otherPlayerIndex]
        } else {
          // Fallback: 如果没有足够的牌，使用默认牌（这种情况应该不会发生）
          console.warn('⚠️ 玩家牌不足，使用默认牌');
          playerCards = [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'diamonds' }];
        }
      }
      
      players.push({
        id: isHero ? 'hero' : `opponent-${i}`,
        name: isHero ? `${playerPositions[i]} (练习)` : playerPositions[i],
        stack: Number(baseStack.toFixed(1)),
        currentBet: stage === 'preflop' ? (i === 4 ? 1 : i === 5 ? 2 : 0) : 0, // SB=1, BB=2
        cards: playerCards,
        position: positionCodes[i],
        isActive: true,
        isAllIn: false,
        folded: Math.random() < 0.3 && !isHero, // 30% chance opponents fold randomly
        actions: []
      })
    }

    // 创建并初始化操作记录器
    const actionRecorder = new ActionRecorder()
    
    // 创建游戏状态对象
    const gameState: TrainingGameState = {
      id: scenarioId,
      players,
      communityCards: safeScenario.communityCards,
      pot: Number((basePot * randomPotMultiplier).toFixed(1)),
      currentPlayer: practicePosition, // Hero is at practice position
      dealer: 3, // Dealer is always at button position
      smallBlind: 1,
      bigBlind: 2,
      stage: stage,
      minRaise: 4,
      lastRaise: 4,
      isTraining: true,
      currentScenario: {
        id: scenarioId,
        type: stage,
        description: handScenario.description,
        situation: {
          position: positionCodes[practicePosition],
          stackSize: randomHeroStack,
          potOdds: Number((basePot * randomPotMultiplier / 4).toFixed(1)),
          opponents: 5,
          aggression: Math.random() > 0.5 ? 'aggressive' : 'passive'
        },
        recommendedAction: {
          action: handScenario.recommendedAction.action,
          reasoning: handScenario.recommendedAction.reasoning,
          gtoFrequency: handScenario.recommendedAction.frequency
        },
        difficulty: 'intermediate'
      },
      practicePosition: practicePosition,
      trainingProgress: {
        handsPlayed: 0,
        correctDecisions: 0,
        currentStreak: 0
      },
      actionRecorder: actionRecorder
    }
    
    // 记录游戏开始和初始状态
    actionRecorder.recordGameStart(players, gameState.pot)
    
    // 记录盲注投入（如果在翻前阶段）
    if (stage === 'preflop') {
      const sbPlayer = players[4] // 小盲位
      const bbPlayer = players[5] // 大盲位
      
      if (sbPlayer && sbPlayer.currentBet > 0) {
        actionRecorder.recordBlindPost(sbPlayer, sbPlayer.currentBet, 'small', 0, sbPlayer.currentBet)
      }
      
      if (bbPlayer && bbPlayer.currentBet > 0) {
        actionRecorder.recordBlindPost(bbPlayer, bbPlayer.currentBet, 'big', 
          sbPlayer?.currentBet || 0, (sbPlayer?.currentBet || 0) + bbPlayer.currentBet)
      }
    }
    
    return gameState
  }

  /**
   * 生成安全的默认训练场景（当主场景生成失败时使用）
   */
  private static generateSafeDefaultScenario(practicePosition: number = 3): TrainingGameState {
    console.log('🛡️ 使用安全默认场景');
    
    // 使用安全的默认牌组
    const deck = new DeckManager();
    
    // 英雄手牌: AKs (强手牌但不是最强)
    const heroCards = deck.dealHoleCards();
    
    // 翻牌圈场景
    const communityCards = deck.dealCards(3);
    
    // 为其他5个玩家发牌
    const otherPlayerCards: [Card, Card][] = [];
    for (let i = 0; i < 5; i++) {
      otherPlayerCards.push(deck.dealHoleCards());
    }
    
    // 验证无重复牌
    if (!deck.validateNoDuplicates()) {
      console.error('🚨 默认场景也有重复牌，系统严重错误');
    }
    
    const scenarioId = `safe-default-${Date.now()}`;
    const playerPositions = ['UTG', '中位', '后位', '庄位', '小盲', '大盲'];
    const positionCodes = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'] as Position[];
    const players: Player[] = [];
    
    for (let i = 0; i < 6; i++) {
      const isHero = i === practicePosition;
      const baseStack = 150 + Math.random() * 100;
      
      let playerCards: [Card, Card];
      if (isHero) {
        playerCards = heroCards;
      } else {
        const otherPlayerIndex = players.filter(p => p.id !== 'hero').length;
        playerCards = otherPlayerCards[otherPlayerIndex];
      }
      
      players.push({
        id: isHero ? 'hero' : `opponent-${i}`,
        name: isHero ? `${playerPositions[i]} (练习)` : playerPositions[i],
        stack: Number(baseStack.toFixed(1)),
        currentBet: 0,
        cards: playerCards,
        position: positionCodes[i],
        isActive: true,
        isAllIn: false,
        folded: Math.random() < 0.2 && !isHero, // 减少弃牌概率
        actions: []
      });
    }
    
    // 创建并初始化操作记录器
    const actionRecorder = new ActionRecorder();
    
    const gameState: TrainingGameState = {
      id: scenarioId,
      players,
      communityCards,
      pot: 12,
      currentPlayer: practicePosition,
      dealer: 3,
      smallBlind: 1,
      bigBlind: 2,
      stage: 'flop',
      minRaise: 4,
      lastRaise: 4,
      isTraining: true,
      currentScenario: {
        id: scenarioId,
        type: 'flop',
        description: '安全默认场景 - 翻牌圈决策',
        situation: {
          position: positionCodes[practicePosition],
          stackSize: 200,
          potOdds: 3,
          opponents: 5,
          aggression: 'passive'
        },
        recommendedAction: {
          action: 'call',
          reasoning: '安全场景，建议保守跟注',
          gtoFrequency: 65
        },
        difficulty: 'beginner'
      },
      practicePosition,
      trainingProgress: {
        handsPlayed: 0,
        correctDecisions: 0,
        currentStreak: 0
      },
      actionRecorder
    };
    
    // 记录游戏开始
    actionRecorder.recordGameStart(players, gameState.pot);
    
    return gameState;
  }

  /**
   * 专业德州扑克结算评估 - 使用边池计算系统
   * 
   * 专业规则要点：
   * 1. 多人全下时创建边池结构
   * 2. 每个边池独立评估获胜者
   * 3. 从7张牌中选择最佳5张牌组合
   * 4. 按照国际标准牌型排名比较
   * 5. 奇数筹码按位置顺序分配
   */
  private static evaluateShowdown(gameState: TrainingGameState): {
    winnerId: string
    winnerName: string
    heroResult: 'win' | 'lose' | 'tie'
    analysis: string
    sidePotResult: SidePotCalculationResult
    detailedAnalysis: ShowdownAnalysisReport
  } {
    // 获取未弃牌的玩家
    const activePlayers = gameState.players.filter(p => !p.folded && p.cards)
    
    if (activePlayers.length === 0) {
      // 异常情况，返回默认结果
      const emptySidePotResult: SidePotCalculationResult = {
        sidePots: [],
        totalPot: 0,
        distributions: [],
        analysis: '异常情况'
      };

      return {
        winnerId: 'hero',
        winnerName: '主玩家',
        heroResult: 'win',
        analysis: '异常情况：无活跃玩家',
        sidePotResult: emptySidePotResult,
        detailedAnalysis: ShowdownAnalysisReporter.generateReport(
          gameState.players, gameState.communityCards, gameState.stage, emptySidePotResult
        )
      }
    }
    
    if (activePlayers.length === 1) {
      // 只有一个玩家，直接获胜
      const winner = activePlayers[0]
      const simplePotResult: SidePotCalculationResult = {
        sidePots: [{
          id: 'main-pot',
          amount: gameState.pot,
          eligiblePlayerIds: [winner.id],
          createdByAllIn: false,
          allInAmount: 0
        }],
        totalPot: gameState.pot,
        distributions: [{
          playerId: winner.id,
          playerName: winner.name,
          amount: gameState.pot,
          potId: 'main-pot',
          handResult: {
            rank: 'high-card',
            strength: 0,
            kickers: [],
            description: '唯一未弃牌玩家'
          },
          isWinner: true,
          isTied: false
        }],
        analysis: `${winner.name}获胜（唯一未弃牌玩家），获得全部奖池 $${gameState.pot}`
      }

      return {
        winnerId: winner.id,
        winnerName: winner.name,
        heroResult: winner.id === 'hero' ? 'win' : 'lose',
        analysis: simplePotResult.analysis,
        sidePotResult: simplePotResult,
        detailedAnalysis: ShowdownAnalysisReporter.generateReport(
          gameState.players, gameState.communityCards, gameState.stage, simplePotResult
        )
      }
    }

    // 使用专业边池计算系统
    const playerBetInfo: PlayerBetInfo[] = SidePotCalculator.createPlayerBetInfo(gameState.players)
    const sidePotResult = SidePotCalculator.distributePots(
      SidePotCalculator.calculateSidePots(playerBetInfo),
      playerBetInfo,
      gameState.communityCards
    )

    // 获取分配摘要
    const summary = SidePotCalculator.getDistributionSummary(sidePotResult.distributions)
    
    // 确定英雄玩家的结果
    const heroDistributions = sidePotResult.distributions.filter(d => d.playerId === 'hero')
    const heroTotalWon = heroDistributions.reduce((sum, d) => sum + d.amount, 0)
    
    let heroResult: 'win' | 'lose' | 'tie'
    if (heroTotalWon > 0) {
      const maxWinAmount = Math.max(...sidePotResult.distributions.map(d => d.amount))
      heroResult = heroTotalWon === maxWinAmount ? (summary.isTied ? 'tie' : 'win') : 'win'
    } else {
      heroResult = 'lose'
    }

    // 生成详细分析报告
    const detailedAnalysis = ShowdownAnalysisReporter.generateReport(
      gameState.players, gameState.communityCards, gameState.stage, sidePotResult
    );

    return {
      winnerId: summary.winnerId,
      winnerName: summary.winnerName,
      heroResult,
      analysis: sidePotResult.analysis,
      sidePotResult,
      detailedAnalysis
    }
  }
  
  /**
   * 生成详细分析报告（保持与现有界面兼容）
   */
  private static generateDetailedAnalysisReport(pokerResult: PokerHandResult): ShowdownAnalysisReport {
    try {
      // 转换为现有格式，保持界面兼容性
      const handRankings = (pokerResult.handRankings || []).map(ranking => ({
        playerId: ranking.playerId || '',
        playerName: ranking.playerName || '未知玩家',
        rank: ranking.rank || 999,
        handDescription: ranking.handEvaluation?.readableDescription || 
                        ranking.handEvaluation?.handDescription || '未知牌型',
        isFolded: ranking.isFolded || false,
        finalAction: ranking.isFolded ? '弃牌' : undefined
      }))
      
      const strategicInsights = [
        {
          category: 'hand-reading' as const,
          title: '手牌强度分析',
          description: pokerResult.handAnalysis.split('\n').slice(0, 3).join(' '),
          importance: 'high' as const,
          applicability: 'general' as const
        }
      ]
      
      const learningPoints = [
        {
          concept: '德州扑克胜负判定',
          explanation: '基于7选5最佳组合的标准德州扑克规则',
          example: pokerResult.handRankings[0]?.handEvaluation.readableDescription || '示例牌型',
          difficulty: 'intermediate' as const
        }
      ]
      
      return {
        overview: {
          totalPot: pokerResult.totalPot,
          playersInvolved: pokerResult.handRankings.length,
          winnerCount: pokerResult.handRankings.filter(r => r.isWinner).length,
          handType: pokerResult.handRankings.length > 2 ? 'multiway' : 'heads-up',
          stage: 'river',
          potStructure: pokerResult.sidePotResult.sidePots.length > 1 ? 'side-pots' : 'single-pot'
        },
        playerAnalysis: [],
        handRankings,
        strategicInsights,
        learningPoints,
        mathematicalAnalysis: {
          potOddsRequired: 0,
          impliedOdds: 0,
          expectedValue: {},
          riskRewardRatio: 1.0,
          optimalPlayFrequency: {}
        },
        professionalCommentary: pokerResult.combinedAnalysis
      }
    } catch (error) {
      console.error('生成详细分析报告失败:', error)
      
      // 返回空的分析报告
      return {
        overview: {
          totalPot: pokerResult.totalPot,
          playersInvolved: 0,
          winnerCount: 0,
          handType: 'heads-up',
          stage: 'river',
          potStructure: 'single-pot'
        },
        playerAnalysis: [],
        handRankings: [],
        strategicInsights: [],
        learningPoints: [],
        mathematicalAnalysis: {
          potOddsRequired: 0,
          impliedOdds: 0,
          expectedValue: {},
          riskRewardRatio: 1.0,
          optimalPlayFrequency: {}
        },
        professionalCommentary: '分析报告生成失败'
      }
    }
  }
}

export type { TrainingGameState, TrainingScenario, GameSituation, TrainingAction }