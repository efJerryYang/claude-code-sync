#!/usr/bin/env node

// (c) Anthropic PBC. All rights reserved. Use is subject to Anthropic's Commercial Terms of Service (https://www.anthropic.com/legal/commercial-terms).

// Version: 1.0.86

// Want to see the unminified source? We're hiring!
// https://job-boards.greenhouse.io/anthropic/jobs/4816199008

// src/entrypoints/sdk.ts
import { join as join2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// src/utils/stream.ts
class Stream {
  returned;
  queue = [];
  readResolve;
  readReject;
  isDone = false;
  hasError;
  started = false;
  constructor(returned) {
    this.returned = returned;
  }
  [Symbol.asyncIterator]() {
    if (this.started) {
      throw new Error("Stream can only be iterated once");
    }
    this.started = true;
    return this;
  }
  next() {
    if (this.queue.length > 0) {
      return Promise.resolve({
        done: false,
        value: this.queue.shift()
      });
    }
    if (this.isDone) {
      return Promise.resolve({ done: true, value: undefined });
    }
    if (this.hasError) {
      return Promise.reject(this.hasError);
    }
    return new Promise((resolve, reject) => {
      this.readResolve = resolve;
      this.readReject = reject;
    });
  }
  enqueue(value) {
    if (this.readResolve) {
      const resolve = this.readResolve;
      this.readResolve = undefined;
      this.readReject = undefined;
      resolve({ done: false, value });
    } else {
      this.queue.push(value);
    }
  }
  done() {
    this.isDone = true;
    if (this.readResolve) {
      const resolve = this.readResolve;
      this.readResolve = undefined;
      this.readReject = undefined;
      resolve({ done: true, value: undefined });
    }
  }
  error(error) {
    this.hasError = error;
    if (this.readReject) {
      const reject = this.readReject;
      this.readResolve = undefined;
      this.readReject = undefined;
      reject(error);
    }
  }
  return() {
    this.isDone = true;
    if (this.returned) {
      this.returned();
    }
    return Promise.resolve({ done: true, value: undefined });
  }
}

// src/utils/abortController.ts
import { setMaxListeners } from "events";
var DEFAULT_MAX_LISTENERS = 50;
function createAbortController(maxListeners = DEFAULT_MAX_LISTENERS) {
  const controller = new AbortController;
  setMaxListeners(maxListeners, controller.signal);
  return controller;
}

// src/transport/ProcessTransport.ts
import { spawn } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

// src/utils/fsOperations.ts
import * as fs from "fs";
import { stat as statPromise } from "fs/promises";
var NodeFsOperations = {
  accessSync(fsPath, mode) {
    fs.accessSync(fsPath, mode);
  },
  cwd() {
    return process.cwd();
  },
  chmodSync(fsPath, mode) {
    fs.chmodSync(fsPath, mode);
  },
  existsSync(fsPath) {
    return fs.existsSync(fsPath);
  },
  async stat(fsPath) {
    return statPromise(fsPath);
  },
  statSync(fsPath) {
    return fs.statSync(fsPath);
  },
  readFileSync(fsPath, options) {
    return fs.readFileSync(fsPath, { encoding: options.encoding });
  },
  readFileBytesSync(fsPath) {
    return fs.readFileSync(fsPath);
  },
  readSync(fsPath, options) {
    let fd = undefined;
    try {
      fd = fs.openSync(fsPath, "r");
      const buffer = Buffer.alloc(options.length);
      const bytesRead = fs.readSync(fd, buffer, 0, options.length, 0);
      return { buffer, bytesRead };
    } finally {
      if (fd)
        fs.closeSync(fd);
    }
  },
  writeFileSync(fsPath, data, options) {
    if (!options.flush) {
      fs.writeFileSync(fsPath, data, { encoding: options.encoding });
      return;
    }
    let fd;
    try {
      fd = fs.openSync(fsPath, "w");
      fs.writeFileSync(fd, data, { encoding: options.encoding });
      fs.fsyncSync(fd);
    } finally {
      if (fd) {
        fs.closeSync(fd);
      }
    }
  },
  appendFileSync(path, data) {
    fs.appendFileSync(path, data);
  },
  copyFileSync(src, dest) {
    fs.copyFileSync(src, dest);
  },
  unlinkSync(path) {
    fs.unlinkSync(path);
  },
  renameSync(oldPath, newPath) {
    fs.renameSync(oldPath, newPath);
  },
  symlinkSync(target, path) {
    fs.symlinkSync(target, path);
  },
  readlinkSync(path) {
    return fs.readlinkSync(path);
  },
  realpathSync(path) {
    return fs.realpathSync(path);
  },
  mkdirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },
  readdirSync(dirPath) {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  },
  readdirStringSync(dirPath) {
    return fs.readdirSync(dirPath);
  },
  isDirEmptySync(dirPath) {
    const files = this.readdirSync(dirPath);
    return files.length === 0;
  },
  rmdirSync(dirPath) {
    fs.rmdirSync(dirPath);
  },
  rmSync(path, options) {
    fs.rmSync(path, options);
  }
};
var activeFs = NodeFsOperations;
function getFsImplementation() {
  return activeFs;
}

// src/entrypoints/sdkTypes.ts
class AbortError extends Error {
}

// src/transport/ProcessTransport.ts
class ProcessTransport {
  options;
  child;
  childStdin;
  childStdout;
  ready = false;
  abortController;
  exitError;
  exitListeners = [];
  processExitHandler;
  abortHandler;
  isStreaming;
  constructor(options) {
    this.options = options;
    this.abortController = options.abortController || createAbortController();
    this.isStreaming = typeof options.prompt !== "string";
    this.initialize();
  }
  initialize() {
    try {
      const {
        prompt,
        additionalDirectories = [],
        cwd,
        executable = this.isRunningWithBun() ? "bun" : "node",
        executableArgs = [],
        pathToClaudeCodeExecutable,
        env = { ...process.env },
        stderr,
        customSystemPrompt,
        appendSystemPrompt,
        maxTurns,
        model,
        fallbackModel,
        permissionMode,
        permissionPromptToolName,
        continueConversation,
        resume,
        allowedTools = [],
        disallowedTools = [],
        mcpServers,
        strictMcpConfig,
        canUseTool
      } = this.options;
      const args = ["--output-format", "stream-json", "--verbose"];
      if (customSystemPrompt)
        args.push("--system-prompt", customSystemPrompt);
      if (appendSystemPrompt)
        args.push("--append-system-prompt", appendSystemPrompt);
      if (maxTurns)
        args.push("--max-turns", maxTurns.toString());
      if (model)
        args.push("--model", model);
      if (env.DEBUG)
        args.push("--debug-to-stderr");
      if (canUseTool) {
        if (typeof prompt === "string") {
          throw new Error("canUseTool callback requires --input-format stream-json. Please set prompt as an AsyncIterable.");
        }
        if (permissionPromptToolName) {
          throw new Error("canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.");
        }
        args.push("--permission-prompt-tool", "stdio");
      } else if (permissionPromptToolName) {
        args.push("--permission-prompt-tool", permissionPromptToolName);
      }
      if (continueConversation)
        args.push("--continue");
      if (resume)
        args.push("--resume", resume);
      if (allowedTools.length > 0) {
        args.push("--allowedTools", allowedTools.join(","));
      }
      if (disallowedTools.length > 0) {
        args.push("--disallowedTools", disallowedTools.join(","));
      }
      if (mcpServers && Object.keys(mcpServers).length > 0) {
        args.push("--mcp-config", JSON.stringify({ mcpServers }));
      }
      if (strictMcpConfig) {
        args.push("--strict-mcp-config");
      }
      if (permissionMode && permissionMode !== "default") {
        args.push("--permission-mode", permissionMode);
      }
      if (fallbackModel) {
        if (model && fallbackModel === model) {
          throw new Error("Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.");
        }
        args.push("--fallback-model", fallbackModel);
      }
      if (typeof prompt === "string") {
        args.push("--print");
        args.push("--", prompt.trim());
      } else {
        args.push("--input-format", "stream-json");
      }
      for (const dir of additionalDirectories) {
        args.push("--add-dir", dir);
      }
      if (!env.CLAUDE_CODE_ENTRYPOINT) {
        env.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
      }
      const claudeCodePath = pathToClaudeCodeExecutable || this.getDefaultExecutablePath();
      const fs2 = getFsImplementation();
      if (!fs2.existsSync(claudeCodePath)) {
        throw new Error(`Claude Code executable not found at ${claudeCodePath}. Is options.pathToClaudeCodeExecutable set?`);
      }
      this.logDebug(`Spawning Claude Code process: ${executable} ${[...executableArgs, claudeCodePath, ...args].join(" ")}`);
      const stderrMode = env.DEBUG || stderr ? "pipe" : "ignore";
      this.child = spawn(executable, [...executableArgs, claudeCodePath, ...args], {
        cwd,
        stdio: ["pipe", "pipe", stderrMode],
        signal: this.abortController.signal,
        env
      });
      this.childStdin = this.child.stdin;
      this.childStdout = this.child.stdout;
      if (typeof prompt === "string") {
        this.childStdin.end();
        this.childStdin = undefined;
      }
      if (env.DEBUG || stderr) {
        this.child.stderr.on("data", (data) => {
          this.logDebug(`Claude Code stderr: ${data.toString()}`);
          if (stderr) {
            stderr(data.toString());
          }
        });
      }
      const cleanup = () => {
        if (this.child && !this.child.killed) {
          this.child.kill("SIGTERM");
        }
      };
      this.processExitHandler = cleanup;
      this.abortHandler = cleanup;
      process.on("exit", this.processExitHandler);
      this.abortController.signal.addEventListener("abort", this.abortHandler);
      this.child.on("error", (error) => {
        this.ready = false;
        if (this.abortController.signal.aborted) {
          this.exitError = new AbortError("Claude Code process aborted by user");
        } else {
          this.exitError = new Error(`Failed to spawn Claude Code process: ${error.message}`);
          this.logDebug(this.exitError.message);
        }
      });
      this.child.on("close", (code, signal) => {
        this.ready = false;
        if (this.abortController.signal.aborted) {
          this.exitError = new AbortError("Claude Code process aborted by user");
        } else {
          const error = this.getProcessExitError(code, signal);
          if (error) {
            this.exitError = error;
            this.logDebug(error.message);
          }
        }
      });
      this.ready = true;
    } catch (error) {
      this.ready = false;
      throw error;
    }
  }
  getProcessExitError(code, signal) {
    if (code !== 0 && code !== null) {
      return new Error(`Claude Code process exited with code ${code}`);
    } else if (signal) {
      return new Error(`Claude Code process terminated by signal ${signal}`);
    }
    return;
  }
  getDefaultExecutablePath() {
    const filename = fileURLToPath(import.meta.url);
    const dirname = join(filename, "..", "..");
    return join(dirname, "entrypoints", "cli.js");
  }
  isRunningWithBun() {
    return process.versions.bun !== undefined || process.env.BUN_INSTALL !== undefined;
  }
  logDebug(message) {
    if (process.env.DEBUG) {
      process.stderr.write(`${message}
`);
    }
  }
  write(data) {
    if (this.abortController.signal.aborted) {
      throw new AbortError("Operation aborted");
    }
    if (!this.ready || !this.childStdin) {
      throw new Error("ProcessTransport is not ready for writing");
    }
    if (this.child?.killed || this.child?.exitCode !== null) {
      throw new Error("Cannot write to terminated process");
    }
    if (this.exitError) {
      throw new Error(`Cannot write to process that exited with error: ${this.exitError.message}`);
    }
    if (process.env.DEBUG_SDK) {
      process.stderr.write(`[ProcessTransport] Writing to stdin: ${data.substring(0, 100)}
`);
    }
    try {
      const written = this.childStdin.write(data);
      if (!written && process.env.DEBUG_SDK) {
        console.warn("[ProcessTransport] Write buffer full, data queued");
      }
    } catch (error) {
      this.ready = false;
      throw new Error(`Failed to write to process stdin: ${error.message}`);
    }
  }
  close() {
    if (this.childStdin) {
      this.childStdin.end();
      this.childStdin = undefined;
    }
    if (this.processExitHandler) {
      process.off("exit", this.processExitHandler);
      this.processExitHandler = undefined;
    }
    if (this.abortHandler) {
      this.abortController.signal.removeEventListener("abort", this.abortHandler);
      this.abortHandler = undefined;
    }
    for (const { handler } of this.exitListeners) {
      this.child?.off("exit", handler);
    }
    this.exitListeners = [];
    if (this.child && !this.child.killed) {
      this.child.kill("SIGTERM");
      setTimeout(() => {
        if (this.child && !this.child.killed) {
          this.child.kill("SIGKILL");
        }
      }, 5000);
    }
    this.ready = false;
  }
  isReady() {
    return this.ready;
  }
  async* readMessages() {
    if (!this.childStdout) {
      throw new Error("ProcessTransport output stream not available");
    }
    const rl = createInterface({ input: this.childStdout });
    try {
      for await (const line of rl) {
        if (line.trim()) {
          const message = JSON.parse(line);
          yield message;
        }
      }
      await this.waitForExit();
    } catch (error) {
      throw error;
    } finally {
      rl.close();
    }
  }
  endInput() {
    if (this.childStdin) {
      this.childStdin.end();
    }
  }
  getInputStream() {
    return this.childStdin;
  }
  onExit(callback) {
    if (!this.child)
      return () => {};
    const handler = (code, signal) => {
      const error = this.getProcessExitError(code, signal);
      callback(error);
    };
    this.child.on("exit", handler);
    this.exitListeners.push({ callback, handler });
    return () => {
      if (this.child) {
        this.child.off("exit", handler);
      }
      const index = this.exitListeners.findIndex((l) => l.handler === handler);
      if (index !== -1) {
        this.exitListeners.splice(index, 1);
      }
    };
  }
  async waitForExit() {
    if (!this.child) {
      if (this.exitError) {
        throw this.exitError;
      }
      return;
    }
    if (this.child.exitCode !== null || this.child.killed) {
      if (this.exitError) {
        throw this.exitError;
      }
      return;
    }
    return new Promise((resolve, reject) => {
      const exitHandler = (code, signal) => {
        if (this.abortController.signal.aborted) {
          reject(new AbortError("Operation aborted"));
          return;
        }
        const error = this.getProcessExitError(code, signal);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      this.child.once("exit", exitHandler);
      const errorHandler = (error) => {
        this.child.off("exit", exitHandler);
        reject(error);
      };
      this.child.once("error", errorHandler);
      this.child.once("exit", () => {
        this.child.off("error", errorHandler);
      });
    });
  }
}

// src/entrypoints/sdk.ts
function query({
  prompt,
  options: {
    abortController = createAbortController(),
    additionalDirectories = [],
    allowedTools = [],
    appendSystemPrompt,
    canUseTool,
    continue: continueConversation,
    customSystemPrompt,
    cwd,
    disallowedTools = [],
    env,
    executable = isRunningWithBun() ? "bun" : "node",
    executableArgs = [],
    fallbackModel,
    hooks,
    maxTurns,
    mcpServers,
    model,
    pathToClaudeCodeExecutable,
    permissionMode = "default",
    permissionPromptToolName,
    resume,
    stderr,
    strictMcpConfig
  } = {}
}) {
  if (!env) {
    env = { ...process.env };
  }
  if (!env.CLAUDE_CODE_ENTRYPOINT) {
    env.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
  }
  if (pathToClaudeCodeExecutable === undefined) {
    const filename = fileURLToPath2(import.meta.url);
    const dirname = join2(filename, "..");
    pathToClaudeCodeExecutable = join2(dirname, "cli.js");
  }
  const isStreamingMode = typeof prompt !== "string";
  const transport = new ProcessTransport({
    prompt,
    abortController,
    additionalDirectories,
    cwd,
    executable,
    executableArgs,
    pathToClaudeCodeExecutable,
    env,
    stderr,
    customSystemPrompt,
    appendSystemPrompt,
    maxTurns,
    model,
    fallbackModel,
    permissionMode,
    permissionPromptToolName,
    continueConversation,
    resume,
    allowedTools,
    disallowedTools,
    mcpServers,
    strictMcpConfig,
    canUseTool: !!canUseTool,
    hooks: !!hooks
  });
  const query2 = new Query(transport, isStreamingMode, canUseTool, hooks, abortController);
  if (typeof prompt !== "string") {
    query2.streamInput(prompt);
  }
  return query2;
}

class Query {
  transport;
  isStreamingMode;
  canUseTool;
  hooks;
  abortController;
  pendingControlResponses = new Map;
  cleanupPerformed = false;
  sdkMessages;
  inputStream = new Stream;
  intialization;
  cancelControllers = new Map;
  hookCallbacks = new Map;
  nextCallbackId = 0;
  constructor(transport, isStreamingMode, canUseTool, hooks, abortController) {
    this.transport = transport;
    this.isStreamingMode = isStreamingMode;
    this.canUseTool = canUseTool;
    this.hooks = hooks;
    this.abortController = abortController;
    this.sdkMessages = this.readSdkMessages();
    this.readMessages();
    if (this.isStreamingMode) {
      this.intialization = this.initialize();
    }
  }
  setError(error) {
    this.inputStream.error(error);
  }
  cleanup(error) {
    if (this.cleanupPerformed)
      return;
    this.cleanupPerformed = true;
    try {
      this.transport.close();
      this.pendingControlResponses.clear();
      if (error) {
        this.inputStream.error(error);
      } else {
        this.inputStream.done();
      }
    } catch (_error) {}
  }
  next(...[value]) {
    return this.sdkMessages.next(...[value]);
  }
  return(value) {
    return this.sdkMessages.return(value);
  }
  throw(e) {
    return this.sdkMessages.throw(e);
  }
  [Symbol.asyncIterator]() {
    return this.sdkMessages;
  }
  [Symbol.asyncDispose]() {
    return this.sdkMessages[Symbol.asyncDispose]();
  }
  async readMessages() {
    try {
      for await (const message of this.transport.readMessages()) {
        if (message.type === "control_response") {
          const handler = this.pendingControlResponses.get(message.response.request_id);
          if (handler) {
            handler(message.response);
          }
          continue;
        } else if (message.type === "control_request") {
          this.handleControlRequest(message);
          continue;
        } else if (message.type === "control_cancel_request") {
          this.handleControlCancelRequest(message);
          continue;
        }
        this.inputStream.enqueue(message);
      }
      this.inputStream.done();
      this.cleanup();
    } catch (error) {
      this.inputStream.error(error);
      this.cleanup(error);
    }
  }
  async handleControlRequest(request) {
    const controller = new AbortController;
    this.cancelControllers.set(request.request_id, controller);
    try {
      const response = await this.processControlRequest(request, controller.signal);
      const controlResponse = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: request.request_id,
          response
        }
      };
      this.transport.write(JSON.stringify(controlResponse) + `
`);
    } catch (error) {
      const controlErrorResponse = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: request.request_id,
          error: error.message || String(error)
        }
      };
      this.transport.write(JSON.stringify(controlErrorResponse) + `
`);
    } finally {
      this.cancelControllers.delete(request.request_id);
    }
  }
  handleControlCancelRequest(request) {
    const controller = this.cancelControllers.get(request.request_id);
    if (controller) {
      controller.abort();
      this.cancelControllers.delete(request.request_id);
    }
  }
  async processControlRequest(request, signal) {
    if (request.request.subtype === "can_use_tool") {
      if (!this.canUseTool) {
        throw new Error("canUseTool callback is not provided.");
      }
      return this.canUseTool(request.request.tool_name, request.request.input, {
        signal
      });
    } else if (request.request.subtype === "hook_callback") {
      const result = await this.handleHookCallbacks(request.request.callback_id, request.request.input, request.request.tool_use_id, signal);
      return result;
    }
    throw new Error("Unsupported control request subtype: " + request.request.subtype);
  }
  async* readSdkMessages() {
    for await (const message of this.inputStream) {
      yield message;
    }
  }
  async initialize() {
    let hooks;
    if (this.hooks) {
      hooks = {};
      for (const [event, matchers] of Object.entries(this.hooks)) {
        if (matchers.length > 0) {
          hooks[event] = matchers.map((matcher) => {
            const callbackIds = [];
            for (const callback of matcher.hooks) {
              const callbackId = `hook_${this.nextCallbackId++}`;
              this.hookCallbacks.set(callbackId, callback);
              callbackIds.push(callbackId);
            }
            return {
              matcher: matcher.matcher,
              hookCallbackIds: callbackIds
            };
          });
        }
      }
    }
    const initRequest = {
      subtype: "initialize",
      hooks
    };
    const response = await this.request(initRequest);
    return response.response;
  }
  async interrupt() {
    if (!this.isStreamingMode) {
      throw new Error("Interrupt requires --input-format stream-json");
    }
    await this.request({
      subtype: "interrupt"
    });
  }
  async setPermissionMode(mode) {
    if (!this.isStreamingMode) {
      throw new Error("setPermissionMode requires --input-format stream-json");
    }
    await this.request({
      subtype: "set_permission_mode",
      mode
    });
  }
  request(request) {
    const requestId = Math.random().toString(36).substring(2, 15);
    const sdkRequest = {
      request_id: requestId,
      type: "control_request",
      request
    };
    return new Promise((resolve, reject) => {
      this.pendingControlResponses.set(requestId, (response) => {
        if (response.subtype === "success") {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
      this.transport.write(JSON.stringify(sdkRequest) + `
`);
    });
  }
  async supportedCommands() {
    if (!this.isStreamingMode) {
      throw new Error("supportedCommands requires --input-format stream-json");
    }
    if (!this.intialization) {
      throw new Error("supportedCommands requires transport with bidirectional communication");
    }
    return (await this.intialization).commands;
  }
  async streamInput(stream) {
    try {
      for await (const message of stream) {
        if (this.abortController?.signal.aborted)
          break;
        this.transport.write(JSON.stringify(message) + `
`);
      }
      this.transport.endInput();
    } catch (error) {
      if (!(error instanceof AbortError)) {
        throw error;
      }
    }
  }
  handleHookCallbacks(callbackId, input, toolUseID, abortSignal) {
    const callback = this.hookCallbacks.get(callbackId);
    if (!callback) {
      throw new Error(`No hook callback found for ID: ${callbackId}`);
    }
    return callback(input, toolUseID, {
      signal: abortSignal
    });
  }
}
function isRunningWithBun() {
  return process.versions.bun !== undefined || process.env.BUN_INSTALL !== undefined;
}
export {
  query,
  Query,
  AbortError
};
