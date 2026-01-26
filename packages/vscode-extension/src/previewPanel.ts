/**
 * HoloScript Live Preview Panel
 * 
 * Provides a real-time 3D preview of HoloScript scenes in VS Code.
 * Uses a WebView with Three.js for rendering.
 */

import * as vscode from 'vscode';
import * as path from 'path';

export class HoloScriptPreviewPanel {
  public static currentPanel: HoloScriptPreviewPanel | undefined;
  public static readonly viewType = 'holoscriptPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentDocument: vscode.TextDocument | undefined;

  public static createOrShow(extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    const column = vscode.ViewColumn.Beside;

    // If we already have a panel, show it
    if (HoloScriptPreviewPanel.currentPanel) {
      HoloScriptPreviewPanel.currentPanel._panel.reveal(column);
      if (document) {
        HoloScriptPreviewPanel.currentPanel.updateContent(document);
      }
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      HoloScriptPreviewPanel.viewType,
      'HoloScript Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'node_modules'),
        ],
      }
    );

    HoloScriptPreviewPanel.currentPanel = new HoloScriptPreviewPanel(panel, extensionUri);
    
    if (document) {
      HoloScriptPreviewPanel.currentPanel.updateContent(document);
    }
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    HoloScriptPreviewPanel.currentPanel = new HoloScriptPreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view state changes
    this._panel.onDidChangeViewState(
      _e => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'error':
            vscode.window.showErrorMessage(message.text);
            return;
          case 'info':
            vscode.window.showInformationMessage(message.text);
            return;
          case 'ready':
            // Webview is ready, send current content
            if (this._currentDocument) {
              this._sendUpdate();
            }
            return;
        }
      },
      null,
      this._disposables
    );

    // Watch for document changes
    vscode.workspace.onDidChangeTextDocument(
      e => {
        if (this._currentDocument && e.document === this._currentDocument) {
          this._sendUpdate();
        }
      },
      null,
      this._disposables
    );
  }

  public updateContent(document: vscode.TextDocument) {
    this._currentDocument = document;
    this._panel.title = `Preview: ${path.basename(document.fileName)}`;
    this._sendUpdate();
  }

  private _sendUpdate() {
    if (!this._currentDocument) return;
    
    const content = this._currentDocument.getText();
    const fileName = this._currentDocument.fileName;
    
    this._panel.webview.postMessage({
      command: 'update',
      content,
      fileName,
      isHoloPlus: fileName.endsWith('.hsplus'),
    });
  }

  public dispose() {
    HoloScriptPreviewPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src ${webview.cspSource} https: data:; connect-src https:;">
  <title>HoloScript Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      overflow: hidden;
      background-color: #1e1e1e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    #container {
      width: 100vw;
      height: 100vh;
      position: relative;
    }
    #canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    #overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 10px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
      color: #fff;
      font-size: 12px;
      pointer-events: none;
    }
    #stats {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 4px;
      color: #fff;
      font-size: 11px;
      font-family: monospace;
    }
    #toolbar {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
    }
    .toolbar-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      color: #fff;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
      pointer-events: auto;
    }
    .toolbar-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    .toolbar-btn.active {
      background: #007acc;
      border-color: #007acc;
    }
    #error-panel {
      position: absolute;
      bottom: 50px;
      left: 10px;
      right: 10px;
      background: rgba(200, 50, 50, 0.9);
      padding: 12px;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      display: none;
    }
    #error-panel.visible {
      display: block;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #888;
      font-size: 14px;
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #007acc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="container">
    <canvas id="canvas"></canvas>
    <div id="overlay">
      <span id="file-name">No file loaded</span>
    </div>
    <div id="toolbar">
      <button class="toolbar-btn" id="btn-reset" title="Reset Camera">🎥 Reset</button>
      <button class="toolbar-btn" id="btn-wireframe" title="Toggle Wireframe">🔲 Wire</button>
      <button class="toolbar-btn" id="btn-grid" title="Toggle Grid">📐 Grid</button>
      <button class="toolbar-btn" id="btn-axes" title="Toggle Axes">📊 Axes</button>
    </div>
    <div id="stats">
      <div>Objects: <span id="stat-objects">0</span></div>
      <div>FPS: <span id="stat-fps">0</span></div>
    </div>
    <div id="error-panel"></div>
    <div id="loading">
      <div class="spinner"></div>
      Initializing 3D Preview...
    </div>
  </div>

  <script nonce="${nonce}">
    // Import Three.js from CDN
    const scriptLoader = document.createElement('script');
    scriptLoader.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    scriptLoader.onload = initPreview;
    document.head.appendChild(scriptLoader);

    const vscode = acquireVsCodeApi();
    
    let scene, camera, renderer, controls;
    let gridHelper, axesHelper;
    let objects = [];
    let wireframeMode = false;
    let showGrid = true;
    let showAxes = true;
    let frameCount = 0;
    let lastTime = performance.now();

    function initPreview() {
      // Load OrbitControls
      const orbitScript = document.createElement('script');
      orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      orbitScript.onload = setupScene;
      document.head.appendChild(orbitScript);
    }

    function setupScene() {
      const canvas = document.getElementById('canvas');
      const container = document.getElementById('container');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

      // Camera
      camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(5, 5, 5);

      // Renderer
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Controls
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1;
      controls.maxDistance = 100;

      // Grid
      gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
      scene.add(gridHelper);

      // Axes
      axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);

      // Ambient light
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);

      // Directional light
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 10, 5);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      scene.add(dirLight);

      // Ground plane (invisible, for shadows)
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Hide loading
      document.getElementById('loading').style.display = 'none';

      // Setup toolbar events
      document.getElementById('btn-reset').addEventListener('click', resetCamera);
      document.getElementById('btn-wireframe').addEventListener('click', toggleWireframe);
      document.getElementById('btn-grid').addEventListener('click', toggleGrid);
      document.getElementById('btn-axes').addEventListener('click', toggleAxes);

      // Handle resize
      window.addEventListener('resize', onWindowResize);

      // Start animation
      animate();

      // Notify extension we're ready
      vscode.postMessage({ command: 'ready' });
    }

    function animate() {
      requestAnimationFrame(animate);
      
      controls.update();
      renderer.render(scene, camera);
      
      // FPS counter
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        document.getElementById('stat-fps').textContent = frameCount;
        frameCount = 0;
        lastTime = now;
      }
    }

    function onWindowResize() {
      const container = document.getElementById('container');
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function resetCamera() {
      camera.position.set(5, 5, 5);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    function toggleWireframe() {
      wireframeMode = !wireframeMode;
      objects.forEach(obj => {
        if (obj.material) {
          obj.material.wireframe = wireframeMode;
        }
      });
      document.getElementById('btn-wireframe').classList.toggle('active', wireframeMode);
    }

    function toggleGrid() {
      showGrid = !showGrid;
      gridHelper.visible = showGrid;
      document.getElementById('btn-grid').classList.toggle('active', showGrid);
    }

    function toggleAxes() {
      showAxes = !showAxes;
      axesHelper.visible = showAxes;
      document.getElementById('btn-axes').classList.toggle('active', showAxes);
    }

    function clearScene() {
      objects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      objects = [];
    }

    function parseAndRender(content, isHoloPlus) {
      clearScene();
      const errorPanel = document.getElementById('error-panel');
      errorPanel.classList.remove('visible');

      try {
        // Simple parser for HoloScript objects
        const orbPattern = /(?:orb|object)\\s+["']?([\\w_]+)["']?\\s*\\{([^}]*)\\}/g;
        let match;
        let count = 0;

        while ((match = orbPattern.exec(content)) !== null) {
          const name = match[1];
          const props = match[2];

          // Parse position
          const posMatch = props.match(/position\\s*:\\s*\\[([^\\]]+)\\]/);
          const position = posMatch 
            ? posMatch[1].split(',').map(n => parseFloat(n.trim()) || 0)
            : [0, 0, 0];

          // Parse scale
          const scaleMatch = props.match(/scale\\s*:\\s*\\[([^\\]]+)\\]/);
          const scale = scaleMatch 
            ? scaleMatch[1].split(',').map(n => parseFloat(n.trim()) || 1)
            : [1, 1, 1];

          // Parse rotation
          const rotMatch = props.match(/rotation\\s*:\\s*\\[([^\\]]+)\\]/);
          const rotation = rotMatch 
            ? rotMatch[1].split(',').map(n => (parseFloat(n.trim()) || 0) * Math.PI / 180)
            : [0, 0, 0];

          // Parse color
          const colorMatch = props.match(/color\\s*:\\s*["']?#?([\\w]+)["']?/);
          let color = 0x4a9eff;
          if (colorMatch) {
            const colorStr = colorMatch[1];
            if (colorStr.match(/^[0-9a-f]{6}$/i)) {
              color = parseInt(colorStr, 16);
            } else {
              const colorNames = {
                red: 0xff4444, green: 0x44ff44, blue: 0x4444ff,
                yellow: 0xffff44, cyan: 0x44ffff, magenta: 0xff44ff,
                white: 0xffffff, black: 0x333333, orange: 0xff8844,
                purple: 0x8844ff, pink: 0xff44aa
              };
              color = colorNames[colorStr.toLowerCase()] || color;
            }
          }

          // Parse model type
          const modelMatch = props.match(/model\\s*:\\s*["']([\\w]+)["']/);
          const modelType = modelMatch ? modelMatch[1].toLowerCase() : 'cube';

          // Create geometry based on model type
          let geometry;
          switch (modelType) {
            case 'sphere':
              geometry = new THREE.SphereGeometry(0.5, 32, 32);
              break;
            case 'cylinder':
              geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
              break;
            case 'cone':
              geometry = new THREE.ConeGeometry(0.5, 1, 32);
              break;
            case 'torus':
              geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 48);
              break;
            case 'plane':
              geometry = new THREE.PlaneGeometry(1, 1);
              break;
            default:
              geometry = new THREE.BoxGeometry(1, 1, 1);
          }

          // Create material
          const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.4,
            metalness: 0.1,
            wireframe: wireframeMode
          });

          // Create mesh
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(position[0], position[1], position[2]);
          mesh.scale.set(scale[0], scale[1], scale[2]);
          mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.name = name;

          scene.add(mesh);
          objects.push(mesh);
          count++;
        }

        document.getElementById('stat-objects').textContent = count;
      } catch (error) {
        errorPanel.textContent = 'Parse error: ' + error.message;
        errorPanel.classList.add('visible');
      }
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'update':
          document.getElementById('file-name').textContent = message.fileName.split(/[\\\\/]/).pop();
          parseAndRender(message.content, message.isHoloPlus);
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
