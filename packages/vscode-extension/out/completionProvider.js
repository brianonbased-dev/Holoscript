"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoloScriptCompletionItemProvider = void 0;
const vscode = require("vscode");
class HoloScriptCompletionItemProvider {
    constructor() {
        this.traits = [
            { label: '@grabbable', detail: 'Make object grabbable by VR controllers', insertText: 'grabbable' },
            { label: '@physics', detail: 'Enable physics simulation', insertText: 'physics' },
            { label: '@collidable', detail: 'Enable collision detection', insertText: 'collidable' },
            { label: '@glowing', detail: 'Add glow effect', insertText: 'glowing' },
            { label: '@sound', detail: 'Attach 3D spatial sound', insertText: 'sound("${1:sound_id}")' },
            { label: '@lookat', detail: 'Make object look at target', insertText: 'lookat("${1:target_id}")' },
            { label: '@spin', detail: 'Spin object continuously', insertText: 'spin(${1:speed})' },
            { label: '@bounce', detail: 'Bounce animation', insertText: 'bounce(${1:height})' },
            { label: '@float', detail: 'Floating animation', insertText: 'float(${1:height})' },
            { label: '@scale', detail: 'Scale animation', insertText: 'scale(${1:factor})' },
            { label: '@fade', detail: 'Fade on trigger', insertText: 'fade(${1:opacity})' },
            { label: '@light', detail: 'Emit light', insertText: 'light(${1:intensity})' },
            { label: '@particles', detail: 'Emit particles', insertText: 'particles("${1:effect_id}")' },
            { label: '@video', detail: 'Play video texture', insertText: 'video("${1:url}")' },
            { label: '@web', detail: 'Display web content', insertText: 'web("${1:url}")' },
            { label: '@text', detail: 'Display 3D text', insertText: 'text("${1:content}")' },
            { label: '@onclick', detail: 'Trigger event on click', insertText: 'onclick(${1:event})' },
            { label: '@onhover', detail: 'Trigger event on hover', insertText: 'onhover(${1:event})' },
            { label: '@draggable', detail: 'Allow dragging object', insertText: 'draggable' },
            { label: '@rotatable', detail: 'Allow rotating object', insertText: 'rotatable' },
            { label: '@scalable', detail: 'Allow scaling object', insertText: 'scalable' }
        ];
    }
    provideCompletionItems(document, position, token, context) {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        // Only trigger if we typed '@' or valid prefix
        if (!linePrefix.endsWith('@')) {
            // If we are continuing a word starting with @, VSCode handles it usually, 
            // but strictly speaking we triggered on '@'.
            // If manually triggered without @, we might filter, but simplest is to check triggering char.
        }
        // Heuristic check: are we inside an object or composition block?
        // This is simple regex-based; for robust check we'd use AST, but this is fast.
        // We look for "object" or "composition" followed by "{" before current position backwards.
        // Efficient approach: check current line indentation or previous lines? 
        // Simply returning these items globally with @ trigger is usually acceptable for loose DSLs 
        // as traits are only valid in object definitions anyway.
        // Create completion items
        const completionItems = this.traits.map(trait => {
            const item = new vscode.CompletionItem(trait.label, vscode.CompletionItemKind.Keyword);
            item.detail = trait.detail;
            if (trait.insertText.includes('${')) {
                item.insertText = new vscode.SnippetString(trait.insertText);
            }
            else {
                item.insertText = trait.insertText;
            }
            item.documentation = new vscode.MarkdownString(`Applies the **${trait.label}** trait to this object.`);
            return item;
        });
        return completionItems;
    }
}
exports.HoloScriptCompletionItemProvider = HoloScriptCompletionItemProvider;
//# sourceMappingURL=completionProvider.js.map