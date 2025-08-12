import { Card, Rank, Suit, ActionType } from '@/types/poker';
import { TrainingHand, HandScore, TrainingDecision, SessionSummary, TrainingSession } from '@/types/training';
import { TrainingScenario, TrainingScenarioManager } from './training-scenarios';
import { GtoStrategyEngine } from './gto-strategy';
import { getHandCode } from './poker-utils';
import { getPositionChinese, getOpponentTypeChinese } from './translations';

export class TrainingEngine {
  private static handLibrary: Map<string, TrainingHand[]> = new Map();

  // 初始化训练引擎
  static initialize(): void {
    console.log('🔧 TrainingEngine 初始化开始...');
    try {
      GtoStrategyEngine.initialize();
      console.log('✅ GtoStrategyEngine 初始化完成');
      this.generateHandLibraries();
      console.log('✅ TrainingEngine 初始化完成');
    } catch (error) {
      console.error('❌ TrainingEngine 初始化错误:', error);
    }
  }

  // 为每个场景生成手牌库
  private static generateHandLibraries(): void {
    console.log('📚 开始生成手牌库...');
    const scenarios = TrainingScenarioManager.getAllScenarios();
    console.log(`📋 找到 ${scenarios.length} 个场景`);
    
    scenarios.forEach((scenario, index) => {
      console.log(`🎯 生成场景 ${index + 1}/${scenarios.length}: ${scenario.name}`);
      const hands = this.generateHandLibraryForScenario(scenario);
      this.handLibrary.set(scenario.id, hands);
      console.log(`✅ 场景 "${scenario.name}" 生成 ${hands.length} 个手牌`);
    });
    console.log('📚 所有手牌库生成完成');
  }

  // 为特定场景生成手牌库
  private static generateHandLibraryForScenario(scenario: TrainingScenario): TrainingHand[] {
    const hands: TrainingHand[] = [];
    const totalHands = 50; // 每个场景50个精选手牌

    // 手牌难度分布：70% 简单, 25% 中等, 5% 困难
    const difficultyDistribution = {
      easy: Math.floor(totalHands * 0.7),
      medium: Math.floor(totalHands * 0.25),
      hard: totalHands - Math.floor(totalHands * 0.7) - Math.floor(totalHands * 0.25)
    };

    // 生成不同难度的手牌
    hands.push(...this.generateHandsByDifficulty(scenario, 'easy', difficultyDistribution.easy));
    hands.push(...this.generateHandsByDifficulty(scenario, 'medium', difficultyDistribution.medium));
    hands.push(...this.generateHandsByDifficulty(scenario, 'hard', difficultyDistribution.hard));

    return this.shuffleArray(hands);
  }

  // 根据难度生成手牌
  private static generateHandsByDifficulty(
    scenario: TrainingScenario, 
    difficulty: 'easy' | 'medium' | 'hard', 
    count: number
  ): TrainingHand[] {
    console.log(`🎲 生成${difficulty}难度手牌: 需要${count}个`);
    const hands: TrainingHand[] = [];
    const usedHands = new Set<string>();
    let attempts = 0;
    const maxAttempts = count * 10; // 防止无限循环

    while (hands.length < count && attempts < maxAttempts) {
      attempts++;
      const holeCards = this.generateRandomHoleCards();
      const handCode = getHandCode(holeCards[0], holeCards[1]);
      
      if (usedHands.has(handCode)) continue;
      usedHands.add(handCode);

      try {
        const gtoRecommendation = GtoStrategyEngine.getGtoRecommendation(
          holeCards, 
          scenario.position
        );

        // 根据难度过滤手牌
        if (this.isHandSuitableForDifficulty(gtoRecommendation, difficulty)) {
        hands.push({
          id: `${scenario.id}_${handCode}_${Date.now()}_${Math.random()}`,
          holeCards,
          scenario,
          difficulty,
          learningPoint: this.getLearningPointForHand(handCode, scenario, difficulty),
          expectedAction: this.getExpectedAction(gtoRecommendation),
          gtoFrequency: {
            fold: gtoRecommendation.fold || 0,
            call: gtoRecommendation.call || 0,
            raise: gtoRecommendation.raise || 0
          },
          context: {
            position: scenario.position,
            stackSize: scenario.stackSizes.player,
            blinds: scenario.blinds,
            opponentType: this.getOpponentType(scenario)
          }
        });
        }
      } catch (error) {
        console.error(`❌ 生成手牌时出错 (${handCode}):`, error);
      }
    }

    console.log(`✅ ${difficulty}难度手牌生成完成: ${hands.length}个 (尝试${attempts}次)`);
    if (attempts >= maxAttempts) {
      console.warn(`⚠️ ${difficulty}难度手牌生成达到最大尝试次数，可能存在性能问题`);
    }

    return hands;
  }

  // 生成随机手牌
  private static generateRandomHoleCards(): [Card, Card] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    const card1: Card = {
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)]
    };
    
    let card2: Card;
    do {
      card2 = {
        suit: suits[Math.floor(Math.random() * suits.length)],
        rank: ranks[Math.floor(Math.random() * ranks.length)]
      };
    } while (card1.rank === card2.rank && card1.suit === card2.suit);

    return [card1, card2];
  }

  // 判断手牌是否适合特定难度
  private static isHandSuitableForDifficulty(gtoRec: any, difficulty: 'easy' | 'medium' | 'hard'): boolean {
    const maxFreq = Math.max(gtoRec.fold || 0, gtoRec.call || 0, gtoRec.raise || 0);
    
    switch (difficulty) {
      case 'easy':
        return maxFreq >= 80; // 明显的决策
      case 'medium':
        return maxFreq >= 60 && maxFreq < 80; // 中等强度决策
      case 'hard':
        return maxFreq < 60; // 复杂决策
      default:
        return true;
    }
  }

  // 获取预期行动
  private static getExpectedAction(gtoRec: any): ActionType {
    const fold = gtoRec.fold || 0;
    const call = gtoRec.call || 0;
    const raise = gtoRec.raise || 0;
    
    if (raise >= call && raise >= fold) return 'raise';
    if (call >= fold) return 'call';
    return 'fold';
  }

  // 获取学习要点
  private static getLearningPointForHand(
    handCode: string, 
    scenario: TrainingScenario, 
    difficulty: 'easy' | 'medium' | 'hard'
  ): string {
    const learningPoints = {
      'BTN': [
        '利用位置优势进行价值下注',
        '按钮位可以玩更宽的手牌范围',
        '观察对手防守模式调整策略'
      ],
      'SB': [
        '小盲位的困难决策',
        '位置劣势需要更强的手牌',
        '避免过度游戏边缘牌'
      ],
      'UTG': [
        '早位置需要紧手范围',
        '避免投机性手牌',
        '为后续位置留出空间'
      ]
    };

    const points = learningPoints[scenario.position as keyof typeof learningPoints] || [
      '理解位置对策略的影响',
      '掌握基本的GTO原理',
      '学会评估手牌强度'
    ];

    return points[Math.floor(Math.random() * points.length)];
  }

  // 获取对手类型
  private static getOpponentType(scenario: TrainingScenario): 'tight' | 'loose' | 'aggressive' | 'passive' {
    const types: ('tight' | 'loose' | 'aggressive' | 'passive')[] = ['tight', 'loose', 'aggressive', 'passive'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // 创建新的训练会话
  static createTrainingSession(scenario: TrainingScenario, handCount: number = 10): TrainingSession {
    const allHands = this.handLibrary.get(scenario.id) || [];
    const selectedHands = this.shuffleArray([...allHands]).slice(0, handCount);

    return {
      id: `session_${Date.now()}_${Math.random()}`,
      scenarioId: scenario.id,
      startTime: new Date(),
      currentHandIndex: 0,
      totalHands: selectedHands.length,
      hands: selectedHands,
      decisions: [],
      scores: [],
      isActive: true,
      isPaused: false
    };
  }

  // 评分单个决策
  static scoreDecision(
    hand: TrainingHand,
    decision: TrainingDecision
  ): HandScore {
    // 将action类型转换为GTO引擎接受的类型
    let gtoAction: 'fold' | 'call' | 'raise';
    switch (decision.playerAction) {
      case 'fold':
        gtoAction = 'fold';
        break;
      case 'call':
      case 'check':
        gtoAction = 'call';
        break;
      case 'raise':
      case 'bet':
      case 'all-in':
        gtoAction = 'raise';
        break;
      default:
        gtoAction = 'fold';
    }

    // 使用现有GTO引擎进行分析
    const gtoAnalysis = GtoStrategyEngine.analyzeAction(
      hand.holeCards,
      hand.context.position,
      gtoAction
    );

    // 基础分数来自GTO分析
    const baseScore = gtoAnalysis.score;

    // 速度奖励计算
    const speedBonus = this.calculateSpeedBonus(decision.responseTime);

    // 难度系数
    const difficultyMultiplier = this.getDifficultyMultiplier(hand.difficulty);

    // 最终分数
    const finalScore = Math.min(100, Math.round((baseScore + speedBonus) * difficultyMultiplier));

    // 反馈生成
    const feedback = this.generateFeedback(finalScore, gtoAnalysis, hand);

    return {
      handId: hand.id,
      baseScore,
      speedBonus,
      difficultyMultiplier,
      finalScore,
      feedback
    };
  }

  // 计算速度奖励
  private static calculateSpeedBonus(responseTime: number): number {
    if (responseTime < 3000) return 10; // < 3秒，满分奖励
    if (responseTime < 8000) return 5;  // 3-8秒，部分奖励
    return 0; // > 8秒，无奖励
  }

  // 获取难度系数
  private static getDifficultyMultiplier(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 0.8;
      case 'medium': return 1.0;
      case 'hard': return 1.2;
      default: return 1.0;
    }
  }

  // 生成反馈内容
  private static generateFeedback(
    score: number, 
    gtoAnalysis: any, 
    hand: TrainingHand
  ): HandScore['feedback'] {
    let type: 'excellent' | 'good' | 'improvement' | 'mistake';
    let title: string;
    let explanation: string;

    const handCode = getHandCode(hand.holeCards[0], hand.holeCards[1]);
    const position = getPositionChinese(hand.context.position);
    const opponentType = getOpponentTypeChinese(hand.context.opponentType);

    if (score >= 90) {
      type = 'excellent';
      title = '🎉 完美决策！';
      explanation = `你的决策完全符合GTO策略，在${position}用${handCode}的选择非常出色！`;
    } else if (score >= 75) {
      type = 'good';
      title = '👍 不错的选择！';
      explanation = `这是一个合理的决策，在${position}面对${opponentType}对手时，${handCode}的处理基本符合GTO原则。`;
    } else if (score >= 60) {
      type = 'improvement';
      title = '💡 还有改进空间';
      explanation = `在${position}用${handCode}的决策可以更加优化。面对${opponentType}对手时，考虑位置优势和筹码深度会有更好的选择。`;
    } else {
      type = 'mistake';
      title = '❌ 需要改进';
      explanation = `在${position}用${handCode}面对${opponentType}对手的决策偏离了GTO策略。让我们分析一下更好的选择。`;
    }

    // 生成详细的GTO策略分析
    const detailedGtoAnalysis = this.generateDetailedGtoAnalysis(gtoAnalysis, hand, score);

    return {
      type,
      title,
      explanation,
      gtoAnalysis: detailedGtoAnalysis
    };
  }

  // 生成详细的GTO策略分析
  private static generateDetailedGtoAnalysis(
    gtoAnalysis: any, 
    hand: TrainingHand, 
    score: number
  ): string {
    const handCode = getHandCode(hand.holeCards[0], hand.holeCards[1]);
    const position = getPositionChinese(hand.context.position);
    const opponentType = getOpponentTypeChinese(hand.context.opponentType);
    const stackSize = hand.context.stackSize;
    
    let analysis = `📊 **GTO策略分析：**\n\n`;
    
    // 1. 基础分析
    analysis += `**手牌分析：** ${handCode} 在${position}的理论处理\n`;
    
    // 2. GTO建议
    const gtoRec = gtoAnalysis.gtoRecommendation;
    if (gtoRec.raise && gtoRec.raise > 50) {
      analysis += `**GTO建议：** 加注 ${Math.round(gtoRec.raise)}% 的时候\n`;
      analysis += `**策略原因：** 这手牌在${position}有足够的价值和位置优势支持加注\n`;
    } else if (gtoRec.call && gtoRec.call > 50) {
      analysis += `**GTO建议：** 跟注 ${Math.round(gtoRec.call)}% 的时候\n`;
      analysis += `**策略原因：** 手牌有一定价值但不够强做价值加注，跟注是最优选择\n`;
    } else if (gtoRec.fold && gtoRec.fold > 50) {
      analysis += `**GTO建议：** 弃牌 ${Math.round(gtoRec.fold)}% 的时候\n`;
      analysis += `**策略原因：** 手牌在${position}没有足够的价值继续游戏\n`;
    }
    
    // 3. 位置考量
    analysis += `\n**位置因素：** `;
    if (hand.context.position === 'BTN') {
      analysis += `按钮位有最大的位置优势，可以更宽松地游戏`;
    } else if (hand.context.position === 'UTG') {
      analysis += `枪口位需要最紧的范围，只游戏最强的手牌`;
    } else if (hand.context.position === 'CO') {
      analysis += `关煞位可以考虑偷盲，但要注意按钮位的反击`;
    } else {
      analysis += `${position}需要平衡激进与保守的策略`;
    }
    
    // 4. 对手类型调整
    analysis += `\n\n**对手调整：** 面对${opponentType}对手时，`;
    if (hand.context.opponentType === 'tight') {
      analysis += `可以更多地偷盲，但要在强牌时获取价值`;
    } else if (hand.context.opponentType === 'loose') {
      analysis += `需要收紧范围，用强牌获取价值`;
    } else if (hand.context.opponentType === 'aggressive') {
      analysis += `要准备面对更多加注，调整继续范围`;
    } else {
      analysis += `可以通过加注获取更多价值`;
    }
    
    // 5. 筹码深度考量
    analysis += `\n\n**筹码深度：** ${stackSize}BB的筹码深度下，`;
    if (stackSize >= 100) {
      analysis += `有足够的筹码进行复杂的翻后游戏`;
    } else if (stackSize >= 50) {
      analysis += `需要考虑全押的威胁，调整策略`;
    } else {
      analysis += `接近推或弃的筹码深度，决策更加关键`;
    }
    
    // 6. 学习要点
    analysis += `\n\n**学习要点：**\n`;
    if (score >= 80) {
      analysis += `• 继续保持这种高质量的决策\n`;
      analysis += `• 注意在不同对手类型下的微调`;
    } else if (score >= 60) {
      analysis += `• 多考虑位置优势的利用\n`;
      analysis += `• 关注对手类型对策略的影响`;
    } else {
      analysis += `• 重新学习${position}的基础范围\n`;
      analysis += `• 理解为什么这手牌需要${gtoRec.raise ? '加注' : gtoRec.call ? '跟注' : '弃牌'}`;
    }

    return analysis;
  }

  // 生成会话总结
  static generateSessionSummary(session: TrainingSession): SessionSummary {
    const scores = session.scores;
    const averageScore = scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length;
    const totalScore = scores.reduce((sum, s) => sum + s.finalScore, 0);
    const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);

    // 表现统计
    const performance = {
      excellent: scores.filter(s => s.feedback.type === 'excellent').length,
      good: scores.filter(s => s.feedback.type === 'good').length,
      improvement: scores.filter(s => s.feedback.type === 'improvement').length,
      mistakes: scores.filter(s => s.feedback.type === 'mistake').length
    };

    // 生成建议
    const nextRecommendation = this.generateRecommendation(averageScore, performance);
    const unlockNextScenario = averageScore >= 70;

    return {
      sessionId: session.id,
      averageScore: Math.round(averageScore),
      totalScore,
      handsCompleted: scores.length,
      duration,
      performance,
      conceptMastery: {}, // 将来扩展
      achievements: this.generateAchievements(performance, averageScore),
      improvements: this.generateImprovements(performance),
      weaknesses: this.generateWeaknesses(performance),
      nextRecommendation,
      unlockNextScenario
    };
  }

  // 生成推荐建议
  private static generateRecommendation(averageScore: number, performance: any): string {
    if (averageScore >= 85) {
      return '表现优异！可以尝试更高难度的场景来挑战自己。';
    } else if (averageScore >= 70) {
      return '不错的进步！继续练习以巩固所学概念。';
    } else {
      return '继续加油！多关注GTO基础原理，特别是位置因素的影响。';
    }
  }

  // 生成成就
  private static generateAchievements(performance: any, averageScore: number): string[] {
    const achievements: string[] = [];
    
    if (performance.excellent >= 3) {
      achievements.push('🏆 连续优秀决策');
    }
    if (averageScore >= 80) {
      achievements.push('⭐ 高分完成训练');
    }
    if (performance.mistakes === 0) {
      achievements.push('💎 完美会话');
    }

    return achievements;
  }

  // 生成改进点
  private static generateImprovements(performance: any): string[] {
    const improvements: string[] = [];
    
    if (performance.excellent > performance.mistakes) {
      improvements.push('决策准确度有显著提升');
    }
    if (performance.good > 0) {
      improvements.push('对基本概念理解加深');
    }

    return improvements;
  }

  // 生成弱点
  private static generateWeaknesses(performance: any): string[] {
    const weaknesses: string[] = [];
    
    if (performance.mistakes > performance.excellent) {
      weaknesses.push('需要加强GTO基础理论学习');
    }
    if (performance.improvement > performance.good) {
      weaknesses.push('决策一致性有待提高');
    }

    return weaknesses;
  }

  // 工具函数：数组随机打乱
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 获取场景的手牌库
  static getHandLibrary(scenarioId: string): TrainingHand[] {
    return this.handLibrary.get(scenarioId) || [];
  }
}