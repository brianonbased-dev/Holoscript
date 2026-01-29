import {
  LoggingDebugSession,
  InitializedEvent,
  StoppedEvent,
  TerminatedEvent,
  Thread,
  StackFrame,
  Scope,
  Source,
  Variable,
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { HoloScriptDebugger, type Breakpoint, type StackFrame as HoloStackFrame } from '@holoscript/core';
import { join } from 'path';

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  /** An absolute path to the "program" to debug. */
  program: string;
  /** Automatically stop target after launch. If not specified, target does not stop. */
  stopOnEntry?: boolean;
}

export class HoloScriptDebugSession extends LoggingDebugSession {
  private static THREAD_ID = 1;

  private debugger: HoloScriptDebugger;
  private sourceFile: string = '';

  public constructor() {
    super('holoscript-debug.txt');
    this.debugger = new HoloScriptDebugger();

    // Listen to debugger events
    this.debugger.on('breakpoint-hit', (event: any) => {
      this.sendEvent(new StoppedEvent('breakpoint', HoloScriptDebugSession.THREAD_ID));
    });

    this.debugger.on('step-complete', (event: any) => {
      this.sendEvent(new StoppedEvent('step', HoloScriptDebugSession.THREAD_ID));
    });

    this.debugger.on('state-change', (event: any) => {
      if (event.data.status === 'stopped' && event.data.reason === 'complete') {
        this.sendEvent(new TerminatedEvent());
      }
    });

    this.debugger.on('exception', (event: any) => {
      this.sendEvent(new StoppedEvent('exception', HoloScriptDebugSession.THREAD_ID));
    });
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): void {
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsTerminateRequest = true;

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: DebugProtocol.LaunchRequestArguments
  ): Promise<void> {
    const launchArgs = args as LaunchRequestArguments;
    this.sourceFile = launchArgs.program;

    // Load source code
    const fs = await import('fs');
    const code = fs.readFileSync(this.sourceFile, 'utf8');
    const result = this.debugger.loadSource(code, this.sourceFile);

    if (!result.success) {
      this.sendErrorResponse(response, 1, `Failed to load source: ${result.errors?.join(', ')}`);
      return;
    }

    this.sendResponse(response);

    if (launchArgs.stopOnEntry) {
      this.sendEvent(new StoppedEvent('entry', HoloScriptDebugSession.THREAD_ID));
    } else {
      await this.debugger.start();
    }
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): void {
    const path = args.source.path as string;
    const clientLines = args.breakpoints || [];

    // Clear existing breakpoints for this file
    this.debugger.clearBreakpoints(); // Simple implementation: clear all

    const breakpoints: DebugProtocol.Breakpoint[] = clientLines.map((l: DebugProtocol.SourceBreakpoint) => {
      const bp = this.debugger.setBreakpoint(l.line, { file: path });
      return {
        id: parseInt(bp.id.replace('bp_', '')),
        verified: true,
        line: bp.line
      };
    });

    response.body = { breakpoints };
    this.sendResponse(response);
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    response.body = {
      threads: [new Thread(HoloScriptDebugSession.THREAD_ID, 'Main Thread')]
    };
    this.sendResponse(response);
  }

  protected stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments
  ): void {
    const frames = this.debugger.getCallStack();
    response.body = {
      stackFrames: frames.map((f: HoloStackFrame, i: number) => new StackFrame(
        f.id,
        f.name,
        new Source(f.file || 'unknown', f.file || ''),
        f.line,
        f.column
      )),
      totalFrames: frames.length
    };
    this.sendResponse(response);
  }

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments
  ): void {
    response.body = {
      scopes: [
        new Scope('Local', args.frameId, false),
      ]
    };
    this.sendResponse(response);
  }

  protected variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments
  ): void {
    const vars = this.debugger.getVariables(args.variablesReference);
    const variables: Variable[] = [];

    vars.forEach((value: any, name: string) => {
      variables.push(new Variable(name, JSON.stringify(value)));
    });

    response.body = { variables };
    this.sendResponse(response);
  }

  protected async continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments
  ): Promise<void> {
    await this.debugger.continue();
    this.sendResponse(response);
  }

  protected async nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments
  ): Promise<void> {
    await this.debugger.stepOver();
    this.sendResponse(response);
  }

  protected async stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments
  ): Promise<void> {
    await this.debugger.stepInto();
    this.sendResponse(response);
  }

  protected async stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments
  ): Promise<void> {
    await this.debugger.stepOut();
    this.sendResponse(response);
  }
}
