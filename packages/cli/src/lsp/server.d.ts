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
export interface Position {
    line: number;
    character: number;
}
export interface Range {
    start: Position;
    end: Position;
}
export interface Location {
    uri: string;
    range: Range;
}
export interface Diagnostic {
    range: Range;
    severity: DiagnosticSeverity;
    code?: string;
    source: string;
    message: string;
}
export declare enum DiagnosticSeverity {
    Error = 1,
    Warning = 2,
    Information = 3,
    Hint = 4
}
export interface CompletionItem {
    label: string;
    kind: CompletionItemKind;
    detail?: string;
    documentation?: string;
    insertText?: string;
}
export declare enum CompletionItemKind {
    Text = 1,
    Method = 2,
    Function = 3,
    Constructor = 4,
    Field = 5,
    Variable = 6,
    Class = 7,
    Interface = 8,
    Module = 9,
    Property = 10,
    Unit = 11,
    Value = 12,
    Enum = 13,
    Keyword = 14,
    Snippet = 15,
    Color = 16,
    File = 17,
    Reference = 18,
    Folder = 19,
    EnumMember = 20,
    Constant = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25
}
export interface Hover {
    contents: string;
    range?: Range;
}
/**
 * HoloScript Language Server
 */
export declare class HoloScriptLanguageServer {
    private parser;
    private typeChecker;
    private documentCache;
    constructor();
    /**
     * Update document content
     */
    updateDocument(uri: string, content: string, version: number): void;
    /**
     * Get diagnostics for a document
     */
    getDiagnostics(uri: string): Diagnostic[];
    /**
     * Get completions at position
     */
    getCompletions(uri: string, position: Position): CompletionItem[];
    /**
     * Get hover information
     */
    getHover(uri: string, position: Position): Hover | null;
    /**
     * Go to definition
     */
    getDefinition(uri: string, position: Position): Location | null;
    /**
     * Find all references
     */
    findReferences(uri: string, position: Position): Location[];
    private convertTypeDiagnostic;
    private isInsideOrbBlock;
    private getVariableBeforeDot;
    private getDeclaredVariables;
    private getNodeName;
    private getCompletionKind;
    private getWordAtPosition;
    private isDefinitionLine;
    private formatTypeInfo;
}
/**
 * Create a language server instance
 */
export declare function createLanguageServer(): HoloScriptLanguageServer;
