import { HandStatistics } from '@/types/hand-history';
import { UserProgress } from '@/lib/storage/interfaces';
import { DynamicScenarioGenerator, PersonalizedScenario } from './dynamic-scenario-generator';

/**
 * 学习路径管理器
 * 智能推荐下一个训练场景，构建个性化学习路径
 */
export class LearningPathManager {
  private scenarioGenerator: DynamicScenarioGenerator;
  private learningGraph: LearningGraph;

  constructor() {
    this.scenarioGenerator = new DynamicScenarioGenerator();
    this.learningGraph = this.initializeLearningGraph();
  }

  // =================== 主要推荐接口 ===================

  /**
   * 推荐下一个训练场景
   */
  async recommendNextScenario(
    userProgress: UserProgress,
    recentStatistics: HandStatistics,
    preferences?: LearningPreferences
  ): Promise<ScenarioRecommendation> {
    // 1. 评估当前技能水平
    const skillAssessment = this.assessCurrentSkills(userProgress, recentStatistics);
    
    // 2. 识别学习优先级
    const priorities = this.calculateLearningPriorities(skillAssessment, preferences);
    
    // 3. 选择最佳场景
    const recommendedScenario = await this.selectOptimalScenario(priorities, userProgress);
    
    // 4. 生成推荐理由
    const recommendation: ScenarioRecommendation = {
      scenario: recommendedScenario,
      confidence: this.calculateRecommendationConfidence(recommendedScenario, skillAssessment),
      reasoning: this.generateRecommendationReasoning(recommendedScenario, skillAssessment, priorities),
      expectedImprovement: this.estimateImprovement(recommendedScenario, skillAssessment),
      alternatives: await this.generateAlternatives(recommendedScenario, priorities, userProgress),
      estimatedStudyTime: this.estimateStudyTime(recommendedScenario, skillAssessment)
    };

    return recommendation;
  }

  /**
   * 生成完整学习路径
   */
  async generateLearningPath(
    userProgress: UserProgress,
    recentStatistics: HandStatistics,
    targetDuration: number = 30 // 天数
  ): Promise<LearningPath> {
    const skillAssessment = this.assessCurrentSkills(userProgress, recentStatistics);
    const path: LearningPath = {
      totalDuration: targetDuration,
      phases: [],
      totalScenarios: 0,
      estimatedImprovement: {},
      milestones: []
    };

    // 分阶段规划学习路径
    const phases = this.planLearningPhases(skillAssessment, targetDuration);
    
    for (const phase of phases) {
      const phaseScenarios = await this.generatePhaseScenarios(phase, skillAssessment, userProgress);
      
      path.phases.push({
        name: phase.name,
        description: phase.description,
        duration: phase.duration,
        scenarios: phaseScenarios,
        objectives: phase.objectives,
        expectedOutcome: phase.expectedOutcome
      });
      
      path.totalScenarios += phaseScenarios.length;
    }

    // 设置里程碑
    path.milestones = this.generateMilestones(path, skillAssessment);
    path.estimatedImprovement = this.calculatePathImprovement(path, skillAssessment);

    return path;
  }

  /**
   * 更新学习进度并调整路径
   */
  async updateLearningProgress(
    userProgress: UserProgress,
    completedScenario: string,
    performance: ScenarioPerformance,
    currentPath?: LearningPath
  ): Promise<LearningPathUpdate> {
    // 1. 记录表现数据
    const updatedProgress = this.updateProgressWithPerformance(userProgress, completedScenario, performance);
    
    // 2. 重新评估技能
    const newSkillAssessment = this.assessProgressChange(userProgress, performance);
    
    // 3. 调整学习路径
    const pathAdjustments = currentPath ? 
      this.adjustLearningPath(currentPath, newSkillAssessment, performance) : 
      [];

    return {
      updatedProgress,
      skillChanges: newSkillAssessment,
      pathAdjustments,
      nextRecommendation: await this.recommendNextScenario(updatedProgress, {} as HandStatistics),
      achievedMilestones: this.checkAchievedMilestones(userProgress, performance)
    };
  }

  // =================== 技能评估 ===================

  private assessCurrentSkills(userProgress: UserProgress, statistics: HandStatistics): SkillAssessment {
    const skills: SkillAssessment = {
      overall: this.calculateOverallSkill(userProgress, statistics),
      preflop: this.assessPreflopSkills(statistics),
      postflop: this.assessPostflopSkills(statistics),
      positional: this.assessPositionalSkills(statistics),
      mathematical: this.assessMathematicalSkills(statistics),
      psychological: this.assessPsychologicalSkills(statistics),
      strengths: [],
      weaknesses: [],
      readyForAdvanced: false
    };

    // 识别优势和劣势
    const skillScores = [
      { name: 'preflop', score: skills.preflop.overall },
      { name: 'postflop', score: skills.postflop.overall },
      { name: 'positional', score: skills.positional.overall },
      { name: 'mathematical', score: skills.mathematical.overall },
      { name: 'psychological', score: skills.psychological.overall }
    ];

    skills.strengths = skillScores
      .filter(s => s.score >= 75)
      .map(s => s.name);
      
    skills.weaknesses = skillScores
      .filter(s => s.score < 60)
      .map(s => s.name);

    skills.readyForAdvanced = skills.overall >= 70 && skills.weaknesses.length <= 1;

    return skills;
  }

  private calculateOverallSkill(userProgress: UserProgress, statistics: HandStatistics): number {
    let score = 0;
    
    // 基于经验值
    score += Math.min(userProgress.experience / 1000, 30); // 最多30分
    
    // 基于胜率
    if (statistics.basicStats) {
      score += Math.min(statistics.basicStats.winRate * 50, 25); // 最多25分
    }
    
    // 基于完成的场景
    score += Math.min(userProgress.completedScenarios.length * 2, 20); // 最多20分
    
    // 基于成就
    score += Math.min(userProgress.achievements.length * 5, 25); // 最多25分
    
    return Math.min(score, 100);
  }

  // =================== 学习优先级计算 ===================

  private calculateLearningPriorities(
    skillAssessment: SkillAssessment,
    preferences?: LearningPreferences
  ): LearningPriority[] {
    const priorities: LearningPriority[] = [];

    // 基于弱点的优先级
    skillAssessment.weaknesses.forEach(weakness => {
      priorities.push({
        area: weakness,
        priority: this.calculateWeaknessPriority(weakness, skillAssessment),
        reason: `提升${weakness}技能`,
        urgency: 'high'
      });
    });

    // 基于用户偏好的优先级
    if (preferences) {
      preferences.focusAreas?.forEach(area => {
        const existing = priorities.find(p => p.area === area);
        if (existing) {
          existing.priority += 10; // 增加用户偏好的权重
        } else {
          priorities.push({
            area,
            priority: 50 + (preferences.preferDifficulty === 'advanced' ? 20 : 0),
            reason: '用户偏好领域',
            urgency: 'medium'
          });
        }
      });
    }

    // 基于进阶需求的优先级
    if (skillAssessment.readyForAdvanced) {
      priorities.push({
        area: 'advanced_concepts',
        priority: 80,
        reason: '准备学习高级概念',
        urgency: 'medium'
      });
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }

  // =================== 场景选择优化 ===================

  private async selectOptimalScenario(
    priorities: LearningPriority[],
    userProgress: UserProgress
  ): Promise<PersonalizedScenario> {
    if (priorities.length === 0) {
      // 默认推荐通用场景
      const generalScenarios = await this.scenarioGenerator.generateScenariosByType(
        'general', 'intermediate', 1
      );
      return generalScenarios[0];
    }

    const topPriority = priorities[0];
    
    // 根据优先级区域生成场景
    const scenarios = await this.generateScenariosForPriority(topPriority, userProgress);
    
    // 选择最适合的场景
    return this.selectBestScenarioFromCandidates(scenarios, userProgress, priorities);
  }

  private async generateScenariosForPriority(
    priority: LearningPriority,
    userProgress: UserProgress
  ): Promise<PersonalizedScenario[]> {
    const difficulty = this.determineDifficultyLevel(userProgress, priority);
    
    switch (priority.area) {
      case 'preflop':
        return this.scenarioGenerator.generateScenariosByType('preflop_positioning', difficulty, 3);
      case 'postflop':
        return this.scenarioGenerator.generateScenariosByType('postflop_cbet', difficulty, 3);
      case 'positional':
        return this.scenarioGenerator.generateScenariosByType('preflop_positioning', difficulty, 3);
      default:
        return this.scenarioGenerator.generateScenariosByType('general', difficulty, 3);
    }
  }

  // =================== 学习路径规划 ===================

  private planLearningPhases(skillAssessment: SkillAssessment, targetDuration: number): LearningPhase[] {
    const phases: LearningPhase[] = [];
    
    if (skillAssessment.overall < 40) {
      // 基础阶段
      phases.push({
        name: '基础技能建立',
        description: '掌握基本的扑克概念和策略',
        duration: Math.floor(targetDuration * 0.4),
        objectives: ['理解基本概念', '掌握翻前策略', '学习位置重要性'],
        expectedOutcome: '达到基础水平，胜率稳定在45%以上'
      });
    }

    if (skillAssessment.overall < 70) {
      // 进阶阶段
      phases.push({
        name: '策略深化训练',
        description: '深入学习各阶段最优策略',
        duration: Math.floor(targetDuration * 0.4),
        objectives: ['优化翻后策略', '提升数学计算', '增强对手读取'],
        expectedOutcome: '达到中级水平，胜率提升至55%以上'
      });
    }

    // 高级阶段
    phases.push({
      name: '高级概念掌握',
      description: '学习高级策略和概念',
      duration: targetDuration - phases.reduce((sum, p) => sum + p.duration, 0),
      objectives: ['掌握高级数学概念', '学习剥削性策略', '完善心理游戏'],
      expectedOutcome: '达到高级水平，胜率稳定在60%以上'
    });

    return phases;
  }

  // =================== 辅助方法 ===================

  private assessPreflopSkills(statistics: HandStatistics): SkillDetail {
    return {
      overall: 65,
      subSkills: {
        handSelection: 70,
        positioning: 60,
        betting: 65
      }
    };
  }

  private assessPostflopSkills(statistics: HandStatistics): SkillDetail {
    return {
      overall: 55,
      subSkills: {
        cBetting: 60,
        bluffCatching: 50,
        valueExtraction: 55
      }
    };
  }

  private assessPositionalSkills(statistics: HandStatistics): SkillDetail {
    return {
      overall: 60,
      subSkills: {
        buttonPlay: 70,
        blindDefense: 50,
        earlyPosition: 60
      }
    };
  }

  private assessMathematicalSkills(statistics: HandStatistics): SkillDetail {
    return {
      overall: 50,
      subSkills: {
        potOdds: 60,
        equity: 45,
        expectedValue: 45
      }
    };
  }

  private assessPsychologicalSkills(statistics: HandStatistics): SkillDetail {
    return {
      overall: 45,
      subSkills: {
        opponentReading: 40,
        tiltControl: 50,
        bankrollManagement: 45
      }
    };
  }

  private calculateWeaknessPriority(weakness: string, skillAssessment: SkillAssessment): number {
    // 基础技能优先级更高
    const baseScores = {
      preflop: 90,
      postflop: 85,
      positional: 80,
      mathematical: 75,
      psychological: 70
    };
    
    return baseScores[weakness] || 50;
  }

  private determineDifficultyLevel(
    userProgress: UserProgress,
    priority: LearningPriority
  ): 'beginner' | 'intermediate' | 'advanced' {
    const experience = userProgress.experience;
    const level = userProgress.level;
    
    if (experience < 500 || level < 5) return 'beginner';
    if (experience < 2000 || level < 15) return 'intermediate';
    return 'advanced';
  }

  private selectBestScenarioFromCandidates(
    scenarios: PersonalizedScenario[],
    userProgress: UserProgress,
    priorities: LearningPriority[]
  ): PersonalizedScenario {
    // 简化选择逻辑：选择优先级最高的场景
    return scenarios.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  }

  private calculateRecommendationConfidence(
    scenario: PersonalizedScenario,
    skillAssessment: SkillAssessment
  ): number {
    // 基于多个因素计算置信度
    let confidence = 70; // 基础置信度
    
    // 如果场景针对明确的弱点，增加置信度
    if (skillAssessment.weaknesses.some(w => 
      scenario.personalization.adaptedForWeaknesses.includes(w)
    )) {
      confidence += 20;
    }
    
    return Math.min(confidence, 95);
  }

  private generateRecommendationReasoning(
    scenario: PersonalizedScenario,
    skillAssessment: SkillAssessment,
    priorities: LearningPriority[]
  ): string[] {
    const reasons: string[] = [];
    
    if (priorities.length > 0) {
      reasons.push(`针对您的${priorities[0].area}技能提升需求`);
    }
    
    if (skillAssessment.weaknesses.length > 0) {
      reasons.push(`帮助改善${skillAssessment.weaknesses[0]}方面的不足`);
    }
    
    reasons.push(`适合您当前的技能水平 (${skillAssessment.overall}分)`);
    
    return reasons;
  }

  private estimateImprovement(
    scenario: PersonalizedScenario,
    skillAssessment: SkillAssessment
  ): ExpectedImprovement {
    return {
      skillPoints: Math.floor(5 + Math.random() * 10),
      winRateImprovement: 0.02,
      timeToSeeResults: 3,
      confidence: 0.8
    };
  }

  private estimateStudyTime(
    scenario: PersonalizedScenario,
    skillAssessment: SkillAssessment
  ): number {
    return scenario.estimatedDuration;
  }

  private async generateAlternatives(
    recommended: PersonalizedScenario,
    priorities: LearningPriority[],
    userProgress: UserProgress
  ): Promise<PersonalizedScenario[]> {
    // 生成2-3个备选场景
    if (priorities.length > 1) {
      return this.generateScenariosForPriority(priorities[1], userProgress);
    }
    return [];
  }

  private initializeLearningGraph(): LearningGraph {
    // 简化的学习图谱
    return {
      nodes: new Map(),
      edges: new Map(),
      prerequisites: new Map()
    };
  }

  private updateProgressWithPerformance(
    userProgress: UserProgress,
    scenarioId: string,
    performance: ScenarioPerformance
  ): UserProgress {
    return {
      ...userProgress,
      experience: userProgress.experience + performance.experienceGained,
      completedScenarios: [...userProgress.completedScenarios, scenarioId]
    };
  }

  private assessProgressChange(
    userProgress: UserProgress,
    performance: ScenarioPerformance
  ): SkillChange[] {
    return [{
      skill: 'overall',
      change: performance.skillImprovement,
      reason: '场景完成带来的技能提升'
    }];
  }

  private adjustLearningPath(
    currentPath: LearningPath,
    newSkillAssessment: SkillChange[],
    performance: ScenarioPerformance
  ): PathAdjustment[] {
    return [];
  }

  private checkAchievedMilestones(
    userProgress: UserProgress,
    performance: ScenarioPerformance
  ): Milestone[] {
    return [];
  }

  private async generatePhaseScenarios(
    phase: LearningPhase,
    skillAssessment: SkillAssessment,
    userProgress: UserProgress
  ): Promise<PersonalizedScenario[]> {
    // 每个阶段生成3-5个场景
    return this.scenarioGenerator.generateScenariosByType('general', 'intermediate', 4);
  }

  private generateMilestones(path: LearningPath, skillAssessment: SkillAssessment): Milestone[] {
    return [
      {
        id: 'first_week',
        name: '第一周完成',
        description: '完成基础训练第一周',
        condition: '完成7个场景',
        reward: '解锁进阶场景'
      }
    ];
  }

  private calculatePathImprovement(path: LearningPath, skillAssessment: SkillAssessment): Record<string, number> {
    return {
      overall: 25,
      winRate: 0.15,
      confidence: 0.8
    };
  }
}

// =================== 类型定义 ===================

interface LearningPreferences {
  focusAreas?: string[];
  preferDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  maxSessionTime?: number;
  learningStyle?: 'visual' | 'practice' | 'theory';
}

interface SkillAssessment {
  overall: number;
  preflop: SkillDetail;
  postflop: SkillDetail;
  positional: SkillDetail;
  mathematical: SkillDetail;
  psychological: SkillDetail;
  strengths: string[];
  weaknesses: string[];
  readyForAdvanced: boolean;
}

interface SkillDetail {
  overall: number;
  subSkills: Record<string, number>;
}

interface LearningPriority {
  area: string;
  priority: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

interface ScenarioRecommendation {
  scenario: PersonalizedScenario;
  confidence: number;
  reasoning: string[];
  expectedImprovement: ExpectedImprovement;
  alternatives: PersonalizedScenario[];
  estimatedStudyTime: number;
}

interface ExpectedImprovement {
  skillPoints: number;
  winRateImprovement: number;
  timeToSeeResults: number;
  confidence: number;
}

interface LearningPath {
  totalDuration: number;
  phases: LearningPhaseWithScenarios[];
  totalScenarios: number;
  estimatedImprovement: Record<string, number>;
  milestones: Milestone[];
}

interface LearningPhase {
  name: string;
  description: string;
  duration: number;
  objectives: string[];
  expectedOutcome: string;
}

interface LearningPhaseWithScenarios extends LearningPhase {
  scenarios: PersonalizedScenario[];
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  condition: string;
  reward: string;
}

interface ScenarioPerformance {
  score: number;
  completionTime: number;
  mistakes: string[];
  skillImprovement: number;
  experienceGained: number;
}

interface LearningPathUpdate {
  updatedProgress: UserProgress;
  skillChanges: SkillChange[];
  pathAdjustments: PathAdjustment[];
  nextRecommendation: ScenarioRecommendation;
  achievedMilestones: Milestone[];
}

interface SkillChange {
  skill: string;
  change: number;
  reason: string;
}

interface PathAdjustment {
  type: 'add' | 'remove' | 'modify';
  target: string;
  reason: string;
}

interface LearningGraph {
  nodes: Map<string, LearningNode>;
  edges: Map<string, string[]>;
  prerequisites: Map<string, string[]>;
}

interface LearningNode {
  id: string;
  name: string;
  difficulty: number;
  prerequisites: string[];
}

export default LearningPathManager;