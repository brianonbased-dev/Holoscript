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
            if (isHolo) {
              const { HoloCompositionParser } = await import('@holoscript/core');
              const result = new HoloCompositionParser().parse(content);
              if (!result.success) {
                console.error('\x1b[31mError parsing composition\x1b[0m');
                return;
              }
              ast = { orbs: result.ast?.objects?.map((obj: any) => ({ name: obj.name, properties: Object.fromEntries(obj.properties.map((p: any) => [p.key, p.value])), traits: obj.traits || [] })) || [] };
            } else {
              const { HoloScriptCodeParser } = await import('@holoscript/core');
              const result = new HoloScriptCodeParser().parse(content);
              if (!result.success) {
                console.error('\x1b[31mError parsing script\x1b[0m');
                return;
              }
              ast = { orbs: result.ast.filter((n: any) => n.type === 'orb') };
            }
            
            const outputCode = generateTargetCode(ast, target, options.verbose);
            if (options.output) {
              fs.writeFileSync(path.resolve(options.output), outputCode);
              console.log(`\x1b[32m✓ Compiled to ${options.output}\x1b[0m`);
            } else {
              console.log(outputCode);
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

/**
 * Generate target-specific code from AST
 */
function generateTargetCode(ast: any, target: string, verbose: boolean): string {
  const orbs = ast.orbs || [];
  const functions = ast.functions || [];
  
  switch (target) {
    case 'threejs':
      return generateThreeJS(orbs, functions, verbose);
    case 'unity':
      return generateUnity(orbs, functions, verbose);
    case 'vrchat':
      return generateVRChat(orbs, functions, verbose);
    case 'babylon':
      return generateBabylon(orbs, functions, verbose);
    case 'aframe':
      return generateAFrame(orbs, functions, verbose);
    case 'webxr':
      return generateWebXR(orbs, functions, verbose);
    default:
      return generateThreeJS(orbs, functions, verbose);
  }
}

function generateThreeJS(orbs: any[], functions: any[], verbose: boolean): string {
  let code = `// Generated by HoloScript Compiler
// Target: Three.js
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

`;

  for (const orb of orbs) {
    const name = orb.name || 'object';
    const props = orb.properties || {};
    const traits = orb.traits || [];
    
    // Position handling (array or object)
    const pos = props.position;
    let px = 0, py = 0, pz = 0;
    if (Array.isArray(pos)) { [px, py, pz] = pos; }
    else if (pos) { px = pos.x || 0; py = pos.y || 0; pz = pos.z || 0; }
    
    // Scale handling
    const scale = props.scale;
    let sx = 1, sy = 1, sz = 1;
    if (Array.isArray(scale)) { [sx, sy, sz] = scale; }
    else if (scale) { sx = scale.x || 1; sy = scale.y || 1; sz = scale.z || 1; }

    const color = props.color || '#ffffff';
    const geometry = props.geometry || 'sphere';
    
    code += `// ${name}\n`;
    if (geometry === 'cube' || geometry === 'box') {
      code += `const ${name}_geometry = new THREE.BoxGeometry(${sx}, ${sy}, ${sz});\n`;
    } else {
      code += `const ${name}_geometry = new THREE.SphereGeometry(${sx/2}, 32, 32);\n`;
    }
    
    // Material
    const isGlowing = traits.some((t: any) => t.name === 'glowing' || t.name === 'emissive');
    if (isGlowing) {
      code += `const ${name}_material = new THREE.MeshStandardMaterial({ color: '${color}', emissive: '${color}', emissiveIntensity: 1.0 });\n`;
    } else {
      code += `const ${name}_material = new THREE.MeshStandardMaterial({ color: '${color}' });\n`;
    }
    
    code += `const ${name} = new THREE.Mesh(${name}_geometry, ${name}_material);\n`;
    code += `${name}.position.set(${px}, ${py}, ${pz});\n`;
    
    // Physics Placeholder
    const hasPhysics = traits.some((t: any) => t.name === 'physics' || t.name === 'rigid' || t.name === 'collidable');
    if (hasPhysics) {
      code += `// Physics enabled for ${name} (@physics)\n`;
    }
    
    code += `scene.add(${name});\n\n`;
  }

  code += `camera.position.z = 5;\n\n`;

  // Logic Handlers
  if (functions.length > 0) {
    code += `// Logic Handlers\n`;
    for (const func of functions) {
      code += `function ${func.name}(...args) {\n`;
      code += `  console.log('[HoloScript] Triggered logic: ${func.name}', args);\n`;
      code += `}\n\n`;
    }
  }

  code += `function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
`;

  return code;
}

function generateUnity(orbs: any[], functions: any[], verbose: boolean): string {
  let code = `// Generated by HoloScript Compiler
// Target: Unity C#
using UnityEngine;

public class HoloScriptScene : MonoBehaviour
{
    void Start()
    {
`;

  for (const orb of orbs) {
    const name = orb.name || 'object';
    const pos = orb.properties?.position || { x: 0, y: 0, z: 0 };
    const traits = orb.traits || [];
    
    code += `        // Create ${name}
        GameObject ${name} = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ${name}.name = "${name}";
        ${name}.transform.position = new Vector3(${pos.x || 0}f, ${pos.y || 0}f, ${pos.z || 0}f);

`;

    const hasPhysics = traits.some((t: any) => t.name === 'physics' || t.name === 'throwable' || t.name === 'grabbable');
    if (hasPhysics) {
      code += `        // Add Physics
        Rigidbody ${name}_rb = ${name}.AddComponent<Rigidbody>();
`;
    }

    for (const trait of traits) {
      code += `        // Trait: @${trait.name}\n`;
      if (trait.name === 'grabbable') {
        code += `        // TODO: Map to XR Grab Interactable or similar\n`;
      }
    }
    
    code += `\n`;
  }

  code += `    }
}
`;

  return code;
}

function generateVRChat(orbs: any[], functions: any[], verbose: boolean): string {
  let code = `// Generated by HoloScript Compiler
// Target: VRChat Udon#
using UdonSharp;
using UnityEngine;
using VRC.SDKBase;

public class HoloScriptWorld : UdonSharpBehaviour
{
    void Start()
    {
`;

  for (const orb of orbs) {
    const name = orb.name || 'object';
    const pos = orb.properties?.position || { x: 0, y: 0, z: 0 }; // VRChat also uses position
    const traits = orb.traits || [];

    code += `        // Create ${name}
        GameObject ${name} = VRC.SDKBase.VRCInstantiate.Instantiate(VRC.SDKBase.VRC_SceneDescriptor.GetDefaultSpawnPoint()); // Placeholder for actual object creation
        ${name}.name = "${name}";
        ${name}.transform.position = new Vector3(${pos.x || 0}f, ${pos.y || 0}f, ${pos.z || 0}f);
        Debug.Log("[HoloScript] Initialized ${name}");

`;

    const hasPhysics = traits.some((t: any) => t.name === 'physics' || t.name === 'throwable' || t.name === 'grabbable');
    if (hasPhysics) {
      code += `        // Add Physics (Rigidbody)
        Rigidbody ${name}_rb = ${name}.AddComponent<Rigidbody>();
`;
    }

    for (const trait of traits) {
      code += `        // Trait: @${trait.name}\n`;
      if (trait.name === 'grabbable') {
        code += `        // TODO: Add VRC_Grabbable or similar UdonSharp component\n`;
      }
      if (trait.name === 'throwable') {
        code += `        // TODO: Configure VRC_Grabbable for throwable behavior\n`;
      }
    }
    
    code += `\n`;
  }

  code += `    }
}
`;

  return code;
}

function generateBabylon(orbs: any[], functions: any[], verbose: boolean): string {
  let code = `// Generated by HoloScript Compiler
// Target: Babylon.js
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 3, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

`;

  for (const orb of orbs) {
    const name = orb.name || 'object';
    const pos = orb.properties?.position || { x: 0, y: 0, z: 0 };
    
    code += `    const ${name} = BABYLON.MeshBuilder.CreateSphere("${name}", {diameter: 1}, scene);
    ${name}.position = new BABYLON.Vector3(${pos.x || 0}, ${pos.y || 0}, ${pos.z || 0});

`;
  }

  code += `    return scene;
};

const scene = createScene();
engine.runRenderLoop(function () {
    scene.render();
});
`;

  return code;
}

function generateAFrame(orbs: any[], functions: any[], verbose: boolean): string {
  let code = `<!-- Generated by HoloScript Compiler -->
<!-- Target: A-Frame -->
<!DOCTYPE html>
<html>
<head>
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
</head>
<body>
    <a-scene>
`;

  for (const orb of orbs) {
    const name = orb.name || 'object';
    const pos = orb.properties?.position || { x: 0, y: 0, z: 0 };
    const color = orb.properties?.color || '#EF2D5E';
    
    code += `        <a-sphere id="${name}" position="${pos.x || 0} ${pos.y || 0} ${pos.z || 0}" radius="0.5" color="${color}"></a-sphere>
`;
  }

  code += `        <a-sky color="#ECECEC"></a-sky>
    </a-scene>
</body>
</html>
`;

  return code;
}

function generateWebXR(orbs: any[], functions: any[], verbose: boolean): string {
  let code = `// Generated by HoloScript Compiler
// Target: WebXR (Three.js + WebXR)
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

`;

  for (const orb of orbs) {
    const name = orb.name || 'object';
    const pos = orb.properties?.position || { x: 0, y: 0, z: 0 };
    const color = orb.properties?.color || '#ffffff';
    
    code += `const ${name} = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: '${color}' })
);
${name}.position.set(${pos.x || 0}, ${pos.y || 0}, ${pos.z || 0});
scene.add(${name});

`;
  }

  code += `const light = new THREE.HemisphericLight(0xffffff, 0x444444, 1);
scene.add(light);

camera.position.z = 5;

renderer.setAnimationLoop(function () {
    renderer.render(scene, camera);
});
`;

  return code;
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
