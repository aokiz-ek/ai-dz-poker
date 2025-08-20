import { CompactHandHistory, HandStatistics, ExportResult } from '@/types/hand-history';
import { LocalHandHistoryManager } from './hand-history-manager';

/**
 * 数据导出工具
 * 支持JSON、CSV、PokerTracker等格式导出
 */
export class DataExporter {
  private handHistoryManager: LocalHandHistoryManager;

  constructor(handHistoryManager: LocalHandHistoryManager) {
    this.handHistoryManager = handHistoryManager;
  }

  // =================== 主要导出接口 ===================

  async exportHandHistory(
    format: 'json' | 'csv' | 'pokerstars' | 'holdem-manager',
    options: ExportOptions = {}
  ): Promise<LocalExportResult> {
    const startTime = Date.now();
    
    try {
      // 查询符合条件的手牌历史
      const { hands } = await this.handHistoryManager.queryHandHistory({
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.maxHands || 10000,
        heroId: options.heroId
      });

      let data: string;
      let fileSize: number;

      switch (format) {
        case 'json':
          data = this.exportToJSON(hands, options);
          break;
        case 'csv':
          data = this.exportToCSV(hands, options);
          break;
        case 'pokerstars':
          data = this.exportToPokerStars(hands, options);
          break;
        case 'holdem-manager':
          data = this.exportToHoldemManager(hands, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      fileSize = new Blob([data]).size;
      const exportTime = Date.now() - startTime;

      return {
        data,
        format,
        handsIncluded: hands.length,
        fileSize,
        compressionRatio: options.compress ? this.estimateCompressionRatio(data) : undefined,
        exportTime,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportOptions: options,
          totalHands: hands.length
        }
      };

    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportStatistics(
    format: 'json' | 'csv' | 'excel',
    options: StatsExportOptions = {}
  ): Promise<LocalExportResult> {
    const stats = await this.handHistoryManager.getStatistics({
      startDate: options.startDate,
      endDate: options.endDate,
      heroId: options.heroId
    });

    let data: string;
    switch (format) {
      case 'json':
        data = this.exportStatsToJSON(stats, options);
        break;
      case 'csv':
        data = this.exportStatsToCSV(stats, options);
        break;
      case 'excel':
        data = this.exportStatsToExcel(stats, options);
        break;
      default:
        throw new Error(`Unsupported statistics export format: ${format}`);
    }

    return {
      data,
      format,
      handsIncluded: stats.basicStats.handsPlayed,
      fileSize: new Blob([data]).size,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportOptions: options,
        statsType: 'comprehensive'
      }
    };
  }

  // =================== JSON格式导出 ===================

  private exportToJSON(hands: CompactHandHistory[], options: ExportOptions): string {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalHands: hands.length,
        format: 'AIDZ-Poker-JSON-v1.0',
        options
      },
      hands: options.includeAnalysis 
        ? hands 
        : hands.map(hand => {
            const { analysis, ...handWithoutAnalysis } = hand;
            return handWithoutAnalysis;
          })
    };

    return JSON.stringify(exportData, null, options.prettify ? 2 : 0);
  }

  private exportStatsToJSON(stats: HandStatistics, options: StatsExportOptions): string {
    return JSON.stringify({
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'AIDZ-Poker-Stats-JSON-v1.0'
      },
      statistics: stats
    }, null, 2);
  }

  // =================== CSV格式导出 ===================

  private exportToCSV(hands: CompactHandHistory[], options: ExportOptions): string {
    const headers = [
      'HandID', 'Timestamp', 'GameID', 'SmallBlind', 'BigBlind',
      'Position', 'HoleCards', 'PreflopAction', 'FlopCards', 'FlopAction',
      'TurnCard', 'TurnAction', 'RiverCard', 'RiverAction',
      'Result', 'PotSize', 'NetWin'
    ];

    const rows = hands.map(hand => {
      const heroPlayer = hand.players.find(p => p.id === options.heroId || p.id === 'hero');
      const holeCards = heroPlayer?.cards ? 
        `${heroPlayer.cards[0].rank}${heroPlayer.cards[0].suit}${heroPlayer.cards[1].rank}${heroPlayer.cards[1].suit}` : '';

      // 提取各阶段动作
      const preflopActions = hand.actions.filter(a => a.s === 0);
      const flopActions = hand.actions.filter(a => a.s === 1);
      const turnActions = hand.actions.filter(a => a.s === 2);
      const riverActions = hand.actions.filter(a => a.s === 3);

      // 提取公共牌
      const flop = hand.snapshots.find(s => s.stage === 1);
      const turn = hand.snapshots.find(s => s.stage === 2);
      const river = hand.snapshots.find(s => s.stage === 3);

      const flopCards = flop ? flop.board.slice(0, 3).map(c => `${c.rank}${c.suit}`).join('') : '';
      const turnCard = turn ? `${turn.board[3]?.rank}${turn.board[3]?.suit}` : '';
      const riverCard = river ? `${river.board[4]?.rank}${river.board[4]?.suit}` : '';

      return [
        hand.id,
        new Date(hand.timestamp).toISOString(),
        hand.gameId,
        hand.blinds[0],
        hand.blinds[1],
        heroPlayer?.position || '',
        holeCards,
        this.formatActions(preflopActions),
        flopCards,
        this.formatActions(flopActions),
        turnCard,
        this.formatActions(turnActions),
        riverCard,
        this.formatActions(riverActions),
        hand.result.winners.includes(0) ? 'W' : 'L', // hero is player 0
        hand.result.potSize,
        this.calculateNetWin(hand, options.heroId || 'hero')
      ];
    });

    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  private exportStatsToCSV(stats: HandStatistics, options: StatsExportOptions): string {
    const rows = [
      ['Metric', 'Value'],
      ['Total Hands', stats.basicStats.handsPlayed],
      ['Hands Won', stats.basicStats.handsWon],
      ['Win Rate (%)', (stats.basicStats.winRate * 100).toFixed(2)],
      ['Total Profit', stats.basicStats.totalProfit],
      ['Hourly Rate', stats.basicStats.hourlyRate],
      ['Average Pot Size', stats.basicStats.avgPotSize],
    ];

    // 添加位置统计
    stats.positionalStats.forEach((posStats, position) => {
      rows.push([`${position} VPIP (%)`, (posStats.vpip * 100).toFixed(2)]);
      rows.push([`${position} PFR (%)`, (posStats.pfr * 100).toFixed(2)]);
      rows.push([`${position} Win Rate (%)`, (posStats.winRate * 100).toFixed(2)]);
    });

    return rows.map(row => 
      row.map(cell => `"${String(cell)}"`).join(',')
    ).join('\n');
  }

  // =================== PokerStars格式导出 ===================

  private exportToPokerStars(hands: CompactHandHistory[], options: ExportOptions): string {
    return hands.map(hand => this.convertToPokerStarsFormat(hand)).join('\n\n');
  }

  private convertToPokerStarsFormat(hand: CompactHandHistory): string {
    const timestamp = new Date(hand.timestamp);
    const handNumber = hand.id.replace(/[^0-9]/g, '');
    
    let output = `PokerStars Hand #${handNumber}: Hold'em No Limit ($${hand.blinds[0]}/$${hand.blinds[1]}) - `;
    output += `${timestamp.getFullYear()}/${String(timestamp.getMonth() + 1).padStart(2, '0')}/${String(timestamp.getDate()).padStart(2, '0')} `;
    output += `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}:${String(timestamp.getSeconds()).padStart(2, '0')} ET\n`;
    
    output += `Table 'AIDZ-Poker ${hand.gameId}' ${hand.maxPlayers}-max Seat #${hand.players.length} is the button\n`;

    // 玩家座位信息
    hand.players.forEach((player, index) => {
      output += `Seat ${index + 1}: ${player.id} ($${player.stackSize} in chips)\n`;
    });

    // 盲注
    output += `${hand.players[1]?.id || 'Player2'}: posts small blind $${hand.blinds[0]}\n`;
    output += `${hand.players[2]?.id || 'Player3'}: posts big blind $${hand.blinds[1]}\n`;
    
    output += '*** HOLE CARDS ***\n';
    
    // Hero的底牌
    const hero = hand.players.find(p => p.id === 'hero' || p.cards);
    if (hero && hero.cards) {
      output += `Dealt to ${hero.id} [${hero.cards[0].rank}${hero.cards[0].suit} ${hero.cards[1].rank}${hero.cards[1].suit}]\n`;
    }

    // 翻前动作
    const preflopActions = hand.actions.filter(a => a.s === 0);
    preflopActions.forEach(action => {
      const player = hand.players[action.p];
      if (player) {
        output += `${player.id}: ${this.formatPokerStarsAction(action)}\n`;
      }
    });

    // 翻牌
    const flopSnapshot = hand.snapshots.find(s => s.stage === 1);
    if (flopSnapshot && flopSnapshot.board.length >= 3) {
      output += `*** FLOP *** [${flopSnapshot.board.slice(0, 3).map(c => `${c.rank}${c.suit}`).join(' ')}]\n`;
      
      const flopActions = hand.actions.filter(a => a.s === 1);
      flopActions.forEach(action => {
        const player = hand.players[action.p];
        if (player) {
          output += `${player.id}: ${this.formatPokerStarsAction(action)}\n`;
        }
      });
    }

    // 转牌
    const turnSnapshot = hand.snapshots.find(s => s.stage === 2);
    if (turnSnapshot && turnSnapshot.board.length >= 4) {
      output += `*** TURN *** [${turnSnapshot.board.slice(0, 3).map(c => `${c.rank}${c.suit}`).join(' ')}] [${turnSnapshot.board[3].rank}${turnSnapshot.board[3].suit}]\n`;
      
      const turnActions = hand.actions.filter(a => a.s === 2);
      turnActions.forEach(action => {
        const player = hand.players[action.p];
        if (player) {
          output += `${player.id}: ${this.formatPokerStarsAction(action)}\n`;
        }
      });
    }

    // 河牌
    const riverSnapshot = hand.snapshots.find(s => s.stage === 3);
    if (riverSnapshot && riverSnapshot.board.length >= 5) {
      output += `*** RIVER *** [${riverSnapshot.board.slice(0, 4).map(c => `${c.rank}${c.suit}`).join(' ')}] [${riverSnapshot.board[4].rank}${riverSnapshot.board[4].suit}]\n`;
      
      const riverActions = hand.actions.filter(a => a.s === 3);
      riverActions.forEach(action => {
        const player = hand.players[action.p];
        if (player) {
          output += `${player.id}: ${this.formatPokerStarsAction(action)}\n`;
        }
      });
    }

    // 摊牌和结果
    if (hand.result.showdown && hand.result.winningHand) {
      output += '*** SHOW DOWN ***\n';
      const winnerIndex = hand.result.winners[0];
      const winner = hand.players[winnerIndex];
      if (winner && winner.cards) {
        output += `${winner.id}: shows [${winner.cards[0].rank}${winner.cards[0].suit} ${winner.cards[1].rank}${winner.cards[1].suit}] (${hand.result.winningHand.handRank})\n`;
      }
    }

    output += `*** SUMMARY ***\n`;
    output += `Total pot $${hand.result.potSize}\n`;
    output += `${hand.result.winners[0]} collected $${hand.result.potSize}\n`;

    return output;
  }

  // =================== HoldemManager格式导出 ===================

  private exportToHoldemManager(hands: CompactHandHistory[], options: ExportOptions): string {
    // HoldemManager使用类似PokerTracker的格式，但有一些差异
    return hands.map(hand => this.convertToHoldemManagerFormat(hand)).join('\n\n');
  }

  private convertToHoldemManagerFormat(hand: CompactHandHistory): string {
    // 简化的HoldemManager格式
    return this.convertToPokerStarsFormat(hand); // 基本格式相似
  }

  // =================== Excel格式导出 ===================

  private exportStatsToExcel(stats: HandStatistics, options: StatsExportOptions): string {
    // 生成简化的CSV格式，可以被Excel打开
    return this.exportStatsToCSV(stats, options);
  }

  // =================== 辅助方法 ===================

  private formatActions(actions: any[]): string {
    return actions.map(action => {
      const actionTypes = ['F', 'X', 'C', 'B', 'R', 'A'];
      const actionType = actionTypes[action.a] || '?';
      return action.m ? `${actionType}${action.m}` : actionType;
    }).join('-');
  }

  private formatPokerStarsAction(action: any): string {
    const actionTypes = ['folds', 'checks', 'calls', 'bets', 'raises', 'goes all-in'];
    const actionType = actionTypes[action.a] || 'unknown action';
    
    if (action.m && (action.a === 3 || action.a === 4)) { // bet or raise
      return `${actionType} $${action.m}`;
    } else if (action.m && action.a === 2) { // call
      return `${actionType} $${action.m}`;
    }
    return actionType;
  }

  private calculateNetWin(hand: CompactHandHistory, heroId: string): number {
    // Assume hero is player 0 for simplified calculation
    if (hand.result.winners.includes(0)) {
      return hand.result.potSize; // 简化计算
    }
    return 0; // 简化计算，实际应该减去投入的筹码
  }

  private estimateCompressionRatio(data: string): number {
    // 简单的压缩率估算
    const original = data.length;
    const compressed = Math.floor(original * 0.3); // 假设30%的压缩大小
    return (original - compressed) / original;
  }
}

// =================== 类型定义 ===================

interface ExportOptions {
  startDate?: number;
  endDate?: number;
  heroId?: string;
  maxHands?: number;
  includeAnalysis?: boolean;
  prettify?: boolean;
  compress?: boolean;
  includeHeroCardsOnly?: boolean;
}

interface StatsExportOptions {
  startDate?: number;
  endDate?: number;
  heroId?: string;
  includePositionalStats?: boolean;
  includeOpponentStats?: boolean;
  includeTrends?: boolean;
}

interface LocalExportResult {
  data: string;
  format: string;
  handsIncluded: number;
  fileSize: number;
  compressionRatio?: number;
  exportTime?: number;
  metadata?: {
    exportedAt: string;
    exportOptions: any;
    totalHands?: number;
    statsType?: string;
  };
}

export default DataExporter;