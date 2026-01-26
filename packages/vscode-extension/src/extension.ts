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
  return fileName.endsWith('.holo') || fileName.endsWith('.hsplus');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
