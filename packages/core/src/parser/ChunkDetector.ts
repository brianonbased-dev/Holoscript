/**
 * ChunkDetector
 * 
 * Scans HoloScript+ source code to identify top-level block boundaries
 * (orb, template, environment, logic, and global directives).
 */

export interface SourceChunk {
  id: string;
  type: 'orb' | 'template' | 'environment' | 'logic' | 'directive' | 'unknown';
  name?: string;
  startLine: number;
  endLine: number;
  content: string;
}

export class ChunkDetector {
  /**
   * Detects chunks in the source code based on top-level keywords
   */
  static detect(source: string): SourceChunk[] {
    const lines = source.split(/\r?\n/);
    const chunks: SourceChunk[] = [];
    
    let currentChunk: Partial<SourceChunk> | null = null;
    let braceDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines or comments outside chunks
      if (!currentChunk && (!trimmed || trimmed.startsWith('//'))) {
        continue;
      }
      
      // Look for start of a new chunk if not currently in one
      if (!currentChunk) {
        const orbMatch = trimmed.match(/^orb\s+([a-zA-Z0-9_#"]+)/);
        const templateMatch = trimmed.match(/^template\s+"([^"]+)"/);
        const envMatch = trimmed.startsWith('environment');
        const logicMatch = trimmed.startsWith('logic');
        const directiveMatch = trimmed.startsWith('@');
        
        if (orbMatch || templateMatch || envMatch || logicMatch || directiveMatch) {
          currentChunk = {
            startLine: i + 1,
            content: line
          };
          
          if (orbMatch) {
            currentChunk.type = 'orb';
            currentChunk.name = orbMatch[1].replace(/[#"]/g, '');
            currentChunk.id = `orb:${currentChunk.name}`;
          } else if (templateMatch) {
            currentChunk.type = 'template';
            currentChunk.name = templateMatch[1];
            currentChunk.id = `template:${currentChunk.name}`;
          } else if (envMatch) {
            currentChunk.type = 'environment';
            currentChunk.id = `environment:${i+1}`;
          } else if (logicMatch) {
            currentChunk.type = 'logic';
            currentChunk.id = `logic:${i+1}`;
          } else if (directiveMatch) {
            currentChunk.type = 'directive';
            // Global directives might be single-line or block
            if (!trimmed.includes('{')) {
              currentChunk.endLine = i + 1;
              currentChunk.id = `directive:${i+1}`;
              chunks.push(currentChunk as SourceChunk);
              currentChunk = null;
              continue;
            }
            currentChunk.id = `directive:${i+1}`;
          }
        }
      } else {
        // We are inside a chunk
        currentChunk.content += '\n' + line;
      }
      
      // Track brace depth to find end of block
      if (currentChunk) {
        for (const char of line) {
          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;
        }
        
        // If we returned to depth 0, the chunk is finished
        if (braceDepth === 0) {
          currentChunk.endLine = i + 1;
          chunks.push(currentChunk as SourceChunk);
          currentChunk = null;
        }
      }
    }
    
    // Handle any unclosed chunk at EOF
    if (currentChunk) {
      currentChunk.endLine = lines.length;
      chunks.push(currentChunk as SourceChunk);
    }
    
    return chunks;
  }
}
