import type { ExtToWebview, WebviewToExt } from '../shared/messages';
import type { AquariumState } from '../shared/types';
import { AquariumRenderer } from './aquarium-renderer';
import { FishEntity } from './fish-entity';
import { drawFish, registerSprite } from './fish-renderer';
import { FoodEntity, drawFood } from './food-entity';
import { SpriteSheet } from './sprite-sheet';

// @ts-expect-error -- VSCode Webview API はグローバルに注入される
const vscodeApi = acquireVsCodeApi();

function postMessage(message: WebviewToExt): void {
  vscodeApi.postMessage(message);
}

const canvas = document.getElementById('aquarium') as HTMLCanvasElement;
const renderer = new AquariumRenderer(canvas);

let aquariumState: AquariumState | null = null;
let fishEntities: FishEntity[] = [];
let foods: FoodEntity[] = [];
let animationId: number | null = null;

/** Sync FishEntities from state (handles additions, removals, and state updates) */
function syncFishEntities(state: AquariumState): void {
  const newIds = new Set(state.fish.map((f) => f.id));

  // Remove deleted fish
  fishEntities = fishEntities.filter((e) => newIds.has(e.state.id));

  // Build lookup map of existing entities
  const existingMap = new Map(fishEntities.map((e) => [e.state.id, e]));

  for (const fish of state.fish) {
    const existing = existingMap.get(fish.id);
    if (existing) {
      // Update state in-place (preserves position and animation)
      existing.updateState(fish);
    } else {
      fishEntities.push(new FishEntity(fish, renderer.width, renderer.height));
    }
  }
}

/** Food spawn X start ratio and range ratio (scattered near the center) */
const FOOD_SPAWN_X_START_RATIO = 0.2;
const FOOD_SPAWN_X_RANGE_RATIO = 0.6;

/** Drop food (one pellet per fish, minimum 1) */
function spawnFood(): void {
  const count = Math.max(1, fishEntities.length);
  for (let i = 0; i < count; i++) {
    const x = renderer.width * FOOD_SPAWN_X_START_RATIO + Math.random() * renderer.width * FOOD_SPAWN_X_RANGE_RATIO;
    foods.push(new FoodEntity(x, renderer.height));
  }
}

/** Main animation loop */
function animate(): void {
  renderer.renderBackground();

  // Update and draw food (disappears when eaten or after settling at the bottom)
  foods = foods.filter((food) => {
    const shouldRemove = food.update();
    drawFood(renderer.context, food);
    return !shouldRemove;
  });

  // Collect food already being chased by other fish (for target distribution)
  const claimedFoods = new Set(
    fishEntities.map((e) => e.getTargetFood()).filter((f): f is NonNullable<typeof f> => f !== null),
  );

  // Update and draw fish
  for (const entity of fishEntities) {
    entity.update(renderer.width, renderer.height, foods, () => {
      postMessage({ type: 'fishAte', fishId: entity.state.id });
    }, claimedFoods);
    drawFish(renderer.context, entity);
  }

  animationId = requestAnimationFrame(animate);
}

function startAnimation(): void {
  if (animationId !== null) {
    return;
  }
  animate();
}

function stopAnimation(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Receive messages from Extension
window.addEventListener('message', (event) => {
  const message = event.data;
  if (typeof message !== 'object' || message === null || typeof message.type !== 'string') {
    return;
  }
  const msg = message as ExtToWebview;

  switch (msg.type) {
    case 'init':
    case 'stateUpdate':
      aquariumState = msg.state;
      syncFishEntities(aquariumState);
      break;

    case 'feed':
      spawnFood();
      break;

    case 'updateColors':
      renderer.updateColors(msg.colors);
      break;
  }
});

// Handle resize
window.addEventListener('resize', () => {
  renderer.resize();
});

// Handle Webview visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAnimation();
  } else {
    startAnimation();
  }
});

// Request feeding on aquarium click
canvas.addEventListener('click', () => {
  postMessage({ type: 'feedRequest' });
});

// Async sprite loading (fallback rendering is used before loading completes)
const SPRITE_SOURCES: ReadonlyArray<{ type: 'orange' | 'kouhaku'; uri: string | undefined }> = [
  { type: 'orange', uri: canvas.dataset.spriteOrange },
  { type: 'kouhaku', uri: canvas.dataset.spriteKouhaku },
];

for (const { type, uri } of SPRITE_SOURCES) {
  if (!uri) {
    continue;
  }
  // 同一 PNG を 3 サイズ分のインスタンスで登録 (frameSize だけ変えて描画スケールを切り替える)
  for (const size of ['small', 'medium', 'large'] as const) {
    const sprite = new SpriteSheet(size, 16);
    sprite.load(uri).then(() => {
      registerSprite(type, size, sprite);
    });
  }
}

// Initialize
startAnimation();
postMessage({ type: 'ready' });
