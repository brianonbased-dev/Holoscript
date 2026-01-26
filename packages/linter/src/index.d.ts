/**
 * HoloScript Linter
 *
 * Static analysis tool for HoloScript (.holo) and HoloScript+ (.hsplus) files.
 * Enforces best practices, catches errors, and improves code quality.
 *
 * @package @hololand/holoscript-linter
 * @version 2.0.0
 */
export type Severity = 'error' | 'warning' | 'info' | 'hint';
export type RuleCategory = 'syntax' | 'naming' | 'best-practice' | 'performance' | 'style' | 'type-safety';
export interface LintDiagnostic {
    ruleId: string;
    message: string;
    severity: Severity;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    fix?: LintFix;
}
export interface LintFix {
    range: {
        start: number;
        end: number;
    };
    replacement: string;
}
export interface LintResult {
    filePath: string;
    diagnostics: LintDiagnostic[];
    errorCount: number;
    warningCount: number;
    fixableCount: number;
}
export interface LinterConfig {
    rules: Record<string, RuleConfig>;
    ignorePatterns: string[];
    maxErrors: number;
    typeChecking: boolean;
}
export type RuleConfig = 'off' | 'warn' | 'error' | 'info' | ['warn' | 'error' | 'info', Record<string, unknown>];
export interface Rule {
    id: string;
    name: string;
    description: string;
    category: RuleCategory;
    defaultSeverity: Severity;
    check(context: RuleContext): LintDiagnostic[];
}
export interface RuleContext {
    source: string;
    lines: string[];
    fileType: 'holo' | 'hsplus';
    config: Record<string, unknown>;
}
export declare const DEFAULT_CONFIG: LinterConfig;
export declare class HoloScriptLinter {
    private config;
    private rules;
    constructor(config?: Partial<LinterConfig>);
    /**
     * Lint HoloScript or HoloScript+ code
     */
    lint(source: string, filePath?: string): LintResult;
    /**
     * Register a custom rule
     */
    registerRule(rule: Rule): void;
    /**
     * Get all registered rules
     */
    getRules(): Rule[];
    private getSeverity;
    private getRuleOptions;
    getConfig(): LinterConfig;
    setConfig(config: Partial<LinterConfig>): void;
}
/**
 * Lint HoloScript code with default config
 */
export declare function lint(source: string, filePath?: string): LintResult;
/**
 * Create a linter with custom config
 */
export declare function createLinter(config?: Partial<LinterConfig>): HoloScriptLinter;
export default HoloScriptLinter;
//# sourceMappingURL=index.d.ts.map