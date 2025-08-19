import { AIPersonality } from './decision-engine';

/**
 * AI角色预设库 - 4个不同风格的扑克AI对手
 * 
 * 每个AI角色都有独特的：
 * 1. 基础参数设定 (激进度、紧松度等)
 * 2. 街道特化行为 (翻前vs翻后)
 * 3. 学习和适应能力
 * 4. 风险偏好设定
 * 
 * 设计理念：
 * - 新手小鲍：模拟新手玩家的常见错误和行为模式
 * - 紧凶爱丽丝：经典TAG打法，高质量手牌激进游戏
 * - 松凶查理：LAG风格，高入池率配合持续激进
 * - 适应性戴安娜：智能学习型AI，根据对手调整策略
 */

// =================== 预设角色定义 ===================

/**
 * 新手小鲍 (Beginner Bob)
 * 特点：保守、被动、容易犯新手错误
 * 适合：初学者练习，建立信心
 */
export const BEGINNER_BOB: AIPersonality = {
  id: 'beginner-bob',
  name: '新手小鲍',
  description: '刚学会扑克的新手玩家，打法保守被动，容易犯一些常见错误。适合初学者练习基础技巧。',
  
  // 基础参数 (新手特征：低激进、较紧、很少诈唬)
  aggression: 25,        // 低激进度 - 更多跟注和过牌
  tightness: 70,         // 较紧 - 只玩好牌
  bluffFrequency: 10,    // 很少诈唬
  adaptability: 20,      // 低适应性 - 不太会学习

  // 街道特化参数
  preflopAggression: 20,    // 翻前更保守
  postflopAggression: 30,   // 翻后稍微激进一点
  riverCallDownFreq: 40,    // 经常在河牌跟注 (好奇心强)

  // 风险偏好 (新手特征：怕输钱但又好奇)
  riskTolerance: 30,        // 低风险容忍度
  variancePreference: 25    // 不喜欢高方差
};

/**
 * 紧凶爱丽丝 (Tight-Aggressive Alice) 
 * 特点：选择性激进、高质量手牌重注、位置感强
 * 适合：中级玩家学习TAG打法
 */
export const TIGHT_AGGRESSIVE_ALICE: AIPersonality = {
  id: 'tight-aggressive-alice',
  name: '紧凶爱丽丝',
  description: '经典的紧凶打法代表，精挑细选手牌，但一旦参与就会持续施压。擅长位置战和价值下注。',
  
  // 基础参数 (TAG特征：选择性激进)
  aggression: 75,        // 高激进度 - 参与时很激进
  tightness: 75,         // 很紧 - 严格的手牌选择
  bluffFrequency: 35,    // 适度诈唬 - 有选择性
  adaptability: 60,      // 中等适应性

  // 街道特化参数
  preflopAggression: 70,    // 翻前激进 - 强牌重注
  postflopAggression: 80,   // 翻后非常激进
  riverCallDownFreq: 25,    // 河牌比较谨慎

  // 风险偏好 (TAG特征：计算精准的风险)
  riskTolerance: 65,        // 中高风险容忍度
  variancePreference: 45    // 偏好稳定收益
};

/**
 * 松凶查理 (Loose-Aggressive Charlie)
 * 特点：高入池率、持续施压、变化多样
 * 适合：高级玩家学习LAG打法和应对激进对手
 */
export const LOOSE_AGGRESSIVE_CHARLIE: AIPersonality = {
  id: 'loose-aggressive-charlie',
  name: '松凶查理',
  description: '典型的松凶玩家，喜欢参与大量底池并持续施压。打法变化多端，让对手难以摸透。',
  
  // 基础参数 (LAG特征：高参与度+高激进度)
  aggression: 85,        // 非常激进
  tightness: 35,         // 很松 - 参与很多手牌
  bluffFrequency: 65,    // 高诈唬频率
  adaptability: 70,      // 较高适应性

  // 街道特化参数  
  preflopAggression: 80,    // 翻前很激进
  postflopAggression: 90,   // 翻后极度激进
  riverCallDownFreq: 60,    // 河牌敢于跟注

  // 风险偏好 (LAG特征：喜欢高风险高回报)
  riskTolerance: 85,        // 高风险容忍度
  variancePreference: 80    // 喜欢高方差游戏
};

/**
 * 适应性戴安娜 (Adaptive Diana)
 * 特点：智能学习、动态调整、平衡策略
 * 适合：所有水平玩家，提供最具挑战性的对手
 */
export const ADAPTIVE_DIANA: AIPersonality = {
  id: 'adaptive-diana',
  name: '适应性戴安娜',
  description: '最智能的AI对手，能够学习玩家的打法并动态调整策略。平衡的基础打法配合强大的适应能力。',
  
  // 基础参数 (平衡特征：中庸但会调整)
  aggression: 55,        // 中等激进度 - 会根据对手调整
  tightness: 55,         // 中等紧松度 - 平衡的手牌选择
  bluffFrequency: 45,    // 平衡的诈唬频率
  adaptability: 95,      // 最高适应性 - 快速学习

  // 街道特化参数 (会动态调整)
  preflopAggression: 50,    // 基础翻前策略
  postflopAggression: 60,   // 基础翻后策略
  riverCallDownFreq: 45,    // 平衡的河牌策略

  // 风险偏好 (智能特征：根据情况调整)
  riskTolerance: 60,        // 中等风险容忍度
  variancePreference: 50    // 平衡的方差偏好
};

// =================== 角色集合和工具函数 ===================

/**
 * 所有预设角色的集合
 */
export const AI_PERSONALITIES: Record<string, AIPersonality> = {
  [BEGINNER_BOB.id]: BEGINNER_BOB,
  [TIGHT_AGGRESSIVE_ALICE.id]: TIGHT_AGGRESSIVE_ALICE,
  [LOOSE_AGGRESSIVE_CHARLIE.id]: LOOSE_AGGRESSIVE_CHARLIE,
  [ADAPTIVE_DIANA.id]: ADAPTIVE_DIANA
};

/**
 * 获取所有角色列表
 */
export const getAllPersonalities = (): AIPersonality[] => {
  return Object.values(AI_PERSONALITIES);
};

/**
 * 根据ID获取角色
 */
export const getPersonalityById = (id: string): AIPersonality | null => {
  return AI_PERSONALITIES[id] || null;
};

/**
 * 根据难度级别推荐角色
 */
export const getPersonalityByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): AIPersonality => {
  switch (difficulty) {
    case 'beginner':
      return BEGINNER_BOB;
    case 'intermediate':
      return TIGHT_AGGRESSIVE_ALICE;
    case 'advanced':
      return Math.random() > 0.5 ? LOOSE_AGGRESSIVE_CHARLIE : ADAPTIVE_DIANA;
    default:
      return BEGINNER_BOB;
  }
};

/**
 * 创建自定义角色
 */
export const createCustomPersonality = (
  id: string,
  name: string,
  description: string,
  parameters: Partial<Omit<AIPersonality, 'id' | 'name' | 'description'>>
): AIPersonality => {
  return {
    id,
    name,
    description,
    
    // 默认参数
    aggression: 50,
    tightness: 50,
    bluffFrequency: 30,
    adaptability: 40,
    preflopAggression: 50,
    postflopAggression: 50,
    riverCallDownFreq: 50,
    riskTolerance: 50,
    variancePreference: 50,
    
    // 应用自定义参数
    ...parameters
  };
};

/**
 * 角色参数验证
 */
export const validatePersonality = (personality: AIPersonality): boolean => {
  const parameters = [
    'aggression', 'tightness', 'bluffFrequency', 'adaptability',
    'preflopAggression', 'postflopAggression', 'riverCallDownFreq',
    'riskTolerance', 'variancePreference'
  ];
  
  return parameters.every(param => {
    const value = personality[param as keyof AIPersonality] as number;
    return typeof value === 'number' && value >= 0 && value <= 100;
  });
};

/**
 * 获取角色的打法风格描述
 */
export const getPlayingStyleDescription = (personality: AIPersonality): string => {
  const { aggression, tightness, bluffFrequency } = personality;
  
  // 分类打法风格
  let style = '';
  
  if (tightness >= 70 && aggression >= 70) {
    style = '紧凶 (TAG)';
  } else if (tightness <= 40 && aggression >= 70) {
    style = '松凶 (LAG)';
  } else if (tightness >= 70 && aggression <= 40) {
    style = '紧被动 (Tight-Passive)';
  } else if (tightness <= 40 && aggression <= 40) {
    style = '松被动 (Loose-Passive)';
  } else {
    style = '平衡 (Balanced)';
  }
  
  // 添加诈唬特征
  let bluffStyle = '';
  if (bluffFrequency >= 60) {
    bluffStyle = '，诈唬频繁';
  } else if (bluffFrequency <= 20) {
    bluffStyle = '，很少诈唬';
  } else {
    bluffStyle = '，适度诈唬';
  }
  
  return style + bluffStyle;
};

/**
 * 角色强度评估
 */
export const getPersonalityStrength = (personality: AIPersonality): number => {
  const { aggression, tightness, adaptability, bluffFrequency } = personality;
  
  // 计算平衡度 (距离理想值的偏差)
  const idealAggression = 65;
  const idealTightness = 60;
  const idealBluffFreq = 40;
  
  const balanceScore = 100 - (
    Math.abs(aggression - idealAggression) + 
    Math.abs(tightness - idealTightness) + 
    Math.abs(bluffFrequency - idealBluffFreq)
  ) / 3;
  
  // 适应性加成
  const adaptabilityBonus = adaptability / 100 * 20;
  
  // 综合强度 (0-100)
  return Math.max(0, Math.min(100, balanceScore + adaptabilityBonus));
};

/**
 * 角色匹配度计算 (用于选择合适的练习对手)
 */
export const calculatePersonalityMatch = (
  playerStats: {
    vpip: number;     // 玩家入池率
    pfr: number;      // 玩家翻前加注率
    aggFactor: number; // 玩家激进因子
  },
  aiPersonality: AIPersonality
): number => {
  // 将AI参数转换为可比较的统计数据
  const aiVPIP = 100 - aiPersonality.tightness;
  const aiPFR = aiPersonality.preflopAggression;
  const aiAggFactor = aiPersonality.aggression / 25; // 转换为类似激进因子的范围
  
  // 计算差异度
  const vpipDiff = Math.abs(playerStats.vpip - aiVPIP) / 50;
  const pfrDiff = Math.abs(playerStats.pfr - aiPFR) / 50;
  const aggDiff = Math.abs(playerStats.aggFactor - aiAggFactor) / 2;
  
  // 匹配度 (0-100, 100表示完全匹配)
  const matchScore = 100 - ((vpipDiff + pfrDiff + aggDiff) / 3) * 100;
  
  return Math.max(0, Math.min(100, matchScore));
};

// =================== 角色进化和学习 ===================

/**
 * 角色学习接口 - 用于适应性戴安娜等智能角色
 */
export interface PersonalityLearning {
  // 学习数据
  sessionsPlayed: number;
  winRate: number;
  
  // 对手行为模式识别
  opponentTendencies: {
    aggression: number;
    tightness: number;
    bluffFrequency: number;
  };
  
  // 参数调整历史
  adjustmentHistory: {
    timestamp: number;
    parameter: string;
    oldValue: number;
    newValue: number;
    reason: string;
  }[];
}

/**
 * 创建学习型角色实例
 */
export const createLearningPersonality = (
  basePersonality: AIPersonality,
  learningData?: Partial<PersonalityLearning>
): AIPersonality & { learning: PersonalityLearning } => {
  const learning: PersonalityLearning = {
    sessionsPlayed: 0,
    winRate: 0.5,
    opponentTendencies: {
      aggression: 50,
      tightness: 50,
      bluffFrequency: 30
    },
    adjustmentHistory: [],
    ...learningData
  };
  
  return {
    ...basePersonality,
    learning
  };
};

/**
 * 应用学习调整到角色参数
 */
export const applyLearningAdjustments = (
  personality: AIPersonality & { learning: PersonalityLearning },
  opponentStats: { vpip: number; pfr: number; aggFactor: number }
): AIPersonality => {
  if (personality.adaptability < 50) {
    return personality; // 低适应性角色不进行学习调整
  }
  
  const adjustedPersonality = { ...personality };
  const learningRate = personality.adaptability / 100 * 0.1; // 10%最大调整率
  
  // 根据对手的紧松度调整自己的激进度
  if (opponentStats.vpip < 20) { // 对手很紧
    adjustedPersonality.aggression = Math.min(100, 
      adjustedPersonality.aggression + learningRate * 20
    );
  } else if (opponentStats.vpip > 40) { // 对手很松
    adjustedPersonality.aggression = Math.max(0,
      adjustedPersonality.aggression - learningRate * 15
    );
  }
  
  // 根据对手的激进度调整自己的跟注频率
  if (opponentStats.aggFactor > 3) { // 对手很激进
    adjustedPersonality.riverCallDownFreq = Math.max(0,
      adjustedPersonality.riverCallDownFreq - learningRate * 25
    );
  }
  
  return adjustedPersonality;
};

export default {
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
};