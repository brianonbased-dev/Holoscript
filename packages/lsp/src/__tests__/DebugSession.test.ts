import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HoloScriptDebugSession } from '../HoloScriptDebugSession';
import { DebugProtocol } from 'vscode-debugprotocol';

describe('HoloScriptDebugSession', () => {
  let session: HoloScriptDebugSession;
  let responses: any[] = [];

  beforeEach(() => {
    session = new HoloScriptDebugSession();
    responses = [];
    
    // Mock sendResponse to capture responses
    (session as any).sendResponse = (response: any) => {
      responses.push(response);
    };

    // Mock sendEvent to capture events
    (session as any).sendEvent = (event: any) => {
      // In a real session this would send to transport
    };
  });

  it('should handle initialize request', () => {
    const request: DebugProtocol.InitializeRequest = {
      seq: 1,
      type: 'request',
      command: 'initialize',
      arguments: {
        adapterID: 'holoscript',
        pathFormat: 'path'
      }
    };

    const response: DebugProtocol.InitializeResponse = {
      seq: 0,
      type: 'response',
      request_seq: 1,
      command: 'initialize',
      success: true,
      body: {}
    };

    (session as any).initializeRequest(response, request.arguments);

    expect(responses.length).toBe(1);
    expect(responses[0].command).toBe('initialize');
    expect(responses[0].body.supportsConfigurationDoneRequest).toBe(true);
  });

  it('should handle threads request', () => {
     const response: DebugProtocol.ThreadsResponse = {
      seq: 0,
      type: 'response',
      request_seq: 2,
      command: 'threads',
      success: true,
      body: { threads: [] }
    };

    (session as any).threadsRequest(response);

    expect(responses.length).toBe(1);
    expect(responses[0].body.threads).toHaveLength(1);
    expect(responses[0].body.threads[0].name).toBe('Main Thread');
  });

  it('should handle setBreakpoints request', () => {
    const requestArgs: DebugProtocol.SetBreakpointsArguments = {
      source: { path: 'test.holo' },
      breakpoints: [
        { line: 10 },
        { line: 20 }
      ]
    };

    const response: DebugProtocol.SetBreakpointsResponse = {
      seq: 0,
      type: 'response',
      request_seq: 3,
      command: 'setBreakpoints',
      success: true,
      body: { breakpoints: [] }
    };

    (session as any).setBreakPointsRequest(response, requestArgs);

    expect(responses.length).toBe(1);
    expect(responses[0].body.breakpoints).toHaveLength(2);
    expect(responses[0].body.breakpoints[0].line).toBe(10);
  });
});
