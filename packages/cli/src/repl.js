/**
 * HoloScript REPL (Read-Eval-Print Loop)
 *
 * Interactive mode for HoloScript development
 */
import * as readline from 'readline';
import { HoloScriptCodeParser, HoloScriptRuntime, enableConsoleLogging } from '@holoscript/core';
const VERSION = '1.0.0-alpha.1';
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};
export class HoloScriptREPL {
    constructor(options = {}) {
        this.history = [];
        this.multilineBuffer = '';
        this.isMultiline = false;
        this.options = {
            verbose: options.verbose ?? false,
            showAST: options.showAST ?? false,
            historySize: options.historySize ?? 100,
        };
        this.parser = new HoloScriptCodeParser();
        this.runtime = new HoloScriptRuntime();
        if (this.options.verbose) {
            enableConsoleLogging();
        }
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.getPrompt(),
            historySize: this.options.historySize,
        });
    }
    getPrompt() {
        if (this.isMultiline) {
            return `${COLORS.dim}...${COLORS.reset} `;
        }
        return `${COLORS.cyan}hs>${COLORS.reset} `;
    }
    updatePrompt() {
        this.rl.setPrompt(this.getPrompt());
    }
    async start() {
        this.printWelcome();
        this.rl.on('line', async (line) => {
            await this.handleLine(line);
            this.updatePrompt();
            this.rl.prompt();
        });
        this.rl.on('close', () => {
            console.log(`\n${COLORS.dim}Goodbye!${COLORS.reset}`);
            process.exit(0);
        });
        this.rl.prompt();
    }
    printWelcome() {
        console.log(`
${COLORS.cyan}╔══════════════════════════════════════════════════════════╗
║           ${COLORS.bright}HoloScript REPL v${VERSION}${COLORS.reset}${COLORS.cyan}                   ║
║                                                            ║
║  Commands:                                                 ║
║    ${COLORS.yellow}.help${COLORS.cyan}     Show available commands                     ║
║    ${COLORS.yellow}.clear${COLORS.cyan}    Clear the screen                            ║
║    ${COLORS.yellow}.vars${COLORS.cyan}     Show all variables                          ║
║    ${COLORS.yellow}.funcs${COLORS.cyan}    Show all functions                          ║
║    ${COLORS.yellow}.reset${COLORS.cyan}    Reset runtime state                         ║
║    ${COLORS.yellow}.ast${COLORS.cyan}      Toggle AST display                          ║
║    ${COLORS.yellow}.exit${COLORS.cyan}     Exit the REPL                               ║
╚══════════════════════════════════════════════════════════╝${COLORS.reset}
`);
    }
    async handleLine(line) {
        const trimmed = line.trim();
        // Handle empty input
        if (!trimmed && !this.isMultiline) {
            return;
        }
        // Handle special commands
        if (trimmed.startsWith('.') && !this.isMultiline) {
            await this.handleCommand(trimmed);
            return;
        }
        // Handle multiline input
        if (trimmed.endsWith('{') || trimmed.endsWith('(')) {
            this.isMultiline = true;
            this.multilineBuffer += line + '\n';
            return;
        }
        if (this.isMultiline) {
            this.multilineBuffer += line + '\n';
            // Check if block is closed
            const openBraces = (this.multilineBuffer.match(/{/g) || []).length;
            const closeBraces = (this.multilineBuffer.match(/}/g) || []).length;
            const openParens = (this.multilineBuffer.match(/\(/g) || []).length;
            const closeParens = (this.multilineBuffer.match(/\)/g) || []).length;
            if (openBraces <= closeBraces && openParens <= closeParens) {
                this.isMultiline = false;
                await this.evaluate(this.multilineBuffer);
                this.multilineBuffer = '';
            }
            return;
        }
        // Regular single-line input
        await this.evaluate(line);
    }
    async handleCommand(cmd) {
        const parts = cmd.split(/\s+/);
        const command = parts[0].toLowerCase();
        switch (command) {
            case '.help':
                this.printHelp();
                break;
            case '.clear':
                console.clear();
                this.printWelcome();
                break;
            case '.vars':
                this.showVariables();
                break;
            case '.funcs':
                this.showFunctions();
                break;
            case '.reset':
                this.runtime.reset();
                console.log(`${COLORS.green}Runtime state cleared.${COLORS.reset}`);
                break;
            case '.ast':
                this.options.showAST = !this.options.showAST;
                console.log(`${COLORS.yellow}AST display: ${this.options.showAST ? 'ON' : 'OFF'}${COLORS.reset}`);
                break;
            case '.exit':
            case '.quit':
                this.rl.close();
                break;
            case '.load':
                if (parts[1]) {
                    await this.loadFile(parts[1]);
                }
                else {
                    console.log(`${COLORS.red}Usage: .load <filename>${COLORS.reset}`);
                }
                break;
            case '.history':
                this.showHistory();
                break;
            default:
                console.log(`${COLORS.red}Unknown command: ${command}${COLORS.reset}`);
                console.log(`${COLORS.dim}Type .help for available commands${COLORS.reset}`);
        }
    }
    printHelp() {
        console.log(`
${COLORS.bright}Available Commands:${COLORS.reset}

  ${COLORS.yellow}.help${COLORS.reset}            Show this help message
  ${COLORS.yellow}.clear${COLORS.reset}           Clear the screen
  ${COLORS.yellow}.vars${COLORS.reset}            Show all defined variables
  ${COLORS.yellow}.funcs${COLORS.reset}           Show all defined functions
  ${COLORS.yellow}.reset${COLORS.reset}           Reset runtime state (clear all)
  ${COLORS.yellow}.ast${COLORS.reset}             Toggle AST display for inputs
  ${COLORS.yellow}.load <file>${COLORS.reset}     Load and execute a HoloScript file
  ${COLORS.yellow}.history${COLORS.reset}         Show command history
  ${COLORS.yellow}.exit${COLORS.reset}            Exit the REPL

${COLORS.bright}HoloScript Syntax Examples:${COLORS.reset}

  ${COLORS.cyan}orb myOrb { color: "#ff0000", glow: true }${COLORS.reset}
  ${COLORS.cyan}function greet(name: string) { return "Hello " + name }${COLORS.reset}
  ${COLORS.cyan}connect source to target as "data"${COLORS.reset}
  ${COLORS.cyan}const x = 42${COLORS.reset}
  ${COLORS.cyan}for (i = 0; i < 10; i++) { print(i) }${COLORS.reset}
`);
    }
    showVariables() {
        const context = this.runtime.getContext();
        const vars = context.variables;
        if (vars.size === 0) {
            console.log(`${COLORS.dim}No variables defined.${COLORS.reset}`);
            return;
        }
        console.log(`\n${COLORS.bright}Variables:${COLORS.reset}`);
        vars.forEach((value, name) => {
            const type = typeof value;
            const display = JSON.stringify(value);
            console.log(`  ${COLORS.cyan}${name}${COLORS.reset}: ${COLORS.dim}${type}${COLORS.reset} = ${display}`);
        });
        console.log();
    }
    showFunctions() {
        const context = this.runtime.getContext();
        const funcs = context.functions;
        if (funcs.size === 0) {
            console.log(`${COLORS.dim}No user-defined functions.${COLORS.reset}`);
            return;
        }
        console.log(`\n${COLORS.bright}Functions:${COLORS.reset}`);
        funcs.forEach((func, name) => {
            const params = func.parameters.map(p => `${p.name}: ${p.dataType}`).join(', ');
            const returnType = func.returnType || 'void';
            console.log(`  ${COLORS.magenta}${name}${COLORS.reset}(${params}): ${COLORS.dim}${returnType}${COLORS.reset}`);
        });
        console.log();
    }
    showHistory() {
        if (this.history.length === 0) {
            console.log(`${COLORS.dim}No history yet.${COLORS.reset}`);
            return;
        }
        console.log(`\n${COLORS.bright}History:${COLORS.reset}`);
        this.history.slice(-20).forEach((line, i) => {
            console.log(`  ${COLORS.dim}${i + 1}${COLORS.reset} ${line}`);
        });
        console.log();
    }
    async loadFile(filename) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.resolve(process.cwd(), filename);
            const content = fs.readFileSync(filePath, 'utf-8');
            console.log(`${COLORS.dim}Loading ${filename}...${COLORS.reset}`);
            await this.evaluate(content);
            console.log(`${COLORS.green}Loaded successfully.${COLORS.reset}`);
        }
        catch (error) {
            console.log(`${COLORS.red}Error loading file: ${error.message}${COLORS.reset}`);
        }
    }
    async evaluate(code) {
        try {
            // Add to history
            this.history.push(code.trim());
            if (this.history.length > this.options.historySize) {
                this.history.shift();
            }
            // Parse
            const parseResult = this.parser.parse(code);
            if (!parseResult.success) {
                parseResult.errors.forEach(err => {
                    console.log(`${COLORS.red}Parse error at line ${err.line}:${err.column}: ${err.message}${COLORS.reset}`);
                });
                return;
            }
            if (parseResult.ast.length === 0) {
                return;
            }
            // Show AST if enabled
            if (this.options.showAST) {
                console.log(`${COLORS.dim}AST:${COLORS.reset}`);
                console.log(JSON.stringify(parseResult.ast, null, 2));
            }
            // Execute
            const results = await this.runtime.executeProgram(parseResult.ast);
            // Display results
            for (const result of results) {
                this.displayResult(result);
            }
        }
        catch (error) {
            console.log(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
        }
    }
    displayResult(result) {
        if (!result.success) {
            console.log(`${COLORS.red}Error: ${result.error}${COLORS.reset}`);
            return;
        }
        if (result.output !== undefined) {
            const output = typeof result.output === 'object'
                ? JSON.stringify(result.output, null, 2)
                : String(result.output);
            console.log(`${COLORS.green}=> ${output}${COLORS.reset}`);
        }
        if (result.spatialPosition) {
            const pos = result.spatialPosition;
            console.log(`${COLORS.dim}   @ (${pos.x}, ${pos.y}, ${pos.z})${COLORS.reset}`);
        }
    }
}
// Main entry point for REPL
export async function startREPL(options = {}) {
    const repl = new HoloScriptREPL(options);
    await repl.start();
}
