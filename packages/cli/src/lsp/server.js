/**
 * HoloScript Language Server Protocol (LSP) Implementation
 *
 * Provides IDE features:
 * - Autocompletion
 * - Hover information
 * - Diagnostics (errors/warnings)
 * - Go to definition
 * - Find references
 */
import { HoloScriptCodeParser, HoloScriptTypeChecker, } from '@holoscript/core';
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 1] = "Error";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 2] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 3] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 4] = "Hint";
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Text"] = 1] = "Text";
    CompletionItemKind[CompletionItemKind["Method"] = 2] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 3] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 4] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 5] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 6] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 7] = "Class";
    CompletionItemKind[CompletionItemKind["Interface"] = 8] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 9] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 10] = "Property";
    CompletionItemKind[CompletionItemKind["Unit"] = 11] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 12] = "Value";
    CompletionItemKind[CompletionItemKind["Enum"] = 13] = "Enum";
    CompletionItemKind[CompletionItemKind["Keyword"] = 14] = "Keyword";
    CompletionItemKind[CompletionItemKind["Snippet"] = 15] = "Snippet";
    CompletionItemKind[CompletionItemKind["Color"] = 16] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 17] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 18] = "Reference";
    CompletionItemKind[CompletionItemKind["Folder"] = 19] = "Folder";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 20] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Constant"] = 21] = "Constant";
    CompletionItemKind[CompletionItemKind["Struct"] = 22] = "Struct";
    CompletionItemKind[CompletionItemKind["Event"] = 23] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 24] = "Operator";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 25] = "TypeParameter";
})(CompletionItemKind || (CompletionItemKind = {}));
// HoloScript keywords and snippets
const KEYWORDS = [
    { label: 'orb', kind: CompletionItemKind.Keyword, detail: 'Create a spatial orb', insertText: 'orb ${1:name} {\n\t$0\n}' },
    { label: 'function', kind: CompletionItemKind.Keyword, detail: 'Define a function', insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}' },
    { label: 'connect', kind: CompletionItemKind.Keyword, detail: 'Connect two orbs', insertText: 'connect ${1:from} to ${2:to} as "${3:type}"' },
    { label: 'gate', kind: CompletionItemKind.Keyword, detail: 'Conditional gate', insertText: 'gate ${1:name} {\n\tcondition: ${2:condition}\n\tonTrue: ${3:handler}\n}' },
    { label: 'stream', kind: CompletionItemKind.Keyword, detail: 'Data stream', insertText: 'stream ${1:name} {\n\tsource: ${2:source}\n\tthrough: [$0]\n}' },
    { label: 'const', kind: CompletionItemKind.Keyword, detail: 'Constant declaration', insertText: 'const ${1:name} = ${0}' },
    { label: 'let', kind: CompletionItemKind.Keyword, detail: 'Variable declaration', insertText: 'let ${1:name} = ${0}' },
    { label: 'for', kind: CompletionItemKind.Keyword, detail: 'For loop', insertText: 'for (${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n\t$0\n}' },
    { label: 'while', kind: CompletionItemKind.Keyword, detail: 'While loop', insertText: 'while (${1:condition}) {\n\t$0\n}' },
    { label: 'forEach', kind: CompletionItemKind.Keyword, detail: 'ForEach loop', insertText: 'forEach ${1:item} in ${2:collection} {\n\t$0\n}' },
    { label: 'import', kind: CompletionItemKind.Keyword, detail: 'Import module', insertText: 'import { ${1:name} } from "${2:module}"' },
    { label: 'export', kind: CompletionItemKind.Keyword, detail: 'Export declaration', insertText: 'export ${0}' },
    { label: 'return', kind: CompletionItemKind.Keyword, detail: 'Return statement', insertText: 'return ${0}' },
    { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Conditional', insertText: 'if (${1:condition}) {\n\t$0\n}' },
];
const BUILTIN_FUNCTIONS = [
    { label: 'show', kind: CompletionItemKind.Function, detail: 'Show an orb', documentation: 'Make an orb visible' },
    { label: 'hide', kind: CompletionItemKind.Function, detail: 'Hide an orb', documentation: 'Make an orb invisible' },
    { label: 'pulse', kind: CompletionItemKind.Function, detail: 'Pulse animation', documentation: 'Apply pulse animation to orb' },
    { label: 'animate', kind: CompletionItemKind.Function, detail: 'Animate property', documentation: 'Animate an orb property' },
    { label: 'spawn', kind: CompletionItemKind.Function, detail: 'Spawn object', documentation: 'Spawn a new object at position' },
    { label: 'move', kind: CompletionItemKind.Function, detail: 'Move object', documentation: 'Move object to new position' },
    { label: 'add', kind: CompletionItemKind.Function, detail: 'Add numbers', documentation: 'Add two numbers' },
    { label: 'subtract', kind: CompletionItemKind.Function, detail: 'Subtract numbers', documentation: 'Subtract two numbers' },
    { label: 'multiply', kind: CompletionItemKind.Function, detail: 'Multiply numbers', documentation: 'Multiply two numbers' },
    { label: 'divide', kind: CompletionItemKind.Function, detail: 'Divide numbers', documentation: 'Divide two numbers' },
    { label: 'concat', kind: CompletionItemKind.Function, detail: 'Concatenate strings', documentation: 'Join strings together' },
    { label: 'length', kind: CompletionItemKind.Function, detail: 'Get length', documentation: 'Get length of string or array' },
    { label: 'push', kind: CompletionItemKind.Function, detail: 'Push to array', documentation: 'Add item to array' },
    { label: 'pop', kind: CompletionItemKind.Function, detail: 'Pop from array', documentation: 'Remove last item from array' },
    { label: 'log', kind: CompletionItemKind.Function, detail: 'Log message', documentation: 'Log a message to console' },
    { label: 'print', kind: CompletionItemKind.Function, detail: 'Print message', documentation: 'Print a message' },
];
const ORB_PROPERTIES = [
    { label: 'color', kind: CompletionItemKind.Property, detail: 'Orb color', insertText: 'color: "${1:#00ffff}"' },
    { label: 'glow', kind: CompletionItemKind.Property, detail: 'Glow effect', insertText: 'glow: ${1:true}' },
    { label: 'position', kind: CompletionItemKind.Property, detail: 'Position', insertText: 'position: { x: ${1:0}, y: ${2:0}, z: ${3:0} }' },
    { label: 'size', kind: CompletionItemKind.Property, detail: 'Size', insertText: 'size: ${1:1}' },
    { label: 'interactive', kind: CompletionItemKind.Property, detail: 'Interactive', insertText: 'interactive: ${1:true}' },
    { label: 'onClick', kind: CompletionItemKind.Property, detail: 'Click handler', insertText: 'onClick: ${1:handler}' },
    { label: 'onGaze', kind: CompletionItemKind.Property, detail: 'Gaze handler', insertText: 'onGaze: ${1:handler}' },
];
/**
 * HoloScript Language Server
 */
export class HoloScriptLanguageServer {
    constructor() {
        this.documentCache = new Map();
        this.parser = new HoloScriptCodeParser();
        this.typeChecker = new HoloScriptTypeChecker();
    }
    /**
     * Update document content
     */
    updateDocument(uri, content, version) {
        const parseResult = this.parser.parse(content);
        this.documentCache.set(uri, {
            content,
            ast: parseResult.ast,
            version,
        });
    }
    /**
     * Get diagnostics for a document
     */
    getDiagnostics(uri) {
        const doc = this.documentCache.get(uri);
        if (!doc)
            return [];
        const parseResult = this.parser.parse(doc.content);
        const diagnostics = [];
        // Parse errors
        for (const error of parseResult.errors) {
            diagnostics.push({
                range: {
                    start: { line: error.line, character: error.column },
                    end: { line: error.line, character: error.column + 1 },
                },
                severity: DiagnosticSeverity.Error,
                code: 'parse-error',
                source: 'holoscript',
                message: error.message,
            });
        }
        // Type errors
        this.typeChecker.reset();
        const typeResult = this.typeChecker.check(parseResult.ast);
        for (const diagnostic of typeResult.diagnostics) {
            diagnostics.push(this.convertTypeDiagnostic(diagnostic));
        }
        return diagnostics;
    }
    /**
     * Get completions at position
     */
    getCompletions(uri, position) {
        const doc = this.documentCache.get(uri);
        if (!doc)
            return [...KEYWORDS, ...BUILTIN_FUNCTIONS];
        const line = doc.content.split('\n')[position.line] || '';
        const beforeCursor = line.substring(0, position.character);
        // Inside orb block - suggest properties
        if (this.isInsideOrbBlock(doc.content, position)) {
            return [...ORB_PROPERTIES, ...BUILTIN_FUNCTIONS];
        }
        // After dot - suggest member properties
        if (beforeCursor.endsWith('.')) {
            const varName = this.getVariableBeforeDot(beforeCursor);
            const typeInfo = this.typeChecker.getType(varName);
            if (typeInfo?.properties) {
                return Array.from(typeInfo.properties.keys()).map(prop => ({
                    label: prop,
                    kind: CompletionItemKind.Property,
                }));
            }
            return ORB_PROPERTIES;
        }
        // Get declared variables
        const variables = this.getDeclaredVariables(doc.ast);
        return [
            ...KEYWORDS,
            ...BUILTIN_FUNCTIONS,
            ...variables,
        ];
    }
    /**
     * Get hover information
     */
    getHover(uri, position) {
        const doc = this.documentCache.get(uri);
        if (!doc)
            return null;
        const word = this.getWordAtPosition(doc.content, position);
        if (!word)
            return null;
        // Check built-in functions
        const builtinFunc = BUILTIN_FUNCTIONS.find(f => f.label === word);
        if (builtinFunc) {
            return {
                contents: `**${builtinFunc.label}**\n\n${builtinFunc.documentation || builtinFunc.detail || ''}`,
            };
        }
        // Check keywords
        const keyword = KEYWORDS.find(k => k.label === word);
        if (keyword) {
            return {
                contents: `**${keyword.label}** (keyword)\n\n${keyword.detail || ''}`,
            };
        }
        // Check declared types
        const typeInfo = this.typeChecker.getType(word);
        if (typeInfo) {
            return {
                contents: this.formatTypeInfo(word, typeInfo),
            };
        }
        return null;
    }
    /**
     * Go to definition
     */
    getDefinition(uri, position) {
        const doc = this.documentCache.get(uri);
        if (!doc)
            return null;
        const word = this.getWordAtPosition(doc.content, position);
        if (!word)
            return null;
        // Search AST for definition
        for (let i = 0; i < doc.ast.length; i++) {
            const node = doc.ast[i];
            const name = this.getNodeName(node);
            if (name === word) {
                // Calculate approximate position
                const lines = doc.content.split('\n');
                for (let line = 0; line < lines.length; line++) {
                    const idx = lines[line].indexOf(word);
                    if (idx !== -1 && this.isDefinitionLine(lines[line], word)) {
                        return {
                            uri,
                            range: {
                                start: { line, character: idx },
                                end: { line, character: idx + word.length },
                            },
                        };
                    }
                }
            }
        }
        return null;
    }
    /**
     * Find all references
     */
    findReferences(uri, position) {
        const doc = this.documentCache.get(uri);
        if (!doc)
            return [];
        const word = this.getWordAtPosition(doc.content, position);
        if (!word)
            return [];
        const locations = [];
        const lines = doc.content.split('\n');
        for (let line = 0; line < lines.length; line++) {
            const lineContent = lines[line];
            let startIndex = 0;
            while (true) {
                const idx = lineContent.indexOf(word, startIndex);
                if (idx === -1)
                    break;
                // Check word boundaries
                const before = idx > 0 ? lineContent[idx - 1] : ' ';
                const after = idx + word.length < lineContent.length ? lineContent[idx + word.length] : ' ';
                if (!/\w/.test(before) && !/\w/.test(after)) {
                    locations.push({
                        uri,
                        range: {
                            start: { line, character: idx },
                            end: { line, character: idx + word.length },
                        },
                    });
                }
                startIndex = idx + 1;
            }
        }
        return locations;
    }
    // Helper methods
    convertTypeDiagnostic(diagnostic) {
        return {
            range: {
                start: { line: diagnostic.line, character: diagnostic.column },
                end: { line: diagnostic.line, character: diagnostic.column + 1 },
            },
            severity: diagnostic.severity === 'error'
                ? DiagnosticSeverity.Error
                : diagnostic.severity === 'warning'
                    ? DiagnosticSeverity.Warning
                    : DiagnosticSeverity.Information,
            code: diagnostic.code,
            source: 'holoscript-types',
            message: diagnostic.message,
        };
    }
    isInsideOrbBlock(content, position) {
        const lines = content.split('\n');
        const upToCursor = lines.slice(0, position.line + 1).join('\n');
        // Count orb { and } to determine if inside
        const orbMatches = upToCursor.match(/\borb\s+\w+\s*\{/g) || [];
        const closeMatches = upToCursor.match(/\}/g) || [];
        return orbMatches.length > closeMatches.length;
    }
    getVariableBeforeDot(line) {
        const match = line.match(/(\w+)\.\s*$/);
        return match ? match[1] : '';
    }
    getDeclaredVariables(ast) {
        const items = [];
        for (const node of ast) {
            const name = this.getNodeName(node);
            if (name) {
                items.push({
                    label: name,
                    kind: this.getCompletionKind(node.type),
                    detail: node.type,
                });
            }
        }
        return items;
    }
    getNodeName(node) {
        const n = node;
        return n.name;
    }
    getCompletionKind(nodeType) {
        switch (nodeType) {
            case 'orb': return CompletionItemKind.Class;
            case 'method': return CompletionItemKind.Function;
            case 'variable-declaration': return CompletionItemKind.Variable;
            case 'stream': return CompletionItemKind.Module;
            default: return CompletionItemKind.Value;
        }
    }
    getWordAtPosition(content, position) {
        const lines = content.split('\n');
        const line = lines[position.line];
        if (!line)
            return null;
        // Find word boundaries
        let start = position.character;
        let end = position.character;
        while (start > 0 && /\w/.test(line[start - 1]))
            start--;
        while (end < line.length && /\w/.test(line[end]))
            end++;
        const word = line.substring(start, end);
        return word || null;
    }
    isDefinitionLine(line, word) {
        return (line.includes(`orb ${word}`) ||
            line.includes(`function ${word}`) ||
            line.includes(`const ${word}`) ||
            line.includes(`let ${word}`) ||
            line.includes(`stream ${word}`));
    }
    formatTypeInfo(name, info) {
        let result = `**${name}**: ${info.type}`;
        if (info.type === 'function' && info.parameters) {
            const params = info.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
            result = `**${name}**(${params}): ${info.returnType || 'void'}`;
        }
        if (info.properties) {
            result += '\n\nProperties:\n';
            info.properties.forEach((prop, key) => {
                result += `- ${key}: ${prop.type}\n`;
            });
        }
        return result;
    }
}
/**
 * Create a language server instance
 */
export function createLanguageServer() {
    return new HoloScriptLanguageServer();
}
