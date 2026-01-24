/**
 * HoloScript Linter
 *
 * Static analysis tool for HoloScript (.holo) and HoloScript+ (.hsplus) files.
 * Enforces best practices, catches errors, and improves code quality.
 *
 * @package @hololand/holoscript-linter
 * @version 2.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export type Severity = 'error' | 'warning' | 'info' | 'hint';

export type RuleCategory =
  | 'syntax'
  | 'naming'
  | 'best-practice'
  | 'performance'
  | 'style'
  | 'type-safety';

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
  range: { start: number; end: number };
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
  // Rule configurations
  rules: Record<string, RuleConfig>;

  // File patterns to ignore
  ignorePatterns: string[];

  // Maximum errors before stopping
  maxErrors: number;

  // Enable type checking (HSPlus only)
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

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_CONFIG: LinterConfig = {
  rules: {
    // Syntax rules
    'no-syntax-errors': 'error',
    'valid-trait-syntax': 'error',
    'no-empty-blocks': 'warn',
    'no-unreachable-code': 'error',

    // Naming rules
    'composition-naming': 'warn',
    'object-naming': 'warn',
    'template-naming': 'warn',
    'variable-naming': 'warn',
    'function-naming': 'warn',

    // Best practices
    'no-unused-templates': 'warn',
    'no-duplicate-ids': 'error',
    'prefer-templates': 'warn',
    'no-magic-numbers': 'warn',
    'no-console-in-production': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',

    // Performance
    'no-deep-nesting': 'warn',
    'limit-objects-per-group': 'warn',
    'no-expensive-operations-in-loop': 'warn',
    'prefer-event-delegation': 'info',

    // Style
    'consistent-spacing': 'info',
    'sorted-properties': 'info',
    'max-line-length': 'warn',
    'trailing-comma': 'info',
    'quotes': 'info',

    // Type safety
    'no-implicit-any': 'warn',
    'explicit-return-type': 'info',
    'no-unsafe-type-assertion': 'warn',
  },
  ignorePatterns: ['node_modules/**', 'dist/**', '*.min.holo'],
  maxErrors: 100,
  typeChecking: true,
};

// =============================================================================
// BUILT-IN RULES
// =============================================================================

const BUILT_IN_RULES: Rule[] = [
  // No duplicate IDs
  {
    id: 'no-duplicate-ids',
    name: 'No Duplicate IDs',
    description: 'Ensure all object IDs are unique within a composition',
    category: 'syntax',
    defaultSeverity: 'error',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const ids = new Map<string, number>();

      // Simple regex to find IDs (object#id or id: "value")
      const idRegex = /#([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = idRegex.exec(line)) !== null) {
          const id = match[1];
          if (ids.has(id)) {
            diagnostics.push({
              ruleId: 'no-duplicate-ids',
              message: `Duplicate ID "${id}" (first defined on line ${ids.get(id)! + 1})`,
              severity: 'error',
              line: i + 1,
              column: match.index + 1,
            });
          } else {
            ids.set(id, i);
          }
        }
      }

      return diagnostics;
    },
  },

  // Composition naming
  {
    id: 'composition-naming',
    name: 'Composition Naming',
    description: 'Compositions should use PascalCase names',
    category: 'naming',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const compositionRegex = /composition\s+["']([^"']+)["']/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = compositionRegex.exec(line)) !== null) {
          const name = match[1];
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(name.replace(/\s/g, ''))) {
            diagnostics.push({
              ruleId: 'composition-naming',
              message: `Composition name "${name}" should use PascalCase`,
              severity: 'warning',
              line: i + 1,
              column: match.index + 1,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // No deep nesting
  {
    id: 'no-deep-nesting',
    name: 'No Deep Nesting',
    description: 'Avoid deeply nested structures for better performance',
    category: 'performance',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const maxDepth = (context.config['maxDepth'] as number) || 5;
      let currentDepth = 0;
      let maxReached = 0;
      let maxLine = 0;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        currentDepth += opens - closes;

        if (currentDepth > maxReached) {
          maxReached = currentDepth;
          maxLine = i + 1;
        }
      }

      if (maxReached > maxDepth) {
        diagnostics.push({
          ruleId: 'no-deep-nesting',
          message: `Nesting depth ${maxReached} exceeds maximum of ${maxDepth}`,
          severity: 'warning',
          line: maxLine,
          column: 1,
        });
      }

      return diagnostics;
    },
  },

  // Valid trait syntax
  {
    id: 'valid-trait-syntax',
    name: 'Valid Trait Syntax',
    description: 'Ensure trait annotations use valid syntax',
    category: 'syntax',
    defaultSeverity: 'error',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const validTraits = [
        'grabbable',
        'throwable',
        'pointable',
        'hoverable',
        'scalable',
        'rotatable',
        'stackable',
        'snappable',
        'breakable',
        'talkable',
        'patrol',
        'merchant',
        'physics',
        'collision',
      ];

      const traitRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = traitRegex.exec(line)) !== null) {
          const trait = match[1].toLowerCase();
          // Skip control flow keywords
          if (['if', 'for', 'while', 'import', 'export'].includes(trait)) {
            continue;
          }
          if (!validTraits.includes(trait)) {
            diagnostics.push({
              ruleId: 'valid-trait-syntax',
              message: `Unknown trait "@${match[1]}"`,
              severity: 'warning',
              line: i + 1,
              column: match.index + 1,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // No unused templates
  {
    id: 'no-unused-templates',
    name: 'No Unused Templates',
    description: 'Templates should be used at least once',
    category: 'best-practice',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const templates = new Map<string, number>();
      const usages = new Set<string>();

      const templateDefRegex = /template\s+["']([^"']+)["']/g;
      const templateUseRegex = /using\s+["']([^"']+)["']/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];

        let match;
        while ((match = templateDefRegex.exec(line)) !== null) {
          templates.set(match[1], i + 1);
        }
        while ((match = templateUseRegex.exec(line)) !== null) {
          usages.add(match[1]);
        }
      }

      for (const [name, line] of templates) {
        if (!usages.has(name)) {
          diagnostics.push({
            ruleId: 'no-unused-templates',
            message: `Template "${name}" is defined but never used`,
            severity: 'warning',
            line,
            column: 1,
          });
        }
      }

      return diagnostics;
    },
  },

  // No empty blocks
  {
    id: 'no-empty-blocks',
    name: 'No Empty Blocks',
    description: 'Disallow empty code blocks',
    category: 'syntax',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const emptyBlockRegex = /\{\s*\}/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = emptyBlockRegex.exec(line)) !== null) {
          diagnostics.push({
            ruleId: 'no-empty-blocks',
            message: 'Empty block - add content or remove the block',
            severity: 'warning',
            line: i + 1,
            column: match.index + 1,
            fix: {
              range: { start: match.index, end: match.index + match[0].length },
              replacement: '{ /* TODO */ }',
            },
          });
        }
      }

      return diagnostics;
    },
  },

  // Variable naming (camelCase)
  {
    id: 'variable-naming',
    name: 'Variable Naming',
    description: 'Variables should use camelCase',
    category: 'naming',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const varRegex = /\b(const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = varRegex.exec(line)) !== null) {
          const name = match[2];
          // Check for camelCase (starts lowercase, no underscores except start)
          if (!/^[a-z_][a-zA-Z0-9]*$/.test(name) && !name.startsWith('_')) {
            diagnostics.push({
              ruleId: 'variable-naming',
              message: `Variable "${name}" should use camelCase`,
              severity: 'warning',
              line: i + 1,
              column: match.index + match[1].length + 2,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // Function naming (camelCase)
  {
    id: 'function-naming',
    name: 'Function Naming',
    description: 'Functions should use camelCase',
    category: 'naming',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const funcRegex = /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = funcRegex.exec(line)) !== null) {
          const name = match[1];
          if (!/^[a-z_][a-zA-Z0-9]*$/.test(name)) {
            diagnostics.push({
              ruleId: 'function-naming',
              message: `Function "${name}" should use camelCase`,
              severity: 'warning',
              line: i + 1,
              column: match.index + 10,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // No magic numbers
  {
    id: 'no-magic-numbers',
    name: 'No Magic Numbers',
    description: 'Avoid unexplained numeric literals',
    category: 'best-practice',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const allowedNumbers = new Set(['0', '1', '-1', '2', '100', '1000']);
      const numberRegex = /(?<![a-zA-Z_])(-?\d+\.?\d*)(?![a-zA-Z_])/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        // Skip comments and property definitions
        if (line.trim().startsWith('//') || line.includes(':')) continue;

        let match;
        while ((match = numberRegex.exec(line)) !== null) {
          const num = match[1];
          if (!allowedNumbers.has(num) && !line.includes('const') && !line.includes('position')) {
            diagnostics.push({
              ruleId: 'no-magic-numbers',
              message: `Magic number ${num} - consider extracting to a named constant`,
              severity: 'warning',
              line: i + 1,
              column: match.index + 1,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // Prefer const
  {
    id: 'prefer-const',
    name: 'Prefer Const',
    description: 'Use const for variables that are never reassigned',
    category: 'best-practice',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const letDeclarations = new Map<string, { line: number; column: number }>();
      const reassignments = new Set<string>();

      const letRegex = /\blet\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
      const assignRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[+\-*\/]?=/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = letRegex.exec(line)) !== null) {
          letDeclarations.set(match[1], { line: i + 1, column: match.index + 1 });
        }
        while ((match = assignRegex.exec(line)) !== null) {
          if (!line.includes('let ' + match[1]) && !line.includes('const ' + match[1])) {
            reassignments.add(match[1]);
          }
        }
      }

      for (const [name, loc] of letDeclarations) {
        if (!reassignments.has(name)) {
          diagnostics.push({
            ruleId: 'prefer-const',
            message: `"${name}" is never reassigned. Use const instead of let`,
            severity: 'warning',
            line: loc.line,
            column: loc.column,
            fix: {
              range: { start: loc.column - 1, end: loc.column + 2 },
              replacement: 'const',
            },
          });
        }
      }

      return diagnostics;
    },
  },

  // No var
  {
    id: 'no-var',
    name: 'No Var',
    description: 'Use let or const instead of var',
    category: 'best-practice',
    defaultSeverity: 'error',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const varRegex = /\bvar\s+/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = varRegex.exec(line)) !== null) {
          diagnostics.push({
            ruleId: 'no-var',
            message: 'Use "let" or "const" instead of "var"',
            severity: 'error',
            line: i + 1,
            column: match.index + 1,
            fix: {
              range: { start: match.index, end: match.index + 3 },
              replacement: 'let',
            },
          });
        }
      }

      return diagnostics;
    },
  },

  // Max line length
  {
    id: 'max-line-length',
    name: 'Max Line Length',
    description: 'Lines should not exceed maximum length',
    category: 'style',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const maxLength = (context.config['maxLength'] as number) || 120;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        if (line.length > maxLength) {
          diagnostics.push({
            ruleId: 'max-line-length',
            message: `Line exceeds ${maxLength} characters (${line.length})`,
            severity: 'warning',
            line: i + 1,
            column: maxLength + 1,
          });
        }
      }

      return diagnostics;
    },
  },

  // Consistent quotes
  {
    id: 'quotes',
    name: 'Consistent Quotes',
    description: 'Use consistent quote style',
    category: 'style',
    defaultSeverity: 'info',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const preferDouble = (context.config['style'] as string) !== 'single';
      const badQuote = preferDouble ? "'" : '"';
      const goodQuote = preferDouble ? '"' : "'";
      const quoteRegex = preferDouble ? /'/g : /"/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = quoteRegex.exec(line)) !== null) {
          diagnostics.push({
            ruleId: 'quotes',
            message: `Use ${goodQuote} instead of ${badQuote}`,
            severity: 'info',
            line: i + 1,
            column: match.index + 1,
            fix: {
              range: { start: match.index, end: match.index + 1 },
              replacement: goodQuote,
            },
          });
        }
      }

      return diagnostics;
    },
  },

  // No implicit any
  {
    id: 'no-implicit-any',
    name: 'No Implicit Any',
    description: 'Function parameters should have explicit types',
    category: 'type-safety',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      if (context.fileType !== 'hsplus') return diagnostics;

      const paramRegex = /function\s+\w+\(([^)]+)\)/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = paramRegex.exec(line)) !== null) {
          const params = match[1].split(',');
          for (const param of params) {
            const trimmed = param.trim();
            if (trimmed && !trimmed.includes(':')) {
              diagnostics.push({
                ruleId: 'no-implicit-any',
                message: `Parameter "${trimmed}" has no type annotation`,
                severity: 'warning',
                line: i + 1,
                column: match.index + 1,
              });
            }
          }
        }
      }

      return diagnostics;
    },
  },

  // Object naming (snake_case or camelCase)
  {
    id: 'object-naming',
    name: 'Object Naming',
    description: 'Object names should use consistent casing',
    category: 'naming',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const objectRegex = /object\s+["']([^"']+)["']/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = objectRegex.exec(line)) !== null) {
          const name = match[1];
          // Allow PascalCase, camelCase, snake_case, or kebab-case
          if (!/^[A-Za-z][a-zA-Z0-9_-]*$/.test(name)) {
            diagnostics.push({
              ruleId: 'object-naming',
              message: `Object name "${name}" should use valid naming convention`,
              severity: 'warning',
              line: i + 1,
              column: match.index + 1,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // Template naming (PascalCase)
  {
    id: 'template-naming',
    name: 'Template Naming',
    description: 'Templates should use PascalCase',
    category: 'naming',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const templateRegex = /template\s+["']([^"']+)["']/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        let match;
        while ((match = templateRegex.exec(line)) !== null) {
          const name = match[1];
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
            diagnostics.push({
              ruleId: 'template-naming',
              message: `Template "${name}" should use PascalCase`,
              severity: 'warning',
              line: i + 1,
              column: match.index + 1,
            });
          }
        }
      }

      return diagnostics;
    },
  },

  // Limit objects per group
  {
    id: 'limit-objects-per-group',
    name: 'Limit Objects Per Group',
    description: 'Avoid too many objects in a single group',
    category: 'performance',
    defaultSeverity: 'warning',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      const maxObjects = (context.config['maxObjects'] as number) || 50;
      let objectCount = 0;
      let groupStartLine = 0;
      let inGroup = false;

      const groupStartRegex = /spatial_group|group\s*{/;
      const objectRegex = /\bobject\s+["']/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];

        if (groupStartRegex.test(line)) {
          inGroup = true;
          groupStartLine = i + 1;
          objectCount = 0;
        }

        if (inGroup) {
          const matches = line.match(objectRegex);
          if (matches) {
            objectCount += matches.length;
          }

          if (line.includes('}')) {
            if (objectCount > maxObjects) {
              diagnostics.push({
                ruleId: 'limit-objects-per-group',
                message: `Group has ${objectCount} objects (max ${maxObjects}). Consider splitting into sub-groups`,
                severity: 'warning',
                line: groupStartLine,
                column: 1,
              });
            }
            inGroup = false;
          }
        }
      }

      return diagnostics;
    },
  },

  // Consistent spacing
  {
    id: 'consistent-spacing',
    name: 'Consistent Spacing',
    description: 'Ensure consistent spacing around operators',
    category: 'style',
    defaultSeverity: 'info',
    check(context: RuleContext): LintDiagnostic[] {
      const diagnostics: LintDiagnostic[] = [];
      // Check for missing spaces around operators
      const badSpacingRegex = /[a-zA-Z0-9][=+\-*\/][a-zA-Z0-9]/g;

      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        // Skip strings and comments
        if (line.trim().startsWith('//')) continue;

        let match;
        while ((match = badSpacingRegex.exec(line)) !== null) {
          diagnostics.push({
            ruleId: 'consistent-spacing',
            message: 'Add spaces around operator',
            severity: 'info',
            line: i + 1,
            column: match.index + 2,
          });
        }
      }

      return diagnostics;
    },
  },
];

// =============================================================================
// LINTER CLASS
// =============================================================================

export class HoloScriptLinter {
  private config: LinterConfig;
  private rules: Map<string, Rule>;

  constructor(config: Partial<LinterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rules = new Map();

    // Register built-in rules
    for (const rule of BUILT_IN_RULES) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Lint HoloScript or HoloScript+ code
   */
  lint(source: string, filePath = 'input.holo'): LintResult {
    const fileType = filePath.endsWith('.hsplus') ? 'hsplus' : 'holo';
    const lines = source.split('\n');
    const diagnostics: LintDiagnostic[] = [];

    for (const [ruleId, rule] of this.rules) {
      const ruleConfig = this.config.rules[ruleId];

      // Skip disabled rules
      if (ruleConfig === 'off') {
        continue;
      }

      const severity = this.getSeverity(ruleConfig, rule.defaultSeverity);
      const config = this.getRuleOptions(ruleConfig);

      const context: RuleContext = {
        source,
        lines,
        fileType,
        config,
      };

      try {
        const ruleDiagnostics = rule.check(context);
        for (const d of ruleDiagnostics) {
          diagnostics.push({
            ...d,
            severity,
          });
        }
      } catch (error) {
        diagnostics.push({
          ruleId: 'internal-error',
          message: `Rule "${ruleId}" threw an error: ${error}`,
          severity: 'error',
          line: 1,
          column: 1,
        });
      }

      // Stop if too many errors
      if (diagnostics.filter((d) => d.severity === 'error').length >= this.config.maxErrors) {
        break;
      }
    }

    // Sort by line number
    diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);

    return {
      filePath,
      diagnostics,
      errorCount: diagnostics.filter((d) => d.severity === 'error').length,
      warningCount: diagnostics.filter((d) => d.severity === 'warning').length,
      fixableCount: diagnostics.filter((d) => d.fix !== undefined).length,
    };
  }

  /**
   * Register a custom rule
   */
  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all registered rules
   */
  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getSeverity(config: RuleConfig | undefined, defaultSeverity: Severity): Severity {
    if (!config || config === 'off') {
      return defaultSeverity;
    }
    if (config === 'warn' || (Array.isArray(config) && config[0] === 'warn')) {
      return 'warning';
    }
    if (config === 'error' || (Array.isArray(config) && config[0] === 'error')) {
      return 'error';
    }
    return defaultSeverity;
  }

  private getRuleOptions(config: RuleConfig | undefined): Record<string, unknown> {
    if (Array.isArray(config) && config[1]) {
      return config[1];
    }
    return {};
  }

  getConfig(): LinterConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<LinterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Lint HoloScript code with default config
 */
export function lint(source: string, filePath = 'input.holo'): LintResult {
  const linter = new HoloScriptLinter();
  return linter.lint(source, filePath);
}

/**
 * Create a linter with custom config
 */
export function createLinter(config: Partial<LinterConfig> = {}): HoloScriptLinter {
  return new HoloScriptLinter(config);
}

// Default export
export default HoloScriptLinter;
