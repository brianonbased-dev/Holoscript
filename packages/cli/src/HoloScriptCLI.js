/**
 * HoloScript CLI main class
 */
import { HoloScriptParser, HoloScriptRuntime, enableConsoleLogging } from '@holoscript/core';
import { formatAST, formatResult, formatError } from './formatters';
import * as fs from 'fs';
import * as path from 'path';
export class HoloScriptCLI {
    constructor(options) {
        this.options = options;
        this.parser = new HoloScriptParser();
        this.runtime = new HoloScriptRuntime();
        if (options.verbose) {
            enableConsoleLogging();
        }
    }
    async run() {
        try {
            switch (this.options.command) {
                case 'parse':
                    return this.parseCommand();
                case 'run':
                    return this.runCommand();
                case 'ast':
                    return this.astCommand();
                default:
                    return 0;
            }
        }
        catch (error) {
            console.error(formatError(error));
            return 1;
        }
    }
    parseCommand() {
        const content = this.readInput();
        if (!content)
            return 1;
        const voiceCommand = {
            command: content,
            confidence: 1.0,
            timestamp: Date.now(),
        };
        const ast = this.parser.parseVoiceCommand(voiceCommand);
        if (ast.length === 0) {
            console.log('No valid AST nodes generated from input.');
            return 1;
        }
        console.log(`Parsed ${ast.length} node(s) successfully.`);
        if (this.options.verbose) {
            console.log('\n' + formatAST(ast, { json: this.options.json }));
        }
        return 0;
    }
    async runCommand() {
        const content = this.readInput();
        if (!content)
            return 1;
        const voiceCommand = {
            command: content,
            confidence: 1.0,
            timestamp: Date.now(),
        };
        const ast = this.parser.parseVoiceCommand(voiceCommand);
        if (ast.length === 0) {
            console.log('No valid AST nodes to execute.');
            return 1;
        }
        const results = await this.runtime.executeProgram(ast);
        const allSuccessful = results.every(r => r.success);
        const lastResult = results[results.length - 1];
        if (this.options.json) {
            const output = JSON.stringify({ results, success: allSuccessful }, null, 2);
            if (this.options.output) {
                this.writeOutput(output);
            }
            else {
                console.log(output);
            }
        }
        else {
            console.log(`Executed ${results.length} node(s)`);
            console.log(`Status: ${allSuccessful ? 'SUCCESS' : 'FAILED'}`);
            if (lastResult) {
                console.log('\n' + formatResult(lastResult, { json: false }));
            }
        }
        return allSuccessful ? 0 : 1;
    }
    astCommand() {
        const content = this.readInput();
        if (!content)
            return 1;
        const voiceCommand = {
            command: content,
            confidence: 1.0,
            timestamp: Date.now(),
        };
        const ast = this.parser.parseVoiceCommand(voiceCommand);
        const output = formatAST(ast, { json: true });
        if (this.options.output) {
            this.writeOutput(output);
            console.log(`AST written to ${this.options.output}`);
        }
        else {
            console.log(output);
        }
        return 0;
    }
    readInput() {
        if (!this.options.input) {
            console.error('Error: No input file specified.');
            return null;
        }
        const filePath = path.resolve(this.options.input);
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            return null;
        }
        return fs.readFileSync(filePath, 'utf-8');
    }
    writeOutput(content) {
        if (!this.options.output)
            return;
        const outputPath = path.resolve(this.options.output);
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, content, 'utf-8');
    }
}
