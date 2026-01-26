import React, { useEffect, useRef } from 'react';
// @ts-ignore - BrowserRuntime is exported from @holoscript/runtime/browser
import { BrowserRuntime } from '@holoscript/runtime/browser';

interface PreviewProps {
  code: string;
}

const Preview: React.FC<PreviewProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize runtime
    const runtime = new BrowserRuntime({
      container: containerRef.current,
      mode: 'web',
      quality: 'high',
    });

    runtimeRef.current = runtime;
    runtime.start();

    return () => {
      runtime.dispose();
    };
  }, []);

  useEffect(() => {
    if (runtimeRef.current && code) {
      try {
        runtimeRef.current.load(code);
      } catch (error) {
        console.error('Runtime failed to load code:', error);
      }
    }
  }, [code]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        background: '#0f0f1a',
        overflow: 'hidden'
      }} 
    />
  );
};

export default Preview;
