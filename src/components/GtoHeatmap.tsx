"use client"

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Tooltip } from "antd";

const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const GRID_SIZE = 13;

interface StrategyData {
  [key: string]: {
    score: number;
    actions: {
      fold: number;
      call: number;
      raise: number;
    };
    handType: 'pair' | 'suited' | 'offsuit';
    ev: number;
  };
}

interface FilterOptions {
  position: 'all' | 'EP' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';
  handTypes: ('pair' | 'suited' | 'offsuit')[];
  raiseRange: [number, number];
  evRange: [number, number];
  stackSize: 'all' | 'short' | 'medium' | 'deep';
}

// Load strategy data with enhanced calculations
function loadStrategyData(filters: FilterOptions): StrategyData {
  const data: StrategyData = {};
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const key = `${i}-${j}`;
      let base = Math.random() * 0.4;
      
      // Hand type adjustments
      const handType: 'pair' | 'suited' | 'offsuit' = i === j ? 'pair' : i < j ? 'suited' : 'offsuit';
      if (i === j) base += 0.45; // Pairs bonus
      if (i < j) base += 0.2;    // Suited bonus
      
      // Rank factor
      const rankFactor = ((GRID_SIZE - Math.min(i, j)) / GRID_SIZE) * 0.4;
      base += rankFactor;
      
      // Position adjustments
      const positionBonus = {
        'EP': -0.15, 'MP': -0.1, 'CO': 0.05, 'BTN': 0.15, 'SB': -0.05, 'BB': -0.1, 'all': 0
      };
      base += positionBonus[filters.position];
      
      // Stack size adjustments
      const stackBonus = {
        'short': -0.1, 'medium': 0, 'deep': 0.1, 'all': 0
      };
      base += stackBonus[filters.stackSize];
      
      const score = Math.min(1, Math.max(0, base));
      const raise = Math.round(score * 100);
      const call = Math.round((1 - score) * 60 * Math.random());
      const fold = Math.max(0, 100 - raise - call);
      const ev = (score * 3) - 1; // Expected value calculation
      
      data[key] = { 
        score, 
        actions: { fold, call, raise }, 
        handType,
        ev: Number(ev.toFixed(2))
      };
    }
  }
  return data;
}

interface HoverData {
  score: number;
  actions: {
    fold: number;
    call: number;
    raise: number;
  };
  i: number;
  j: number;
  left: number;
  top: number;
}

export default function GtoHeatmap() {
  const [data, setData] = useState<StrategyData>({});
  const [filters, setFilters] = useState<FilterOptions>({
    position: 'BTN',
    handTypes: ['pair', 'suited', 'offsuit'],
    raiseRange: [0, 100],
    evRange: [-3, 3],
    stackSize: 'medium'
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [modalData, setModalData] = useState<HoverData | null>(null);
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  const matrixRef = useRef<HTMLDivElement>(null);

  // Load data when filters change
  useEffect(() => {
    setData(loadStrategyData(filters));
    setIsLoaded(true);
  }, [filters]);

  function getHandDescription(i: number, j: number): string {
    if (i === j) return '口袋对子';
    if (i < j) return '同花';
    return '杂牌';
  }

  function getStrategyAdvice(actions: { raise: number; call: number; fold: number }): string {
    const maxAction = Math.max(actions.raise, actions.call, actions.fold);
    
    if (actions.raise === maxAction && actions.raise >= 70) {
      return '优质起手牌，加注频率很高。这是一手价值牌，应该积极游戏。';
    } else if (actions.call === maxAction && actions.call >= 40) {
      return '适合跟注的不错起手牌。避免过度游戏，但在合适的底池赔率下可以继续。';
    } else if (actions.fold >= 60) {
      return '边缘起手牌，长期收益能力较低。在大多数情况下建议弃牌。';
    } else {
      return '需要混合策略。根据位置、筹码量和对手倾向调整打法。';
    }
  }

  function cellLabel(i: number, j: number): string {
    const r1 = RANKS[i];
    const r2 = RANKS[j];
    if (i === j) return `${r1}${r2}`;
    return i < j ? `${r1}${r2}s` : `${r2}${r1}o`;
  }

  function getTooltipContent(i: number, j: number, actions: { raise: number; call: number; fold: number }): React.ReactNode {
    return (
      <div className="text-center">
        <div className="text-lg font-bold text-gray-900 mb-2">
          {cellLabel(i, j)}
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {getHandDescription(i, j)}
        </div>
        
        {/* 紧凑行动分布 */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-red-50 rounded p-2">
            <div className="text-red-600 font-semibold">加注</div>
            <div className="text-red-700 font-bold">{actions.raise}%</div>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <div className="text-yellow-600 font-semibold">跟注</div>
            <div className="text-yellow-700 font-bold">{actions.call}%</div>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-600 font-semibold">弃牌</div>
            <div className="text-gray-700 font-bold">{actions.fold}%</div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 mt-2">
          点击查看详细分析
        </div>
      </div>
    );
  }

  // Enhanced filtering function
  function matchesFilter(i: number, j: number): boolean {
    const key = `${i}-${j}`;
    const cellData = data[key];
    if (!cellData) return false;

    // Hand type filter
    if (!filters.handTypes.includes(cellData.handType)) return false;
    
    // Raise range filter
    if (cellData.actions.raise < filters.raiseRange[0] || cellData.actions.raise > filters.raiseRange[1]) {
      return false;
    }
    
    // EV range filter
    if (cellData.ev < filters.evRange[0] || cellData.ev > filters.evRange[1]) {
      return false;
    }
    
    return true;
  }

  // Handle cell selection
  const handleCellClick = useCallback((i: number, j: number) => {
    const hand = cellLabel(i, j);
    
    if (isMultiSelect) {
      setSelectedHands(prev => 
        prev.includes(hand) 
          ? prev.filter(h => h !== hand)
          : [...prev, hand]
      );
    } else {
      setSelectedHands([hand]);
      setModalData({ ...data[`${i}-${j}`], i, j, left: 0, top: 0 });
    }
  }, [data, isMultiSelect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input fields
      if ((event.target as HTMLElement).tagName === 'INPUT' || 
          (event.target as HTMLElement).tagName === 'SELECT') {
        return;
      }

      // Multi-select toggle (Ctrl/Cmd + M)
      if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
        event.preventDefault();
        setIsMultiSelect(prev => !prev);
        return;
      }

      // Select all filtered hands (Ctrl/Cmd + A)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        if (isMultiSelect) {
          const allHands: string[] = [];
          for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
              if (matchesFilter(i, j)) {
                allHands.push(cellLabel(i, j));
              }
            }
          }
          setSelectedHands(allHands);
        }
        return;
      }

      // Clear selection (Escape)
      if (event.key === 'Escape') {
        if (modalData) {
          setModalData(null);
        } else {
          setSelectedHands([]);
        }
        return;
      }

      // Export CSV (Ctrl/Cmd + E)
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        exportCSV();
        return;
      }

      // Show keyboard help (?)
      if (event.key === '?') {
        event.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Reset filters (R)
      if (event.key === 'r' || event.key === 'R') {
        setFilters({
          position: 'BTN',
          handTypes: ['pair', 'suited', 'offsuit'],
          raiseRange: [0, 100],
          evRange: [-3, 3],
          stackSize: 'medium'
        });
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMultiSelect, modalData]);

  // Export CSV function
  const exportCSV = useCallback(() => {
    if (!isLoaded || !data) return;
    
    const rows = [["手牌", "类型", "得分", "加注%", "跟注%", "弃牌%", "期望收益", "位置", "筹码深度"]];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (matchesFilter(i, j)) {
          const hand = cellLabel(i, j);
          const cellData = data[`${i}-${j}`];
          if (cellData) {
            const { score, actions, handType, ev } = cellData;
            const handTypeText = handType === 'pair' ? '对子' : handType === 'suited' ? '同花' : '杂牌';
            rows.push([
              hand, 
              handTypeText,
              score.toFixed(2), 
              actions.raise.toString(), 
              actions.call.toString(), 
              actions.fold.toString(),
              ev.toString(),
              filters.position,
              filters.stackSize
            ]);
          }
        }
      }
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gto_strategy_${filters.position}_${filters.stackSize}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [isLoaded, data, filters, matchesFilter]);

  if (!isLoaded) {
    return (
      <div className=" bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-indigo-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-l-indigo-300 mx-auto animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <div className="text-xl font-semibold text-gray-800 animate-pulse">正在加载 GTO 矩阵...</div>
          <div className="text-sm text-gray-500 mt-1 animate-pulse">正在初始化策略数据</div>
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-gradient-to-br from-gray-50 to-slate-100">
      <div className="mx-auto px-4 py-8">
        {/* Modern Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></div>
专业 GTO 分析
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            翻牌前策略矩阵
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            博弈论最优起手牌范围可视化
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg mb-8 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Enhanced Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
              
              {/* Position Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">位置:</label>
                <select 
                  value={filters.position} 
                  onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value as FilterOptions['position'] }))}
                  className="px-3 py-1 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">全部</option>
                  <option value="EP">Early Position</option>
                  <option value="MP">Middle Position</option>
                  <option value="CO">Cutoff</option>
                  <option value="BTN">Button</option>
                  <option value="SB">Small Blind</option>
                  <option value="BB">Big Blind</option>
                </select>
              </div>

              {/* Stack Size Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">筹码:</label>
                <select 
                  value={filters.stackSize} 
                  onChange={(e) => setFilters(prev => ({ ...prev, stackSize: e.target.value as FilterOptions['stackSize'] }))}
                  className="px-3 py-1 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">全部</option>
                  <option value="short">浅码 (&lt;50BB)</option>
                  <option value="medium">中码 (50-100BB)</option>
                  <option value="deep">深码 (&gt;100BB)</option>
                </select>
              </div>

              {/* Hand Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">类型:</label>
                <div className="flex gap-2">
                  {(['pair', 'suited', 'offsuit'] as const).map(type => {
                    const labels = { pair: '对子', suited: '同花', offsuit: '杂牌' };
                    return (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.handTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, handTypes: [...prev.handTypes, type] }));
                            } else {
                              setFilters(prev => ({ ...prev, handTypes: prev.handTypes.filter(t => t !== type) }));
                            }
                          }}
                          className="mr-1"
                        />
                        <span className="text-sm">{labels[type]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMultiSelect(!isMultiSelect)}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isMultiSelect 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isMultiSelect ? '✓ ' : ''}多选模式
              </button>
              
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                ⌨️ 快捷键
              </button>
              
              <button
                onClick={exportCSV}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                </svg>
                导出 CSV
              </button>
            </div>
          </div>
        </div>

        {/* Professional 13x13 Matrix */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          {/* Professional Header */}
          <div className="mb-8 text-center relative">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full border border-indigo-200 shadow-sm mb-4">
              <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-indigo-700">专业 GTO 分析</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
              翻牌前策略矩阵
            </h2>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              交互式热力图可视化 • 悬停查看详情 • 点击分析
            </p>
            
            {/* Decorative underline */}
            <div className="flex justify-center mt-4">
              <div className="h-1 w-24 bg-gradient-to-r from-indigo-400 via-purple-500 to-indigo-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Professional 13x13 Matrix with Labels */}
          <div className="overflow-x-auto">
            <div className="inline-block bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 shadow-2xl border-2 border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
              {/* Premium border decoration */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 pointer-events-none"></div>
              
              {/* Corner decorations */}
              <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-br from-indigo-400/20 to-transparent rounded-full"></div>
              <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-bl from-purple-400/20 to-transparent rounded-full"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 bg-gradient-to-tr from-indigo-400/20 to-transparent rounded-full"></div>
              <div className="absolute bottom-2 right-2 w-8 h-8 bg-gradient-to-tl from-purple-400/20 to-transparent rounded-full"></div>
                {/* Row and Column Labels + Grid */}
              <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(13, 1fr)' }}>
                {/* Professional Top-left corner with logo */}
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                  <svg className="w-8 h-8 text-white/90 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 019 17v-5.586L4.293 6.707A1 1 0 014 6V4z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {/* Professional Column headers with premium styling */}
                {RANKS.map((rank, index) => (
                  <div key={`col-${rank}`} className="relative group">
                    <div className="w-16 h-16 bg-gradient-to-b from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 rounded-lg shadow-md border border-slate-300 flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                      {/* Rank letter */}
                      <span className="text-xl font-bold text-slate-700 tracking-wide">{rank}</span>
                      
                      {/* Premium indicator for high ranks */}
                      {index < 4 && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-md"></div>
                      )}
                      
                      {/* Subtle shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-lg pointer-events-none"></div>
                    </div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-slate-800 text-black text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {rank === 'A' ? 'A (尖子)' : rank === 'K' ? 'K (国王)' : rank === 'Q' ? 'Q (皇后)' : rank === 'J' ? 'J (武士)' : rank === 'T' ? 'T (10)' : `${rank}`}
                    </div>
                  </div>
                ))}
                
                {/* Matrix rows */}
                {RANKS.map((rowRank, i) => (
                  <React.Fragment key={`row-${i}`}>
                    {/* Professional Row header */}
                    <div className="relative group">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 rounded-lg shadow-md border border-slate-300 flex items-center justify-center transition-all duration-200 hover:shadow-lg relative overflow-hidden">
                        {/* Rank letter */}
                        <span className="text-xl font-bold text-slate-700 tracking-wide relative z-10">{rowRank}</span>
                        
                        {/* Premium indicator for high ranks */}
                        {i < 4 && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-md"></div>
                        )}
                        
                        {/* Vertical accent line */}
                        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full"></div>
                        
                        {/* Subtle shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-lg pointer-events-none"></div>
                      </div>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-1 px-2 py-1 bg-slate-800 text-black text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {rowRank === 'A' ? 'A (尖子)' : rowRank === 'K' ? 'K (国王)' : rowRank === 'Q' ? 'Q (皇后)' : rowRank === 'J' ? 'J (武士)' : rowRank === 'T' ? 'T (10)' : `${rowRank}`}
                      </div>
                    </div>
                    
                    {/* Professional Row cells - ENLARGED */}
                    {RANKS.map((_, j) => {
                      const currentHandLabel = cellLabel(i, j);
                      const isSelected = selectedHands.includes(currentHandLabel);
                      
                      if (!matchesFilter(i, j)) {
                        return (
                          <div 
                            key={`${i}-${j}`}
                            className="relative w-16 h-16 group"
                          >
                            <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 hover:from-slate-400 hover:to-slate-500 rounded-lg opacity-50 flex items-center justify-center border border-slate-400 transition-all duration-300 hover:opacity-70 hover:shadow-lg relative overflow-hidden">
                              <span className="text-sm text-slate-700 font-bold relative z-10">{currentHandLabel}</span>
                              {/* Disabled overlay pattern */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                              <div className="absolute top-1 right-1 w-1 h-1 bg-slate-500 rounded-full opacity-60"></div>
                            </div>
                          </div>
                        );
                      }
                      
                      const cell = data[`${i}-${j}`];
                      if (!cell) return (
                        <div 
                          key={`${i}-${j}`}
                          className="relative w-16 h-16 group"
                        >
                          <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 rounded-lg opacity-60 flex items-center justify-center border border-gray-500 transition-all duration-300 hover:opacity-80 hover:shadow-lg relative overflow-hidden">
                            <span className="text-sm text-white font-bold relative z-10">N/A</span>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                          </div>
                        </div>
                      );
                      
                      const cellHandLabel = cellLabel(i, j);
                      const raisePercentage = cell.actions?.raise || 0;
                      
                      // Professional gradient-based color mapping for premium visual experience
                      const getProfessionalColor = (percentage: number): { gradient: string; text: string; border: string; shadow: string } => {
                        // Force percentage to be a safe number
                        const safePercentage = (typeof percentage === 'number' && !isNaN(percentage) && percentage >= 0) 
                          ? Math.round(Math.max(0, Math.min(100, percentage))) 
                          : 0;
                        
                        // PROFESSIONAL gradient system with premium styling
                        if (safePercentage >= 95) return { 
                          gradient: 'from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:via-emerald-800 hover:to-emerald-900', 
                          text: 'text-black', 
                          border: 'border-emerald-500', 
                          shadow: 'shadow-emerald-500/30' 
                        };
                        if (safePercentage >= 85) return { 
                          gradient: 'from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800', 
                          text: 'text-black', 
                          border: 'border-emerald-400', 
                          shadow: 'shadow-emerald-400/30' 
                        };
                        if (safePercentage >= 75) return { 
                          gradient: 'from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800', 
                          text: 'text-black', 
                          border: 'border-green-400', 
                          shadow: 'shadow-green-400/30' 
                        };
                        if (safePercentage >= 65) return { 
                          gradient: 'from-green-400 via-green-500 to-green-600 hover:from-green-500 hover:via-green-600 hover:to-green-700', 
                          text: 'text-black', 
                          border: 'border-green-300', 
                          shadow: 'shadow-green-300/30' 
                        };
                        if (safePercentage >= 55) return { 
                          gradient: 'from-lime-400 via-lime-500 to-yellow-500 hover:from-lime-500 hover:via-yellow-500 hover:to-yellow-600', 
                          text: 'text-gray-900', 
                          border: 'border-lime-300', 
                          shadow: 'shadow-lime-300/40' 
                        };
                        if (safePercentage >= 45) return { 
                          gradient: 'from-yellow-400 via-yellow-500 to-orange-400 hover:from-yellow-500 hover:via-orange-400 hover:to-orange-500', 
                          text: 'text-gray-900', 
                          border: 'border-yellow-300', 
                          shadow: 'shadow-yellow-300/40' 
                        };
                        if (safePercentage >= 35) return { 
                          gradient: 'from-orange-400 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-600 hover:to-red-500', 
                          text: 'text-black', 
                          border: 'border-orange-300', 
                          shadow: 'shadow-orange-300/30' 
                        };
                        if (safePercentage >= 25) return { 
                          gradient: 'from-orange-500 via-orange-600 to-red-500 hover:from-orange-600 hover:via-red-500 hover:to-red-600', 
                          text: 'text-black', 
                          border: 'border-orange-400', 
                          shadow: 'shadow-orange-400/30' 
                        };
                        if (safePercentage >= 15) return { 
                          gradient: 'from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800', 
                          text: 'text-black', 
                          border: 'border-red-400', 
                          shadow: 'shadow-red-400/30' 
                        };
                        if (safePercentage >= 5) return { 
                          gradient: 'from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900', 
                          text: 'text-black', 
                          border: 'border-red-500', 
                          shadow: 'shadow-red-500/30' 
                        };
                        if (safePercentage >= 1) return { 
                          gradient: 'from-red-700 via-red-800 to-red-900 hover:from-red-800 hover:via-red-900 hover:to-gray-900', 
                          text: 'text-black', 
                          border: 'border-red-600', 
                          shadow: 'shadow-red-600/30' 
                        };
                        // ABSOLUTE guarantee for 0 and negative values
                        return { 
                          gradient: 'from-red-800 via-red-900 to-gray-900 hover:from-red-900 hover:via-gray-900 hover:to-black', 
                          text: 'text-black', 
                          border: 'border-red-700', 
                          shadow: 'shadow-red-700/40' 
                        };
                      };
                      
                      // Get professional colors with absolute safety
                      const colorStyle = getProfessionalColor(raisePercentage);
                      
                      // Log any suspicious values for debugging
                      if (raisePercentage < 0 || raisePercentage > 100 || isNaN(raisePercentage)) {
                        console.warn(`Suspicious percentage for ${cellHandLabel}: ${raisePercentage}%`);
                      }
                      
                      // Determine if this is a premium hand
                      const isPremiumHand = raisePercentage >= 85;
                      const isStrongHand = raisePercentage >= 65;
                      
                      return (
                        <Tooltip
                          key={`${i}-${j}`} 
                          title={getTooltipContent(i, j, cell.actions)}
                          placement="top"
                        >
                          <div className="relative group">
                            <div
                              onClick={() => handleCellClick(i, j)}
                              className={`w-16 h-16 bg-gradient-to-br ${colorStyle.gradient} ${colorStyle.text} rounded-lg cursor-pointer transition-all duration-300 ease-out flex flex-col items-center justify-center text-xs font-bold shadow-lg ${colorStyle.shadow} hover:shadow-xl hover:scale-105 hover:-translate-y-0.5 relative overflow-hidden border-2 ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : colorStyle.border} group-hover:z-10`}
                              data-raise={raisePercentage}
                              data-hand={cellHandLabel}
                            >
                              {/* Premium hand indicator */}
                              {isPremiumHand && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full shadow-md animate-pulse"></div>
                              )}
                              
                              {/* Strong hand subtle indicator */}
                              {isStrongHand && !isPremiumHand && (
                                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-gradient-to-br from-blue-300 to-blue-500 rounded-full shadow-md"></div>
                              )}
                              
                              {/* Selection indicator */}
                              {isSelected && (
                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              
                              {/* Hand label with enhanced readability */}
                              <div className="text-xs font-bold leading-none relative z-10 drop-shadow-md">
                                {cellHandLabel}
                              </div>
                              
                              {/* Percentage with professional styling */}
                              <div className="text-xs leading-none mt-1 opacity-95 relative z-10 drop-shadow-md">
                                {raisePercentage}%
                              </div>
                              
                              {/* Subtle shine overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg pointer-events-none"></div>
                              
                              {/* Bottom accent line for premium hands */}
                              {isPremiumHand && (
                                <div className="absolute bottom-1 left-1 right-1 h-0.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 rounded-full shadow-sm"></div>
                              )}
                            </div>
                          </div>
                        </Tooltip>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          
          {/* Enhanced 10-Level Legend */}
          <div className="mt-6">
            <div className="flex items-center justify-center flex-wrap gap-3 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-700 rounded-sm"></div>
                <span className="text-xs text-gray-600">95%+</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
                <span className="text-xs text-gray-600">85-94%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                <span className="text-xs text-gray-600">75-84%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-xs text-gray-600">65-74%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-lime-400 rounded-sm"></div>
                <span className="text-xs text-gray-600">55-64%</span>
              </div>
            </div>
            <div className="flex items-center justify-center flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
                <span className="text-xs text-gray-600">45-54%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                <span className="text-xs text-gray-600">35-44%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <span className="text-xs text-gray-600">25-34%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span className="text-xs text-gray-600">15-24%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                <span className="text-xs text-gray-600">5-14%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-700 rounded-sm"></div>
                <span className="text-xs text-gray-600">1-4%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-800 rounded-sm"></div>
                <span className="text-xs text-gray-600">0%</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500 italic">加注频率级别 • 越深色 = 越激进</span>
            </div>
          </div>
        </div>


        {/* Enhanced Strategy Details Modal */}
        {modalData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-700">
                        {cellLabel(modalData.i, modalData.j)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">手牌分析</h3>
                      <p className="text-sm text-gray-500">{getHandDescription(modalData.i, modalData.j)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalData(null)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Strategy Score */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-700 mb-1">
                      {(modalData.score * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-indigo-600">策略强度</div>
                  </div>
                </div>

                {/* Action Breakdown */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-base font-semibold text-gray-900">行动分布</h4>
                  
                  <div className="space-y-3">
                    <ActionBar 
                      label="加注" 
                      value={modalData.actions.raise} 
                      color="bg-red-500"
                      icon="📈"
                    />
                    <ActionBar 
                      label="跟注" 
                      value={modalData.actions.call} 
                      color="bg-yellow-500"
                      icon="✋"
                    />
                    <ActionBar 
                      label="弃牌" 
                      value={modalData.actions.fold} 
                      color="bg-gray-500"
                      icon="🚫"
                    />
                  </div>
                </div>

                {/* Strategy Advice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                      💡
                    </div>
                    <div>
                      <div className="font-medium text-green-800 mb-2">策略建议</div>
                      <div className="text-sm text-green-700 leading-relaxed">
                        {getStrategyAdvice(modalData.actions)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setModalData(null)}
                  className="w-full py-2.5 bg-indigo-600 text-black rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium hover:scale-105 hover:shadow-lg"
                >
                  关闭分析
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Action Bar Component for strategy breakdown
interface ActionBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function ActionBar({ label, value, color, icon }: ActionBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}