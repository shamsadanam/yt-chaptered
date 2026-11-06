'use client';

import { PlayerControlsBar, PlayerControlsBarProps } from '../player/PlayerControlsBar';

export interface FullscreenBottomBarProps
  extends Omit<PlayerControlsBarProps, 'mode' | 'onToggleFullscreen'> {
  onExitFullscreen: () => void;
}

export function FullscreenBottomBar({
  onExitFullscreen,
  ...props
}: FullscreenBottomBarProps) {
  return (
    <PlayerControlsBar
      mode="fullscreen"
      onToggleFullscreen={onExitFullscreen}
      {...props}
    />
  );
}
