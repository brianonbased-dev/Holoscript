import React, { useState, useEffect } from 'react';
import { HoloScriptPlusParser } from '@holoscript/core';
import Editor from '@monaco-editor/react';
import Preview from './components/Preview';

const App: React.FC = () => {
  const [code, setCode] = useState<string>(`// Physics Demo - Falling objects
plane#floor {
  position: [0, -2, 0]
  scale: [10, 0.1, 10]
  color: "#333333"
  @physics
  @static
}

orb#bouncingBall {
  position: [0, 5, 0]
  color: "#00d4ff"
  @physics
}

box#stack1 {
  position: [0.5, 8, 0]
  color: "#ff0000"
  @physics
}`);
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    const parser = new HoloScriptPlusParser();
    const result = parser.parse(code);
    setErrors(result.errors || []);
  }, [code]);

  return (
    <div className="playground-container">
      <header>
        <h1>HoloScript Playground</h1>
      </header>
      <main>
        <div className="editor-panel">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              automaticLayout: true,
            }}
          />
        </div>
        <div className="preview-panel">
          {errors.length > 0 ? (
            <div className="error-list">
              <h3>Syntax Errors ({errors.length})</h3>
              {errors.map((err, i) => (
                <div key={i} className="error-item">
                  <strong>Line {err.line}:</strong> {err.message}
                </div>
              ))}
            </div>
          ) : (
            <Preview code={code} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
