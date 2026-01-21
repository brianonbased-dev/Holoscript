import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Launch the server from the CLI package
  // In a real build, this would point to the compiled server.js
  // For dev, we point to the ts-node execution or built js
  const serverModule = context.asAbsolutePath(
    path.join('packages', 'cli', 'dist', 'lsp', 'server.js')
  );

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for holoscript documents
    documentSelector: [{ scheme: 'file', language: 'holoscript' }],
    synchronize: {
      // Notify the server about file changes to '.holoscriptrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.holoscriptrc')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'holoscriptLSP',
    'HoloScript Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
