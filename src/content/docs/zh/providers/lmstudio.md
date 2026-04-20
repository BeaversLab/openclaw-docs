---
summary: "使用 LM Studio 运行 OpenClaw"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

# LM Studio

LM Studio 是一款友好且强大的应用程序，用于在自己的硬件上运行开源权重的模型。它允许您运行 llama.cpp (GGUF) 或 MLX 模型（Apple Silicon）。它提供 GUI 软件包或无头守护程序 (`llmster`)。有关产品和设置文档，请参阅 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

1. 安装 LM Studio（桌面版）或 `llmster`（无头模式），然后启动本地服务器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 启动服务器

请确保您启动了桌面应用程序或使用以下命令运行守护程序：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您正在使用该应用程序，请确保启用了 JIT 以获得流畅的体验。在 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) 中了解更多信息。

3. OpenClaw 需要 LM Studio 令牌值。设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果禁用了 LM Studio 身份验证，请使用任何非空的令牌值：

```bash
export LM_API_TOKEN="placeholder-key"
```

有关 LM Studio 身份验证设置详细信息，请参阅 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。

4. 运行新手引导并选择 `LM Studio`：

```bash
openclaw onboard
```

5. 在新手引导中，使用 `Default model` 提示来选择您的 LM Studio 模型。

您也可以稍后设置或更改它：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型键遵循 `author/model-name` 格式（例如 `qwen/qwen3.5-9b`）。OpenClaw
模型引用会在前面加上提供商名称：`lmstudio/qwen/qwen3.5-9b`。您可以通过运行 `curl http://localhost:1234/api/v1/models` 并查看 `key` 字段来找到模型的精确键。

## 非交互式新手引导

当您希望通过脚本编写设置（CI、预配、远程引导）时，请使用非交互式新手引导：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或指定基本 URL 或带有 API 键的模型：

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

非交互式新手引导需要 `--lmstudio-api-key`（或环境变量中的 `LM_API_TOKEN`）。
对于未经身份验证的 LM Studio 服务器，任何非空的令牌值均可使用。

`--custom-api-key` 出于兼容性原因仍受支持，但对于 LM Studio，首选 `--lmstudio-api-key`。

这会写入 `models.providers.lmstudio`，将默认模型设置为
`lmstudio/<custom-model-id>`，并写入 `lmstudio:default` 身份验证配置文件。

交互式设置可以提示输入可选的首选加载上下文长度，并将其应用于保存到配置中的已发现的 LM Studio 模型。

## 配置

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

确保 LM Studio 正在运行，并且您设置了 `LM_API_TOKEN`（对于未经身份验证的服务器，任何非空的 token 值均可）：

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
- 如果您的服务器不需要身份验证，请为 `LM_API_TOKEN` 使用任何非空的 token 值。

### 即时模型加载

LM Studio 支持即时 (JIT) 模型加载，即在首次请求时加载模型。确保您已启用此功能以避免“Model not loaded”错误。
