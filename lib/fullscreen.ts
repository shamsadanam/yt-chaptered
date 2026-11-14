/**
 * Cross-browser fullscreen and screen orientation helpers.
 */

export interface VendorDocument {
  fullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

export type VendorFullscreenElement = HTMLElement & {
  requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

export type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
};

/**
 * Returns the currently active fullscreen element across browser implementations.
 */
export function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as unknown as VendorDocument;
  return (
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

/**
 * Checks whether the document currently has an active fullscreen element.
 */
export function isCurrentlyFullscreen(): boolean {
  return getFullscreenElement() !== null;
}

/**
 * Requests fullscreen for an element across vendor implementations.
 */
export async function requestFullscreen(elem: HTMLElement): Promise<void> {
  const el = elem as VendorFullscreenElement;
  if (el.requestFullscreen) {
    await el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen();
  } else if (el.mozRequestFullScreen) {
    await el.mozRequestFullScreen();
  } else if (el.msRequestFullscreen) {
    await el.msRequestFullscreen();
  }
}

/**
 * Exits fullscreen mode across vendor implementations.
 */
export async function exitFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as unknown as VendorDocument;
  if (doc.exitFullscreen) {
    await doc.exitFullscreen();
  } else if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
  } else if (doc.mozCancelFullScreen) {
    await doc.mozCancelFullScreen();
  } else if (doc.msExitFullscreen) {
    await doc.msExitFullscreen();
  }
}

/**
 * Locks the screen orientation on supported mobile devices.
 */
export async function lockOrientation(orientation: string): Promise<void> {
  if (typeof screen === 'undefined' || !screen.orientation) return;
  const orient = screen.orientation as unknown as ScreenOrientationWithLock;
  if (typeof orient.lock === 'function') {
    try {
      await orient.lock(orientation);
    } catch {
      // Screen orientation lock may fail if unsupported or unpermitted
    }
  }
}

/**
 * Unlocks the screen orientation on supported mobile devices.
 */
export function unlockOrientation(): void {
  if (typeof screen === 'undefined' || !screen.orientation) return;
  const orient = screen.orientation as unknown as ScreenOrientationWithLock;
  if (typeof orient.unlock === 'function') {
    try {
      orient.unlock();
    } catch {
      // Ignore unlock failure
    }
  }
}
