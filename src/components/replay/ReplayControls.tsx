import React, { useState } from 'react';
import { Space, Button, Select, Tooltip, Slider, Popover } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  SettingOutlined,
  SoundOutlined,
  MutedOutlined,
  RedoOutlined,
  UndoOutlined
} from '@ant-design/icons';

const { Option } = Select;

interface ReplayControlsProps {
  isPlaying: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  loop: boolean;
  autoAdvance: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
  onToggleLoop?: () => void;
  onToggleAutoAdvance?: () => void;
}

/**
 * 专业回放控制器组件
 * 类似专业视频播放器的控制界面
 */
export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  canStepBackward,
  canStepForward,
  playbackSpeed,
  volume = 1,
  isMuted = false,
  loop = false,
  autoAdvance = true,
  onPlay,
  onPause,
  onStepBackward,
  onStepForward,
  onJumpToStart,
  onJumpToEnd,
  onSpeedChange,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onToggleAutoAdvance
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const speedOptions = [
    { value: 0.25, label: '0.25x', description: '慢速回放' },
    { value: 0.5, label: '0.5x', description: '半速回放' },
    { value: 0.75, label: '0.75x', description: '3/4速度' },
    { value: 1, label: '1x', description: '正常速度' },
    { value: 1.25, label: '1.25x', description: '1.25倍速' },
    { value: 1.5, label: '1.5x', description: '1.5倍速' },
    { value: 2, label: '2x', description: '2倍速' },
    { value: 3, label: '3x', description: '3倍速' },
    { value: 4, label: '4x', description: '最高速度' }
  ];

  const getSpeedIcon = (speed: number) => {
    if (speed < 1) return '🐌';
    if (speed === 1) return '▶️';
    if (speed <= 2) return '⚡';
    return '🚀';
  };

  // Settings Panel Content
  const settingsContent = (
    <div className="w-64 p-4 space-y-4">
      <div>
        <h4 className="text-poker-text-primary text-sm font-medium mb-2">回放设置</h4>
        
        {/* Auto Advance Toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-poker-text-secondary text-sm">自动前进</span>
          <Button
            type="text"
            size="small"
            className={autoAdvance ? 'text-poker-secondary' : 'text-poker-text-secondary'}
            onClick={onToggleAutoAdvance}
          >
            {autoAdvance ? '开启' : '关闭'}
          </Button>
        </div>

        {/* Loop Toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-poker-text-secondary text-sm">循环播放</span>
          <Button
            type="text"
            size="small"
            className={loop ? 'text-poker-secondary' : 'text-poker-text-secondary'}
            onClick={onToggleLoop}
          >
            {loop ? '开启' : '关闭'}
          </Button>
        </div>

        {/* Speed Selection */}
        <div className="mb-3">
          <span className="text-poker-text-secondary text-sm block mb-2">播放速度</span>
          <Select
            value={playbackSpeed}
            onChange={onSpeedChange}
            className="w-full"
            size="small"
          >
            {speedOptions.map(option => (
              <Option key={option.value} value={option.value}>
                <div className="flex items-center justify-between">
                  <span>{getSpeedIcon(option.value)} {option.label}</span>
                  <span className="text-xs text-gray-400">{option.description}</span>
                </div>
              </Option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );

  // Volume Control Content
  const volumeContent = (
    <div className="w-32 p-3">
      <div className="text-center mb-2 text-poker-text-secondary text-xs">
        音量: {Math.round(volume * 100)}%
      </div>
      <Slider
        vertical
        min={0}
        max={1}
        step={0.1}
        value={volume}
        onChange={onVolumeChange}
        className="h-20"
      />
    </div>
  );

  return (
    <div className="replay-controls">
      <div className="flex items-center justify-center space-x-3">
        {/* Skip to Beginning */}
        <Tooltip title="跳到开始 (Home)">
          <button
            className="control-btn"
            disabled={!canStepBackward}
            onClick={onJumpToStart}
            aria-label="跳到开始"
          >
            <UndoOutlined />
          </button>
        </Tooltip>

        {/* Step Backward */}
        <Tooltip title="上一步 (←)">
          <button
            className="control-btn"
            disabled={!canStepBackward}
            onClick={onStepBackward}
            aria-label="上一步"
          >
            <StepBackwardOutlined />
          </button>
        </Tooltip>

        {/* Play/Pause - Main Control */}
        <Tooltip title={isPlaying ? "暂停 (空格)" : "播放 (空格)"}>
          <button
            className="play-pause-btn"
            onClick={isPlaying ? onPause : onPlay}
            disabled={!canStepForward && !isPlaying}
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          </button>
        </Tooltip>

        {/* Step Forward */}
        <Tooltip title="下一步 (→)">
          <button
            className="control-btn"
            disabled={!canStepForward}
            onClick={onStepForward}
            aria-label="下一步"
          >
            <StepForwardOutlined />
          </button>
        </Tooltip>

        {/* Skip to End */}
        <Tooltip title="跳到结束 (End)">
          <button
            className="control-btn"
            disabled={!canStepForward}
            onClick={onJumpToEnd}
            aria-label="跳到结束"
          >
            <RedoOutlined />
          </button>
        </Tooltip>

        {/* Separator */}
        <div className="w-px h-6 bg-poker-border-default mx-2" />

        {/* Volume Control */}
        <Popover
          content={volumeContent}
          trigger="hover"
          placement="top"
          open={showVolumeSlider}
          onOpenChange={setShowVolumeSlider}
        >
          <Tooltip title={isMuted ? "取消静音" : "静音"}>
            <button
              className="control-btn"
              onClick={onToggleMute}
              aria-label={isMuted ? "取消静音" : "静音"}
            >
              {isMuted ? <MutedOutlined /> : <SoundOutlined />}
            </button>
          </Tooltip>
        </Popover>

        {/* Speed Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-poker-bg-elevated rounded-md border border-poker-border-default">
          <span className="text-xs text-poker-text-secondary">
            {getSpeedIcon(playbackSpeed)}
          </span>
          <span className="text-sm text-poker-text-primary font-mono">
            {playbackSpeed}x
          </span>
        </div>

        {/* Settings */}
        <Popover
          content={settingsContent}
          trigger="click"
          placement="topRight"
          open={showSettings}
          onOpenChange={setShowSettings}
          title={
            <div className="flex items-center space-x-2">
              <SettingOutlined />
              <span>回放设置</span>
            </div>
          }
        >
          <Tooltip title="设置">
            <button
              className={`control-btn ${showSettings ? 'text-poker-secondary border-poker-secondary' : ''}`}
              aria-label="设置"
            >
              <SettingOutlined />
            </button>
          </Tooltip>
        </Popover>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-center space-x-4 mt-2 text-xs text-poker-text-secondary">
        {loop && (
          <div className="flex items-center space-x-1">
            <RedoOutlined />
            <span>循环</span>
          </div>
        )}
        {autoAdvance && (
          <div className="flex items-center space-x-1">
            <PlayCircleOutlined />
            <span>自动</span>
          </div>
        )}
        {isMuted && (
          <div className="flex items-center space-x-1">
            <MutedOutlined />
            <span>静音</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplayControls;