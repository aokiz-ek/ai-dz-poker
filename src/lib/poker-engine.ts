import { Card, Suit, Rank, GameState, Player, PlayerAction, ActionType, GameStage } from '@/types/poker';

export class PokerEngine {
  private deck: Card[] = [];
  private gameState: GameState;

  constructor() {
    this.gameState = this.createInitialState();
  }

  // Create and shuffle a standard 52-card deck
  createDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    
    return this.shuffleDeck(deck);
  }

  // Fisher-Yates shuffle algorithm
  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Create initial game state
  createInitialState(): GameState {
    return {
      id: `game_${Date.now()}`,
      players: [],
      dealer: 0,
      smallBlind: 25,
      bigBlind: 50,
      pot: 0,
      communityCards: [],
      stage: 'preflop',
      currentPlayer: 0,
      minRaise: 50,
      lastRaise: 50,
    };
  }

  // Add players to the game
  addPlayer(name: string, stack: number, position: string): void {
    const player: Player = {
      id: `player_${this.gameState.players.length}`,
      name,
      stack,
      position: position as any,
      folded: false,
      isAllIn: false,
      currentBet: 0,
    };
    this.gameState.players.push(player);
  }

  // Start a new hand
  startNewHand(): void {
    this.deck = this.createDeck();
    this.gameState.communityCards = [];
    this.gameState.stage = 'preflop';
    this.gameState.pot = 0;
    this.gameState.minRaise = this.gameState.bigBlind;
    this.gameState.lastRaise = this.gameState.bigBlind;

    // Reset player states
    this.gameState.players.forEach(player => {
      player.folded = false;
      player.isAllIn = false;
      player.currentBet = 0;
      player.cards = undefined;
    });

    // Deal hole cards
    this.dealHoleCards();
    
    // Post blinds
    this.postBlinds();
    
    // Set first player to act (after big blind)
    this.gameState.currentPlayer = (this.gameState.dealer + 3) % this.gameState.players.length;
  }

  // Deal two cards to each player
  dealHoleCards(): void {
    for (const player of this.gameState.players) {
      player.cards = [this.deck.pop()!, this.deck.pop()!];
    }
  }

  // Post small and big blinds
  postBlinds(): void {
    const sbIndex = (this.gameState.dealer + 1) % this.gameState.players.length;
    const bbIndex = (this.gameState.dealer + 2) % this.gameState.players.length;
    
    const sbPlayer = this.gameState.players[sbIndex];
    const bbPlayer = this.gameState.players[bbIndex];
    
    // Post small blind
    const sbAmount = Math.min(sbPlayer.stack, this.gameState.smallBlind);
    sbPlayer.stack -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    this.gameState.pot += sbAmount;
    
    // Post big blind
    const bbAmount = Math.min(bbPlayer.stack, this.gameState.bigBlind);
    bbPlayer.stack -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    this.gameState.pot += bbAmount;
  }

  // Deal community cards for next stage
  dealCommunityCards(): void {
    if (this.gameState.stage === 'preflop') {
      // Deal flop (3 cards)
      this.deck.pop(); // Burn card
      for (let i = 0; i < 3; i++) {
        this.gameState.communityCards.push(this.deck.pop()!);
      }
      this.gameState.stage = 'flop';
    } else if (this.gameState.stage === 'flop') {
      // Deal turn (1 card)
      this.deck.pop(); // Burn card
      this.gameState.communityCards.push(this.deck.pop()!);
      this.gameState.stage = 'turn';
    } else if (this.gameState.stage === 'turn') {
      // Deal river (1 card)
      this.deck.pop(); // Burn card
      this.gameState.communityCards.push(this.deck.pop()!);
      this.gameState.stage = 'river';
    }
  }

  // Process a player action
  processAction(playerId: string, action: PlayerAction): boolean {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player || player.folded || player.isAllIn) return false;

    const currentBet = Math.max(...this.gameState.players.map(p => p.currentBet));
    
    switch (action.type) {
      case 'fold':
        player.folded = true;
        break;
        
      case 'check':
        if (player.currentBet < currentBet) return false; // Can't check if there's a bet
        break;
        
      case 'call':
        const callAmount = Math.min(currentBet - player.currentBet, player.stack);
        player.stack -= callAmount;
        player.currentBet += callAmount;
        this.gameState.pot += callAmount;
        if (player.stack === 0) player.isAllIn = true;
        break;
        
      case 'bet':
      case 'raise':
        if (!action.amount) return false;
        const betAmount = Math.min(action.amount, player.stack);
        player.stack -= betAmount;
        const totalBet = player.currentBet + betAmount;
        this.gameState.pot += betAmount;
        player.currentBet = totalBet;
        this.gameState.lastRaise = totalBet - currentBet;
        this.gameState.minRaise = Math.max(this.gameState.minRaise, this.gameState.lastRaise);
        if (player.stack === 0) player.isAllIn = true;
        break;
        
      case 'all-in':
        const allInAmount = player.stack;
        player.stack = 0;
        player.currentBet += allInAmount;
        this.gameState.pot += allInAmount;
        player.isAllIn = true;
        break;
        
      default:
        return false;
    }

    // Move to next player
    this.nextPlayer();
    return true;
  }

  // Move to the next active player
  nextPlayer(): void {
    do {
      this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % this.gameState.players.length;
    } while (this.gameState.players[this.gameState.currentPlayer].folded || 
             this.gameState.players[this.gameState.currentPlayer].isAllIn);
  }

  // Check if betting round is complete
  isBettingRoundComplete(): boolean {
    const activePlayers = this.gameState.players.filter(p => !p.folded && !p.isAllIn);
    if (activePlayers.length <= 1) return true;

    const maxBet = Math.max(...this.gameState.players.map(p => p.currentBet));
    return activePlayers.every(p => p.currentBet === maxBet);
  }

  // Get valid actions for current player
  getValidActions(playerId: string): ActionType[] {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player || player.folded || player.isAllIn) return [];

    const actions: ActionType[] = ['fold'];
    const currentBet = Math.max(...this.gameState.players.map(p => p.currentBet));
    
    if (player.currentBet === currentBet) {
      actions.push('check');
    } else {
      actions.push('call');
    }
    
    if (player.stack > 0) {
      actions.push('bet', 'raise', 'all-in');
    }
    
    return actions;
  }

  // Get current game state (read-only)
  getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  // Get specific player's view (with hidden opponent cards)
  getPlayerView(playerId: string): Readonly<GameState> {
    const playerView = { ...this.gameState };
    playerView.players = playerView.players.map(p => {
      if (p.id !== playerId) {
        return { ...p, cards: undefined }; // Hide opponent cards
      }
      return p;
    });
    return playerView;
  }
}