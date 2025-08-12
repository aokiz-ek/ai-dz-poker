"use client"

import React from 'react';
import { Card as CardType } from '@/types/poker';
import Card from './Card';

interface CommunityCardsProps {
  cards: CardType[];
  stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards, stage }) => {
  // Show appropriate number of cards based on stage
  const visibleCards = cards.slice(0, getVisibleCardCount(stage));
  
  // Pad with hidden cards to show placeholders
  const totalSlots = 5;
  const hiddenSlots = totalSlots - visibleCards.length;

  return (
    <div className="bg-poker-felt rounded-lg p-4 shadow-inner min-w-80">
      <div className="text-white text-sm font-medium mb-2 text-center">
        {getStageLabel(stage)}
      </div>
      <div className="flex space-x-2 justify-center">
        {/* Visible cards */}
        {visibleCards.map((card, index) => (
          <div 
            key={`visible-${index}`}
            className="animate-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card 
              card={card} 
              size="md"
            />
          </div>
        ))}
        
        {/* Hidden placeholders */}
        {Array.from({ length: hiddenSlots }, (_, index) => (
          <Card 
            key={`hidden-${index}`}
            hidden 
            size="md"
            className="opacity-30"
          />
        ))}
      </div>
    </div>
  );
};

function getVisibleCardCount(stage: string): number {
  switch (stage) {
    case 'preflop': return 0;
    case 'flop': return 3;
    case 'turn': return 4;
    case 'river':
    case 'showdown': return 5;
    default: return 0;
  }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'preflop': return 'Pre-Flop';
    case 'flop': return 'Flop';
    case 'turn': return 'Turn';
    case 'river': return 'River';
    case 'showdown': return 'Showdown';
    default: return '';
  }
}

export default CommunityCards;