import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, TextDocument } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { HoloScriptPreviewPanel } from './previewPanel';
import { agentAPI } from './agentApi';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext) {
  // Register the preview command
  context.subscriptions.push(
    commands.registerCommand('holoscript.openPreview', () => {
      const editor = window.activeTextEditor;
      if (editor && isHoloScriptFile(editor.document)) {
        HoloScriptPreviewPanel.createOrShow(context.extensionUri, editor.document);
      } else {
        window.showWarningMessage('Open a HoloScript file (.holo or .hsplus) to preview.');
      }
    })
  );

  // Register command to open preview to the side
  context.subscriptions.push(
    commands.registerCommand('holoscript.openPreviewToSide', () => {
      const editor = window.activeTextEditor;
      if (editor && isHoloScriptFile(editor.document)) {
        HoloScriptPreviewPanel.createOrShow(context.extensionUri, editor.document);
      } else {
        window.showWarningMessage('Open a HoloScript file (.holo or .hsplus) to preview.');
      }
    })
  );

  // Auto-update preview when switching documents
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(editor => {
      if (editor && isHoloScriptFile(editor.document) && HoloScriptPreviewPanel.currentPanel) {
        HoloScriptPreviewPanel.currentPanel.updateContent(editor.document);
      }
    })
  );

  // Register webview panel serializer for restore on restart
  if (window.registerWebviewPanelSerializer) {
    context.subscriptions.push(
      window.registerWebviewPanelSerializer(HoloScriptPreviewPanel.viewType, {
        async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: unknown) {
          HoloScriptPreviewPanel.revive(webviewPanel, context.extensionUri);
        }
      })
    );
  }

  // Initialize AI Agent API - enables Brittney, Claude, Copilot to control extension
  agentAPI.initialize(context);
  console.log('HoloScript: AI Agent API initialized. Agents can use holoscript.agent.* commands.');

  // Register Open Examples command
  context.subscriptions.push(
    commands.registerCommand('holoscript.openExamples', async () => {
      const examplesPath = path.join(context.extensionPath, '..', '..', 'examples', 'quickstart');
      const uri = vscode.Uri.file(examplesPath);
      
      // Try to open the quickstart folder
      try {
        if (fs.existsSync(examplesPath)) {
          await commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
        } else {
          // Fallback: open examples on GitHub
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/brianonbased-dev/holoscript/tree/master/examples/quickstart'));
        }
      } catch {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/brianonbased-dev/holoscript/tree/master/examples/quickstart'));
      }
    })
  );

  // Register Show Walkthrough command
  context.subscriptions.push(
    commands.registerCommand('holoscript.showWalkthrough', () => {
      commands.executeCommand('workbench.action.openWalkthrough', 'holoscript.holoscript-vscode#holoscript-getting-started');
    })
  );

  // Register Open Documentation command
  context.subscriptions.push(
    commands.registerCommand('holoscript.openDocumentation', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://holoscript.net/guides/'));
    })
  );

  // Register Validate command for users
  context.subscriptions.push(
    commands.registerCommand('holoscript.validate', async () => {
      const editor = window.activeTextEditor;
      if (!editor || !isHoloScriptFile(editor.document)) {
        window.showWarningMessage('Open a HoloScript file (.holo or .hsplus) to validate.');
        return;
      }
      
      const text = editor.document.getText();
      const lines = text.split('\n');
      const errors: { line: number; message: string }[] = [];
      
      // Basic syntax validation
      let braceCount = 0;
      let inString = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
          if (char === '"' || char === "'") inString = !inString;
          else if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
        }
      }
      
      if (braceCount !== 0) {
        errors.push({ line: lines.length, message: 'Unbalanced braces' });
      }
      
      if (errors.length === 0) {
        window.showInformationMessage('✅ HoloScript syntax is valid!');
      } else {
        window.showErrorMessage(`❌ Found ${errors.length} error(s): ${errors.map(e => e.message).join(', ')}`);
      }
    })
  );

  // Register interactive Create First Scene command (for walkthrough)
  context.subscriptions.push(
    commands.registerCommand('holoscript.createFirstScene', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        window.showWarningMessage('Open a folder first to create HoloScript files.');
        return;
      }

      const filename = await window.showInputBox({
        prompt: 'Enter a name for your first scene',
        value: 'hello-world',
        placeHolder: 'hello-world'
      });

      if (!filename) return;

      const filePath = path.join(workspaceFolder.uri.fsPath, `${filename}.holo`);
      
      const defaultContent = `composition "My First Scene" {
  environment {
    skybox: "default"
    ambient_light: 0.5
  }

  object "MyFirstCube" {
    @grabbable
    @collidable
    
    geometry: "cube"
    position: [0, 1, 0]
    scale: [0.5, 0.5, 0.5]
    color: "#00ffff"
  }
}
`;

      try {
        fs.writeFileSync(filePath, defaultContent, 'utf8');
        const doc = await vscode.workspace.openTextDocument(filePath);
        await window.showTextDocument(doc);
        window.showInformationMessage(`Created ${filename}.holo! 🎉 Try adding more objects.`);
      } catch (err) {
        window.showErrorMessage(`Failed to create file: ${err}`);
      }
    })
  );

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get('holoscript.hasShownWelcome');
  if (!hasShownWelcome) {
    context.globalState.update('holoscript.hasShownWelcome', true);
    window.showInformationMessage(
      'Welcome to HoloScript! 🎉 Ready to build VR/AR experiences?',
      'Get Started',
      'Open Examples'
    ).then(selection => {
      if (selection === 'Get Started') {
        commands.executeCommand('holoscript.showWalkthrough');
      } else if (selection === 'Open Examples') {
        commands.executeCommand('holoscript.openExamples');
      }
    });
  }

  // Try multiple possible server locations
  const possiblePaths = [
    // Bundled with extension
    path.join(context.extensionPath, 'server', 'lsp', 'server.js'),
    // In workspace (monorepo development)
    path.join(context.extensionPath, '..', 'cli', 'dist', 'lsp', 'server.js'),
    // Installed globally via npm
    path.join(context.extensionPath, 'node_modules', '@holoscript', 'cli', 'dist', 'lsp', 'server.js'),
    // From lsp package directly
    path.join(context.extensionPath, '..', 'lsp', 'dist', 'server.js'),
  ];

  let serverModule: string | undefined;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serverModule = p;
      break;
    }
  }

  // If no server found, just provide syntax highlighting (no LSP features)
  if (!serverModule) {
    console.log('HoloScript: Language server not found. Running in syntax-only mode.');
    return;
  }

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'holoscript' },
      { scheme: 'file', language: 'holoscriptplus' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/.holoscriptrc')
    }
  };

  client = new LanguageClient(
    'holoscriptLSP',
    'HoloScript Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client
  client.start().catch((err) => {
    console.error('HoloScript: Failed to start language server:', err);
  });
}

function isHoloScriptFile(document: TextDocument): boolean {
  const fileName = document.fileName.toLowerCase();
  return fileName.endsWith('.holo') || fileName.endsWith('.hsplus') || fileName.endsWith('.hs');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
