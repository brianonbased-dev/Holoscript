import * as vscode from 'vscode';

/**
 * RelayService: The "Brain" of Director Mode.
 * Handles bidirectional communication between the Runtime (Preview Panel) and the Editor.
 */
export class RelayService {
  private static instance: RelayService;
  private _disposables: vscode.Disposable[] = [];

  private constructor() {}

  public static getInstance(): RelayService {
    if (!RelayService.instance) {
      RelayService.instance = new RelayService();
    }
    return RelayService.instance;
  }

  /**
   * Handle a message from the Director Client (Runtime).
   */
  public async handleMessage(message: any, document: vscode.TextDocument) {
    console.log('[RelayService] Received:', message);

    switch (message.type) {
      case 'transform':
        await this.handleTransformUpdate(document, message.id, message.position, message.rotation, message.scale);
        break;
      
      case 'voice_command':
        await this.handleVoiceCommand(document, message.text);
        break;

      case 'inject_asset':
        await this.handleInjectAsset(document, message.assetId, message.assetType);
        break;
    }
  }

  /**
   * Update object transform in the source code.
   * Uses regex to find the object block and patch its properties.
   */
  private async handleTransformUpdate(
    document: vscode.TextDocument, 
    id: string, 
    position?: number[], 
    rotation?: number[], 
    scale?: number[]
  ) {
    const text = document.getText();
    
    // Find the object block: @object "Name" { ... }
    // Handles various syntaxes: orb "Name", object "Name", object "Name" using "Template"
    const objectRegex = new RegExp(`(?:orb|object)\\s+["']?${id}["']?(?:\\s+using\\s+["'][\\w_]+["'])?(?:\\s+@[\\w]+)*\\s*\\{`, 'g');
    const match = objectRegex.exec(text);

    if (!match) {
      console.warn(`[RelayService] Object "${id}" not found in document.`);
      return;
    }

    const startOffset = match.index;
    const blockStart = text.indexOf('{', startOffset);
    
    // Find the end of the block (balanced braces)
    let depth = 1;
    let endOffset = blockStart + 1;
    for (let i = blockStart + 1; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        
        if (depth === 0) {
            endOffset = i;
            break;
        }
    }

    const blockContent = text.slice(blockStart + 1, endOffset);
    const editor = await vscode.window.showTextDocument(document);

    await editor.edit(editBuilder => {
      // 1. Update Position
      if (position) {
        this.updateProperty(editBuilder, document, blockStart, blockContent, 'position', 
            `[${position.map(n => parseFloat(n.toFixed(3))).join(', ')}]`);
      }

      // 2. Update Rotation
      if (rotation) {
        // Convert radians to degrees for readability if desired, or keep as array
        // Standard HoloScript often uses [x, y, z] in radians or degrees depending on implementation
        // Assuming Director Client sends appropriate values.
        this.updateProperty(editBuilder, document, blockStart, blockContent, 'rotation', 
            `[${rotation.map(n => parseFloat(n.toFixed(3))).join(', ')}]`);
      }

      // 3. Update Scale
      if (scale) {
        this.updateProperty(editBuilder, document, blockStart, blockContent, 'scale', 
            `[${scale.map(n => parseFloat(n.toFixed(3))).join(', ')}]`);
      }
    });

    // Save automatically for "Live Sync" feel? 
    // Maybe too aggressive. Let's start with just editing.
  }

  /**
   * Helper to update or insert a property within a block.
   */
  private updateProperty(
    editBuilder: vscode.TextEditorEdit,
    document: vscode.TextDocument,
    blockStart: number,
    blockContent: string,
    propertyName: string,
    newValue: string
  ) {
    const propRegex = new RegExp(`${propertyName}\\s*:\\s*(?:\\[[^\\]]+\\]|\\{[^\\}]+\\}|["'][^"']+["']|[\\d.-]+)`);
    const propMatch = propRegex.exec(blockContent);

    if (propMatch) {
      // Property exists, replace it
      const propStartAbs = blockStart + 1 + propMatch.index;
      const propEndAbs = propStartAbs + propMatch[0].length;
      
      const range = new vscode.Range(
        document.positionAt(propStartAbs),
        document.positionAt(propEndAbs)
      );
      
      editBuilder.replace(range, `${propertyName}: ${newValue}`);
    } else {
      // Property missing, insert it at start of block
      const insertPos = document.positionAt(blockStart + 1);
      // Determine indentation
      const line = document.lineAt(insertPos.line);
      const indentation = line.text.substring(0, line.firstNonWhitespaceCharacterIndex) + '  '; // Simple +2 space assumption
      
      editBuilder.insert(insertPos, `\n${indentation}${propertyName}: ${newValue}`);
    }
  }

  /**
   * Handle mocked voice commands for creating assets.
   */
  private async handleVoiceCommand(document: vscode.TextDocument, commandText: string) {
    // Phase 4: Mock implementation
    // Ideally this calls Brittney via MCP
    vscode.window.showInformationMessage(`Director Voice: "${commandText}"`);
    
    // Quick demo handling
  }

  /*
   * Handle asset injection from Asset Browser.
   */
  private async handleInjectAsset(document: vscode.TextDocument, assetId: string, assetType: string) {
    const editor = await vscode.window.showTextDocument(document);
    const uniqueName = `${assetId}_${Date.now().toString().slice(-4)}`;
    
    let snippet = '';
    
    switch (assetId) {
      case 'cube':
        snippet = `\n@object "${uniqueName}" {\n  model: "cube"\n  color: "cyan"\n  position: [0, 1, 0]\n  @physics\n  @grabbable\n}\n`;
        break;
      case 'sphere':
        snippet = `\n@object "${uniqueName}" {\n  model: "sphere"\n  color: "magenta"\n  position: [2, 1, 0]\n  @physics\n  @grabbable\n}\n`;
        break;
      case 'light':
        snippet = `\n@object "${uniqueName}" {\n  type: "light"\n  color: "white"\n  position: [0, 4, 0]\n}\n`;
        break;
      case 'chair':
        snippet = `\n@object "${uniqueName}" {\n  model: "chair"\n  color: "wood"\n  scale: [1, 1, 1]\n  position: [0, 0, 0]\n  @grabbable\n}\n`;
        break;
      case 'tree':
        snippet = `\n@object "${uniqueName}" {\n  model: "tree"\n  color: "forest"\n  scale: [2, 4, 2]\n  position: [5, 0, 5]\n}\n`;
        break;
      case 'robot':
        snippet = `\n@object "${uniqueName}" {\n  model: "robot"\n  ai: { behavior: "greet" }\n  position: [-3, 0, 0]\n}\n`;
        break;
      default:
        snippet = `\n@object "${uniqueName}" {\n  model: "cube"\n  position: [0, 0, 0]\n}\n`;
    }

    await editor.edit(editBuilder => {
      const pos = document.positionAt(document.getText().length);
      editBuilder.insert(pos, snippet);
    });
    
    vscode.window.showInformationMessage(`Director Mode: Injected ${uniqueName}`);
  }

  public dispose() {
    this._disposables.forEach(d => d.dispose());
  }
}
