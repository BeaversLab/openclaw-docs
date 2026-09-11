---
summary: "Index of the OpenClaw sub-agent documentation, one page per reader job"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
  - You are looking for the sub-agent page that matches your task
title: "Sub-agents"
sidebarTitle: "Sub-agents"
---

Sub-agents are background agent runs spawned from an existing agent run.
Each one runs in its own session (`agent:<agentId>:subagent:<uuid>`) and,
by default, **announces** its result back to the requester for review.
Every sub-agent run is tracked as a [background task](/en/automation/tasks).

Goals:

- Parallelize research, long tasks, and slow tool work without blocking the main run.
- Keep sub-agents isolated by default (session separation, optional sandboxing).
- Keep the tool surface hard to misuse: sub-agents do **not** get session or message tools by default.
- Support configurable nesting depth for orchestrator patterns.

<Note>
**Cost note:** each sub-agent has its own context and token usage by
default. For heavy or repetitive tasks, set a cheaper model for sub-agents
and keep your main agent on a higher-quality model via
`agents.defaults.subagents.model` or per-agent overrides. When a child
genuinely needs the requester's current transcript, spawn it with
`context: "fork"`. Thread-bound subagent sessions default to
`context: "fork"` because they branch the current conversation into a
follow-up thread.
</Note>

A subagent run ends; a session does not. When you open a subagent run in the
Control UI, its transcript is view-only. Use **Open parent session** in the
composer area to continue the conversation with the parent. You can still use
**Stop** when the Gateway reports an abortable run. Persistent sessions created
with `visible: true` are ordinary sessions in the session tree: they keep their
parent for navigation and completion announcements, and you can always type in
them and steer them like any other session.

This page is an index. Sub-agents are documented on seven pages, one per
reader job. Open the page that matches your task.

| Page                                                                         | Read it when                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Sub-agent slash command](/en/tools/subagents/slash-command)                    | You want to inspect a run from chat, or need the completion-delivery rules.             |
| [Sub-agent tool reference](/en/tools/subagents/tool-reference)                  | You are calling `sessions_spawn`, `sessions_yield`, or `subagents` and need parameters. |
| [Thread-bound sub-agent sessions](/en/tools/subagents/thread-bound-sessions)    | You are binding a sub-agent to a channel thread, or need allowlist and archive rules.   |
| [Nested sub-agents and authentication](/en/tools/subagents/nesting)             | You are building an orchestrator and need depth caps, the announce chain, or auth.      |
| [Sub-agent announce](/en/tools/subagents/announce)                              | You are debugging how a child result reaches the requester.                             |
| [Sub-agent tool policy](/en/tools/subagents/tool-policy)                        | You need the tools a sub-agent always loses, or want to narrow them further.            |
| [Sub-agent concurrency, recovery, and stopping](/en/tools/subagents/operations) | You are tuning concurrency, recovering after a restart, or stopping a child tree.       |

## Where each section moved

Every section heading, accordion, step, and parameter id from the previous
single-page version keeps its anchor here, so an existing link such as
`/tools/subagents#thread-bound-sessions` still resolves. Each entry points at
the page that now holds the content.

- <a id="slash-command" />[Slash command](/en/tools/subagents/slash-command#slash-command)
- <a id="thread-binding-controls" />[Thread binding controls](/en/tools/subagents/slash-command#thread-binding-controls)
- <a id="spawn-behavior" />[Spawn behavior](/en/tools/subagents/slash-command#spawn-behavior)
- <a id="non-blocking-push-based-completion" />[Non-blocking, push-based completion](/en/tools/subagents/slash-command#non-blocking-push-based-completion)
- <a id="completion-delivery" />[Completion delivery](/en/tools/subagents/slash-command#completion-delivery)
- <a id="completion-handoff-metadata" />[Completion handoff metadata](/en/tools/subagents/slash-command#completion-handoff-metadata)
- <a id="modes-and-acp-runtime" />[Modes and ACP runtime](/en/tools/subagents/slash-command#modes-and-acp-runtime)
- <a id="context-modes" />[Context modes](/en/tools/subagents/tool-reference#context-modes)
- <a id="tool%3A-sessions_spawn" /><a id="tool-sessions_spawn" />[Tool: `sessions_spawn`](/en/tools/subagents/tool-reference#tool-sessions_spawn)
- <a id="delegation-prompt-mode" />[Delegation prompt mode](/en/tools/subagents/tool-reference#delegation-prompt-mode)
- <a id="tool-parameters" />[Tool parameters](/en/tools/subagents/tool-reference#tool-parameters)
- <a id="param-task" />[`task`](/en/tools/subagents/tool-reference#param-task)
- <a id="param-task-name" />[`taskName`](/en/tools/subagents/tool-reference#param-task-name)
- <a id="param-label" />[`label`](/en/tools/subagents/tool-reference#param-label)
- <a id="param-agent-id" />[`agentId`](/en/tools/subagents/tool-reference#param-agent-id)
- <a id="param-cwd" />[`cwd`](/en/tools/subagents/tool-reference#param-cwd)
- <a id="param-runtime" />[`runtime`](/en/tools/subagents/tool-reference#param-runtime)
- <a id="param-resume-session-id" />[`resumeSessionId`](/en/tools/subagents/tool-reference#param-resume-session-id)
- <a id="param-stream-to" />[`streamTo`](/en/tools/subagents/tool-reference#param-stream-to)
- <a id="param-model" />[`model`](/en/tools/subagents/tool-reference#param-model)
- <a id="param-run-timeout-seconds" />[`runTimeoutSeconds`](/en/tools/subagents/tool-reference#param-run-timeout-seconds)
- <a id="param-thinking" />[`thinking`](/en/tools/subagents/tool-reference#param-thinking)
- <a id="param-thread" />[`thread`](/en/tools/subagents/tool-reference#param-thread)
- <a id="param-mode" />[`mode`](/en/tools/subagents/tool-reference#param-mode)
- <a id="param-cleanup" />[`cleanup`](/en/tools/subagents/tool-reference#param-cleanup)
- <a id="param-expects-completion-message" />[`expectsCompletionMessage`](/en/tools/subagents/tool-reference#param-expects-completion-message)
- <a id="param-sandbox" />[`sandbox`](/en/tools/subagents/tool-reference#param-sandbox)
- <a id="param-context" />[`context`](/en/tools/subagents/tool-reference#param-context)
- <a id="param-visible" />[`visible`](/en/tools/subagents/tool-reference#param-visible)
- <a id="param-group" />[`group`](/en/tools/subagents/tool-reference#param-group)
- <a id="param-worktree" />[`worktree`](/en/tools/subagents/tool-reference#param-worktree)
- <a id="param-worktree-name" />[`worktreeName`](/en/tools/subagents/tool-reference#param-worktree-name)
- <a id="param-worktree-base-ref" />[`worktreeBaseRef`](/en/tools/subagents/tool-reference#param-worktree-base-ref)
- <a id="task-names-and-targeting" />[Task names and targeting](/en/tools/subagents/tool-reference#task-names-and-targeting)
- <a id="tool%3A-sessions_yield" /><a id="tool-sessions_yield" />[Tool: `sessions_yield`](/en/tools/subagents/tool-reference#tool-sessions_yield)
- <a id="tool%3A-subagents" /><a id="tool-subagents" />[Tool: `subagents`](/en/tools/subagents/tool-reference#tool-subagents)
- <a id="thread-bound-sessions" />[Thread-bound sessions](/en/tools/subagents/thread-bound-sessions#thread-bound-sessions)
- <a id="thread-supporting-channels" />[Thread supporting channels](/en/tools/subagents/thread-bound-sessions#thread-supporting-channels)
- <a id="quick-flow" />[Quick flow](/en/tools/subagents/thread-bound-sessions#quick-flow)
- <a id="spawn" />[Spawn](/en/tools/subagents/thread-bound-sessions#spawn)
- <a id="bind" />[Bind](/en/tools/subagents/thread-bound-sessions#bind)
- <a id="route-follow-ups" />[Route follow-ups](/en/tools/subagents/thread-bound-sessions#route-follow-ups)
- <a id="inspect-timeouts" />[Inspect timeouts](/en/tools/subagents/thread-bound-sessions#inspect-timeouts)
- <a id="detach" />[Detach](/en/tools/subagents/thread-bound-sessions#detach)
- <a id="manual-controls" />[Manual controls](/en/tools/subagents/thread-bound-sessions#manual-controls)
- <a id="config-switches" />[Config switches](/en/tools/subagents/thread-bound-sessions#config-switches)
- <a id="allowlist" />[Allowlist](/en/tools/subagents/thread-bound-sessions#allowlist)
- <a id="param-agents-entries-subagents-allow-agents" />[`agents.entries.*.subagents.allowAgents`](/en/tools/subagents/thread-bound-sessions#param-agents-entries-subagents-allow-agents)
- <a id="param-agents-defaults-subagents-allow-agents" />[`agents.defaults.subagents.allowAgents`](/en/tools/subagents/thread-bound-sessions#param-agents-defaults-subagents-allow-agents)
- <a id="param-agents-defaults-subagents-require-agent-id" />[`agents.defaults.subagents.requireAgentId`](/en/tools/subagents/thread-bound-sessions#param-agents-defaults-subagents-require-agent-id)
- <a id="param-agents-defaults-subagents-announce-timeout-ms" />[`agents.defaults.subagents.announceTimeoutMs`](/en/tools/subagents/thread-bound-sessions#param-agents-defaults-subagents-announce-timeout-ms)
- <a id="discovery" />[Discovery](/en/tools/subagents/thread-bound-sessions#discovery)
- <a id="auto-archive" />[Auto-archive](/en/tools/subagents/thread-bound-sessions#auto-archive)
- <a id="nested-sub-agents" />[Nested sub-agents](/en/tools/subagents/nesting#nested-sub-agents)
- <a id="depth-levels" />[Depth levels](/en/tools/subagents/nesting#depth-levels)
- <a id="announce-chain" />[Announce chain](/en/tools/subagents/nesting#announce-chain)
- <a id="tool-policy-by-depth" />[Tool policy by depth](/en/tools/subagents/nesting#tool-policy-by-depth)
- <a id="per-agent-spawn-limit" />[Per-agent spawn limit](/en/tools/subagents/nesting#per-agent-spawn-limit)
- <a id="reset-a-conversation" />[Reset a conversation](/en/tools/subagents/nesting#reset-a-conversation)
- <a id="cascade-stop" />[Cascade stop](/en/tools/subagents/nesting#cascade-stop)
- <a id="authentication" />[Authentication](/en/tools/subagents/nesting#authentication)
- <a id="announce" />[Announce](/en/tools/subagents/announce#announce)
- <a id="announce-context" />[Announce context](/en/tools/subagents/announce#announce-context)
- <a id="stats-line" />[Stats line](/en/tools/subagents/announce#stats-line)
- <a id="why-prefer-sessions_history" />[Why prefer `sessions_history`](/en/tools/subagents/announce#why-prefer-sessions_history)
- <a id="tool-policy" />[Tool policy](/en/tools/subagents/tool-policy#tool-policy)
- <a id="override-via-config" />[Override via config](/en/tools/subagents/tool-policy#override-via-config)
- <a id="concurrency" />[Concurrency](/en/tools/subagents/operations#concurrency)
- <a id="liveness-and-recovery" />[Liveness and recovery](/en/tools/subagents/operations#liveness-and-recovery)
- <a id="stopping" />[Stopping](/en/tools/subagents/operations#stopping)
- <a id="limitations" />[Limitations](/en/tools/subagents/operations#limitations)

## Related

- [Session tools and state changes](/en/concepts/session-tool)
- [ACP agents](/en/tools/acp-agents)
- [Agent send](/en/tools/agent-send)
- [Background tasks](/en/automation/tasks)
- [Multi-agent sandbox tools](/en/tools/multi-agent-sandbox-tools)
- [Steer](/en/tools/steer) — redirect a running agent mid-task
