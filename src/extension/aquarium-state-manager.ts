import * as crypto from 'crypto';
import * as vscode from 'vscode';

import type { AquariumState, GoldfishState, FishType } from '../shared/types';
import {
  GAME_DAY_MS,
  FEED_HUNGER_RECOVERY,
  MAX_HUNGER,
  HUNGER_DECAY_PER_DAY,
  STARVATION_DAYS,
  SIZE_THRESHOLDS,
} from '../shared/constants';

const STATE_KEY = 'kingyobachi.aquariumState';

/** Periodic tick interval: check every 1 minute */
const TICK_INTERVAL_MS = 60 * 1000;

type StateChangedListener = () => void;

/** Manages aquarium state and persists it to globalState */
export class AquariumStateManager {
  private state: AquariumState;
  private tickTimer: NodeJS.Timeout | null = null;
  private listeners: StateChangedListener[] = [];
  private isSaving = false;
  private hasPendingSave = false;

  constructor(private globalState: vscode.Memento) {
    this.state = this.loadState();
    this.processTickAsync();
    this.startPeriodicTick();
  }

  /** Register a callback for state changes */
  addOnStateChanged(listener: StateChangedListener): void {
    this.listeners.push(listener);
  }

  /** Stop periodic ticks and release resources (called on extension deactivation) */
  dispose(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.listeners = [];
  }

  /** Return a copy of the state (prevents direct external mutation) */
  getState(): AquariumState {
    return {
      fish: this.state.fish.map((f) => ({ ...f })),
      lastTickAt: this.state.lastTickAt,
    };
  }

  /** Add a fish and persist */
  async addFish(type: FishType, name: string): Promise<GoldfishState> {
    const now = Date.now();
    const fish: GoldfishState = {
      id: generateId(),
      type,
      name,
      hunger: MAX_HUNGER,
      growth: 0,
      age: 0,
      alive: true,
      size: 'small',
      lastFedAt: now,
    };
    this.state.fish.push(fish);
    await this.save();
    this.notifyListeners();
    return { ...fish };
  }

  /** Remove a fish and persist */
  async removeFish(fishId: string): Promise<void> {
    this.state.fish = this.state.fish.filter((f) => f.id !== fishId);
    await this.save();
    this.notifyListeners();
  }

  /** A specific fish ate food */
  async fishAte(fishId: string): Promise<void> {
    const fish = this.state.fish.find((f) => f.id === fishId);
    if (!fish || !fish.alive) {
      return;
    }
    fish.hunger = Math.min(fish.hunger + FEED_HUNGER_RECOVERY, MAX_HUNGER);
    fish.lastFedAt = Date.now();
    await this.save();
    this.notifyListeners();
  }

  /** Update state based on elapsed time (async version) */
  private async processTickAsync(): Promise<void> {
    const changed = this.calculateTick();
    if (changed) {
      await this.save();
      this.notifyListeners();
    }
  }

  /** Core tick calculation. Returns true if state was modified */
  private calculateTick(): boolean {
    const now = Date.now();
    const elapsed = now - this.state.lastTickAt;
    const daysPassed = Math.floor(elapsed / GAME_DAY_MS);

    if (daysPassed <= 0) {
      return false;
    }

    for (const fish of this.state.fish) {
      if (!fish.alive) {
        continue;
      }

      fish.age += daysPassed;
      fish.hunger = Math.max(fish.hunger - HUNGER_DECAY_PER_DAY * daysPassed, 0);
      fish.size = calculateSize(fish.age);

      // Die if hunger has been 0 for STARVATION_DAYS or more
      if (fish.hunger <= 0) {
        const daysSinceLastFed = Math.floor((now - fish.lastFedAt) / GAME_DAY_MS);
        if (daysSinceLastFed >= STARVATION_DAYS) {
          fish.alive = false;
        }
      }
    }

    this.state.lastTickAt = now;
    return true;
  }

  /** Run tick processing periodically (handles time elapsed while VSCode is running) */
  private startPeriodicTick(): void {
    this.tickTimer = setInterval(() => {
      this.processTickAsync().catch((err) => {
        console.error('kingyobachi: Tick processing failed', err);
      });
    }, TICK_INTERVAL_MS);
  }

  private loadState(): AquariumState {
    const saved = this.globalState.get<unknown>(STATE_KEY);
    if (saved && isValidAquariumState(saved)) {
      return saved;
    }
    return { fish: [], lastTickAt: Date.now() };
  }

  /** Serialized save to prevent concurrent save conflicts */
  private async save(): Promise<void> {
    if (this.isSaving) {
      this.hasPendingSave = true;
      return;
    }
    this.isSaving = true;
    try {
      await this.globalState.update(STATE_KEY, this.state);
      // Re-execute if a new save was requested during save
      while (this.hasPendingSave) {
        this.hasPendingSave = false;
        await this.globalState.update(STATE_KEY, this.state);
      }
    } finally {
      this.isSaving = false;
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.randomFillSync(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function calculateSize(age: number): GoldfishState['size'] {
  if (age >= SIZE_THRESHOLDS.large) {
    return 'large';
  }
  if (age >= SIZE_THRESHOLDS.medium) {
    return 'medium';
  }
  return 'small';
}

/** Validate the structure of data loaded from globalState */
function isValidAquariumState(data: unknown): data is AquariumState {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.fish) || typeof obj.lastTickAt !== 'number') {
    return false;
  }
  // Validate that each element in the fish array has required properties
  return obj.fish.every((f: unknown) => isValidGoldfishState(f));
}

function isValidGoldfishState(data: unknown): data is GoldfishState {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const f = data as Record<string, unknown>;
  return (
    typeof f.id === 'string' &&
    (f.type === 'orange' || f.type === 'kouhaku') &&
    typeof f.name === 'string' &&
    typeof f.hunger === 'number' &&
    typeof f.growth === 'number' &&
    typeof f.age === 'number' &&
    typeof f.alive === 'boolean' &&
    (f.size === 'small' || f.size === 'medium' || f.size === 'large') &&
    typeof f.lastFedAt === 'number'
  );
}
