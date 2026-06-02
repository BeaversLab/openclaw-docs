---
summary: "OllamaOpenClaw直接通过 OpenClaw 使用 Ollama Cloud"
read_when:
  - You want to use hosted Ollama models without a local Ollama server
  - You need the ollama-cloud provider id, key, or endpoint
title: "OllamaOllama Cloud"
---

Ollama Cloud 是 Ollama 的托管模型 API。它允许 OpenClaw 直接调用 Ollama 托管的
模型，而无需安装本地 Ollama 服务器或将本地
Ollama 应用程序登录到云模式。使用提供商 ID OllamaOllamaAPIOpenClawOllamaOllamaOllama`ollama-cloud` 和模型引用（如
`ollama-cloud/kimi-k2.6`）。

此页面用于仅限云的直接路由。该提供商使用 Ollama 的原生
Ollama`/api/chat`OpenAI 样式，而不是 OpenAI 兼容的 `/v1`OpenClaw 路由。OpenClaw 将其
注册为单独的提供商 ID，以便仅限云的凭据、实时目录发现和
模型选择不会与本地 `ollama` 主机混淆。

当您希望进行仅限云的路由时，请使用此页面。对于本地 Ollama、混合
云加本地路由、嵌入和自定义主机详细信息，请参阅
[Ollama](OllamaOllama/en/providers/ollama)。

## Setup

在 [ollama.com/settings/keys](OllamaAPIhttps://ollama.com/settings/keys) 创建 Ollama Cloud API 密钥，然后运行：

```bash
openclaw onboard --auth-choice ollama-cloud
```

Or set:

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret
```

## Defaults

- Provider: `ollama-cloud`
- Base URL: `https://ollama.com`
- Env var: `OLLAMA_API_KEY`
- API style: Ollama native APIOllama`/api/chat`
- Example 模型: `ollama-cloud/kimi-k2.6`

## When to choose Ollama Cloud

- You want hosted Ollama models without running Ollama`ollama serve` locally.
- You want the same native Ollama chat API shape OpenClaw uses for local
  Ollama, but pointed at OllamaAPIOpenClawOllama`https://ollama.com`.
- 您希望为已在 Ollama 托管目录中的模型找到一条简单的云端路径。
- 您不需要本地模型拉取、本地 GPU 控制，或仅限局域网的推理。

当您希望通过已登录的 Ollama 主机进行仅本地或云端加本地路由时，请改用 [Ollama](/zh/providers/ollama)。当您需要 `/v1/chat/completions` 语义或特定于提供商的 OpenAI 风格功能时，请改用 OpenAI 兼容的提供商。

## 模型

OpenClaw 从实时托管目录中发现 Ollama Cloud 模型。常用的托管 ID 包括：

- `ollama-cloud/gpt-oss:20b`
- `ollama-cloud/kimi-k2.6`
- `ollama-cloud/deepseek-v4-flash`
- `ollama-cloud/minimax-m2.7`
- `ollama-cloud/glm-5`

请从您当前的托管目录中使用模型 ID：

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

模型 ID 是云端目录 ID，而非本地拉取名称。如果模型名称在本地 Ollama 主机中可用，但在托管目录中不存在，请改用该本地主机的 `ollama` 提供商。

## 实时测试

对于 Ollama Cloud API 密钥冒烟测试，请将 Ollama 实时测试指向托管端点，并从您当前的目录中选择一个模型：

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

云端冒烟测试会运行文本、原生流和 Web 搜索。对于 `https://ollama.com`，它默认跳过嵌入，因为 Ollama Cloud API 密钥可能未授权 `/api/embed`。

## 故障排除

- `Set OLLAMA_API_KEY` 错误：请提供真实的云端 API 密钥。本地 `ollama-local` 标记仅适用于本地或私有 Ollama 主机。
- 未知模型错误：请运行 `openclaw models list --provider ollama-cloud` 并准确复制托管模型 ID。
- 自定义 Ollama 主机上的工具调用或原始 JSON 问题：请检查您是否意外使用了 OpenAI 兼容的 OllamaOpenAI`/v1`Ollama URL。Ollama 路由应使用不带 `/v1` 后缀的原生基础 URL。

## 相关

- [Ollama](Ollama/en/providers/ollama)
- [模型提供商](/zh/concepts/model-providers)
- [所有提供商](/zh/providers/index)
