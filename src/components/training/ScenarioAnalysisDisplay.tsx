'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Progress, 
  Alert, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Tag, 
  Tooltip, 
  Collapse,
  Timeline,
  Rate,
  Badge
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  BarChartOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  TagOutlined,
  BookOutlined,
  LineChartOutlined,
  StarOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { 
  DecisionAnalysis, 
  ScenarioResult, 
  TrainingScenarioConfig,
  TrainingFocusArea 
} from '@/lib/training/scenario-manager';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export interface ScenarioAnalysisDisplayProps {
  scenarioConfig: TrainingScenarioConfig;
  scenarioResult: ScenarioResult;
  decisionAnalyses: DecisionAnalysis[];
  onNextScenario: (scenarioId: string) => void;
  onRetryScenario: () => void;
  onBackToMenu: () => void;
}

/**
 * 场景分析显示组件 - 训练完成后的详细分析界面
 * 
 * 核心功能：
 * 1. 综合成绩展示 - 多维度分数可视化
 * 2. 决策回顾 - 每个决策的详细分析
 * 3. 弱点识别 - 自动标识需要改进的领域
 * 4. 学习建议 - 个性化的下一步学习指导
 * 5. 进步跟踪 - 与历史成绩的对比分析
 */
export const ScenarioAnalysisDisplay: React.FC<ScenarioAnalysisDisplayProps> = ({
  scenarioConfig,
  scenarioResult,
  decisionAnalyses,
  onNextScenario,
  onRetryScenario,
  onBackToMenu
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'decisions' | 'improvement'>('overview');

  // 计算整体表现等级
  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: '优秀', color: '#52c41a', stars: 5 };
    if (score >= 80) return { level: '良好', color: '#1890ff', stars: 4 };
    if (score >= 70) return { level: '及格', color: '#faad14', stars: 3 };
    if (score >= 60) return { level: '需要改进', color: '#ff7a45', stars: 2 };
    return { level: '亟需提升', color: '#ff4d4f', stars: 1 };
  };

  // 获取GTO偏离度的评价
  const getGTODeviationText = (deviation: number) => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation <= 0.1) return { text: '非常接近GTO', color: '#52c41a' };
    if (absDeviation <= 0.2) return { text: '接近GTO', color: '#1890ff' };
    if (absDeviation <= 0.3) return { text: '有所偏离', color: '#faad14' };
    return { text: '偏离较大', color: '#ff4d4f' };
  };

  // 获取重点领域的中文名称
  const getFocusAreaName = (area: TrainingFocusArea) => {
    const areaNames = {
      'hand-reading': '读牌能力',
      'pot-odds': '底池赔率',
      'position-play': '位置游戏',
      'board-texture': '牌面分析',
      'betting-patterns': '下注模式',
      'bluff-detection': '诈唬识别',
      'value-extraction': '价值榨取',
      'bankroll-mgmt': '资金管理'
    };
    return areaNames[area] || area;
  };

  // 渲染综合成绩概览
  const renderOverview = () => {
    const performance = getPerformanceLevel(scenarioResult.scoreBreakdown.overall);
    const avgGTODeviation = scenarioResult.gtoDeviations.reduce((sum, d) => sum + Math.abs(d), 0) / scenarioResult.gtoDeviations.length;
    const gtoEvaluation = getGTODeviationText(avgGTODeviation);

    return (
      <div>
        {/* 总体成绩卡片 */}
        <Card style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <TrophyOutlined style={{ fontSize: 48, color: performance.color, marginBottom: 8 }} />
            <br />
            <Title level={2} style={{ color: performance.color, margin: 0 }}>
              {scenarioResult.scoreBreakdown.overall}分
            </Title>
            <Text type="secondary">综合得分</Text>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Rate value={performance.stars} disabled style={{ color: performance.color }} />
            <br />
            <Text strong>{performance.level}</Text>
          </div>

          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="正确决策"
                value={scenarioResult.correctDecisions}
                suffix={`/ ${scenarioResult.handsPlayed}`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="平均用时"
                value={Math.round(scenarioResult.averageDecisionTime / 1000)}
                suffix="秒"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="GTO符合度"
                value={Math.round((1 - avgGTODeviation) * 100)}
                suffix="%"
                valueStyle={{ color: gtoEvaluation.color }}
              />
            </Col>
          </Row>
        </Card>

        {/* 各项能力分析 */}
        <Card title="能力分析" style={{ marginBottom: 20 }}>
          <Row gutter={[16, 16]}>
            {Object.entries(scenarioResult.scoreBreakdown).map(([key, score]) => {
              if (key === 'overall') return null;
              
              const skillNames = {
                handReading: '读牌能力',
                potOdds: '底池赔率',
                positioning: '位置感知',
                boardTexture: '牌面分析'
              };
              
              const skillName = skillNames[key as keyof typeof skillNames] || key;
              const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f';
              
              return (
                <Col xs={24} sm={12} key={key}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>{skillName}</Text>
                      <Text strong style={{ color }}>{score}分</Text>
                    </div>
                    <Progress 
                      percent={score} 
                      strokeColor={color}
                      showInfo={false}
                                          />
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>

        {/* 识别的弱点和建议 */}
        {scenarioResult.weaknessesIdentified.length > 0 && (
          <Card title="需要加强的领域" style={{ marginBottom: 20 }}>
            <Space wrap>
              {scenarioResult.weaknessesIdentified.map(weakness => (
                <Tag 
                  key={weakness} 
                  color="orange" 
                  icon={<TagOutlined />}
                >
                  {getFocusAreaName(weakness)}
                </Tag>
              ))}
            </Space>
            <Alert
              style={{ marginTop: 12 }}
              message="建议重点练习"
              description={`建议针对 ${scenarioResult.weaknessesIdentified.map(getFocusAreaName).join('、')} 进行专项训练，这将显著提升你的整体水平。`}
              type="warning"
              showIcon
              icon={<BulbOutlined />}
            />
          </Card>
        )}
      </div>
    );
  };

  // 渲染决策详细分析
  const renderDecisionAnalysis = () => {
    return (
      <div>
        <Timeline>
          {decisionAnalyses.map((analysis, index) => (
            <Timeline.Item
              key={index}
              dot={analysis.isCorrect ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              }
              color={analysis.isCorrect ? 'green' : 'red'}
            >
              <Card size="small" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Text strong>第 {index + 1} 手牌决策</Text>
                    <br />
                    <Text type={analysis.isCorrect ? 'success' : 'danger'}>
                      {analysis.isCorrect ? '✓ 决策正确' : '✗ 决策有误'}
                    </Text>
                    <br />
                    <Text type="secondary">{analysis.reasoning}</Text>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <Badge 
                      count={`${analysis.scoreContribution}分`} 
                      style={{ 
                        backgroundColor: analysis.isCorrect ? '#52c41a' : '#ff4d4f' 
                      }} 
                    />
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      GTO偏离: {Math.abs(analysis.gtoDeviation * 100).toFixed(1)}%
                    </Text>
                  </div>
                </div>

                {/* 改进建议 */}
                {!analysis.isCorrect && (
                  <Alert
                    style={{ marginTop: 8 }}
                    message="改进建议"
                    description={analysis.improvement}
                    type="info"
                                        showIcon
                  />
                )}

                {/* 相关概念 */}
                {analysis.relatedConcepts.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>相关概念：</Text>
                    <br />
                    <Space wrap>
                      {analysis.relatedConcepts.map(concept => (
                        <Tag key={concept} color="blue">
                          {concept}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    );
  };

  // 渲染改进建议
  const renderImprovementSuggestions = () => {
    const nextScenario = scenarioResult.recommendedNextScenario;
    
    return (
      <div>
        {/* 下一步建议 */}
        <Card title="个性化学习建议" style={{ marginBottom: 20 }}>
          <Collapse defaultActiveKey={['1']} ghost>
            <Panel 
              header="重点提升领域" 
              key="1"
              extra={<TagOutlined />}
            >
              {scenarioResult.weaknessesIdentified.length > 0 ? (
                <div>
                  <Paragraph>
                    根据你的表现分析，建议重点加强以下技能：
                  </Paragraph>
                  <ul>
                    {scenarioResult.weaknessesIdentified.map(weakness => (
                      <li key={weakness}>
                        <Text strong>{getFocusAreaName(weakness)}</Text>
                        <Text type="secondary"> - 这是影响你决策准确性的关键因素</Text>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Text type="success">
                  表现优秀！各项技能都达到了较高水平，继续保持。
                </Text>
              )}
            </Panel>

            <Panel 
              header="学习资源推荐" 
              key="2"
              extra={<BookOutlined />}
            >
              <div>
                <Paragraph>推荐学习内容：</Paragraph>
                <ul>
                  <li>翻后GTO策略基础理论</li>
                  <li>底池赔率和隐含赔率计算</li>
                  <li>对手范围分析方法</li>
                  <li>牌面结构和听牌概率</li>
                </ul>
              </div>
            </Panel>

            <Panel 
              header="训练计划" 
              key="3"
              extra={<LineChartOutlined />}
            >
              <div>
                <Paragraph>建议的训练路径：</Paragraph>
                <ol>
                  <li>完成当前难度的所有场景（达到80分以上）</li>
                  <li>重点练习识别出的薄弱环节</li>
                  <li>挑战更高难度的场景</li>
                  <li>定期回顾和巩固已学知识</li>
                </ol>
              </div>
            </Panel>
          </Collapse>
        </Card>

        {/* 推荐的下一个训练场景 */}
        <Card title="推荐下一个训练">
          <div style={{ textAlign: 'center' }}>
            <StarOutlined style={{ fontSize: 24, color: '#faad14', marginBottom: 8 }} />
            <br />
            <Text strong>为你推荐最适合的下一个训练场景</Text>
            <br />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              基于你的表现和薄弱环节，智能推荐最有针对性的训练内容
            </Paragraph>
            
            <Space style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={() => onNextScenario(nextScenario)}
              >
                开始推荐训练
              </Button>
              <Button 
                size="large"
                icon={<TagOutlined />}
                onClick={onRetryScenario}
              >
                重新挑战本场景
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* 页面标题 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2}>
          训练分析报告
        </Title>
        <Text type="secondary">
          {scenarioConfig.name} · {getFocusAreaName(scenarioConfig.focusArea)}
        </Text>
      </div>

      {/* 标签页导航 */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Button.Group size="large">
          <Button 
            type={activeTab === 'overview' ? 'primary' : 'default'}
            icon={<BarChartOutlined />}
            onClick={() => setActiveTab('overview')}
          >
            成绩概览
          </Button>
          <Button 
            type={activeTab === 'decisions' ? 'primary' : 'default'}
            icon={<ClockCircleOutlined />}
            onClick={() => setActiveTab('decisions')}
          >
            决策回顾
          </Button>
          <Button 
            type={activeTab === 'improvement' ? 'primary' : 'default'}
            icon={<BulbOutlined />}
            onClick={() => setActiveTab('improvement')}
          >
            改进建议
          </Button>
        </Button.Group>
      </div>

      {/* 内容区域 */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'decisions' && renderDecisionAnalysis()}
        {activeTab === 'improvement' && renderImprovementSuggestions()}
      </div>

      {/* 底部操作按钮 */}
      <div style={{ textAlign: 'center', marginTop: 32, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
        <Space size="large">
          <Button 
            size="large"
            onClick={onBackToMenu}
          >
            返回训练菜单
          </Button>
          <Button 
            type="primary" 
            size="large"
            icon={<TrophyOutlined />}
            onClick={() => onNextScenario(scenarioResult.recommendedNextScenario)}
          >
            继续训练
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ScenarioAnalysisDisplay;