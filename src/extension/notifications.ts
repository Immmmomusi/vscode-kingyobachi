import * as vscode from 'vscode';

import type { AquariumState, GoldfishState } from '../shared/types';
import { HUNGER_WARNING_THRESHOLD } from '../shared/constants';

/** Manages hunger and death notifications (prevents duplicates) */
export class AquariumNotifier {
  /** Fish IDs that have already received a hunger warning */
  private hungryWarned = new Set<string>();
  /** Fish IDs that have already received a death notification */
  private deathNotified = new Set<string>();

  /** Check state and issue necessary notifications */
  checkAndNotify(state: AquariumState): void {
    for (const fish of state.fish) {
      this.checkHungerWarning(fish);
      this.checkDeathNotification(fish);
    }

    // Clean up tracking for removed fish
    const currentIds = new Set(state.fish.map((f) => f.id));
    for (const id of this.hungryWarned) {
      if (!currentIds.has(id)) {
        this.hungryWarned.delete(id);
      }
    }
    for (const id of this.deathNotified) {
      if (!currentIds.has(id)) {
        this.deathNotified.delete(id);
      }
    }
  }

  private checkHungerWarning(fish: GoldfishState): void {
    if (!fish.alive) {
      return;
    }

    if (fish.hunger <= HUNGER_WARNING_THRESHOLD) {
      if (!this.hungryWarned.has(fish.id)) {
        this.hungryWarned.add(fish.id);
        vscode.window.showWarningMessage(
          `${fish.name} is hungry! Please feed it.`,
          'Feed',
        ).then((action) => {
          if (action === 'Feed') {
            vscode.commands.executeCommand('kingyobachi.feed');
          }
        });
      }
    } else {
      // Reset when hunger is resolved (re-notify next time hunger drops)
      this.hungryWarned.delete(fish.id);
    }
  }

  private checkDeathNotification(fish: GoldfishState): void {
    if (!fish.alive && !this.deathNotified.has(fish.id)) {
      this.deathNotified.add(fish.id);
      vscode.window.showInformationMessage(
        `${fish.name} has passed away...`,
      );
    }
  }
}
