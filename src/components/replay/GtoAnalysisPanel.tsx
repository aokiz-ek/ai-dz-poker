import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Space, Divider, Tag, List, Button, Collapse, Alert } from 'antd';
import { 
  TrophyOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined
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

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 总体评分 */}
        <Card size="small" title={
          <Space>
            <TrophyOutlined />
            <span>总体评分</span>
          </Space>
        }>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Progress
              type="circle"
              percent={analysis.overallScore}
              size={100}
              strokeColor={getScoreColor(analysis.overallScore)}
              format={percent => (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>分</div>
                </div>
              )}
            />
          </div>
          <Text type="secondary">
            {analysis.overallScore >= 80 ? '优秀表现' : 
             analysis.overallScore >= 60 ? '良好表现' : '需要改进'}
          </Text>
        </Card>

        {/* 当前步骤分析 */}
        {stepAnalysis && (
          <Card size="small" title="当前步骤分析">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong>阶段: </Text>
                <Tag color="blue">{stepAnalysis.stage}</Tag>
              </div>
              
              {stepAnalysis.equity && (
                <div>
                  <Text strong>胜率: </Text>
                  <Text>{(stepAnalysis.equity * 100).toFixed(1)}%</Text>
                </div>
              )}

              {stepAnalysis.potOdds && (
                <div>
                  <Text strong>底池赔率: </Text>
                  <Text>{stepAnalysis.potOdds}</Text>
                </div>
              )}

              {stepAnalysis.recommendation && (
                <Alert
                  message="建议"
                  description={stepAnalysis.recommendation}
                  type="info"
                  icon={<BulbOutlined />}
                  showIcon
                />
              )}
            </Space>
          </Card>
        )}

        {/* GTO偏差分析 */}
        <Card size="small" title="GTO偏差分析">
          {analysis.gtoDeviations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
              <div>
                <Text type="secondary">未发现明显GTO偏差</Text>
              </div>
            </div>
          ) : (
            <List
              size="small"
              dataSource={analysis.gtoDeviations}
              renderItem={(deviation) => (
                <List.Item>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Space>
                        {getDeviationSeverityIcon(deviation.severity)}
                        <Text strong>{deviation.stage}</Text>
                        <Tag color={deviation.severity === 'major' ? 'red' : 
                                   deviation.severity === 'moderate' ? 'orange' : 'blue'}>
                          {deviation.severity}
                        </Tag>
                      </Space>
                    </div>
                    
                    <div>
                      <Text>
                        期望频率: {(deviation.expectedFrequency * 100).toFixed(1)}%
                      </Text>
                      <br />
                      <Text>
                        实际: {deviation.action} ({(deviation.actualFrequency * 100).toFixed(1)}%)
                      </Text>
                    </div>
                    
                    {deviation.equityLoss > 0 && (
                      <div>
                        <Text type="danger">
                          胜率损失: -{(deviation.equityLoss * 100).toFixed(2)}%
                        </Text>
                      </div>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* 胜率分析 */}
        <Card size="small" title="胜率分析">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <div style={{ marginBottom: 4 }}>
                <span>翻前胜率</span>
                <span style={{ float: 'right' }}>
                  {(analysis.equityAnalysis.preflopEquity * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                percent={analysis.equityAnalysis.preflopEquity * 100} 
                showInfo={false}
                size="small"
                strokeColor="#1890ff"
              />
            </div>

            <div>
              <div style={{ marginBottom: 4 }}>
                <span>翻牌胜率</span>
                <span style={{ float: 'right' }}>
                  {(analysis.equityAnalysis.flopEquity * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                percent={analysis.equityAnalysis.flopEquity * 100} 
                showInfo={false}
                size="small"
                strokeColor="#52c41a"
              />
            </div>

            <div>
              <div style={{ marginBottom: 4 }}>
                <span>转牌胜率</span>
                <span style={{ float: 'right' }}>
                  {(analysis.equityAnalysis.turnEquity * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                percent={analysis.equityAnalysis.turnEquity * 100} 
                showInfo={false}
                size="small"
                strokeColor="#faad14"
              />
            </div>

            <div>
              <div style={{ marginBottom: 4 }}>
                <span>河牌胜率</span>
                <span style={{ float: 'right' }}>
                  {(analysis.equityAnalysis.riverEquity * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                percent={analysis.equityAnalysis.riverEquity * 100} 
                showInfo={false}
                size="small"
                strokeColor="#ff4d4f"
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text strong>胜率实现率: </Text>
              <Text style={{ 
                color: analysis.equityAnalysis.equityRealization > 1 ? '#52c41a' : '#ff4d4f'
              }}>
                {(analysis.equityAnalysis.equityRealization * 100).toFixed(1)}%
              </Text>
            </div>
          </Space>
        </Card>

        {/* 改进建议 */}
        <Card size="small" title="改进建议">
          {analysis.recommendations.length === 0 ? (
            <Text type="secondary">暂无改进建议</Text>
          ) : (
            <List
              size="small"
              dataSource={analysis.recommendations}
              renderItem={(recommendation, index) => (
                <List.Item>
                  <Space>
                    <BulbOutlined style={{ color: '#faad14' }} />
                    <Text>{recommendation}</Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>
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
  
  // 简化的步骤分析
  const analysis: StepAnalysis = {
    stage,
    equity: Math.random() * 0.4 + 0.3, // 30-70%的模拟胜率
    potOdds: `${Math.floor(Math.random() * 5 + 2)}:1`,
  };

  // 根据阶段添加不同的建议
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
  // 生成模拟的分析数据
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