"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = require("path");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
let client;
function activate(context) {
    // Launch the server from the CLI package
    // In a real build, this would point to the compiled server.js
    // For dev, we point to the ts-node execution or built js
    const serverModule = context.asAbsolutePath(path.join('packages', 'cli', 'dist', 'lsp', 'server.js'));
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        }
    };
    // Options to control the language client
    const clientOptions = {
        // Register the server for holoscript documents
        documentSelector: [{ scheme: 'file', language: 'holoscript' }],
        synchronize: {
            // Notify the server about file changes to '.holoscriptrc files contained in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.holoscriptrc')
        }
    };
    // Create the language client and start the client.
    client = new node_1.LanguageClient('holoscriptLSP', 'HoloScript Language Server', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map