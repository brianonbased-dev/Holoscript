import { HoloScriptPlusParser } from './src/parser/HoloScriptPlusParser';

const parser = new HoloScriptPlusParser();
const source = `
  orb#missing_brace 
    color: "#ffffff"
  

  orb#next {
    scale: 2.0
  }
`;

const result = parser.parse(source);
console.log('Tokens:', (parser as any).tokens.map((t: any) => ({ type: t.type, value: t.value, line: t.line })));
console.log('Result type:', result.ast.type);
// ... existing logs
console.log('Children count:', result.ast.children?.length ?? 'N/A');
if (result.ast.children) {
  console.log('Nodes:', result.ast.children.map(c => ({ type: c.type, id: c.id })));
} else {
  console.log('Single Node:', { type: result.ast.type, id: result.ast.id });
}
console.log('Errors:', result.errors.length, result.errors.map(e => e.message));
