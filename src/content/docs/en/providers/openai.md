---
summary: "Use OpenAI via API keys or Codex subscription in OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You want Astra async tools, mid-turn steering, or cached reasoning changes
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenClaw uses one provider id, `openai`, for both direct API-key auth and
ChatGPT/Codex subscription auth. `openai/*` is the canonical model route.
For embedded agent turns with runtime policy unset or `auto`, OpenAI's route
facts decide whether OpenClaw may select the bundled Codex app-server runtime
implicitly. The `openai/*` prefix alone does not select a runtime.

- **Agent models** - `openai/*` through the runtime selected by explicit
  `agentRuntime` config or OpenAI's implicit route policy. Sign in with Codex
  auth for ChatGPT/Codex subscription use, or configure an API-key auth
  profile when you want key-based billing.
- **Non-agent OpenAI APIs** - direct OpenAI Platform access, billed per use,
  through `OPENAI_API_KEY` or an `openai` API-key auth profile.
- **Legacy config** - `codex/*` and `openai-codex/*` refs are repaired to
  `openai/*` plus model-scoped `agentRuntime.id: "codex"` by
  `openclaw doctor --fix`.

OpenAI explicitly supports subscription OAuth usage in external tools and
workflows like OpenClaw.

This page is an index. OpenAI is documented on eight pages, one per reader
job. Open the page that matches your task.

| Page                                                                   | Read it when                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI setup](/en/providers/openai/setup)                                | You are connecting an account: the API-key and Codex subscription paths, route summaries, OAuth recovery, and the long-context opt-in. |
| [OpenAI models](/en/providers/openai/models)                              | You are choosing a model ref: the quick-choice table, GPT-6 Astra, and the GPT-5.6 tiers.                                              |
| [OpenAI runtimes and Codex auth](/en/providers/openai/runtimes)           | You need to know which runtime runs an `openai/*` turn, and how native Codex resolves its account.                                     |
| [OpenAI coverage and cost](/en/providers/openai/coverage-and-cost)        | You want the capability matrix, memory embeddings, or how subscription quota and Platform billing are reported.                        |
| [OpenAI image and video generation](/en/providers/openai/image-and-video) | You are generating or editing images and video through the bundled `openai` plugin.                                                    |
| [OpenAI voice and speech](/en/providers/openai/voice-and-speech)          | You are configuring text-to-speech, transcription, or realtime voice, including per-route auth order.                                  |
| [Azure OpenAI endpoints](/en/providers/openai/azure)                      | You are pointing the bundled `openai` provider at an Azure OpenAI resource.                                                            |
| [OpenAI advanced configuration](/en/providers/openai/advanced)            | You are tuning prompt contribution, transport, Fast mode, compaction, strict-agentic mode, or proxy compat.                            |

## Where each section moved

Every anchor the single-page version published still resolves here, so an
existing link such as `/providers/openai#implicit-agent-runtime` keeps
working. Each entry points at the page that now holds the content.

**[OpenAI setup](/en/providers/openai/setup)**

- <a id="getting-started" />[Getting started](/en/providers/openai/setup#getting-started)
- <a id="route-summary" />[Route summary](/en/providers/openai/setup#route-summary)
- <a id="config-example" />[Config example](/en/providers/openai/setup#config-example)
- <a id="route-summary-1" /><a id="route-summary-2" />[Route summary](/en/providers/openai/setup#route-summary-2)
- <a id="config-example-1" /><a id="config-example-2" />[Config example](/en/providers/openai/setup#config-example-2)
- <a id="check-and-recover-codex-oauth-routing" />[Check and recover Codex OAuth routing](/en/providers/openai/setup#check-and-recover-codex-oauth-routing)
- <a id="status-indicator" />[Status indicator](/en/providers/openai/setup#status-indicator)
- <a id="doctor-warning" />[Doctor warning](/en/providers/openai/setup#doctor-warning)
- <a id="context-window-defaults-and-long-context-opt-in" />[Context window defaults and long-context opt-in](/en/providers/openai/setup#context-window-defaults-and-long-context-opt-in)
- <a id="embedded-openclaw-translation" />[Embedded OpenClaw translation](/en/providers/openai/setup#embedded-openclaw-translation)
- <a id="native-codex-translation" />[Native Codex translation](/en/providers/openai/setup#native-codex-translation)
- <a id="catalog-recovery" />[Catalog recovery](/en/providers/openai/setup#catalog-recovery)
- <a id="api-key-openai-platform" />[API key (OpenAI Platform)](/en/providers/openai/setup#api-key-openai-platform)
- <a id="get-your-api-key" />[Get your API key](/en/providers/openai/setup#get-your-api-key)
- <a id="run-onboarding" />[Run onboarding](/en/providers/openai/setup#run-onboarding)
- <a id="verify-the-model-is-available" />[Verify the model is available](/en/providers/openai/setup#verify-the-model-is-available)
- <a id="codex-subscription" />[Codex subscription](/en/providers/openai/setup#codex-subscription)
- <a id="run-codex-oauth" />[Run Codex OAuth](/en/providers/openai/setup#run-codex-oauth)
- <a id="use-the-canonical-openai-model-route" />[Use the canonical OpenAI model route](/en/providers/openai/setup#use-the-canonical-openai-model-route)
- <a id="verify-codex-auth-is-available" />[Verify Codex auth is available](/en/providers/openai/setup#verify-codex-auth-is-available)

**[OpenAI models](/en/providers/openai/models)**

- <a id="quick-choice" />[Quick choice](/en/providers/openai/models#quick-choice)
- <a id="retired-subscription-model-references" />[Retired subscription model references](/en/providers/openai/models#retired-subscription-model-references)
- <a id="gpt-6-astra" />[GPT-6 Astra](/en/providers/openai/models#gpt-6-astra)
- <a id="async-tools%2C-steering%2C-and-reasoning-changes" /><a id="async-tools-steering-and-reasoning-changes" />[Async tools, steering, and reasoning changes](/en/providers/openai/models#async-tools-steering-and-reasoning-changes)
- <a id="gpt-5.6-limited-preview" /><a id="gpt-5-6-limited-preview" />[GPT-5.6 limited preview](/en/providers/openai/models#gpt-5-6-limited-preview)

**[OpenAI runtimes and Codex auth](/en/providers/openai/runtimes)**

- <a id="naming-map" />[Naming map](/en/providers/openai/runtimes#naming-map)
- <a id="implicit-agent-runtime" />[Implicit agent runtime](/en/providers/openai/runtimes#implicit-agent-runtime)
- <a id="native-codex-app-server-auth" />[Native Codex app-server auth](/en/providers/openai/runtimes#native-codex-app-server-auth)

**[OpenAI coverage and cost](/en/providers/openai/coverage-and-cost)**

- <a id="usage-and-cost-tracking" />[Usage and cost tracking](/en/providers/openai/coverage-and-cost#usage-and-cost-tracking)
- <a id="openclaw-feature-coverage" />[OpenClaw feature coverage](/en/providers/openai/coverage-and-cost#openclaw-feature-coverage)
- <a id="memory-embeddings" />[Memory embeddings](/en/providers/openai/coverage-and-cost#memory-embeddings)

**[OpenAI image and video generation](/en/providers/openai/image-and-video)**

- <a id="image-generation" />[Image generation](/en/providers/openai/image-and-video#image-generation)
- <a id="video-generation" />[Video generation](/en/providers/openai/image-and-video#video-generation)

**[OpenAI voice and speech](/en/providers/openai/voice-and-speech)**

- <a id="voice-and-speech" />[Voice and speech](/en/providers/openai/voice-and-speech#voice-and-speech)
- <a id="gateway-controlled-realtime-call-cleanup" />[Gateway-controlled Realtime call cleanup](/en/providers/openai/voice-and-speech#gateway-controlled-realtime-call-cleanup)
- <a id="ga-realtime-browser-authentication" />[GA Realtime browser authentication](/en/providers/openai/voice-and-speech#ga-realtime-browser-authentication)
- <a id="released-gpt-live-browser-and-gateway-relay-authentication" />[Released GPT-Live browser and Gateway relay authentication](/en/providers/openai/voice-and-speech#released-gpt-live-browser-and-gateway-relay-authentication)
- <a id="unlisted-and-private-realtime-transport-paths" />[Unlisted and private realtime transport paths](/en/providers/openai/voice-and-speech#unlisted-and-private-realtime-transport-paths)
- <a id="speech-synthesis-tts" />[Speech synthesis (TTS)](/en/providers/openai/voice-and-speech#speech-synthesis-tts)
- <a id="speech-to-text" />[Speech-to-text](/en/providers/openai/voice-and-speech#speech-to-text)
- <a id="realtime-transcription" />[Realtime transcription](/en/providers/openai/voice-and-speech#realtime-transcription)
- <a id="realtime-voice" />[Realtime voice](/en/providers/openai/voice-and-speech#realtime-voice)

**[Azure OpenAI endpoints](/en/providers/openai/azure)**

- <a id="azure-openai-endpoints" />[Azure OpenAI endpoints](/en/providers/openai/azure#azure-openai-endpoints)
- <a id="configuration" />[Configuration](/en/providers/openai/azure#configuration)
- <a id="api-version" />[API version](/en/providers/openai/azure#api-version)
- <a id="model-names-are-deployment-names" />[Model names are deployment names](/en/providers/openai/azure#model-names-are-deployment-names)
- <a id="regional-availability" />[Regional availability](/en/providers/openai/azure#regional-availability)
- <a id="parameter-differences" />[Parameter differences](/en/providers/openai/azure#parameter-differences)

**[OpenAI advanced configuration](/en/providers/openai/advanced)**

- <a id="gpt-5-prompt-contribution" />[GPT-5 prompt contribution](/en/providers/openai/advanced#gpt-5-prompt-contribution)
- <a id="advanced-configuration" />[Advanced configuration](/en/providers/openai/advanced#advanced-configuration)
- <a id="config" />[Config](/en/providers/openai/advanced#config)
- <a id="cli" />[CLI](/en/providers/openai/advanced#cli)
- <a id="transport-websocket-vs-sse" />[Transport (WebSocket vs SSE)](/en/providers/openai/advanced#transport-websocket-vs-sse)
- <a id="fast-mode" />[Fast mode](/en/providers/openai/advanced#fast-mode)
- <a id="openai-api-fast-mode-with-service-tier" />[OpenAI API Fast mode with service_tier](/en/providers/openai/advanced#openai-api-fast-mode-with-service-tier)
- <a id="server-side-compaction-responses-api" />[Server-side compaction (Responses API)](/en/providers/openai/advanced#server-side-compaction-responses-api)
- <a id="enable-explicitly" />[Enable explicitly](/en/providers/openai/advanced#enable-explicitly)
- <a id="custom-threshold" />[Custom threshold](/en/providers/openai/advanced#custom-threshold)
- <a id="disable" />[Disable](/en/providers/openai/advanced#disable)
- <a id="strict-agentic-gpt-mode" />[Strict-agentic GPT mode](/en/providers/openai/advanced#strict-agentic-gpt-mode)
- <a id="native-vs-openai-compatible-routes" />[Native vs OpenAI-compatible routes](/en/providers/openai/advanced#native-vs-openai-compatible-routes)

## Related

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    Choosing providers, model refs, and failover behavior.
  </Card>
  <Card title="Image generation" href="/en/tools/image-generation" icon="image">
    Shared image tool parameters and provider selection.
  </Card>
  <Card title="Video generation" href="/en/tools/video-generation" icon="video">
    Shared video tool parameters and provider selection.
  </Card>
  <Card title="OAuth and auth" href="/en/gateway/authentication" icon="key">
    Auth details and credential reuse rules.
  </Card>
</CardGroup>
