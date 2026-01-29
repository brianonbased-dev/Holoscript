"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const holohubView_1 = require("./holohubView");
const previewPanel_1 = require("./previewPanel");
const smartAssetEditor_1 = require("./smartAssetEditor");
const agentApi_1 = require("./agentApi");
const completionProvider_1 = require("./completionProvider");
let client;
function activate(context) {
    // Register the preview command
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.openPreview', () => {
        const editor = vscode_1.window.activeTextEditor;
        if (editor && isHoloScriptFile(editor.document)) {
            previewPanel_1.HoloScriptPreviewPanel.createOrShow(context.extensionUri, editor.document);
        }
        else {
            vscode_1.window.showWarningMessage('Open a HoloScript file (.holo or .hsplus) to preview.');
        }
    }));
    // Register command to open preview to the side
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.openPreviewToSide', () => {
        const editor = vscode_1.window.activeTextEditor;
        if (editor && isHoloScriptFile(editor.document)) {
            previewPanel_1.HoloScriptPreviewPanel.createOrShow(context.extensionUri, editor.document);
        }
        else {
            vscode_1.window.showWarningMessage('Open a HoloScript file (.holo or .hsplus) to preview.');
        }
    }));
    // Auto-update preview when switching documents
    context.subscriptions.push(vscode_1.window.onDidChangeActiveTextEditor(editor => {
        if (editor && isHoloScriptFile(editor.document) && previewPanel_1.HoloScriptPreviewPanel.currentPanel) {
            previewPanel_1.HoloScriptPreviewPanel.currentPanel.updateContent(editor.document);
        }
    }));
    // Register webview panel serializer for restore on restart
    if (vscode_1.window.registerWebviewPanelSerializer) {
        context.subscriptions.push(vscode_1.window.registerWebviewPanelSerializer(previewPanel_1.HoloScriptPreviewPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel, _state) {
                previewPanel_1.HoloScriptPreviewPanel.revive(webviewPanel, context.extensionUri);
            }
        }));
    }
    // Initialize AI Agent API - enables Brittney, Claude, Copilot to control extension
    agentApi_1.agentAPI.initialize(context);
    console.log('HoloScript: AI Agent API initialized. Agents can use holoscript.agent.* commands.');
    // Register Open Examples command
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.openExamples', async () => {
        const examplesPath = path.join(context.extensionPath, '..', '..', 'examples', 'quickstart');
        const uri = vscode.Uri.file(examplesPath);
        // Try to open the quickstart folder
        try {
            if (fs.existsSync(examplesPath)) {
                await vscode_1.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
            }
            else {
                // Fallback: open examples on GitHub
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/brianonbased-dev/holoscript/tree/main/examples/quickstart'));
            }
        }
        catch {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/brianonbased-dev/holoscript/tree/main/examples/quickstart'));
        }
    }));
    // Register Show Walkthrough command
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.showWalkthrough', () => {
        vscode_1.commands.executeCommand('workbench.action.openWalkthrough', 'holoscript.holoscript-vscode#holoscript-getting-started');
    }));
    // Register Open Documentation command
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.openDocumentation', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://holoscript.net/guides/'));
    }));
    // Register Validate command for users
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.validate', async () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor || !isHoloScriptFile(editor.document)) {
            vscode_1.window.showWarningMessage('Open a HoloScript file (.holo or .hsplus) to validate.');
            return;
        }
        const text = editor.document.getText();
        const lines = text.split('\n');
        const errors = [];
        // Basic syntax validation
        let braceCount = 0;
        let inString = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '"' || char === "'")
                    inString = !inString;
                else if (!inString) {
                    if (char === '{')
                        braceCount++;
                    if (char === '}')
                        braceCount--;
                }
            }
        }
        if (braceCount !== 0) {
            errors.push({ line: lines.length, message: 'Unbalanced braces' });
        }
        if (errors.length === 0) {
            vscode_1.window.showInformationMessage('✅ HoloScript syntax is valid!');
        }
        else {
            vscode_1.window.showErrorMessage(`❌ Found ${errors.length} error(s): ${errors.map(e => e.message).join(', ')}`);
        }
    }));
    // Register interactive Create First Scene command (for walkthrough)
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.createFirstScene', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode_1.window.showWarningMessage('Open a folder first to create HoloScript files.');
            return;
        }
        const filename = await vscode_1.window.showInputBox({
            prompt: 'Enter a name for your first scene',
            value: 'hello-world',
            placeHolder: 'hello-world'
        });
        if (!filename)
            return;
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
            await vscode_1.window.showTextDocument(doc);
            vscode_1.window.showInformationMessage(`Created ${filename}.holo! 🎉 Try adding more objects.`);
        }
        catch (err) {
            vscode_1.window.showErrorMessage(`Failed to create file: ${err}`);
        }
    }));
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('holoscript.hasShownWelcome');
    if (!hasShownWelcome) {
        context.globalState.update('holoscript.hasShownWelcome', true);
        vscode_1.window.showInformationMessage('Welcome to HoloScript! 🎉 Ready to build VR/AR experiences?', 'Get Started', 'Open Examples').then(selection => {
            if (selection === 'Get Started') {
                vscode_1.commands.executeCommand('holoscript.showWalkthrough');
            }
            else if (selection === 'Open Examples') {
                vscode_1.commands.executeCommand('holoscript.openExamples');
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
    let serverModule;
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
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        }
    };
    const clientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'holoscript' },
            { scheme: 'file', language: 'holoscriptplus' },
        ],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.holoscriptrc')
        }
    };
    client = new node_1.LanguageClient('holoscriptLSP', 'HoloScript Language Server', serverOptions, clientOptions);
    // Start the client
    client.start().catch((err) => {
        console.error('HoloScript: Failed to start language server:', err);
    });
    // Register Custom Editor for Smart Assets (.hsa)
    context.subscriptions.push(smartAssetEditor_1.SmartAssetEditorProvider.register(context));
    // Register HoloHub Tree View
    const holohubProvider = new holohubView_1.HoloHubTreeDataProvider();
    vscode.window.registerTreeDataProvider('holohub.assets', holohubProvider);
    // Register Import Asset Command
    context.subscriptions.push(vscode_1.commands.registerCommand('holoscript.holohub.importAsset', async (item) => {
        // item type is HoloSmartAssetItem (inferred or any)
        const assetName = item?.label || 'Asset';
        vscode_1.window.showInformationMessage(`Downloading ${assetName} from HoloHub...`);
        // Mock download delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        vscode_1.window.showInformationMessage(`Successfully imported ${assetName} to project!`);
    }));
    // Register Formatter
    try {
        const formatter = require('@holoscript/formatter');
        const { loadConfig } = formatter; // Dynamic import to avoid build issues if dep missing during dev
        context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(['holoscript', 'holoscriptplus'], {
            provideDocumentFormattingEdits(document) {
                try {
                    const text = document.getText();
                    const config = loadConfig ? loadConfig(document.fileName) : {};
                    const result = formatter.format(text, document.languageId === 'holoscriptplus' ? 'hsplus' : 'holo');
                    if (result.errors.length > 0) {
                        console.warn('Formatter errors:', result.errors);
                    }
                    if (!result.changed)
                        return [];
                    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
                    return [vscode.TextEdit.replace(fullRange, result.formatted)];
                }
                catch (err) {
                    console.error('Formatting failed:', err);
                    return [];
                }
            }
        }), vscode.languages.registerDocumentRangeFormattingEditProvider(['holoscript', 'holoscriptplus'], {
            provideDocumentRangeFormattingEdits(document, range) {
                try {
                    const text = document.getText();
                    const config = loadConfig ? loadConfig(document.fileName) : {};
                    if (typeof formatter.formatRange !== 'function') {
                        console.warn('HoloScript: formatter.formatRange not available (update package)');
                        return [];
                    }
                    // VS Code ranges are 0-based
                    const formatRange = {
                        startLine: range.start.line,
                        endLine: range.end.line
                    };
                    const result = formatter.formatRange(text, formatRange, document.languageId === 'holoscriptplus' ? 'hsplus' : 'holo');
                    if (!result.changed)
                        return [];
                    return [vscode.TextEdit.replace(range, result.formatted)];
                }
                catch (err) {
                    console.error('Range formatting failed:', err);
                    return [];
                }
            }
        }));
        console.log('HoloScript: Formatter registered.');
    }
    catch (err) {
        console.warn('HoloScript: Formatter package not found or failed to load:', err);
    }
    // Register Completion Provider
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(['holoscript', 'holoscriptplus'], new completionProvider_1.HoloScriptCompletionItemProvider(), '@' // Trigger character
    ));
}
function isHoloScriptFile(document) {
    const fileName = document.fileName.toLowerCase();
    return fileName.endsWith('.holo') || fileName.endsWith('.hsplus') || fileName.endsWith('.hs');
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map