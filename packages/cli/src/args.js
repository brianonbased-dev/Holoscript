/**
 * CLI argument parsing
 */
const DEFAULT_OPTIONS = {
    command: 'help',
    verbose: false,
    json: false,
    maxDepth: 10,
    timeout: 5000,
    showAST: false,
};
export function parseArgs(args) {
    const options = { ...DEFAULT_OPTIONS };
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        // Commands
        if (!arg.startsWith('-')) {
            if (['parse', 'run', 'ast', 'repl', 'watch', 'help', 'version'].includes(arg)) {
                options.command = arg;
            }
            else if (!options.input) {
                options.input = arg;
            }
            i++;
            continue;
        }
        // Flags
        switch (arg) {
            case '-v':
            case '--verbose':
                options.verbose = true;
                break;
            case '-j':
            case '--json':
                options.json = true;
                break;
            case '-o':
            case '--output':
                options.output = args[++i];
                break;
            case '--max-depth':
                options.maxDepth = parseInt(args[++i], 10) || 10;
                break;
            case '--timeout':
                options.timeout = parseInt(args[++i], 10) || 5000;
                break;
            case '--show-ast':
                options.showAST = true;
                break;
            case '-h':
            case '--help':
                options.command = 'help';
                break;
            case '-V':
            case '--version':
                options.command = 'version';
                break;
        }
        i++;
    }
    return options;
}
export function printHelp() {
    console.log(`
HoloScript CLI v1.0.0-alpha.1

Usage: holoscript <command> [options] [input]

Commands:
  parse <file>    Parse a HoloScript file and validate syntax
  run <file>      Execute a HoloScript file
  ast <file>      Output the AST as JSON
  repl            Start interactive REPL mode
  watch <file>    Watch file and re-execute on changes
  help            Show this help message
  version         Show version information

Options:
  -v, --verbose     Enable verbose output
  -j, --json        Output results as JSON
  -o, --output      Write output to file
  --max-depth <n>   Max execution depth (default: 10)
  --timeout <ms>    Execution timeout in ms (default: 5000)
  --show-ast        Show AST during REPL execution

Examples:
  holoscript parse world.hs
  holoscript run world.hs --verbose
  holoscript ast world.hs -o ast.json
  holoscript repl
  holoscript watch world.hs

Aliases:
  hs              Short alias for holoscript
`);
}
