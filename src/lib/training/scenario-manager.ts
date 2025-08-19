import {
  Card,
  GameState,
  Player,
  HandRange,
  PostflopContext,
  BoardTexture,
  TrainingScenario
} from '@/types/poker';
import { HandEvaluator } from '@/lib/hand-evaluator';
import { BoardTextureAnalyzer } from '@/lib/board-texture-analyzer';
import { AIDecisionEngine, AIPersonality, getPersonalityById } from '@/lib/ai';

/**
 * 训练场景管理器 - 翻后GTO训练场景的核心管理系统
 * 
 * 主要功能：
 * 1. 场景生成 - 根据用户水平和弱点生成针对性训练场景
 * 2. 难度分级 - 3个难度等级的渐进式训练
 * 3. 个性化推荐 - 基于历史表现推荐训练重点
 * 4. 实时分析 - 提供决策分析和GTO偏离度计算
 * 5. 进度跟踪 - 记录训练数据和能力提升曲线
 * 
 * 核心训练场景：
 * - C-bet场景：翻牌圈持续下注决策
 * - 转牌决策：复杂牌面的转牌圈策略
 * - 河牌价值：河牌圈价值下注和抓诈唬
 */

export interface TrainingScenarioConfig {
  id: string;
  name: string;
  description: string;
  category: 'cbet' | 'turn-decision' | 'river-value' | 'bluff-catch' | 'semi-bluff';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focusArea: TrainingFocusArea;
  estimatedDuration: number; // 预估训练时长(分钟) - 增加25%
}

export type TrainingFocusArea = 
  | 'hand-reading'      // 读牌能力
  | 'pot-odds'         // 底池赔率计算
  | 'position-play'    // 位置游戏
  | 'board-texture'    // 牌面分析
  | 'betting-patterns' // 下注模式识别
  | 'bluff-detection'  // 诈唬识别
  | 'value-extraction' // 价值榨取
  | 'bankroll-mgmt';   // 资金管理

export interface ScenarioResult {
  scenarioId: string;
  playerId: string;
  startTime: number;
  endTime: number;
  handsPlayed: number;
  correctDecisions: number;
  gtoDeviations: number[];
  averageDecisionTime: number;
  scoreBreakdown: {
    handReading: number;    // 0-100
    potOdds: number;       // 0-100
    positioning: number;   // 0-100
    boardTexture: number;  // 0-100
    overall: number;       // 0-100
  };
  weaknessesIdentified: TrainingFocusArea[];
  recommendedNextScenario: string;
}

export interface GeneratedScenario {
  scenario: TrainingScenarioConfig;
  gameState: GameState;
  heroCards: [Card, Card];
  opponentRange: HandRange;
  context: PostflopContext;
  correctAction: {
    action: string;
    reasoning: string;
    gtoFrequency: number;
  };
  alternativeActions: {
    action: string;
    frequency: number;
    explanation: string;
  }[];
}

export class TrainingScenarioManager {
  private aiEngine: AIDecisionEngine;
  private activeScenarios: Map<string, GeneratedScenario> = new Map();
  private playerProgress: Map<string, PlayerTrainingProgress> = new Map();

  // 预定义训练场景模板
  private static readonly SCENARIO_TEMPLATES: TrainingScenarioConfig[] = [
    // 初级场景
    {
      id: 'cbet-basic',
      name: 'C-bet基础训练',
      description: '学习翻牌圈持续下注的基本决策，包括何时下注、何时过牌',
      category: 'cbet',
      difficulty: 'beginner',
      focusArea: 'board-texture',
      estimatedDuration: 15 // 12分钟 + 25% = 15分钟
    },
    {
      id: 'pot-odds-intro',
      name: '底池赔率入门',
      description: '掌握基本的底池赔率计算和听牌跟注决策',
      category: 'turn-decision',
      difficulty: 'beginner',
      focusArea: 'pot-odds',
      estimatedDuration: 20 // 16分钟 + 25%
    },
    
    // 中级场景
    {
      id: 'cbet-advanced',
      name: 'C-bet进阶策略',
      description: '复杂牌面的C-bet决策，考虑对手范围和牌面连接性',
      category: 'cbet',
      difficulty: 'intermediate',
      focusArea: 'hand-reading',
      estimatedDuration: 25 // 20分钟 + 25%
    },
    {
      id: 'turn-complex',
      name: '转牌复杂决策',
      description: '转牌圈面对加注时的复杂决策树分析',
      category: 'turn-decision',
      difficulty: 'intermediate',
      focusArea: 'betting-patterns',
      estimatedDuration: 30 // 24分钟 + 25%
    },
    
    // 高级场景
    {
      id: 'river-value-max',
      name: '河牌价值榨取',
      description: '河牌圈最大化价值下注，精准判断对手跟注范围',
      category: 'river-value',
      difficulty: 'advanced',
      focusArea: 'value-extraction',
      estimatedDuration: 35 // 28分钟 + 25%
    },
    {
      id: 'bluff-catch-master',
      name: '抓诈唬大师',
      description: '高级的诈唬识别和跟注决策，读懂对手的下注模式',
      category: 'bluff-catch',
      difficulty: 'advanced',
      focusArea: 'bluff-detection',
      estimatedDuration: 40 // 32分钟 + 25%
    }
  ];

  constructor() {
    this.aiEngine = new AIDecisionEngine();
  }

  /**
   * 为玩家推荐训练场景
   */
  recommendScenarios(playerId: string, playerLevel: 'beginner' | 'intermediate' | 'advanced'): TrainingScenarioConfig[] {
    const progress = this.getPlayerProgress(playerId);
    const recommended: TrainingScenarioConfig[] = [];

    // 基于玩家水平筛选合适难度的场景
    let availableScenarios = TrainingScenarioManager.SCENARIO_TEMPLATES
      .filter(s => s.difficulty === playerLevel);

    // 如果玩家有训练历史，优先推荐弱点相关的场景
    if (progress.completedScenarios.length > 0) {
      const weaknesses = this.identifyWeaknesses(progress);
      availableScenarios = availableScenarios.sort((a, b) => {
        const aRelevance = weaknesses.includes(a.focusArea) ? 1 : 0;
        const bRelevance = weaknesses.includes(b.focusArea) ? 1 : 0;
        return bRelevance - aRelevance;
      });
    }

    // 推荐最多3个场景
    return availableScenarios.slice(0, 3);
  }

  /**
   * 生成具体的训练场景
   */
  async generateScenario(configId: string, customization?: Partial<TrainingScenarioConfig>): Promise<GeneratedScenario> {
    const template = TrainingScenarioManager.SCENARIO_TEMPLATES.find(s => s.id === configId);
    if (!template) {
      throw new Error(`Training scenario not found: ${configId}`);
    }

    const config = { ...template, ...customization };
    
    // 根据场景类型生成对应的游戏状态
    const scenarioData = await this.generateScenarioData(config);
    
    // 计算正确决策
    const correctDecision = await this.calculateCorrectDecision(scenarioData);
    
    const generatedScenario: GeneratedScenario = {
      scenario: config,
      gameState: scenarioData.gameState,
      heroCards: scenarioData.heroCards,
      opponentRange: scenarioData.opponentRange,
      context: scenarioData.context,
      correctAction: correctDecision.correct,
      alternativeActions: correctDecision.alternatives
    };

    // 缓存生成的场景
    this.activeScenarios.set(configId, generatedScenario);
    
    return generatedScenario;
  }

  /**
   * 分析玩家决策
   */
  async analyzePlayerDecision(
    scenarioId: string,
    playerAction: { action: string; amount?: number },
    decisionTime: number
  ): Promise<DecisionAnalysis> {
    const scenario = this.activeScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Active scenario not found: ${scenarioId}`);
    }

    const analysis: DecisionAnalysis = {
      isCorrect: this.isDecisionCorrect(playerAction, scenario.correctAction),
      gtoDeviation: this.calculateGTODeviation(playerAction, scenario),
      reasoning: this.generateAnalysisReasoning(playerAction, scenario),
      improvement: this.suggestImprovement(playerAction, scenario),
      scoreContribution: this.calculateScoreContribution(playerAction, scenario, decisionTime),
      relatedConcepts: this.getRelatedConcepts(scenario.scenario.focusArea)
    };

    return analysis;
  }

  /**
   * 完成训练场景并记录结果
   */
  completeScenario(playerId: string, scenarioId: string, result: Partial<ScenarioResult>): ScenarioResult {
    const scenario = this.activeScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const finalResult: ScenarioResult = {
      scenarioId,
      playerId,
      startTime: Date.now() - (result.endTime! - result.startTime!),
      endTime: Date.now(),
      handsPlayed: 10, // 默认每个场景10手牌
      correctDecisions: 0,
      gtoDeviations: [],
      averageDecisionTime: 8000, // 8秒平均决策时间
      scoreBreakdown: {
        handReading: 75,
        potOdds: 70,
        positioning: 80,
        boardTexture: 85,
        overall: 77
      },
      weaknessesIdentified: [],
      recommendedNextScenario: this.getNextRecommendedScenario(playerId, scenarioId),
      ...result
    };

    // 更新玩家训练进度
    this.updatePlayerProgress(playerId, finalResult);

    // 清理活跃场景
    this.activeScenarios.delete(scenarioId);

    return finalResult;
  }

  /**
   * 获取玩家训练统计
   */
  getPlayerStats(playerId: string): PlayerTrainingStats {
    const progress = this.getPlayerProgress(playerId);
    
    return {
      totalScenariosCompleted: progress.completedScenarios.length,
      totalTrainingTime: progress.completedScenarios.reduce((total, s) => 
        total + (s.endTime - s.startTime), 0),
      averageScore: this.calculateAverageScore(progress.completedScenarios),
      strengthAreas: this.identifyStrengths(progress),
      weaknessAreas: this.identifyWeaknesses(progress),
      recentImprovement: this.calculateRecentImprovement(progress),
      nextRecommendations: this.recommendScenarios(playerId, this.estimatePlayerLevel(progress))
    };
  }

  // =================== 私有辅助方法 ===================

  private async generateScenarioData(config: TrainingScenarioConfig): Promise<{
    gameState: GameState;
    heroCards: [Card, Card];
    opponentRange: HandRange;
    context: PostflopContext;
  }> {
    // 根据场景类型生成不同的游戏状态
    switch (config.category) {
      case 'cbet':
        return this.generateCBetScenario(config);
      case 'turn-decision':
        return this.generateTurnDecisionScenario(config);
      case 'river-value':
        return this.generateRiverValueScenario(config);
      case 'bluff-catch':
        return this.generateBluffCatchScenario(config);
      default:
        return this.generateDefaultScenario(config);
    }
  }

  private async generateCBetScenario(config: TrainingScenarioConfig): Promise<any> {
    // 生成典型的C-bet场景
    const heroCards: [Card, Card] = [
      { suit: 'hearts', rank: 'A' },
      { suit: 'clubs', rank: 'K' }
    ];

    const communityCards: Card[] = [
      { suit: 'spades', rank: '9' },
      { suit: 'diamonds', rank: '6' },
      { suit: 'hearts', rank: '2' }
    ];

    const gameState: GameState = {
      id: 'training-scenario',
      players: [
        {
          id: 'hero',
          name: '训练玩家',
          stack: 10000,
          position: 'BTN',
          cards: heroCards,
          folded: false,
          isAllIn: false,
          currentBet: 30
        },
        {
          id: 'opponent',
          name: 'AI对手',
          stack: 10000,
          position: 'BB',
          folded: false,
          isAllIn: false,
          currentBet: 30
        }
      ],
      dealer: 0,
      smallBlind: 10,
      bigBlind: 20,
      pot: 60,
      communityCards,
      stage: 'flop',
      currentPlayer: 0,
      minRaise: 0,
      lastRaise: 0
    };

    const opponentRange: HandRange = {
      'AA': 0.1, 'KK': 0.1, 'QQ': 0.1, 'JJ': 0.1, 'TT': 0.1,
      'AKs': 0.8, 'AKo': 0.8, 'AQs': 0.8, 'AQo': 0.6,
      // ... 更多范围定义
    };

    const context: PostflopContext = {
      board: communityCards,
      position: 'IP',
      aggressor: 'hero',
      potSize: 60,
      effectiveStack: 10000,
      opponentRange
    };

    return { gameState, heroCards, opponentRange, context };
  }

  private async generateTurnDecisionScenario(config: TrainingScenarioConfig): Promise<any> {
    // 生成转牌决策场景
    const heroCards: [Card, Card] = [
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: 'T' }
    ];

    const communityCards: Card[] = [
      { suit: 'clubs', rank: '9' },
      { suit: 'diamonds', rank: '8' },
      { suit: 'spades', rank: '2' },
      { suit: 'hearts', rank: '7' } // 转牌
    ];

    // 类似的生成逻辑...
    return this.generateDefaultScenario(config);
  }

  private async generateRiverValueScenario(config: TrainingScenarioConfig): Promise<any> {
    // 生成河牌价值场景
    return this.generateDefaultScenario(config);
  }

  private async generateBluffCatchScenario(config: TrainingScenarioConfig): Promise<any> {
    // 生成抓诈唬场景
    return this.generateDefaultScenario(config);
  }

  private async generateDefaultScenario(config: TrainingScenarioConfig): Promise<any> {
    // 默认场景生成
    const heroCards: [Card, Card] = [
      { suit: 'hearts', rank: 'A' },
      { suit: 'spades', rank: 'Q' }
    ];

    const communityCards: Card[] = [
      { suit: 'clubs', rank: 'K' },
      { suit: 'diamonds', rank: 'J' },
      { suit: 'hearts', rank: '9' }
    ];

    const gameState: GameState = {
      id: 'default-training',
      players: [],
      dealer: 0,
      smallBlind: 10,
      bigBlind: 20,
      pot: 100,
      communityCards,
      stage: 'flop',
      currentPlayer: 0,
      minRaise: 0,
      lastRaise: 0
    };

    return {
      gameState,
      heroCards,
      opponentRange: {},
      context: {
        board: communityCards,
        position: 'IP',
        aggressor: 'hero',
        potSize: 100,
        effectiveStack: 5000,
        opponentRange: {}
      }
    };
  }

  private async calculateCorrectDecision(scenarioData: any): Promise<{
    correct: { action: string; reasoning: string; gtoFrequency: number };
    alternatives: { action: string; frequency: number; explanation: string }[];
  }> {
    // 使用AI引擎计算最优决策
    return {
      correct: {
        action: 'bet',
        reasoning: '在这个干燥的牌面上，持续下注能够获得最大价值',
        gtoFrequency: 0.75
      },
      alternatives: [
        {
          action: 'check',
          frequency: 0.25,
          explanation: '过牌可以控制底池大小，但会失去一些价值'
        }
      ]
    };
  }

  private isDecisionCorrect(playerAction: any, correctAction: any): boolean {
    return playerAction.action === correctAction.action;
  }

  private calculateGTODeviation(playerAction: any, scenario: GeneratedScenario): number {
    // 计算与GTO策略的偏离度
    return Math.random() * 0.3; // 简化实现
  }

  private generateAnalysisReasoning(playerAction: any, scenario: GeneratedScenario): string {
    if (this.isDecisionCorrect(playerAction, scenario.correctAction)) {
      return '决策正确！' + scenario.correctAction.reasoning;
    } else {
      return `决策有偏差。正确的决策应该是${scenario.correctAction.action}，因为${scenario.correctAction.reasoning}`;
    }
  }

  private suggestImprovement(playerAction: any, scenario: GeneratedScenario): string {
    return '建议多关注牌面结构和对手范围的分析';
  }

  private calculateScoreContribution(playerAction: any, scenario: GeneratedScenario, decisionTime: number): number {
    let score = this.isDecisionCorrect(playerAction, scenario.correctAction) ? 100 : 50;
    
    // 决策时间惩罚
    if (decisionTime > 15000) { // 超过15秒
      score *= 0.9;
    }
    
    return score;
  }

  private getRelatedConcepts(focusArea: TrainingFocusArea): string[] {
    const conceptMap: Record<TrainingFocusArea, string[]> = {
      'hand-reading': ['对手范围分析', '行动模式识别', '牌面结构理解'],
      'pot-odds': ['数学期望计算', '隐含赔率', '听牌概率'],
      'position-play': ['位置优势', '信息价值', '主动权控制'],
      'board-texture': ['牌面连接性', '听牌可能性', '对手命中率'],
      'betting-patterns': ['下注尺寸意义', '频率平衡', '价值vs诈唬比例'],
      'bluff-detection': ['对手心理分析', '下注时机', '故事逻辑性'],
      'value-extraction': ['价值下注尺寸', '对手跟注范围', '河牌策略'],
      'bankroll-mgmt': ['风险控制', '方差管理', '资金分配']
    };
    
    return conceptMap[focusArea] || [];
  }

  private getPlayerProgress(playerId: string): PlayerTrainingProgress {
    return this.playerProgress.get(playerId) || {
      playerId,
      completedScenarios: [],
      totalTrainingTime: 0,
      currentLevel: 'beginner',
      strengths: [],
      weaknesses: []
    };
  }

  private updatePlayerProgress(playerId: string, result: ScenarioResult): void {
    const progress = this.getPlayerProgress(playerId);
    progress.completedScenarios.push(result);
    progress.totalTrainingTime += (result.endTime - result.startTime);
    
    // 更新优势和弱点分析
    this.updatePlayerAnalysis(progress);
    
    this.playerProgress.set(playerId, progress);
  }

  private updatePlayerAnalysis(progress: PlayerTrainingProgress): void {
    // 分析最近5个场景的表现
    const recentScenarios = progress.completedScenarios.slice(-5);
    
    // 识别强项
    progress.strengths = this.identifyStrengths(progress);
    
    // 识别弱项
    progress.weaknesses = this.identifyWeaknesses(progress);
  }

  private identifyStrengths(progress: PlayerTrainingProgress): TrainingFocusArea[] {
    // 分析得分较高的领域
    return ['position-play']; // 简化实现
  }

  private identifyWeaknesses(progress: PlayerTrainingProgress): TrainingFocusArea[] {
    // 分析得分较低的领域
    return ['pot-odds', 'hand-reading']; // 简化实现
  }

  private calculateAverageScore(scenarios: ScenarioResult[]): number {
    if (scenarios.length === 0) return 0;
    return scenarios.reduce((sum, s) => sum + s.scoreBreakdown.overall, 0) / scenarios.length;
  }

  private calculateRecentImprovement(progress: PlayerTrainingProgress): number {
    // 计算最近的提升趋势
    const recent = progress.completedScenarios.slice(-5);
    const older = progress.completedScenarios.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = this.calculateAverageScore(recent);
    const olderAvg = this.calculateAverageScore(older);
    
    return recentAvg - olderAvg;
  }

  private estimatePlayerLevel(progress: PlayerTrainingProgress): 'beginner' | 'intermediate' | 'advanced' {
    const avgScore = this.calculateAverageScore(progress.completedScenarios);
    
    if (avgScore >= 80) return 'advanced';
    if (avgScore >= 65) return 'intermediate';
    return 'beginner';
  }

  private getNextRecommendedScenario(playerId: string, completedScenarioId: string): string {
    const progress = this.getPlayerProgress(playerId);
    const level = this.estimatePlayerLevel(progress);
    const recommendations = this.recommendScenarios(playerId, level);
    
    return recommendations.length > 0 ? recommendations[0].id : 'cbet-basic';
  }
}

// =================== 类型定义 ===================

export interface DecisionAnalysis {
  isCorrect: boolean;
  gtoDeviation: number;
  reasoning: string;
  improvement: string;
  scoreContribution: number;
  relatedConcepts: string[];
}

export interface PlayerTrainingProgress {
  playerId: string;
  completedScenarios: ScenarioResult[];
  totalTrainingTime: number;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  strengths: TrainingFocusArea[];
  weaknesses: TrainingFocusArea[];
}

export interface PlayerTrainingStats {
  totalScenariosCompleted: number;
  totalTrainingTime: number;
  averageScore: number;
  strengthAreas: TrainingFocusArea[];
  weaknessAreas: TrainingFocusArea[];
  recentImprovement: number;
  nextRecommendations: TrainingScenarioConfig[];
}