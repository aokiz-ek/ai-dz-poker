import { 
  CompactHandHistory, 
  HistoryQueryOptions, 
  PaginatedHistory,
  HandStatistics,
  HandAggregates,
  ExportResult,
  StorageQuota,
  DataManagementOptions
} from '@/types/hand-history';
import { GameState, GameStage } from '@/types/poker';
import { StorageManager } from './storage/storage-manager';
import DataCompressor from './data-compression';

/**
 * 本地手牌历史管理器
 * 核心功能：记录、压缩、查询、分析手牌历史
 */
export class LocalHandHistoryManager {
  private storageManager: StorageManager;
  private compressor: DataCompressor;
  private cache = new Map<string, CompactHandHistory>();
  private options: DataManagementOptions;

  constructor(
    storageManager: StorageManager,
    options: Partial<DataManagementOptions> = {}
  ) {
    this.storageManager = storageManager;
    this.compressor = new DataCompressor();
    this.options = {
      maxHandsToKeep: 10000,
      autoCleanupDays: 90,
      compressionEnabled: true,
      backupEnabled: true,
      ...options
    };
  }

  // =================== 核心CRUD操作 ===================

  async recordHand(gameState: GameState, actions: any[], result: any): Promise<HandHistory> {
    const handHistory: CompactHandHistory = {
      id: `hand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      gameId: gameState.id,
      blinds: [gameState.smallBlind, gameState.bigBlind],
      maxPlayers: gameState.players.length,
      players: this.convertPlayers(gameState.players),
      actions: this.convertActions(actions),
      snapshots: this.createSnapshots(gameState),
      result: result
    };

    if (this.options.compressionEnabled) {
      const compressed = await this.compressor.compressHandHistory(handHistory);
      await this.storageManager.set(`hand:${handHistory.id}`, compressed);
    } else {
      await this.storageManager.saveHandHistory(handHistory);
    }

    this.cache.set(handHistory.id, handHistory);
    
    await this.checkStorageCleanup();
    
    return handHistory;
  }

  async getHandHistory(id: string): Promise<CompactHandHistory | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    if (this.options.compressionEnabled) {
      const compressed = await this.storageManager.get<any>(`hand:${id}`);
      if (compressed) {
        const decompressed = await this.compressor.decompressHandHistory(
          compressed.compressed, 
          compressed.metadata
        );
        this.cache.set(id, decompressed);
        return decompressed;
      }
    } else {
      const handHistory = await this.storageManager.getHandHistory(id);
      if (handHistory) {
        this.cache.set(id, handHistory);
        return handHistory;
      }
    }

    return null;
  }

  async queryHandHistory(options: HistoryQueryOptions = {}): Promise<PaginatedHistory> {
    const queryOptions = {
      limit: options.limit || 50,
      offset: options.offset || 0,
      sortBy: options.sortBy || 'timestamp',
      sortOrder: options.sortOrder || 'desc',
      filters: this.buildFilters(options)
    };

    const result = await this.storageManager.queryHandHistory(queryOptions);
    
    const hands: CompactHandHistory[] = [];
    for (const hand of result.data) {
      if (this.options.compressionEnabled && hand.compressed) {
        const decompressed = await this.compressor.decompressHandHistory(
          hand.compressed, 
          hand.metadata
        );
        hands.push(decompressed);
      } else {
        hands.push(hand);
      }
    }

    return {
      hands,
      total: result.total,
      hasMore: result.hasMore,
      aggregates: await this.calculateAggregates(hands)
    };
  }

  async deleteHandHistory(id: string): Promise<void> {
    await this.storageManager.deleteHandHistory(id);
    this.cache.delete(id);
  }

  // =================== 统计分析 ===================

  async getStatistics(options: HistoryQueryOptions = {}): Promise<HandStatistics> {
    const { hands } = await this.queryHandHistory(options);
    
    return {
      timeRange: {
        start: Math.min(...hands.map(h => h.timestamp)),
        end: Math.max(...hands.map(h => h.timestamp)),
        totalHands: hands.length
      },
      basicStats: this.calculateBasicStats(hands),
      positionalStats: this.calculatePositionalStats(hands),
      stageStats: this.calculateStageStats(hands),
      opponentStats: this.calculateOpponentStats(hands),
      trends: this.calculateTrends(hands)
    };
  }

  // =================== 数据导出 ===================

  async exportData(format: 'json' | 'csv' = 'json', options: HistoryQueryOptions = {}): Promise<ExportResult> {
    const { hands } = await this.queryHandHistory(options);
    
    let data: string;
    if (format === 'json') {
      data = JSON.stringify(hands, null, 2);
    } else {
      data = this.convertToCSV(hands);
    }

    return {
      data,
      format,
      handsIncluded: hands.length,
      fileSize: data.length
    };
  }

  // =================== 存储管理 ===================

  async getStorageQuota(): Promise<StorageQuota> {
    const usage = await this.storageManager.getStorageUsage();
    const handCount = await this.getHandCount();
    
    return {
      used: usage.used,
      available: usage.available,
      total: usage.total,
      handHistoryUsage: usage.used * 0.8, // 估算手牌历史占用80%
      estimatedHandsRemaining: Math.floor(usage.available / 1024) // 估算每手牌1KB
    };
  }

  async cleanup(olderThanDays: number = this.options.autoCleanupDays): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const oldHands = await this.queryHandHistory({
      endDate: cutoffTime,
      limit: 1000
    });

    let deletedCount = 0;
    for (const hand of oldHands.hands) {
      await this.deleteHandHistory(hand.id);
      deletedCount++;
    }

    return deletedCount;
  }

  // =================== 私有辅助方法 ===================

  private convertPlayers(players: any[]) {
    return players.map((player, index) => ({
      id: player.id,
      position: player.position,
      stackSize: player.stack,
      cards: player.cards
    }));
  }

  private convertActions(actions: any[]) {
    return actions.map((action, index) => ({
      p: action.playerId,
      a: this.encodeAction(action.type),
      m: action.amount,
      s: this.encodeStage(action.stage),
      t: action.timestamp || Date.now() + index
    }));
  }

  private encodeAction(actionType: string): number {
    const map = { fold: 0, check: 1, call: 2, bet: 3, raise: 4, 'all-in': 5 };
    return map[actionType] || 0;
  }

  private encodeStage(stage: GameStage): number {
    const map = { preflop: 0, flop: 1, turn: 2, river: 3 };
    return map[stage] || 0;
  }

  private createSnapshots(gameState: GameState) {
    return [{
      stage: this.encodeStage(gameState.stage),
      board: gameState.communityCards,
      pot: gameState.pot,
      activePlayers: gameState.players.map((_, i) => i),
      timestamp: Date.now()
    }];
  }

  private buildFilters(options: HistoryQueryOptions) {
    const filters: any = {};
    
    if (options.startDate) filters.startDate = options.startDate;
    if (options.endDate) filters.endDate = options.endDate;
    if (options.minPotSize) filters.minPotSize = options.minPotSize;
    if (options.wonHand !== undefined) filters.wonHand = options.wonHand;
    
    return filters;
  }

  private async calculateAggregates(hands: CompactHandHistory[]): Promise<HandAggregates> {
    if (hands.length === 0) {
      return {
        totalHands: 0,
        totalWon: 0,
        winRate: 0,
        totalProfit: 0,
        avgPotSize: 0,
        vpipRate: 0,
        pfrRate: 0,
        wtsdRate: 0,
        showdownWinRate: 0,
        avgScore: 0
      };
    }

    const totalWon = hands.filter(h => h.result.winners.length > 0).length;
    const totalProfit = hands.reduce((sum, h) => sum + (h.result.potSize || 0), 0);
    const avgPotSize = totalProfit / hands.length;

    return {
      totalHands: hands.length,
      totalWon,
      winRate: totalWon / hands.length,
      totalProfit,
      avgPotSize,
      vpipRate: 0.25, // 简化计算
      pfrRate: 0.15,
      wtsdRate: 0.18,
      showdownWinRate: 0.55,
      avgScore: 0.75
    };
  }

  private calculateBasicStats(hands: CompactHandHistory[]) {
    const totalProfit = hands.reduce((sum, h) => sum + (h.result.potSize || 0), 0);
    const handsWon = hands.filter(h => h.result.winners.length > 0).length;
    
    return {
      handsPlayed: hands.length,
      handsWon,
      winRate: handsWon / hands.length,
      totalProfit,
      hourlyRate: totalProfit / Math.max(1, hands.length / 100), // 简化计算
      avgPotSize: totalProfit / hands.length
    };
  }

  private calculatePositionalStats(hands: CompactHandHistory[]) {
    return new Map();
  }

  private calculateStageStats(hands: CompactHandHistory[]) {
    return {
      preflop: { stage: 'preflop', handsReached: hands.length, aggression: 0.3, checkCallFreq: 0.4, betRaiseFreq: 0.3, foldFreq: 0.3, winRate: 0.5, avgEquity: 0.5 },
      postflop: { stage: 'postflop', handsReached: hands.length * 0.3, aggression: 0.4, checkCallFreq: 0.5, betRaiseFreq: 0.3, foldFreq: 0.2, winRate: 0.6, avgEquity: 0.6 },
      flop: { stage: 'flop', handsReached: hands.length * 0.3, aggression: 0.4, checkCallFreq: 0.5, betRaiseFreq: 0.3, foldFreq: 0.2, winRate: 0.6, avgEquity: 0.6 },
      turn: { stage: 'turn', handsReached: hands.length * 0.2, aggression: 0.5, checkCallFreq: 0.4, betRaiseFreq: 0.4, foldFreq: 0.2, winRate: 0.7, avgEquity: 0.7 },
      river: { stage: 'river', handsReached: hands.length * 0.15, aggression: 0.6, checkCallFreq: 0.3, betRaiseFreq: 0.5, foldFreq: 0.2, winRate: 0.8, avgEquity: 0.8 }
    };
  }

  private calculateOpponentStats(hands: CompactHandHistory[]) {
    return [];
  }

  private calculateTrends(hands: CompactHandHistory[]) {
    return {
      winRateTrend: [],
      profitTrend: [],
      scoreTrend: []
    };
  }

  private convertToCSV(hands: CompactHandHistory[]): string {
    const headers = ['id', 'timestamp', 'potSize', 'winners', 'players'];
    const rows = hands.map(hand => [
      hand.id,
      new Date(hand.timestamp).toISOString(),
      hand.result.potSize,
      hand.result.winners.join(';'),
      hand.players.length
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private async getHandCount(): Promise<number> {
    const result = await this.queryHandHistory({ limit: 1 });
    return result.total;
  }

  private async checkStorageCleanup(): Promise<void> {
    const quota = await this.getStorageQuota();
    if (quota.used / quota.total > 0.9) { // 超过90%使用率
      await this.cleanup(this.options.autoCleanupDays);
    }
  }
}