---
summary: "在 OpenClaw 中使用注重隐私的 Venice AI 模型"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

# Venice AI (Venice 重点)

**Venice** 是我们要重点推荐的 Venice 设置，用于优先隐私的推理，并可选择性匿名访问专有模型。

Venice AI 提供注重隐私的 AI 推理，支持不受审查的模型，并通过其匿名代理访问主要专有模型。所有推理默认都是私密的——不对您的数据进行训练，不记录日志。

## 为什么在 OpenClaw 中使用 Venice

- 开源模型的**私密推理**（无日志）。
- **不受审查的模型**，当您需要它们时。
- **匿名访问**专有模型（Opus/GPT/Gemini），当质量重要时。
- 兼容 OpenAI 的 `/v1` 端点。

## 隐私模式

Venice 提供两种隐私级别 —— 理解这一点是选择模型的关键：

| 模式           | 描述                                                                                                                       | 模型                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **私密**    | 完全私密。提示/响应**从未被存储或记录**。短暂的。                                                       | Llama, Qwen, DeepSeek, Kimi, MiniMax, Venice 不受审查, etc. |
| **匿名** | 通过 Venice 代理，剥离元数据。底层提供商（OpenAI, Anthropic, Google, xAI）看到的是匿名请求。 | Claude, GPT, Gemini, Grok                                     |

## 功能

- **注重隐私**：在“私密”（完全私密）和“匿名”（代理）模式之间进行选择
- **不受审查的模型**：访问没有内容限制的模型
- **主要模型访问**：通过 Venice 的匿名代理使用 Claude, GPT, Gemini 和 Grok
- **OpenAI 兼容 API**：标准 `/v1` 端点，便于集成
- **流式传输**：✅ 所有模型均支持
- **函数调用**：✅ 选定模型支持（请查看模型功能）
- **视觉**：✅ 具备视觉能力的模型支持
- **无硬性速率限制**：极端使用情况可能会应用公平使用节流

## 设置

### 1. 获取 API 密钥

1. 在 [venice.ai](https://venice.ai) 注册
2. 前往 **Settings → API Keys → Create new key**
3. 复制您的 API 密钥（格式：`vapi_xxxxxxxxxxxx`）

### 2. 配置 OpenClaw

**选项 A：环境变量**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**选项 B：交互式设置（推荐）**

```bash
openclaw onboard --auth-choice venice-api-key
```

这将：

1. 提示您输入 API 密钥（或使用现有的 `VENICE_API_KEY`）
2. 显示所有可用的 Venice 模型
3. 让您选择默认模型
4. 自动配置提供商

**选项 C：非交互式**

```bash
openclaw onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. 验证设置

```bash
openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
```

## 模型选择

设置完成后，OpenClaw 会显示所有可用的 Venice 模型。请根据您的需求选择：

- **默认模型**：`venice/kimi-k2-5`，用于强大的私有推理和视觉功能。
- **高能力选项**：`venice/claude-opus-4-6`，用于最强的匿名 Venice 路径。
- **隐私**：选择“私有”模型以实现完全私有的推理。
- **功能**：选择“匿名”模型以通过 Venice 代理访问 Claude、GPT、Gemini。

随时更改您的默认模型：

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

列出所有可用模型：

```bash
openclaw models list | grep venice
```

## 通过 `openclaw configure` 配置

1. 运行 `openclaw configure`
2. 选择 **Model/auth**
3. 选择 **Venice AI**

## 我应该使用哪种模型？

| 用例                       | 推荐模型                        | 原因                                          |
| -------------------------- | -------------------------------- | -------------------------------------------- |
| **通用聊天（默认）**      | `kimi-k2-5`                      | 强大的私有推理能力以及视觉功能               |
| **最佳整体质量**          | `claude-opus-4-6`                | 最强大的匿名化 Venice 选项                   |
| **隐私 + 编程**           | `qwen3-coder-480b-a35b-instruct` | 具有大上下文窗口的私有编程模型               |
| **私有视觉**              | `kimi-k2-5`                      | 无需退出私有模式即可支持视觉功能             |
| **快速 + 经济**           | `qwen3-4b`                       | 轻量级推理模型                               |
| **复杂的私有任务**        | `deepseek-v3.2`                  | 强大的推理能力，但不支持 Venice 工具        |
| **无审查**                | `venice-uncensored`              | 无内容限制                                   |

## 可用模型（共 41 个）

### 私有模型（26 个）—— 完全私有，无日志记录

| 模型 ID                               | 名称                                | 上下文 | 特性                   |
| -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
| `kimi-k2-5`                            | Kimi K2.5                           | 256k    | 默认, 推理, 视觉 |
| `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | 推理                  |
| `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | 通用                    |
| `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | 通用                    |
| `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B             | 128k    | 通用, 工具已禁用    |
| `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                 | 128k    | 推理                  |
| `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                 | 128k    | 通用                    |
| `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                    | 256k    | 编码                     |
| `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo              | 256k    | 编码                     |
| `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                     | 256k    | 推理, 视觉          |
| `qwen3-next-80b`                       | Qwen3 Next 80B                      | 256k    | 通用                    |
| `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Vision)              | 256k    | 视觉                     |
| `qwen3-4b`                             | Venice Small (Qwen3 4B)             | 32k     | 快速, 推理            |
| `deepseek-v3.2`                        | DeepSeek V3.2                       | 160k    | 推理, 工具已禁用  |
| `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k     | 无审查, 工具已禁用 |
| `mistral-31-24b`                       | Venice Medium (Mistral)             | 128k    | 视觉                     |
| `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct         | 198k    | 视觉                     |
| `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B                 | 128k    | 通用                    |
| `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B          | 128k    | 通用                    |
| `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic               | 128k    | 推理                  |
| `zai-org-glm-4.6`                      | GLM 4.6                             | 198k    | 通用                    |
| `zai-org-glm-4.7`                      | GLM 4.7                             | 198k    | 推理                  |
| `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                       | 128k    | 推理                  |
| `zai-org-glm-5`                        | GLM 5                               | 198k    | 推理                  |
| `minimax-m21`                          | MiniMax M2.1                        | 198k    | 推理                  |
| `minimax-m25`                          | MiniMax M2.5                        | 198k    | 推理                  |

### 匿名模型 (15) — 通过 Venice 代理

| 模型 ID                        | 名称                           | 上下文 | 特性                  |
| ------------------------------- | ------------------------------ | ------- | ------------------------- |
| `claude-opus-4-6`               | Claude Opus 4.6 (via Venice)   | 1M      | 推理、视觉         |
| `claude-opus-4-5`               | Claude Opus 4.5 (via Venice)   | 198k    | 推理、视觉         |
| `claude-sonnet-4-6`             | Claude Sonnet 4.6 (via Venice) | 1M      | 推理、视觉         |
| `claude-sonnet-4-5`             | Claude Sonnet 4.5 (via Venice) | 198k    | 推理、视觉         |
| `openai-gpt-54`                 | GPT-5.4 (via Venice)           | 1M      | 推理、视觉         |
| `openai-gpt-53-codex`           | GPT-5.3 Codex (via Venice)     | 400k    | 推理、视觉、编程 |
| `openai-gpt-52`                 | GPT-5.2 (via Venice)           | 256k    | 推理                 |
| `openai-gpt-52-codex`           | GPT-5.2 Codex (via Venice)     | 256k    | 推理、视觉、编程 |
| `openai-gpt-4o-2024-11-20`      | GPT-4o (via Venice)            | 128k    | 视觉                    |
| `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini (via Venice)       | 128k    | 视觉                    |
| `gemini-3-1-pro-preview`        | Gemini 3.1 Pro (via Venice)    | 1M      | 推理、视觉         |
| `gemini-3-pro-preview`          | Gemini 3 Pro (via Venice)      | 198k    | 推理、视觉         |
| `gemini-3-flash-preview`        | Gemini 3 Flash (via Venice)    | 256k    | 推理、视觉         |
| `grok-41-fast`                  | Grok 4.1 Fast (via Venice)     | 1M      | 推理、视觉         |
| `grok-code-fast-1`              | Grok Code Fast 1 (via Venice)  | 256k    | 推理、编程         |

## 模型发现

当设置 `VENICE_API_KEY` 时，OpenClaw 会自动从 Venice API 发现模型。如果无法访问该 API，它将回退到静态目录。

`/models` 端点是公开的（列出模型无需认证），但推理需要有效的 API 密钥。

## 流式传输与工具支持

| 功能              | 支持                                                 |
| -------------------- | ------------------------------------------------------- |
| **流式传输 (Streaming)**        | ✅ 所有模型                                           |
| **函数调用 (Function calling)** | ✅ 大多数模型（请检查 API 中的 `supportsFunctionCalling`） |
| **视觉/图像 (Vision/Images)**    | ✅ 标有“Vision”功能的模型                  |
| **JSON 模式 (JSON mode)**        | ✅ 通过 `response_format` 支持                      |

## 定价

Venice 使用基于积分的系统。请查看 [venice.ai/pricing](https://venice.ai/pricing) 了解当前费率：

- **私有模型**：通常成本较低
- **匿名模型**：类似于直接 API 定价 + 少量 Venice 费用

## 对比：Venice 与直接 API

| 方面       | Venice (匿名)           | 直接 API          |
| ------------ | ----------------------------- | ------------------- |
| **隐私**  | 元数据已剥离，已匿名 | 关联到您的账户 |
| **延迟**  | +10-50ms (代理)              | 直接              |
| **功能** | 支持大多数功能       | 完整功能       |
| **计费**  | Venice 积分                | 提供商计费    |

## 使用示例

```bash
# Use the default private model
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# Use Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# Use uncensored model
openclaw agent --model venice/venice-uncensored --message "Draft options"

# Use vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Use coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
```

## 故障排除

### 无法识别 API 密钥

```bash
echo $VENICE_API_KEY
openclaw models list | grep venice
```

确保密钥以 `vapi_` 开头。

### 模型不可用

Venice 模型目录会动态更新。运行 `openclaw models list` 以查看当前可用的模型。某些模型可能暂时离线。

### 连接问题

Venice API 位于 `https://api.venice.ai/api/v1`。确保您的网络允许 HTTPS 连接。

## 配置文件示例

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2-5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 链接

- [Venice AI](https://venice.ai)
- [API 文档](https://docs.venice.ai)
- [定价](https://venice.ai/pricing)
- [状态](https://status.venice.ai)
