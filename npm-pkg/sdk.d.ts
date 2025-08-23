import type { Message as APIAssistantMessage, MessageParam as APIUserMessage, Usage } from '@anthropic-ai/sdk/resources/index.mjs';
import type { UUID } from 'crypto';
export type NonNullableUsage = {
    [K in keyof Usage]: NonNullable<Usage[K]>;
};
export type ApiKeySource = 'user' | 'project' | 'org' | 'temporary';
export type ConfigScope = 'local' | 'user' | 'project';
export type McpStdioServerConfig = {
    type?: 'stdio';
    command: string;
    args?: string[];
    env?: Record<string, string>;
};
export type McpSSEServerConfig = {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
};
export type McpHttpServerConfig = {
    type: 'http';
    url: string;
    headers?: Record<string, string>;
};
export type McpServerConfig = McpStdioServerConfig | McpSSEServerConfig | McpHttpServerConfig;
export type PermissionResult = {
    behavior: 'allow';
    updatedInput: Record<string, unknown>;
} | {
    behavior: 'deny';
    message: string;
};
export type CanUseTool = (toolName: string, input: Record<string, unknown>, options: {
    signal: AbortSignal;
}) => Promise<PermissionResult>;
export declare const HOOK_EVENTS: readonly ["PreToolUse", "PostToolUse", "Notification", "UserPromptSubmit", "SessionStart", "SessionEnd", "Stop", "SubagentStop", "PreCompact"];
export type HookEvent = (typeof HOOK_EVENTS)[number];
export type HookCallback = (input: HookInput, toolUseID: string | undefined, options: {
    signal: AbortSignal;
}) => Promise<HookJSONOutput>;
export interface HookCallbackMatcher {
    matcher?: string;
    hooks: HookCallback[];
}
export type BaseHookInput = {
    session_id: string;
    transcript_path: string;
    cwd: string;
};
export type PreToolUseHookInput = BaseHookInput & {
    hook_event_name: 'PreToolUse';
    tool_name: string;
    tool_input: unknown;
};
export type PostToolUseHookInput = BaseHookInput & {
    hook_event_name: 'PostToolUse';
    tool_name: string;
    tool_input: unknown;
    tool_response: unknown;
};
export type NotificationHookInput = BaseHookInput & {
    hook_event_name: 'Notification';
    message: string;
    title?: string;
};
export type UserPromptSubmitHookInput = BaseHookInput & {
    hook_event_name: 'UserPromptSubmit';
    prompt: string;
};
export type SessionStartHookInput = BaseHookInput & {
    hook_event_name: 'SessionStart';
    source: 'startup' | 'resume' | 'clear' | 'compact';
};
export type StopHookInput = BaseHookInput & {
    hook_event_name: 'Stop';
    stop_hook_active: boolean;
};
export type SubagentStopHookInput = BaseHookInput & {
    hook_event_name: 'SubagentStop';
    stop_hook_active: boolean;
};
export type PreCompactHookInput = BaseHookInput & {
    hook_event_name: 'PreCompact';
    trigger: 'manual' | 'auto';
    custom_instructions: string | null;
};
export declare const EXIT_REASONS: string[];
export type ExitReason = (typeof EXIT_REASONS)[number];
export type SessionEndHookInput = BaseHookInput & {
    hook_event_name: 'SessionEnd';
    reason: ExitReason;
};
export type HookInput = PreToolUseHookInput | PostToolUseHookInput | NotificationHookInput | UserPromptSubmitHookInput | SessionStartHookInput | SessionEndHookInput | StopHookInput | SubagentStopHookInput | PreCompactHookInput;
export interface HookJSONOutput {
    continue?: boolean;
    suppressOutput?: boolean;
    stopReason?: string;
    decision?: 'approve' | 'block';
    systemMessage?: string;
    permissionDecision?: 'allow' | 'deny' | 'ask';
    reason?: string;
    hookSpecificOutput?: {
        hookEventName: 'PreToolUse';
        permissionDecision?: 'allow' | 'deny' | 'ask';
        permissionDecisionReason?: string;
    } | {
        hookEventName: 'UserPromptSubmit';
        additionalContext?: string;
    } | {
        hookEventName: 'SessionStart';
        additionalContext?: string;
    } | {
        hookEventName: 'PostToolUse';
        additionalContext?: string;
    };
}
export type Options = {
    abortController?: AbortController;
    additionalDirectories?: string[];
    allowedTools?: string[];
    appendSystemPrompt?: string;
    canUseTool?: CanUseTool;
    continue?: boolean;
    customSystemPrompt?: string;
    cwd?: string;
    disallowedTools?: string[];
    env?: Dict<string>;
    executable?: 'bun' | 'deno' | 'node';
    executableArgs?: string[];
    extraArgs?: Record<string, string | null>;
    fallbackModel?: string;
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
    maxThinkingTokens?: number;
    maxTurns?: number;
    mcpServers?: Record<string, McpServerConfig>;
    model?: string;
    pathToClaudeCodeExecutable?: string;
    permissionMode?: PermissionMode;
    permissionPromptToolName?: string;
    resume?: string;
    stderr?: (data: string) => void;
    strictMcpConfig?: boolean;
    websocket?: {
        url: string;
        headers?: Record<string, string>;
    };
};
export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
type SDKMessageBase = {
    uuid: UUID;
    session_id: string;
};
type SDKUserMessageContent = {
    type: 'user';
    message: APIUserMessage;
    parent_tool_use_id: string | null;
};
export type SDKUserMessage = SDKUserMessageContent & {
    uuid?: UUID;
    session_id: string;
};
export type SDKUserMessageReplay = SDKMessageBase & SDKUserMessageContent;
export type SDKAssistantMessage = SDKMessageBase & {
    type: 'assistant';
    message: APIAssistantMessage;
    parent_tool_use_id: string | null;
};
export type SDKPermissionDenial = {
    tool_name: string;
    tool_use_id: string;
    tool_input: Record<string, unknown>;
};
export type SDKResultMessage = (SDKMessageBase & {
    type: 'result';
    subtype: 'success';
    duration_ms: number;
    duration_api_ms: number;
    is_error: boolean;
    num_turns: number;
    result: string;
    total_cost_usd: number;
    usage: NonNullableUsage;
    permission_denials: SDKPermissionDenial[];
}) | (SDKMessageBase & {
    type: 'result';
    subtype: 'error_max_turns' | 'error_during_execution';
    duration_ms: number;
    duration_api_ms: number;
    is_error: boolean;
    num_turns: number;
    total_cost_usd: number;
    usage: NonNullableUsage;
    permission_denials: SDKPermissionDenial[];
});
export type SDKSystemMessage = SDKMessageBase & {
    type: 'system';
    subtype: 'init';
    apiKeySource: ApiKeySource;
    cwd: string;
    tools: string[];
    mcp_servers: {
        name: string;
        status: string;
    }[];
    model: string;
    permissionMode: PermissionMode;
    slash_commands: string[];
    output_style: string;
};
export type SDKMessage = SDKAssistantMessage | SDKUserMessage | SDKUserMessageReplay | SDKResultMessage | SDKSystemMessage;
export interface Query extends AsyncGenerator<SDKMessage, void> {
    /**
     * Interrupt the query.
     * Only supported when streaming input is used.
     */
    interrupt(): Promise<void>;
    /**
     * Sets the permission mode.
     * Only supported when streaming input is used.
     */
    setPermissionMode(mode: PermissionMode): Promise<void>;
}
/**
 * Query Claude Code
 *
 * Behavior:
 * - Yields a message at a time
 * - Uses the tools and commands you give it
 *
 * Usage:
 * ```ts
 * const response = query({ prompt: "Help me write a function", options: {} })
 * for await (const message of response) {
 *   console.log(message)
 * }
 * ```
 */
export declare function query({ prompt, options, }: {
    prompt: string | AsyncIterable<SDKUserMessage>;
    options?: Options;
}): Query;
export declare class AbortError extends Error {
}
export {};
