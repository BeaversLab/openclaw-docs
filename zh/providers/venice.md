---
summary: "在 OpenClaw 中使用 Venice AI 隐私优先模型"
read_when:
  - 想在 OpenClaw 中进行隐私优先推理
  - 需要 Venice AI 配置指引
title: "Venice AI"
---

# Venice AI（Venice 亮点）

**Venice** 是我们重点推荐的 Venice 配置，用于隐私优先推理，并可选通过匿名代理访问专有模型。

Venice AI 提供隐私优先的推理能力，支持无审查模型，并通过匿名代理访问主流专有模型。默认所有推理均为私密——不训练你的数据，也不记录日志。

## 为什么在 OpenClaw 中使用 Venice

- **私密推理** 用于开源模型（不记录）。
- 需要时使用 **无审查模型**。
- 通过匿名代理 **访问专有模型**（Opus/GPT/Gemini），在质量要求高时使用。
- OpenAI 兼容的 `/v1` 端点。

## 隐私模式

Venice 提供两种隐私等级——理解这一点有助于选择模型：

| 模式           | 说明                                                                          | 模型                                        |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| **Private**    | 完全私密。提示/回复 **不会存储或记录**。短期存在。                            | Llama、Qwen、DeepSeek、Venice Uncensored 等 |
| **Anonymized** | 通过 Venice 代理并移除元数据。底层提供商（OpenAI、Anthropic）只看到匿名请求。 | Claude、GPT、Gemini、Grok、Kimi、MiniMax    |

## 特性

- **隐私优先**：可选 “private”（完全私密）与 “anonymized”（代理）模式
- **无审查模型**：访问没有内容限制的模型
- **主流模型访问**：通过 Venice 匿名代理使用 Claude、GPT-5.2、Gemini、Grok
- **OpenAI 兼容 API**：标准 `/v1` 端点，易于集成
- **流式**：✅ 全模型支持
- **函数调用**：✅ 部分模型支持（查看模型能力）
- **视觉**：✅ 具备视觉能力的模型支持
- **无硬性速率限制**：极端使用可能触发公平使用限制

## 配置

### 1. 获取 API Key

1. 在 [venice.ai](https://venice.ai) 注册
2. 进入 **Settings → API Keys → Create new key**
3. 复制 API key（格式：`vapi_xxxxxxxxxxxx`）

### 2. 配置 OpenClaw

**方案 A：环境变量**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**方案 B：交互式设置（推荐）**

```bash
openclaw onboard --auth-choice venice-api-key
```

该流程将：

1. 提示输入 API key（或使用已有 `VENICE_API_KEY`）
2. 展示全部可用 Venice 模型
3. 让你选择默认模型
4. 自动配置 provider

**方案 C：非交互式**

```bash
openclaw onboard --non-interactive   --auth-choice venice-api-key   --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. 验证配置

```bash
openclaw chat --model venice/llama-3.3-70b "Hello, are you working?"
```

## 模型选择

配置后，OpenClaw 会显示所有可用 Venice 模型。根据需求选择：

- **默认（我们的选择）**：`venice/llama-3.3-70b`，私密且性能均衡。
- **最佳综合质量**：`venice/claude-opus-45`，用于高难任务（Opus 仍是最强）。
- **隐私**：选择 “private” 模型以获得完全私密推理。
- **能力**：选择 “anonymized” 模型通过 Venice 代理访问 Claude、GPT、Gemini。

随时更改默认模型：

```bash
openclaw models set venice/claude-opus-45
openclaw models set venice/llama-3.3-70b
```

列出所有模型：

```bash
openclaw models list | grep venice
```

## 通过 `openclaw configure` 配置

1. 运行 `openclaw configure`
2. 选择 **Model/auth**
3. 选择 **Venice AI**

## 我该选哪个模型？

| 使用场景               | 推荐模型                         | 原因                      |
| ---------------------- | -------------------------------- | ------------------------- |
| **日常对话**           | `llama-3.3-70b`                  | 全面均衡、完全私密        |
| **最佳综合质量**       | `claude-opus-45`                 | Opus 仍是最强，适合难任务 |
| **隐私 + Claude 质量** | `claude-opus-45`                 | 通过匿名代理获得最佳推理  |
| **编码**               | `qwen3-coder-480b-a35b-instruct` | 面向代码，262k 上下文     |
| **视觉任务**           | `qwen3-vl-235b-a22b`             | 最佳私密视觉模型          |
| **无审查**             | `venice-uncensored`              | 无内容限制                |
| **快速 + 低成本**      | `qwen3-4b`                       | 轻量但仍强大              |
| **复杂推理**           | `deepseek-v3.2`                  | 强推理，私密              |

## 可用模型（共 25 个）

### Private 模型（15）— 完全私密，无日志

| Model ID                         | 名称                    | 上下文（tokens） | 特性       |
| -------------------------------- | ----------------------- | ---------------- | ---------- |
| `llama-3.3-70b`                  | Llama 3.3 70B           | 131k             | 通用       |
| `llama-3.2-3b`                   | Llama 3.2 3B            | 131k             | 快速、轻量 |
| `hermes-3-llama-3.1-405b`        | Hermes 3 Llama 3.1 405B | 131k             | 复杂任务   |
| `qwen3-235b-a22b-thinking-2507`  | Qwen3 235B Thinking     | 131k             | 推理       |
| `qwen3-235b-a22b-instruct-2507`  | Qwen3 235B Instruct     | 131k             | 通用       |
| `qwen3-coder-480b-a35b-instruct` | Qwen3 Coder 480B        | 262k             | 编码       |
| `qwen3-next-80b`                 | Qwen3 Next 80B          | 262k             | 通用       |
| `qwen3-vl-235b-a22b`             | Qwen3 VL 235B           | 262k             | 视觉       |
| `qwen3-4b`                       | Venice Small (Qwen3 4B) | 32k              | 快速、推理 |
| `deepseek-v3.2`                  | DeepSeek V3.2           | 163k             | 推理       |
| `venice-uncensored`              | Venice Uncensored       | 32k              | 无审查     |
| `mistral-31-24b`                 | Venice Medium (Mistral) | 131k             | 视觉       |
| `google-gemma-3-27b-it`          | Gemma 3 27B Instruct    | 202k             | 视觉       |
| `openai-gpt-oss-120b`            | OpenAI GPT OSS 120B     | 131k             | 通用       |
| `zai-org-glm-4.7`                | GLM 4.7                 | 202k             | 推理、多语 |

### Anonymized 模型（10）— 通过 Venice 代理

| Model ID                 | 原始模型          | 上下文（tokens） | 特性       |
| ------------------------ | ----------------- | ---------------- | ---------- |
| `claude-opus-45`         | Claude Opus 4.5   | 202k             | 推理、视觉 |
| `claude-sonnet-45`       | Claude Sonnet 4.5 | 202k             | 推理、视觉 |
| `openai-gpt-52`          | GPT-5.2           | 262k             | 推理       |
| `openai-gpt-52-codex`    | GPT-5.2 Codex     | 262k             | 推理、视觉 |
| `gemini-3-pro-preview`   | Gemini 3 Pro      | 202k             | 推理、视觉 |
| `gemini-3-flash-preview` | Gemini 3 Flash    | 262k             | 推理、视觉 |
| `grok-41-fast`           | Grok 4.1 Fast     | 262k             | 推理、视觉 |
| `grok-code-fast-1`       | Grok Code Fast 1  | 262k             | 推理、代码 |
| `kimi-k2-thinking`       | Kimi K2 Thinking  | 262k             | 推理       |
| `minimax-m21`            | MiniMax M2.1      | 202k             | 推理       |

## 模型发现

当设置 `VENICE_API_KEY` 时，OpenClaw 会从 Venice API 自动发现模型。若 API 不可达，会回退到静态目录。

`/models` 端点是公开的（列出模型无需认证），但推理需要有效的 API key。

## 流式与工具支持

| 功能          | 支持                                                   |
| ------------- | ------------------------------------------------------ |
| **流式**      | ✅ 全模型                                              |
| **函数调用**  | ✅ 多数模型（查看 API 中的 `supportsFunctionCalling`） |
| **视觉/图像** | ✅ 标记为 “Vision” 的模型                              |
| **JSON mode** | ✅ 通过 `response_format` 支持                         |

## 定价

Venice 使用积分计费。当前费率请查看 [venice.ai/pricing](https://venice.ai/pricing)：

- **Private 模型**：通常更低成本
- **Anonymized 模型**：类似直接 API 价格 + 少量 Venice 费用

## 对比：Venice vs 直连 API

| 维度     | Venice（Anonymized） | 直连 API     |
| -------- | -------------------- | ------------ |
| **隐私** | 移除元数据，匿名     | 关联你的账号 |
| **延迟** | +10-50ms（代理）     | 直连         |
| **功能** | 多数功能支持         | 完整功能     |
| **计费** | Venice 积分          | 提供商计费   |

## 使用示例

```bash
# 使用默认私密模型
openclaw chat --model venice/llama-3.3-70b

# 通过 Venice 使用 Claude（匿名）
openclaw chat --model venice/claude-opus-45

# 使用无审查模型
openclaw chat --model venice/venice-uncensored

# 使用视觉模型并传图
openclaw chat --model venice/qwen3-vl-235b-a22b

# 使用编码模型
openclaw chat --model venice/qwen3-coder-480b-a35b-instruct
```

## 故障排查

### API key 未识别

```bash
echo $VENICE_API_KEY
openclaw models list | grep venice
```

确保 key 以 `vapi_` 开头。

### 模型不可用

Venice 模型目录动态更新。运行 `openclaw models list` 查看当前可用模型。部分模型可能暂时下线。

### 连接问题

Venice API 位于 `https://api.venice.ai/api/v1`。请确保网络允许 HTTPS 连接。

## 配置文件示例

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/llama-3.3-70b" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "llama-3.3-70b",
            name: "Llama 3.3 70B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192,
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
- [Pricing](https://venice.ai/pricing)
- [Status](https://status.venice.ai)
