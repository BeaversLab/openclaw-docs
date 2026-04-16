---
summary: "使用 LM Studio 运行 OpenClaw"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

# LM Studio

LM Studio 是一款友好且功能强大的应用程序，可在您自己的硬件上运行开放权重模型。它支持运行 llama.cpp（GGUF）或 MLX 模型（Apple Silicon）。提供 GUI 图形界面版本或无头守护进程（`llmster`）。产品及安装文档请参阅 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

1. 安装 LM Studio（桌面版）或 `llmster`（无头模式），然后启动本地服务器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 启动服务器

确保您启动了桌面应用程序，或使用以下命令运行守护进程：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您使用的是桌面应用，请确保已启用 JIT 以获得流畅体验。详情请参阅 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict)。

3. OpenClaw 需要一个 LM Studio 令牌值。设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果 LM Studio 身份验证已禁用，请使用任意非空令牌值：

```bash
export LM_API_TOKEN="placeholder-key"
```

有关 LM Studio 身份验证设置的详细信息，请参阅 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。

4. 运行引导程序并选择 `LM Studio`：

```bash
openclaw onboard
```

5. 在引导过程中，使用 `Default model` 提示选择您的 LM Studio 模型。

您也可以稍后设置或更改：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型键遵循 `author/model-name` 格式（例如 `qwen/qwen3.5-9b`）。OpenClaw 模型引用会在前面添加提供者名称：`lmstudio/qwen/qwen3.5-9b`。您可以通过运行 `curl http://localhost:1234/api/v1/models` 并查看 `key` 字段来找到模型的准确键值。

## 非交互式引导

当您需要通过脚本进行设置（CI、自动部署、远程引导）时，请使用非交互式引导：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

也可以指定基础 URL 或模型及 API 密钥：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 接受 LM Studio 返回的模型键（例如 `qwen/qwen3.5-9b`），不包含 `lmstudio/` 提供者前缀。

非交互式引导需要 `--lmstudio-api-key`（或环境变量中的 `LM_API_TOKEN`）。对于未启用身份验证的 LM Studio 服务器，使用任意非空令牌值即可。

`--custom-api-key` 为保持兼容性仍然受支持，但对于 LM Studio，推荐使用 `--lmstudio-api-key`。

此命令会写入 `models.providers.lmstudio`，将默认模型设置为 `lmstudio/<custom-model-id>`，并写入 `lmstudio:default` 身份验证配置文件。

交互式设置会提示您输入可选的首选加载上下文长度，并将其应用于已发现并保存到配置中的 LM Studio 模型。

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

### LM Studio 未被检测到

确保 LM Studio 正在运行，并且您已设置 `LM_API_TOKEN`（对于未启用身份验证的服务器，使用任意非空令牌值即可）：

```bash
# 通过桌面应用启动，或使用无头模式：
lms server start --port 1234
```

验证 API 是否可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### 身份验证错误（HTTP 401）

如果设置过程中出现 HTTP 401 错误，请验证您的 API 密钥：

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥匹配。
- 有关 LM Studio 身份验证设置的详细信息，请参阅 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果您的服务器不需要身份验证，请为 `LM_API_TOKEN` 使用任意非空令牌值。

### 即时模型加载

LM Studio 支持即时（JIT）模型加载，模型在首次请求时才会被加载。请确保已启用此功能，以避免出现"模型未加载"错误。
