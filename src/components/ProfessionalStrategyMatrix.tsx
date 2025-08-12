import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Layout, 
  Row, 
  Col, 
  Card, 
  Typography, 
  Space, 
  Tag, 
  Tooltip, 
  Modal, 
  Button, 
  Select, 
  Switch, 
  Slider, 
  Divider,
  Badge,
  Statistic,
  Table,
  Tabs,
  Alert,
  Spin
} from 'antd';
import type { TabsProps } from 'antd';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;


// 手牌等级定义
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// 策略数据接口
interface StrategyData {
  hand: string;
  raise: number;
  call: number;
  fold: number;
  ev: number;
  confidence: number;
  standardDeviation: number;
  description: string;
  category: 'elite' | 'premium' | 'strong' | 'standard' | 'marginal' | 'weak' | 'poor';
  handType: 'pair' | 'suited' | 'offsuit';
}

// 筛选设置接口
interface FilterSettings {
  handTypes: ('pair' | 'suited' | 'offsuit')[];
  positions: ('EP' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB')[];
  stackSizes: ('short' | 'medium' | 'deep')[];
  opponentTypes: ('tight' | 'loose' | 'aggressive' | 'passive')[];
  evRange: [number, number];
  raiseRange: [number, number];
}

// 交互状态接口
interface InteractionState {
  selectedCells: string[];
  hoveredCell: string | null;
  viewMode: 'basic' | 'advanced' | 'compare';
  isMultiSelect: boolean;
  isFullscreen: boolean;
  showStats: boolean;
  selectedLegendCategory: StrategyData['category'] | null; // 选中的图例类别
}

// 主题色彩系统
const ColorSystem = {
  strategy: {
    elite: '#14532D',      // 精英级 (95%+) - 极深墨绿
    premium: '#047857',     // 优质级 (85-94%) - 深森林绿
    strong: '#22C55E',      // 强力级 (70-84%) - 鲜亮绿色
    standard: '#FCD34D',    // 标准级 (50-69%)
    marginal: '#FB923C',    // 边缘级 (30-49%)
    weak: '#EF4444',        // 弱势级 (15-29%)
    poor: '#DC2626',        // 较差级 (<15%)
  },
  interaction: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    hover: '#E5E7EB',
    selected: '#DBEAFE',
    disabled: '#F3F4F6',
  },
  backgrounds: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    surface: '#EFF6FF',
    border: '#E5E7EB',
  },
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#6B7280',
    disabled: '#9CA3AF',
    inverse: '#FFFFFF',
  }
};

// 获取策略颜色
const getStrategyColor = (raisePercentage: number): string => {
  if (raisePercentage >= 95) return ColorSystem.strategy.elite;
  if (raisePercentage >= 85) return ColorSystem.strategy.premium;
  if (raisePercentage >= 70) return ColorSystem.strategy.strong;
  if (raisePercentage >= 50) return ColorSystem.strategy.standard;
  if (raisePercentage >= 30) return ColorSystem.strategy.marginal;
  if (raisePercentage >= 15) return ColorSystem.strategy.weak;
  return ColorSystem.strategy.poor;
};

// 获取策略等级
const getStrategyCategory = (raisePercentage: number): StrategyData['category'] => {
  if (raisePercentage >= 95) return 'elite';
  if (raisePercentage >= 85) return 'premium';
  if (raisePercentage >= 70) return 'strong';
  if (raisePercentage >= 50) return 'standard';
  if (raisePercentage >= 30) return 'marginal';
  if (raisePercentage >= 15) return 'weak';
  return 'poor';
};

// 获取策略描述
const getStrategyDescription = (raisePercentage: number): string => {
  if (raisePercentage >= 95) return '精英级加注';
  if (raisePercentage >= 85) return '优质级加注';
  if (raisePercentage >= 70) return '强力级加注';
  if (raisePercentage >= 50) return '标准级混合';
  if (raisePercentage >= 30) return '边缘级跟注';
  if (raisePercentage >= 15) return '弱势级弃牌';
  return '较差级弃牌';
};

// 获取手牌类型中文说明
const getHandTypeText = (handType: 'pair' | 'suited' | 'offsuit'): string => {
  switch (handType) {
    case 'pair':
      return '对子';
    case 'suited':
      return '同花';
    case 'offsuit':
      return '杂牌';
    default:
      return '未知';
  }
};

// 格式化手牌显示（将 s/o 转换为中文）
const formatHandDisplay = (hand: string): string => {
  if (hand.endsWith('s')) {
    return hand.slice(0, -1) + '同';
  }
  if (hand.endsWith('o')) {
    return hand.slice(0, -1) + '杂';
  }
  return hand; // 对子或其他情况保持原样
};

// 生成模拟策略数据
const generateStrategyData = (filters: FilterSettings): StrategyData[] => {
  const data: StrategyData[] = [];
  
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      const hand = i === j ? `${RANKS[i]}${RANKS[j]}` : 
                   i < j ? `${RANKS[i]}${RANKS[j]}s` : `${RANKS[j]}${RANKS[i]}o`;
      
      const handType: StrategyData['handType'] = i === j ? 'pair' : i < j ? 'suited' : 'offsuit';
      
      // 基础策略计算
      let baseRaise = 0;
      if (i === j) baseRaise += 40; // 对子加成
      if (i < j) baseRaise += 15; // 同花加成
      if (i < 4 && j < 4) baseRaise += 25; // 高牌加成
      
      // 位置调整
      const positionMap = { 'EP': -10, 'MP': -5, 'CO': 5, 'BTN': 15, 'SB': 0, 'BB': -20 };
      const positionBonus = filters.positions.reduce((sum, pos) => sum + (positionMap[pos] || 0), 0) / filters.positions.length;
      baseRaise += positionBonus;
      
      // 筹码深度调整
      const stackMap = { 'short': -10, 'medium': 0, 'deep': 10 };
      const stackBonus = filters.stackSizes.reduce((sum, size) => sum + (stackMap[size] || 0), 0) / filters.stackSizes.length;
      baseRaise += stackBonus;
      
      // 添加随机变化
      const raise = Math.min(100, Math.max(0, baseRaise + (Math.random() - 0.5) * 25));
      const call = Math.random() * (100 - raise) * 0.6;
      const fold = 100 - raise - call;
      const ev = (raise / 100) * 3 - 1;
      const confidence = 0.6 + Math.random() * 0.4;
      const standardDeviation = 0.2 + Math.random() * 0.5;
      
      data.push({
        hand,
        raise: Math.round(raise),
        call: Math.round(call),
        fold: Math.round(fold),
        ev: Number(ev.toFixed(2)),
        confidence: Number(confidence.toFixed(2)),
        standardDeviation: Number(standardDeviation.toFixed(2)),
        description: getStrategyDescription(raise),
        category: getStrategyCategory(raise),
        handType,
      });
    }
  }
  
  return data;
};

// 矩阵单元格组件 - 使用 React.memo 优化
const MatrixCell: React.FC<{
  data: StrategyData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (isHovering: boolean) => void;
  viewMode: InteractionState['viewMode'];
  selectedLegendCategory: StrategyData['category'] | null;
}> = ({ data, isSelected, isHovered, onClick, onHover, viewMode, selectedLegendCategory }) => {
  const strategyColor = getStrategyColor(data.raise);
  
  // 智能高亮筛选逻辑
  const isHighlighted = selectedLegendCategory === null || selectedLegendCategory === data.category;
  const isDimmed = selectedLegendCategory !== null && selectedLegendCategory !== data.category;
  
  const cellContent = (
    <div 
      className={`
        w-12 sm:w-16 h-12 sm:h-16 border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer
        transition-all duration-300 transform hover:scale-105 relative overflow-hidden mx-2
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-[1.03]' : ''}
        ${isHovered ? 'shadow-lg z-10' : 'shadow-sm'}
        ${isDimmed ? 'opacity-30' : ''}
        ${isHighlighted && selectedLegendCategory ? 'ring-2 ring-yellow-400 shadow-xl scale-105 brightness-110' : ''}
      `}
      style={{ 
        backgroundColor: isSelected ? `${strategyColor}20` : strategyColor,
        borderColor: isHovered ? strategyColor : ColorSystem.backgrounds.border,
        color: ColorSystem.text.primary
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* 手牌标签 */}
      <div className={`text-sm sm:text-base ${isSelected ? 'font-black' : 'font-bold'}`} style={{ color: ColorSystem.text.primary }}>
        {formatHandDisplay(data.hand)}
      </div>
      
      {/* 策略百分比 */}
      <div className={`text-xs sm:text-sm ${isSelected ? 'font-bold' : 'font-semibold'}`} style={{ color: ColorSystem.text.primary }}>
        {data.raise}%
      </div>
      
      {/* 高级视图显示额外信息 */}
      {viewMode === 'advanced' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: strategyColor }}></div>
      )}
      
      {/* 悬停效果 */}
      {isHovered && (
        <div className="absolute inset-0 bg-white bg-opacity-20 pointer-events-none"></div>
      )}
    </div>
  );

  return (
    <Tooltip
      title={
        <div className="p-4 min-w-[250px]">
          <div className="font-semibold mb-3 flex items-center justify-between">
            <span className="text-lg">{formatHandDisplay(data.hand)}</span>
            <Tag color={strategyColor} className="text-sm">
              {data.description}
            </Tag>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>加注:</span>
              <span className="font-semibold text-green-600">{data.raise}%</span>
            </div>
            <div className="flex justify-between">
              <span>跟注:</span>
              <span className="font-semibold text-yellow-600">{data.call}%</span>
            </div>
            <div className="flex justify-between">
              <span>弃牌:</span>
              <span className="font-semibold text-red-600">{data.fold}%</span>
            </div>
            <div className="flex justify-between">
              <span>期望收益:</span>
              <span className="font-semibold">{data.ev}BB</span>
            </div>
            <div className="flex justify-between">
              <span>置信度:</span>
              <span className="font-semibold">{(data.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      }
      placement="top"
    >
      {cellContent}
    </Tooltip>
  );
};

// 使用 React.memo 优化渲染性能
const MemoizedMatrixCell = React.memo(MatrixCell);

// 筛选面板组件
const FilterPanel: React.FC<{
  filters: FilterSettings;
  onFiltersChange: (filters: FilterSettings) => void;
}> = ({ filters, onFiltersChange }) => {
  const updateFilters = (updates: Partial<FilterSettings>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  return (
    <Card 
      title={
        <Space>
          <span>🔍</span>
          <span>策略筛选器</span>
        </Space>
      }
      size="small"
      className="h-full"
    >
      <Space direction="vertical" className="w-full" size="middle">
        {/* 手牌类型筛选 */}
        <div>
          <Text strong className="text-sm">手牌类型</Text>
          <Select
            mode="multiple"
            value={filters.handTypes}
            onChange={(value) => updateFilters({ handTypes: value })}
            className="w-full mt-1"
            size="small"
          >
            <Option value="pair">对子</Option>
            <Option value="suited">同花</Option>
            <Option value="offsuit">杂牌</Option>
          </Select>
        </div>

        {/* 位置筛选 */}
        <div>
          <Text strong className="text-sm">位置</Text>
          <Select
            mode="multiple"
            value={filters.positions}
            onChange={(value) => updateFilters({ positions: value })}
            className="w-full mt-1"
            size="small"
          >
            <Option value="EP">前位（EP）</Option>
            <Option value="MP">中位（MP）</Option>
            <Option value="CO">劫位（CO）</Option>
            <Option value="BTN">按钮位（BTN）</Option>
            <Option value="SB">小盲（SB）</Option>
            <Option value="BB">大盲（BB）</Option>
          </Select>
        </div>

        {/* 筹码深度筛选 */}
        <div>
          <Text strong className="text-sm">筹码深度</Text>
          <Select
            mode="multiple"
            value={filters.stackSizes}
            onChange={(value) => updateFilters({ stackSizes: value })}
            className="w-full mt-1"
            size="small"
          >
            <Option value="short">浅码 (&lt;50BB)</Option>
            <Option value="medium">中码 (50-100BB)</Option>
            <Option value="deep">深码 (&gt;100BB)</Option>
          </Select>
        </div>

        {/* 对手类型筛选 */}
        <div>
          <Text strong className="text-sm">对手类型</Text>
          <Select
            mode="multiple"
            value={filters.opponentTypes}
            onChange={(value) => updateFilters({ opponentTypes: value })}
            className="w-full mt-1"
            size="small"
          >
            <Option value="tight">紧凶</Option>
            <Option value="loose">松凶</Option>
            <Option value="aggressive">激进</Option>
            <Option value="passive">被动</Option>
          </Select>
        </div>

        <Divider />

        {/* EV 范围筛选 */}
        <div>
          <Text strong className="text-sm">期望收益范围 (BB)</Text>
          <Slider
            range
            min={-3}
            max={3}
            step={0.1}
            value={filters.evRange}
            onChange={(value) => updateFilters({ evRange: value as [number, number] })}
            className="mt-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{filters.evRange[0]}BB</span>
            <span>{filters.evRange[1]}BB</span>
          </div>
        </div>

        {/* 加注范围筛选 */}
        <div>
          <Text strong className="text-sm">加注频率范围 (%)</Text>
          <Slider
            range
            min={0}
            max={100}
            value={filters.raiseRange}
            onChange={(value) => updateFilters({ raiseRange: value as [number, number] })}
            className="mt-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{filters.raiseRange[0]}%</span>
            <span>{filters.raiseRange[1]}%</span>
          </div>
        </div>
      </Space>
    </Card>
  );
};

// 详情模态框组件
const DetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedHand: StrategyData | null;
  compareHands: StrategyData[];
}> = ({ visible, onClose, selectedHand, compareHands }) => {
  const tabItems: TabsProps['items'] = [
    {
      key: 'basic',
      label: '基础信息',
      children: selectedHand && (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" title="手牌信息">
              <Space direction="vertical" className="w-full">
                <div className="flex justify-between">
                  <Text>手牌:</Text>
                  <Tag color="blue">{formatHandDisplay(selectedHand.hand)}</Tag>
                </div>
                <div className="flex justify-between">
                  <Text>类型:</Text>
                  <Tag color="purple">{getHandTypeText(selectedHand.handType)}</Tag>
                </div>
                <div className="flex justify-between">
                  <Text>策略等级:</Text>
                  <Tag color={getStrategyColor(selectedHand.raise)}>
                    {selectedHand.description}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="收益分析">
              <Space direction="vertical" className="w-full">
                <Statistic 
                  title="期望收益" 
                  value={selectedHand.ev} 
                  suffix="BB" 
                  valueStyle={{ color: selectedHand.ev > 0 ? '#3f8600' : '#cf1322' }}
                />
                <Statistic 
                  title="置信度" 
                  value={selectedHand.confidence * 100} 
                  suffix="%" 
                  precision={1}
                />
                <div>
                  <Text className="text-sm">标准差: </Text>
                  <Text strong>{selectedHand.standardDeviation}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'strategy',
      label: '策略分析',
      children: selectedHand && (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card size="small" title="行动分布">
              <Space direction="vertical" className="w-full">
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>加注:</Text>
                    <Text strong className="text-green-600">{selectedHand.raise}%</Text>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${selectedHand.raise}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>跟注:</Text>
                    <Text strong className="text-yellow-600">{selectedHand.call}%</Text>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${selectedHand.call}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>弃牌:</Text>
                    <Text strong className="text-red-600">{selectedHand.fold}%</Text>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${selectedHand.fold}%` }}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'compare',
      label: '对比分析',
      children: compareHands.length > 0 ? (
        <Table
          size="small"
          dataSource={compareHands}
          columns={[
            {
              title: '手牌',
              dataIndex: 'hand',
              key: 'hand',
              render: (text) => <Tag color="blue">{text}</Tag>,
            },
            {
              title: '加注',
              dataIndex: 'raise',
              key: 'raise',
              render: (text) => `${text}%`,
            },
            {
              title: '跟注',
              dataIndex: 'call',
              key: 'call',
              render: (text) => `${text}%`,
            },
            {
              title: '弃牌',
              dataIndex: 'fold',
              key: 'fold',
              render: (text) => `${text}%`,
            },
            {
              title: 'EV',
              dataIndex: 'ev',
              key: 'ev',
              render: (text) => `${text}BB`,
            },
          ]}
          pagination={false}
        />
      ) : (
        <Alert message="请选择多手牌进行对比分析" type="info" />
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <span>ℹ️</span>
          <span>手牌详细分析</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Tabs defaultActiveKey="basic" items={tabItems} />
    </Modal>
  );
};

// 主要策略矩阵组件
const ProfessionalStrategyMatrix: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<FilterSettings>({
    handTypes: ['pair', 'suited', 'offsuit'],
    positions: ['BTN'],
    stackSizes: ['medium'],
    opponentTypes: ['tight'],
    evRange: [-3, 3],
    raiseRange: [0, 100],
  });

  const [interaction, setInteraction] = useState<InteractionState>({
    selectedCells: [],
    hoveredCell: null,
    viewMode: 'basic',
    isMultiSelect: false,
    isFullscreen: false,
    showStats: true,
    selectedLegendCategory: null,
  });

  const [strategyData, setStrategyData] = useState<StrategyData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);
  
  
  // 生成策略数据
  useEffect(() => {
    setLoading(true);
    // 模拟异步数据加载
    const timer = setTimeout(() => {
      const data = generateStrategyData(filters);
      setStrategyData(data);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return strategyData.filter(data => {
      // 手牌类型筛选
      if (!filters.handTypes.includes(data.handType)) return false;
      
      // EV范围筛选
      if (data.ev < filters.evRange[0] || data.ev > filters.evRange[1]) return false;
      
      // 加注范围筛选
      if (data.raise < filters.raiseRange[0] || data.raise > filters.raiseRange[1]) return false;
      
      return true;
    });
  }, [strategyData, filters]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 防止在输入框中触发快捷键
      if ((event.target as HTMLElement).tagName === 'INPUT' || 
          (event.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + 多选模式
      if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
        event.preventDefault();
        setInteraction(prev => ({ ...prev, isMultiSelect: !prev.isMultiSelect }));
        return;
      }

      // Ctrl/Cmd + A 全选
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        if (interaction.isMultiSelect) {
          const allHands = filteredData.map(d => d.hand);
          setInteraction(prev => ({ ...prev, selectedCells: allHands }));
        }
        return;
      }

      // Escape 取消选择/关闭模态框
      if (event.key === 'Escape') {
        if (showDetails) {
          setShowDetails(false);
        } else if (interaction.selectedCells.length > 0) {
          setInteraction(prev => ({ ...prev, selectedCells: [] }));
        }
        return;
      }

      // Enter 打开详情
      if (event.key === 'Enter' && interaction.selectedCells.length === 1) {
        setShowDetails(true);
        return;
      }

      // Delete 清除选择
      if (event.key === 'Delete' && interaction.selectedCells.length > 0) {
        setInteraction(prev => ({ ...prev, selectedCells: [] }));
        return;
      }

      // F 切换全屏
      if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
        return;
      }

      // S 切换统计显示
      if (event.key === 's' || event.key === 'S') {
        setInteraction(prev => ({ ...prev, showStats: !prev.showStats }));
        return;
      }

      // R 刷新数据
      if (event.key === 'r' || event.key === 'R') {
        // 模拟刷新
        setLoading(true);
        setTimeout(() => {
          const data = generateStrategyData(filters);
          setStrategyData(data);
          setLoading(false);
        }, 500);
        return;
      }

      // 方向键导航
      if (matrixRef.current) {
        const currentFocus = document.activeElement;
        if (currentFocus && matrixRef.current.contains(currentFocus)) {
          let newFocus: HTMLElement | null = null;

          switch (event.key) {
            case 'ArrowUp':
              event.preventDefault();
              newFocus = currentFocus.parentElement?.previousElementSibling?.querySelector('[tabindex="0"]') as HTMLElement;
              break;
            case 'ArrowDown':
              event.preventDefault();
              newFocus = currentFocus.parentElement?.nextElementSibling?.querySelector('[tabindex="0"]') as HTMLElement;
              break;
            case 'ArrowLeft':
              event.preventDefault();
              newFocus = currentFocus.previousElementSibling as HTMLElement;
              break;
            case 'ArrowRight':
              event.preventDefault();
              newFocus = currentFocus.nextElementSibling as HTMLElement;
              break;
          }

          if (newFocus) {
            newFocus.focus();
          }
        }
      }

      // ? 显示快捷键帮助
      if (event.key === '?') {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filters, interaction.isMultiSelect, interaction.selectedCells, showDetails, filteredData]);

  // 统计数据
  const statistics = useMemo(() => {
    const total = filteredData.length;
    const elite = filteredData.filter(d => d.category === 'elite').length;
    const premium = filteredData.filter(d => d.category === 'premium').length;
    const strong = filteredData.filter(d => d.category === 'strong').length;
    const avgEV = filteredData.reduce((sum, d) => sum + d.ev, 0) / total;
    
    return {
      total,
      elite,
      premium,
      strong,
      avgEV: Number(avgEV.toFixed(2)),
    };
  }, [filteredData]);

  // 处理单元格点击
  const handleCellClick = (hand: string) => {
    if (interaction.isMultiSelect) {
      setInteraction(prev => ({
        ...prev,
        selectedCells: prev.selectedCells.includes(hand)
          ? prev.selectedCells.filter(h => h !== hand)
          : [...prev.selectedCells, hand],
      }));
    } else {
      setInteraction(prev => ({ ...prev, selectedCells: [hand] }));
      setShowDetails(true);
    }
  };

  // 处理单元格悬停
  const handleCellHover = (hand: string | null) => {
    setInteraction(prev => ({ ...prev, hoveredCell: hand }));
  };

  // 处理图例点击 - 智能高亮筛选
  const handleLegendClick = (category: StrategyData['category']) => {
    setInteraction(prev => ({
      ...prev,
      selectedLegendCategory: prev.selectedLegendCategory === category ? null : category
    }));
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setInteraction(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  // 获取选中的手牌数据
  const selectedHandData = useMemo(() => {
    if (interaction.selectedCells.length === 1) {
      return filteredData.find(d => d.hand === interaction.selectedCells[0]) || null;
    }
    return null;
  }, [interaction.selectedCells, filteredData]);

  const compareHandData = useMemo(() => {
    return filteredData.filter(d => interaction.selectedCells.includes(d.hand));
  }, [interaction.selectedCells, filteredData]);

  // 渲染矩阵网格
  const renderMatrix = () => {
    return (
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border">
        {/* 聚焦状态提示 */}
        {interaction.selectedLegendCategory && (
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                <Text strong className="text-yellow-800">
                  聚焦：{interaction.selectedLegendCategory === 'elite' ? '精英级' :
                        interaction.selectedLegendCategory === 'premium' ? '优质级' :
                        interaction.selectedLegendCategory === 'strong' ? '强力级' :
                        interaction.selectedLegendCategory === 'standard' ? '标准级' :
                        interaction.selectedLegendCategory === 'marginal' ? '边缘级' :
                        interaction.selectedLegendCategory === 'weak' ? '弱势级' : '较差级'}手牌 
                  ({filteredData.filter(d => d.category === interaction.selectedLegendCategory).length}手牌)
                </Text>
              </div>
              <Button 
                size="small" 
                type="text" 
                onClick={() => setInteraction(prev => ({ ...prev, selectedLegendCategory: null }))}
                className="text-yellow-600 hover:text-yellow-800"
              >
                取消聚焦
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
          <Title level={4} className="m-0 text-lg md:text-base">13×13 策略矩阵</Title>
          <Space>
            <Badge count={filteredData.length} showZero color="blue">
              <Text className="text-sm">显示手牌</Text>
            </Badge>
          </Space>
        </div>
        
        <div ref={matrixRef} className="overflow-auto">
          {/* 列标题 */}
          <div className="flex ml-20 sm:ml-20 mb-4 md:mb-5">
            {RANKS.map(rank => (
              <div key={`col-${rank}`} className="w-12 sm:w-16 h-10 sm:h-12 flex items-center justify-center text-sm sm:text-base font-semibold text-gray-600 bg-gray-50 rounded-md border border-gray-200 mx-2">
                {rank}
              </div>
            ))}
          </div>
          
          {/* 矩阵行 */}
          <div className="space-y-4 md:space-y-5">
            {RANKS.map((rowRank, i) => (
              <div key={`row-${i}`} className="flex items-center">
                {/* 行标题 */}
                <div className="w-12 sm:w-16 h-12 sm:h-16 flex items-center justify-center text-sm sm:text-base font-semibold text-gray-600 bg-gray-50 rounded-md border border-gray-200 mr-4 sm:mr-6">
                  {rowRank}
                </div>
                
                {/* 矩阵单元格 */}
                {RANKS.map((colRank, j) => {
                  const hand = i === j ? `${rowRank}${colRank}` : 
                               i < j ? `${rowRank}${colRank}s` : `${colRank}${rowRank}o`;
                  const data = filteredData.find(d => d.hand === hand);
                  
                  if (!data) {
                    return (
                      <div
                        key={hand}
                        className="w-12 sm:w-16 h-12 sm:h-16 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center text-sm text-gray-400 mx-2"
                      >
                        {formatHandDisplay(hand)}
                      </div>
                    );
                  }
                  
                  return (
                    <MemoizedMatrixCell
                      key={hand}
                      data={data}
                      isSelected={interaction.selectedCells.includes(hand)}
                      isHovered={interaction.hoveredCell === hand}
                      onClick={() => handleCellClick(hand)}
                      onHover={(isHovering) => handleCellHover(isHovering ? hand : null)}
                      viewMode={interaction.viewMode}
                      selectedLegendCategory={interaction.selectedLegendCategory}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染统计信息
  const renderStatistics = () => {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="总手牌数" value={statistics.total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="精英级" 
              value={statistics.elite} 
              suffix={`/ ${statistics.total}`}
              valueStyle={{ color: ColorSystem.strategy.elite }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="优质级" 
              value={statistics.premium} 
              suffix={`/ ${statistics.total}`}
              valueStyle={{ color: ColorSystem.strategy.premium }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="平均EV" 
              value={statistics.avgEV} 
              suffix="BB" 
              precision={2}
              valueStyle={{ color: statistics.avgEV > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染工具栏
  const renderToolbar = () => {
    return (
      <Card size="small" className="mb-4">
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                type={interaction.isMultiSelect ? 'primary' : 'default'}
                size="small"
                onClick={() => setInteraction(prev => ({ ...prev, isMultiSelect: !prev.isMultiSelect }))}
              >
                多选模式 {interaction.isMultiSelect ? '✓' : ''}
              </Button>
              <Button
                size="small"
                onClick={() => setInteraction(prev => ({ ...prev, selectedCells: [] }))}
                disabled={interaction.selectedCells.length === 0}
              >
                清除选择
              </Button>
              <Select
                value={interaction.viewMode}
                onChange={(value) => setInteraction(prev => ({ ...prev, viewMode: value }))}
                size="small"
                style={{ width: 120 }}
              >
                <Option value="basic">基础视图</Option>
                <Option value="advanced">高级视图</Option>
                <Option value="compare">对比视图</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Switch
                checked={interaction.showStats}
                onChange={(checked) => setInteraction(prev => ({ ...prev, showStats: checked }))}
                size="small"
                checkedChildren="统计"
                unCheckedChildren="统计"
              />
              <Button
                size="small"
                onClick={toggleFullscreen}
              >
                {interaction.isFullscreen ? '🗗 退出全屏' : '🗖 全屏'}
              </Button>
              <Button size="small">
                📥 导出
              </Button>
              <Button size="small" onClick={() => {}}>
                🔄 刷新
              </Button>
              <Tooltip title="快捷键帮助 (?)">
                <Button 
                  size="small" 
                  onClick={() => setShowKeyboardShortcuts(true)}
                >
                  ⌨️
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染图例
  const renderLegend = () => {
    const legendItems = [
      { color: ColorSystem.strategy.elite, label: '精英级 (95%+)', count: statistics.elite, category: 'elite' as const },
      { color: ColorSystem.strategy.premium, label: '优质级 (85-94%)', count: statistics.premium, category: 'premium' as const },
      { color: ColorSystem.strategy.strong, label: '强力级 (70-84%)', count: statistics.strong, category: 'strong' as const },
      { color: ColorSystem.strategy.standard, label: '标准级 (50-69%)', count: filteredData.filter(d => d.category === 'standard').length, category: 'standard' as const },
      { color: ColorSystem.strategy.marginal, label: '边缘级 (30-49%)', count: filteredData.filter(d => d.category === 'marginal').length, category: 'marginal' as const },
      { color: ColorSystem.strategy.weak, label: '弱势级 (15-29%)', count: filteredData.filter(d => d.category === 'weak').length, category: 'weak' as const },
      { color: ColorSystem.strategy.poor, label: '较差级 (<15%)', count: filteredData.filter(d => d.category === 'poor').length, category: 'poor' as const },
    ];

    return (
      <div className="mt-6">
        {/* 醒目的标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-full border-2 border-indigo-200 shadow-lg">
            <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mr-3 animate-pulse"></div>
            <span className="text-lg font-bold text-indigo-800 tracking-wide">策略强度图例</span>
            <div className="w-3 h-3 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full ml-3 animate-pulse"></div>
          </div>
        </div>

        {/* 优化的图例网格 */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <Row gutter={[20, 20]} justify="start">
            {legendItems.map((item, index) => {
              const isSelected = interaction.selectedLegendCategory === item.category;
              return (
                <Col key={index} xs={12} sm={8} md={6} lg={8} xl={6}>
                  <div className="group cursor-pointer" onClick={() => handleLegendClick(item.category)}>
                    <div className={`flex flex-col items-center p-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 transition-all duration-300 hover:scale-105 relative ${
                      isSelected 
                        ? 'border-indigo-500 shadow-lg bg-gradient-to-b from-indigo-50 to-blue-50 scale-105' 
                        : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'
                    }`}>
                    {/* 更大的颜色指示器 */}
                    <div 
                      className="w-12 h-12 rounded-lg shadow-lg border-2 border-white mb-3 group-hover:scale-110 transition-transform duration-300" 
                      style={{ 
                        backgroundColor: item.color,
                        boxShadow: `0 4px 12px ${item.color}30`
                      }}
                    />
                    
                    {/* 等级标签 */}
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-800 mb-1 leading-tight">
                        {item.label}
                      </div>
                      <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full">
                        <span className="text-xs font-medium text-gray-600">{item.count}</span>
                        <span className="text-xs text-gray-500 ml-1">手牌</span>
                      </div>
                    </div>

                    {/* 悬停时的进度条效果 */}
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div 
                        className="h-1 rounded-full transition-all duration-500 group-hover:w-full"
                        style={{ 
                          backgroundColor: item.color,
                          width: '0%'
                        }}
                      />
                    </div>
                    {/* 选中状态指示器 */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </Col>
              );
            })}
          </Row>

          {/* 底部说明 */}
          <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full">
              <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-gray-600 font-medium">
                根据 GTO 策略加注频率划分 • 颜色越深代表越激进
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 主要布局
  const mainLayout = (
    <Layout className=" bg-gray-50">
      <Header className="bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4">
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={3} className="m-0 text-blue-600">
                专业策略矩阵
              </Title>
            </Col>
            <Col>
              <Space>
                <Text type="secondary">基于博弈论最优化的扑克策略分析工具</Text>
              </Space>
            </Col>
          </Row>
        </div>
      </Header>

      <Content className="p-4">
        <div className="max-w-[1440px] mx-auto">
          {/* 工具栏 */}
          {renderToolbar()}

          {/* 统计信息 */}
          {interaction.showStats && renderStatistics()}
          
          <div className='mb-6'/>

          <Row gutter={[16, 16]}>
            {/* 筛选面板 */}
            <Col xs={24} lg={5}>
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
              />
            </Col>

            {/* 矩阵主体 */}
            <Col xs={24} lg={19}>
                <Spin spinning={loading} size='large' tip='加载中...'>
                  {renderMatrix()}
                  {renderLegend()}
                </Spin>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );

  return (
    <>
      {mainLayout}
      
      {/* 详情模态框 */}
      <DetailModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        selectedHand={selectedHandData}
        compareHands={compareHandData}
      />

      {/* 键盘快捷键帮助模态框 */}
      <Modal
        title="键盘快捷键"
        open={showKeyboardShortcuts}
        onCancel={() => setShowKeyboardShortcuts(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="基础操作">
                <Space direction="vertical" className="w-full" size="small">
                  <div className="flex justify-between">
                    <Text>多选模式</Text>
                    <Tag>Ctrl/Cmd + M</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>全选手牌</Text>
                    <Tag>Ctrl/Cmd + A</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>取消选择</Text>
                    <Tag>Esc</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>清除选择</Text>
                    <Tag>Delete</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>打开详情</Text>
                    <Tag>Enter</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="视图控制">
                <Space direction="vertical" className="w-full" size="small">
                  <div className="flex justify-between">
                    <Text>全屏模式</Text>
                    <Tag>F</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>统计显示</Text>
                    <Tag>S</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>刷新数据</Text>
                    <Tag>R</Tag>
                  </div>
                  <div className="flex justify-between">
                    <Text>帮助</Text>
                    <Tag>?</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
          
          <Alert
            message="提示"
            description="在输入框中输入时，快捷键将被禁用。使用方向键可以在矩阵中导航。"
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </>
  );
};

export default ProfessionalStrategyMatrix;