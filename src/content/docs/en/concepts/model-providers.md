---
summary: "Index of the model provider reference: quick rules, Control UI and keys, bundled provider plugins, and custom providers"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Model providers"
sidebarTitle: "Model providers"
---

Reference for **LLM/model providers** (not chat channels like WhatsApp/Telegram). For model selection rules, see [Models](/en/concepts/models).

This page is an index. The provider reference is documented on four pages, one
per reader job. Open the page that matches your task.

| Page                                                                              | Read it when                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Quick rules](/en/concepts/model-providers/quick-rules)                              | You need model refs, CLI helpers, or the rules that decide your primary model and OpenAI runtime.                   |
| [Control UI and API keys](/en/concepts/model-providers/control-ui-and-keys)          | You are configuring providers from Settings -> Models, or setting up multiple API keys and rotation.                |
| [Official provider plugins](/en/concepts/model-providers/official-provider-plugins)  | You are setting up a bundled provider, or need its id, auth env, example model, and quirks.                         |
| [Custom providers and local runtimes](/en/concepts/model-providers/custom-providers) | You are configuring a provider through `models.providers`, a custom base URL, a proxy, or a local inference server. |

## Where each section moved

Every section heading from the previous single-page version keeps its anchor
here, so an existing link such as `/concepts/model-providers#byteplus-international` still resolves.
Each entry points at the page that now holds the content.

- <a id="quick-rules" />[Quick rules](/en/concepts/model-providers/quick-rules#quick-rules)
- <a id="model-refs-and-cli-helpers" />[Model refs and CLI helpers](/en/concepts/model-providers/quick-rules#model-refs-and-cli-helpers)
- <a id="adding-provider-auth-does-not-change-your-primary-model" />[Adding provider auth does not change your primary model](/en/concepts/model-providers/quick-rules#adding-provider-auth-does-not-change-your-primary-model)
- <a id="openai-provider-runtime-split" />[OpenAI provider/runtime split](/en/concepts/model-providers/quick-rules#openai-provider-runtime-split)
- <a id="cli-runtimes" />[CLI runtimes](/en/concepts/model-providers/quick-rules#cli-runtimes)
- <a id="configure-providers-in-the-control-ui" />[Configure providers in the Control UI](/en/concepts/model-providers/control-ui-and-keys#configure-providers-in-the-control-ui)
- <a id="plugin-owned-provider-behavior" />[Plugin-owned provider behavior](/en/concepts/model-providers/control-ui-and-keys#plugin-owned-provider-behavior)
- <a id="api-key-rotation" />[API key rotation](/en/concepts/model-providers/control-ui-and-keys#api-key-rotation)
- <a id="key-sources-and-priority" />[Key sources and priority](/en/concepts/model-providers/control-ui-and-keys#key-sources-and-priority)
- <a id="when-rotation-kicks-in" />[When rotation kicks in](/en/concepts/model-providers/control-ui-and-keys#when-rotation-kicks-in)
- <a id="official-provider-plugins" />[Official provider plugins](/en/concepts/model-providers/official-provider-plugins#official-provider-plugins)
- <a id="openai" />[OpenAI](/en/concepts/model-providers/official-provider-plugins#openai)
- <a id="anthropic" />[Anthropic](/en/concepts/model-providers/official-provider-plugins#anthropic)
- <a id="openai-chatgpt%2Fcodex-oauth" /><a id="openai-chatgpt/codex-oauth" />[OpenAI ChatGPT/Codex OAuth](/en/concepts/model-providers/official-provider-plugins#openai-chatgpt/codex-oauth)
- <a id="other-subscription-style-hosted-options" />[Other subscription-style hosted options](/en/concepts/model-providers/official-provider-plugins#other-subscription-style-hosted-options)
- <a id="opencode" />[OpenCode](/en/concepts/model-providers/official-provider-plugins#opencode)
- <a id="google-gemini-(api-key)" /><a id="google-gemini-api-key" />[Google Gemini (API key)](/en/concepts/model-providers/official-provider-plugins#google-gemini-api-key)
- <a id="google-vertex-and-gemini-cli-runtime" />[Google Vertex and Gemini CLI runtime](/en/concepts/model-providers/official-provider-plugins#google-vertex-and-gemini-cli-runtime)
- <a id="z.ai-(glm)" /><a id="z-ai-glm" />[Z.AI (GLM)](/en/concepts/model-providers/official-provider-plugins#z-ai-glm)
- <a id="vercel-ai-gateway" />[Vercel AI Gateway](/en/concepts/model-providers/official-provider-plugins#vercel-ai-gateway)
- <a id="other-bundled-provider-plugins" />[Other bundled provider plugins](/en/concepts/model-providers/official-provider-plugins#other-bundled-provider-plugins)
- <a id="quirks-worth-knowing" />[Quirks worth knowing](/en/concepts/model-providers/official-provider-plugins#quirks-worth-knowing)
- <a id="openrouter" />[OpenRouter](/en/concepts/model-providers/official-provider-plugins#openrouter)
- <a id="kilo-gateway" />[Kilo Gateway](/en/concepts/model-providers/official-provider-plugins#kilo-gateway)
- <a id="minimax-1" />[MiniMax (quirks)](/en/concepts/model-providers/official-provider-plugins#minimax)
- <a id="nvidia" />[NVIDIA](/en/concepts/model-providers/official-provider-plugins#nvidia)
- <a id="xai" />[xAI](/en/concepts/model-providers/official-provider-plugins#xai)
- <a id="providers-via-models.providers-(custom%2Fbase-url)" /><a id="providers-via-models-providers-custom/base-url" />[Providers via `models.providers` (custom/base URL)](/en/concepts/model-providers/custom-providers#providers-via-models-providers-custom/base-url)
- <a id="moonshot-ai-(kimi)" /><a id="moonshot-ai-kimi" />[Moonshot AI (Kimi)](/en/concepts/model-providers/custom-providers#moonshot-ai-kimi)
- <a id="kimi-coding" />[Kimi Coding](/en/concepts/model-providers/custom-providers#kimi-coding)
- <a id="volcano-engine-(doubao)" /><a id="volcano-engine-doubao" />[Volcano Engine (Doubao)](/en/concepts/model-providers/custom-providers#volcano-engine-doubao)
- <a id="standard-models" />[Standard models (Volcano Engine)](/en/concepts/model-providers/custom-providers#standard-models)
- <a id="coding-models-volcengine-plan" />[Coding models (volcengine-plan)](/en/concepts/model-providers/custom-providers#coding-models-volcengine-plan)
- <a id="byteplus-(international)" /><a id="byteplus-international" />[BytePlus (International)](/en/concepts/model-providers/custom-providers#byteplus-international)
- <a id="standard-models-2" />[Standard models (BytePlus)](/en/concepts/model-providers/custom-providers#standard-models-2)
- <a id="coding-models-byteplus-plan" />[Coding models (byteplus-plan)](/en/concepts/model-providers/custom-providers#coding-models-byteplus-plan)
- <a id="synthetic" />[Synthetic](/en/concepts/model-providers/custom-providers#synthetic)
- <a id="minimax" />[MiniMax](/en/concepts/model-providers/custom-providers#minimax)
- <a id="llama.cpp" /><a id="llama-cpp" />[llama.cpp](/en/concepts/model-providers/custom-providers#llama-cpp)
- <a id="lm-studio" />[LM Studio](/en/concepts/model-providers/custom-providers#lm-studio)
- <a id="ollama" />[Ollama](/en/concepts/model-providers/custom-providers#ollama)
- <a id="vllm" />[vLLM](/en/concepts/model-providers/custom-providers#vllm)
- <a id="sglang" />[SGLang](/en/concepts/model-providers/custom-providers#sglang)
- <a id="local-proxies-(lm-studio%2C-vllm%2C-litellm%2C-etc.)" /><a id="local-proxies-lm-studio-vllm-litellm-etc" />[Local proxies (LM Studio, vLLM, LiteLLM, etc.)](/en/concepts/model-providers/custom-providers#local-proxies-lm-studio-vllm-litellm-etc)
- <a id="default-optional-fields" />[Default optional fields](/en/concepts/model-providers/custom-providers#default-optional-fields)
- <a id="proxy-route-shaping-rules" />[Proxy-route shaping rules](/en/concepts/model-providers/custom-providers#proxy-route-shaping-rules)

## CLI examples

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

See also: [Configuration](/en/gateway/configuration) for full configuration examples.

## Related

- [Configuration reference](/en/gateway/config-agents#agent-defaults) - model config keys
- [Model failover](/en/concepts/model-failover) - fallback chains and retry behavior
- [Models](/en/concepts/models) - model configuration and aliases
- [Providers](/en/providers) - per-provider setup guides
- [Agent harness plugins](/en/plugins/sdk-agent-harness) - SDK surface for plugins that replace the embedded agent executor
- [`openclaw models`](/en/cli/models) - list, select, and authenticate providers from the CLI
