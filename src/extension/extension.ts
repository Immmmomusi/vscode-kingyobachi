import * as vscode from 'vscode';

import { FISH_TYPE_LABELS } from '../shared/constants';
import type { AquariumColors, FishType } from '../shared/types';
import { AquariumStateManager } from './aquarium-state-manager';
import { AquariumViewProvider } from './aquarium-view-provider';
import { AquariumNotifier } from './notifications';

function readColors(): AquariumColors {
  const cfg = vscode.workspace.getConfiguration('kingyobachi');
  return {
    waterColorTop:    cfg.get<string>('waterColorTop',    '#0a2a4a'),
    waterColorBottom: cfg.get<string>('waterColorBottom', '#0d1b2a'),
    sandColor:        cfg.get<string>('sandColor',        '#3a2f1a'),
  };
}

const VALID_FISH_TYPES: ReadonlySet<string> = new Set(Object.keys(FISH_TYPE_LABELS));

function isValidFishType(value: string): value is FishType {
  return VALID_FISH_TYPES.has(value);
}

export function activate(context: vscode.ExtensionContext): void {
  const stateManager = new AquariumStateManager(context.globalState);
  const viewProvider = new AquariumViewProvider(context.extensionUri, stateManager, readColors);
  const notifier = new AquariumNotifier();

  // Notify consumers of state changes
  stateManager.addOnStateChanged(() => {
    const state = stateManager.getState();
    viewProvider.postMessage({ type: 'stateUpdate', state });
    notifier.checkAndNotify(state);
  });

  context.subscriptions.push(
    { dispose: () => stateManager.dispose() },
    vscode.window.registerWebviewViewProvider(AquariumViewProvider.viewType, viewProvider),
  );

  // Apply color changes in real time when settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kingyobachi')) {
        viewProvider.postMessage({ type: 'updateColors', colors: readColors() });
      }
    }),
  );

  // --- Command registration ---

  context.subscriptions.push(
    vscode.commands.registerCommand('kingyobachi.feed', () => {
      viewProvider.executeFeed();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kingyobachi.addFish', async () => {
      const items = Object.entries(FISH_TYPE_LABELS).map(([value, label]) => ({
        label,
        value,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a type of goldfish to add',
      });
      if (!picked) {
        return;
      }

      if (!isValidFishType(picked.value)) {
        vscode.window.showErrorMessage(`Invalid fish type: ${picked.value}`);
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: 'Enter a name for the goldfish',
        placeHolder: 'Name',
      });
      if (!name) {
        return;
      }

      try {
        await stateManager.addFish(picked.value, name);
      } catch (err) {
        console.error('kingyobachi: Failed to add fish', err);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kingyobachi.removeFish', async () => {
      const state = stateManager.getState();
      if (state.fish.length === 0) {
        vscode.window.showInformationMessage('No fish in the bowl');
        return;
      }

      const items = state.fish.map((f) => ({
        label: f.name,
        description: `${f.type} / ${f.size}`,
        id: f.id,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a fish to remove',
      });
      if (!picked) {
        return;
      }

      try {
        await stateManager.removeFish(picked.id);
      } catch (err) {
        console.error('kingyobachi: Failed to remove fish', err);
      }
    }),
  );
}

export function deactivate(): void {
  // Resources are automatically released via subscriptions.dispose
}
