#!/usr/bin/env node
/**
 * HoloScript CLI entry point
 */

import { HoloScriptCLI } from './HoloScriptCLI';
import { parseArgs, printHelp } from './args';
import { startREPL } from './repl';
import { add, remove, list } from './packageManager';
import { TRAITS, formatTrait, formatAllTraits, suggestTraits } from './traits';
import { generateObject, generateScene, listTemplates, getTemplate } from './generator';
import { packAsset, unpackAsset, inspectAsset } from './smartAssets';
import { WatchService } from './WatchService';
import { generateTargetCode } from './build/generators';

const VERSION = '1.0.0-alpha.1';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  switch (options.command) {
    case 'help':
      printHelp();
      process.exit(0);
      break;

    case 'validate':
    case 'parse': {
      if (!options.input) {
        console.error('\x1b[31mError: No input file specified.\x1b[0m');
        console.log(`Usage: holoscript ${options.command} <file>`);
        process.exit(1);
      }

      const fs = await import('fs');
      const path = await import('path');
      const { HoloScriptCodeParser } = await import('@holoscript/core');

      const filePath = path.resolve(options.input);
      if (!fs.existsSync(filePath)) {
        console.error(`\x1b[31mError: File not found: ${filePath}\x1b[0m`);
        process.exit(1);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parser = new HoloScriptCodeParser();
      
      console.log(`\n\x1b[36mValidating ${options.input}...\x1b[0m\n`);
      
      try {
        const isHolo = options.input.endsWith('.holo');
        let success = false;
        let errorList: any[] = [];

        if (options.verbose) console.log(`\x1b[2m[TRACE] Starting validation (isHolo: ${isHolo})...\x1b[0m`);

        let parseResult: any;

        if (isHolo) {
          if (options.verbose) console.log(`\x1b[2m[TRACE] Importing HoloCompositionParser...\x1b[0m`);
          const { HoloCompositionParser } = await import('@holoscript/core');
          if (options.verbose) console.log(`\x1b[2m[TRACE] Parser imported. Initializing...\x1b[0m`);
          const compositionParser = new HoloCompositionParser();
          if (options.verbose) console.log(`\x1b[2m[TRACE] Starting parse...\x1b[0m`);
          const result = compositionParser.parse(content);
          parseResult = result;
          if (options.verbose) console.log(`\x1b[2m[TRACE] Parse complete. Success: ${result.success}\x1b[0m`);
          success = result.success;
          errorList = result.errors.map((e: any) => ({ line: e.loc?.line, column: e.loc?.column, message: e.message }));
        } else {
          if (options.verbose) console.log(`\x1b[2m[TRACE] Importing HoloScriptCodeParser...\x1b[0m`);
          const { HoloScriptCodeParser } = await import('@holoscript/core');
          if (options.verbose) console.log(`\x1b[2m[TRACE] Parser imported. Initializing...\x1b[0m`);
          const parser = new HoloScriptCodeParser();
          if (options.verbose) console.log(`\x1b[2m[TRACE] Starting parse...\x1b[0m`);
          const result = parser.parse(content);
          parseResult = result;
          if (options.verbose) console.log(`\x1b[2m[TRACE] Parse complete. Success: ${result.success}\x1b[0m`);
          success = result.success;
          errorList = result.errors;
        }

        // Custom Validations (Shared with LSP)
        const lines = content.split('\n');
        
        // 1. Common Typos
        const typos: Record<string, string> = {
          'sper': 'sphere',
          'box': 'cube',
          'rotate.y': 'rotation.y',
          'rotate.x': 'rotation.x',
          'rotate.z': 'rotation.z',
        };

        lines.forEach((line, i) => {
          for (const [typo, fix] of Object.entries(typos)) {
            // Avoid false positives for skybox
            if (typo === 'box' && line.includes('skybox')) continue;
            
            if (line.includes(typo)) {
              errorList.push({
                line: i + 1,
                column: line.indexOf(typo),
                message: `[Warning] Common typo detected: Did you mean '${fix}'?`,
                severity: 'warning'
              });
            }
          }
        });

        // 2. Missing Trait Validations
        // Simple recursive finder
        const findNodes = (nodes: any[]): any[] => {
          if (!nodes) return [];
          let results: any[] = [];
          for (const node of nodes) {
            results.push(node);
            if (node.children) results.push(...findNodes(node.children));
          }
          return results;
        };

        const astRoot = isHolo ? parseResult.ast?.objects : parseResult.ast;
        const allNodes = Array.isArray(astRoot) ? findNodes(astRoot) : (astRoot ? findNodes([astRoot]) : []);
        
        for (const node of allNodes) {
          if (node.directives) {
            const hasGrabHook = node.directives.some((d: any) => d.hook === 'on_grab');
            const hasGrabbableTrait = node.directives.some((d: any) => d.type === 'trait' && d.name === 'grabbable');
            
            if (hasGrabHook && !hasGrabbableTrait) {
              errorList.push({
                line: node.line || (node.loc?.line) || 0,
                column: node.column || (node.loc?.column) || 0,
                message: `[Warning] Node has 'on_grab' hook but is missing '@grabbable' trait. Interaction will not work.`,
                severity: 'warning'
              });
            }
          }
        }
        
        if (success && errorList.filter(e => e.severity !== 'warning').length === 0) {
          if (errorList.length > 0) {
             console.log(`\x1b[33m✓ Validation passed with ${errorList.length} warnings:\x1b[0m`);
             errorList.forEach(err => {
               console.log(`  Line ${err.line}:${err.column}: ${err.message}`);
             });
          } else {
             console.log(`\x1b[32m✓ Validation successful!\x1b[0m\n`);
          }
          process.exit(0);
        } else {
          console.error(`\x1b[31mValidation failed with ${errorList.length} errors:\x1b[0m`);
          errorList.forEach(err => {
            console.error(`  Line ${err.line}:${err.column}: ${err.message}`);
          });
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`\x1b[31mUnexpected error during validation: ${err.message}\x1b[0m`);
        process.exit(1);
      }
      break;
    }

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

    case 'add': {
      const success = await add(options.packages, {
        dev: options.dev,
        verbose: options.verbose,
      });
      process.exit(success ? 0 : 1);
      break;
    }

    case 'remove': {
      const success = await remove(options.packages, {
        verbose: options.verbose,
      });
      process.exit(success ? 0 : 1);
      break;
    }

    case 'list':
      list({
        verbose: options.verbose,
        json: options.json,
      });
      process.exit(0);
      break;

    // =========================================
    // NEW: Traits & Generation Commands
    // =========================================

    case 'pack': {
      if (!options.input) {
        console.error('\x1b[31mError: No input directory specified.\x1b[0m');
        console.log('Usage: holoscript pack <directory> [output]');
        process.exit(1);
      }
      try {
        await packAsset(options.input, options.output, options.verbose);
      } catch (e: any) {
        console.error(`\x1b[31mError packing asset: ${e.message}\x1b[0m`);
        process.exit(1);
      }
      process.exit(0);
      break;
    }

    case 'unpack': {
      if (!options.input) {
        console.error('\x1b[31mError: No input file specified.\x1b[0m');
        console.log('Usage: holoscript unpack <file.hsa> [output_dir]');
        process.exit(1);
      }
      try {
        await unpackAsset(options.input, options.output, options.verbose);
      } catch (e: any) {
         console.error(`\x1b[31mError unpacking asset: ${e.message}\x1b[0m`);
         process.exit(1);
      }
       process.exit(0);
       break;
    }

    case 'inspect': {
       if (!options.input) {
        console.error('\x1b[31mError: No input file specified.\x1b[0m');
        console.log('Usage: holoscript inspect <file.hsa>');
        process.exit(1);
      }
      try {
        await inspectAsset(options.input, options.verbose);
      } catch (e: any) {
         console.error(`\x1b[31mError inspecting asset: ${e.message}\x1b[0m`);
         process.exit(1);
      }
       process.exit(0);
       break;
    }

    case 'diff': {
      // Get file arguments from original args array
      const diffArgs = args.filter(a => !a.startsWith('-') && a !== 'diff');
      if (diffArgs.length < 2) {
        console.error('\x1b[31mError: Two files required for diff.\x1b[0m');
        console.log('Usage: holoscript diff <file1> <file2> [--json]');
        process.exit(1);
      }

      const fs = await import('fs');
      const path = await import('path');
      const { SemanticDiffEngine, formatDiffResult, HoloCompositionParser, HoloScriptCodeParser } = await import('@holoscript/core');

      const file1 = path.resolve(diffArgs[0]);
      const file2 = path.resolve(diffArgs[1]);

      if (!fs.existsSync(file1)) {
        console.error(`\x1b[31mError: File not found: ${file1}\x1b[0m`);
        process.exit(1);
      }
      if (!fs.existsSync(file2)) {
        console.error(`\x1b[31mError: File not found: ${file2}\x1b[0m`);
        process.exit(1);
      }

      console.log(`\n\x1b[36mComparing ${diffArgs[0]} ↔ ${diffArgs[1]}...\x1b[0m\n`);

      try {
        const content1 = fs.readFileSync(file1, 'utf-8');
        const content2 = fs.readFileSync(file2, 'utf-8');

        // Parse both files
        const isHolo1 = file1.endsWith('.holo');
        const isHolo2 = file2.endsWith('.holo');

        let ast1: any, ast2: any;

        if (isHolo1) {
          const parser = new HoloCompositionParser();
          const result = parser.parse(content1);
          if (!result.success) {
            console.error(`\x1b[31mError parsing ${diffArgs[0]}:\x1b[0m`);
            result.errors.forEach((e: any) => console.error(`  ${e.loc?.line}:${e.loc?.column}: ${e.message}`));
            process.exit(1);
          }
          ast1 = result.ast;
        } else {
          const parser = new HoloScriptCodeParser();
          const result = parser.parse(content1);
          if (!result.success) {
            console.error(`\x1b[31mError parsing ${diffArgs[0]}:\x1b[0m`);
            result.errors.forEach((e: any) => console.error(`  ${e.line}:${e.column}: ${e.message}`));
            process.exit(1);
          }
          ast1 = { type: 'Program', children: result.ast };
        }

        if (isHolo2) {
          const parser = new HoloCompositionParser();
          const result = parser.parse(content2);
          if (!result.success) {
            console.error(`\x1b[31mError parsing ${diffArgs[1]}:\x1b[0m`);
            result.errors.forEach((e: any) => console.error(`  ${e.loc?.line}:${e.loc?.column}: ${e.message}`));
            process.exit(1);
          }
          ast2 = result.ast;
        } else {
          const parser = new HoloScriptCodeParser();
          const result = parser.parse(content2);
          if (!result.success) {
            console.error(`\x1b[31mError parsing ${diffArgs[1]}:\x1b[0m`);
            result.errors.forEach((e: any) => console.error(`  ${e.line}:${e.column}: ${e.message}`));
            process.exit(1);
          }
          ast2 = { type: 'Program', children: result.ast };
        }

        // Run semantic diff
        const engine = new SemanticDiffEngine({
          detectRenames: true,
          detectMoves: true,
          ignoreComments: true,
          ignoreFormatting: true,
        });
        const result = engine.diff(ast1, ast2, diffArgs[0], diffArgs[1]);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatDiffResult(result));

          // Summary
          const added = result.changes.filter((c: { type: string }) => c.type === 'added').length;
          const removed = result.changes.filter((c: { type: string }) => c.type === 'removed').length;
          const modified = result.changes.filter((c: { type: string }) => c.type === 'modified').length;
          const renamed = result.changes.filter((c: { type: string }) => c.type === 'renamed').length;
          const moved = result.changes.filter((c: { type: string }) => c.type === 'moved').length;

          console.log(`\n\x1b[1mSummary:\x1b[0m`);
          if (added > 0) console.log(`  \x1b[32m+ ${added} added\x1b[0m`);
          if (removed > 0) console.log(`  \x1b[31m- ${removed} removed\x1b[0m`);
          if (modified > 0) console.log(`  \x1b[33m~ ${modified} modified\x1b[0m`);
          if (renamed > 0) console.log(`  \x1b[36m→ ${renamed} renamed\x1b[0m`);
          if (moved > 0) console.log(`  \x1b[35m↔ ${moved} moved\x1b[0m`);

          if (result.changes.length === 0) {
            console.log(`  \x1b[32mNo semantic differences found.\x1b[0m`);
          }
        }

        process.exit(0);
      } catch (err: any) {
        console.error(`\x1b[31mDiff error: ${err.message}\x1b[0m`);
        process.exit(1);
      }
    }

    case 'wot-export': {
      if (!options.input) {
        console.error('\x1b[31mError: No input file specified.\x1b[0m');
        console.log('Usage: holoscript wot-export <file.holo> [-o output]');
        process.exit(1);
      }

      try {
        const fs = await import('fs');
        const path = await import('path');
        const { HoloCompositionParser } = await import('@holoscript/core');
        const {
          ThingDescriptionGenerator,
          serializeThingDescription,
          validateThingDescription,
        } = await import('@holoscript/core/wot');

        const filePath = path.resolve(options.input);
        if (!fs.existsSync(filePath)) {
          console.error(`\x1b[31mError: File not found: ${filePath}\x1b[0m`);
          process.exit(1);
        }

        console.log(`\n\x1b[36mGenerating W3C Thing Descriptions from ${options.input}...\x1b[0m\n`);

        const content = fs.readFileSync(filePath, 'utf-8');
        const parser = new HoloCompositionParser();
        const parseResult = parser.parse(content);

        if (!parseResult.success) {
          console.error('\x1b[31mParse errors:\x1b[0m');
          for (const error of parseResult.errors) {
            console.error(`  Line ${error.loc?.line || '?'}: ${error.message}`);
          }
          process.exit(1);
        }

        // Extract objects from AST
        const objects = parseResult.ast?.objects || [];
        if (objects.length === 0) {
          console.log('\x1b[33mNo objects found in composition.\x1b[0m');
          process.exit(0);
        }

        // Generate Thing Descriptions
        const generator = new ThingDescriptionGenerator({
          baseUrl: 'http://localhost:8080',
          defaultObservable: true,
        });

        const thingDescriptions = generator.generateAll(objects);

        if (thingDescriptions.length === 0) {
          console.log('\x1b[33mNo objects with @wot_thing trait found.\x1b[0m');
          console.log('Add @wot_thing(title: "My Thing", security: "nosec") to objects you want to export.');
          process.exit(0);
        }

        // Validate and output
        const results: { name: string; valid: boolean; errors: string[]; td: any }[] = [];

        for (const td of thingDescriptions) {
          const validation = validateThingDescription(td);
          results.push({
            name: td.title,
            valid: validation.valid,
            errors: validation.errors,
            td,
          });
        }

        if (options.json) {
          // JSON output
          if (thingDescriptions.length === 1) {
            console.log(serializeThingDescription(thingDescriptions[0], true));
          } else {
            console.log(JSON.stringify(thingDescriptions, null, 2));
          }
        } else if (options.output) {
          // Write to file(s)
          const outputPath = path.resolve(options.output);

          if (thingDescriptions.length === 1) {
            // Single TD - write directly to output path
            const finalPath = outputPath.endsWith('.json') ? outputPath : `${outputPath}.json`;
            fs.writeFileSync(finalPath, serializeThingDescription(thingDescriptions[0], true));
            console.log(`\x1b[32m✓ Generated: ${finalPath}\x1b[0m`);
          } else {
            // Multiple TDs - create directory and write each
            if (!fs.existsSync(outputPath)) {
              fs.mkdirSync(outputPath, { recursive: true });
            }

            for (const td of thingDescriptions) {
              const tdFileName = `${td.title.toLowerCase().replace(/\s+/g, '_')}.td.json`;
              const tdPath = path.join(outputPath, tdFileName);
              fs.writeFileSync(tdPath, serializeThingDescription(td, true));
              console.log(`\x1b[32m✓ Generated: ${tdPath}\x1b[0m`);
            }
          }
        } else {
          // Console output
          for (const result of results) {
            console.log(`\x1b[1m${result.name}\x1b[0m`);

            if (!result.valid) {
              console.log(`  \x1b[31m✗ Validation failed:\x1b[0m`);
              for (const error of result.errors) {
                console.log(`    - ${error}`);
              }
            } else {
              console.log(`  \x1b[32m✓ Valid Thing Description\x1b[0m`);
            }

            // Show summary
            const propCount = Object.keys(result.td.properties || {}).length;
            const actionCount = Object.keys(result.td.actions || {}).length;
            const eventCount = Object.keys(result.td.events || {}).length;

            console.log(`  Properties: ${propCount}, Actions: ${actionCount}, Events: ${eventCount}`);
            console.log('');
          }

          console.log(`\x1b[36mGenerated ${thingDescriptions.length} Thing Description(s)\x1b[0m`);
          console.log('\x1b[2mUse --json for full output or -o <path> to write files.\x1b[0m\n');
        }

        process.exit(0);
      } catch (err: any) {
        console.error(`\x1b[31mWoT export error: ${err.message}\x1b[0m`);
        if (options.verbose) {
          console.error(err.stack);
        }
        process.exit(1);
      }
    }

    case 'traits': {
      if (options.input) {
        // Explain specific trait
        const trait = TRAITS[options.input];
        if (trait) {
          console.log('\n' + formatTrait(trait, true) + '\n');
        } else {
          console.error(`\x1b[31mUnknown trait: ${options.input}\x1b[0m`);
          console.log('\nRun \x1b[36mholoscript traits\x1b[0m to see all available traits.');
          process.exit(1);
        }
      } else {
        // List all traits
        console.log(formatAllTraits(options.verbose, options.json));
      }
      process.exit(0);
      break;
    }

    case 'suggest': {
      const description = options.description || options.input;
      if (!description) {
        console.error('\x1b[31mError: No description provided.\x1b[0m');
        console.log('Usage: holoscript suggest "a glowing orb that can be grabbed"');
        process.exit(1);
      }

      const suggested = await suggestTraits(description);
      
      if (options.json) {
        console.log(JSON.stringify(suggested, null, 2));
      } else {
        console.log(`\n\x1b[1mSuggested traits for:\x1b[0m "${description}"\n`);
        if (suggested.length === 0) {
          console.log('\x1b[2mNo specific traits suggested. Try adding more descriptive keywords.\x1b[0m');
          console.log('Keywords: grab, throw, glow, click, physics, network, portal, etc.\n');
        } else {
          for (const trait of suggested) {
            console.log(formatTrait(trait, options.verbose));
          }
          console.log('');
        }
      }
      process.exit(0);
      break;
    }

    case 'generate': {
      const description = options.description || options.input;
      if (!description) {
        console.error('\x1b[31mError: No description provided.\x1b[0m');
        console.log('Usage: holoscript generate "a red button that glows when hovered"');
        process.exit(1);
      }

      const result = await generateObject(description, {
        brittneyUrl: options.brittneyUrl,
        verbose: options.verbose,
        timeout: options.timeout,
      });
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n\x1b[1mGenerated HoloScript\x1b[0m \x1b[2m(${result.source})\x1b[0m\n`);
        console.log('\x1b[36m' + result.code + '\x1b[0m\n');
        if (result.traits.length > 0) {
          console.log(`\x1b[33mTraits used:\x1b[0m ${result.traits.map(t => `@${t}`).join(', ')}\n`);
        }
        if (result.source === 'local') {
          console.log('\x1b[2mTip: Set BRITTNEY_SERVICE_URL for AI-enhanced generation.\x1b[0m\n');
        }
      }
      
      // Write to file if output specified
      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, result.code);
        console.log(`\x1b[32m✓ Written to ${options.output}\x1b[0m\n`);
      }
      
      process.exit(0);
      break;
    }

    case 'templates': {
      const templates = listTemplates();
      
      if (options.json) {
        const details: Record<string, any> = {};
        for (const t of templates) {
          details[t] = getTemplate(t);
        }
        console.log(JSON.stringify(details, null, 2));
      } else {
        console.log('\n\x1b[1mAvailable Object Templates\x1b[0m\n');
        for (const t of templates) {
          const info = getTemplate(t);
          if (info) {
            console.log(`  \x1b[36m${t}\x1b[0m`);
            console.log(`    Traits: ${info.traits.map(tr => `@${tr}`).join(', ')}`);
          }
        }
        console.log('\n\x1b[2mUse: holoscript generate "a <template> called myObject"\x1b[0m\n');
      }
      process.exit(0);
      break;
    }

    case 'compile': {
      if (!options.input) {
        console.error('\x1b[31mError: No input file specified.\x1b[0m');
        console.log('Usage: holoscript compile <file> --target <target>');
        process.exit(1);
      }

      const target = options.target || 'threejs';
      const validTargets = ['threejs', 'unity', 'vrchat', 'babylon', 'aframe', 'webxr'];
      
      if (!validTargets.includes(target)) {
        console.error(`\x1b[31mError: Unknown target "${target}".\x1b[0m`);
        console.log(`Valid targets: ${validTargets.join(', ')}`);
        process.exit(1);
      }

      const fs = await import('fs');
      const path = await import('path');
      const { HoloScriptCodeParser } = await import('@holoscript/core');

      const filePath = path.resolve(options.input);
      if (!fs.existsSync(filePath)) {
        console.error(`\x1b[31mError: File not found: ${filePath}\x1b[0m`);
        process.exit(1);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parser = new HoloScriptCodeParser();
      
      console.log(`\n\x1b[36mCompiling ${options.input} → ${target}\x1b[0m\n`);
      
      try {
        const isHolo = options.input.endsWith('.holo');
        let ast: any;

        if (isHolo) {
          if (options.verbose) console.log(`\x1b[2m[DEBUG] Using HoloCompositionParser for .holo file...\x1b[0m`);
          const { HoloCompositionParser } = await import('@holoscript/core');
          const compositionParser = new HoloCompositionParser();
          const result = compositionParser.parse(content);
          
          if (!result.success) {
            console.error(`\x1b[31mError parsing composition:\x1b[0m`);
            result.errors.forEach(e => console.error(`  ${e.loc?.line}:${e.loc?.column}: ${e.message}`));
            process.exit(1);
          }
          
          // Map HoloComposition AST to Generator AST
          ast = {
            orbs: result.ast?.objects?.map(obj => ({
              name: obj.name,
              properties: Object.fromEntries(obj.properties.map(p => [p.key, p.value])),
              traits: obj.traits || [],
              state: obj.state,
            })) || [],
            functions: [
              ...(result.ast?.logic?.actions?.map(a => ({ name: a.name })) || []),
              ...(result.ast?.logic?.handlers?.map(h => ({ name: h.event })) || [])
            ],
          };
        } else {
          if (options.verbose) console.log(`\x1b[2m[DEBUG] Using HoloScriptCodeParser...\x1b[0m`);
          const { HoloScriptCodeParser } = await import('@holoscript/core');
          const parser = new HoloScriptCodeParser();
          const result = parser.parse(content);
          
          if (!result.success) {
            console.error(`\x1b[31mError parsing script:\x1b[0m`);
            result.errors.forEach(e => console.error(`  ${e.line}:${e.column}: ${e.message}`));
            process.exit(1);
          }
          
          ast = {
             orbs: result.ast.filter((n: any) => n.type === 'orb'),
             functions: result.ast.filter((n: any) => n.type === 'method'),
          };
        }

        if (options.verbose) {
          console.log(`\x1b[2mParsed ${ast.orbs?.length || 0} orbs, ${ast.functions?.length || 0} functions\x1b[0m`);
        }

        console.log(`\x1b[2m[DEBUG] Starting code generation for target: ${target}...\x1b[0m`);
        // Generate output based on target
        const outputCode = generateTargetCode(ast, target, options.verbose);
        console.log(`\x1b[2m[DEBUG] Code generation complete. Length: ${outputCode.length}\x1b[0m`);
        
        if (options.output) {
          const outputPath = path.resolve(options.output);
          fs.writeFileSync(outputPath, outputCode);
          console.log(`\x1b[32m✓ Written to ${options.output}\x1b[0m\n`);
        } else {
          console.log(outputCode);
        }

        console.log(`\x1b[32m✓ Compilation successful!\x1b[0m\n`);
        process.exit(0);
      } catch (err: any) {
        console.error(`\x1b[31mCompilation error: ${err.message}\x1b[0m`);
        process.exit(1);
      }
    }

    case 'build': {
      if (!options.input) {
        console.error('\x1b[31mError: No input specified.\x1b[0m');
        console.log('Usage: holoscript build <file_or_dir> [options]');
        process.exit(1);
      }

      const fs = await import('fs');
      const path = await import('path');
      const inputPath = path.resolve(options.input);

      if (!fs.existsSync(inputPath)) {
        console.error(`\x1b[31mError: Input not found: ${inputPath}\x1b[0m`);
        process.exit(1);
      }

      const executeBuild = async () => {
        const stats = fs.statSync(inputPath);
        if (stats.isFile()) {
          console.log(`\x1b[36mBuilding file: ${options.input}\x1b[0m`);
          const content = fs.readFileSync(inputPath, 'utf-8');
          const target = options.target || 'threejs';
          
          try {
            const isHolo = options.input.endsWith('.holo');
            let ast: any;
            let composition: any = null;
            
            if (isHolo) {
              const { HoloCompositionParser } = await import('@holoscript/core');
              const result = new HoloCompositionParser().parse(content);
              if (!result.success) {
                console.error('\x1b[31mError parsing composition\x1b[0m');
                return;
              }
              composition = result.ast;
              ast = { 
                orbs: result.ast?.objects?.map((obj: any) => ({ 
                  name: obj.name, 
                  properties: Object.fromEntries(obj.properties.map((p: any) => [p.key, p.value])), 
                  traits: obj.traits || [] 
                })) || [] 
              };
            } else {
              const { HoloScriptCodeParser } = await import('@holoscript/core');
              const result = new HoloScriptCodeParser().parse(content);
              if (!result.success) {
                console.error('\x1b[31mError parsing script\x1b[0m');
                return;
              }
              ast = { orbs: result.ast.filter((n: any) => n.type === 'orb') };
            }
            
            // Handle Code Splitting
            if (options.split || (composition && composition.zones && composition.zones.length > 0)) {
              console.log('\x1b[33mCode splitting enabled/detected...\x1b[0m');
              const { SceneSplitter } = await import('./build/splitter');
              const { ManifestGenerator } = await import('./build/manifest');
              
              const splitter = new SceneSplitter();
              const chunks = splitter.split(composition);
              
              const outputDir = options.output ? path.dirname(path.resolve(options.output)) : path.resolve('./dist');
              if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
              
              const chunksDir = path.join(outputDir, 'chunks');
              if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });
              
              for (const chunk of chunks) {
                const chunkAst = { orbs: chunk.objects };
                const chunkCode = generateTargetCode(chunkAst, target, options.verbose);
                // For chunks, we'll wrap in JSON or a module format
                const chunkFile = path.join(chunksDir, `${chunk.id}.chunk.js`);
                fs.writeFileSync(chunkFile, JSON.stringify({ 
                  id: chunk.id, 
                  objects: chunk.objects,
                  code: chunkCode 
                }, null, 2));
                
                if (options.verbose) console.log(`  \x1b[2mChunk ${chunk.id} written (${chunk.objects.length} objects)\x1b[0m`);
              }
              
              const generator = new ManifestGenerator();
              const manifest = generator.generate(chunks, outputDir);
              fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
              console.log(`\x1b[32m✓ Built ${chunks.length} chunks and manifest.json\x1b[0m`);
            } else {
              const outputCode = generateTargetCode(ast, target, options.verbose);
              if (options.output) {
                fs.writeFileSync(path.resolve(options.output), outputCode);
                console.log(`\x1b[32m✓ Compiled to ${options.output}\x1b[0m`);
              } else {
                console.log(outputCode);
              }
            }
          } catch (e: any) {
            console.error(`\x1b[31mBuild error: ${e.message}\x1b[0m`);
          }
        } else if (stats.isDirectory()) {
           console.log(`\x1b[36mBuilding asset from directory: ${options.input}\x1b[0m`);
           try {
             await packAsset(options.input, options.output, options.verbose);
             console.log(`\x1b[32m✓ Packed asset to ${options.output || (options.input + '.hsa')}\x1b[0m`);
           } catch (e: any) {
             console.error(`\x1b[31mError packing asset: ${e.message}\x1b[0m`);
           }
        }
      };

      if (options.watch) {
        const watcher = new WatchService({
          input: options.input,
          onChanged: executeBuild,
          verbose: options.verbose
        });
        await watcher.start();
        // Watch mode keeps the process alive
        await new Promise(() => {});
      } else {
        await executeBuild();
        process.exit(0);
      }
      break;
    }

    default:
      const cli = new HoloScriptCLI(options);
      const exitCode = await cli.run();
      process.exit(exitCode);
  }
}

async function watchFile(options: ReturnType<typeof parseArgs>): Promise<void> {
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
    } catch (error) {
      console.log(`\x1b[31mError: ${(error as Error).message}\x1b[0m`);
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
  await new Promise(() => {});
}



main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
