import React from 'react';
import { ActionType } from '@/types/poker';
import { getActionChinese } from '@/lib/translations';

interface ActionButtonsProps {
  onAction: (action: ActionType) => void;
  disabled?: boolean;
  showAmounts?: boolean;
  callAmount?: number;
  raiseAmount?: number;
  potSize?: number;
  className?: string;
}

export default function ActionButtons({
  onAction,
  disabled = false,
  showAmounts = true,
  callAmount = 50,
  raiseAmount = 125,
  potSize = 75,
  className = ''
}: ActionButtonsProps) {
  
  const buttonBaseStyle = `
    flex-1 py-4 px-6 rounded-xl font-semibold text-lg
    transition-all duration-200 transform
    hover:scale-105 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    shadow-lg hover:shadow-xl
    min-h-[80px] flex flex-col items-center justify-center
  `;

  const buttons = [
    {
      action: 'fold' as ActionType,
      label: getActionChinese('fold'),
      emoji: '❌',
      style: `
        ${buttonBaseStyle}
        bg-gradient-to-br from-red-500 to-red-600 
        hover:from-red-600 hover:to-red-700
        text-white focus:ring-red-300
      `,
      amount: null
    },
    {
      action: 'call' as ActionType,
      label: getActionChinese('call'),
      emoji: '📞',
      style: `
        ${buttonBaseStyle}
        bg-gradient-to-br from-yellow-500 to-yellow-600
        hover:from-yellow-600 hover:to-yellow-700  
        text-white focus:ring-yellow-300
      `,
      amount: callAmount
    },
    {
      action: 'raise' as ActionType,
      label: getActionChinese('raise'),
      emoji: '🚀',
      style: `
        ${buttonBaseStyle}
        bg-gradient-to-br from-green-500 to-green-600
        hover:from-green-600 hover:to-green-700
        text-white focus:ring-green-300
      `,
      amount: raiseAmount
    }
  ];

  // 键盘事件处理
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (disabled) return;
      
      switch (event.key.toLowerCase()) {
        case 'f':
          onAction('fold');
          break;
        case 'c':
          onAction('call');
          break;
        case 'r':
          onAction('raise');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onAction, disabled]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 操作说明 */}
      <div className="text-center text-gray-600 text-sm mb-6">
        <p className="mb-1">选择你的行动 (快捷键: F-弃牌, C-跟注, R-加注)</p>
        {showAmounts && (
          <p className="text-xs text-gray-500">
            底池: {potSize} BB | 跟注: {callAmount} BB | 加注至: {raiseAmount} BB
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        {buttons.map((button) => (
          <button
            key={button.action}
            onClick={() => onAction(button.action)}
            disabled={disabled}
            className={button.style}
          >
            <div className="text-2xl mb-1">{button.emoji}</div>
            <div className="font-bold">{button.label}</div>
            {showAmounts && button.amount && (
              <div className="text-sm opacity-90 mt-1">
                {button.amount} BB
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 键盘提示 */}
      <div className="flex justify-center gap-6 text-xs text-gray-400 mt-4">
        <div className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">F</kbd>
          <span>弃牌</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">C</kbd>
          <span>跟注</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">R</kbd>
          <span>加注</span>
        </div>
      </div>
    </div>
  );
}