import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Space, Divider, Tag, List, Button, Collapse, Alert, Tabs, Statistic, Row, Col } from 'antd';
import { 
  TrophyOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  BarChartOutlined,
  AimOutlined as TargetOutlined,
  RiseOutlined as TrendingUpOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { CompactHandHistory, GtoDeviation, HandAnalysis } from '@/types/hand-history';
import { GameStage } from '@/types/poker';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface GtoAnalysisPanelProps {
  handHistory: CompactHandHistory;
  currentStep: number;
  currentGameState: any;
}

/**
 * GTO分析面板
 * 显示偏差分析、改进建议、实时评分
 */
export const GtoAnalysisPanel: React.FC<GtoAnalysisPanelProps> = ({
  handHistory,
  currentStep,
  currentGameState
}) => {
  const [analysis, setAnalysis] = useState<HandAnalysis | null>(null);
  const [stepAnalysis, setStepAnalysis] = useState<StepAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // 计算当前步骤的分析
  useEffect(() => {
    if (currentGameState && handHistory) {
      const stepAnalysis = analyzeCurrentStep(handHistory, currentStep, currentGameState);
      setStepAnalysis(stepAnalysis);
    }
  }, [currentStep, currentGameState, handHistory]);

  // 加载完整手牌分析
  useEffect(() => {
    if (handHistory.analysis) {
      setAnalysis(handHistory.analysis);
    } else {
      // 如果没有分析数据，生成模拟分析
      const mockAnalysis = generateMockAnalysis(handHistory);
      setAnalysis(mockAnalysis);
    }
  }, [handHistory]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a'; // 绿色
    if (score >= 60) return '#faad14'; // 黄色
    return '#ff4d4f'; // 红色
  };

  const getDeviationSeverityIcon = (severity: 'minor' | 'moderate' | 'major') => {
    switch (severity) {
      case 'minor': return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case 'moderate': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'major': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  if (!analysis) {
    return (
      <Card title="GTO分析" style={{ height: '100%' }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">正在分析手牌数据...</Text>
        </div>
      </Card>
    );
  }

  const { TabPane } = Tabs;

  return (
    <div className="analysis-panel">
      <div className="analysis-tabs">
        <Tabs defaultActiveKey="overview" size="small">
          <TabPane 
            tab={
              <span className="flex items-center space-x-2">
                <DashboardOutlined />
                <span>概览</span>
              </span>
            } 
            key="overview"
          >
            <div className="p-4 space-y-4">
              {/* Overall Score */}
              <Card className="bg-poker-bg-elevated border-poker-border-default">
                <div className="text-center">
                  <Progress
                    type="circle"
                    percent={analysis.overallScore}
                    size={80}
                    strokeColor={getScoreColor(analysis.overallScore)}
                    trailColor="var(--poker-border-default)"
                    format={percent => (
                      <div className="text-poker-text-primary">
                        <div className="text-xl font-bold">{percent}</div>
                        <div className="text-xs text-poker-text-secondary">分</div>
                      </div>
                    )}
                  />
                  <div className="mt-2 text-sm text-poker-text-secondary">
                    {analysis.overallScore >= 80 ? '🏆 优秀表现' : 
                     analysis.overallScore >= 60 ? '👍 良好表现' : '📈 需要改进'}
                  </div>
                </div>
              </Card>

              {/* Key Metrics */}
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic
                    title={<span className="text-poker-text-secondary text-xs">VPIP</span>}
                    value={25.4}
                    suffix="%"
                    valueStyle={{ color: 'var(--poker-text-primary)', fontSize: '16px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span className="text-poker-text-secondary text-xs">PFR</span>}
                    value={18.2}
                    suffix="%"
                    valueStyle={{ color: 'var(--poker-text-primary)', fontSize: '16px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span className="text-poker-text-secondary text-xs">3Bet</span>}
                    value={8.7}
                    suffix="%"
                    valueStyle={{ color: 'var(--poker-text-primary)', fontSize: '16px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span className="text-poker-text-secondary text-xs">胜率</span>}
                    value={64.2}
                    suffix="%"
                    valueStyle={{ color: 'var(--poker-win)', fontSize: '16px' }}
                  />
                </Col>
              </Row>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span className="flex items-center space-x-2">
                <TargetOutlined />
                <span>偏差</span>
              </span>
            } 
            key="deviations"
          >
            <div className="p-4 space-y-3">
              <div className="text-sm font-medium text-poker-text-primary mb-3">
                发现 {analysis.deviations?.length || 3} 个策略偏差
              </div>
              
              {[
                { type: 'major', action: '翻牌前加注', deviation: '频率过高', impact: -12 },
                { type: 'moderate', action: '转牌下注', deviation: '尺度偏小', impact: -6 },
                { type: 'minor', action: '河牌跟注', deviation: '范围偏紧', impact: -3 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-poker-bg-elevated rounded border border-poker-border-default">
                  <div className="flex items-center space-x-3">
                    {getDeviationSeverityIcon(item.type as any)}
                    <div>
                      <div className="text-sm text-poker-text-primary">{item.action}</div>
                      <div className="text-xs text-poker-text-secondary">{item.deviation}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${item.impact < 0 ? 'text-poker-red' : 'text-poker-win'}`}>
                      {item.impact}bb
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span className="flex items-center space-x-2">
                <TrendingUpOutlined />
                <span>胜率</span>
              </span>
            } 
            key="equity"
          >
            <div className="p-4">
              <div className="space-y-4">
                <div className="text-sm font-medium text-poker-text-primary mb-3">
                  当前胜率分析
                </div>
                
                {stepAnalysis && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-poker-text-secondary">阶段</span>
                      <Tag color="blue">{stepAnalysis.stage}</Tag>
                    </div>
                    
                    {stepAnalysis.equity && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-poker-text-secondary">当前胜率</span>
                          <span className="text-sm text-poker-text-primary font-medium">
                            {(stepAnalysis.equity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          percent={stepAnalysis.equity * 100} 
                          size="small" 
                          strokeColor="var(--poker-win)"
                          trailColor="var(--poker-border-default)"
                        />
                      </div>
                    )}

                    {stepAnalysis.potOdds && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-poker-text-secondary">底池赔率</span>
                        <span className="text-sm text-poker-text-primary font-mono">
                          {stepAnalysis.potOdds}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span className="flex items-center space-x-2">
                <BulbOutlined />
                <span>建议</span>
              </span>
            } 
            key="recommendations"
          >
            <div className="p-4 space-y-3">
              <div className="text-sm font-medium text-poker-text-primary mb-3">
                改进建议
              </div>
              
              {[
                {
                  priority: 'high',
                  title: '降低翻牌前加注频率',
                  description: '在早期位置过度加注，建议更谨慎地选择起手牌',
                  impact: '+15bb/100'
                },
                {
                  priority: 'medium', 
                  title: '增加转牌下注尺度',
                  description: '在有利纹理时下注尺度偏小，可以获得更多价值',
                  impact: '+8bb/100'
                },
                {
                  priority: 'low',
                  title: '扩大河牌跟注范围',
                  description: '面对合理下注时弃牌频率略高，可适当扩大跟注范围',
                  impact: '+4bb/100'
                }
              ].map((rec, index) => (
                <div key={index} className="p-3 bg-poker-bg-elevated rounded border border-poker-border-default">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        rec.priority === 'high' ? 'bg-red-500' :
                        rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-sm font-medium text-poker-text-primary">
                        {rec.title}
                      </span>
                    </div>
                    <span className="text-xs text-poker-win font-medium">
                      {rec.impact}
                    </span>
                  </div>
                  <div className="text-xs text-poker-text-secondary">
                    {rec.description}
                  </div>
                </div>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

// =================== 辅助函数和类型 ===================

interface StepAnalysis {
  stage: GameStage;
  equity?: number;
  potOdds?: string;
  recommendation?: string;
  expectedAction?: string;
  actualAction?: string;
}

function analyzeCurrentStep(
  handHistory: CompactHandHistory,
  currentStep: number,
  currentGameState: any
): StepAnalysis | null {
  if (!currentGameState) return null;

  const stage = currentGameState.stage as GameStage;
  
  const analysis: StepAnalysis = {
    stage,
    equity: Math.random() * 0.4 + 0.3, // 30-70%的模拟胜率
    potOdds: `${Math.floor(Math.random() * 5 + 2)}:1`,
  };

  switch (stage) {
    case 'preflop':
      analysis.recommendation = '考虑位置优势，紧凶打法较为合适';
      break;
    case 'flop':
      analysis.recommendation = '分析牌面结构，评估持续下注价值';
      break;
    case 'turn':
      analysis.recommendation = '重新评估胜率，考虑对手可能的听牌';
      break;
    case 'river':
      analysis.recommendation = '基于最终牌力做出价值下注或诈唬决策';
      break;
  }

  return analysis;
}

function generateMockAnalysis(handHistory: CompactHandHistory): HandAnalysis {
  const gtoDeviations: GtoDeviation[] = [
    {
      stage: 'flop',
      action: 'bet',
      expectedFrequency: 0.65,
      actualFrequency: 0.8,
      equityLoss: 0.03,
      severity: 'minor'
    }
  ];

  const recommendations = [
    '翻牌圈下注频率略高，可以适当增加check频率',
    '转牌圈面对加注可以考虑更多fold',
    '河牌圈价值下注sizing可以更大'
  ];

  return {
    heroId: 'hero',
    gtoDeviations,
    equityAnalysis: {
      preflopEquity: 0.45,
      flopEquity: 0.38,
      turnEquity: 0.42,
      riverEquity: 0.35,
      realizedEquity: 0.0,
      equityRealization: 0.85
    },
    performanceMetrics: {
      vpip: true,
      pfr: false,
      aggression: 0.7,
      wtsd: false,
      wonAtShowdown: false,
      netWin: -15
    },
    recommendations,
    overallScore: Math.floor(Math.random() * 40 + 50) // 50-90分
  };
}

export default GtoAnalysisPanel;