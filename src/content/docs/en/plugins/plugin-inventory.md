---
summary: "Generated inventory of OpenClaw plugins shipped in core, published externally, or kept source-only"
read_when:
  - You are deciding whether a plugin ships in the core npm package or installs separately
  - You are updating bundled plugin package metadata or release automation
  - You need the canonical internal vs external plugin list
title: "Plugin inventory"
---

# Plugin inventory

This page is generated from top-level `extensions/*/openclaw.plugin.json`
manifests and the root npm package `files` exclusions. Optional `package.json`
metadata enriches package and distribution details. Regenerate it with:

```bash
pnpm plugins:inventory:gen
```

## Definitions

- **Core npm package:** built into the `openclaw` npm package and available without a separate plugin install.
- **Official external package:** OpenClaw-maintained plugin omitted from the core npm package, kept in this official inventory, and installed on demand through ClawHub and/or npm.
- **Source checkout only:** repo-local plugin omitted from published npm artifacts and not advertised as an installable package.

Source checkouts are different from npm installs: after `pnpm install`, bundled
plugins load from `extensions/<id>` so local edits and package-local workspace
dependencies are available.

## Install a plugin

Use the install route in each entry to decide whether install is needed. Plugins
that say `included in OpenClaw` are already present in the core package.
Official external packages need one install, then a Gateway restart.

For example, Discord is an official external package:

```bash
openclaw plugins install @openclaw/discord
openclaw gateway restart
openclaw plugins inspect discord --runtime --json
```

During the launch cutover, ordinary bare package specs still install from npm.
Use `clawhub:@openclaw/discord` or `npm:@openclaw/discord` when you need an
explicit source. After install, follow the plugin's setup doc, such as
[Discord](/en/channels/discord), to add credentials and channel config. See
[Manage plugins](/en/plugins/manage-plugins) for update, uninstall, and publishing
commands.

Each entry lists the package, distribution route, and description.

## Core npm package

59 plugins

- **[a2a](/en/plugins/reference/a2a)** (`@openclaw/a2a`) - included in OpenClaw. A2A v1.0 Agent-to-Agent protocol channel plugin.

- **[active-memory](/en/plugins/reference/active-memory)** (`openclaw`) - included in OpenClaw. Runs bounded pre-reply memory retrieval and implements per-agent Remember across conversations for eligible private conversations.

- **[admin-http-rpc](/en/plugins/reference/admin-http-rpc)** (`@openclaw/admin-http-rpc`) - included in OpenClaw. OpenClaw admin HTTP RPC endpoint.

- **[alibaba](/en/plugins/reference/alibaba)** (`@openclaw/alibaba-provider`) - included in OpenClaw. Adds video generation provider support.

- **[anthropic](/en/plugins/reference/anthropic)** (`@openclaw/anthropic-provider`) - included in OpenClaw. Anthropic models, Claude CLI, and native Claude session catalog.

- **[azure-speech](/en/plugins/reference/azure-speech)** (`@openclaw/azure-speech`) - included in OpenClaw. Azure AI Speech text-to-speech (MP3, native Ogg/Opus voice notes, PCM telephony).

- **[beam](/en/plugins/reference/beam)** (`@openclaw/beam`) - included in OpenClaw. Read-only coding-session Beam receiver.

- **[bonjour](/en/plugins/reference/bonjour)** (`@openclaw/bonjour`) - included in OpenClaw. Advertise the local OpenClaw gateway over Bonjour/mDNS.

- **[browser](/en/plugins/reference/browser)** (`@openclaw/browser-plugin`) - included in OpenClaw. Adds agent-callable tools.

- **[canvas](/en/plugins/reference/canvas)** (`@openclaw/canvas-plugin`) - included in OpenClaw. Presents hosted widget documents on paired macOS panels.

- **[clawrouter](/en/plugins/reference/clawrouter)** (`@openclaw/clawrouter`) - included in OpenClaw. Adds ClawRouter model provider support to OpenClaw.

- **[copilot-proxy](/en/plugins/reference/copilot-proxy)** (`@openclaw/copilot-proxy`) - included in OpenClaw. Adds Copilot Proxy model provider support to OpenClaw.

- **[crabbox](/en/plugins/reference/crabbox)** (`@openclaw/crabbox-provider`) - included in OpenClaw. Cloud worker provider backed by the Crabbox CLI.

- **[cua-computer](/en/plugins/reference/cua-computer)** (`@openclaw/cua-computer`) - included in OpenClaw. Experimental CUA Driver computer control for macOS, Windows, and Linux node hosts.

- **[deepgram](/en/plugins/reference/deepgram)** (`@openclaw/deepgram-provider`) - included in OpenClaw. Adds media understanding provider support. Adds realtime transcription provider support.

- **[device-pair](/en/plugins/reference/device-pair)** (`openclaw`) - included in OpenClaw. Generate setup codes and approve device pairing requests.

- **[document-extract](/en/plugins/reference/document-extract)** (`@openclaw/document-extract-plugin`) - included in OpenClaw. Extract text and fallback page images from local document attachments.

- **[elevenlabs](/en/plugins/reference/elevenlabs)** (`@openclaw/elevenlabs-speech`) - included in OpenClaw. Adds media understanding provider support. Adds realtime transcription provider support. Adds text-to-speech provider support.

- **[fal](/en/plugins/reference/fal)** (`@openclaw/fal-provider`) - included in OpenClaw. Adds fal model provider support to OpenClaw.

- **[file-transfer](/en/plugins/reference/file-transfer)** (`@openclaw/file-transfer`) - included in OpenClaw. Fetch, list, and write files on paired nodes via dedicated node commands. Bypasses bash stdout truncation by using base64 over node.invoke for binaries up to 16 MB.

- **[geolocation](/en/plugins/reference/geolocation)** (`@openclaw/geolocation-plugin`) - included in OpenClaw. Resolves client IP addresses to a coarse city using a locally cached IP-geolocation database.

- **[github-copilot](/en/plugins/reference/github-copilot)** (`@openclaw/github-copilot-provider`) - included in OpenClaw. Adds GitHub Copilot model provider support to OpenClaw.

- **[google](/en/plugins/reference/google)** (`@openclaw/google-plugin`) - included in OpenClaw. Adds Google, Google Gemini CLI, Google Vertex model provider support to OpenClaw.

- **[huggingface](/en/plugins/reference/huggingface)** (`@openclaw/huggingface-provider`) - included in OpenClaw. Adds Hugging Face model provider support to OpenClaw.

- **[imap](/en/plugins/reference/imap)** (`@openclaw/imap`) - included in OpenClaw. Watch IMAP mailboxes and dispatch authenticated incoming email to isolated agent sessions.

- **[linux-node](/en/plugins/reference/linux-node)** (`@openclaw/linux-node`) - included in OpenClaw. Desktop notifications, camera capture, and location for Linux node hosts.

- **[litellm](/en/plugins/reference/litellm)** (`@openclaw/litellm-provider`) - included in OpenClaw. Adds LiteLLM model provider support to OpenClaw.

- **[llm-task](/en/plugins/reference/llm-task)** (`@openclaw/llm-task`) - included in OpenClaw. Generic JSON-only LLM tool for structured tasks callable from workflows.

- **[lmstudio](/en/plugins/reference/lmstudio)** (`@openclaw/lmstudio-provider`) - included in OpenClaw. Adds LM Studio model provider support to OpenClaw.

- **[logbook](/en/plugins/reference/logbook)** (`@openclaw/logbook`) - included in OpenClaw. Automatic work journal: captures periodic screen snapshots from a paired node and turns them into a reviewable timeline of your day.

- **[memory-core](/en/plugins/reference/memory-core)** (`@openclaw/memory-core`) - included in OpenClaw. Adds agent-callable tools.

- **[memory-wiki](/en/plugins/reference/memory-wiki)** (`@openclaw/memory-wiki`) - included in OpenClaw. Persistent wiki compiler and Obsidian-friendly knowledge vault for OpenClaw.

- **[microsoft](/en/plugins/reference/microsoft)** (`@openclaw/microsoft-speech`) - included in OpenClaw. Adds text-to-speech provider support.

- **[microsoft-foundry](/en/plugins/reference/microsoft-foundry)** (`@openclaw/microsoft-foundry`) - included in OpenClaw. Adds Microsoft Foundry model provider support to OpenClaw.

- **[migrate-claude](/en/plugins/reference/migrate-claude)** (`@openclaw/migrate-claude`) - included in OpenClaw. Imports Claude Code and Claude Desktop instructions, MCP servers, skills, and safe configuration into OpenClaw.

- **[migrate-hermes](/en/plugins/reference/migrate-hermes)** (`@openclaw/migrate-hermes`) - included in OpenClaw. Imports Hermes configuration, memories, skills, and supported credentials into OpenClaw.

- **[minimax](/en/plugins/reference/minimax)** (`@openclaw/minimax-provider`) - included in OpenClaw. Adds MiniMax, MiniMax Portal model provider support to OpenClaw.

- **[nvidia](/en/plugins/reference/nvidia)** (`@openclaw/nvidia-provider`) - included in OpenClaw. Adds NVIDIA model provider support to OpenClaw.

- **[oc-path](/en/plugins/reference/oc-path)** (`@openclaw/oc-path`) - included in OpenClaw. Adds the openclaw path CLI for oc:// workspace file addressing.

- **[ollama](/en/plugins/reference/ollama)** (`@openclaw/ollama-provider`) - included in OpenClaw. Adds Ollama, Ollama Cloud model provider support to OpenClaw.

- **[onepassword](/en/plugins/reference/onepassword)** (`@openclaw/onepassword`) - included in OpenClaw. 1Password SecretRef resolver and curated agent broker with approval policy and SQLite audit history.

- **[openai](/en/plugins/reference/openai)** (`@openclaw/openai-provider`) - included in OpenClaw. Adds OpenAI model provider support to OpenClaw.

- **[opencode-go](/en/plugins/reference/opencode-go)** (`@openclaw/opencode-go-provider`) - included in OpenClaw. Adds OpenCode Go model provider support to OpenClaw.

- **[openrouter](/en/plugins/reference/openrouter)** (`@openclaw/openrouter-provider`) - included in OpenClaw. Adds OpenRouter model provider support to OpenClaw.

- **[policy](/en/plugins/reference/policy)** (`@openclaw/policy`) - included in OpenClaw. Adds policy-backed doctor checks for workspace conformance.

- **[reef](/en/plugins/reference/reef)** (`@openclaw/reef`) - included in OpenClaw. Guarded end-to-end encrypted claw channel.

- **[runway](/en/plugins/reference/runway)** (`@openclaw/runway-provider`) - included in OpenClaw. Adds video generation provider support.

- **[senseaudio](/en/plugins/reference/senseaudio)** (`@openclaw/senseaudio-provider`) - included in OpenClaw. Adds media understanding provider support.

- **[sglang](/en/plugins/reference/sglang)** (`@openclaw/sglang-provider`) - included in OpenClaw. Adds SGLang model provider support to OpenClaw.

- **[talk-voice](/en/plugins/reference/talk-voice)** (`openclaw`) - included in OpenClaw. Manage Talk voice selection (list/set).

- **[telegram](/en/plugins/reference/telegram)** (`@openclaw/telegram`) - included in OpenClaw. Adds the Telegram channel surface for sending and receiving OpenClaw messages.

- **[together](/en/plugins/reference/together)** (`@openclaw/together-provider`) - included in OpenClaw. Adds Together model provider support to OpenClaw.

- **[tts-local-cli](/en/plugins/reference/tts-local-cli)** (`@openclaw/tts-local-cli`) - included in OpenClaw. Adds text-to-speech provider support.

- **[vault](/en/plugins/reference/vault)** (`@openclaw/vault`) - included in OpenClaw. HashiCorp Vault SecretRef provider integration.

- **[vllm](/en/plugins/reference/vllm)** (`@openclaw/vllm-provider`) - included in OpenClaw. Adds vLLM model provider support to OpenClaw.

- **[web-readability](/en/plugins/reference/web-readability)** (`@openclaw/web-readability-plugin`) - included in OpenClaw. Extract readable article content from local HTML web fetch responses.

- **[webhooks](/en/plugins/reference/webhooks)** (`@openclaw/webhooks`) - included in OpenClaw. Authenticated inbound webhooks that bind external automation to OpenClaw TaskFlows.

- **[workboard](/en/plugins/reference/workboard)** (`@openclaw/workboard`) - included in OpenClaw. Dashboard workboard for agent-owned issues and sessions.

- **[xai](/en/plugins/reference/xai)** (`@openclaw/xai-plugin`) - included in OpenClaw. Adds xAI model provider support to OpenClaw.

## Official external packages

90 plugins

- **[acpx](/en/plugins/reference/acpx)** (`@openclaw/acpx`) - npm; ClawHub. OpenClaw ACP runtime backend with plugin-owned session and transport management.

- **[amazon-bedrock](/en/plugins/reference/amazon-bedrock)** (`@openclaw/amazon-bedrock-provider`) - npm; ClawHub. OpenClaw Amazon Bedrock provider plugin with model discovery, embeddings, and guardrail support.

- **[amazon-bedrock-mantle](/en/plugins/reference/amazon-bedrock-mantle)** (`@openclaw/amazon-bedrock-mantle-provider`) - npm; ClawHub. OpenClaw Amazon Bedrock Mantle provider plugin for OpenAI-compatible model routing.

- **[anthropic-vertex](/en/plugins/reference/anthropic-vertex)** (`@openclaw/anthropic-vertex-provider`) - npm; ClawHub. OpenClaw Anthropic Vertex provider plugin for Claude models on Google Vertex AI.

- **[arcee](/en/plugins/reference/arcee)** (`@openclaw/arcee-provider`) - npm; ClawHub: `clawhub:@openclaw/arcee-provider`. Adds Arcee model provider support to OpenClaw.

- **[baseten](/en/plugins/reference/baseten)** (`@openclaw/baseten-provider`) - npm; ClawHub: `clawhub:@openclaw/baseten-provider`. OpenClaw Baseten provider plugin.

- **[brave](/en/plugins/reference/brave)** (`@openclaw/brave-plugin`) - npm; ClawHub. OpenClaw Brave Search provider plugin for web search.

- **[buzz](/en/plugins/reference/buzz)** (`@openclaw/buzz`) - npm; ClawHub: `clawhub:@openclaw/buzz`. Connect OpenClaw agents to Buzz rooms.

- **[byteplus](/en/plugins/reference/byteplus)** (`@openclaw/byteplus-provider`) - npm; ClawHub: `clawhub:@openclaw/byteplus-provider`. Adds BytePlus, BytePlus Plan model provider support to OpenClaw.

- **[cerebras](/en/plugins/reference/cerebras)** (`@openclaw/cerebras-provider`) - npm; ClawHub: `clawhub:@openclaw/cerebras-provider`. Adds Cerebras model provider support to OpenClaw.

- **[chutes](/en/plugins/reference/chutes)** (`@openclaw/chutes-provider`) - npm; ClawHub: `clawhub:@openclaw/chutes-provider`. Adds Chutes model provider support to OpenClaw.

- **[clickclack](/en/plugins/reference/clickclack)** (`@openclaw/clickclack`) - npm; ClawHub: `clawhub:@openclaw/clickclack`. Adds the Clickclack channel surface for sending and receiving OpenClaw messages.

- **[cloudflare-ai-gateway](/en/plugins/reference/cloudflare-ai-gateway)** (`@openclaw/cloudflare-ai-gateway-provider`) - npm; ClawHub: `clawhub:@openclaw/cloudflare-ai-gateway-provider`. Adds Cloudflare AI Gateway model provider support to OpenClaw.

- **[codex](/en/plugins/reference/codex)** (`@openclaw/codex`) - npm; ClawHub. Codex app-server harness and native session catalog.

- **[cohere](/en/plugins/reference/cohere)** (`@openclaw/cohere-provider`) - npm; ClawHub: `clawhub:@openclaw/cohere-provider`. OpenClaw Cohere provider plugin.

- **[comfy](/en/plugins/reference/comfy)** (`@openclaw/comfy-provider`) - npm; ClawHub: `clawhub:@openclaw/comfy-provider`. Adds ComfyUI model provider support to OpenClaw.

- **[copilot](/en/plugins/reference/copilot)** (`@openclaw/copilot`) - npm; ClawHub: `clawhub:@openclaw/copilot`. Registers the GitHub Copilot agent runtime.

- **[deepinfra](/en/plugins/reference/deepinfra)** (`@openclaw/deepinfra-provider`) - npm; ClawHub: `clawhub:@openclaw/deepinfra-provider`. Adds DeepInfra model provider support to OpenClaw.

- **[deepseek](/en/plugins/reference/deepseek)** (`@openclaw/deepseek-provider`) - npm; ClawHub: `clawhub:@openclaw/deepseek-provider`. Adds DeepSeek model provider support to OpenClaw.

- **[diagnostics-otel](/en/plugins/reference/diagnostics-otel)** (`@openclaw/diagnostics-otel`) - npm; ClawHub: `clawhub:@openclaw/diagnostics-otel`. OpenClaw diagnostics OpenTelemetry exporter for metrics, traces, and logs.

- **[diagnostics-prometheus](/en/plugins/reference/diagnostics-prometheus)** (`@openclaw/diagnostics-prometheus`) - npm; ClawHub: `clawhub:@openclaw/diagnostics-prometheus`. OpenClaw diagnostics Prometheus exporter for runtime metrics.

- **[diffs](/en/plugins/reference/diffs)** (`@openclaw/diffs`) - npm; ClawHub: `clawhub:@openclaw/diffs`. OpenClaw read-only diff viewer plugin and file renderer for agents.

- **[diffs-language-pack](/en/plugins/reference/diffs-language-pack)** (`@openclaw/diffs-language-pack`) - npm; ClawHub: `clawhub:@openclaw/diffs-language-pack`. Adds syntax highlighting for languages outside the default diffs viewer set.

- **[discord](/en/plugins/reference/discord)** (`@openclaw/discord`) - npm; ClawHub. OpenClaw Discord channel plugin for channels, DMs, commands, and app events.

- **[duckduckgo](/en/plugins/reference/duckduckgo)** (`@openclaw/duckduckgo-plugin`) - npm; ClawHub: `clawhub:@openclaw/duckduckgo-plugin`. Adds web search provider support.

- **[exa](/en/plugins/reference/exa)** (`@openclaw/exa-plugin`) - npm; ClawHub: `clawhub:@openclaw/exa-plugin`. Adds web search provider support.

- **[featherless](/en/plugins/reference/featherless)** (`@openclaw/featherless-provider`) - npm; ClawHub: `clawhub:@openclaw/featherless-provider`. OpenClaw Featherless AI provider plugin.

- **[feishu](/en/plugins/reference/feishu)** (`@openclaw/feishu`) - npm; ClawHub. OpenClaw Feishu/Lark channel plugin for chats and workplace tools (community maintained by @m1heng).

- **[firecrawl](/en/plugins/reference/firecrawl)** (`@openclaw/firecrawl-plugin`) - npm; ClawHub: `clawhub:@openclaw/firecrawl-plugin`. Adds agent-callable tools. Adds web fetch provider support. Adds web search provider support.

- **[fireworks](/en/plugins/reference/fireworks)** (`@openclaw/fireworks-provider`) - npm; ClawHub: `clawhub:@openclaw/fireworks-provider`. Adds Fireworks model provider support to OpenClaw.

- **[fish-audio-speech](/en/plugins/reference/fish-audio-speech)** (`@openclaw/fish-audio-speech`) - npm; ClawHub: `clawhub:@openclaw/fish-audio-speech`. Fish Audio S2.1 hosted text-to-speech with streaming, voice notes, and telephony output.

- **[gmi](/en/plugins/reference/gmi)** (`@openclaw/gmi-provider`) - npm; ClawHub: `clawhub:@openclaw/gmi-provider`. OpenClaw GMI Cloud provider plugin.

- **[google-meet](/en/plugins/reference/google-meet)** (`@openclaw/google-meet`) - npm; ClawHub. OpenClaw Google Meet participant plugin for joining calls through Chrome or Twilio transports.

- **[googlechat](/en/plugins/reference/googlechat)** (`@openclaw/googlechat`) - npm; ClawHub. OpenClaw Google Chat channel plugin for spaces and direct messages.

- **[gradium](/en/plugins/reference/gradium)** (`@openclaw/gradium-speech`) - npm; ClawHub: `clawhub:@openclaw/gradium-speech`. Adds text-to-speech provider support.

- **[groq](/en/plugins/reference/groq)** (`@openclaw/groq-provider`) - npm; ClawHub: `clawhub:@openclaw/groq-provider`. Adds Groq model provider support to OpenClaw.

- **[imessage](/en/plugins/reference/imessage)** (`@openclaw/imessage`) - npm; ClawHub: `clawhub:@openclaw/imessage`. Adds the iMessage channel surface for sending and receiving OpenClaw messages.

- **[inworld](/en/plugins/reference/inworld)** (`@openclaw/inworld-speech`) - npm; ClawHub: `clawhub:@openclaw/inworld-speech`. Inworld streaming text-to-speech (MP3, OGG_OPUS, PCM telephony).

- **[irc](/en/plugins/reference/irc)** (`@openclaw/irc`) - npm; ClawHub: `clawhub:@openclaw/irc`. Adds the IRC channel surface for sending and receiving OpenClaw messages.

- **[kilocode](/en/plugins/reference/kilocode)** (`@openclaw/kilocode-provider`) - npm; ClawHub: `clawhub:@openclaw/kilocode-provider`. Adds Kilocode model provider support to OpenClaw.

- **[kimi](/en/plugins/reference/kimi)** (`@openclaw/kimi-provider`) - npm; ClawHub: `clawhub:@openclaw/kimi-provider`. Adds Kimi, Kimi Coding model provider support to OpenClaw.

- **[line](/en/plugins/reference/line)** (`@openclaw/line`) - npm; ClawHub. OpenClaw LINE channel plugin for LINE Bot API chats.

- **[llama-cpp](/en/plugins/reference/llama-cpp)** (`@openclaw/llama-cpp-provider`) - npm; ClawHub. Managed and external llama.cpp servers for GGUF chat and embeddings.

- **[lobster](/en/plugins/reference/lobster)** (`@openclaw/lobster`) - npm; ClawHub. Lobster workflow tool plugin for typed pipelines and resumable approvals.

- **[longcat](/en/plugins/reference/longcat)** (`@openclaw/longcat-provider`) - npm; ClawHub: `clawhub:@openclaw/longcat-provider`. OpenClaw LongCat provider plugin.

- **[matrix](/en/plugins/reference/matrix)** (`@openclaw/matrix`) - ClawHub: `clawhub:@openclaw/matrix`; npm. OpenClaw Matrix channel plugin for rooms and direct messages.

- **[mattermost](/en/plugins/reference/mattermost)** (`@openclaw/mattermost`) - npm; ClawHub: `clawhub:@openclaw/mattermost`. Adds the Mattermost channel surface for sending and receiving OpenClaw messages.

- **[memory-lancedb](/en/plugins/reference/memory-lancedb)** (`@openclaw/memory-lancedb`) - npm; ClawHub. OpenClaw LanceDB-backed long-term memory plugin with auto-recall, auto-capture, and vector search.

- **[meta](/en/plugins/reference/meta)** (`@openclaw/meta-provider`) - npm; ClawHub: `clawhub:@openclaw/meta-provider`. Adds Meta model provider support to OpenClaw.

- **[mistral](/en/plugins/reference/mistral)** (`@openclaw/mistral-provider`) - npm; ClawHub: `clawhub:@openclaw/mistral-provider`. Adds Mistral model provider support to OpenClaw.

- **[moonshot](/en/plugins/reference/moonshot)** (`@openclaw/moonshot-provider`) - npm; ClawHub: `clawhub:@openclaw/moonshot-provider`. Adds Moonshot model provider support to OpenClaw.

- **[msteams](/en/plugins/reference/msteams)** (`@openclaw/msteams`) - npm; ClawHub. OpenClaw Microsoft Teams channel plugin for bot conversations.

- **[mxc](/en/plugins/reference/mxc)** (`@openclaw/mxc-sandbox`) - npm; ClawHub. OS-level sandboxed tool execution via MXC: runs commands in a Windows ProcessContainer with configured MXC policy files.

- **[nextcloud-talk](/en/plugins/reference/nextcloud-talk)** (`@openclaw/nextcloud-talk`) - npm; ClawHub. OpenClaw Nextcloud Talk channel plugin for conversations.

- **[nostr](/en/plugins/reference/nostr)** (`@openclaw/nostr`) - npm; ClawHub. OpenClaw Nostr channel plugin for NIP-04 encrypted direct messages.

- **[novita](/en/plugins/reference/novita)** (`@openclaw/novita-provider`) - npm; ClawHub: `clawhub:@openclaw/novita-provider`. Adds Novita, Novita AI, Novitaai model provider support to OpenClaw.

- **[opencode](/en/plugins/reference/opencode)** (`@openclaw/opencode-provider`) - npm; ClawHub: `clawhub:@openclaw/opencode-provider`. Adds OpenCode model provider support to OpenClaw.

- **[openshell](/en/plugins/reference/openshell)** (`@openclaw/openshell-sandbox`) - npm; ClawHub. OpenClaw sandbox backend for the NVIDIA OpenShell CLI with mirrored local workspaces and SSH command execution.

- **[parallel](/en/tools/parallel-search)** (`@openclaw/parallel-plugin`) - npm; ClawHub: `clawhub:@openclaw/parallel-plugin`. Adds web search provider support.

- **[perplexity](/en/plugins/reference/perplexity)** (`@openclaw/perplexity-plugin`) - npm; ClawHub: `clawhub:@openclaw/perplexity-plugin`. Adds web search provider support.

- **[pixverse](/en/plugins/reference/pixverse)** (`@openclaw/pixverse-provider`) - npm; ClawHub: `clawhub:@openclaw/pixverse-provider`. OpenClaw PixVerse video generation provider plugin.

- **[qianfan](/en/plugins/reference/qianfan)** (`@openclaw/qianfan-provider`) - npm; ClawHub: `clawhub:@openclaw/qianfan-provider`. Adds Qianfan model provider support to OpenClaw.

- **[qqbot](/en/plugins/reference/qqbot)** (`@tencent-connect/openclaw-qqbot`) - npm. OpenClaw QQ Bot channel plugin for group and direct-message workflows.

- **[qwen](/en/plugins/reference/qwen)** (`@openclaw/qwen-provider`) - npm; ClawHub: `clawhub:@openclaw/qwen-provider`. Adds Qwen, Qwen Cloud, Model Studio, DashScope, Qwen Token Plan, Bailian Token Plan model provider support to OpenClaw.

- **[raft](/en/plugins/reference/raft)** (`@openclaw/raft`) - npm; ClawHub. OpenClaw Raft channel plugin for secure CLI wake bridges.

- **[searxng](/en/plugins/reference/searxng)** (`@openclaw/searxng-plugin`) - npm; ClawHub: `clawhub:@openclaw/searxng-plugin`. Adds web search provider support.

- **[signal](/en/plugins/reference/signal)** (`@openclaw/signal`) - npm; ClawHub: `clawhub:@openclaw/signal`. Adds the Signal channel surface for sending and receiving OpenClaw messages.

- **[slack](/en/plugins/reference/slack)** (`@openclaw/slack`) - npm; ClawHub. OpenClaw Slack channel plugin for channels, DMs, commands, and app events.

- **[sms](/en/plugins/reference/sms)** (`@openclaw/sms`) - npm; ClawHub: `clawhub:@openclaw/sms`. Twilio SMS/MMS channel plugin for OpenClaw messages.

- **[stepfun](/en/plugins/reference/stepfun)** (`@openclaw/stepfun-provider`) - npm; ClawHub: `clawhub:@openclaw/stepfun-provider`. Adds StepFun, StepFun Plan model provider support to OpenClaw.

- **[synology-chat](/en/plugins/reference/synology-chat)** (`@openclaw/synology-chat`) - npm; ClawHub. Synology Chat channel plugin for OpenClaw channels and direct messages.

- **[synthetic](/en/plugins/reference/synthetic)** (`@openclaw/synthetic-provider`) - npm; ClawHub: `clawhub:@openclaw/synthetic-provider`. Adds Synthetic model provider support to OpenClaw.

- **[tavily](/en/plugins/reference/tavily)** (`@openclaw/tavily-plugin`) - npm; ClawHub: `clawhub:@openclaw/tavily-plugin`. Adds agent-callable tools. Adds web search provider support.

- **[teams-meetings](/en/plugins/reference/teams-meetings)** (`@openclaw/teams-meetings`) - npm; ClawHub: `clawhub:@openclaw/teams-meetings`. Join Microsoft Teams meetings as a Chrome browser guest.

- **[tencent](/en/plugins/reference/tencent)** (`@openclaw/tencent-provider`) - npm; ClawHub: `clawhub:@openclaw/tencent-provider`. Adds Tencent TokenHub, Tencent Tokenplan model provider support to OpenClaw.

- **[tlon](/en/plugins/reference/tlon)** (`@openclaw/tlon`) - npm; ClawHub. OpenClaw Tlon/Urbit channel plugin for chat workflows.

- **[tokenjuice](/en/plugins/reference/tokenjuice)** (`@openclaw/tokenjuice`) - npm; ClawHub: `clawhub:@openclaw/tokenjuice`. Compacts exec and bash tool results with tokenjuice reducers.

- **[twitch](/en/plugins/reference/twitch)** (`@openclaw/twitch`) - npm; ClawHub. OpenClaw Twitch channel plugin for chat and moderation workflows.

- **[venice](/en/plugins/reference/venice)** (`@openclaw/venice-provider`) - npm; ClawHub: `clawhub:@openclaw/venice-provider`. Adds Venice model provider support to OpenClaw.

- **[vercel-ai-gateway](/en/plugins/reference/vercel-ai-gateway)** (`@openclaw/vercel-ai-gateway-provider`) - npm; ClawHub: `clawhub:@openclaw/vercel-ai-gateway-provider`. Adds Vercel AI Gateway model provider support to OpenClaw.

- **[voice-call](/en/plugins/reference/voice-call)** (`@openclaw/voice-call`) - npm; ClawHub. OpenClaw voice-call plugin for Twilio, Telnyx, and Plivo phone calls.

- **[volcengine](/en/plugins/reference/volcengine)** (`@openclaw/volcengine-provider`) - npm; ClawHub: `clawhub:@openclaw/volcengine-provider`. Adds Volcengine, Volcengine Plan model provider support to OpenClaw.

- **[voyage](/en/plugins/reference/voyage)** (`@openclaw/voyage-provider`) - npm; ClawHub: `clawhub:@openclaw/voyage-provider`. Adds embedding provider support, including memory search.

- **[vydra](/en/plugins/reference/vydra)** (`@openclaw/vydra-provider`) - npm; ClawHub: `clawhub:@openclaw/vydra-provider`. Adds Vydra model provider support to OpenClaw.

- **[whatsapp](/en/plugins/reference/whatsapp)** (`@openclaw/whatsapp`) - ClawHub: `clawhub:@openclaw/whatsapp`; npm. OpenClaw WhatsApp channel plugin for WhatsApp Web chats.

- **[xiaomi](/en/plugins/reference/xiaomi)** (`@openclaw/xiaomi-provider`) - npm; ClawHub: `clawhub:@openclaw/xiaomi-provider`. Adds Xiaomi, Xiaomi Token Plan model provider support to OpenClaw.

- **[zai](/en/plugins/reference/zai)** (`@openclaw/zai-provider`) - npm; ClawHub: `clawhub:@openclaw/zai-provider`. Adds Z.AI model provider support to OpenClaw.

- **[zalo](/en/plugins/reference/zalo)** (`@openclaw/zalo`) - npm; ClawHub. OpenClaw Zalo channel plugin for bot and webhook chats.

- **[zalouser](/en/plugins/reference/zalouser)** (`@openclaw/zalouser`) - npm; ClawHub. OpenClaw Zalo Personal Account plugin via native zca-js integration.

- **[zoom-meetings](/en/plugins/reference/zoom-meetings)** (`@openclaw/zoom-meetings`) - npm; ClawHub: `clawhub:@openclaw/zoom-meetings`. Join Zoom meetings as a Chrome browser guest.

## Source checkout only

2 plugins

- **[qa-channel](/en/plugins/reference/qa-channel)** (`@openclaw/qa-channel`) - source checkout only. Adds the QA Channel surface for sending and receiving OpenClaw messages.

- **[qa-lab](/en/plugins/reference/qa-lab)** (`@openclaw/qa-lab`) - source checkout only. OpenClaw QA lab plugin with private debugger UI and scenario runner.
