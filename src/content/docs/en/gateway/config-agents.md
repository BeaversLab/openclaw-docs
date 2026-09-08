---
summary: "Agent defaults, multi-agent routing, session, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

Agent-scoped configuration keys under `agents.*`, `multiAgent.*`, `session.*`,
`messages.*`, and `talk.*`. For channels, tools, gateway runtime, and other
top-level keys, see [Configuration reference](/en/gateway/configuration-reference).

OpenClaw stamps `agents.ownership: "explicit"` when creating a multi-agent fleet. Such fleets have no default: channels and ambient services need bindings or surface-specific `agentId` targets. Doctor materializes legacy owners during upgrade; sole-agent configs need no marker.

On a fresh install, interactive onboarding asks for the first agent's name and
uses `main` as the suggested value. Automated onboarding keeps the historical
`main` default unless you pass `openclaw onboard --non-interactive --agent-name
<name> ...`. A sole named agent uses the same default workspace and shared auth
store as `main`; onboarding also migrates legacy `agent:main:*` session history
to that sole owner before it finishes.

`main` is an ordinary agent id. Reusing it after a named agent owns the install
is guarded so old data is never silently adopted: `legacy-session-migration-required`
means `openclaw doctor --fix` must finish or quarantine legacy `agent:main:*`
claims, while `shared-auth-store-owned-by-main` means Doctor must first relocate
the shared auth store into `state/openclaw.sqlite`. After both repairs, the new
`main` gets fresh agent-scoped session and auth storage like any other agent.

## What each page covers

- [Configuration — agent workspace and bootstrap](/en/gateway/config-agents/workspace-and-bootstrap) — workspace, cwd, repo root, skills, bootstrap injection, context budgets, images, and timezone.
- [Configuration — agent models](/en/gateway/config-agents/models) — `agents.defaults.model`, fallback chains, per-purpose model slots, and model selection scope.
- [Configuration — agent runtime and CLI backends](/en/gateway/config-agents/runtime-and-cli-backends) — runtime policy on providers and models, CLI backend selection, and GPT-5 personality.
- [Configuration — agent heartbeat, compaction, and streaming](/en/gateway/config-agents/heartbeat-compaction-and-streaming) — heartbeat runs, the system agent, compaction, context pruning, block streaming, and typing indicators.
- [Configuration — agent sandboxing](/en/gateway/config-agents/sandbox) — the `agents.defaults.sandbox` block: image, workspace mode, mounts, and network policy.
- [Configuration — per-agent entries and multi-agent routing](/en/gateway/config-agents/entries-and-multi-agent) — `agents.entries` overrides, `multiAgent` bindings, binding match fields, and access profiles.
- [Configuration — agent sessions](/en/gateway/config-agents/sessions) — `session.*` scope, identity links, reset policy, sharing, and retention.
- [Configuration — messages and talk](/en/gateway/config-agents/messages-and-talk) — `messages.*` delivery, prefixes, ack reactions, queueing, TTS, and `talk.*` defaults.

## Where each section moved

Every heading this page used to publish keeps its anchor here, so an existing
link such as `/gateway/config-agents#agents.defaults.model` still resolves. Each
entry points at the page that now holds the content.

- <a id="agent-defaults" />[Agent defaults](/en/gateway/config-agents/workspace-and-bootstrap)
- <a id="agents.defaults.workspace" /><a id="agents-defaults-workspace" />[`agents.defaults.workspace`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.workspace)
- <a id="agents.defaults.cwd" /><a id="agents-defaults-cwd" />[`agents.defaults.cwd`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.cwd)
- <a id="agents.defaults.reporoot" /><a id="agents-defaults-reporoot" />[`agents.defaults.repoRoot`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.reporoot)
- <a id="agents.defaults.skills" /><a id="agents-defaults-skills" />[`agents.defaults.skills`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.skills)
- <a id="agents.defaults.skipbootstrap" /><a id="agents-defaults-skipbootstrap" />[`agents.defaults.skipBootstrap`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.skipbootstrap)
- <a id="agents.defaults.skipoptionalbootstrapfiles" /><a id="agents-defaults-skipoptionalbootstrapfiles" />[`agents.defaults.skipOptionalBootstrapFiles`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.skipoptionalbootstrapfiles)
- <a id="agents.defaults.contextinjection" /><a id="agents-defaults-contextinjection" />[`agents.defaults.contextInjection`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.contextinjection)
- <a id="agents.defaults.bootstrapmaxchars" /><a id="agents-defaults-bootstrapmaxchars" />[`agents.defaults.bootstrapMaxChars`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.bootstrapmaxchars)
- <a id="agents.defaults.bootstraptotalmaxchars" /><a id="agents-defaults-bootstraptotalmaxchars" />[`agents.defaults.bootstrapTotalMaxChars`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.bootstraptotalmaxchars)
- <a id="per-agent-bootstrap-profile-overrides" />[Per-agent bootstrap profile overrides](/en/gateway/config-agents/workspace-and-bootstrap#per-agent-bootstrap-profile-overrides)
- <a id="bootstrap-truncation-notice" />[Bootstrap truncation notice](/en/gateway/config-agents/workspace-and-bootstrap#bootstrap-truncation-notice)
- <a id="context-budget-ownership-map" />[Context budget ownership map](/en/gateway/config-agents/workspace-and-bootstrap#context-budget-ownership-map)
- <a id="agents.defaults.startupcontext" /><a id="agents-defaults-startupcontext" />[`agents.defaults.startupContext`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.startupcontext)
- <a id="agents.defaults.contextlimits" /><a id="agents-defaults-contextlimits" />[`agents.defaults.contextLimits`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.contextlimits)
- <a id="agents.entries.*.contextlimits" /><a id="agents-entries-contextlimits" />[`agents.entries.*.contextLimits`](/en/gateway/config-agents/workspace-and-bootstrap#agents.entries.*.contextlimits)
- <a id="skills.limits.maxskillspromptchars" /><a id="skills-limits-maxskillspromptchars" />[`skills.limits.maxSkillsPromptChars`](/en/gateway/config-agents/workspace-and-bootstrap#skills.limits.maxskillspromptchars)
- <a id="agents.entries.*.skillslimits.maxskillspromptchars" /><a id="agents-entries-skillslimits-maxskillspromptchars" />[`agents.entries.*.skillsLimits.maxSkillsPromptChars`](/en/gateway/config-agents/workspace-and-bootstrap#agents.entries.*.skillslimits.maxskillspromptchars)
- <a id="agents.defaults.imagemaxdimensionpx" /><a id="agents-defaults-imagemaxdimensionpx" />[`agents.defaults.imageMaxDimensionPx`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.imagemaxdimensionpx)
- <a id="agents.defaults.imagequality" /><a id="agents-defaults-imagequality" />[`agents.defaults.imageQuality`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.imagequality)
- <a id="agents.defaults.usertimezone" /><a id="agents-defaults-usertimezone" />[`agents.defaults.userTimezone`](/en/gateway/config-agents/workspace-and-bootstrap#agents.defaults.usertimezone)
- <a id="agents.defaults.model" /><a id="agents-defaults-model" />[`agents.defaults.model`](/en/gateway/config-agents/models#agents.defaults.model)
- <a id="agentsdefaultsmodelselectionscope" />[`agents.defaults.modelSelectionScope`](/en/gateway/config-agents/models#agentsdefaultsmodelselectionscope)
- <a id="agents.defaults.modelselectionscope" /><a id="agents-defaults-modelselectionscope" />[`agents.defaults.modelSelectionScope`](/en/gateway/config-agents/models#agents.defaults.modelselectionscope)
- <a id="runtime-policy" />[Runtime policy](/en/gateway/config-agents/runtime-and-cli-backends#runtime-policy)
- <a id="cli-backend-selection" />[CLI backend selection](/en/gateway/config-agents/runtime-and-cli-backends#cli-backend-selection)
- <a id="openai-gpt-5-personality" />[OpenAI GPT-5 personality](/en/gateway/config-agents/runtime-and-cli-backends#openai-gpt-5-personality)
- <a id="agents.defaults.heartbeat" /><a id="agents-defaults-heartbeat" />[`agents.defaults.heartbeat`](/en/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.heartbeat)
- <a id="agents.defaults.systemagent" /><a id="agents-defaults-systemagent" />[`agents.defaults.systemAgent`](/en/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.systemagent)
- <a id="agents.defaults.compaction" /><a id="agents-defaults-compaction" />[`agents.defaults.compaction`](/en/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.compaction)
- <a id="agents.defaults.contextpruning" /><a id="agents-defaults-contextpruning" />[`agents.defaults.contextPruning`](/en/gateway/config-agents/heartbeat-compaction-and-streaming#agents.defaults.contextpruning)
- <a id="cache-ttl-mode-behavior" />[cache-ttl mode behavior](/en/gateway/config-agents/heartbeat-compaction-and-streaming#cache-ttl-mode-behavior)
- <a id="block-streaming" />[Block streaming](/en/gateway/config-agents/heartbeat-compaction-and-streaming#block-streaming)
- <a id="typing-indicators" />[Typing indicators](/en/gateway/config-agents/heartbeat-compaction-and-streaming#typing-indicators)
- <a id="agentsdefaultssandbox" />[`agents.defaults.sandbox`](/en/gateway/config-agents/sandbox#agentsdefaultssandbox)
- <a id="agents.defaults.sandbox" /><a id="agents-defaults-sandbox" />[`agents.defaults.sandbox`](/en/gateway/config-agents/sandbox#agents.defaults.sandbox)
- <a id="sandbox-details" />[Sandbox details](/en/gateway/config-agents/sandbox#sandbox-details)
- <a id="agentsentries-per-agent-overrides" />[`agents.entries` (per-agent overrides)](/en/gateway/config-agents/entries-and-multi-agent#agentsentries-per-agent-overrides)
- <a id="agents.entries-(per-agent-overrides)" /><a id="agents-entries-per-agent-overrides" />[`agents.entries` (per-agent overrides)](/en/gateway/config-agents/entries-and-multi-agent#agents-entries-per-agent-overrides)
- <a id="multi-agent-routing" />[Multi-agent routing](/en/gateway/config-agents/entries-and-multi-agent#multi-agent-routing)
- <a id="binding-match-fields" />[Binding match fields](/en/gateway/config-agents/entries-and-multi-agent#binding-match-fields)
- <a id="per-agent-access-profiles" />[Per-agent access profiles](/en/gateway/config-agents/entries-and-multi-agent#per-agent-access-profiles)
- <a id="full-access-no-sandbox" />[Full access (no sandbox)](/en/gateway/config-agents/entries-and-multi-agent#full-access-no-sandbox)
- <a id="read-only-tools-workspace" />[Read-only tools + workspace](/en/gateway/config-agents/entries-and-multi-agent#read-only-tools-workspace)
- <a id="no-filesystem-access-messaging-only" />[No filesystem access (messaging only)](/en/gateway/config-agents/entries-and-multi-agent#no-filesystem-access-messaging-only)
- <a id="session" />[Session](/en/gateway/config-agents/sessions#session)
- <a id="session-field-details" />[Session field details](/en/gateway/config-agents/sessions#session-field-details)
- <a id="messages" />[Messages](/en/gateway/config-agents/messages-and-talk#messages)
- <a id="response-prefix" />[Response prefix](/en/gateway/config-agents/messages-and-talk#response-prefix)
- <a id="ack-reaction" />[Ack reaction](/en/gateway/config-agents/messages-and-talk#ack-reaction)
- <a id="queue" />[Queue](/en/gateway/config-agents/messages-and-talk#queue)
- <a id="inbound-debounce" />[Inbound debounce](/en/gateway/config-agents/messages-and-talk#inbound-debounce)
- <a id="other-message-keys" />[Other message keys](/en/gateway/config-agents/messages-and-talk#other-message-keys)
- <a id="tts-(text-to-speech)" /><a id="tts-text-to-speech" />[TTS (text-to-speech)](/en/gateway/config-agents/messages-and-talk#tts-text-to-speech)
- <a id="talk" />[Talk](/en/gateway/config-agents/messages-and-talk#talk)

## Related

- [Configuration reference](/en/gateway/configuration-reference) — all other config keys
- [Configuration](/en/gateway/configuration) — common tasks and quick setup
- [Configuration examples](/en/gateway/configuration-examples)
