/**
 * AIDZ扑克GTO训练系统 - AI对手系统
 * 
 * 智能化的扑克AI对手系统，提供：
 * - 基于GTO理论的核心决策引擎
 * - 4个不同风格的预设AI角色
 * - 自适应学习和对手建模
 * - 个性化参数和行为模式
 * - <150ms的快速决策响应
 * 
 * 使用示例：
 * ```typescript
 * import { AIDecisionEngine, getPersonalityById } from '@/lib/ai';
 * 
 * const engine = new AIDecisionEngine();
 * const alice = getPersonalityById('tight-aggressive-alice');
 * 
 * const decision = await engine.makeDecision({
 *   gameState,
 *   heroId: 'ai-player',
 *   opponentModel,
 *   handRange,
 *   personality: alice,
 *   recentHistory
 * });
 * ```
 */

// =================== 核心引擎 ===================

export { AIDecisionEngine } from './decision-engine';

export type {
  AIPersonality,
  DecisionContext,
  OpponentModel,
  RecentAction,
  AIDecision
} from './decision-engine';

// =================== 预设角色 ===================

export {
  // 预设角色实例
  BEGINNER_BOB,
  TIGHT_AGGRESSIVE_ALICE,
  LOOSE_AGGRESSIVE_CHARLIE,
  ADAPTIVE_DIANA,
  
  // 角色管理函数
  AI_PERSONALITIES,
  getAllPersonalities,
  getPersonalityById,
  getPersonalityByDifficulty,
  createCustomPersonality,
  validatePersonality,
  
  // 角色分析函数
  getPlayingStyleDescription,
  getPersonalityStrength,
  calculatePersonalityMatch,
  
  // 学习和进化
  createLearningPersonality,
  applyLearningAdjustments
} from './personalities';

export type {
  PersonalityLearning
} from './personalities';

// =================== AI系统管理器 ===================

/**
 * AI系统管理器 - 统一管理所有AI相关功能
 */
export class AIManager {
  private decisionEngine: AIDecisionEngine;
  private activePersonalities: Map<string, AIPersonality> = new Map();
  
  constructor() {
    this.decisionEngine = new AIDecisionEngine();
    this.loadDefaultPersonalities();
  }

  /**
   * 加载默认AI角色
   */
  private loadDefaultPersonalities(): void {
    Object.values(AI_PERSONALITIES).forEach(personality => {
      this.activePersonalities.set(personality.id, personality);
    });
  }

  /**
   * 获取AI决策
   */
  async getAIDecision(context: DecisionContext): Promise<AIDecision> {
    return await this.decisionEngine.makeDecision(context);
  }

  /**
   * 注册新的AI角色
   */
  registerPersonality(personality: AIPersonality): void {
    if (!validatePersonality(personality)) {
      throw new Error(`Invalid personality parameters: ${personality.id}`);
    }
    this.activePersonalities.set(personality.id, personality);
  }

  /**
   * 获取已注册的AI角色
   */
  getPersonality(id: string): AIPersonality | null {
    return this.activePersonalities.get(id) || null;
  }

  /**
   * 获取所有已注册的AI角色
   */
  getAllRegisteredPersonalities(): AIPersonality[] {
    return Array.from(this.activePersonalities.values());
  }

  /**
   * 移除AI角色
   */
  removePersonality(id: string): boolean {
    return this.activePersonalities.delete(id);
  }

  /**
   * 推荐适合的AI对手
   */
  recommendOpponent(
    playerStats: { vpip: number; pfr: number; aggFactor: number },
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  ): AIPersonality {
    if (difficulty) {
      return getPersonalityByDifficulty(difficulty);
    }

    // 根据玩家统计数据推荐最匹配的对手
    let bestMatch = BEGINNER_BOB;
    let bestScore = 0;

    for (const personality of this.activePersonalities.values()) {
      const matchScore = calculatePersonalityMatch(playerStats, personality);
      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = personality;
      }
    }

    return bestMatch;
  }

  /**
   * 创建对手模型
   */
  createOpponentModel(
    playerId: string,
    stats?: Partial<OpponentModel>
  ): OpponentModel {
    return {
      playerId,
      vpip: 25,           // 默认25%入池率
      pfr: 20,            // 默认20%翻前加注率
      aggFactor: 2.0,     // 默认2.0激进因子
      foldToCBet: 60,     // 默认60%对C-bet弃牌率
      threeBetFreq: 8,    // 默认8% 3-bet频率
      recentAdjustment: 0, // 无调整
      ...stats
    };
  }

  /**
   * 更新对手模型
   */
  updateOpponentModel(
    model: OpponentModel,
    action: RecentAction,
    gameContext: any
  ): OpponentModel {
    // 简化的对手模型更新逻辑
    const updated = { ...model };
    
    // 根据行动更新统计数据
    if (action.action === 'bet' || action.action === 'raise') {
      updated.aggFactor = Math.min(5.0, updated.aggFactor + 0.1);
    } else if (action.action === 'fold') {
      updated.foldToCBet = Math.min(100, updated.foldToCBet + 0.5);
    }

    return updated;
  }

  /**
   * 获取AI系统统计信息
   */
  getSystemStats(): AISystemStats {
    return {
      totalPersonalities: this.activePersonalities.size,
      activeEngines: 1,
      avgDecisionTime: 85, // ms (估算值)
      cacheHitRate: 0.75,
      totalDecisionsMade: this.decisionEngine['decisionsCount'] || 0
    };
  }

  /**
   * 清除决策缓存
   */
  clearCache(): void {
    this.decisionEngine['decisionCache']?.clear();
  }
}

// =================== 便捷函数 ===================

/**
 * 创建默认AI管理器实例
 */
export const createAIManager = (): AIManager => {
  return new AIManager();
};

/**
 * 快速AI决策 - 用于简单场景
 */
export const quickAIDecision = async (
  gameState: any,
  heroId: string,
  personalityId: string = 'adaptive-diana'
): Promise<AIDecision> => {
  const manager = new AIManager();
  const personality = manager.getPersonality(personalityId);
  
  if (!personality) {
    throw new Error(`Personality not found: ${personalityId}`);
  }

  const opponentModel = manager.createOpponentModel('opponent-1');
  
  const context: DecisionContext = {
    gameState,
    heroId,
    opponentModel,
    handRange: {}, // 简化处理
    personality,
    recentHistory: []
  };

  return await manager.getAIDecision(context);
};

/**
 * AI难度级别定义
 */
export const AI_DIFFICULTY_LEVELS = {
  beginner: {
    name: '初学者',
    description: '适合刚接触DZ扑克的玩家',
    recommendedPersonalities: ['beginner-bob'],
    avgDecisionTime: 120 // ms
  },
  intermediate: {
    name: '中级',
    description: '适合有一定基础的玩家',
    recommendedPersonalities: ['tight-aggressive-alice'],
    avgDecisionTime: 100
  },
  advanced: {
    name: '高级',
    description: '适合有经验的玩家',
    recommendedPersonalities: ['loose-aggressive-charlie', 'adaptive-diana'],
    avgDecisionTime: 85
  }
};

// =================== 类型定义 ===================

export interface AISystemStats {
  totalPersonalities: number;
  activeEngines: number;
  avgDecisionTime: number;
  cacheHitRate: number;
  totalDecisionsMade: number;
}

export interface AITrainingSession {
  sessionId: string;
  playerId: string;
  aiPersonalityId: string;
  startTime: number;
  endTime?: number;
  handsPlayed: number;
  playerWinRate: number;
  aiDecisions: AIDecision[];
  learningAdjustments: any[];
}

// =================== AI常量 ===================

export const AI_CONSTANTS = {
  // 决策时间限制
  MAX_DECISION_TIME: 150,      // ms
  CACHE_TTL: 30000,           // 30秒
  
  // 学习参数
  MIN_HANDS_FOR_LEARNING: 50,
  MAX_LEARNING_RATE: 0.1,
  
  // 性能参数
  MAX_CACHE_SIZE: 1000,
  DECISION_BATCH_SIZE: 10,
  
  // 置信度阈值
  MIN_CONFIDENCE: 0.3,
  HIGH_CONFIDENCE: 0.8,
  
  // GTO偏离度范围
  MAX_GTO_DEVIATION: 0.5,
  LEARNING_GTO_DEVIATION: 0.3
};

// =================== 错误处理 ===================

export class AIError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIDecisionTimeoutError extends AIError {
  constructor(timeout: number) {
    super(`AI decision timeout after ${timeout}ms`);
    this.code = 'DECISION_TIMEOUT';
  }
}

export class InvalidPersonalityError extends AIError {
  constructor(personalityId: string) {
    super(`Invalid personality: ${personalityId}`);
    this.code = 'INVALID_PERSONALITY';
  }
}

// =================== 默认导出 ===================

export default {
  AIManager,
  createAIManager,
  quickAIDecision,
  AI_DIFFICULTY_LEVELS,
  AI_CONSTANTS
};

// 重新导入personalities中的函数，以便直接从ai/index导入
import {
  BEGINNER_BOB,
  TIGHT_AGGRESSIVE_ALICE,
  LOOSE_AGGRESSIVE_CHARLIE,
  ADAPTIVE_DIANA,
  AI_PERSONALITIES,
  getAllPersonalities,
  getPersonalityById,
  getPersonalityByDifficulty,
  createCustomPersonality,
  validatePersonality,
  getPlayingStyleDescription,
  getPersonalityStrength,
  calculatePersonalityMatch,
  createLearningPersonality,
  applyLearningAdjustments
} from './personalities';