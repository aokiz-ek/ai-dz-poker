import { Card, Player, GameStage, HandStrengthResult } from '@/types/poker';
import { HandEvaluator } from '@/lib/hand-evaluator';
import { ProfessionalHandAnalyzer } from '@/lib/professional-hand-analyzer';
import { SidePotCalculationResult, PotDistribution } from '@/lib/side-pot-calculator';

/**
 * 详细摊牌分析结果
 */
export interface ShowdownAnalysisReport {
  overview: ShowdownOverview;
  playerAnalysis: PlayerShowdownAnalysis[];
  handRankings: HandRankingAnalysis[];
  strategicInsights: StrategyInsight[];
  learningPoints: LearningPoint[];
  mathematicalAnalysis: MathematicalAnalysis;
  professionalCommentary: string;
}

/**
 * 摊牌概览
 */
export interface ShowdownOverview {
  totalPot: number;
  playersInvolved: number;
  winnerCount: number;
  handType: 'heads-up' | 'multiway';
  stage: GameStage;
  potStructure: 'single-pot' | 'side-pots';
}

/**
 * 玩家摊牌分析
 */
export interface PlayerShowdownAnalysis {
  playerId: string;
  playerName: string;
  position: string;
  holeCards: [Card, Card];
  bestHand: HandStrengthResult;
  handCategory: 'nuts' | 'strong' | 'medium' | 'weak' | 'bluff';
  playedCorrectly: boolean;
  alternativeActions: string[];
  winAmount: number;
  handOdds: number; // 这手牌获胜的概率
}

/**
 * 手牌排名分析
 */
export interface HandRankingAnalysis {
  rank: number;
  playerId: string;
  playerName: string;
  handDescription: string;
  strength: number;
  beatsByType: string; // 被什么类型的牌击败
  beatsType: string; // 击败什么类型的牌
}

/**
 * 策略洞察
 */
export interface StrategyInsight {
  category: 'betting' | 'position' | 'hand-reading' | 'pot-odds' | 'bluffing';
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  applicability: 'general' | 'situational';
}

/**
 * 学习要点
 */
export interface LearningPoint {
  concept: string;
  explanation: string;
  example: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * 数学分析
 */
export interface MathematicalAnalysis {
  potOddsRequired: number;
  impliedOdds: number;
  expectedValue: Record<string, number>; // 每个玩家的期望值
  riskRewardRatio: number;
  optimalPlayFrequency: Record<string, number>; // 最优游戏频率
}

/**
 * 专业摊牌分析报告生成器
 * 
 * 提供详细的德州扑克教学分析，包括：
 * 1. 手牌强度对比
 * 2. 策略分析和建议
 * 3. 数学期望计算
 * 4. 专业解说和学习要点
 */
export class ShowdownAnalysisReporter {

  /**
   * 生成完整的摊牌分析报告
   */
  static generateReport(
    players: Player[],
    communityCards: Card[],
    stage: GameStage,
    sidePotResult: SidePotCalculationResult
  ): ShowdownAnalysisReport {
    
    // 1. 基础概览
    const overview = this.generateOverview(players, sidePotResult, stage);
    
    // 2. 玩家分析
    const playerAnalysis = this.analyzePlayersInShowdown(players, communityCards, sidePotResult);
    
    // 3. 手牌排名
    const handRankings = this.generateHandRankings(playerAnalysis);
    
    // 4. 策略洞察
    const strategicInsights = this.generateStrategicInsights(playerAnalysis, stage);
    
    // 5. 学习要点
    const learningPoints = this.generateLearningPoints(playerAnalysis, handRankings);
    
    // 6. 数学分析
    const mathematicalAnalysis = this.generateMathematicalAnalysis(
      players, playerAnalysis, sidePotResult.totalPot
    );
    
    // 7. 专业解说
    const professionalCommentary = this.generateProfessionalCommentary(
      overview, playerAnalysis, handRankings, strategicInsights
    );

    return {
      overview,
      playerAnalysis,
      handRankings,
      strategicInsights,
      learningPoints,
      mathematicalAnalysis,
      professionalCommentary
    };
  }

  /**
   * 生成摊牌概览
   */
  private static generateOverview(
    players: Player[], 
    sidePotResult: SidePotCalculationResult, 
    stage: GameStage
  ): ShowdownOverview {
    const activePlayers = players.filter(p => !p.folded && p.cards);
    const winners = sidePotResult.distributions.filter(d => d.amount > 0);

    return {
      totalPot: sidePotResult.totalPot,
      playersInvolved: activePlayers.length,
      winnerCount: winners.length,
      handType: activePlayers.length === 2 ? 'heads-up' : 'multiway',
      stage,
      potStructure: sidePotResult.sidePots.length > 1 ? 'side-pots' : 'single-pot'
    };
  }

  /**
   * 分析摊牌中的每个玩家
   */
  private static analyzePlayersInShowdown(
    players: Player[],
    communityCards: Card[],
    sidePotResult: SidePotCalculationResult
  ): PlayerShowdownAnalysis[] {
    const activePlayers = players.filter(p => !p.folded && p.cards);
    
    return activePlayers.map(player => {
      const holeCards = player.cards as [Card, Card];
      const bestHand = HandEvaluator.evaluateBestHand(holeCards, communityCards);
      
      // 找到该玩家的获奖信息
      const playerDistribution = sidePotResult.distributions
        .filter(d => d.playerId === player.id)
        .reduce((sum, d) => sum + d.amount, 0);
      
      // 计算手牌类别
      const handCategory = this.categorizeShowdownHand(bestHand, activePlayers.length);
      
      // 分析是否打得正确
      const playedCorrectly = this.analyzePlayCorrectness(player, bestHand, sidePotResult);
      
      // 计算获胜概率
      const handOdds = this.calculateHandOdds(bestHand, activePlayers.length);

      return {
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        holeCards,
        bestHand,
        handCategory,
        playedCorrectly,
        alternativeActions: this.suggestAlternativeActions(player, bestHand),
        winAmount: playerDistribution,
        handOdds
      };
    });
  }

  /**
   * 生成手牌排名分析
   */
  private static generateHandRankings(playerAnalysis: PlayerShowdownAnalysis[]): HandRankingAnalysis[] {
    // 按手牌强度排序
    const sortedPlayers = [...playerAnalysis].sort((a, b) => b.bestHand.strength - a.bestHand.strength);
    
    return sortedPlayers.map((analysis, index) => {
      const rank = index + 1;
      const nextPlayer = sortedPlayers[index + 1];
      const prevPlayer = sortedPlayers[index - 1];
      
      let beatsByType = '';
      let beatsType = '';
      
      if (prevPlayer) {
        beatsByType = `被${prevPlayer.bestHand.description}击败`;
      }
      
      if (nextPlayer) {
        beatsType = `击败${nextPlayer.bestHand.description}`;
      }

      return {
        rank,
        playerId: analysis.playerId,
        playerName: analysis.playerName,
        handDescription: analysis.bestHand.description,
        strength: analysis.bestHand.strength,
        beatsByType: beatsByType || '最强牌型',
        beatsType: beatsType || '击败所有其他牌型'
      };
    });
  }

  /**
   * 生成策略洞察
   */
  private static generateStrategicInsights(
    playerAnalysis: PlayerShowdownAnalysis[],
    stage: GameStage
  ): StrategyInsight[] {
    const insights: StrategyInsight[] = [];
    
    // 分析位置优势
    const latePositionWinners = playerAnalysis.filter(p => 
      p.winAmount > 0 && ['CO', 'BTN'].includes(p.position)
    );
    
    if (latePositionWinners.length > 0) {
      insights.push({
        category: 'position',
        title: '位置优势的体现',
        description: '后位玩家能够看到前面玩家的动作，做出更明智的决策',
        importance: 'high',
        applicability: 'general'
      });
    }
    
    // 分析手牌实现
    const nutsWinners = playerAnalysis.filter(p => p.handCategory === 'nuts' && p.winAmount > 0);
    if (nutsWinners.length > 0) {
      insights.push({
        category: 'betting',
        title: '坚果牌的价值最大化',
        description: '当你拿到最强牌时，应该通过下注和加注来最大化价值',
        importance: 'high',
        applicability: 'situational'
      });
    }
    
    // 分析诈唬成功/失败
    const bluffAttempts = playerAnalysis.filter(p => p.handCategory === 'bluff');
    if (bluffAttempts.length > 0) {
      const successfulBluffs = bluffAttempts.filter(p => p.winAmount > 0);
      insights.push({
        category: 'bluffing',
        title: successfulBluffs.length > 0 ? '诈唬的时机选择' : '诈唬的风险管理',
        description: successfulBluffs.length > 0 
          ? '成功的诈唬需要正确的时机和对手分析'
          : '诈唬失败的成本需要仔细计算，确保风险可控',
        importance: 'medium',
        applicability: 'situational'
      });
    }

    return insights;
  }

  /**
   * 生成学习要点
   */
  private static generateLearningPoints(
    playerAnalysis: PlayerShowdownAnalysis[],
    handRankings: HandRankingAnalysis[]
  ): LearningPoint[] {
    const points: LearningPoint[] = [];
    
    // 基础：手牌强度认知
    points.push({
      concept: '手牌强度评估',
      explanation: '准确评估自己手牌的相对强度是德州扑克的基本技能',
      example: `最强牌型: ${handRankings[0]?.handDescription}, 击败了所有其他组合`,
      difficulty: 'beginner'
    });
    
    // 中级：位置的重要性
    const positionAdvantage = playerAnalysis.some(p => 
      ['CO', 'BTN'].includes(p.position) && p.playedCorrectly
    );
    
    if (positionAdvantage) {
      points.push({
        concept: '位置优势利用',
        explanation: '后位玩家能够获得更多信息，从而做出更优的决策',
        example: '后位玩家可以看到前面玩家的行动后再决定自己的策略',
        difficulty: 'intermediate'
      });
    }
    
    // 高级：期望值计算
    const complexDecisions = playerAnalysis.filter(p => !p.playedCorrectly);
    if (complexDecisions.length > 0) {
      points.push({
        concept: '期望值决策',
        explanation: '在复杂情况下，需要计算各种行动的数学期望值',
        example: '即使手牌较弱，如果赔率合适也可能是正确的跟注',
        difficulty: 'advanced'
      });
    }

    return points;
  }

  /**
   * 生成数学分析
   */
  private static generateMathematicalAnalysis(
    players: Player[],
    playerAnalysis: PlayerShowdownAnalysis[],
    totalPot: number
  ): MathematicalAnalysis {
    const activePlayers = players.filter(p => !p.folded);
    
    // 计算每个玩家的期望值
    const expectedValue: Record<string, number> = {};
    playerAnalysis.forEach(analysis => {
      const investedAmount = analysis.playerId === 'hero' ? 0 : 100; // 简化假设
      expectedValue[analysis.playerId] = analysis.winAmount - investedAmount;
    });
    
    // 计算最优游戏频率
    const optimalPlayFrequency: Record<string, number> = {};
    playerAnalysis.forEach(analysis => {
      optimalPlayFrequency[analysis.playerId] = analysis.handOdds;
    });

    return {
      potOddsRequired: totalPot > 0 ? (totalPot * 0.3) / totalPot * 100 : 0,
      impliedOdds: totalPot * 1.5, // 简化计算
      expectedValue,
      riskRewardRatio: totalPot > 100 ? totalPot / 100 : 1,
      optimalPlayFrequency
    };
  }

  /**
   * 生成专业解说
   */
  private static generateProfessionalCommentary(
    overview: ShowdownOverview,
    playerAnalysis: PlayerShowdownAnalysis[],
    handRankings: HandRankingAnalysis[],
    strategicInsights: StrategyInsight[]
  ): string {
    const commentary: string[] = [];
    
    commentary.push('🎯 专业摊牌分析报告');
    commentary.push('');
    
    // 概况描述
    const handTypeDesc = overview.handType === 'heads-up' ? '单挑' : '多人';
    commentary.push(`这是一个${handTypeDesc}摊牌，涉及${overview.playersInvolved}名玩家，争夺$${overview.totalPot}的奖池。`);
    
    if (overview.potStructure === 'side-pots') {
      commentary.push('由于存在全下情况，形成了复杂的边池结构。');
    }
    
    commentary.push('');
    
    // 获胜者分析
    const winner = handRankings[0];
    const winnerAnalysis = playerAnalysis.find(p => p.playerId === winner.playerId);
    
    commentary.push(`🏆 ${winner.playerName}以${winner.handDescription}获得胜利。`);
    
    if (winnerAnalysis) {
      const winProbability = winnerAnalysis.handOdds;
      commentary.push(`获胜概率约为${winProbability.toFixed(1)}%，${winProbability >= 70 ? '是预期中的结果' : '存在一定运气成分'}。`);
    }
    
    commentary.push('');
    
    // 策略要点
    if (strategicInsights.length > 0) {
      commentary.push('📚 关键策略要点：');
      strategicInsights.slice(0, 2).forEach((insight, index) => {
        commentary.push(`${index + 1}. ${insight.title}: ${insight.description}`);
      });
      commentary.push('');
    }
    
    // 学习建议
    const incorrectPlays = playerAnalysis.filter(p => !p.playedCorrectly);
    if (incorrectPlays.length > 0) {
      commentary.push('💡 改进建议：');
      incorrectPlays.forEach(player => {
        commentary.push(`• ${player.playerName}: 考虑${player.alternativeActions.join('或')}`);
      });
      commentary.push('');
    }
    
    // 结语
    commentary.push('这个牌局展示了德州扑克中手牌强度、位置、时机的重要性。');
    commentary.push('通过分析这样的实战案例，可以提升对游戏的理解和决策能力。');
    
    return commentary.join('\n');
  }

  // 辅助方法
  private static categorizeShowdownHand(
    handResult: HandStrengthResult, 
    playerCount: number
  ): 'nuts' | 'strong' | 'medium' | 'weak' | 'bluff' {
    if (['royal-flush', 'straight-flush'].includes(handResult.rank)) return 'nuts';
    if (['four-of-a-kind', 'full-house'].includes(handResult.rank)) return 'strong';
    if (['flush', 'straight', 'three-of-a-kind'].includes(handResult.rank)) return 'medium';
    if (['two-pair', 'pair'].includes(handResult.rank)) return 'weak';
    return 'bluff';
  }

  private static analyzePlayCorrectness(
    player: Player, 
    handResult: HandStrengthResult, 
    sidePotResult: SidePotCalculationResult
  ): boolean {
    // 简化分析：如果获得奖励且手牌不是垃圾牌，认为打得正确
    const wonMoney = sidePotResult.distributions
      .filter(d => d.playerId === player.id)
      .reduce((sum, d) => sum + d.amount, 0) > 0;
    
    const decentHand = !['high-card'].includes(handResult.rank);
    
    return wonMoney || decentHand;
  }

  private static suggestAlternativeActions(player: Player, handResult: HandStrengthResult): string[] {
    const suggestions: string[] = [];
    
    if (['high-card', 'pair'].includes(handResult.rank)) {
      suggestions.push('更早弃牌以减少损失');
      suggestions.push('控制下注大小');
    } else if (['flush', 'full-house'].includes(handResult.rank)) {
      suggestions.push('更激进的价值下注');
      suggestions.push('建造更大的底池');
    }
    
    return suggestions.length > 0 ? suggestions : ['当前策略合理'];
  }

  private static calculateHandOdds(handResult: HandStrengthResult, playerCount: number): number {
    // 简化的获胜概率计算
    let baseOdds = 0;
    
    switch (handResult.rank) {
      case 'royal-flush': baseOdds = 99; break;
      case 'straight-flush': baseOdds = 95; break;
      case 'four-of-a-kind': baseOdds = 90; break;
      case 'full-house': baseOdds = 80; break;
      case 'flush': baseOdds = 70; break;
      case 'straight': baseOdds = 65; break;
      case 'three-of-a-kind': baseOdds = 55; break;
      case 'two-pair': baseOdds = 40; break;
      case 'pair': baseOdds = 25; break;
      default: baseOdds = 10; break;
    }
    
    // 根据玩家数量调整
    const adjustment = Math.pow(0.85, playerCount - 2);
    return Math.round(baseOdds * adjustment);
  }

  /**
   * 快速生成简化报告（用于实时显示）
   */
  static generateQuickReport(
    players: Player[],
    communityCards: Card[],
    sidePotResult: SidePotCalculationResult
  ): {
    winnerSummary: string;
    keyInsight: string;
    handComparison: string;
  } {
    const activePlayers = players.filter(p => !p.folded && p.cards);
    const playerAnalysis = this.analyzePlayersInShowdown(players, communityCards, sidePotResult);
    const handRankings = this.generateHandRankings(playerAnalysis);
    
    const winner = handRankings[0];
    const runnerUp = handRankings[1];
    
    return {
      winnerSummary: `${winner.playerName} 以 ${winner.handDescription} 获胜`,
      keyInsight: activePlayers.length > 2 
        ? `多人摊牌中，${winner.handDescription} 展现了强大的牌力`
        : `单挑中，${winner.handDescription} 击败了 ${runnerUp?.handDescription || '对手'}`,
      handComparison: runnerUp 
        ? `获胜牌型强度: ${winner.strength} vs ${runnerUp.strength}`
        : `绝对优势获胜，强度: ${winner.strength}`
    };
  }
}