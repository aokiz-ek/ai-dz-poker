"use client"

import React from 'react';
import { Card as CardType } from '@/types/poker';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  hidden = false, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-12',
    md: 'w-12 h-16',
    lg: 'w-16 h-22'
  };

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const suitColors = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-black',
    spades: 'text-black'
  };

  if (hidden || !card) {
    return (
      <div className={`${sizeClasses[size]} poker-card bg-blue-600 flex items-center justify-center ${className}`}>
        <div className="w-8 h-10 bg-blue-800 rounded border border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} poker-card flex flex-col justify-between p-1 ${className}`}>
      <div className={`text-left ${suitColors[card.suit]} font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        <div>{card.rank}</div>
        <div className="leading-none">{suitSymbols[card.suit]}</div>
      </div>
      <div className={`text-center ${suitColors[card.suit]} ${size === 'sm' ? 'text-lg' : 'text-2xl'}`}>
        {suitSymbols[card.suit]}
      </div>
      <div className={`text-right rotate-180 ${suitColors[card.suit]} font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        <div>{card.rank}</div>
        <div className="leading-none">{suitSymbols[card.suit]}</div>
      </div>
    </div>
  );
};

export default Card;