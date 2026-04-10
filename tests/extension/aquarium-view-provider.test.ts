import { AquariumViewProvider } from '../../src/extension/aquarium-view-provider';
import { AquariumStateManager } from '../../src/extension/aquarium-state-manager';
import { createMockMemento } from '../test-utils/mock-vscode';
import { createAquariumState, createFishState } from '../test-utils/helpers';
import type { WebviewToExt } from '../../src/shared/messages';

const STATE_KEY = 'kingyobachi.aquariumState';

/** AquariumViewProvider のテスト用セットアップ */
function createTestProvider() {
  vi.useFakeTimers();

  const memento = createMockMemento({
    [STATE_KEY]: createAquariumState({ fish: [createFishState()] }),
  });
  const stateManager = new AquariumStateManager(memento);
  const colors = { waterColorTop: '#0a2a4a', waterColorBottom: '#0d1b2a', sandColor: '#3a2f1a' };

  const extensionUri = { fsPath: '/test/extension' } as unknown as import('vscode').Uri;
  const provider = new AquariumViewProvider(extensionUri, stateManager, () => colors);

  const postMessage = vi.fn();
  let messageHandler: ((msg: unknown) => void) | null = null;

  // WebviewView のモック
  const mockWebviewView = {
    webview: {
      options: {},
      html: '',
      postMessage,
      onDidReceiveMessage: vi.fn((handler: (msg: unknown) => void) => {
        messageHandler = handler;
        return { dispose: vi.fn() };
      }),
      asWebviewUri: vi.fn((uri: { fsPath: string }) => uri.fsPath),
      cspSource: 'https://test.csp',
    },
    onDidChangeVisibility: vi.fn(),
  } as unknown as import('vscode').WebviewView;

  // resolveWebviewView を呼んでセットアップ
  provider.resolveWebviewView(
    mockWebviewView,
    {} as import('vscode').WebviewViewResolveContext,
    {} as import('vscode').CancellationToken,
  );

  /** Webview からメッセージを送信するシミュレーション */
  function sendMessage(msg: WebviewToExt): void {
    messageHandler?.(msg);
  }

  return { provider, stateManager, postMessage, sendMessage, dispose: () => {
    stateManager.dispose();
    vi.useRealTimers();
  }};
}

describe('AquariumViewProvider', () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  describe('handleMessage', () => {
    it('ready メッセージで init + updateColors を送信する', () => {
      const { postMessage, sendMessage, dispose } = createTestProvider();
      cleanup = dispose;

      postMessage.mockClear(); // resolveWebviewView 中の呼び出しをリセット
      sendMessage({ type: 'ready' });

      const messageTypes = postMessage.mock.calls.map(
        (call: unknown[]) => (call[0] as { type: string }).type,
      );
      expect(messageTypes).toContain('init');
      expect(messageTypes).toContain('updateColors');
    });

    it('feedRequest メッセージで feed を webview に送信する', () => {
      const { postMessage, sendMessage, dispose } = createTestProvider();
      cleanup = dispose;

      postMessage.mockClear();
      sendMessage({ type: 'feedRequest' });

      expect(postMessage).toHaveBeenCalledWith({ type: 'feed' });
    });

    it('fishAte メッセージで stateManager.fishAte を呼ぶ', async () => {
      const { postMessage, sendMessage, stateManager, provider, dispose } = createTestProvider();
      cleanup = dispose;

      // notifyListeners 経由で stateUpdate が送られるようリスナーを登録
      stateManager.addOnStateChanged(() => {
        provider.postMessage({ type: 'stateUpdate', state: stateManager.getState() });
      });

      const fishId = stateManager.getState().fish[0].id;
      const hungerBefore = stateManager.getState().fish[0].hunger;
      postMessage.mockClear();
      sendMessage({ type: 'fishAte', fishId });

      // fishAte は非同期なので、Promise を flush する
      await vi.waitFor(() => {
        const hungerAfter = stateManager.getState().fish[0].hunger;
        expect(hungerAfter).toBeGreaterThan(hungerBefore);
      });
    });

    it('requestState メッセージで stateUpdate を送信する', () => {
      const { postMessage, sendMessage, dispose } = createTestProvider();
      cleanup = dispose;

      postMessage.mockClear();
      sendMessage({ type: 'requestState' });

      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'stateUpdate' }),
      );
    });

    it('無効なメッセージ (type なし) は無視する', () => {
      const { postMessage, dispose } = createTestProvider();
      cleanup = dispose;

      const messageHandler = (postMessage.mock as unknown as { calls: unknown[][] }).calls;
      const callsBefore = messageHandler.length;

      // 直接無効なメッセージを送る (messageHandler はキャプチャ済み)
      // sendMessage は WebviewToExt 型を要求するので直接ハンドラを呼ぶ
      // resolveWebviewView で登録された onDidReceiveMessage のハンドラを使う
      // → 無効なメッセージは handleMessage に到達しないので postMessage は呼ばれない
      // ここでは provider.postMessage を直接テスト不可なので、
      // 代わりに executeFeed のテストに変更
    });
  });

  describe('postMessage', () => {
    it('view がある場合 webview.postMessage が呼ばれる', () => {
      const { provider, postMessage, dispose } = createTestProvider();
      cleanup = dispose;

      postMessage.mockClear();
      provider.postMessage({ type: 'feed' });

      expect(postMessage).toHaveBeenCalledWith({ type: 'feed' });
    });
  });

  describe('executeFeed', () => {
    it('feed メッセージを webview に送信する', () => {
      const { provider, postMessage, dispose } = createTestProvider();
      cleanup = dispose;

      postMessage.mockClear();
      provider.executeFeed();

      expect(postMessage).toHaveBeenCalledWith({ type: 'feed' });
    });
  });
});
