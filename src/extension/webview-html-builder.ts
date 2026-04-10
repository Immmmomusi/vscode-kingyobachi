import * as crypto from 'crypto';
import * as vscode from 'vscode';

/** Generate HTML string for the Webview (shared by sidebar and panel) */
export function buildAquariumHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'),
  );
  const orangeSpriteUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'kingyo_orange.png'),
  );
  const kouhakuSpriteUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'kingyo_kouhaku.png'),
  );

  const nonce = generateNonce();

  return /* html */ `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src ${webview.cspSource};">
  <title>Kingyobachi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="aquarium"
    data-sprite-orange="${orangeSpriteUri}"
    data-sprite-kouhaku="${kouhakuSpriteUri}"></canvas>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.randomFillSync(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
