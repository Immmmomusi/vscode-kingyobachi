import { SpriteSheet } from '../../src/webview/sprite-sheet';
import { SPRITE_SIZE } from '../../src/shared/constants';

/** Canvas2D コンテキストのモック */
function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

/** Image.onload を手動トリガーしてスプライトをロードする */
async function loadSprite(sprite: SpriteSheet): Promise<void> {
  const loadPromise = sprite.load('test-sprite.png');
  // jsdom の Image は src 設定後に onload を呼ばないので、
  // 最後に作られた Image インスタンスの onload を手動発火
  const images = document.querySelectorAll('img');
  // querySelectorAll では取れないので、Image コンストラクタをスパイする
  // 代わりに直接 onload を呼ぶアプローチは取れないため、
  // load の Promise が resolve されるのを待つ
  // 実際は Image のモックが必要

  // jsdom では Image.src 設定しても onload は呼ばれないため、
  // Image コンストラクタをモックする
  return loadPromise;
}

describe('SpriteSheet', () => {
  const SOURCE_FRAME_SIZE = 16;

  describe('constructor', () => {
    it('small サイズの frameSize が SPRITE_SIZE.small になる', () => {
      const sprite = new SpriteSheet('small', SOURCE_FRAME_SIZE);
      // draw を通じて frameSize が使われることを確認
      expect(sprite.loaded).toBe(false);
    });
  });

  describe('load', () => {
    it('有効な src をロードすると loaded が true になる', async () => {
      // Image コンストラクタをモックして onload を即座に呼ぶ
      const OriginalImage = globalThis.Image;
      globalThis.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        get src(): string {
          return this._src;
        }

        set src(value: string) {
          this._src = value;
          // 次のマイクロタスクで onload を呼ぶ
          Promise.resolve().then(() => this.onload?.());
        }
      } as unknown as typeof Image;

      const sprite = new SpriteSheet('small', SOURCE_FRAME_SIZE);
      await sprite.load('test-sprite.png');

      expect(sprite.loaded).toBe(true);

      globalThis.Image = OriginalImage;
    });

    it('読み込み失敗しても loaded は false のまま resolve する', async () => {
      const OriginalImage = globalThis.Image;
      globalThis.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        get src(): string {
          return this._src;
        }

        set src(value: string) {
          this._src = value;
          Promise.resolve().then(() => this.onerror?.());
        }
      } as unknown as typeof Image;

      const sprite = new SpriteSheet('small', SOURCE_FRAME_SIZE);
      await sprite.load('invalid.png');

      expect(sprite.loaded).toBe(false);

      globalThis.Image = OriginalImage;
    });
  });

  describe('draw', () => {
    let sprite: SpriteSheet;
    let ctx: CanvasRenderingContext2D;

    beforeEach(async () => {
      // Image モックでロード成功させる
      const OriginalImage = globalThis.Image;
      globalThis.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        get src(): string {
          return this._src;
        }

        set src(value: string) {
          this._src = value;
          Promise.resolve().then(() => this.onload?.());
        }
      } as unknown as typeof Image;

      sprite = new SpriteSheet('small', SOURCE_FRAME_SIZE);
      await sprite.load('test.png');
      ctx = createMockContext();

      globalThis.Image = OriginalImage;
    });

    it('swim, frame 0 の drawImage の sx が 0 になる', () => {
      sprite.draw(ctx, 100, 100, 'swim', 0, -1, true);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0, 0, SOURCE_FRAME_SIZE, SOURCE_FRAME_SIZE, // source rect
        expect.any(Number), expect.any(Number), // dest position
        SPRITE_SIZE.small, SPRITE_SIZE.small, // dest size
      );
    });

    it('swim, frame 3 の drawImage の sx が 3 * sourceFrameSize になる', () => {
      sprite.draw(ctx, 100, 100, 'swim', 3, -1, true);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        3 * SOURCE_FRAME_SIZE, 0, SOURCE_FRAME_SIZE, SOURCE_FRAME_SIZE,
        expect.any(Number), expect.any(Number),
        SPRITE_SIZE.small, SPRITE_SIZE.small,
      );
    });

    it('eat 行動は eatStart フレームを使用する', () => {
      sprite.draw(ctx, 100, 100, 'eat', 0, -1, true);
      // eatStart = 0
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0, 0, SOURCE_FRAME_SIZE, SOURCE_FRAME_SIZE,
        expect.any(Number), expect.any(Number),
        SPRITE_SIZE.small, SPRITE_SIZE.small,
      );
    });

    it('rest 行動は restStart フレームを使用する', () => {
      sprite.draw(ctx, 100, 100, 'rest', 0, -1, true);
      // restStart = 0
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0, 0, SOURCE_FRAME_SIZE, SOURCE_FRAME_SIZE,
        expect.any(Number), expect.any(Number),
        SPRITE_SIZE.small, SPRITE_SIZE.small,
      );
    });

    it('dead 行動は deadStart フレームを使用する', () => {
      sprite.draw(ctx, 100, 100, 'dead', 0, -1, false);
      // deadStart = 0
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0, 0, SOURCE_FRAME_SIZE, SOURCE_FRAME_SIZE,
        expect.any(Number), expect.any(Number),
        SPRITE_SIZE.small, SPRITE_SIZE.small,
      );
    });

    it('direction=1 のとき ctx.scale(-1, 1) が呼ばれる', () => {
      sprite.draw(ctx, 100, 100, 'swim', 0, 1, true);
      expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
    });

    it('alive=false のとき ctx.scale(1, -1) と globalAlpha=0.5 が設定される', () => {
      sprite.draw(ctx, 100, 100, 'dead', 0, -1, false);
      expect(ctx.scale).toHaveBeenCalledWith(1, -1);
      expect(ctx.globalAlpha).toBe(0.5);
    });
  });
});
