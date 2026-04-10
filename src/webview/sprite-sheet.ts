import type { FishBehavior, FishSize } from '../shared/types';
import { SPRITE_SIZE } from '../shared/constants';

/**
 * Single frame info from a sprite sheet.
 * Frames are arranged horizontally:
 * [swim0, swim1, swim2, swim3, eat0, eat1, rest0, dead0]
 */
interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Frame index definitions */
const FRAME_INDEX = {
  swimStart: 0,
  swimCount: 4,
  eatStart: 0,   // Reuse first swim frame
  eatCount: 1,
  restStart: 0,  // Reuse first swim frame
  deadStart: 0,  // Reuse first swim frame (flipped vertically in draw)
} as const;

/** Sprite sheet manager class */
export class SpriteSheet {
  private image: HTMLImageElement | null = null;
  private isLoaded = false;
  private frameSize: number;
  private sourceFrameSize: number;

  /**
   * @param size Display size on screen
   * @param sourceFrameSize Pixel size of one frame in the sprite sheet (defaults to SPRITE_SIZE)
   */
  constructor(size: FishSize, sourceFrameSize?: number) {
    this.frameSize = SPRITE_SIZE[size];
    this.sourceFrameSize = sourceFrameSize ?? this.frameSize;
  }

  /** Load the sprite sheet. Pass a Webview URI as src */
  load(src: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.isLoaded = true;
        resolve();
      };
      img.onerror = () => {
        // Not fatal since fallback rendering is available
        resolve();
      };
      img.src = src;
    });
  }

  get loaded(): boolean {
    return this.isLoaded;
  }

  /** Draw the sprite for the given behavior and frame index */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    behavior: FishBehavior,
    animFrame: number,
    direction: 1 | -1,
    alive: boolean,
  ): boolean {
    if (!this.image || !this.isLoaded) {
      return false;
    }

    const frame = this.getFrame(behavior, animFrame);
    const size = this.frameSize;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);

    if (direction === 1) {
      ctx.scale(-1, 1); // Sprites face left, so flip when moving right
    }
    if (!alive) {
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.5;
    }

    ctx.drawImage(
      this.image,
      frame.x, frame.y, frame.width, frame.height,
      -size / 2, -size / 2, size, size, // Scale from sourceFrameSize to frameSize
    );

    ctx.restore();
    return true;
  }

  private getFrame(behavior: FishBehavior, animFrame: number): SpriteFrame {
    let index: number;

    switch (behavior) {
      case 'eat':
        index = FRAME_INDEX.eatStart + (animFrame % FRAME_INDEX.eatCount);
        break;
      case 'rest':
        index = FRAME_INDEX.restStart;
        break;
      case 'dead':
        index = FRAME_INDEX.deadStart;
        break;
      // swim and chaseFood both use swim frames
      default:
        index = FRAME_INDEX.swimStart + (animFrame % FRAME_INDEX.swimCount);
        break;
    }

    return {
      x: index * this.sourceFrameSize,
      y: 0,
      width: this.sourceFrameSize,
      height: this.sourceFrameSize,
    };
  }
}
