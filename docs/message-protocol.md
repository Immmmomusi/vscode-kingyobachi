# Extension <-> Webview Message Protocol

The VSCode Extension and Webview communicate via `postMessage` / `onDidReceiveMessage`.

## Extension -> Webview

```typescript
type ExtToWebview =
  | { type: 'init'; state: AquariumState }
  | { type: 'stateUpdate'; state: AquariumState }
  | { type: 'feed' }
  | { type: 'addFish'; fish: GoldfishState }
```

## Webview -> Extension

```typescript
type WebviewToExt =
  | { type: 'ready' }
  | { type: 'feedRequest' }
  | { type: 'fishAte'; fishId: string }
  | { type: 'requestState' }
```

## AquariumState

```typescript
interface AquariumState {
  fish: GoldfishState[];
  lastTickAt: number;
}
```

## Communication Flow

1. Webview finishes loading -> sends `{ type: 'ready' }`
2. Extension responds with `{ type: 'init', state }` containing the current state
3. On state changes, synchronization is done via `stateUpdate`
4. The Extension holds the source of truth for state. The Webview sends requests, and the Extension updates and responds
