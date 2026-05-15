---
summary: "OpenClaw使用 LM Studio 运行 OpenClaw"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

LM Studio 是一个友好但功能强大的应用程序，用于在自己的硬件上运行开源权重的模型。它允许您运行 llama.cpp (GGUF) 或 MLX 模型（Apple Silicon）。提供 GUI 软件包或无头守护进程 (`llmster`)。有关产品和设置文档，请参阅 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

1. 安装 LM Studio（桌面版）或 `llmster`（无头版），然后启动本地服务器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 启动服务器

确保您启动了桌面应用程序或使用以下命令运行守护程序：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您使用的是该应用程序，请确保启用 JIT 以获得流畅的体验。在 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) 中了解更多信息。

3. 如果启用了 LM Studio 身份验证，请设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果禁用了 LM Studio 身份验证，您可以在交互式 API 设置期间将 OpenClaw 密钥留空。

有关 LM Studio 身份验证设置的详细信息，请参阅 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。

4. 运行新手引导并选择 `LM Studio`：

```bash
openclaw onboard
```

5. 在新手引导中，使用 `Default model` 提示来选择您的 LM Studio 模型。

您也可以稍后设置或更改它：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型键遵循 `author/model-name` 格式（例如 `qwen/qwen3.5-9b`OpenClaw）。OpenClaw
模型引用会在前面加上提供商名称：`lmstudio/qwen/qwen3.5-9b`。您可以通过运行 `curl http://localhost:1234/api/v1/models` 并查看 `key` 字段来找到
模型的确切键。

## 非交互式新手引导

当您想要脚本化设置 (CI、配置、远程引导) 时，请使用非交互式新手引导：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或者指定基础 URL、模型和可选的 API 密钥：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 接受 LM Studio 返回的模型键（例如 `qwen/qwen3.5-9b`），而不包含
`lmstudio/` 提供商前缀。

对于经过身份验证的 LM Studio 服务器，传递 `--lmstudio-api-key` 或设置 `LM_API_TOKEN`OpenClaw。
对于未经身份验证的 LM Studio 服务器，请省略该键；OpenClaw 会存储一个本地非机密标记。

`--custom-api-key` 为了兼容性仍然受支持，但对于 LM Studio，首选 `--lmstudio-api-key`。

这将写入 `models.providers.lmstudio` 并将默认模型设置为
`lmstudio/<custom-model-id>`API。当您提供 API 密钥时，设置还会写入
`lmstudio:default` 身份验证配置文件。

交互式设置可以提示输入可选的首选加载上下文长度，并将其应用于已发现并保存到配置中的 LM Studio 模型。
LM Studio 插件配置信任配置的 LM Studio 端点以进行模型请求，包括环回、LAN 和 tailnet 主机。您可以通过设置 `models.providers.lmstudio.request.allowPrivateNetwork: false` 来选择退出。

## 配置

### 流式使用兼容性

LM Studio 兼容流式使用。当它不发出 OpenAI 形状的
`usage`OpenClaw 对象时，OpenClaw 会从 llama.cpp 风格的
`timings.prompt_n` / `timings.predicted_n` 元数据中恢复 token 计数。

相同的流式使用行为也适用于这些 OpenAI 兼容的本地后端：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### 思考兼容性

当 LM Studio 的 `/api/v1/models`OpenClaw 发现报告特定于模型的推理
选项时，OpenClaw 会在模型兼容元数据中暴露匹配的 OpenAI 兼容的 `reasoning_effort`
值。当前的 LM Studio 构建版本可以通告二进制
UI 选项（例如 `allowed_options: ["off", "on"]`），但在 `/v1/chat/completions`OpenClaw 上拒绝这些值；
OpenClaw 在发送请求之前将该二进制发现形状规范化为
`none`、`minimal`、`low`、`medium`、`high` 和 `xhigh`。
加载目录时，包含 `off`/`on` 推理映射的旧版保存的 LM Studio 配置
也会以相同方式规范化。

### 显式配置

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 故障排除

### 未检测到 LM Studio

确保 LM Studio 正在运行。如果启用了身份验证，还需要设置 `LM_API_TOKEN`：

```bash
# Start via desktop app, or headless:
lms server start --port 1234
```

验证 API 是否可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### 身份验证错误 (HTTP 401)

如果设置报告 HTTP 401，请验证您的 API 密钥：

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥匹配。
- 有关 LM Studio 身份验证设置的详细信息，请参阅 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果您的服务器不需要身份验证，请在设置期间将密钥留空。

### 即时 OpenAI 加载

LM Studio 支持即时 (JIT) 模型加载，即在首次请求时加载模型。默认情况下，OpenClaw 通过 LM Studio 的原生加载端点预加载模型，这在禁用 JIT 时很有帮助。要让 LM Studio 的 JIT、空闲 TTL 和自动驱逐行为控制模型生命周期，请禁用 OpenClaw 的预加载步骤：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        api: "openai-completions",
        params: { preload: false },
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

### 局域网或 tailnet LM Studio 主机

使用 LM Studio 主机的可达地址，保留 `/v1`，并确保 LM Studio 在该机器上绑定到环回地址之外：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

与通用的 OpenAI 兼容提供商不同，`lmstudio` 会自动信任其配置的本地/私有端点以进行受保护的模型请求。自定义环回提供商 ID（如 `localhost` 或 `127.0.0.1`）也会自动受信任；对于 LAN、tailnet 或私有 DNS 自定义提供商 ID，请显式设置 `models.providers.<id>.request.allowPrivateNetwork: true`。

## 相关

- [模型选择](/zh/concepts/model-providers)
- [Ollama](/zh/providers/ollama)
- [本地模型](/zh/gateway/local-models)
