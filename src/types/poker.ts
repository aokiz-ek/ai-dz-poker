export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG1' | 'MP' | 'MP1' | 'CO';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerAction {
  type: ActionType;
  amount?: number;
  playerId: string;
}

export interface Player {
  id: string;
  name: string;
  stack: number;
  position: Position;
  cards?: [Card, Card];
  folded: boolean;
  isAllIn: boolean;
  currentBet: number;
}

export type GameStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GameState {
  id: string;
  players: Player[];
  dealer: number; // player index
  smallBlind: number;
  bigBlind: number;
  pot: number;
  communityCards: Card[];
  stage: GameStage;
  currentPlayer: number; // player index
  minRaise: number;
  lastRaise: number;
}

export interface GtoStrategy {
  fold: number;
  check?: number;
  call?: number;
  bet?: number;
  raise?: number;
}

export interface HandRange {
  [handCode: string]: number; // hand like "AA", "AKs", "AKo" -> frequency 0-1
}

// 翻后相关类型定义
export type HandRank = 
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandStrengthResult {
  rank: HandRank;
  strength: number; // 0-7462 (higher = stronger)
  kickers: Rank[];
  description: string;
}

export type DrawType = 
  | 'straight-draw'
  | 'flush-draw'
  | 'straight-flush-draw'
  | 'gutshot'
  | 'open-ended'
  | 'backdoor-straight'
  | 'backdoor-flush';

export interface DrawAnalysis {
  draws: DrawType[];
  outs: number;
  odds: number; // percentage to complete draw
  impliedOdds: number;
}

export interface BlockerEffect {
  blockedHands: string[];
  unblockedHands: string[];
  impact: number; // -1 to 1, negative = blocks opponent value, positive = blocks opponent bluffs
}

export interface PostflopContext {
  board: Card[];
  position: 'IP' | 'OOP'; // In Position / Out of Position
  aggressor: 'hero' | 'villain';
  potSize: number;
  effectiveStack: number;
  opponentRange: HandRange;
}

export type BoardTextureType = 'dry' | 'wet' | 'coordinated' | 'rainbow';

export interface BoardTexture {
  type: BoardTextureType;
  strength: number; // 0-100 board strength
  draws: DrawType[];
  pairedness: number; // 0-100 how paired the board is
  connectedness: number; // 0-100 how connected the board is
  suitedness: number; // 0-100 how suited the board is
}

export interface PostflopStrategy extends GtoStrategy {
  bet: number;
  check: number;
  call: number;
  raise: number;
  fold: number;
  sizing: BetSizing[];
  bluffCatcher: number;
  valueTarget: number;
}

export interface BetSizing {
  size: number; // as fraction of pot (0.33, 0.5, 0.75, 1.0, etc.)
  frequency: number; // 0-100 percentage
}