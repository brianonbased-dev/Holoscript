/**
 * CLI argument parsing
 */

export interface CLIOptions {
  command: 'parse' | 'validate' | 'run' | 'ast' | 'repl' | 'watch' | 'compile' | 'build' | 'add' | 'remove' | 'list' | 'traits' | 'suggest' | 'generate' | 'templates' | 'pack' | 'unpack' | 'inspect' | 'help' | 'version';
  input?: string;
  output?: string;
  verbose: boolean;
  json: boolean;
  maxDepth: number;
  timeout: number;
  showAST: boolean;
  packages: string[];
  dev: boolean;
  description?: string;
  brittneyUrl?: string;
  target?: string;
  watch: boolean;
}

const DEFAULT_OPTIONS: CLIOptions = {
  command: 'help',
  verbose: false,
  json: false,
  maxDepth: 10,
  timeout: 5000,
  showAST: false,
  packages: [],
  dev: false,
  brittneyUrl: process.env.BRITTNEY_SERVICE_URL,
  watch: false,
};

export function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = { ...DEFAULT_OPTIONS };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    // Commands
    if (!arg.startsWith('-')) {
      if (['parse', 'validate', 'run', 'ast', 'repl', 'watch', 'compile', 'build', 'add', 'remove', 'list', 'traits', 'suggest', 'generate', 'templates', 'pack', 'unpack', 'inspect', 'help', 'version'].includes(arg)) {
        options.command = arg as CLIOptions['command'];
      } else if (['add', 'remove'].includes(options.command)) {
        // Collect package names for add/remove commands
        options.packages.push(arg);
      } else if (['suggest', 'generate'].includes(options.command) && !options.description) {
        // Collect description for suggest/generate commands
        options.description = arg;
      } else if (!options.input) {
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
      case '-D':
      case '--dev':
        options.dev = true;
        break;
      case '-h':
      case '--help':
        options.command = 'help';
        break;
      case '-V':
      case '--version':
        options.command = 'version';
        break;
      case '--brittney-url':
        options.brittneyUrl = args[++i];
        break;
      case '-t':
      case '--target':
        options.target = args[++i];
        break;
      case '-w':
      case '--watch':
        options.watch = true;
        break;
    }
    i++;
  }

  return options;
}

export function printHelp(): void {
  console.log(`
\x1b[36mHoloScript CLI v1.0.0-alpha.1\x1b[0m

Usage: holoscript <command> [options] [input]

\x1b[1mCommands:\x1b[0m
  parse <file>      Parse a HoloScript file and validate syntax
  run <file>        Execute a HoloScript file
  compile <file>    Compile to target platform (threejs, unity, vrchat)
  build <input>     Unified build/pack command (detects file vs dir)
                    Use -w or --watch for continuous build
  ast <file>        Output the AST as JSON
  repl              Start interactive REPL mode
  watch <file>      Watch file and re-execute on changes

  \x1b[33mTraits & Generation:\x1b[0m
  traits [name]     List all VR traits, or explain a specific trait
  suggest <desc>    Suggest appropriate traits for an object
  generate <desc>   Generate HoloScript from natural language
  templates         List available object templates

  \x1b[33mPackage Management:\x1b[0m
  add <pkg...>      Add HoloScript packages to current project
  remove <pkg...>   Remove HoloScript packages from current project
  list              List installed HoloScript packages

  help              Show this help message
  version           Show version information

\x1b[1mOptions:\x1b[0m
  -v, --verbose       Enable verbose output
  -j, --json          Output results as JSON
  -o, --output        Write output to file
  -t, --target        Compile target (threejs, unity, vrchat, babylon)
  --max-depth <n>     Max execution depth (default: 10)
  --timeout <ms>      Execution timeout in ms (default: 5000)
  --show-ast          Show AST during REPL execution
  -D, --dev           Install as dev dependency (for add command)
  --brittney-url      Brittney AI service URL (optional, enhances generation)
  -w, --watch         Enable watch mode for continuous execution/build

\x1b[1mExamples:\x1b[0m
  holoscript parse world.hs
  holoscript run world.hs --verbose
  holoscript compile world.holo --target threejs
  holoscript compile world.holo --target unity -o output/
  holoscript ast world.hs -o ast.json
  holoscript repl
  holoscript watch world.hs
  
  holoscript build world.holo --target threejs
  holoscript build components/glowing_orb/

  \x1b[2m# Traits & Generation\x1b[0m
  holoscript traits                    # List all 49 VR traits
  holoscript traits grabbable          # Explain @grabbable trait
  holoscript suggest "glowing orb"     # Suggest traits for object
  holoscript generate "red button"     # Generate HoloScript code
  holoscript templates                 # List object templates

  \x1b[2m# Package Management\x1b[0m
  holoscript add @holoscript/std @holoscript/network
  holoscript add @holoscript/test --dev
  holoscript remove @holoscript/network
  holoscript list

\x1b[1mAliases:\x1b[0m
  hs              Short alias for holoscript

\x1b[2mBrittney AI: Set BRITTNEY_SERVICE_URL for enhanced generation.\x1b[0m
`);
}
