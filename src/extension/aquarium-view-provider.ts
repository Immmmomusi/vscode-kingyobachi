import * as vscode from 'vscode';

import type { AquariumColors } from '../shared/types';
import type { ExtToWebview, WebviewToExt } from '../shared/messages';
import { AquariumStateManager } from './aquarium-state-manager';
import { buildAquariumHtml } from './webview-html-builder';

/** Provider that displays the aquarium Webview in the sidebar */
export class AquariumViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'kingyobachi.aquariumView';

  private view?: vscode.WebviewView;

  constructor(
    private extensionUri: vscode.Uri,
    private stateManager: AquariumStateManager,
    private getColors: () => AquariumColors,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = buildAquariumHtml(webviewView.webview, this.extensionUri);

    webviewView.webview.onDidReceiveMessage((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null || typeof (raw as Record<string, unknown>).type !== 'string') {
        return;
      }
      this.handleMessage(raw as WebviewToExt);
    });

    // Notify on Webview visibility change (CLAUDE.md rule: monitor via onDidChangeViewState)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.postMessage({ type: 'stateUpdate', state: this.stateManager.getState() });
        this.postMessage({ type: 'updateColors', colors: this.getColors() });
      }
    });
  }

  /** Send a message to the Webview */
  postMessage(message: ExtToWebview): void {
    this.view?.webview.postMessage(message);
  }

  /** Execute feeding and notify the Webview */
  executeFeed(): void {
    this.postMessage({ type: 'feed' });
  }

  private handleMessage(message: WebviewToExt): void {
    switch (message.type) {
      case 'ready':
        this.postMessage({ type: 'init', state: this.stateManager.getState() });
        this.postMessage({ type: 'updateColors', colors: this.getColors() });
        break;

      case 'feedRequest':
        this.executeFeed();
        break;

      case 'fishAte':
        this.stateManager.fishAte(message.fishId)
          .catch((err) => {
            console.error('kingyobachi: Failed to update feeding state', err);
          });
        break;

      case 'requestState':
        this.postMessage({ type: 'stateUpdate', state: this.stateManager.getState() });
        break;
    }
  }
}
