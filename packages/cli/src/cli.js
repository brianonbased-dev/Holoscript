#!/usr/bin/env node
/**
 * HoloScript CLI entry point
 */
import { HoloScriptCLI } from './HoloScriptCLI';
import { parseArgs, printHelp } from './args';
import { startREPL } from './repl';
const VERSION = '1.0.0-alpha.1';
async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    switch (options.command) {
        case 'help':
            printHelp();
            process.exit(0);
            break;
        case 'version':
            console.log(`HoloScript CLI v${VERSION}`);
            process.exit(0);
            break;
        case 'repl':
            await startREPL({
                verbose: options.verbose,
                showAST: options.showAST,
            });
            break;
        case 'watch':
            await watchFile(options);
            break;
        default:
            const cli = new HoloScriptCLI(options);
            const exitCode = await cli.run();
            process.exit(exitCode);
    }
}
async function watchFile(options) {
    if (!options.input) {
        console.error('Error: No input file specified for watch mode.');
        process.exit(1);
    }
    const fs = await import('fs');
    const path = await import('path');
    const { HoloScriptCodeParser, HoloScriptRuntime } = await import('@holoscript/core');
    const filePath = path.resolve(options.input);
    const parser = new HoloScriptCodeParser();
    let runtime = new HoloScriptRuntime();
    console.log(`\x1b[36mWatching ${options.input}...\x1b[0m`);
    console.log('\x1b[2mPress Ctrl+C to stop\x1b[0m\n');
    const executeFile = async () => {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parseResult = parser.parse(content);
            if (!parseResult.success) {
                console.log('\x1b[31mParse errors:\x1b[0m');
                parseResult.errors.forEach(err => {
                    console.log(`  Line ${err.line}:${err.column}: ${err.message}`);
                });
                return;
            }
            // Reset runtime for fresh execution
            runtime = new HoloScriptRuntime();
            const results = await runtime.executeProgram(parseResult.ast);
            const success = results.every(r => r.success);
            const timestamp = new Date().toLocaleTimeString();
            console.log(`\x1b[2m[${timestamp}]\x1b[0m ${success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} Executed ${results.length} node(s)`);
            if (!success) {
                results.filter(r => !r.success).forEach(r => {
                    console.log(`  \x1b[31m${r.error}\x1b[0m`);
                });
            }
        }
        catch (error) {
            console.log(`\x1b[31mError: ${error.message}\x1b[0m`);
        }
    };
    // Initial execution
    await executeFile();
    // Watch for changes
    fs.watch(filePath, { persistent: true }, async (eventType) => {
        if (eventType === 'change') {
            console.log('\x1b[2mFile changed, re-executing...\x1b[0m');
            await executeFile();
        }
    });
    // Keep process alive
    await new Promise(() => { });
}
main().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});
