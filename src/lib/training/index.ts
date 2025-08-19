/**
 * AIDZ扑克GTO训练系统 - 翻后训练模块
 * 
 * 智能化翻后GTO训练系统，提供：
 * - 个性化训练场景生成
 * - 3个难度等级的渐进式训练
 * - 实时决策分析和GTO偏离度计算
 * - 弱点识别和针对性改进建议
 * - 完整的训练进度跟踪系统
 * - +25%延长的训练时长以确保深度学习
 * 
 * 使用示例：
 * ```typescript
 * import { TrainingScenarioManager } from '@/lib/training';
 * 
 * const manager = new TrainingScenarioManager();
 * 
 * // 推荐训练场景
 * const recommendations = manager.recommendScenarios('player-1', 'intermediate');
 * 
 * // 生成训练场景
 * const scenario = await manager.generateScenario('cbet-basic');
 * 
 * // 分析玩家决策
 * const analysis = await manager.analyzePlayerDecision(
 *   'scenario-1', 
 *   { action: 'bet', amount: 500 }, 
 *   8000
 * );
 * ```
 */

// =================== 核心训练管理器 ===================

export { TrainingScenarioManager } from './scenario-manager';

export type {
  // 训练场景配置
  TrainingScenarioConfig,
  TrainingFocusArea,
  
  // 场景生成和结果
  GeneratedScenario,
  ScenarioResult,
  DecisionAnalysis,
  
  // 玩家进度跟踪
  PlayerTrainingProgress,
  PlayerTrainingStats
} from './scenario-manager';

// =================== 训练组件导出 ===================

// Note: These would typically be in a separate components package
// but are included here for convenience in the training module

export type {
  // 组件Props类型
  TrainingModeSelectionProps,
  ScenarioAnalysisDisplayProps
} from '@/components/training/TrainingModeSelection';

// =================== 训练系统管理器 ===================

/**
 * 训练系统管理器 - 统一管理所有训练相关功能
 */
export class TrainingSystemManager {
  private scenarioManager: TrainingScenarioManager;
  private activeTrainingSessions: Map<string, TrainingSession> = new Map();

  constructor() {
    this.scenarioManager = new TrainingScenarioManager();
  }

  /**
   * 开始新的训练会话
   */
  async startTrainingSession(
    playerId: string,
    scenarioId: string,
    customization?: Partial<TrainingScenarioConfig>
  ): Promise<TrainingSession> {
    const scenario = await this.scenarioManager.generateScenario(scenarioId, customization);
    
    const session: TrainingSession = {
      sessionId: this.generateSessionId(),
      playerId,
      scenarioId,
      scenario,
      startTime: Date.now(),
      decisions: [],
      currentHandIndex: 0,
      isActive: true
    };

    this.activeTrainingSessions.set(session.sessionId, session);
    return session;
  }

  /**
   * 记录玩家决策
   */
  async recordDecision(
    sessionId: string,
    decision: PlayerDecision,
    decisionTime: number
  ): Promise<DecisionAnalysis> {
    const session = this.activeTrainingSessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Training session not found or inactive');
    }

    const analysis = await this.scenarioManager.analyzePlayerDecision(
      session.scenarioId,
      decision,
      decisionTime
    );

    session.decisions.push({
      handIndex: session.currentHandIndex,
      decision,
      decisionTime,
      analysis
    });

    session.currentHandIndex++;

    return analysis;
  }

  /**
   * 完成训练会话
   */
  async completeTrainingSession(sessionId: string): Promise<ScenarioResult> {
    const session = this.activeTrainingSessions.get(sessionId);
    if (!session) {
      throw new Error('Training session not found');
    }

    session.isActive = false;
    session.endTime = Date.now();

    // 计算会话结果
    const result = this.calculateSessionResult(session);

    // 记录到场景管理器
    const scenarioResult = this.scenarioManager.completeScenario(
      session.playerId,
      session.scenarioId,
      result
    );

    // 清理活跃会话
    this.activeTrainingSessions.delete(sessionId);

    return scenarioResult;
  }

  /**
   * 获取训练统计
   */
  getTrainingStats(playerId: string): PlayerTrainingStats {
    return this.scenarioManager.getPlayerStats(playerId);
  }

  /**
   * 获取推荐场景
   */
  getRecommendedScenarios(
    playerId: string, 
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): TrainingScenarioConfig[] {
    return this.scenarioManager.recommendScenarios(playerId, difficulty);
  }

  /**
   * 获取活跃训练会话
   */
  getActiveSession(sessionId: string): TrainingSession | null {
    return this.activeTrainingSessions.get(sessionId) || null;
  }

  /**
   * 获取玩家的所有活跃会话
   */
  getPlayerActiveSessions(playerId: string): TrainingSession[] {
    return Array.from(this.activeTrainingSessions.values())
      .filter(session => session.playerId === playerId && session.isActive);
  }

  // =================== 私有辅助方法 ===================

  private generateSessionId(): string {
    return `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSessionResult(session: TrainingSession): Partial<ScenarioResult> {
    const totalDecisions = session.decisions.length;
    const correctDecisions = session.decisions.filter(d => d.analysis.isCorrect).length;
    const totalDecisionTime = session.decisions.reduce((sum, d) => sum + d.decisionTime, 0);
    const gtoDeviations = session.decisions.map(d => d.analysis.gtoDeviation);

    // 计算各项得分
    const handReadingScore = this.calculateSkillScore(session.decisions, 'hand-reading');
    const potOddsScore = this.calculateSkillScore(session.decisions, 'pot-odds');
    const positioningScore = this.calculateSkillScore(session.decisions, 'position-play');
    const boardTextureScore = this.calculateSkillScore(session.decisions, 'board-texture');

    const overallScore = Math.round(
      (handReadingScore + potOddsScore + positioningScore + boardTextureScore) / 4
    );

    return {
      startTime: session.startTime,
      endTime: session.endTime || Date.now(),
      handsPlayed: totalDecisions,
      correctDecisions,
      averageDecisionTime: totalDecisionTime / Math.max(1, totalDecisions),
      gtoDeviations,
      scoreBreakdown: {
        handReading: handReadingScore,
        potOdds: potOddsScore,
        positioning: positioningScore,
        boardTexture: boardTextureScore,
        overall: overallScore
      },
      weaknessesIdentified: this.identifyWeaknesses(session.decisions)
    };
  }

  private calculateSkillScore(decisions: SessionDecision[], skill: string): number {
    // 简化的技能得分计算
    const relevantDecisions = decisions.filter(d => 
      d.analysis.relatedConcepts.some(concept => 
        concept.includes(skill) || this.isSkillRelated(skill, concept)
      )
    );

    if (relevantDecisions.length === 0) return 75; // 默认分数

    const correctCount = relevantDecisions.filter(d => d.analysis.isCorrect).length;
    const accuracy = correctCount / relevantDecisions.length;

    // 考虑决策时间和GTO偏离度
    const avgDecisionTime = relevantDecisions.reduce((sum, d) => sum + d.decisionTime, 0) / relevantDecisions.length;
    const avgGTODeviation = relevantDecisions.reduce((sum, d) => sum + Math.abs(d.analysis.gtoDeviation), 0) / relevantDecisions.length;

    let score = accuracy * 100;

    // 决策时间调整（超过10秒扣分）
    if (avgDecisionTime > 10000) {
      score *= 0.95;
    }

    // GTO偏离度调整
    score *= (1 - avgGTODeviation * 0.5);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private isSkillRelated(skill: string, concept: string): boolean {
    const skillKeywords: Record<string, string[]> = {
      'hand-reading': ['读牌', '范围', '对手'],
      'pot-odds': ['赔率', '概率', '数学'],
      'position-play': ['位置', '主动权', '信息'],
      'board-texture': ['牌面', '结构', '听牌']
    };

    const keywords = skillKeywords[skill] || [];
    return keywords.some(keyword => concept.includes(keyword));
  }

  private identifyWeaknesses(decisions: SessionDecision[]): TrainingFocusArea[] {
    const skills = ['hand-reading', 'pot-odds', 'position-play', 'board-texture'] as const;
    const weaknesses: TrainingFocusArea[] = [];

    for (const skill of skills) {
      const score = this.calculateSkillScore(decisions, skill);
      if (score < 70) { // 低于70分认为是弱点
        weaknesses.push(skill as TrainingFocusArea);
      }
    }

    return weaknesses;
  }
}

// =================== 便捷函数 ===================

/**
 * 创建默认训练系统管理器
 */
export const createTrainingSystem = (): TrainingSystemManager => {
  return new TrainingSystemManager();
};

/**
 * 获取所有可用的训练场景配置
 */
export const getAllTrainingScenarios = (): TrainingScenarioConfig[] => {
  // 这里应该返回所有预定义的训练场景
  return [
    {
      id: 'cbet-basic',
      name: 'C-bet基础训练',
      description: '学习翻牌圈持续下注的基本决策，包括何时下注、何时过牌',
      category: 'cbet',
      difficulty: 'beginner',
      focusArea: 'board-texture',
      estimatedDuration: 15
    },
    {
      id: 'pot-odds-intro',
      name: '底池赔率入门',
      description: '掌握基本的底池赔率计算和听牌跟注决策',
      category: 'turn-decision',
      difficulty: 'beginner',
      focusArea: 'pot-odds',
      estimatedDuration: 20
    },
    // 更多场景...
  ];
};

/**
 * 训练难度级别配置
 */
export const TRAINING_DIFFICULTY_CONFIG = {
  beginner: {
    name: '初级',
    description: '适合刚接触翻后概念的玩家',
    expectedAccuracy: 60, // 期望正确率
    timeLimit: 20000, // 20秒决策时限
    gtoToleranceRange: 0.4 // GTO偏离容忍度
  },
  intermediate: {
    name: '中级',
    description: '适合有一定翻后基础的玩家',
    expectedAccuracy: 75,
    timeLimit: 15000, // 15秒
    gtoToleranceRange: 0.3
  },
  advanced: {
    name: '高级',
    description: '适合有经验的进阶玩家',
    expectedAccuracy: 85,
    timeLimit: 12000, // 12秒
    gtoToleranceRange: 0.2
  }
};

/**
 * 训练焦点领域配置
 */
export const TRAINING_FOCUS_CONFIG = {
  'hand-reading': {
    name: '读牌能力',
    description: '分析对手可能的手牌范围',
    keySkills: ['范围构建', '行动分析', '牌面关联']
  },
  'pot-odds': {
    name: '底池赔率',
    description: '计算跟注和下注的数学期望',
    keySkills: ['概率计算', '隐含赔率', '期望值分析']
  },
  'position-play': {
    name: '位置游戏',
    description: '利用位置优势做出最优决策',
    keySkills: ['信息价值', '主动权控制', '位置感知']
  },
  'board-texture': {
    name: '牌面分析',
    description: '理解不同牌面结构对策略的影响',
    keySkills: ['连接性分析', '听牌识别', '对手命中率估算']
  },
  'betting-patterns': {
    name: '下注模式',
    description: '识别和应用不同的下注模式',
    keySkills: ['价值下注', '诈唬频率', '尺寸选择']
  },
  'bluff-detection': {
    name: '诈唬识别',
    description: '识别对手的诈唬行为',
    keySkills: ['时机分析', '故事逻辑', '心理读牌']
  },
  'value-extraction': {
    name: '价值榨取',
    description: '从强牌中获取最大价值',
    keySkills: ['价值下注尺寸', '跟注范围分析', '河牌策略']
  },
  'bankroll-mgmt': {
    name: '资金管理',
    description: '合理管理训练中的虚拟资金',
    keySkills: ['风险控制', '方差管理', '止损策略']
  }
} as const;

// =================== 类型定义 ===================

export interface TrainingSession {
  sessionId: string;
  playerId: string;
  scenarioId: string;
  scenario: GeneratedScenario;
  startTime: number;
  endTime?: number;
  decisions: SessionDecision[];
  currentHandIndex: number;
  isActive: boolean;
}

export interface SessionDecision {
  handIndex: number;
  decision: PlayerDecision;
  decisionTime: number;
  analysis: DecisionAnalysis;
}

export interface PlayerDecision {
  action: string;
  amount?: number;
  reasoning?: string;
}

// =================== 训练常量 ===================

export const TRAINING_CONSTANTS = {
  // 时间限制
  DEFAULT_DECISION_TIME_LIMIT: 15000, // 15秒
  MAX_SESSION_DURATION: 45 * 60 * 1000, // 45分钟（包含+25%延长）
  
  // 得分标准
  EXCELLENT_SCORE: 90,
  GOOD_SCORE: 80,
  PASS_SCORE: 70,
  
  // 训练参数
  HANDS_PER_SCENARIO: 10,
  MIN_ACCURACY_FOR_ADVANCE: 75,
  
  // 缓存设置
  SCENARIO_CACHE_SIZE: 100,
  SESSION_CLEANUP_INTERVAL: 30 * 60 * 1000 // 30分钟
};

// =================== 错误处理 ===================

export class TrainingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TrainingError';
  }
}

export class ScenarioNotFoundError extends TrainingError {
  constructor(scenarioId: string) {
    super(`Training scenario not found: ${scenarioId}`);
    this.code = 'SCENARIO_NOT_FOUND';
  }
}

export class SessionNotFoundError extends TrainingError {
  constructor(sessionId: string) {
    super(`Training session not found: ${sessionId}`);
    this.code = 'SESSION_NOT_FOUND';
  }
}

// =================== 默认导出 ===================

export default {
  TrainingSystemManager,
  createTrainingSystem,
  getAllTrainingScenarios,
  TRAINING_DIFFICULTY_CONFIG,
  TRAINING_FOCUS_CONFIG,
  TRAINING_CONSTANTS
};