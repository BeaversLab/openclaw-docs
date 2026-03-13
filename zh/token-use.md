---
summary: "OpenClaw 如何构建提示词上下文并报告 token 使用量 + 成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token 使用和成本"
---

# Token 使用与成本

OpenClaw 追踪的是 **tokens**，而不是字符。Token 取决于具体的模型，但大多数 OpenAI 风格的模型对于英文文本平均每个 Token 约对应 4 个字符。

## 系统提示词是如何构建的

OpenClaw 在每次运行时会组装自己的系统提示词。它包括：

- 工具列表 + 简短描述
- 技能列表（仅元数据；指令通过 `read` 按需加载）
- 自我更新指令
- 工作区 + 引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`，如果是新的）。大文件会被 `agents.defaults.bootstrapMaxChars` 截断（默认：20000）。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元数据（主机/操作系统/模型/思考）

请参阅 [系统提示词](/en/concepts/system-prompt) 了解完整细分。

## 哪些内容计入上下文窗口

模型接收的所有内容都计入上下文限制：

- 系统提示词（上面列出的所有部分）
- 对话历史（用户 + 助手消息）
- 工具调用和工具结果
- 附件/转录（图片、音频、文件）
- 压缩摘要和修剪产物
- 提供商包装器或安全标头（不可见，但仍会计入）

要获取详细的细分信息（按注入的文件、工具、技能和系统提示词大小），请使用 `/context list` 或 `/context detail`。请参阅[上下文](/en/concepts/context)。

## 如何查看当前的 Token 使用量

在聊天中使用以下命令：

- `/status` → **包含丰富 emoji 的状态卡片**，显示会话模型、上下文使用情况，
  上一次响应输入/输出 Token 以及**预估成本**（仅限 API 密钥）的**丰富 Emoji 状态卡片**。
- `/usage off|tokens|full` → 在每次回复中附加一个**每次响应的使用情况页脚**。
  - 每个会话持续存在（存储为 `responseUsage`）。
  - OAuth 认证**隐藏成本**（仅显示 token）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他界面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 显示
  提供商配额窗口（而非单次响应成本）。

## 成本估算（显示时）

成本是根据您的模型定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每 100 万 token 美元价格**。如果缺少定价，OpenClaw 仅显示 token。OAuth token
从不显示美元成本。

## 缓存 TTL 和修剪影响

提供商提示缓存仅在缓存 TTL 窗口内适用。OpenClaw 可以
选择运行 **cache-ttl 修剪**：一旦缓存 TTL
过期，它就会修剪会话，然后重置缓存窗口，以便后续请求可以重新使用
新缓存的上下文，而不是重新缓存完整的历史记录。这会在会话空闲超过 TTL 时
保持较低的缓存写入成本。

在 [Gateway configuration](/en/gateway/configuration) 中进行配置，并查看
[Session pruning](/en/concepts/session-pruning) 中的行为详细信息。

心跳可以在空闲间隙保持缓存**温暖**。如果您的模型缓存 TTL
为 `1h`，将心跳间隔设置为略低于该值（例如 `55m`）可以避免
重新缓存完整提示词，从而减少缓存写入成本。

对于 Anthropic API 定价，缓存读取的费用显著低于输入 token，而缓存写入则按更高的倍率计费。请参阅 Anthropic 的提示词缓存定价以获取最新费率和 TTL 倍率：
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### 示例：使用心跳保持 1 小时缓存热度

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

## 减少 token 压力的技巧

- 使用 `/compact` 来总结长会话。
- 修剪工作流中较大的工具输出。
- 保持技能描述简短（技能列表会被注入到提示中）。
- 对于冗长、探索性的工作，首选较小的模型。

请参阅 [Skills](/en/tools/skills) 以了解确切的技能列表开销公式。

import zh from '/components/footer/zh.mdx';

<zh />
