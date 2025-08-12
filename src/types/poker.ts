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