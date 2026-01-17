/**
 * CLI argument parsing
 */
export interface CLIOptions {
    command: 'parse' | 'run' | 'ast' | 'repl' | 'watch' | 'help' | 'version';
    input?: string;
    output?: string;
    verbose: boolean;
    json: boolean;
    maxDepth: number;
    timeout: number;
    showAST: boolean;
}
export declare function parseArgs(args: string[]): CLIOptions;
export declare function printHelp(): void;
