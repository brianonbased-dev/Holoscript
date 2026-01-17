/**
 * @holoscript/core Developer Experience
 *
 * REPL, better error formatting, interactive mode
 */
import * as readline from 'readline';
/**
 * Enhanced error formatter
 */
export class ErrorFormatter {
    /**
     * Format error with source context
     */
    static formatError(error, sourceCode) {
        const { message, location, suggestion, token } = error;
        let formatted = `\n❌ Error: ${message}\n`;
        if (location) {
            formatted += `   at line ${location.line}, column ${location.column}\n`;
            if (sourceCode) {
                const lines = sourceCode.split('\n');
                const errorLine = lines[location.line - 1];
                if (errorLine) {
                    formatted += `\n   ${location.line} | ${errorLine}\n`;
                    formatted += `     | ${' '.repeat(location.column - 1)}^\n`;
                }
            }
        }
        if (suggestion) {
            formatted += `\n💡 Suggestion: ${suggestion}\n`;
        }
        return formatted;
    }
    /**
     * Format multiple errors
     */
    static formatErrors(errors) {
        if (errors.length === 0)
            return '';
        let formatted = `\n❌ Found ${errors.length} error${errors.length !== 1 ? 's' : ''}:\n`;
        for (let i = 0; i < Math.min(errors.length, 5); i++) {
            formatted += this.formatError(errors[i]);
        }
        if (errors.length > 5) {
            formatted += `\n... and ${errors.length - 5} more error${errors.length - 5 !== 1 ? 's' : ''}\n`;
        }
        return formatted;
    }
    /**
     * Format success message
     */
    static formatSuccess(message, details) {
        let formatted = `\n✅ ${message}\n`;
        if (details) {
            if (typeof details === 'object') {
                formatted += JSON.stringify(details, null, 2) + '\n';
            }
            else {
                formatted += `${details}\n`;
            }
        }
        return formatted;
    }
    /**
     * Format help text
     */
    static formatHelp() {
        return `
HoloScript+ REPL v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  help          - Show this help message
  clear         - Clear the screen
  vars          - List all variables
  types         - List all types
  profile       - Show performance profile
  exit          - Exit REPL

Shortcuts:
  .create orb#name    - Create orb
  .position x y z     - Set position
  .property key val   - Set property

Examples:
  > orb#myOrb { position: [0, 0, 0] }
  > myOrb.position = [1, 1, 1]
  > match state { "idle" => { ... } }

For more info, visit: https://github.com/brianonbased-dev/holoscript
`.trim();
    }
}
/**
 * Interactive REPL
 */
export class HoloScriptREPL {
    constructor(parser, runtime) {
        this.variables = new Map();
        this.types = new Map();
        this.history = [];
        this.parser = parser;
        this.runtime = runtime;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            history: this.history,
            historySize: 100,
        });
    }
    /**
     * Start REPL
     */
    async start() {
        console.log('\n🥽 HoloScript+ REPL v1.0.0');
        console.log('Type "help" for commands, "exit" to quit\n');
        await this.repl();
    }
    /**
     * Main REPL loop
     */
    async repl() {
        const prompt = () => {
            this.rl.question('> ', async (input) => {
                try {
                    const trimmed = input.trim();
                    if (!trimmed) {
                        prompt();
                        return;
                    }
                    // Handle commands
                    if (trimmed.startsWith('.')) {
                        this.handleCommand(trimmed);
                        prompt();
                        return;
                    }
                    // Handle built-in commands
                    switch (trimmed.toLowerCase()) {
                        case 'help':
                            console.log(ErrorFormatter.formatHelp());
                            prompt();
                            return;
                        case 'clear':
                            console.clear();
                            prompt();
                            return;
                        case 'vars':
                            this.showVariables();
                            prompt();
                            return;
                        case 'types':
                            this.showTypes();
                            prompt();
                            return;
                        case 'profile':
                            this.showProfile();
                            prompt();
                            return;
                        case 'exit':
                            this.rl.close();
                            console.log('\n👋 Goodbye!\n');
                            return;
                    }
                    // Parse and execute
                    const result = await this.evaluate(trimmed);
                    if (result !== undefined && result !== null) {
                        this.displayResult(result);
                    }
                }
                catch (error) {
                    console.error(ErrorFormatter.formatError(error));
                }
                prompt();
            });
        };
        prompt();
    }
    /**
     * Handle dot commands
     */
    handleCommand(command) {
        const parts = command.slice(1).split(' ');
        const cmd = parts[0];
        switch (cmd) {
            case 'create':
                console.log(`Creating: ${parts.slice(1).join(' ')}`);
                break;
            case 'position':
                console.log(`Position: x=${parts[1]}, y=${parts[2]}, z=${parts[3]}`);
                break;
            case 'property':
                console.log(`Property: ${parts[1]} = ${parts[2]}`);
                break;
            default:
                console.log(`Unknown command: .${cmd}`);
        }
    }
    /**
     * Evaluate HoloScript code
     */
    async evaluate(code) {
        try {
            const parseResult = this.parser.parse(code);
            if (parseResult.errors && parseResult.errors.length > 0) {
                throw {
                    message: 'Parse error',
                    errors: parseResult.errors,
                };
            }
            const result = await this.runtime.execute(parseResult.ast);
            return result;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Show variables
     */
    showVariables() {
        if (this.variables.size === 0) {
            console.log('No variables defined');
            return;
        }
        console.log('\n📦 Variables:');
        for (const [name, value] of this.variables) {
            console.log(`  ${name}: ${this.formatValue(value)}`);
        }
        console.log();
    }
    /**
     * Show types
     */
    showTypes() {
        if (this.types.size === 0) {
            console.log('No custom types defined');
            return;
        }
        console.log('\n🏷️  Types:');
        for (const [name, type] of this.types) {
            console.log(`  ${name}: ${JSON.stringify(type)}`);
        }
        console.log();
    }
    /**
     * Show performance profile
     */
    showProfile() {
        console.log('\n⏱️  Performance Profile:');
        console.log('  (Profiling data would be displayed here)');
        console.log();
    }
    /**
     * Display result
     */
    displayResult(result) {
        const formatted = this.formatValue(result);
        console.log(`=> ${formatted}`);
    }
    /**
     * Format value for display
     */
    formatValue(value) {
        if (value === null)
            return 'null';
        if (value === undefined)
            return 'undefined';
        if (typeof value === 'string')
            return `"${value}"`;
        if (typeof value === 'number')
            return `${value}`;
        if (typeof value === 'boolean')
            return `${value}`;
        if (Array.isArray(value)) {
            return `[ ${value.map((v) => this.formatValue(v)).join(', ')} ]`;
        }
        if (typeof value === 'object') {
            const pairs = Object.entries(value)
                .map(([k, v]) => `${k}: ${this.formatValue(v)}`)
                .join(', ');
            return `{ ${pairs} }`;
        }
        return String(value);
    }
}
/**
 * Create and start REPL
 */
export async function startREPL(parser, runtime) {
    const repl = new HoloScriptREPL(parser, runtime);
    await repl.start();
}
/**
 * Hot reload watcher for development
 */
export class HotReloadWatcher {
    constructor() {
        this.watchers = new Map();
    }
    /**
     * Watch file for changes
     */
    watch(filePath, callback) {
        // Using basic fs.watch (production would use chokidar)
        const fs = require('fs');
        fs.watchFile(filePath, { interval: 1000 }, async () => {
            try {
                console.log(`\n🔄 Reloading: ${filePath}`);
                await callback();
                console.log('✅ Reload complete\n');
            }
            catch (error) {
                console.error(ErrorFormatter.formatError(error));
            }
        });
        this.watchers.set(filePath, true);
    }
    /**
     * Stop watching
     */
    unwatch(filePath) {
        const fs = require('fs');
        fs.unwatchFile(filePath);
        this.watchers.delete(filePath);
    }
    /**
     * Stop all watchers
     */
    clear() {
        const fs = require('fs');
        for (const filePath of this.watchers.keys()) {
            fs.unwatchFile(filePath);
        }
        this.watchers.clear();
    }
}
/**
 * Source map generator
 */
export class SourceMapGenerator {
    constructor() {
        this.mappings = [];
    }
    /**
     * Add mapping
     */
    addMapping(generatedLine, generatedColumn, sourceLine, sourceColumn, name) {
        this.mappings.push({
            generatedLine,
            generatedColumn,
            sourceLine,
            sourceColumn,
            name,
        });
    }
    /**
     * Generate source map
     */
    generate(sourceFile, generatedFile) {
        return {
            version: 3,
            file: generatedFile,
            sourceRoot: '',
            sources: [sourceFile],
            sourcesContent: [],
            mappings: this.encodeMappings(),
            names: [],
        };
    }
    /**
     * Encode mappings in VLQ format
     */
    encodeMappings() {
        // Simplified VLQ encoding
        return this.mappings.map((m) => `${m.generatedLine}:${m.generatedColumn}->${m.sourceLine}:${m.sourceColumn}`).join(';');
    }
}
