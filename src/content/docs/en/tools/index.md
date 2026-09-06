---
doc-schema-version: 1
summary: "OpenClaw tools, skills, and plugins overview: what agents can call and how to extend them"
read_when:
  - You want to understand what tools OpenClaw provides
  - You are deciding between built-in tools, skills, and plugins
  - You need the right docs entry point for tool policy, automation, or agent coordination
title: "Overview"
---

Use this page to choose the right Capabilities surface. **Tools** are
callable actions, **skills** teach agents how to work, and **plugins** add
runtime capabilities such as tools, providers, channels, hooks, and packaged
skills.

This is an overview and routing page. For exhaustive tool policy, defaults,
group membership, provider restrictions, and configuration fields, use
[Tools and custom providers](/en/gateway/config-tools).

## Start here

For most agents, start with the built-in tool categories, then adjust policy
only when the agent should see fewer tools or needs explicit host access.

| If you need to...                            | Use this first                                 | Then read                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Let an agent act with existing capabilities  | [Built-in tools](#built-in-tool-categories)    | [Tool categories](#built-in-tool-categories)                                                                                                           |
| Control what an agent can call               | [Tool policy](#configure-access-and-approvals) | [Tools and custom providers](/en/gateway/config-tools)                                                                                                    |
| Teach an agent a workflow                    | [Skills](#choose-tools-skills-or-plugins)      | [Skills](/en/tools/skills), [Creating skills](/en/tools/creating-skills), [Skill Workshop](/en/tools/skill-workshop), and [Self-learning](/en/tools/self-learning) |
| Add a new integration or runtime surface     | [Plugins](#extend-capabilities)                | [Plugins](/en/tools/plugin) and [Build plugins](/en/plugins/building-plugins)                                                                                |
| Run work later or in the background          | [Automation](/en/automation)                      | [Automation overview](/en/automation)                                                                                                                     |
| Coordinate multiple agents or harnesses      | [Sub-agents](/en/tools/subagents)                 | [ACP agents](/en/tools/acp-agents) and [Agent send](/en/tools/agent-send)                                                                                    |
| Orchestrate concurrent agents from code      | [Swarm](/en/tools/swarm)                          | [Code Mode](/en/tools/code-mode) and [Sub-agents](/en/tools/subagents)                                                                                       |
| Search a large OpenClaw tool catalog         | [Tool Search](/en/tools/tool-search)              | [Tool Search](/en/tools/tool-search)                                                                                                                      |
| Combine several tools in one compact program | [Code Mode](/en/tools/code-mode)                  | [Code Mode](/en/tools/code-mode)                                                                                                                          |

## Choose tools, skills, or plugins

<Steps>
  <Step title="Use a tool when the agent needs to act">
    A tool is a typed function the agent can call, such as `exec`, `browser`,
    `web_search`, `message`, or `image_generate`. Use tools when the agent
    needs to read data, change files, send messages, call a provider, or
    operate another system. Visible tools are sent to the model as structured
    function definitions.

    The model only sees tools that survive the active profile, allow/deny
    policy, provider restrictions, sandbox state, channel permissions, and
    plugin availability.

  </Step>

  <Step title="Use a skill when the agent needs instructions">
    A skill is a `SKILL.md` instruction pack loaded into the agent prompt. Use
    a skill when the agent already has the tools it needs, but needs a
    repeatable workflow, review rubric, command sequence, or operating
    constraint.

    Skills can live in a workspace, shared skill directory, managed OpenClaw
    skill root, or plugin package.

    [Skills](/en/tools/skills) | [Skill Workshop](/en/tools/skill-workshop) | [Self-learning](/en/tools/self-learning) | [Creating skills](/en/tools/creating-skills) | [Skills config](/en/tools/skills-config)

  </Step>

  <Step title="Use a plugin when OpenClaw needs a new capability">
    A plugin can add tools, skills, channels, model providers, speech,
    realtime voice, media generation, web search, web fetch, hooks, and other
    runtime capabilities. Use a plugin when the capability has code,
    credentials, lifecycle hooks, manifest metadata, or installable
    packaging. Existing plugins can be installed from ClawHub, npm, git,
    local directories, or archives.

    [Install and configure plugins](/en/tools/plugin) | [Build plugins](/en/plugins/building-plugins) | [Plugin SDK](/en/plugins/sdk-overview)

  </Step>
</Steps>

## Built-in tool categories

The table lists representative tools so you can recognize the surface. It is
not the full policy reference. For exact groups, defaults, and allow/deny
semantics, use [Tools and custom providers](/en/gateway/config-tools).

| Category                | Use when the agent needs to...                                                               | Representative tools                                                                                                | Read next                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Runtime                 | Run commands, manage processes, use shared operator terminals, or use provider-backed Python | `exec`, `process`, `terminal`, `code_execution`                                                                     | [Exec](/en/tools/exec), [Control UI terminal](/en/web/control-ui#operator-terminal), [Code execution](/en/tools/code-execution) |
| Files                   | Read and change workspace files                                                              | `read`, `write`, `edit`, `apply_patch`                                                                              | [Apply patch](/en/tools/apply-patch)                                                                                      |
| Human input             | Pause for a structured decision owned by the user, or obtain a credential without seeing it  | `ask_user`, `secrets`                                                                                               | [Ask user](/en/tools/ask-user), [Secrets](/en/tools/secrets)                                                                 |
| Web                     | Search the web, search X posts, or fetch readable page content                               | `web_search`, `x_search`, `web_fetch`                                                                               | [Web tools](/en/tools/web), [Web fetch](/en/tools/web-fetch)                                                                 |
| Browser                 | Operate a browser session                                                                    | `browser`                                                                                                           | [Browser](/en/tools/browser)                                                                                              |
| Operator UI             | Arrange connected Control UI panes, panels, and navigation                                   | `screen`                                                                                                            | [Screen](/en/tools/screen)                                                                                                |
| Messaging and channels  | Send replies or channel actions                                                              | `message`                                                                                                           | [Agent send](/en/tools/agent-send)                                                                                        |
| Sessions and agents     | Inspect sessions, delegate work, orchestrate collectors, steer another run, or report status | `sessions_*`, `agents_wait`, `subagents`, `agents_list`, `session_status`, `get_goal`, `create_goal`, `update_goal` | [Goal](/en/tools/goal), [Swarm](/en/tools/swarm), [Sub-agents](/en/tools/subagents), [Session tool](/en/concepts/session-tool)     |
| Automation              | Schedule work or respond to background events                                                | `cron`, `heartbeat_respond`                                                                                         | [Automation](/en/automation)                                                                                              |
| Gateway and nodes       | Inspect Gateway state or paired target devices                                               | `gateway`, `nodes`                                                                                                  | [Gateway configuration](/en/gateway/configuration), [Nodes](/en/nodes)                                                       |
| Media                   | Analyze, generate, or speak media                                                            | `view_image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                           | [Media overview](/en/tools/media-overview)                                                                                |
| Large OpenClaw catalogs | Search, call, and combine many eligible tools without sending every schema to the model      | `exec`, `wait`, `tool_search_code`, `tool_search`, `tool_describe`                                                  | [Code Mode](/en/tools/code-mode), [Tool Search](/en/tools/tool-search)                                                       |

The `edit` tool supports targeted formatting changes, including removing trailing
spaces or replacing Unicode quotes, dashes, and spaces. These changes are applied
even when the old and new text would compare equal after fuzzy normalization.
Identical replacement requests and edits that produce unchanged content still
report no changes.

<Note>
Code Mode and Tool Search are experimental OpenClaw agent surfaces. Codex
harness runs use Codex-native code mode, native tool search, deferred dynamic
tools, and nested tool calls instead of `tools.codeMode` or `tools.toolSearch`.
</Note>

## Plugin-provided tools

Plugins can register additional tools. Plugin authors wire tools through
`api.registerTool(...)` and the manifest's `contracts.tools`; use
[Plugin SDK](/en/plugins/sdk-overview) and [Plugin manifest](/en/plugins/manifest)
for contract details.

Common plugin-provided tools include:

- [Diffs](/en/tools/diffs) for rendering file and markdown diffs
- [Show widget](/en/tools/show-widget) for self-contained inline SVG and HTML in supported chat clients
- [Screen](/en/tools/screen) for arranging a connected Control UI
- [LLM Task](/en/tools/llm-task) for JSON-only workflow steps
- [Lobster](/en/tools/lobster) for typed workflows with resumable approvals
- [Tokenjuice](/en/tools/tokenjuice) for compacting noisy `exec` and `bash` tool
  output
- [Tool Search](/en/tools/tool-search) for discovering and calling large tool
  catalogs without putting every schema in the prompt
- [Canvas](/en/plugins/reference/canvas) for the macOS widget-panel presenter and
  A2UI dashboard content

## Configure access and approvals

Tool policy is enforced before the model call. If policy removes a tool, the
model does not receive that tool's schema for the turn. A run can lose tools
because of global config, per-agent config, channel policy, provider
restrictions, sandbox rules, channel/runtime policy, or plugin availability.

OpenClaw exposes one semantic image inspection capability named `view_image`.
When the active harness supplies its own loader, OpenClaw suppresses its
duplicate. Otherwise, the OpenClaw-provided implementation accepts `path` for
one local image path or permitted URL, or `paths` for several; `maxImages`
limits the combined list and defaults to 20. Codex's native implementation
accepts one local filesystem `path`. Callers must follow the active tool schema.

Existing policy entries named `image` must be migrated to `view_image`; run
`openclaw doctor --fix` to update supported config policy surfaces and persisted
automation `toolsAllow` lists.

- [Tools and custom providers](/en/gateway/config-tools) documents tool profiles,
  allow/deny lists, provider-specific restrictions, loop detection, and
  provider-backed tool settings.
- [Exec approvals](/en/tools/exec-approvals) documents host command approval
  policy.
- [Elevated exec](/en/tools/elevated) documents controlled execution outside the
  sandbox.
- [Sandbox vs tool policy vs elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
  explains which layer controls file and process access.
- [Per-agent sandbox and tool restrictions](/en/tools/multi-agent-sandbox-tools)
  documents agent-specific restrictions for delegated runs.

## Extend capabilities

Choose the extension path by the job you need OpenClaw to do:

- Install or manage an existing plugin with [Plugins](/en/tools/plugin).
- Build a new integration, provider, channel, tool, or hook with
  [Build plugins](/en/plugins/building-plugins).
- Add or tune reusable agent instructions with [Skills](/en/tools/skills) and
  [Creating skills](/en/tools/creating-skills).
- Use [Plugin SDK](/en/plugins/sdk-overview) and
  [Plugin manifest](/en/plugins/manifest) when you need implementation
  contracts.

## Troubleshoot missing tools

Configured `tools.exec` and `tools.fs` sections do not grant tool access. The
profile migration warning suggests `alsoAllow` entries only when other active
global, agent, and provider policies permit those tools.

If the model cannot see or call a tool, start with the effective policy for
the current turn:

1. Check the active profile, `tools.allow`, and `tools.deny` in
   [Tools and custom providers](/en/gateway/config-tools).
2. Check provider-specific restrictions in
   [Tools and custom providers](/en/gateway/config-tools) and confirm the
   selected [model provider](/en/concepts/model-providers) supports the tool
   shape.
3. Check channel permissions, sandbox state, and elevated access with
   [Sandbox vs tool policy vs elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
   and [Elevated exec](/en/tools/elevated).
4. Check whether the owning plugin is installed and enabled in
   [Plugins](/en/tools/plugin).
5. For delegated runs, check per-agent restrictions in
   [Per-agent sandbox and tool restrictions](/en/tools/multi-agent-sandbox-tools).
6. For large OpenClaw catalogs, confirm whether the run uses direct tool
   exposure, [Code Mode](/en/tools/code-mode), or [Tool Search](/en/tools/tool-search).

## Related

- [Automation](/en/automation) for cron, tasks, heartbeat, hooks,
  standing orders, and Task Flow
- [Agents](/en/concepts/agent) for the agent model, sessions, memory, and
  multi-agent coordination
- [Tools and custom providers](/en/gateway/config-tools) for the canonical tool
  policy reference
- [Plugins](/en/tools/plugin) for plugin installation and management
- [Plugin SDK](/en/plugins/sdk-overview) for plugin author reference
- [Skills](/en/tools/skills) for skill load order, gating, and config
- [Skill Workshop](/en/tools/skill-workshop) for generated and reviewed skill
  creation
- [Tool Search](/en/tools/tool-search) for compact OpenClaw tool catalog
  discovery
- [Code Mode](/en/tools/code-mode) for compact JavaScript or TypeScript workflows
  over a hidden OpenClaw tool catalog
- [Swarm](/en/tools/swarm) for structured fan-out and collection from Code Mode
