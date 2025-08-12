import React from 'react';
import { Card } from '@/types/poker';

interface TrainingCardProps {
  card: Card;
  isRevealed?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function TrainingCard({ 
  card, 
  isRevealed = true, 
  size = 'large',
  className = '' 
}: TrainingCardProps) {
  // 花色符号和颜色映射
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const suitColors = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500', 
    clubs: 'text-gray-800',
    spades: 'text-gray-800'
  };

  // 尺寸样式
  const sizeStyles = {
    small: 'w-12 h-16 text-xs',
    medium: 'w-16 h-22 text-sm',
    large: 'w-24 h-32 text-lg'
  };

  // 背面样式
  const backStyle = "bg-gradient-to-br from-blue-600 to-blue-800 text-white";
  
  // 正面样式
  const frontStyle = "bg-white border-2 border-gray-300 shadow-lg";

  return (
    <div className={`
      ${sizeStyles[size]}
      rounded-lg
      flex flex-col items-center justify-between
      font-bold
      transition-all duration-300
      hover:scale-105
      ${isRevealed ? frontStyle : backStyle}
      ${className}
    `}>
      {isRevealed ? (
        <>
          {/* 左上角 */}
          <div className={`self-start ml-1 mt-1 ${suitColors[card.suit]}`}>
            <div className="text-center leading-none">
              <div>{card.rank}</div>
              <div className="-mt-1">{suitSymbols[card.suit]}</div>
            </div>
          </div>
          
          {/* 中央花色符号 */}
          <div className={`text-3xl ${suitColors[card.suit]} ${size === 'small' ? 'text-xl' : size === 'medium' ? 'text-2xl' : 'text-3xl'}`}>
            {suitSymbols[card.suit]}
          </div>
          
          {/* 右下角 (倒置) */}
          <div className={`self-end mr-1 mb-1 transform rotate-180 ${suitColors[card.suit]}`}>
            <div className="text-center leading-none">
              <div>{card.rank}</div>
              <div className="-mt-1">{suitSymbols[card.suit]}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 卡背图案 */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-1">♠♥</div>
              <div className="text-xs">GTO</div>
              <div className="text-2xl mt-1">♦♣</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}