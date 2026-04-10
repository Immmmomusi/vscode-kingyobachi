import type { AquariumState, AquariumColors } from './types';

/** Extension to Webview message */
export type ExtToWebview =
  | { type: 'init'; state: AquariumState }
  | { type: 'stateUpdate'; state: AquariumState }
  | { type: 'feed' }
  | { type: 'updateColors'; colors: AquariumColors };

/** Webview to Extension message */
export type WebviewToExt =
  | { type: 'ready' }
  | { type: 'feedRequest' }
  | { type: 'fishAte'; fishId: string }
  | { type: 'requestState' };
