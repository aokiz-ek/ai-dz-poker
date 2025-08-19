import React from 'react';
import { Space, Button, Select, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined
} from '@ant-design/icons';

const { Option } = Select;

interface ReplayControlsProps {
  isPlaying: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSpeedChange: (speed: number) => void;
}

/**
 * 回放控制器组件
 * 播放、暂停、单步控制、速度调节
 */
export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  canStepBackward,
  canStepForward,
  playbackSpeed,
  onPlay,
  onPause,
  onStepBackward,
  onStepForward,
  onSpeedChange
}) => {
  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' }
  ];

  return (
    <div className="replay-controls" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '16px 0',
      borderTop: '1px solid #f0f0f0'
    }}>
      <Space size="middle">
        {/* 后退到开始 */}
        <Tooltip title="回到开始">
          <Button
            type="text"
            size="large"
            icon={<FastBackwardOutlined />}
            disabled={!canStepBackward}
            onClick={() => {
              // 这里可以添加回到开始的逻辑
              onStepBackward();
            }}
          />
        </Tooltip>

        {/* 单步后退 */}
        <Tooltip title="上一步">
          <Button
            type="text"
            size="large"
            icon={<StepBackwardOutlined />}
            disabled={!canStepBackward}
            onClick={onStepBackward}
          />
        </Tooltip>

        {/* 播放/暂停 */}
        <Tooltip title={isPlaying ? "暂停" : "播放"}>
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={isPlaying ? onPause : onPlay}
            disabled={!canStepForward && !isPlaying}
            style={{ 
              width: 48, 
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </Tooltip>

        {/* 单步前进 */}
        <Tooltip title="下一步">
          <Button
            type="text"
            size="large"
            icon={<StepForwardOutlined />}
            disabled={!canStepForward}
            onClick={onStepForward}
          />
        </Tooltip>

        {/* 快进到结束 */}
        <Tooltip title="跳到结束">
          <Button
            type="text"
            size="large"
            icon={<FastForwardOutlined />}
            disabled={!canStepForward}
            onClick={() => {
              // 这里可以添加跳到结束的逻辑
              onStepForward();
            }}
          />
        </Tooltip>

        {/* 分隔线 */}
        <div style={{ 
          width: 1, 
          height: 24, 
          backgroundColor: '#d9d9d9',
          margin: '0 8px'
        }} />

        {/* 播放速度选择 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#666' }}>速度:</span>
          <Select
            value={playbackSpeed}
            onChange={onSpeedChange}
            style={{ width: 80 }}
            size="small"
          >
            {speedOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </div>
      </Space>
    </div>
  );
};

export default ReplayControls;