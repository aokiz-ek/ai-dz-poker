import { HandStatistics, OpponentStats } from '@/types/hand-history';
import { TrainingScenario } from '@/lib/storage/interfaces';
import { GameStage, Position, Card } from '@/types/poker';

/**
 * 动态场景生成器
 * 基于玩家弱点和表现历史生成个性化训练场景
 */
export class DynamicScenarioGenerator {
  private readonly weaknessThreshold = 0.6; // 弱点识别阈值
  private readonly scenarioTemplates: ScenarioTemplate[];

  constructor() {
    this.scenarioTemplates = this.initializeScenarioTemplates();
  }

  // =================== 主要生成接口 ===================

  /**
   * 基于统计数据生成个性化场景
   */
  async generatePersonalizedScenarios(
    statistics: HandStatistics,
    maxScenarios: number = 5
  ): Promise<PersonalizedScenario[]> {
    // 1. 分析玩家弱点
    const weaknesses = this.analyzeWeaknesses(statistics);
    
    // 2. 选择合适的场景模板
    const selectedTemplates = this.selectTemplatesForWeaknesses(weaknesses, maxScenarios);
    
    // 3. 生成具体场景
    const scenarios: PersonalizedScenario[] = [];
    
    for (const template of selectedTemplates) {
      const scenario = await this.generateScenarioFromTemplate(template, weaknesses, statistics);
      scenarios.push(scenario);
    }

    return scenarios.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 生成特定类型的场景
   */
  async generateScenariosByType(
    scenarioType: ScenarioType,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    count: number = 3
  ): Promise<PersonalizedScenario[]> {
    const templates = this.scenarioTemplates.filter(t => 
      t.type === scenarioType && t.difficulty === difficulty
    );

    const scenarios: PersonalizedScenario[] = [];
    
    for (let i = 0; i < Math.min(count, templates.length); i++) {
      const template = templates[i];
      const scenario = await this.generateScenarioFromTemplate(template);
      scenarios.push(scenario);
    }

    return scenarios;
  }

  /**
   * 基于对手数据生成场景
   */
  async generateOpponentBasedScenarios(
    opponentStats: OpponentStats[],
    count: number = 3
  ): Promise<PersonalizedScenario[]> {
    const scenarios: PersonalizedScenario[] = [];
    
    for (const opponent of opponentStats.slice(0, count)) {
      const template = this.selectTemplateForOpponent(opponent);
      if (template) {
        const scenario = await this.generateOpponentSpecificScenario(template, opponent);
        scenarios.push(scenario);
      }
    }

    return scenarios;
  }

  // =================== 弱点分析 ===================

  private analyzeWeaknesses(statistics: HandStatistics): PlayerWeakness[] {
    const weaknesses: PlayerWeakness[] = [];

    // 分析位置弱点
    statistics.positionalStats.forEach((posStats, position) => {
      if (posStats.winRate < this.weaknessThreshold) {
        weaknesses.push({
          category: 'positional',
          type: `${position}_play`,
          severity: this.calculateSeverity(posStats.winRate),
          description: `${position}位置胜率偏低 (${(posStats.winRate * 100).toFixed(1)}%)`,
          metrics: { winRate: posStats.winRate, vpip: posStats.vpip, pfr: posStats.pfr }
        });
      }

      if (posStats.vpip > 0.4) { // VPIP过高
        weaknesses.push({
          category: 'preflop',
          type: 'vpip_too_high',
          severity: this.calculateSeverity(1 - posStats.vpip),
          description: `${position}位置VPIP过高 (${(posStats.vpip * 100).toFixed(1)}%)`,
          metrics: { vpip: posStats.vpip }
        });
      }

      if (posStats.pfr < 0.1 && posStats.vpip > 0.2) { // 过于被动
        weaknesses.push({
          category: 'preflop',
          type: 'too_passive',
          severity: 'moderate',
          description: `${position}位置过于被动，很少主动加注`,
          metrics: { pfr: posStats.pfr, vpip: posStats.vpip }
        });
      }
    });

    // 分析阶段弱点
    Object.entries(statistics.stageStats).forEach(([stage, stageStats]) => {
      if (stageStats.winRate < this.weaknessThreshold) {
        weaknesses.push({
          category: 'postflop',
          type: `${stage}_play`,
          severity: this.calculateSeverity(stageStats.winRate),
          description: `${stage}阶段胜率偏低 (${(stageStats.winRate * 100).toFixed(1)}%)`,
          metrics: { winRate: stageStats.winRate, aggression: stageStats.aggression }
        });
      }

      if (stageStats.aggression < 0.3 && stage !== 'preflop') {
        weaknesses.push({
          category: 'postflop',
          type: 'postflop_passivity',
          severity: 'minor',
          description: `${stage}阶段过于被动`,
          metrics: { aggression: stageStats.aggression }
        });
      }
    });

    return weaknesses.sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity));
  }

  // =================== 场景生成核心逻辑 ===================

  private async generateScenarioFromTemplate(
    template: ScenarioTemplate,
    weaknesses?: PlayerWeakness[],
    statistics?: HandStatistics
  ): Promise<PersonalizedScenario> {
    // 生成基础场景数据
    const scenario: PersonalizedScenario = {
      id: `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      description: template.description,
      type: template.type,
      difficulty: template.difficulty,
      priority: template.basePriority,
      
      // 游戏设置
      gameSettings: this.generateGameSettings(template),
      
      // 牌局状态
      situation: this.generateSituation(template),
      
      // 学习目标
      learningObjectives: [...template.learningObjectives],
      
      // 成功指标
      successMetrics: template.successMetrics,
      
      // 个性化参数
      personalization: this.generatePersonalization(template, weaknesses, statistics),
      
      // 预期时长
      estimatedDuration: template.estimatedDuration,
      
      // 标签
      tags: [...template.tags]
    };

    // 根据弱点调整优先级
    if (weaknesses) {
      scenario.priority = this.adjustPriorityForWeaknesses(scenario, weaknesses);
    }

    return scenario;
  }

  private generateGameSettings(template: ScenarioTemplate): GameSettings {
    return {
      blinds: template.blindRange ? 
        [
          Math.random() * (template.blindRange.max[0] - template.blindRange.min[0]) + template.blindRange.min[0],
          Math.random() * (template.blindRange.max[1] - template.blindRange.min[1]) + template.blindRange.min[1]
        ] : [1, 2],
      stackSizes: this.generateStackSizes(template),
      positions: this.generatePositions(template),
      playerCount: template.playerCount || 6
    };
  }

  private generateSituation(template: ScenarioTemplate): ScenarioSituation {
    return {
      stage: template.stage,
      heroPosition: this.selectHeroPosition(template),
      heroCards: this.generateHeroCards(template),
      communityCards: this.generateCommunityCards(template),
      potSize: this.calculatePotSize(template),
      actionHistory: this.generateActionHistory(template),
      activeOpponents: this.generateActiveOpponents(template)
    };
  }

  // =================== 模板选择逻辑 ===================

  private selectTemplatesForWeaknesses(
    weaknesses: PlayerWeakness[],
    maxScenarios: number
  ): ScenarioTemplate[] {
    const selectedTemplates: ScenarioTemplate[] = [];
    const usedTypes = new Set<ScenarioType>();

    // 按严重程度处理弱点
    for (const weakness of weaknesses.slice(0, maxScenarios)) {
      const template = this.findBestTemplateForWeakness(weakness);
      if (template && !usedTypes.has(template.type)) {
        selectedTemplates.push(template);
        usedTypes.add(template.type);
      }
    }

    // 如果不够，添加通用场景
    while (selectedTemplates.length < maxScenarios) {
      const generalTemplate = this.scenarioTemplates.find(t => 
        t.type === 'general' && !usedTypes.has(t.type)
      );
      if (generalTemplate) {
        selectedTemplates.push(generalTemplate);
        usedTypes.add(generalTemplate.type);
      } else {
        break;
      }
    }

    return selectedTemplates;
  }

  private findBestTemplateForWeakness(weakness: PlayerWeakness): ScenarioTemplate | null {
    // 根据弱点类型匹配最佳模板
    const relevantTemplates = this.scenarioTemplates.filter(template => {
      return template.targetWeaknesses?.includes(weakness.type) ||
             template.category === weakness.category;
    });

    if (relevantTemplates.length === 0) return null;

    // 选择最匹配的模板
    return relevantTemplates.reduce((best, current) => {
      const bestScore = this.calculateTemplateMatchScore(best, weakness);
      const currentScore = this.calculateTemplateMatchScore(current, weakness);
      return currentScore > bestScore ? current : best;
    });
  }

  // =================== 个性化参数生成 ===================

  private generatePersonalization(
    template: ScenarioTemplate,
    weaknesses?: PlayerWeakness[],
    statistics?: HandStatistics
  ): ScenarioPersonalization {
    return {
      adaptedForWeaknesses: weaknesses?.map(w => w.type) || [],
      difficultyAdjustments: this.calculateDifficultyAdjustments(template, statistics),
      customHints: this.generateCustomHints(template, weaknesses),
      adaptiveAI: this.configureAdaptiveAI(template, statistics)
    };
  }

  private calculateDifficultyAdjustments(
    template: ScenarioTemplate,
    statistics?: HandStatistics
  ): DifficultyAdjustment[] {
    const adjustments: DifficultyAdjustment[] = [];

    if (statistics) {
      // 根据胜率调整难度
      const avgWinRate = statistics.basicStats.winRate;
      if (avgWinRate < 0.4) {
        adjustments.push({
          type: 'ai_aggression',
          value: -0.2,
          reason: '降低AI攻击性以匹配较低胜率'
        });
      } else if (avgWinRate > 0.7) {
        adjustments.push({
          type: 'ai_aggression',
          value: 0.1,
          reason: '增加AI攻击性以提供更大挑战'
        });
      }
    }

    return adjustments;
  }

  // =================== 辅助方法 ===================

  private calculateSeverity(value: number): 'minor' | 'moderate' | 'major' {
    if (value < 0.3) return 'major';
    if (value < 0.5) return 'moderate';
    return 'minor';
  }

  private getSeverityScore(severity: 'minor' | 'moderate' | 'major'): number {
    return { minor: 1, moderate: 2, major: 3 }[severity];
  }

  private calculateTemplateMatchScore(template: ScenarioTemplate, weakness: PlayerWeakness): number {
    let score = 0;
    
    if (template.targetWeaknesses?.includes(weakness.type)) score += 10;
    if (template.category === weakness.category) score += 5;
    if (template.difficulty === this.mapSeverityToDifficulty(weakness.severity)) score += 3;
    
    return score;
  }

  private mapSeverityToDifficulty(severity: 'minor' | 'moderate' | 'major'): 'beginner' | 'intermediate' | 'advanced' {
    const mapping: Record<'minor' | 'moderate' | 'major', 'beginner' | 'intermediate' | 'advanced'> = {
      minor: 'beginner',
      moderate: 'intermediate', 
      major: 'advanced'
    };
    return mapping[severity];
  }

  // =================== 模板初始化 ===================

  private initializeScenarioTemplates(): ScenarioTemplate[] {
    return [
      // 翻前场景
      {
        id: 'preflop_positional',
        name: '位置优势训练',
        description: '学习不同位置的最优翻前策略',
        type: 'preflop_positioning',
        category: 'positional',
        difficulty: 'intermediate',
        stage: 'preflop',
        basePriority: 8,
        learningObjectives: ['理解位置价值', '优化翻前范围', '提高位置意识'],
        successMetrics: { winRate: 0.65, vpipImprovement: 0.1 },
        estimatedDuration: 15,
        tags: ['preflop', 'position', 'ranges'],
        targetWeaknesses: ['BTN_play', 'SB_play', 'BB_play'],
        playerCount: 6
      },
      
      // 翻后持续下注
      {
        id: 'postflop_cbet',
        name: '翻后持续下注',
        description: '学习何时持续下注，何时check',
        type: 'postflop_cbet',
        category: 'postflop',
        difficulty: 'intermediate',
        stage: 'flop',
        basePriority: 9,
        learningObjectives: ['掌握C-bet时机', '分析牌面结构', '平衡下注范围'],
        successMetrics: { winRate: 0.7, cbetOptimal: 0.8 },
        estimatedDuration: 20,
        tags: ['postflop', 'cbet', 'aggression'],
        targetWeaknesses: ['flop_play', 'postflop_passivity'],
        playerCount: 2
      },

      // 转牌决策
      {
        id: 'turn_decision',
        name: '转牌关键决策',
        description: '转牌圈的复杂决策训练',
        type: 'turn_play',
        category: 'postflop',
        difficulty: 'advanced',
        stage: 'turn',
        basePriority: 7,
        learningObjectives: ['评估转牌影响', '计算胜率变化', '优化决策树'],
        successMetrics: { winRate: 0.68, equityRealization: 0.85 },
        estimatedDuration: 25,
        tags: ['turn', 'decision-making', 'equity'],
        targetWeaknesses: ['turn_play'],
        playerCount: 3
      }
    ];
  }

  // 其他方法的简化实现
  private generateStackSizes(template: ScenarioTemplate): number[] {
    return Array(template.playerCount || 2).fill(100);
  }

  private generatePositions(template: ScenarioTemplate): Position[] {
    return ['BTN', 'SB'];
  }

  private selectHeroPosition(template: ScenarioTemplate): Position {
    return 'BTN';
  }

  private generateHeroCards(template: ScenarioTemplate): [Card, Card] {
    return [
      { suit: 'hearts', rank: 'A' },
      { suit: 'spades', rank: 'K' }
    ];
  }

  private generateCommunityCards(template: ScenarioTemplate): Card[] {
    if (template.stage === 'preflop') return [];
    return [
      { suit: 'hearts', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'Q' }
    ];
  }

  private calculatePotSize(template: ScenarioTemplate): number {
    return 15;
  }

  private generateActionHistory(template: ScenarioTemplate): string[] {
    return ['SB call', 'BB check', 'Hero bet 6'];
  }

  private generateActiveOpponents(template: ScenarioTemplate): OpponentProfile[] {
    return [{
      id: 'opponent1',
      style: 'TAG',
      vpip: 0.25,
      pfr: 0.18,
      aggression: 0.7
    }];
  }

  private adjustPriorityForWeaknesses(scenario: PersonalizedScenario, weaknesses: PlayerWeakness[]): number {
    let adjustment = 0;
    weaknesses.forEach(weakness => {
      if (scenario.personalization.adaptedForWeaknesses.includes(weakness.type)) {
        adjustment += this.getSeverityScore(weakness.severity);
      }
    });
    return scenario.priority + adjustment;
  }

  private selectTemplateForOpponent(opponent: OpponentStats): ScenarioTemplate | null {
    // 简化实现
    return this.scenarioTemplates[0];
  }

  private async generateOpponentSpecificScenario(template: ScenarioTemplate, opponent: OpponentStats): Promise<PersonalizedScenario> {
    // 简化实现
    return this.generateScenarioFromTemplate(template);
  }

  private generateCustomHints(template: ScenarioTemplate, weaknesses?: PlayerWeakness[]): string[] {
    const hints: string[] = [];
    
    if (weaknesses) {
      weaknesses.forEach(weakness => {
        if (weakness.category === 'preflop') {
          hints.push('注意位置对手牌选择的影响');
        } else if (weakness.category === 'postflop') {
          hints.push('考虑牌面结构对下注策略的影响');
        }
      });
    }
    
    return hints;
  }

  private configureAdaptiveAI(template: ScenarioTemplate, statistics?: HandStatistics): AdaptiveAIConfig {
    return {
      baseAggression: 0.6,
      adaptationRate: 0.1,
      targetWinRate: 0.6
    };
  }
}

// =================== 类型定义 ===================

type ScenarioType = 
  | 'preflop_positioning' 
  | 'postflop_cbet' 
  | 'turn_play' 
  | 'river_value_betting'
  | 'bluff_catching' 
  | 'general';

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  category: 'preflop' | 'postflop' | 'positional' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  stage: GameStage;
  basePriority: number;
  learningObjectives: string[];
  successMetrics: Record<string, number>;
  estimatedDuration: number;
  tags: string[];
  targetWeaknesses?: string[];
  playerCount?: number;
  blindRange?: {
    min: [number, number];
    max: [number, number];
  };
}

interface PlayerWeakness {
  category: 'preflop' | 'postflop' | 'positional' | 'general';
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  metrics: Record<string, number>;
}

interface PersonalizedScenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number;
  gameSettings: GameSettings;
  situation: ScenarioSituation;
  learningObjectives: string[];
  successMetrics: Record<string, number>;
  personalization: ScenarioPersonalization;
  estimatedDuration: number;
  tags: string[];
}

interface GameSettings {
  blinds: [number, number];
  stackSizes: number[];
  positions: Position[];
  playerCount: number;
}

interface ScenarioSituation {
  stage: GameStage;
  heroPosition: Position;
  heroCards: [Card, Card];
  communityCards: Card[];
  potSize: number;
  actionHistory: string[];
  activeOpponents: OpponentProfile[];
}

interface OpponentProfile {
  id: string;
  style: 'TAG' | 'LAG' | 'FISH' | 'NIT';
  vpip: number;
  pfr: number;
  aggression: number;
}

interface ScenarioPersonalization {
  adaptedForWeaknesses: string[];
  difficultyAdjustments: DifficultyAdjustment[];
  customHints: string[];
  adaptiveAI: AdaptiveAIConfig;
}

interface DifficultyAdjustment {
  type: string;
  value: number;
  reason: string;
}

interface AdaptiveAIConfig {
  baseAggression: number;
  adaptationRate: number;
  targetWinRate: number;
}

export default DynamicScenarioGenerator;