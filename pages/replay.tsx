import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, Button, List, Typography, Space, Empty, Spin, message } from 'antd';
import { PlayCircleOutlined, BarChartOutlined, HistoryOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { HandReplayViewer } from '@/components/replay/HandReplayViewer';
import { CompactHandHistory } from '@/types/hand-history';
import { LocalHandHistoryManager } from '@/lib/hand-history-manager';
import { StorageManager } from '@/lib/storage/storage-manager';

const { Title, Text } = Typography;

/**
 * 手牌回放页面 - Phase 2.2新功能
 * 展示完整的回放系统和GTO分析功能
 */
export default function ReplayPage() {
  const [handHistoryManager, setHandHistoryManager] = useState<LocalHandHistoryManager | null>(null);
  const [handHistories, setHandHistories] = useState<CompactHandHistory[]>([]);
  const [selectedHand, setSelectedHand] = useState<CompactHandHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    initializeSystem();
  }, []);

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
              cards: [{ suit: 'hearts', rank: 'J' }, { suit: 'spades', rank: 'T' }]
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
                cards: [{ suit: 'hearts', rank: 'J' }, { suit: 'spades', rank: 'T' }] as [any, any],
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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Spin size="large" />
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

      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px 0'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          {/* 页头 */}
          <Card className="mb-6" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Button 
                  type="text" 
                  icon={<ArrowLeftOutlined />}
                  onClick={() => window.location.href = '/'}
                  style={{ marginBottom: 16 }}
                >
                  返回首页
                </Button>
                <Title level={2} style={{ margin: 0 }}>
                  🎬 手牌回放中心
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Phase 2.2 智能功能 - 完整回放 + GTO分析 + 统计洞察
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {handHistories.length}
                </div>
                <Text type="secondary">历史手牌</Text>
              </div>
            </div>
          </Card>

          {/* 功能介绍 */}
          {showDemo && (
            <Card 
              className="mb-6" 
              style={{ 
                background: 'rgba(24, 144, 255, 0.1)', 
                border: '1px solid rgba(24, 144, 255, 0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#1890ff', margin: '0 0 8px 0' }}>
                  🎯 Phase 2.2 智能功能演示
                </Title>
                <Text>
                  我们为您创建了演示数据来体验新功能。点击任一手牌开始体验完整的回放和分析系统！
                </Text>
              </div>
            </Card>
          )}

          {/* 功能亮点 */}
          <Card className="mb-6" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
            <Title level={4} style={{ marginBottom: 16 }}>✨ Phase 2.2 核心功能</Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: 'rgba(82, 196, 26, 0.1)', borderRadius: 8, border: '1px solid rgba(82, 196, 26, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <PlayCircleOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: 8 }} />
                  <Text strong>完整回放系统</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  逐步回放每个决策，支持暂停、快进、单步控制
                </Text>
              </div>

              <div style={{ padding: 16, background: 'rgba(24, 144, 255, 0.1)', borderRadius: 8, border: '1px solid rgba(24, 144, 255, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <BarChartOutlined style={{ fontSize: 20, color: '#1890ff', marginRight: 8 }} />
                  <Text strong>实时GTO分析</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  详细的策略偏差分析和胜率变化追踪
                </Text>
              </div>

              <div style={{ padding: 16, background: 'rgba(250, 173, 20, 0.1)', borderRadius: 8, border: '1px solid rgba(250, 173, 20, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <HistoryOutlined style={{ fontSize: 20, color: '#faad14', marginRight: 8 }} />
                  <Text strong>智能统计分析</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  多维度统计数据和个性化改进建议
                </Text>
              </div>
            </div>
          </Card>

          {/* 手牌历史列表 */}
          <Card 
            title="📊 手牌历史记录"
            style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}
          >
            {handHistories.length === 0 ? (
              <Empty 
                description="暂无手牌历史记录"
                style={{ margin: '40px 0' }}
              />
            ) : (
              <List
                dataSource={handHistories}
                renderItem={(hand: CompactHandHistory) => (
                  <List.Item
                    key={hand.id}
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.8)', 
                      borderRadius: 8,
                      marginBottom: 8,
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                            {hand.id.substring(0, 8)}...
                          </Text>
                          <Text type="secondary" style={{ marginLeft: 12, fontSize: 14 }}>
                            {new Date(hand.timestamp).toLocaleString()}
                          </Text>
                        </div>
                        <Space>
                          <Text type="secondary">盲注: {hand.blinds[0]}/{hand.blinds[1]}</Text>
                          <Text type="secondary">玩家: {hand.players.length}</Text>
                          <Text type="secondary">底池: ${hand.result.potSize}</Text>
                          <Text style={{ color: hand.result.winners.includes(0) ? '#52c41a' : '#ff4d4f' }}> {/* hero is player 0 */}
                            {hand.result.winners.includes(0) ? '✅ 获胜' : '❌ 失败'} {/* hero is player 0 */}
                          </Text>
                        </Space>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleHandSelect(hand)}
                        style={{ borderRadius: 6 }}
                      >
                        回放分析
                      </Button>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}