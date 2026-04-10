/**
 * vscode モジュールのモック。
 * vitest.config.ts の resolve.alias で自動的に差し替わる。
 */

/** Memento インターフェース互換のインメモリ実装 */
class MockMemento {
  private store = new Map<string, unknown>();

  get<T>(key: string, defaultValue?: T): T | undefined {
    if (this.store.has(key)) {
      return this.store.get(key) as T;
    }
    return defaultValue;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
}

export function createMockMemento(initialData?: Record<string, unknown>): MockMemento {
  const memento = new MockMemento();
  if (initialData) {
    for (const [key, value] of Object.entries(initialData)) {
      memento.update(key, value);
    }
  }
  return memento;
}

/** workspace.getConfiguration のモック */
const mockConfiguration = {
  get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
};

export const workspace = {
  getConfiguration: vi.fn(() => mockConfiguration),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
};

export const window = {
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(() => Promise.resolve(undefined)),
  showWarningMessage: vi.fn(() => Promise.resolve(undefined)),
  registerWebviewViewProvider: vi.fn(),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const Uri = {
  joinPath: vi.fn((...parts: unknown[]) => ({ fsPath: String(parts.join('/')) })),
  file: vi.fn((path: string) => ({ fsPath: path })),
};

export class EventEmitter {
  event = vi.fn();
  fire = vi.fn();
  dispose = vi.fn();
}
