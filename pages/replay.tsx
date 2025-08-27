import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, Button, Typography, Space, Empty, Spin, message, Input, Select, Row, Col, Badge, Tooltip } from 'antd';
import { 
  PlayCircleOutlined, 
  BarChartOutlined, 
  HistoryOutlined, 
  ArrowLeftOutlined,
  SearchOutlined,
  FilterOutlined,
  TrophyOutlined,
  DashboardOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { HandReplayViewer } from '@/components/replay/HandReplayViewer';
import HandHistoryCard from '@/components/replay/HandHistoryCard';
import { CompactHandHistory } from '@/types/hand-history';
import { LocalHandHistoryManager } from '@/lib/hand-history-manager';
import { StorageManager } from '@/lib/storage/storage-manager';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

/**
 * 手牌回放页面 - Phase 2.2新功能
 * 展示完整的回放系统和GTO分析功能
 */
export default function ReplayPage() {
  const [handHistoryManager, setHandHistoryManager] = useState<LocalHandHistoryManager | null>(null);
  const [handHistories, setHandHistories] = useState<CompactHandHistory[]>([]);
  const [filteredHands, setFilteredHands] = useState<CompactHandHistory[]>([]);
  const [selectedHand, setSelectedHand] = useState<CompactHandHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');

  useEffect(() => {
    initializeSystem();
  }, []);

  // Filter hands based on search and filters
  useEffect(() => {
    let filtered = [...handHistories];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(hand => 
        hand.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hand.players.some(player => 
          player.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply result filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(hand => {
        const heroWon = hand.result.winners.includes(0);
        return selectedFilter === 'wins' ? heroWon : !heroWon;
      });
    }

    // Apply position filter
    if (selectedPosition !== 'all') {
      filtered = filtered.filter(hand => {
        const hero = hand.players.find(p => p.id === 'hero') || hand.players[0];
        return hero?.position === selectedPosition;
      });
    }

    setFilteredHands(filtered);
  }, [handHistories, searchQuery, selectedFilter, selectedPosition]);

  const initializeSystem = async () => {
    try {
      console.log('开始初始化回放系统...');
      
      // 简化初始化，先创建模拟数据
      const mockHandHistories: CompactHandHistory[] = [
        {
          id: `mock_hand_${Date.now()}_1`,
          timestamp: Date.now() - 3600000,
          gameId: 'mock_game_1',
          blinds: [1, 2],
          maxPlayers: 3,
          players: [
            { 
              id: 'hero', 
              position: 'BTN', 
              stackSize: 200,
              cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'spades', rank: 'A' }]
            },
            { 
              id: 'villain1', 
              position: 'BB', 
              stackSize: 180,
              cards: [{ suit: 'diamonds', rank: 'K' }, { suit: 'clubs', rank: 'Q' }]
            }
          ],
          actions: [
            { p: 0, a: 3, m: 6, s: 0, t: 1000 },
            { p: 1, a: 2, m: 6, s: 0, t: 2000 }
          ],
          snapshots: [{
            stage: 0,
            board: [],
            pot: 15,
            activePlayers: [0, 1],
            timestamp: Date.now() - 3600000
          }],
          result: {
            winners: [0], // hero is player 0
            potSize: 15,
            showdown: false
          }
        },
        {
          id: `mock_hand_${Date.now()}_2`,
          timestamp: Date.now() - 3300000,
          gameId: 'mock_game_2',
          blinds: [2, 5],
          maxPlayers: 2,
          players: [
            { 
              id: 'hero', 
              position: 'BTN', 
              stackSize: 500,
              cards: [{ suit: 'hearts', rank: 'J' }, { suit: 'spades', rank: '10' }]
            },
            { 
              id: 'villain1', 
              position: 'BB', 
              stackSize: 480,
              cards: [{ suit: 'diamonds', rank: 'Q' }, { suit: 'clubs', rank: 'Q' }]
            }
          ],
          actions: [
            { p: 0, a: 3, m: 15, s: 0, t: 1000 },
            { p: 1, a: 4, m: 45, s: 0, t: 2000 },
            { p: 0, a: 2, m: 30, s: 0, t: 3000 }
          ],
          snapshots: [{
            stage: 0,
            board: [],
            pot: 95,
            activePlayers: [0, 1],
            timestamp: Date.now() - 3300000
          }],
          result: {
            winners: [1], // villain1 is player 1
            potSize: 95,
            showdown: true
          }
        }
      ];
      
      console.log('使用模拟数据，跳过复杂初始化...');
      setHandHistories(mockHandHistories);
      setShowDemo(true);
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to initialize replay system:', error);
      message.error(`系统初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setLoading(false);
    }
  };

  const createDemoData = async (manager: LocalHandHistoryManager) => {
    console.log('开始创建演示数据...');
    
    try {
      // 使用 recordHand 方法创建演示数据
      const demoScenarios = [
        {
          gameState: {
            id: 'demo_game_1',
            players: [
              { 
                id: 'hero', 
                name: 'Hero',
                stack: 200,
                position: 'BTN' as const,
                cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'spades', rank: 'A' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              },
              { 
                id: 'villain1', 
                name: 'Villain1',
                stack: 180,
                position: 'BB' as const,
                cards: [{ suit: 'diamonds', rank: 'K' }, { suit: 'clubs', rank: 'Q' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              },
              { 
                id: 'villain2', 
                name: 'Villain2',
                stack: 220,
                position: 'SB' as const,
                cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'clubs', rank: '9' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              }
            ],
            dealer: 0,
            smallBlind: 1,
            bigBlind: 2,
            pot: 15,
            communityCards: [],
            stage: 'preflop' as const,
            currentPlayer: 0,
            minRaise: 4,
            lastRaise: 2
          },
          actions: [
            { playerId: 'hero', type: 'bet', amount: 6, timestamp: Date.now(), stage: 'preflop' as const },
            { playerId: 'villain1', type: 'call', amount: 6, timestamp: Date.now(), stage: 'preflop' as const }
          ],
          result: {
            winners: [0], // hero is player 0
            potSize: 15,
            showdown: false
          }
        },
        {
          gameState: {
            id: 'demo_game_2',
            players: [
              { 
                id: 'hero', 
                name: 'Hero',
                stack: 200,
                position: 'CO' as const,
                cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'spades', rank: 'K' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              },
              { 
                id: 'villain1', 
                name: 'Villain1',
                stack: 180,
                position: 'SB' as const,
                cards: [{ suit: 'diamonds', rank: '7' }, { suit: 'clubs', rank: '7' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              }
            ],
            dealer: 0,
            smallBlind: 1,
            bigBlind: 2,
            pot: 32,
            communityCards: [],
            stage: 'preflop' as const,
            currentPlayer: 0,
            minRaise: 4,
            lastRaise: 2
          },
          actions: [
            { playerId: 'hero', type: 'bet', amount: 8, timestamp: Date.now(), stage: 'preflop' as const },
            { playerId: 'villain1', type: 'call', amount: 8, timestamp: Date.now(), stage: 'preflop' as const }
          ],
          result: {
            winners: [0], // hero is player 0
            potSize: 32,
            showdown: false
          }
        },
        {
          gameState: {
            id: 'demo_game_3',
            players: [
              { 
                id: 'hero', 
                name: 'Hero',
                stack: 500,
                position: 'BTN' as const,
                cards: [{ suit: 'hearts', rank: 'J' }, { suit: 'spades', rank: '10' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              },
              { 
                id: 'villain1', 
                name: 'Villain1',
                stack: 480,
                position: 'BB' as const,
                cards: [{ suit: 'diamonds', rank: 'Q' }, { suit: 'clubs', rank: 'Q' }] as [any, any],
                folded: false,
                isAllIn: false,
                currentBet: 0
              }
            ],
            dealer: 0,
            smallBlind: 2,
            bigBlind: 5,
            pot: 95,
            communityCards: [],
            stage: 'preflop' as const,
            currentPlayer: 0,
            minRaise: 10,
            lastRaise: 5
          },
          actions: [
            { playerId: 'hero', type: 'bet', amount: 15, timestamp: Date.now(), stage: 'preflop' as const },
            { playerId: 'villain1', type: 'raise', amount: 45, timestamp: Date.now(), stage: 'preflop' as const },
            { playerId: 'hero', type: 'call', amount: 30, timestamp: Date.now(), stage: 'preflop' as const }
          ],
          result: {
            winners: [1], // villain1 is player 1
            potSize: 95,
            showdown: true
          }
        }
      ];

      // 使用 recordHand 方法创建手牌历史
      console.log('使用recordHand方法创建演示数据...');
      
      for (let i = 0; i < demoScenarios.length; i++) {
        const scenario = demoScenarios[i];
        console.log(`记录演示手牌 ${i + 1}`);
        
        try {
          await manager.recordHand(scenario.gameState, scenario.actions, scenario.result);
          console.log(`演示手牌 ${i + 1} 记录成功`);
        } catch (error) {
          console.error(`演示手牌 ${i + 1} 记录失败:`, error);
          // 继续下一个手牌的创建
        }
      }
      
      console.log('所有演示数据创建完成');
    } catch (error) {
      console.error('创建演示数据时出错:', error);
      throw error;
    }
  };

  const handleHandSelect = (hand: CompactHandHistory) => {
    setSelectedHand(hand);
  };

  const handleCloseReplay = () => {
    setSelectedHand(null);
  };

  // Calculate statistics
  const statistics = React.useMemo(() => {
    const totalHands = handHistories.length;
    const totalWins = handHistories.filter(hand => hand.result.winners.includes(0)).length;
    const totalProfit = handHistories.reduce((acc, hand) => {
      const profit = hand.result.winners.includes(0) 
        ? hand.result.potSize * 0.6 
        : -hand.blinds[1] * 2;
      return acc + profit;
    }, 0);
    const winRate = totalHands > 0 ? (totalWins / totalHands) * 100 : 0;

    return {
      totalHands,
      totalWins,
      totalProfit,
      winRate
    };
  }, [handHistories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4" />
          <Text className="text-poker-text-secondary">初始化回放系统...</Text>
        </div>
      </div>
    );
  }

  if (selectedHand) {
    return (
      <>
        <Head>
          <title>手牌回放 - AI Poker GTO</title>
          <meta name="description" content="手牌历史回放和GTO分析" />
        </Head>
        <HandReplayViewer
          handHistory={selectedHand}
          onClose={handleCloseReplay}
          autoPlay={false}
        />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>手牌回放中心 - AI Poker GTO</title>
        <meta name="description" content="查看和分析手牌历史，获得专业GTO反馈" />
      </Head>

      <div className="min-h-screen bg-poker-bg-dark">
        {/* Header Section */}
        <div className="bg-poker-bg-card border-b border-poker-border-default">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Navigation */}
            <div className="flex items-center mb-6">
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.href = '/'}
                className="text-poker-text-secondary hover:text-poker-text-primary mr-4"
              >
                返回首页
              </Button>
            </div>

            {/* Title and Stats */}
            <Row align="middle" justify="space-between" className="mb-6">
              <Col>
                <Title level={1} className="text-poker-text-primary mb-2">
                  🎬 手牌回放中心
                </Title>
                <Text className="text-poker-text-secondary text-lg">
                  Phase 2.2 专业功能 - 完整回放 + GTO分析 + 统计洞察
                </Text>
              </Col>
              <Col>
                <Row gutter={24}>
                  <Col className="text-center">
                    <div className="bg-poker-bg-elevated border-2 border-poker-secondary rounded-lg p-4">
                      <div className="text-3xl font-bold text-poker-secondary mb-2">
                        {statistics.totalHands}
                      </div>
                      <Text className="text-poker-text-primary text-base font-medium">总手牌数</Text>
                    </div>
                  </Col>
                  <Col className="text-center">
                    <div className="bg-poker-bg-elevated border-2 border-green-500 rounded-lg p-4">
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        {statistics.winRate.toFixed(1)}%
                      </div>
                      <Text className="text-poker-text-primary text-base font-medium">胜率</Text>
                    </div>
                  </Col>
                  <Col className="text-center">
                    <div className={`bg-poker-bg-elevated border-2 rounded-lg p-4 ${
                      statistics.totalProfit >= 0 ? 'border-green-500' : 'border-red-500'
                    }`}>
                      <div className={`text-3xl font-bold mb-2 ${
                        statistics.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {statistics.totalProfit >= 0 ? '+' : ''}${Math.abs(statistics.totalProfit).toFixed(2)}
                      </div>
                      <Text className="text-poker-text-primary text-base font-medium">总盈亏</Text>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* Demo Alert */}
            {showDemo && (
              <div className="glass-effect border border-poker-secondary rounded-lg p-4 mb-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrophyOutlined className="text-poker-secondary text-xl mr-2" />
                  <Title level={4} className="text-poker-secondary mb-0">
                    🎯 Phase 2.2 智能功能演示
                  </Title>
                </div>
                <Text className="text-poker-text-primary">
                  我们为您创建了演示数据来体验新功能。点击任一手牌开始体验完整的回放和分析系统！
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-poker-bg-elevated border-b border-poker-border-default">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <Title level={3} className="text-poker-text-primary mb-4">
              ✨ 核心功能特性
            </Title>
            <Row gutter={24}>
              <Col xs={24} md={8}>
                <div className="bg-poker-bg-card border border-poker-border-default rounded-lg p-4 h-full">
                  <div className="flex items-center mb-3">
                    <PlayCircleOutlined className="text-poker-win text-xl mr-3" />
                    <Text strong className="text-poker-text-primary">完整回放系统</Text>
                  </div>
                  <Text className="text-poker-text-secondary text-sm">
                    逐步回放每个决策，支持暂停、快进、单步控制，专业媒体播放器体验
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="bg-poker-bg-card border border-poker-border-default rounded-lg p-4 h-full">
                  <div className="flex items-center mb-3">
                    <BarChartOutlined className="text-poker-blue text-xl mr-3" />
                    <Text strong className="text-poker-text-primary">实时GTO分析</Text>
                  </div>
                  <Text className="text-poker-text-secondary text-sm">
                    详细的策略偏差分析、胜率变化追踪和个性化改进建议
                  </Text>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="bg-poker-bg-card border border-poker-border-default rounded-lg p-4 h-full">
                  <div className="flex items-center mb-3">
                    <DashboardOutlined className="text-poker-secondary text-xl mr-3" />
                    <Text strong className="text-poker-text-primary">智能统计分析</Text>
                  </div>
                  <Text className="text-poker-text-secondary text-sm">
                    多维度统计数据可视化，深入洞察游戏模式和改进机会
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Search and Filters */}
          <Card className="bg-poker-bg-card border-2 border-poker-border-light mb-6">
            <Row gutter={16} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="🔍 搜索手牌ID或玩家..."
                  allowClear
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  size="large"
                  style={{
                    backgroundColor: 'var(--poker-bg-elevated)',
                    color: 'var(--poker-text-primary)'
                  }}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  value={selectedFilter}
                  onChange={setSelectedFilter}
                  className="w-full"
                  placeholder="结果筛选"
                  size="large"
                  style={{ backgroundColor: 'var(--poker-bg-elevated)' }}
                >
                  <Option value="all">📊 全部结果</Option>
                  <Option value="wins">🏆 仅获胜</Option>
                  <Option value="losses">❌ 仅失败</Option>
                </Select>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  value={selectedPosition}
                  onChange={setSelectedPosition}
                  className="w-full"
                  placeholder="位置筛选"
                  size="large"
                  style={{ backgroundColor: 'var(--poker-bg-elevated)' }}
                >
                  <Option value="all">🎯 全部位置</Option>
                  <Option value="BTN">🔘 按钮位</Option>
                  <Option value="SB">⚪ 小盲位</Option>
                  <Option value="BB">🔵 大盲位</Option>
                  <Option value="UTG">🎯 枪口位</Option>
                  <Option value="MP">🎲 中间位</Option>
                  <Option value="CO">⭐ 关煞位</Option>
                </Select>
              </Col>
              <Col xs={24} md={8} className="flex justify-end">
                <div className="flex items-center space-x-4 bg-poker-bg-elevated px-4 py-2 rounded-lg">
                  <Tooltip title="过滤结果">
                    <div className="flex items-center space-x-2">
                      <FilterOutlined className="text-poker-secondary text-lg" />
                      <Badge 
                        count={filteredHands.length} 
                        showZero
                        style={{ backgroundColor: 'var(--poker-secondary)' }}
                      />
                    </div>
                  </Tooltip>
                  <Text className="text-poker-text-primary text-base font-medium">
                    显示 <span className="text-poker-secondary font-bold">{filteredHands.length}</span> / {handHistories.length} 手牌
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Hand History List */}
          <Card 
            title={
              <div className="flex items-center">
                <CalendarOutlined className="mr-2 text-poker-secondary" />
                <span className="text-poker-text-primary">手牌历史记录</span>
              </div>
            }
            className="bg-poker-bg-card border-poker-border-default"
          >
            {filteredHands.length === 0 ? (
              <Empty 
                description={
                  <span className="text-poker-text-secondary">
                    {handHistories.length === 0 ? '暂无手牌历史记录' : '未找到匹配的手牌'}
                  </span>
                }
                className="py-12"
              />
            ) : (
              <div className="space-y-4">
                {filteredHands.map((hand) => (
                  <HandHistoryCard
                    key={hand.id}
                    hand={hand}
                    onSelect={() => handleHandSelect(hand)}
                    className="animate-fade-in"
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}