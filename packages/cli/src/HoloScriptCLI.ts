/**
 * HoloScript CLI main class
 */

import { HoloScriptParser, HoloScriptRuntime, enableConsoleLogging } from '@holoscript/core';
import type { CLIOptions } from './args';
import { formatAST, formatResult, formatError } from './formatters';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ConfigLoader } from './config/loader';
import { HoloScriptConfig } from './config/schema';

export class HoloScriptCLI {
  private parser: HoloScriptParser;
  private runtime: HoloScriptRuntime;
  private options: CLIOptions;
  private config: HoloScriptConfig | null = null;

  constructor(options: CLIOptions) {
    this.options = options;
    this.parser = new HoloScriptParser();
    this.runtime = new HoloScriptRuntime();

    if (options.verbose) {
      enableConsoleLogging();
    }
  }

  async run(): Promise<number> {
    try {
      // Load configuration from file if it exists
      this.config = await ConfigLoader.findAndLoad();
      
      if (this.options.verbose && this.config) {
        console.log(`\x1b[2m[TRACE] Loaded configuration from holoscript.config.json\x1b[0m`);
        if (this.config.extends) {
          console.log(`\x1b[2m[TRACE] Configuration extends: ${JSON.stringify(this.config.extends)}\x1b[0m`);
        }
      }

      switch (this.options.command) {
        case 'parse':
          return this.parseCommand();
        case 'run':
          return this.runCommand();
        case 'ast':
          return this.astCommand();
        case 'repl':
          return this.replCommand();
        default:
          return 0;
      }
    } catch (error) {
      console.error(formatError(error as Error));
      return 1;
    }
  }

  private parseCommand(): number {
    const content = this.readInput();
    if (!content) return 1;

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

  private async runCommand(): Promise<number> {
    const content = this.readInput();
    if (!content) return 1;

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
      } else {
        console.log(output);
      }
    } else {
      console.log(`Executed ${results.length} node(s)`);
      console.log(`Status: ${allSuccessful ? 'SUCCESS' : 'FAILED'}`);
      if (lastResult) {
        console.log('\n' + formatResult(lastResult, { json: false }));
      }
    }

    return allSuccessful ? 0 : 1;
  }

  private astCommand(): number {
    const content = this.readInput();
    if (!content) return 1;

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
    } else {
      console.log(output);
    }

    return 0;
  }

  private readInput(): string | null {
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

  private writeOutput(content: string): void {
    if (!this.options.output) return;

    const outputPath = path.resolve(this.options.output);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  private async replCommand(): Promise<number> {
    console.log('HoloScript REPL v2.5.0');
    console.log('Type HoloScript commands to execute. Type "exit" or Ctrl+C to quit.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'holoscript> ',
    });

    rl.prompt();

    return new Promise((resolve) => {
      rl.on('line', async (line) => {
        const input = line.trim();

        if (input === 'exit' || input === 'quit') {
          console.log('Goodbye!');
          rl.close();
          resolve(0);
          return;
        }

        if (!input) {
          rl.prompt();
          return;
        }

        try {
          const voiceCommand = {
            command: input,
            confidence: 1.0,
            timestamp: Date.now(),
          };

          const ast = this.parser.parseVoiceCommand(voiceCommand);

          if (ast.length === 0) {
            console.log('No valid nodes parsed.');
          } else {
            if (this.options.showAST) {
              console.log(formatAST(ast, { json: this.options.json }));
            }

            const results = await this.runtime.executeProgram(ast);
            for (const result of results) {
              if (result.success) {
                console.log(`✓ ${result.output || 'OK'}`);
              } else {
                console.log(`✗ ${result.error || 'Error'}`);
              }
            }
          }
        } catch (error) {
          console.error(formatError(error as Error));
        }

        rl.prompt();
      });

      rl.on('close', () => {
        resolve(0);
      });
    });
  }
}
