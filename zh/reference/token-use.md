---
summary: "OpenClaw 如何构建提示词上下文并报告 token 使用量和成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用量和成本"
---

# Token 使用量和成本

OpenClaw 跟踪的是 **token**，而不是字符。Token 因模型而异，但对于英文文本，大多数 OpenAI 风格的模型平均每个 token 约为 4 个字符。

## 系统提示词是如何构建的

OpenClaw 会在每次运行时组装自己的系统提示词。它包括：

- 工具列表 + 简短描述
- 技能列表（仅元数据；指令通过 `read` 按需加载）
- 自我更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 当其为新文件时，以及存在的 `MEMORY.md` 和/或 `memory.md`）。大文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：20000），且总的引导注入量受 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：150000）。`memory/*.md` 文件通过记忆工具按需获取，不会自动注入。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

有关完整的细分，请参阅 [系统提示词](/zh/en/concepts/system-prompt)。

## 什么会计入上下文窗口

模型接收到的所有内容都会计入上下文限制：

- 系统提示词（上面列出的所有部分）
- 对话历史记录（用户 + 助手消息）
- 工具调用和工具结果
- 附件/转录（图像、音频、文件）
- 压缩摘要和修剪产物
- 提供商包装器或安全标头（不可见，但仍会被计算）

对于图像，OpenClaw 会在调用提供商之前对转录/工具图像负载进行缩小。
使用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）对此进行调整：

- 较低的值通常会减少视觉 token 的使用量和负载大小。
- 较高的值会为 OCR/UI 密集的屏幕截图保留更多视觉细节。

如需实际的细分（按注入的文件、工具、技能和系统提示词大小），请使用 `/context list` 或 `/context detail`。请参阅 [上下文](/zh/en/concepts/context)。

## 如何查看当前的 token 使用情况

在聊天中使用这些命令：

- `/status` → 显示包含会话模型、上下文使用情况的 **emoji 丰富状态卡片**，
  上一次响应的输入/输出 token，以及 **预估成本**（仅限 API key）。
- `/usage off|tokens|full` → 在每次回复中附加 **每次响应使用情况页脚**。
  - 按会话持久化（存储为 `responseUsage`）。
  - OAuth 认证 **隐藏成本**（仅显示 token）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  提供商配额窗口（而非每次响应的成本）。

## 成本估算（显示时）

成本是根据您的模型定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 万 token 美元价格**。如果缺少定价，OpenClaw 仅显示 token。OAuth token
从不显示美元成本。

## 缓存 TTL 和修剪影响

提供商提示缓存仅在缓存 TTL 时间窗口内有效。OpenClaw 可以
选择运行 **缓存 TTL 修剪**：一旦缓存 TTL
过期，它就会修剪会话，然后重置缓存窗口，以便后续请求可以重用
新缓存的上下文，而不是重新缓存整个历史记录。这可以在会话空闲超过 TTL 时
降低缓存写入成本。

在 [网关配置](/zh/en/gateway/configuration) 中进行配置，并查看 [会话修剪](/zh/en/concepts/session-pruning) 中的行为详细信息。

心跳可以使缓存在空闲间隙中保持 **温暖**。如果您的模型缓存 TTL
是 `1h`，将心跳间隔设置为略低于该值（例如 `55m`）可以避免
重新缓存完整提示，从而降低缓存写入成本。

在多代理设置中，您可以保留一个共享的模型配置，并使用 `agents.list[].params.cacheRetention` 针对每个代理调整缓存行为。

有关详细的逐项指南，请参阅 [提示缓存](/zh/en/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取显著低于输入 token 的价格，而缓存写入则按更高的倍率计费。请参阅 Anthropic 的提示缓存定价以获取最新费率和 TTL 倍率：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：通过心跳保持 1 小时缓存热度

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 示例：使用每个代理的缓存策略处理混合流量

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` 合并在所选模型的 `params` 之上，因此您只能覆盖 `cacheRetention` 并继承其他默认模型设置。

### 示例：启用 Anthropic 1M 上下文 Beta 标头

Anthropic 的 1M 上下文窗口目前处于 Beta 测试阶段。当您在受支持的 Opus 或 Sonnet 模型上启用 `context1m` 时，OpenClaw 可以注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这对应于 Anthropic 的 `context-1m-2025-08-07` beta 标头。

这仅当在该模型条目上设置了 `context1m: true` 时才适用。

要求：凭据必须有资格使用长上下文（API 密钥计费，或启用了额外使用量的订阅）。否则，Anthropic 将返回 `HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果您使用 OAuth/订阅令牌 (`sk-ant-oat-*`) 对 Anthropic 进行身份验证，OpenClaw 将跳过 `context-1m-*` beta 标头，因为 Anthropic 目前会因 HTTP 401 拒绝该组合。

## 减少 Token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 在工作流中修剪大型工具输出。
- 对于包含大量截图的会话，降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表会被注入到提示中）。
- 对于冗长、探索性的工作，首选较小的模型。

有关确切的技能列表开销公式，请参阅 [技能](/zh/en/tools/skills)。

import zh from '/components/footer/zh.mdx';

<zh />
