import { Card, Position, ActionType } from './poker';
import { TrainingScenario } from '@/lib/training-scenarios';

// 训练手牌数据结构
export interface TrainingHand {
  id: string;
  holeCards: [Card, Card];
  scenario: TrainingScenario;
  difficulty: 'easy' | 'medium' | 'hard';
  learningPoint: string;
  expectedAction: ActionType;
  gtoFrequency: {
    fold: number;
    call: number;
    raise: number;
  };
  context: {
    position: Position;
    stackSize: number;
    blinds: { small: number; big: number };
    opponentType: 'tight' | 'loose' | 'aggressive' | 'passive';
  };
}

// 训练决策结果
export interface TrainingDecision {
  handId: string;
  playerAction: ActionType;
  responseTime: number; // 响应时间(毫秒)
  timestamp: Date;
}

// 单手牌评分结果
export interface HandScore {
  handId: string;
  baseScore: number;        // 基础分数 (0-100)
  speedBonus: number;       // 速度奖励 (0-10)
  difficultyMultiplier: number; // 难度系数 (0.8-1.2)
  finalScore: number;       // 最终得分
  feedback: {
    type: 'excellent' | 'good' | 'improvement' | 'mistake';
    title: string;
    explanation: string;
    gtoAnalysis: string;
  };
}

// 训练会话状态
export interface TrainingSession {
  id: string;
  scenarioId: string;
  startTime: Date;
  currentHandIndex: number;
  totalHands: number;
  hands: TrainingHand[];
  decisions: TrainingDecision[];
  scores: HandScore[];
  isActive: boolean;
  isPaused: boolean;
}

// 会话综合评分
export interface SessionSummary {
  sessionId: string;
  averageScore: number;
  totalScore: number;
  handsCompleted: number;
  duration: number; // 总时长(秒)
  
  // 表现分析
  performance: {
    excellent: number; // 优秀决策数量
    good: number;      // 良好决策数量  
    improvement: number; // 需改进决策数量
    mistakes: number;  // 错误决策数量
  };
  
  // 学习分析
  conceptMastery: {
    [concept: string]: number; // 概念掌握度 0-100
  };
  
  // 成就和进步
  achievements: string[];
  improvements: string[];
  weaknesses: string[];
  
  // 下一步建议
  nextRecommendation: string;
  unlockNextScenario: boolean;
}

// 训练UI状态
export interface TrainingUIState {
  phase: 'loading' | 'instruction' | 'decision' | 'feedback' | 'summary';
  handProgress: { current: number; total: number };
  currentScore: number;
  sessionScore: number;
  feedbackType: 'excellent' | 'good' | 'improvement' | 'mistake';
  animationState: 'idle' | 'dealing' | 'thinking' | 'revealing' | 'celebrating';
  showHint: boolean;
  timeRemaining?: number;
}

// 本地存储的学习数据
export interface LearningProgress {
  scenarioId: string;
  sessionsCompleted: number;
  bestScore: number;
  averageScore: number;
  totalHands: number;
  totalTime: number; // 总学习时间(秒)
  
  // 学习曲线数据
  sessionHistory: {
    date: string;
    score: number;
    handsCount: number;
    duration: number;
  }[];
  
  // 概念掌握记录
  conceptProgress: {
    [concept: string]: {
      attempts: number;
      successes: number;
      lastPracticed: string;
    };
  };
  
  // 解锁状态
  unlocked: boolean;
  stars: number; // 星级评价 0-3
  lastPlayed: string;
}