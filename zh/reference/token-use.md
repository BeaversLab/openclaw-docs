---
summary: "OpenClaw 如何构建提示上下文并报告 token 使用情况 + 成本"
read_when:
  - "Explaining token usage, costs, or context windows"
  - "Debugging context growth or compaction behavior"
title: "Token 使用和成本"
---

# Token 使用 & 成本

OpenClaw 跟踪 **token**，而不是字符。Token 是特定于模型的，但大多数 OpenAI 风格的模型对于英文文本平均每个 token 约 4 个字符。

## 系统提示如何构建

OpenClaw 在每次运行时组装自己的系统提示。它包括：

- 工具列表 + 简短描述
- 技能列表（仅元数据；指令通过 `read` 按需加载）
- 自更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 当新时，加上 `MEMORY.md` 和/或 `memory.md` 当存在时）。大文件被 `agents.defaults.bootstrapMaxChars` 截断（默认：20000），并且引导注入总量被 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：150000）。`memory/*.md` 文件通过内存工具按需加载，不会自动注入。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

请参阅[系统提示](/zh/concepts/system-prompt) 中的完整细分。

## 上下文窗口中计算的内容

模型接收的所有内容都计入上下文限制：

- 系统提示（上面列出的所有部分）
- 对话历史记录（用户 + 助手消息）
- 工具调用和工具结果
- 附件/转录（图像、音频、文件）
- 压缩摘要和修剪工件
- 提供商包装器或安全头（不可见，但仍计入）

对于图像，OpenClaw 在提供商调用前缩小转录/工具图像载荷。
使用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）来调整此设置：

- 较低的值通常会减少视觉 token 使用和载荷大小。
- 较高的值保留更多视觉细节，用于 OCR/UI 密集的屏幕截图。

对于实际细分（每个注入的文件、工具、技能和系统提示大小），使用 `/context list` 或 `/context detail`。请参阅[上下文](/zh/concepts/context)。

## 如何查看当前 token 使用情况

在聊天中使用这些：

- `/status` → **emoji 丰富的状态卡片**，包含会话模型、上下文使用情况、
  最后响应的输入/输出 token 和**估算成本**（仅 API 密钥）。
- `/usage off|tokens|full` → 为每个回复附加**每次响应使用页脚**。
  - 每个会话持久化（存储为 `responseUsage`）。
  - OAuth 身份验证**隐藏成本**（仅 token）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  提供商配额窗口（不是每次响应的成本）。

## 成本估算（显示时）

成本从您的模型定价配置估算：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的**每 100 万 token 的美元价格**。如果缺少定价，OpenClaw 仅显示 token。OAuth token 从不显示美元成本。

## 缓存 TTL 和修剪影响

提供商提示缓存仅在缓存 TTL 窗口内应用。OpenClaw
可以选择运行**cache-ttl 修剪**：它在缓存 TTL
过期后修剪会话一次，然后重置缓存窗口，以便后续请求可以重新使用
新缓存的上下文，而不是重新缓存整个历史记录。这可以保持缓存
写入成本较低，当会话空闲超过 TTL 时。

在 [Gateway 配置](/zh/gateway/configuration) 中配置它，并在[会话修剪](/zh/concepts/session-pruning) 中查看
行为详情。

心跳可以在空闲间隙中保持缓存**温暖**。如果您的模型缓存 TTL
是 `1h`，将心跳间隔设置在略低于该值（例如 `55m`）可以避免
重新缓存完整提示，减少缓存写入成本。

在多代理设置中，您可以保持一个共享模型配置，并通过 `agents.list[].params.cacheRetention` 每个代理调整缓存行为。

有关完整的旋钮指南，请参阅[提示缓存](/zh/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取比输入
token 便宜得多，而缓存写入按更高的乘数计费。请参阅 Anthropic 的
提示缓存定价以获取最新费率和 TTL 乘数：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：使用心跳保持 1 小时缓存温暖

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

### 示例：具有每个代理缓存策略的混合流量

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

`agents.list[].params` 合并到所选模型的 `params` 之上，因此您可以
仅覆盖 `cacheRetention` 并继承其他模型默认值不变。

### 示例：启用 Anthropic 1M 上下文 beta 头

Anthropic 的 1M 上下文窗口目前处于 beta 封闭状态。当您在支持的 Opus
或 Sonnet 模型上启用 `context1m` 时，OpenClaw 可以注入
所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这映射到 Anthropic 的 `context-1m-2025-08-07` beta 头。

这仅在该模型条目上设置了 `context1m: true` 时才适用。

要求：凭据必须符合长上下文使用条件（API 密钥
计费或启用了额外使用的订阅）。如果不符合，Anthropic 将响应
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果您使用 OAuth/订阅令牌（`sk-ant-oat-*`）对 Anthropic 进行身份验证，
OpenClaw 将跳过 `context-1m-*` beta 头，因为 Anthropic 目前
会以 HTTP 401 拒绝该组合。

## 减少 token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 在您的工作流中修剪大型工具输出。
- 对于屏幕截图密集的会话，降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述简短（技能列表被注入到提示中）。
- 对于详细、探索性工作，更喜欢使用较小的模型。

请参阅[技能](/zh/tools/skills) 了解确切的技能列表开销公式。
