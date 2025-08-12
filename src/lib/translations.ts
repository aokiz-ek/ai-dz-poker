// 中英文翻译工具
import { Position, ActionType, GameStage } from '@/types/poker';
import { AchievementCategory, AchievementRarity } from '@/types/achievements';

// 扑克位置翻译
export const getPositionChinese = (position: Position): string => {
  const translations: Record<Position, string> = {
    'BTN': '按钮位',
    'SB': '小盲位', 
    'BB': '大盲位',
    'UTG': '枪口位',
    'UTG1': '枪口位+1',
    'MP': '中位',
    'MP1': '中位+1',
    'CO': '关煞位'
  };
  return translations[position] || position;
};

// 动作类型翻译
export const getActionChinese = (action: ActionType): string => {
  const translations: Record<ActionType, string> = {
    'fold': '弃牌',
    'check': '过牌', 
    'call': '跟注',
    'bet': '下注',
    'raise': '加注',
    'all-in': '全押'
  };
  return translations[action] || action;
};

// 游戏阶段翻译
export const getStageChinese = (stage: GameStage): string => {
  const translations: Record<GameStage, string> = {
    'preflop': '翻牌前',
    'flop': '翻牌',
    'turn': '转牌', 
    'river': '河牌',
    'showdown': '摊牌'
  };
  return translations[stage] || stage;
};

// 难度等级翻译
export const getDifficultyChinese = (difficulty: 'easy' | 'medium' | 'hard'): string => {
  const translations = {
    'easy': '简单',
    'medium': '中等', 
    'hard': '困难'
  };
  return translations[difficulty] || difficulty;
};

// 对手类型翻译
export const getOpponentTypeChinese = (type: 'tight' | 'loose' | 'aggressive' | 'passive'): string => {
  const translations = {
    'tight': '紧型',
    'loose': '松型',
    'aggressive': '凶型',
    'passive': '被动型'
  };
  return translations[type] || type;
};

// 成就类别翻译
export const getAchievementCategoryChinese = (category: AchievementCategory): string => {
  const translations: Record<AchievementCategory, string> = {
    'training': '训练相关',
    'performance': '表现相关', 
    'consistency': '一致性',
    'speed': '速度相关',
    'mastery': '掌握度',
    'special': '特殊成就'
  };
  return translations[category] || category;
};

// 成就稀有度翻译
export const getAchievementRarityChinese = (rarity: AchievementRarity): string => {
  const translations: Record<AchievementRarity, string> = {
    'common': '普通',
    'uncommon': '罕见',
    'rare': '稀有', 
    'epic': '史诗',
    'legendary': '传说'
  };
  return translations[rarity] || rarity;
};

// 反馈类型翻译
export const getFeedbackTypeChinese = (type: 'excellent' | 'good' | 'decent' | 'poor'): string => {
  const translations = {
    'excellent': '优秀',
    'good': '良好',
    'decent': '一般', 
    'poor': '较差'
  };
  return translations[type] || type;
};

// 训练状态翻译
export const getTrainingStateChinese = (state: 'loading' | 'instruction' | 'decision' | 'feedback' | 'summary'): string => {
  const translations = {
    'loading': '加载中',
    'instruction': '准备阶段',
    'decision': '决策阶段',
    'feedback': '反馈阶段', 
    'summary': '总结阶段'
  };
  return translations[state] || state;
};

// 手牌强度翻译
export const getHandStrengthChinese = (strength: 'premium' | 'strong' | 'medium' | 'weak' | 'trash'): string => {
  const translations = {
    'premium': '顶级手牌',
    'strong': '强牌',
    'medium': '中等牌力',
    'weak': '弱牌',
    'trash': '垃圾牌'
  };
  return translations[strength] || strength;
};

// 时间格式化（保持中文）
export const formatTimeChinese = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}分${secs}秒`;
  }
  return `${secs}秒`;
};

// 分数评价翻译
export const getScoreGradeChinese = (score: number): string => {
  if (score >= 95) return '完美';
  if (score >= 85) return '优秀';
  if (score >= 75) return '良好';
  if (score >= 60) return '及格';
  return '需要改进';
};

// 筹码量级别翻译
export const getStackSizeChinese = (stackSize: number): string => {
  if (stackSize >= 100) return '深筹码';
  if (stackSize >= 50) return '中等筹码';
  if (stackSize >= 20) return '浅筹码';
  return '极浅筹码';
};