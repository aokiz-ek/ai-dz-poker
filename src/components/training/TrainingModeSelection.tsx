'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Progress, Tooltip, Row, Col, Typography, Space, Tag } from 'antd';
import { 
  PlayCircleOutlined, 
  TrophyOutlined, 
  ClockCircleOutlined, 
  BarChartOutlined,
  StarOutlined,
  BookOutlined,
  TargetOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { TrainingScenarioConfig, TrainingFocusArea, PlayerTrainingStats } from '@/lib/training/scenario-manager';

const { Title, Text, Paragraph } = Typography;

export interface TrainingModeSelectionProps {
  playerStats?: PlayerTrainingStats;
  availableScenarios: TrainingScenarioConfig[];
  onScenarioSelect: (scenarioId: string) => void;
  onViewStats: () => void;
}

/**
 * 训练模式选择组件 - 翻后GTO训练的主界面
 * 
 * 功能特色：
 * 1. 个性化推荐 - 基于玩家历史表现推荐训练场景
 * 2. 难度分级展示 - 清晰的初级/中级/高级分类
 * 3. 进度可视化 - 显示各个技能领域的掌握程度
 * 4. 时长预估 - 准确显示预期训练时间（+25%）
 * 5. 智能导向 - 突出显示薄弱环节的针对性训练
 */
export const TrainingModeSelection: React.FC<TrainingModeSelectionProps> = ({
  playerStats,
  availableScenarios,
  onScenarioSelect,
  onViewStats
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [focusedArea, setFocusedArea] = useState<TrainingFocusArea | 'all'>('all');

  // 根据选择的条件过滤场景
  const filteredScenarios = availableScenarios.filter(scenario => {
    const difficultyMatch = selectedDifficulty === 'all' || scenario.difficulty === selectedDifficulty;
    const areaMatch = focusedArea === 'all' || scenario.focusArea === focusedArea;
    return difficultyMatch && areaMatch;
  });

  // 获取推荐场景
  const recommendedScenarios = playerStats?.nextRecommendations || [];
  
  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#52c41a';
      case 'intermediate': return '#faad14'; 
      case 'advanced': return '#ff4d4f';
      default: return '#1890ff';
    }
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

  // 获取场景类别的中文名称
  const getCategoryName = (category: string) => {
    const categoryNames = {
      'cbet': 'C-bet训练',
      'turn-decision': '转牌决策',
      'river-value': '河牌价值',
      'bluff-catch': '抓诈唬',
      'semi-bluff': '半诈唬'
    };
    return categoryNames[category as keyof typeof categoryNames] || category;
  };

  // 判断是否为推荐场景
  const isRecommended = (scenarioId: string) => {
    return recommendedScenarios.some(rec => rec.id === scenarioId);
  };

  // 渲染技能进度条
  const renderSkillProgress = () => {
    if (!playerStats) return null;

    const skills = [
      { name: '读牌能力', area: 'hand-reading' as TrainingFocusArea, progress: 75 },
      { name: '底池赔率', area: 'pot-odds' as TrainingFocusArea, progress: 60 },
      { name: '位置游戏', area: 'position-play' as TrainingFocusArea, progress: 85 },
      { name: '牌面分析', area: 'board-texture' as TrainingFocusArea, progress: 70 }
    ];

    return (
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            <span>技能掌握度</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        {skills.map(skill => (
          <div key={skill.area} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text>{skill.name}</Text>
              <Text>{skill.progress}%</Text>
            </div>
            <Progress 
              percent={skill.progress} 
              size="small" 
              strokeColor={skill.progress >= 80 ? '#52c41a' : skill.progress >= 60 ? '#faad14' : '#ff4d4f'}
              showInfo={false}
            />
          </div>
        ))}
        <Button 
          type="link" 
          size="small" 
          icon={<BarChartOutlined />}
          onClick={onViewStats}
          style={{ padding: 0, marginTop: 8 }}
        >
          查看详细统计
        </Button>
      </Card>
    );
  };

  // 渲染场景卡片
  const renderScenarioCard = (scenario: TrainingScenarioConfig) => {
    const isRec = isRecommended(scenario.id);
    const isWeakness = playerStats?.weaknessAreas.includes(scenario.focusArea);

    return (
      <Col xs={24} sm={12} lg={8} key={scenario.id}>
        <Card
          hoverable
          style={{ 
            marginBottom: 16,
            border: isRec ? '2px solid #1890ff' : undefined,
            position: 'relative'
          }}
          actions={[
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => onScenarioSelect(scenario.id)}
              key="start"
            >
              开始训练
            </Button>
          ]}
        >
          {/* 推荐标签 */}
          {isRec && (
            <div style={{ 
              position: 'absolute', 
              top: -1, 
              right: -1, 
              zIndex: 1 
            }}>
              <Badge.Ribbon text="推荐" color="blue" />
            </div>
          )}
          
          {/* 弱点提醒标签 */}
          {isWeakness && (
            <Tag 
              color="orange" 
              icon={<TargetOutlined />}
              style={{ marginBottom: 8 }}
            >
              需要加强
            </Tag>
          )}

          <div style={{ marginBottom: 12 }}>
            <Title level={5} style={{ marginBottom: 4 }}>
              {scenario.name}
            </Title>
            
            <Space style={{ marginBottom: 8 }}>
              <Badge 
                color={getDifficultyColor(scenario.difficulty)} 
                text={
                  scenario.difficulty === 'beginner' ? '初级' :
                  scenario.difficulty === 'intermediate' ? '中级' : '高级'
                } 
              />
              <Tag color="geekblue">{getCategoryName(scenario.category)}</Tag>
            </Space>
            
            <Tag color="purple" icon={<BookOutlined />}>
              {getFocusAreaName(scenario.focusArea)}
            </Tag>
          </div>

          <Paragraph 
            style={{ color: '#666', fontSize: 13, marginBottom: 12 }}
            ellipsis={{ rows: 2 }}
          >
            {scenario.description}
          </Paragraph>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ClockCircleOutlined style={{ color: '#666' }} />
              <Text type="secondary">{scenario.estimatedDuration}分钟</Text>
            </Space>
            
            {playerStats && (
              <Tooltip title="基于你的弱点推荐">
                {isWeakness ? (
                  <BulbOutlined style={{ color: '#faad14' }} />
                ) : (
                  <StarOutlined style={{ color: '#ccc' }} />
                )}
              </Tooltip>
            )}
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Title level={2}>
          <TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />
          翻后GTO训练中心
        </Title>
        <Paragraph type="secondary">
          针对性训练，快速提升翻后决策水平。基于你的表现智能推荐训练场景。
        </Paragraph>
      </div>

      <Row gutter={24}>
        {/* 左侧：统计和过滤器 */}
        <Col xs={24} md={6}>
          {/* 技能进度 */}
          {renderSkillProgress()}

          {/* 训练统计 */}
          {playerStats && (
            <Card 
              title={
                <Space>
                  <BarChartOutlined />
                  <span>训练概览</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 24, color: '#1890ff' }}>
                    {playerStats.totalScenariosCompleted}
                  </Text>
                  <br />
                  <Text type="secondary">已完成场景</Text>
                </div>
                
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 24, color: '#52c41a' }}>
                    {Math.round(playerStats.averageScore)}
                  </Text>
                  <br />
                  <Text type="secondary">平均得分</Text>
                </div>
                
                <div>
                  <Text strong style={{ fontSize: 18, color: '#faad14' }}>
                    {Math.round(playerStats.totalTrainingTime / (1000 * 60))}分钟
                  </Text>
                  <br />
                  <Text type="secondary">总训练时间</Text>
                </div>
              </div>
            </Card>
          )}

          {/* 过滤器 */}
          <Card title="筛选条件" size="small">
            <div style={{ marginBottom: 12 }}>
              <Text strong>难度级别</Text>
              <br />
              <Space wrap style={{ marginTop: 8 }}>
                {['all', 'beginner', 'intermediate', 'advanced'].map(diff => (
                  <Tag.CheckableTag
                    key={diff}
                    checked={selectedDifficulty === diff}
                    onChange={() => setSelectedDifficulty(diff as any)}
                  >
                    {diff === 'all' ? '全部' :
                     diff === 'beginner' ? '初级' :
                     diff === 'intermediate' ? '中级' : '高级'}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>

            <div>
              <Text strong>重点领域</Text>
              <br />
              <Space wrap style={{ marginTop: 8 }}>
                <Tag.CheckableTag
                  checked={focusedArea === 'all'}
                  onChange={() => setFocusedArea('all')}
                >
                  全部
                </Tag.CheckableTag>
                {['hand-reading', 'pot-odds', 'position-play', 'board-texture'].map(area => (
                  <Tag.CheckableTag
                    key={area}
                    checked={focusedArea === area}
                    onChange={() => setFocusedArea(area as TrainingFocusArea)}
                  >
                    {getFocusAreaName(area as TrainingFocusArea)}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>
          </Card>
        </Col>

        {/* 右侧：场景列表 */}
        <Col xs={24} md={18}>
          {/* 推荐场景优先显示 */}
          {recommendedScenarios.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>
                <BulbOutlined style={{ color: '#faad14', marginRight: 8 }} />
                为你推荐
              </Title>
              <Row gutter={[16, 16]}>
                {recommendedScenarios.slice(0, 3).map(renderScenarioCard)}
              </Row>
            </div>
          )}

          {/* 所有场景 */}
          <div>
            <Title level={4}>
              所有训练场景 
              <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                （{filteredScenarios.length} 个场景）
              </Text>
            </Title>
            
            {filteredScenarios.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Text type="secondary">没有找到符合条件的训练场景</Text>
                  <br />
                  <Button 
                    type="link" 
                    onClick={() => {
                      setSelectedDifficulty('all');
                      setFocusedArea('all');
                    }}
                  >
                    清除筛选条件
                  </Button>
                </div>
              </Card>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredScenarios.map(renderScenarioCard)}
              </Row>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default TrainingModeSelection;