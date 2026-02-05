
import { HeadlessRenderer } from './renderer';
import { captureScreenshot, CaptureOptions } from './capture';
import { compareImages, saveDiff } from './diff';
import { VisualReportGenerator } from './report';
import * as fs from 'fs';
import * as path from 'path';

export * from './renderer';
export * from './capture';
export * from './diff';
export * from './report';
export * from './DiffViewer';

export interface VisualTestContext {
  renderer: HeadlessRenderer;
  reportGenerator: VisualReportGenerator;
}

// Global context for visual tests
let globalContext: VisualTestContext | null = null;

export async function setupVisualTesting(outputDir: string) {
  const renderer = new HeadlessRenderer();
  await renderer.launch();
  
  const reportGenerator = new VisualReportGenerator();
  
  globalContext = { renderer, reportGenerator };
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return { renderer, reportGenerator };
}

export async function teardownVisualTesting(outputDir: string) {
  if (globalContext) {
    await globalContext.renderer.close();
    globalContext.reportGenerator.generate(path.join(outputDir, 'report.html'));
    globalContext = null;
  }
}

export interface VisualTestOptions {
  name: string;
  htmlContent: string;
  baselineDir: string;
  outputDir: string;
  threshold?: number;
  captureOptions?: CaptureOptions;
}

export async function visualTest(options: VisualTestOptions) {
  if (!globalContext) {
    throw new Error('Visual testing not set up. Call setupVisualTesting() first.');
  }

  const { renderer, reportGenerator } = globalContext;
  const { name, htmlContent, baselineDir, outputDir, threshold = 0.1 } = options;

  console.log(`Visual Test: ${name}`);

  // 1. Render
  const page = await renderer.renderHTML(htmlContent);

  // 2. Capture
  const actualBuffer = await captureScreenshot(page, options.captureOptions);
  await page.close();

  const baselinePath = path.join(baselineDir, `${name}.png`);
  const actualPath = path.join(outputDir, `${name}_actual.png`);
  const diffPath = path.join(outputDir, `${name}_diff.png`);

  // Save actual
  fs.mkdirSync(path.dirname(actualPath), { recursive: true });
  fs.writeFileSync(actualPath, actualBuffer);

  // 3. Compare
  let passed = false;
  let diffPixels = 0;

  if (fs.existsSync(baselinePath)) {
    const baselineBuffer = fs.readFileSync(baselinePath);
    try {
      const result = compareImages(actualBuffer, baselineBuffer, threshold);
      diffPixels = result.diffPixels;
      
      if (diffPixels > 0) {
        saveDiff(result, diffPath);
      } else {
        passed = true;
      }
    } catch (e) {
      console.error(`Comparison failed: ${e}`);
      // Dimensions mismatch or other error
    }
  } else {
    console.warn(`Baseline not found for ${name}. treating as new baseline.`);
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, actualBuffer);
    passed = true; // New baseline counts as pass
  }

  // 4. Report
  reportGenerator.addResult({
    name,
    passed,
    diffPixels,
    baselinePath,
    actualPath,
    diffPath: passed ? undefined : diffPath
  });

  if (!passed) {
    throw new Error(`Visual test '${name}' failed with ${diffPixels} differing pixels.`);
  }
}
