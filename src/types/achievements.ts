// 成就系统类型定义

// 成就类别枚举
export type AchievementCategory = 
  | 'training'      // 训练相关
  | 'performance'   // 表现相关
  | 'consistency'   // 一致性相关
  | 'speed'        // 速度相关
  | 'mastery'      // 掌握度相关
  | 'special';     // 特殊成就

// 成就难度等级
export type AchievementRarity = 
  | 'common'       // 普通 - 铜色
  | 'uncommon'     // 罕见 - 银色
  | 'rare'         // 稀有 - 金色
  | 'epic'         // 史诗 - 紫色
  | 'legendary';   // 传说 - 橙色

// 成就触发条件类型
export type AchievementTriggerType =
  | 'session_complete'     // 完成训练会话
  | 'score_achieved'       // 达到特定分数
  | 'streak_achieved'      // 达到连胜
  | 'hands_completed'      // 完成手牌数量
  | 'scenario_mastered'    // 掌握场景
  | 'speed_record'         // 速度记录
  | 'perfect_session'      // 完美会话
  | 'improvement_shown'    // 展现进步
  | 'milestone_reached';   // 达到里程碑

// 成就定义
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;                    // 图标emoji或图片路径
  
  // 解锁条件
  triggerType: AchievementTriggerType;
  conditions: {
    [key: string]: number | string | boolean;
  };
  
  // 奖励
  rewards: {
    title?: string;               // 解锁称号
    badge?: string;              // 解锁徽章
    experience?: number;         // 经验值奖励
  };
  
  // 元数据
  isHidden: boolean;             // 是否为隐藏成就
  isRepeatable: boolean;         // 是否可重复获得
  parentAchievementId?: string;  // 前置成就ID
  createdAt: Date;
}

// 成就进度追踪
export interface AchievementProgress {
  achievementId: string;
  userId?: string;
  
  // 进度数据
  currentProgress: number;       // 当前进度值
  targetProgress: number;        // 目标进度值
  progressPercentage: number;    // 进度百分比 (0-100)
  
  // 状态
  isUnlocked: boolean;
  isCompleted: boolean;
  unlockedAt?: Date;
  completedAt?: Date;
  
  // 最后更新
  lastUpdated: Date;
}

// 成就解锁事件
export interface AchievementUnlock {
  achievementId: string;
  userId?: string;
  
  // 解锁上下文
  triggerEvent: string;          // 触发事件类型
  triggerData: any;              // 触发事件数据
  sessionId?: string;            // 相关训练会话ID
  
  // 时间戳
  unlockedAt: Date;
  
  // 通知状态
  hasBeenShown: boolean;         // 是否已展示给用户
}

// 称号系统
export interface Title {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  
  // 解锁条件
  requiredAchievements: string[]; // 需要的成就ID列表
  
  // 显示样式
  color: string;                 // 称号颜色
  bgColor: string;              // 背景色
  
  isActive: boolean;            // 是否为当前激活称号
  unlockedAt?: Date;
}

// 徽章系统
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  
  // 等级系统
  level: number;                // 徽章等级 (1-5)
  maxLevel: number;             // 最大等级
  
  // 进度
  currentExp: number;           // 当前经验值
  requiredExp: number;          // 升级所需经验值
  
  // 解锁状态
  isUnlocked: boolean;
  unlockedAt?: Date;
  lastUpgraded?: Date;
}

// 用户成就总览
export interface UserAchievements {
  userId?: string;
  
  // 统计数据
  totalAchievements: number;     // 总成就数
  unlockedAchievements: number;  // 已解锁成就数
  completionRate: number;        // 完成率百分比
  
  // 经验系统
  totalExperience: number;       // 总经验值
  currentLevel: number;          // 当前等级
  experienceToNext: number;      // 到下一等级的经验值
  
  // 分类统计
  categoryProgress: {
    [category in AchievementCategory]: {
      total: number;
      unlocked: number;
      percentage: number;
    };
  };
  
  // 稀有度统计
  rarityProgress: {
    [rarity in AchievementRarity]: {
      total: number;
      unlocked: number;
    };
  };
  
  // 当前状态
  activeTitle?: Title;           // 当前使用的称号
  recentUnlocks: AchievementUnlock[]; // 最近解锁的成就
  
  // 更新时间
  lastUpdated: Date;
}

// 成就系统事件
export interface AchievementEvent {
  type: 'unlock' | 'progress' | 'level_up' | 'title_earned';
  achievementId?: string;
  progress?: number;
  data?: any;
  timestamp: Date;
}

// 成就系统配置
export interface AchievementConfig {
  // 经验值设置
  baseExpPerLevel: number;       // 每级基础经验值
  levelMultiplier: number;       // 等级乘数
  
  // UI设置
  showProgressNotifications: boolean; // 显示进度通知
  showUnlockAnimations: boolean;     // 显示解锁动画
  notificationDuration: number;      // 通知持续时间(ms)
  
  // 数据设置
  maxRecentUnlocks: number;      // 最大最近解锁记录数
  saveProgressInterval: number;   // 进度保存间隔(ms)
}

// 成就检查结果
export interface AchievementCheckResult {
  newUnlocks: Achievement[];      // 新解锁的成就
  progressUpdates: AchievementProgress[]; // 进度更新
  levelUps: number[];            // 等级提升
  newTitles: Title[];           // 新获得称号
}

// 成就查询条件
export interface AchievementQuery {
  category?: AchievementCategory;
  rarity?: AchievementRarity;
  isUnlocked?: boolean;
  isHidden?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'rarity' | 'unlockedAt' | 'progress';
  sortOrder?: 'asc' | 'desc';
}