import { GameState, Player, ActionType, Card } from '@/types/poker'
import { stringToCard } from '@/lib/poker-utils'

interface TrainingGameState extends GameState {
  isTraining: boolean
  currentScenario: TrainingScenario
  practicePosition: number // Index of the position being practiced (0-5)
  trainingProgress: {
    handsPlayed: number
    correctDecisions: number
    currentStreak: number
  }
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
  winner: string
  winAmount: number
  showdown: boolean
  heroResult: 'win' | 'lose' | 'tie'
  analysis: string
}

export class TrainingGameEngine {
  private static readonly AI_ACTION_DELAY = 1500 // 1.5s delay for AI actions
  private static readonly NEXT_STREET_DELAY = 2000 // 2s delay for next street
  private static lastGeneratedScenarios: string[] = [] // 防重复机制

  // 完整的52张牌池
  private static readonly SUITS = ['h', 'd', 'c', 's'] // 红桃、方块、梅花、黑桃
  private static readonly RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

  /**
   * 生成完整的52张牌
   */
  private static generateDeck(): string[] {
    const deck: string[] = []
    for (const rank of this.RANKS) {
      for (const suit of this.SUITS) {
        deck.push(rank + suit)
      }
    }
    return deck
  }

  /**
   * Fisher-Yates 洗牌算法
   */
  private static shuffleDeck(deck: string[]): string[] {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
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
    const deck = this.shuffleDeck(this.generateDeck())
    
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
        reasoning: '中等牌力需要控制底池大小',
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
    let cardIndex = 0

    // 先生成英雄手牌
    heroCards = [deck[cardIndex++], deck[cardIndex++]]

    // 根据选中的场景类型生成对应的公共牌
    switch (selectedScenario.type) {
      case 'premium_hand':
        communityCards = this.generatePremiumHandBoard(heroCards, deck, cardIndex)
        break
      case 'strong_hand':
        communityCards = this.generateStrongHandBoard(heroCards, deck, cardIndex)
        break
      case 'medium_hand':
        communityCards = this.generateMediumHandBoard(heroCards, deck, cardIndex)
        break
      case 'draw_hand':
        communityCards = this.generateDrawHandBoard(heroCards, deck, cardIndex)
        break
      case 'marginal_hand':
        communityCards = this.generateMarginalHandBoard(heroCards, deck, cardIndex)
        break
      default: // weak_hand
        communityCards = this.generateWeakHandBoard(heroCards, deck, cardIndex)
        break
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
        if (rank === 'T') return 10
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
        else if (value === 10) rank = 'T'
        
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
    if (rank === 'T') return 10
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
    const deck = this.shuffleDeck(this.generateDeck())
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

    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

    return {
      heroCards,
      communityCards,
      description,
      recommendedAction: { action, reasoning, frequency }
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
    const deck = this.shuffleDeck(this.generateDeck())
    const isDeepStack = Math.random() < 0.5
    
    const heroCards = [deck[0], deck[1]]
    const communityCardsCount = 3 + Math.floor(Math.random() * 3)
    const communityCards = deck.slice(2, 2 + communityCardsCount)

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
      }
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
      }
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
   * 多人底池训练 - 3+人参与的复杂决策
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
      description: `${playerCount}人底池 - 多人复杂决策`,
      recommendedAction: {
        action: Math.random() < 0.6 ? 'call' : Math.random() < 0.8 ? 'fold' : 'raise',
        reasoning: '多人底池需要更强的牌力才能激进',
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
    
    // 1. Update game state with player action
    let updatedGameState = this.updatePlayerAction(gameState, 'hero', actionType, amount)
    
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
      return {
        gameState: updatedGameState,
        isHandComplete: true,
        handResult: {
          winner: 'opponents',
          winAmount: updatedGameState.pot,
          showdown: false,
          heroResult: 'lose',
          analysis: '弃牌结束手牌'
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
    newState.communityCards = ['Ad', 'Kd', '7c'].map(cardString => stringToCard(cardString)) // Fixed for training scenario
    newState.currentPlayer = 1 // Small blind acts first post-flop
    
    // Reset betting
    newState.players.forEach(p => p.currentBet = 0)

    return {
      gameState: newState,
      isHandComplete: false,
      nextAction: 'wait_for_player',
      message: '翻牌圈开始'
    }
  }

  /**
   * Deal turn card
   */
  private static dealTurn(gameState: TrainingGameState): GameProgressResult {
    const newState = { ...gameState }
    newState.stage = 'turn'
    newState.communityCards = [...gameState.communityCards, stringToCard('5h')]
    newState.currentPlayer = 1

    newState.players.forEach(p => p.currentBet = 0)

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
    newState.communityCards = [...gameState.communityCards, stringToCard('2s')]
    newState.currentPlayer = 1

    newState.players.forEach(p => p.currentBet = 0)

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
        handResult = {
          winner: 'hero',
          winAmount: gameState.pot,
          showdown: false,
          heroResult: 'win',
          analysis: '对手弃牌，你赢得底池'
        }
        break
      case 'opponents':
        handResult = {
          winner: 'opponents',
          winAmount: gameState.pot,
          showdown: false,
          heroResult: 'lose',
          analysis: '你弃牌，对手赢得底池'
        }
        break
      case 'showdown':
        // Simplified showdown - random result
        const heroWins = Math.random() > 0.5
        handResult = {
          winner: heroWins ? 'hero' : 'opponents',
          winAmount: gameState.pot,
          showdown: true,
          heroResult: heroWins ? 'win' : 'lose',
          analysis: heroWins ? '摊牌获胜！' : '摊牌失败'
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
   * Get AI action (simplified decision making)
   */
  private static getAIAction(player: Player, gameState: TrainingGameState): { type: ActionType, amount?: number } {
    const currentBet = Math.max(...gameState.players.map(p => p.currentBet))
    const callAmount = currentBet - player.currentBet
    
    // Simplified AI logic
    const random = Math.random()
    
    if (callAmount === 0) {
      // Can check
      if (random < 0.7) return { type: 'check' }
      if (random < 0.9) return { type: 'bet', amount: gameState.minRaise }
      return { type: 'fold' }
    } else {
      // Need to call or fold
      if (random < 0.6) return { type: 'call' }
      if (random < 0.8) return { type: 'raise', amount: currentBet * 2 }
      return { type: 'fold' }
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
  private static generateRandomCards(): [Card, Card] {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
    
    // Generate first card
    const rank1 = ranks[Math.floor(Math.random() * ranks.length)]
    const suit1 = suits[Math.floor(Math.random() * suits.length)]
    
    // Generate second card (different from first)
    let rank2: typeof ranks[number]
    let suit2: typeof suits[number]
    do {
      rank2 = ranks[Math.floor(Math.random() * ranks.length)]
      suit2 = suits[Math.floor(Math.random() * suits.length)]
    } while (rank1 === rank2 && suit1 === suit2) // Avoid identical cards
    
    return [
      { rank: rank1, suit: suit1 },
      { rank: rank2, suit: suit2 }
    ]
  }

  /**
   * Generate next training scenario with specified training mode and practice position
   */
  static generateNextScenario(trainingMode: string = 'general', practicePosition: number = 3): TrainingGameState {
    // 根据训练模式生成特定的手牌场景
    const handScenario = this.generateTrainingModeScenario(trainingMode)
    
    // 生成唯一ID避免重复
    const scenarioId = `${trainingMode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    
    // 防止连续重复相同类型的场景
    if (this.lastGeneratedScenarios.length >= 3) {
      this.lastGeneratedScenarios.shift() // 移除最老的记录
    }
    this.lastGeneratedScenarios.push(handScenario.description)
    
    // 根据公共牌数量确定游戏阶段
    let stage: 'preflop' | 'flop' | 'turn' | 'river'
    if (handScenario.communityCards.length === 0) {
      stage = 'preflop'
    } else if (handScenario.communityCards.length === 3) {
      stage = 'flop' 
    } else if (handScenario.communityCards.length === 4) {
      stage = 'turn'
    } else {
      stage = 'river'
    }
    
    // 随机生成不同的筹码量和底池大小  
    const randomHeroStack = 150 + Math.random() * 100 // 150-250
    const randomOpponentStack = 180 + Math.random() * 120 // 180-300
    const basePot = stage === 'flop' ? 12 : stage === 'turn' ? 24 : stage === 'river' ? 36 : 6
    const randomPotMultiplier = 0.8 + Math.random() * 0.4 // 0.8-1.2倍
    
    // Create 6-player table with random cards
    const playerPositions = ['UTG', '中位', '后位', '庄位', '小盲', '大盲']
    const positionCodes = ['utg', 'mp', 'co', 'button', 'sb', 'bb']
    const players: Player[] = []
    
    for (let i = 0; i < 6; i++) {
      const isHero = i === practicePosition // Hero is at the practice position
      const baseStack = 150 + Math.random() * 100
      
      players.push({
        id: isHero ? 'hero' : `opponent-${i}`,
        name: isHero ? `${playerPositions[i]} (练习)` : playerPositions[i],
        stack: Number(baseStack.toFixed(1)),
        currentBet: stage === 'preflop' ? (i === 4 ? 1 : i === 5 ? 2 : 0) : 0, // SB=1, BB=2
        cards: isHero 
          ? [stringToCard(handScenario.heroCards[0]), stringToCard(handScenario.heroCards[1])] as [Card, Card]
          : this.generateRandomCards() as [Card, Card],
        position: positionCodes[i],
        isActive: true,
        isAllIn: false,
        folded: Math.random() < 0.3 && !isHero, // 30% chance opponents fold randomly
        actions: []
      })
    }

    return {
      id: scenarioId,
      players,
      communityCards: handScenario.communityCards.map(cardString => stringToCard(cardString)),
      pot: Number((basePot * randomPotMultiplier).toFixed(1)),
      currentPlayer: practicePosition, // Hero is at practice position
      dealer: 3, // Dealer is always at button position
      stage: stage,
      minRaise: 4,
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
      }
    }
  }
}

export type { TrainingGameState, TrainingScenario, GameSituation, TrainingAction }