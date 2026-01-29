import * as vscode from 'vscode';
import * as path from 'path';

export class VisualDiffPanel {
  public static currentPanel: VisualDiffPanel | undefined;
  public static readonly viewType = 'holoscriptVisualDiff';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, baseImage?: string, targetImage?: string) {
    const column = vscode.ViewColumn.Two;

    if (VisualDiffPanel.currentPanel) {
      VisualDiffPanel.currentPanel._panel.reveal(column);
      if (baseImage && targetImage) {
        VisualDiffPanel.currentPanel.updateImages(baseImage, targetImage);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      VisualDiffPanel.viewType,
      'Spatial Visual Diff',
      column,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    VisualDiffPanel.currentPanel = new VisualDiffPanel(panel, extensionUri);
    if (baseImage && targetImage) {
      VisualDiffPanel.currentPanel.updateImages(baseImage, targetImage);
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public updateImages(baseImage: string, targetImage: string) {
    this._panel.webview.postMessage({
      command: 'update',
      base: baseImage,
      target: targetImage
    });
  }

  public dispose() {
    VisualDiffPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { background: #1e1e1e; color: #ccc; font-family: sans-serif; padding: 20px; }
    .diff-container { display: flex; gap: 20px; }
    .image-box { flex: 1; border: 1px solid #444; padding: 10px; background: #252526; }
    img { max-width: 100%; height: auto; display: block; }
    h3 { font-size: 12px; margin-bottom: 10px; color: #888; text-transform: uppercase; }
    .slider { width: 100%; margin: 20px 0; }
  </style>
</head>
<body>
  <h2>Spatial Visual Comparison</h2>
  <div class="diff-container">
    <div class="image-box">
      <h3>Base Layout</h3>
      <img id="base-img" src="" />
    </div>
    <div class="image-box">
      <h3>Target Layout</h3>
      <img id="target-img" src="" />
    </div>
  </div>
  <script>
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'update') {
        document.getElementById('base-img').src = message.base;
        document.getElementById('target-img').src = message.target;
      }
    });
  </script>
</body>
</html>`;
  }
}
