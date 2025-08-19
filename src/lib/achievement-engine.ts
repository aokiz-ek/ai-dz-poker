import { 
  Achievement, 
  AchievementProgress, 
  AchievementUnlock, 
  UserAchievements, 
  AchievementCheckResult,
  Title,
  Badge,
  AchievementEvent,
  AchievementConfig
} from '@/types/achievements';
import { SessionSummary } from '@/types/training';

export class AchievementEngine {
  private static config: AchievementConfig = {
    baseExpPerLevel: 100,
    levelMultiplier: 1.5,
    showProgressNotifications: true,
    showUnlockAnimations: true,
    notificationDuration: 3000,
    maxRecentUnlocks: 10,
    saveProgressInterval: 1000
  };

  // 预定义成就列表
  private static achievements: Achievement[] = [
    // === 新手成就 ===
    {
      id: 'first_session',
      name: '初次体验',
      description: '完成你的第一个训练会话',
      category: 'training',
      rarity: 'common',
      icon: '🎯',
      triggerType: 'session_complete',
      conditions: { sessionsCompleted: 1 },
      rewards: { experience: 50, title: '新手玩家' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },
    {
      id: 'first_perfect_score',
      name: '完美开始',
      description: '在训练中首次获得100分',
      category: 'performance',
      rarity: 'uncommon',
      icon: '💯',
      triggerType: 'score_achieved',
      conditions: { perfectScores: 1 },
      rewards: { experience: 100, badge: 'perfectionist' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },

    // === 训练成就 ===
    {
      id: 'training_dedication',
      name: '勤学苦练',
      description: '完成10个训练会话',
      category: 'training',
      rarity: 'common',
      icon: '💪',
      triggerType: 'session_complete',
      conditions: { sessionsCompleted: 10 },
      rewards: { experience: 200 },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },
    {
      id: 'training_master',
      name: '训练大师',
      description: '完成50个训练会话',
      category: 'training',
      rarity: 'rare',
      icon: '🏆',
      triggerType: 'session_complete',
      conditions: { sessionsCompleted: 50 },
      rewards: { experience: 500, title: '训练大师' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },

    // === 表现成就 ===
    {
      id: 'consistent_performer',
      name: '稳定发挥',
      description: '连续5个会话平均分80+',
      category: 'consistency',
      rarity: 'uncommon',
      icon: '📈',
      triggerType: 'streak_achieved',
      conditions: { consistentSessions: 5, minAverage: 80 },
      rewards: { experience: 150, badge: 'consistent' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },
    {
      id: 'excellence_achieved',
      name: '追求卓越',
      description: '单次会话平均分达到95+',
      category: 'performance',
      rarity: 'rare',
      icon: '⭐',
      triggerType: 'score_achieved',
      conditions: { sessionAverage: 95 },
      rewards: { experience: 300, title: '卓越玩家' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },

    // === 速度成就 ===
    {
      id: 'lightning_fast',
      name: '闪电决策',
      description: '在3秒内做出10个正确决策',
      category: 'speed',
      rarity: 'uncommon',
      icon: '⚡',
      triggerType: 'speed_record',
      conditions: { fastDecisions: 10, maxTime: 3000 },
      rewards: { experience: 120, badge: 'speedster' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },

    // === 掌握度成就 ===
    {
      id: 'scenario_master_btn',
      name: 'Button位专家',
      description: '在Button vs BB场景中获得90+分',
      category: 'mastery',
      rarity: 'uncommon',
      icon: '🎲',
      triggerType: 'scenario_mastered',
      conditions: { scenarioId: 'btn-vs-bb-deep', minScore: 90 },
      rewards: { experience: 150, title: 'Button专家' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },
    {
      id: 'all_scenarios_mastered',
      name: 'GTO大师',
      description: '在所有6个场景中都获得85+分',
      category: 'mastery',
      rarity: 'legendary',
      icon: '👑',
      triggerType: 'milestone_reached',
      conditions: { allScenariosScore: 85, totalScenarios: 6 },
      rewards: { experience: 1000, title: 'GTO大师' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },

    // === 特殊成就 ===
    {
      id: 'perfect_session',
      name: '无懈可击',
      description: '完成一个零错误的训练会话',
      category: 'special',
      rarity: 'epic',
      icon: '💎',
      triggerType: 'perfect_session',
      conditions: { mistakes: 0, minHands: 10 },
      rewards: { experience: 500, title: '完美主义者' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },
    {
      id: 'improvement_champion',
      name: '进步之星',
      description: '单次会话进步超过20分',
      category: 'special',
      rarity: 'rare',
      icon: '🌟',
      triggerType: 'improvement_shown',
      conditions: { scoreImprovement: 20 },
      rewards: { experience: 250, badge: 'improver' },
      isHidden: false,
      isRepeatable: false,
      createdAt: new Date()
    },

    // === 隐藏成就 ===
    {
      id: 'easter_egg_found',
      name: '隐藏彩蛋',
      description: '发现了一个隐藏的秘密',
      category: 'special',
      rarity: 'legendary',
      icon: '🥚',
      triggerType: 'milestone_reached',
      conditions: { easterEgg: true },
      rewards: { experience: 777, title: '探索者' },
      isHidden: true,
      isRepeatable: false,
      createdAt: new Date()
    }
  ];

  // 预定义称号
  private static titles: Title[] = [
    {
      id: 'newbie',
      name: '新手玩家',
      description: '刚刚开始GTO之旅',
      icon: '🔰',
      rarity: 'common',
      requiredAchievements: ['first_session'],
      color: '#22C55E',
      bgColor: '#DCFCE7',
      isActive: false
    },
    {
      id: 'training_master',
      name: '训练大师',
      description: '经验丰富的训练者',
      icon: '🏆',
      rarity: 'rare',
      requiredAchievements: ['training_master'],
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      isActive: false
    },
    {
      id: 'gto_master',
      name: 'GTO大师',
      description: '掌握了所有核心概念',
      icon: '👑',
      rarity: 'legendary',
      requiredAchievements: ['all_scenarios_mastered'],
      color: '#A855F7',
      bgColor: '#F3E8FF',
      isActive: false
    }
  ];

  // 用户数据管理
  private static userAchievements: UserAchievements | null = null;
  private static progressData: Map<string, AchievementProgress> = new Map();
  private static recentUnlocks: AchievementUnlock[] = [];

  // 初始化成就系统
  static initialize(): void {
    this.loadUserData();
    this.initializeProgress();
  }

  // 加载用户数据
  private static loadUserData(): void {
    try {
      const saved = localStorage.getItem('user-achievements');
      if (saved) {
        this.userAchievements = JSON.parse(saved);
        // 确保数据结构完整
        if (!this.userAchievements?.categoryProgress) {
          this.calculateUserStats();
        }
      } else {
        this.createNewUserProfile();
      }

      // 加载进度数据
      const progressSaved = localStorage.getItem('achievement-progress');
      if (progressSaved) {
        const progressArray: AchievementProgress[] = JSON.parse(progressSaved);
        progressArray.forEach(progress => {
          this.progressData.set(progress.achievementId, progress);
        });
      }

      // 加载最近解锁
      const unlocksSaved = localStorage.getItem('recent-unlocks');
      if (unlocksSaved) {
        this.recentUnlocks = JSON.parse(unlocksSaved);
      }
    } catch (error) {
      console.error('加载成就数据失败:', error);
      this.createNewUserProfile();
    }
  }

  // 创建新用户档案
  private static createNewUserProfile(): void {
    this.userAchievements = {
      totalAchievements: this.achievements.length,
      unlockedAchievements: 0,
      completionRate: 0,
      totalExperience: 0,
      currentLevel: 1,
      experienceToNext: this.config.baseExpPerLevel,
      categoryProgress: {
        training: { total: 0, unlocked: 0, percentage: 0 },
        performance: { total: 0, unlocked: 0, percentage: 0 },
        consistency: { total: 0, unlocked: 0, percentage: 0 },
        speed: { total: 0, unlocked: 0, percentage: 0 },
        mastery: { total: 0, unlocked: 0, percentage: 0 },
        special: { total: 0, unlocked: 0, percentage: 0 }
      },
      rarityProgress: {
        common: { total: 0, unlocked: 0 },
        uncommon: { total: 0, unlocked: 0 },
        rare: { total: 0, unlocked: 0 },
        epic: { total: 0, unlocked: 0 },
        legendary: { total: 0, unlocked: 0 }
      },
      recentUnlocks: [],
      lastUpdated: new Date()
    };

    this.calculateUserStats();
    this.saveUserData();
  }

  // 初始化成就进度
  private static initializeProgress(): void {
    this.achievements.forEach(achievement => {
      if (!this.progressData.has(achievement.id)) {
        const progress: AchievementProgress = {
          achievementId: achievement.id,
          currentProgress: 0,
          targetProgress: this.getTargetProgress(achievement),
          progressPercentage: 0,
          isUnlocked: false,
          isCompleted: false,
          lastUpdated: new Date()
        };
        this.progressData.set(achievement.id, progress);
      }
    });
  }

  // 获取目标进度值
  private static getTargetProgress(achievement: Achievement): number {
    const conditions = achievement.conditions;
    
    // 根据触发类型确定目标进度
    switch (achievement.triggerType) {
      case 'session_complete':
        return conditions.sessionsCompleted as number || 1;
      case 'score_achieved':
        return conditions.sessionAverage as number || conditions.perfectScores as number || 100;
      case 'hands_completed':
        return conditions.handsCompleted as number || 100;
      default:
        return 1;
    }
  }

  // 检查训练会话完成后的成就
  static checkSessionAchievements(sessionSummary: SessionSummary): AchievementCheckResult {
    const result: AchievementCheckResult = {
      newUnlocks: [],
      progressUpdates: [],
      levelUps: [],
      newTitles: []
    };

    // 更新训练相关成就进度
    this.updateTrainingProgress(sessionSummary, result);
    
    // 更新表现相关成就进度
    this.updatePerformanceProgress(sessionSummary, result);
    
    // 更新速度相关成就进度
    this.updateSpeedProgress(sessionSummary, result);
    
    // 检查场景掌握成就
    this.checkScenarioMastery(sessionSummary, result);
    
    // 检查特殊成就
    this.checkSpecialAchievements(sessionSummary, result);

    // 处理新解锁的成就
    if (result.newUnlocks.length > 0) {
      this.processNewUnlocks(result.newUnlocks);
    }

    // 保存数据
    this.saveUserData();
    
    return result;
  }

  // 更新训练进度
  private static updateTrainingProgress(summary: SessionSummary, result: AchievementCheckResult): void {
    const currentSessions = this.getCurrentSessionCount() + 1;
    
    // 检查训练会话成就
    const trainingAchievements = this.achievements.filter(a => 
      a.triggerType === 'session_complete' && !this.isAchievementUnlocked(a.id)
    );

    trainingAchievements.forEach(achievement => {
      const targetSessions = achievement.conditions.sessionsCompleted as number;
      if (currentSessions >= targetSessions) {
        result.newUnlocks.push(achievement);
      } else {
        // 更新进度
        const progress = this.progressData.get(achievement.id)!;
        progress.currentProgress = currentSessions;
        progress.progressPercentage = (currentSessions / targetSessions) * 100;
        progress.lastUpdated = new Date();
        result.progressUpdates.push(progress);
      }
    });
  }

  // 更新表现进度
  private static updatePerformanceProgress(summary: SessionSummary, result: AchievementCheckResult): void {
    // 检查完美分数
    if (summary.averageScore === 100) {
      this.checkAchievement('first_perfect_score', result);
    }

    // 检查高分成就
    if (summary.averageScore >= 95) {
      this.checkAchievement('excellence_achieved', result);
    }

    // 检查一致性表现 (需要存储历史数据)
    this.checkConsistencyAchievements(summary, result);
  }

  // 更新速度进度
  private static updateSpeedProgress(summary: SessionSummary, result: AchievementCheckResult): void {
    // 这里需要从会话数据中获取快速决策信息
    // 简化实现：假设每个优秀决策都是快速的
    const fastDecisions = summary.performance.excellent;
    
    const lightningAchievement = this.achievements.find(a => a.id === 'lightning_fast');
    if (lightningAchievement && !this.isAchievementUnlocked('lightning_fast')) {
      const progress = this.progressData.get('lightning_fast')!;
      progress.currentProgress = Math.max(progress.currentProgress, fastDecisions);
      
      const target = lightningAchievement.conditions.fastDecisions as number;
      if (progress.currentProgress >= target) {
        result.newUnlocks.push(lightningAchievement);
      } else {
        progress.progressPercentage = (progress.currentProgress / target) * 100;
        progress.lastUpdated = new Date();
        result.progressUpdates.push(progress);
      }
    }
  }

  // 检查场景掌握
  private static checkScenarioMastery(summary: SessionSummary, result: AchievementCheckResult): void {
    // 根据会话ID判断场景类型
    // 这里需要从SessionSummary中获取场景信息
    // 简化实现
    if (summary.averageScore >= 90) {
      // 假设这是 Button vs BB 场景
      this.checkAchievement('scenario_master_btn', result);
    }
  }

  // 检查特殊成就
  private static checkSpecialAchievements(summary: SessionSummary, result: AchievementCheckResult): void {
    // 完美会话（零错误）
    if (summary.performance.mistakes === 0 && summary.handsCompleted >= 10) {
      this.checkAchievement('perfect_session', result);
    }

    // 检查进步成就
    const lastSessionScore = this.getLastSessionScore();
    if (lastSessionScore > 0 && summary.averageScore - lastSessionScore >= 20) {
      this.checkAchievement('improvement_champion', result);
    }
  }

  // 检查单个成就
  private static checkAchievement(achievementId: string, result: AchievementCheckResult): void {
    if (!this.isAchievementUnlocked(achievementId)) {
      const achievement = this.achievements.find(a => a.id === achievementId);
      if (achievement) {
        result.newUnlocks.push(achievement);
      }
    }
  }

  // 处理新解锁成就
  private static processNewUnlocks(newUnlocks: Achievement[]): void {
    newUnlocks.forEach(achievement => {
      // 标记为已解锁
      const progress = this.progressData.get(achievement.id)!;
      progress.isUnlocked = true;
      progress.isCompleted = true;
      progress.progressPercentage = 100;
      progress.unlockedAt = new Date();
      progress.completedAt = new Date();

      // 添加到最近解锁列表
      const unlock: AchievementUnlock = {
        achievementId: achievement.id,
        triggerEvent: achievement.triggerType,
        triggerData: {},
        unlockedAt: new Date(),
        hasBeenShown: false
      };
      
      this.recentUnlocks.unshift(unlock);
      if (this.recentUnlocks.length > this.config.maxRecentUnlocks) {
        this.recentUnlocks = this.recentUnlocks.slice(0, this.config.maxRecentUnlocks);
      }

      // 添加经验值
      if (achievement.rewards.experience) {
        this.addExperience(achievement.rewards.experience);
      }
    });

    this.calculateUserStats();
  }

  // 添加经验值
  private static addExperience(exp: number): void {
    if (!this.userAchievements) return;

    this.userAchievements.totalExperience += exp;
    
    // 检查等级提升
    let newLevel = this.userAchievements.currentLevel;
    let expToNext = this.userAchievements.experienceToNext;
    
    while (this.userAchievements.totalExperience >= this.getExpRequiredForLevel(newLevel + 1)) {
      newLevel++;
    }
    
    if (newLevel > this.userAchievements.currentLevel) {
      this.userAchievements.currentLevel = newLevel;
    }
    
    // 计算到下一级的经验
    const expForNextLevel = this.getExpRequiredForLevel(newLevel + 1);
    this.userAchievements.experienceToNext = expForNextLevel - this.userAchievements.totalExperience;
  }

  // 获取等级所需经验
  private static getExpRequiredForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(this.config.baseExpPerLevel * Math.pow(this.config.levelMultiplier, level - 1));
  }

  // 计算用户统计数据
  private static calculateUserStats(): void {
    if (!this.userAchievements) return;

    let totalUnlocked = 0;
    
    // 重置分类统计
    Object.keys(this.userAchievements.categoryProgress).forEach(category => {
      this.userAchievements!.categoryProgress[category as keyof typeof this.userAchievements.categoryProgress] = {
        total: 0,
        unlocked: 0,
        percentage: 0
      };
    });

    // 重置稀有度统计
    Object.keys(this.userAchievements.rarityProgress).forEach(rarity => {
      this.userAchievements!.rarityProgress[rarity as keyof typeof this.userAchievements.rarityProgress] = {
        total: 0,
        unlocked: 0
      };
    });

    // 统计各分类和稀有度
    this.achievements.forEach(achievement => {
      // 分类统计
      this.userAchievements!.categoryProgress[achievement.category].total++;
      
      // 稀有度统计
      this.userAchievements!.rarityProgress[achievement.rarity].total++;
      
      if (this.isAchievementUnlocked(achievement.id)) {
        totalUnlocked++;
        this.userAchievements!.categoryProgress[achievement.category].unlocked++;
        this.userAchievements!.rarityProgress[achievement.rarity].unlocked++;
      }
    });

    // 计算百分比
    Object.keys(this.userAchievements.categoryProgress).forEach(category => {
      const cat = this.userAchievements!.categoryProgress[category as keyof typeof this.userAchievements.categoryProgress];
      cat.percentage = cat.total > 0 ? Math.round((cat.unlocked / cat.total) * 100) : 0;
    });

    this.userAchievements.unlockedAchievements = totalUnlocked;
    this.userAchievements.completionRate = Math.round((totalUnlocked / this.achievements.length) * 100);
    this.userAchievements.lastUpdated = new Date();
  }

  // 保存用户数据
  private static saveUserData(): void {
    try {
      if (this.userAchievements) {
        localStorage.setItem('user-achievements', JSON.stringify(this.userAchievements));
      }
      
      const progressArray = Array.from(this.progressData.values());
      localStorage.setItem('achievement-progress', JSON.stringify(progressArray));
      
      localStorage.setItem('recent-unlocks', JSON.stringify(this.recentUnlocks));
    } catch (error) {
      console.error('保存成就数据失败:', error);
    }
  }

  // 辅助方法
  private static isAchievementUnlocked(achievementId: string): boolean {
    return this.progressData.get(achievementId)?.isUnlocked || false;
  }

  private static getCurrentSessionCount(): number {
    // 从训练数据中获取
    // 简化实现
    return parseInt(localStorage.getItem('total-sessions') || '0');
  }

  private static getLastSessionScore(): number {
    // 从训练历史中获取
    // 简化实现
    return parseInt(localStorage.getItem('last-session-score') || '0');
  }

  private static checkConsistencyAchievements(summary: SessionSummary, result: AchievementCheckResult): void {
    // 检查连续高分表现
    // 简化实现 - 需要存储历史会话数据
    const consistentAchievement = this.achievements.find(a => a.id === 'consistent_performer');
    if (consistentAchievement && !this.isAchievementUnlocked('consistent_performer')) {
      if (summary.averageScore >= 80) {
        // 这里应该检查连续5个会话的平均分
        // 简化实现
        this.checkAchievement('consistent_performer', result);
      }
    }
  }

  // 公共 API
  static getAllAchievements(): Achievement[] {
    return [...this.achievements];
  }

  static getUserAchievements(): UserAchievements | null {
    return this.userAchievements;
  }

  static getAchievementProgress(achievementId: string): AchievementProgress | null {
    return this.progressData.get(achievementId) || null;
  }

  static getRecentUnlocks(): AchievementUnlock[] {
    return [...this.recentUnlocks];
  }

  static markUnlockAsShown(achievementId: string): void {
    const unlock = this.recentUnlocks.find(u => u.achievementId === achievementId);
    if (unlock) {
      unlock.hasBeenShown = true;
      this.saveUserData();
    }
  }

  static getAvailableTitles(): Title[] {
    return this.titles.filter(title => {
      return title.requiredAchievements.every(achId => this.isAchievementUnlocked(achId));
    });
  }

  static checkAchievementUnlocked(achievementId: string): boolean {
    return this.isAchievementUnlocked(achievementId);
  }

  static setActiveTitle(titleId: string): boolean {
    const title = this.titles.find(t => t.id === titleId);
    if (title && this.getAvailableTitles().includes(title)) {
      // 重置所有称号
      this.titles.forEach(t => t.isActive = false);
      title.isActive = true;
      
      if (this.userAchievements) {
        this.userAchievements.activeTitle = title;
        this.saveUserData();
      }
      return true;
    }
    return false;
  }
}