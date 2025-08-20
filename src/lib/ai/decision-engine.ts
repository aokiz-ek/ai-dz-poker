import { 
  Card, 
  GameState, 
  Player, 
  ActionType, 
  PostflopContext, 
  HandRange,
  GtoStrategy
} from '@/types/poker';
import { HandEvaluator } from '@/lib/hand-evaluator';
import { BoardTextureAnalyzer } from '@/lib/board-texture-analyzer';

/**
 * AI决策引擎 - 基于GTO理论的扑克AI决策系统
 * 
 * 核心功能：
 * 1. GTO策略计算 - 基于数学期望的最优策略
 * 2. 对手建模 - 动态分析对手行为模式
 * 3. 位置感知 - 根据位置调整策略激进度
 * 4. 筹码深度 - 考虑有效筹码深度的决策调整
 * 5. 个性化决策 - 支持不同AI角色的决策偏好
 * 
 * 性能目标：单次决策<150ms
 */

export interface AIPersonality {
  id: string;
  name: string;
  description: string;
  
  // 基础参数 (0-100)
  aggression: number;      // 激进度 - 影响下注/加注频率
  tightness: number;       // 紧松度 - 影响参与手牌范围
  bluffFrequency: number;  // 诈唬频率 - 影响诈唬下注频率
  adaptability: number;    // 适应性 - 学习和调整速度
  
  // 街道特化参数
  preflopAggression: number;   // 翻前激进度
  postflopAggression: number;  // 翻后激进度
  riverCallDownFreq: number;   // 河牌跟注频率
  
  // 风险偏好
  riskTolerance: number;   // 风险容忍度
  variancePreference: number; // 方差偏好
}

export interface DecisionContext {
  gameState: GameState;
  heroId: string;
  opponentModel: OpponentModel;
  handRange: HandRange;
  personality: AIPersonality;
  recentHistory: RecentAction[];
}

export interface OpponentModel {
  playerId: string;
  vpip: number;         // 入池率
  pfr: number;          // 翻前加注率  
  aggFactor: number;    // 激进因子
  foldToCBet: number;   // 对C-bet弃牌率
  threeBetFreq: number; // 3-bet频率
  recentAdjustment: number; // 近期调整系数
}

export interface RecentAction {
  playerId: string;
  action: ActionType;
  amount: number;
  street: string;
  timestamp: number;
}

export interface AIDecision {
  action: ActionType;
  amount?: number;
  confidence: number;    // 决策信心度 (0-1)
  reasoning: string;     // 决策理由
  gtoDeviation: number;  // GTO偏离度 (-1到1)
  alternativeActions: {
    action: ActionType;
    amount?: number;
    probability: number;
  }[];
}

export class AIDecisionEngine {
  private decisionCache = new Map<string, { decision: AIDecision; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 1000; // 30秒缓存

  /**
   * 主决策入口 - 分析游戏状态并返回AI决策
   */
  async makeDecision(context: DecisionContext): Promise<AIDecision> {
    const startTime = Date.now();
    
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(context);
      const cached = this.getCachedDecision(cacheKey);
      if (cached) {
        return cached;
      }

      // 分析当前状态
      const analysis = await this.analyzeGameState(context);
      
      // 计算GTO基准策略
      const gtoStrategy = await this.calculateGTOStrategy(context, analysis);
      
      // 应用个性化调整
      const personalizedStrategy = this.applyPersonalityAdjustments(
        gtoStrategy, 
        context.personality,
        analysis
      );
      
      // 考虑对手模型
      const adaptedStrategy = this.adaptToOpponent(
        personalizedStrategy,
        context.opponentModel,
        analysis
      );
      
      // 选择最终行动
      const decision = this.selectFinalAction(adaptedStrategy, context, analysis);
      
      // 缓存决策
      this.cacheDecision(cacheKey, decision);
      
      const elapsedTime = Date.now() - startTime;
      console.log(`AI decision made in ${elapsedTime}ms`);
      
      return decision;
      
    } catch (error) {
      console.error('AI decision error:', error);
      return this.getEmergencyDecision(context);
    }
  }

  /**
   * 分析当前游戏状态
   */
  private async analyzeGameState(context: DecisionContext): Promise<GameStateAnalysis> {
    const { gameState, heroId } = context;
    const hero = gameState.players.find(p => p.id === heroId)!;
    
    // 手牌强度分析
    let handStrength: number = 0;
    let drawPotential: number = 0;
    let blockerEffect: number = 0;
    
    if (hero.cards && gameState.communityCards.length >= 3) {
      // 翻后分析
      const handResult = HandEvaluator.evaluateBestHand(hero.cards, gameState.communityCards);
      const boardTexture = BoardTextureAnalyzer.analyzeBoard(gameState.communityCards);
      const drawAnalysis = HandEvaluator.analyzeDraws(hero.cards, gameState.communityCards);
      const blockers = HandEvaluator.analyzeBlockers(hero.cards, gameState.communityCards);
      
      handStrength = this.normalizeHandStrength(handResult.strength);
      drawPotential = drawAnalysis.odds / 100;
      blockerEffect = Math.abs(blockers.impact);
    } else if (hero.cards) {
      // 翻前分析
      handStrength = this.evaluateHoleCards(hero.cards);
    }

    // 位置分析
    const positionStrength = this.analyzePosition(heroId, gameState);
    
    // 筹码深度分析
    const stackDepth = this.analyzeStackDepth(hero, gameState);
    
    // 底池赔率分析
    const potOdds = this.calculatePotOdds(gameState, hero);
    
    // 对手行动模式分析
    const actionPattern = this.analyzeActionPattern(context.recentHistory);

    return {
      handStrength,
      drawPotential,
      blockerEffect,
      positionStrength,
      stackDepth,
      potOdds,
      actionPattern,
      boardTexture: gameState.communityCards.length >= 3 ? 
        BoardTextureAnalyzer.analyzeBoard(gameState.communityCards) : null
    };
  }

  /**
   * 计算GTO基准策略
   */
  private async calculateGTOStrategy(
    context: DecisionContext, 
    analysis: GameStateAnalysis
  ): Promise<GtoStrategy> {
    const { gameState } = context;
    
    // 简化的GTO计算 - 实际实现会更复杂
    const handStrengthFactor = analysis.handStrength;
    const positionFactor = analysis.positionStrength;
    const potOddsFactor = analysis.potOdds;
    
    // 基础策略权重
    let foldWeight = Math.max(0, 1 - handStrengthFactor - analysis.drawPotential);
    let callWeight = handStrengthFactor * 0.6 + analysis.drawPotential * 0.4;
    let betWeight = handStrengthFactor * positionFactor;
    let raiseWeight = handStrengthFactor * positionFactor * 0.8;

    // 根据游戏阶段调整
    if (gameState.stage === 'preflop') {
      betWeight *= 0.7;  // 翻前更保守
      raiseWeight *= 0.8;
    } else if (gameState.stage === 'river') {
      callWeight *= 0.6; // 河牌更谨慎跟注
    }

    // 标准化权重
    const totalWeight = foldWeight + callWeight + betWeight + raiseWeight;
    if (totalWeight > 0) {
      foldWeight /= totalWeight;
      callWeight /= totalWeight; 
      betWeight /= totalWeight;
      raiseWeight /= totalWeight;
    }

    return {
      fold: foldWeight,
      call: callWeight,
      check: gameState.currentPlayer === 0 ? callWeight : undefined,
      bet: betWeight,
      raise: raiseWeight
    };
  }

  /**
   * 应用个性化调整
   */
  private applyPersonalityAdjustments(
    gtoStrategy: GtoStrategy,
    personality: AIPersonality,
    analysis: GameStateAnalysis
  ): GtoStrategy {
    const adjusted = { ...gtoStrategy };
    
    // 激进度调整
    const aggressionFactor = personality.aggression / 100;
    if (adjusted.bet) adjusted.bet *= (1 + aggressionFactor * 0.5);
    if (adjusted.raise) adjusted.raise *= (1 + aggressionFactor * 0.7);
    
    // 紧松度调整
    const tightnessFactor = personality.tightness / 100;
    adjusted.fold *= (1 + (1 - tightnessFactor) * 0.3);
    
    // 诈唬频率调整
    if (analysis.handStrength < 0.3) { // 弱牌时
      const bluffFactor = personality.bluffFrequency / 100;
      if (adjusted.bet) adjusted.bet *= (1 + bluffFactor * 0.4);
    }
    
    // 街道特化调整
    const streetAggression = analysis.boardTexture ? 
      personality.postflopAggression : personality.preflopAggression;
    const streetFactor = streetAggression / 100;
    
    if (adjusted.bet) adjusted.bet *= (1 + streetFactor * 0.3);
    if (adjusted.raise) adjusted.raise *= (1 + streetFactor * 0.4);

    return this.normalizeStrategy(adjusted);
  }

  /**
   * 根据对手模型调整策略
   */
  private adaptToOpponent(
    strategy: GtoStrategy,
    opponentModel: OpponentModel,
    analysis: GameStateAnalysis
  ): GtoStrategy {
    const adapted = { ...strategy };
    
    // 对抗紧手时更激进
    if (opponentModel.vpip < 15) { // 紧手
      if (adapted.bet) adapted.bet *= 1.2;
      if (adapted.raise) adapted.raise *= 1.1;
    }
    
    // 对抗松手时更保守
    if (opponentModel.vpip > 35) { // 松手
      adapted.fold *= 1.1;
      if (adapted.bet) adapted.bet *= 0.9;
    }
    
    // 对抗激进对手的调整
    if (opponentModel.aggFactor > 2.5) { // 激进对手
      if (analysis.handStrength > 0.7) {
        if (adapted.call) adapted.call *= 1.3; // 更多价值跟注
      } else {
        adapted.fold *= 1.2; // 更容易弃牌
      }
    }
    
    // 考虑对手的C-bet弃牌率
    if (opponentModel.foldToCBet > 70) { // 容易弃牌的对手
      if (adapted.bet) adapted.bet *= 1.3; // 增加诈唬下注
    }

    return this.normalizeStrategy(adapted);
  }

  /**
   * 选择最终行动
   */
  private selectFinalAction(
    strategy: GtoStrategy,
    context: DecisionContext,
    analysis: GameStateAnalysis
  ): AIDecision {
    // 获取可用行动
    const availableActions = this.getAvailableActions(context.gameState, context.heroId);
    
    // 根据策略概率选择行动
    const actionProbabilities: { action: ActionType; probability: number; amount?: number }[] = [];
    
    if (availableActions.includes('fold') && strategy.fold) {
      actionProbabilities.push({ action: 'fold', probability: strategy.fold });
    }
    
    if (availableActions.includes('check') && strategy.check) {
      actionProbabilities.push({ action: 'check', probability: strategy.check });
    }
    
    if (availableActions.includes('call') && strategy.call) {
      actionProbabilities.push({ action: 'call', probability: strategy.call });
    }
    
    if (availableActions.includes('bet') && strategy.bet) {
      const betSize = this.calculateBetSize(context, analysis);
      actionProbabilities.push({ action: 'bet', probability: strategy.bet, amount: betSize });
    }
    
    if (availableActions.includes('raise') && strategy.raise) {
      const raiseSize = this.calculateRaiseSize(context, analysis);
      actionProbabilities.push({ action: 'raise', probability: strategy.raise, amount: raiseSize });
    }

    // 选择概率最高的行动
    const selectedAction = actionProbabilities.reduce((max, current) => 
      current.probability > max.probability ? current : max
    );

    // 计算决策信心度
    const confidence = this.calculateConfidence(selectedAction.probability, analysis);
    
    // 计算GTO偏离度
    const gtoDeviation = this.calculateGTODeviation(selectedAction, strategy, context.personality);

    return {
      action: selectedAction.action,
      amount: selectedAction.amount,
      confidence,
      reasoning: this.generateReasoning(selectedAction, analysis, context.personality),
      gtoDeviation,
      alternativeActions: actionProbabilities
        .filter(a => a.action !== selectedAction.action)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 2)
    };
  }

  // =================== 辅助方法 ===================

  private normalizeHandStrength(strength: number): number {
    // 将7462级别的手牌强度标准化到0-1
    return Math.min(1, strength / 7462);
  }

  private evaluateHoleCards(cards: [Card, Card]): number {
    // 简化的翻前手牌评估
    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    
    const isPair = ranks[0] === ranks[1];
    const isSuited = suits[0] === suits[1];
    const isConnected = Math.abs(
      this.getNumericRank(ranks[0]) - this.getNumericRank(ranks[1])
    ) <= 1;
    
    let strength = 0;
    if (isPair) strength += 0.4;
    if (isSuited) strength += 0.1;
    if (isConnected) strength += 0.1;
    
    // 高牌加分
    const highCard = Math.max(this.getNumericRank(ranks[0]), this.getNumericRank(ranks[1]));
    strength += (highCard - 2) / 12 * 0.4;
    
    return Math.min(1, strength);
  }

  private getNumericRank(rank: string): number {
    const rankValues: Record<string, number> = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    };
    return rankValues[rank] || 0;
  }

  private analyzePosition(playerId: string, gameState: GameState): number {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = gameState.dealer;
    const activePlayers = gameState.players.filter(p => !p.folded).length;
    
    // 计算相对位置 (0 = 最差位置, 1 = 最佳位置)
    const relativePosition = (playerIndex - dealerIndex + activePlayers) % activePlayers;
    return relativePosition / Math.max(1, activePlayers - 1);
  }

  private analyzeStackDepth(player: Player, gameState: GameState): number {
    const effectiveStack = Math.min(player.stack, ...gameState.players.filter(p => !p.folded && p.id !== player.id).map(p => p.stack));
    const blinds = gameState.bigBlind;
    return effectiveStack / blinds; // 以大盲倍数表示
  }

  private calculatePotOdds(gameState: GameState, player: Player): number {
    const potSize = gameState.pot;
    const callAmount = gameState.minRaise - player.currentBet;
    return callAmount > 0 ? potSize / (potSize + callAmount) : 0;
  }

  private analyzeActionPattern(recentHistory: RecentAction[]): number {
    // 分析最近行动模式的激进度
    const aggressiveActions = recentHistory.filter(a => 
      a.action === 'bet' || a.action === 'raise'
    ).length;
    return aggressiveActions / Math.max(1, recentHistory.length);
  }

  private normalizeStrategy(strategy: GtoStrategy): GtoStrategy {
    const total = Object.values(strategy).reduce((sum, val) => sum + (val || 0), 0);
    if (total === 0) return strategy;
    
    const normalized = { ...strategy };
    Object.keys(normalized).forEach(key => {
      if (normalized[key as keyof GtoStrategy] !== undefined) {
        (normalized[key as keyof GtoStrategy] as number) /= total;
      }
    });
    
    return normalized;
  }

  private getAvailableActions(gameState: GameState, playerId: string): ActionType[] {
    // 简化的可用行动判断
    const actions: ActionType[] = ['fold'];
    
    if (gameState.minRaise === 0) {
      actions.push('check');
    } else {
      actions.push('call');
    }
    
    actions.push('bet', 'raise');
    return actions;
  }

  private calculateBetSize(context: DecisionContext, analysis: GameStateAnalysis): number {
    const potSize = context.gameState.pot;
    const personality = context.personality;
    
    // 基础下注尺寸
    let betSize = potSize * 0.75; // 75%底池
    
    // 根据手牌强度调整
    if (analysis.handStrength > 0.8) {
      betSize = potSize * 1.0; // 强牌大尺寸价值下注
    } else if (analysis.handStrength < 0.3) {
      betSize = potSize * 0.5; // 弱牌小尺寸诈唬
    }
    
    // 个性化调整
    betSize *= (1 + (personality.aggression - 50) / 100 * 0.3);
    
    return Math.round(betSize);
  }

  private calculateRaiseSize(context: DecisionContext, analysis: GameStateAnalysis): number {
    const currentBet = context.gameState.minRaise;
    const potSize = context.gameState.pot;
    
    // 基础加注尺寸 (2.5-3x)
    let raiseSize = currentBet * 2.8 + potSize * 0.3;
    
    // 根据位置调整
    if (analysis.positionStrength > 0.7) {
      raiseSize *= 0.9; // 好位置可以小一点
    }
    
    return Math.round(raiseSize);
  }

  private calculateConfidence(probability: number, analysis: GameStateAnalysis): number {
    // 基础信心度
    let confidence = probability;
    
    // 手牌强度影响
    if (analysis.handStrength > 0.8 || analysis.handStrength < 0.2) {
      confidence *= 1.2; // 极强或极弱牌更有信心
    }
    
    // 位置影响
    confidence *= (1 + analysis.positionStrength * 0.1);
    
    return Math.min(1, confidence);
  }

  private calculateGTODeviation(
    selectedAction: { action: ActionType; probability: number },
    gtoStrategy: GtoStrategy,
    personality: AIPersonality
  ): number {
    // Map 'all-in' action to 'raise' for GTO strategy lookup
    const actionKey = selectedAction.action === 'all-in' ? 'raise' : selectedAction.action as keyof GtoStrategy;
    const gtoProbability = gtoStrategy[actionKey] || 0;
    const actualProbability = selectedAction.probability;
    
    // 计算偏离度 (-1到1)
    const rawDeviation = (actualProbability - gtoProbability) / Math.max(gtoProbability, 0.01);
    
    // 考虑个性化因子
    const personalityFactor = (personality.adaptability / 100) * 0.5;
    
    return Math.max(-1, Math.min(1, rawDeviation * personalityFactor));
  }

  private generateReasoning(
    selectedAction: { action: ActionType; probability: number },
    analysis: GameStateAnalysis,
    personality: AIPersonality
  ): string {
    const reasons: string[] = [];
    
    // 手牌强度相关
    if (analysis.handStrength > 0.8) {
      reasons.push('持有强牌');
    } else if (analysis.handStrength < 0.3) {
      reasons.push('手牌较弱');
    }
    
    // 位置相关
    if (analysis.positionStrength > 0.7) {
      reasons.push('位置优势');
    } else if (analysis.positionStrength < 0.3) {
      reasons.push('位置劣势');
    }
    
    // 听牌相关
    if (analysis.drawPotential > 0.2) {
      reasons.push('有听牌潜力');
    }
    
    // 个性化因素
    if (personality.aggression > 75 && selectedAction.action === 'bet') {
      reasons.push('激进打法');
    } else if (personality.tightness > 75 && selectedAction.action === 'fold') {
      reasons.push('谨慎决策');
    }
    
    return reasons.length > 0 ? reasons.join('，') : '基于GTO策略';
  }

  private getEmergencyDecision(context: DecisionContext): AIDecision {
    // 紧急情况下的保守决策
    return {
      action: 'fold',
      confidence: 0.5,
      reasoning: '系统异常，采用保守策略',
      gtoDeviation: 0,
      alternativeActions: []
    };
  }

  // 缓存管理
  private generateCacheKey(context: DecisionContext): string {
    const { gameState, heroId } = context;
    const hero = gameState.players.find(p => p.id === heroId)!;
    
    return [
      gameState.stage,
      hero.cards?.map(c => `${c.rank}${c.suit}`).join('') || '',
      gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(''),
      gameState.pot,
      gameState.minRaise,
      context.personality.id
    ].join('|');
  }

  private getCachedDecision(key: string): AIDecision | null {
    const cached = this.decisionCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.decision;
    }
    return null;
  }

  private cacheDecision(key: string, decision: AIDecision): void {
    this.decisionCache.set(key, {
      decision,
      timestamp: Date.now()
    });
    
    // 清理过期缓存
    if (this.decisionCache.size > 1000) {
      const cutoff = Date.now() - this.CACHE_TTL;
      const keysToDelete: string[] = [];
      this.decisionCache.forEach((v, k) => {
        if (v.timestamp < cutoff) {
          keysToDelete.push(k);
        }
      });
      keysToDelete.forEach(k => this.decisionCache.delete(k));
    }
  }
}

// =================== 类型定义 ===================

interface GameStateAnalysis {
  handStrength: number;
  drawPotential: number;
  blockerEffect: number;
  positionStrength: number;
  stackDepth: number;
  potOdds: number;
  actionPattern: number;
  boardTexture: any | null;
}