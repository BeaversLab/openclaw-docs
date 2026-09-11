---
summary: "Tools config (policy, experimental toggles, provider-backed tools) and custom provider/base-URL setup"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "Configuration — tools and custom providers"
sidebarTitle: "Tools and custom providers"
---

`tools.*` config keys and custom provider / base-URL setup. For agents, channels, and other top-level config keys, see [Configuration reference](/en/gateway/configuration-reference).

## What each page covers

- [Configuration — tool policy](/en/gateway/config-tools/tool-policy) — tool profiles, tool groups, the sandbox tool gate, `tools.codeMode`, and the `allow`/`deny`, `byProvider`, `toolsBySender`, and `elevated` layers.
- [Configuration — GitHub identity for agent tools](/en/gateway/config-tools/github-identity) — `tools.github`: the shared managed `gh` identity, token refresh, and the execution boundaries that receive it.
- [Configuration — built-in tool settings](/en/gateway/config-tools/built-in-tools) — `tools.exec`, `tools.loopDetection`, `tools.web`, `tools.media`, and `tools.updatePlan`.
- [Configuration — cross-agent, session, and subagent tools](/en/gateway/config-tools/sessions-and-subagents) — `tools.agentToAgent`, `tools.sessions` visibility, `tools.sessions_spawn` attachments, and `agents.defaults.subagents`.
- [Configuration — custom providers and base URLs](/en/gateway/config-tools/custom-providers) — `models.providers` registration, base-URL trust, and the provider field reference.
- [Configuration — provider examples](/en/gateway/config-tools/provider-examples) — worked configurations for Cerebras, Kimi, llama.cpp, LM Studio, MiniMax, Moonshot, OpenCode, Synthetic, and Z.AI.

## Where each section moved

Every heading this page used to publish keeps its anchor here, so an existing
link such as `/gateway/config-tools#tools-agenttoagent` still resolves. Each
entry points at the page that now holds the content.

- <a id="tools" />[Tools](/en/gateway/config-tools/tool-policy)
- <a id="tool-profiles" />[Tool profiles](/en/gateway/config-tools/tool-policy#tool-profiles)
- <a id="tool-groups" />[Tool groups](/en/gateway/config-tools/tool-policy#tool-groups)
- <a id="mcp-and-plugin-tools-inside-sandbox-tool-policy" />[MCP and plugin tools inside sandbox tool policy](/en/gateway/config-tools/tool-policy#mcp-and-plugin-tools-inside-sandbox-tool-policy)
- <a id="tools.codemode" /><a id="tools-codemode" />[`tools.codeMode`](/en/gateway/config-tools/tool-policy#tools.codemode)
- <a id="tools.allow-%2F-tools.deny" /><a id="tools-allow-/-tools-deny" />[`tools.allow` / `tools.deny`](/en/gateway/config-tools/tool-policy#tools.allow-%2F-tools.deny)
- <a id="tools.byprovider" /><a id="tools-byprovider" />[`tools.byProvider`](/en/gateway/config-tools/tool-policy#tools.byprovider)
- <a id="tools.toolsbysender" /><a id="tools-toolsbysender" />[`tools.toolsBySender`](/en/gateway/config-tools/tool-policy#tools.toolsbysender)
- <a id="tools.elevated" /><a id="tools-elevated" />[`tools.elevated`](/en/gateway/config-tools/tool-policy#tools.elevated)
- <a id="tools.github" /><a id="tools-github" />[`tools.github`](/en/gateway/config-tools/github-identity#tools.github)
- <a id="tools.exec" /><a id="tools-exec" />[`tools.exec`](/en/gateway/config-tools/built-in-tools#tools.exec)
- <a id="tools.loopdetection" /><a id="tools-loopdetection" />[`tools.loopDetection`](/en/gateway/config-tools/built-in-tools#tools.loopdetection)
- <a id="tools.web" /><a id="tools-web" />[`tools.web`](/en/gateway/config-tools/built-in-tools#tools.web)
- <a id="tools.media" /><a id="tools-media" />[`tools.media`](/en/gateway/config-tools/built-in-tools#tools.media)
- <a id="media-model-entry-fields" />[Media model entry fields](/en/gateway/config-tools/built-in-tools#media-model-entry-fields)
- <a id="toolsupdateplan" /><a id="tools.updateplan" /><a id="tools-updateplan" />[`tools.updatePlan`](/en/gateway/config-tools/built-in-tools#tools.updateplan)
- <a id="tools.agenttoagent" /><a id="tools-agenttoagent" />[`tools.agentToAgent`](/en/gateway/config-tools/sessions-and-subagents#tools.agenttoagent)
- <a id="tools.sessions" /><a id="tools-sessions" />[`tools.sessions`](/en/gateway/config-tools/sessions-and-subagents#tools.sessions)
- <a id="visibility-scopes" />[Visibility scopes](/en/gateway/config-tools/sessions-and-subagents#visibility-scopes)
- <a id="tools.sessions_spawn" /><a id="tools-sessions_spawn" />[`tools.sessions_spawn`](/en/gateway/config-tools/sessions-and-subagents#tools.sessions_spawn)
- <a id="attachment-notes" />[Attachment notes](/en/gateway/config-tools/sessions-and-subagents#attachment-notes)
- <a id="agents.defaults.subagents" /><a id="agents-defaults-subagents" />[`agents.defaults.subagents`](/en/gateway/config-tools/sessions-and-subagents#agents.defaults.subagents)
- <a id="custom-providers-and-base-urls" />[Custom providers and base URLs](/en/gateway/config-tools/custom-providers#custom-providers-and-base-urls)
- <a id="auth-and-merge-precedence" />[Auth and merge precedence](/en/gateway/config-tools/custom-providers#auth-and-merge-precedence)
- <a id="provider-field-details" />[Provider field details](/en/gateway/config-tools/custom-providers#provider-field-details)
- <a id="top-level-catalog" />[Top-level catalog](/en/gateway/config-tools/custom-providers#top-level-catalog)
- <a id="provider-connection-and-auth" />[Provider connection and auth](/en/gateway/config-tools/custom-providers#provider-connection-and-auth)
- <a id="request-transport-overrides" />[Request transport overrides](/en/gateway/config-tools/custom-providers#request-transport-overrides)
- <a id="model-catalog-entries" />[Model catalog entries](/en/gateway/config-tools/custom-providers#model-catalog-entries)
- <a id="custom-provider-capability-declarations" />[Custom provider capability declarations](/en/gateway/config-tools/custom-providers#custom-provider-capability-declarations)
- <a id="amazon-bedrock-discovery" />[Amazon Bedrock discovery](/en/gateway/config-tools/custom-providers#amazon-bedrock-discovery)
- <a id="provider-examples" />[Provider examples](/en/gateway/config-tools/provider-examples#provider-examples)
- <a id="cerebras-glm-4-7-gpt-oss" />[Cerebras (GLM 4.7 / GPT OSS)](/en/gateway/config-tools/provider-examples#cerebras-glm-4-7-gpt-oss)
- <a id="kimi-coding" />[Kimi Coding](/en/gateway/config-tools/provider-examples#kimi-coding)
- <a id="local-models-llama-cpp-llama-server" />[Local models (llama.cpp / llama-server)](/en/gateway/config-tools/provider-examples#local-models-llama-cpp-llama-server)
- <a id="local-models-lm-studio" />[Local models (LM Studio)](/en/gateway/config-tools/provider-examples#local-models-lm-studio)
- <a id="minimax-m3-direct" />[MiniMax M3 (direct)](/en/gateway/config-tools/provider-examples#minimax-m3-direct)
- <a id="moonshot-ai-kimi" />[Moonshot AI (Kimi)](/en/gateway/config-tools/provider-examples#moonshot-ai-kimi)
- <a id="opencode" />[OpenCode](/en/gateway/config-tools/provider-examples#opencode)
- <a id="synthetic-anthropic-compatible" />[Synthetic (Anthropic-compatible)](/en/gateway/config-tools/provider-examples#synthetic-anthropic-compatible)
- <a id="z-ai-glm-4-7" />[Z.AI (GLM-4.7)](/en/gateway/config-tools/provider-examples#z-ai-glm-4-7)

## Related

- [Configuration — agents](/en/gateway/config-agents)
- [Configuration — channels](/en/gateway/config-channels)
- [Configuration reference](/en/gateway/configuration-reference) — other top-level keys
- [Tools and plugins](/en/tools)
