import { GameState, Player, Card, GameStage, Position } from './poker';

/**
 * 手牌历史相关类型定义
 * 
 * 设计原则：
 * 1. 数据完整性 - 记录完整的手牌流程和决策
 * 2. 压缩友好 - 支持70%+压缩率的数据结构
 * 3. 查询优化 - 支持多维度快速查询
 * 4. 分析支持 - 为GTO分析提供完整数据
 */

// =================== 核心手牌历史类型 ===================

export interface CompactHandHistory {
  id: string;
  timestamp: number;
  gameId: string;
  
  // 游戏设置 (压缩存储)
  blinds: [number, number]; // [small, big]
  maxPlayers: number;
  
  // 玩家信息 (仅记录参与者)
  players: CompactPlayer[];
  
  // 动作序列 (压缩格式)
  actions: CompactAction[];
  
  // 关键状态快照
  snapshots: HandSnapshot[];
  
  // 结果
  result: HandResult;
  
  // 分析数据 (可选，延迟计算)
  analysis?: HandAnalysis;
}

export interface CompactPlayer {
  id: string;
  position: Position;
  stackSize: number;
  cards?: [Card, Card]; // 仅记录hero和showdown的牌
}

export interface CompactAction {
  p: number; // player index
  a: ActionCode; // action code
  m?: number; // amount (if applicable)
  s: StageCode; // stage code
  t: number; // relative timestamp (ms from hand start)
}

// 压缩编码
export type ActionCode = 
  | 0 // fold
  | 1 // check
  | 2 // call
  | 3 // bet
  | 4 // raise
  | 5; // all-in

export type StageCode = 
  | 0 // preflop
  | 1 // flop  
  | 2 // turn
  | 3; // river

export interface HandSnapshot {
  stage: StageCode;
  board: Card[];
  pot: number;
  activePlayers: number[];
  timestamp: number;
}

export interface HandResult {
  winners: number[]; // player indices
  potSize: number;
  showdown: boolean;
  winningHand?: {
    playerId: number;
    handRank: string;
    description: string;
  };
}

export interface HandAnalysis {
  heroId: string;
  gtoDeviations: GtoDeviation[];
  equityAnalysis: EquityAnalysis;
  performanceMetrics: PerformanceMetrics;
  recommendations: string[];
  overallScore: number; // 0-100
}

export interface GtoDeviation {
  stage: GameStage;
  action: string;
  expectedFrequency: number;
  actualFrequency: number;
  equityLoss: number;
  severity: 'minor' | 'moderate' | 'major';
}

export interface EquityAnalysis {
  preflopEquity: number;
  flopEquity: number;
  turnEquity: number;
  riverEquity: number;
  realizedEquity: number;
  equityRealization: number; // realized / total
}

export interface PerformanceMetrics {
  vpip: boolean; // voluntarily put money in pot
  pfr: boolean; // preflop raise
  aggression: number; // (bet + raise) / (bet + raise + call + check)
  wtsd: boolean; // went to showdown
  wonAtShowdown: boolean;
  netWin: number;
}

// =================== 查询和过滤接口 ===================

export interface HistoryQueryOptions {
  // 时间范围
  startDate?: number;
  endDate?: number;
  
  // 游戏筛选
  minBlinds?: number;
  maxBlinds?: number;
  maxPlayers?: number;
  
  // 玩家筛选
  heroId?: string;
  position?: Position[];
  
  // 结果筛选
  wonHand?: boolean;
  wentToShowdown?: boolean;
  minPotSize?: number;
  
  // 分页
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'potSize' | 'score';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedHistory {
  hands: CompactHandHistory[];
  total: number;
  hasMore: boolean;
  aggregates?: HandAggregates;
}

export interface HandAggregates {
  totalHands: number;
  totalWon: number;
  winRate: number;
  totalProfit: number;
  avgPotSize: number;
  vpipRate: number;
  pfrRate: number;
  wtsdRate: number;
  showdownWinRate: number;
  avgScore: number;
}

// =================== 统计分析类型 ===================

export interface HandStatistics {
  // 时间段统计
  timeRange: {
    start: number;
    end: number;
    totalHands: number;
  };
  
  // 基础统计
  basicStats: {
    handsPlayed: number;
    handsWon: number;
    winRate: number;
    totalProfit: number;
    hourlyRate: number;
    avgPotSize: number;
  };
  
  // 位置统计
  positionalStats: Map<Position, PositionStats>;
  
  // 阶段统计
  stageStats: {
    preflop: StageStats;
    postflop: StageStats;
    flop: StageStats;
    turn: StageStats;
    river: StageStats;
  };
  
  // 对手分析
  opponentStats: OpponentStats[];
  
  // 趋势分析
  trends: {
    winRateTrend: TrendPoint[];
    profitTrend: TrendPoint[];
    scoreTrend: TrendPoint[];
  };
}

export interface PositionStats {
  position: Position;
  handsPlayed: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  winRate: number;
  profit: number;
  avgScore: number;
}

export interface StageStats {
  stage: GameStage;
  handsReached: number;
  aggression: number;
  checkCallFreq: number;
  betRaiseFreq: number;
  foldFreq: number;
  winRate: number;
  avgEquity: number;
}

export interface OpponentStats {
  opponentId: string;
  handsAgainst: number;
  winRateAgainst: number;
  profitAgainst: number;
  theirVpip: number;
  theirPfr: number;
  theirAggression: number;
}

export interface TrendPoint {
  timestamp: number;
  value: number;
  sampleSize: number;
}

// =================== 压缩和存储类型 ===================

export interface CompressionOptions {
  algorithm: 'lz4' | 'gzip' | 'deflate';
  level: number; // 1-9 compression level
  threshold: number; // minimum size to compress (bytes)
}

export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  handHistoryUsage: number;
  estimatedHandsRemaining: number;
}

export interface DataManagementOptions {
  maxHandsToKeep: number;
  autoCleanupDays: number;
  compressionEnabled: boolean;
  backupEnabled: boolean;
}

// =================== 导出格式类型 ===================

export interface HandHistoryExport {
  format: 'json' | 'csv' | 'pokerstars' | 'holdem-manager';
  timeRange: {
    start: number;
    end: number;
  };
  includeAnalysis: boolean;
  includeHeroCardsOnly: boolean;
  compressed: boolean;
}

export interface ExportResult {
  data: string;
  format: string;
  handsIncluded: number;
  fileSize: number;
  compressionRatio?: number;
}

// =================== 缓存和性能类型 ===================

export interface HandHistoryCache {
  recentHands: Map<string, CompactHandHistory>;
  aggregatesCache: Map<string, HandAggregates>;
  statisticsCache: Map<string, HandStatistics>;
  lastUpdated: number;
  hitCount: number;
  missCount: number;
}

export interface PerformanceMetrics {
  averageQueryTime: number;
  averageSaveTime: number;
  averageAnalysisTime: number;
  cacheHitRate: number;
  compressionRatio: number;
  indexEfficiency: number;
}

// =================== 错误和异常类型 ===================

export class HandHistoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public handId?: string
  ) {
    super(message);
    this.name = 'HandHistoryError';
  }
}

export type HandHistoryErrorCode = 
  | 'STORAGE_FULL'
  | 'INVALID_HAND_DATA'
  | 'COMPRESSION_FAILED'
  | 'QUERY_TIMEOUT'
  | 'CORRUPTION_DETECTED'
  | 'ANALYSIS_FAILED';