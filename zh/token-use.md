> [!NOTE]
> 本页正在翻译中。

---
summary: "OpenClaw 如何构建提示上下文并报告 token 用量与成本"
read_when:
  - 解释 token 用量、成本或上下文窗口
  - 调试上下文增长或压缩行为
---
# Token 用量与成本

OpenClaw 统计 **tokens**，而不是字符。token 与模型相关，但多数 OpenAI 风格模型对英文平均约 4 个字符/ token。

## System prompt 如何构建

OpenClaw 每次运行都会组装自己的 system prompt，包含：

- 工具列表 + 简短描述
- Skills 列表（仅元数据；说明按需通过 `read` 加载）
- 自更新指令
- 工作区 + bootstrap 文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、新建时的 `BOOTSTRAP.md`）。大文件按 `agents.defaults.bootstrapMaxChars` 截断（默认：20000）。
- 时间（UTC + 用户时区）
- 回复标签 + heartbeat 行为
- 运行时元数据（主机/OS/模型/思考模式）

完整拆解参见 [System Prompt](/zh/concepts/system-prompt)。

## 什么会计入上下文窗口

模型收到的所有内容都会计入上下文限制：

- system prompt（上述所有部分）
- 对话历史（用户 + 助手消息）
- 工具调用与工具结果
- 附件/转录（图片、音频、文件）
- 压缩摘要与修剪产物
- provider 包装或安全头（不可见，但仍计入）

要查看注入文件/工具/skills/system prompt 的实际构成，使用 `/context list` 或 `/context detail`。参见 [Context](/zh/concepts/context)。

## 如何查看当前 token 用量

在聊天中使用：

- `/status` → **带 emoji 的状态卡**，显示会话模型、上下文用量、最后一次回复输入/输出 token，以及 **预估成本**（仅 API key）。
- `/usage off|tokens|full` → 每条回复附加 **单次回复用量脚注**。
  - 按会话持久化（存为 `responseUsage`）。
  - OAuth 认证 **隐藏成本**（仅 tokens）。
- `/usage cost` → 从 OpenClaw 会话日志显示本地成本汇总。

其他入口：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 与 `openclaw channels list` 显示 provider 配额窗口（非逐条成本）。

## 成本估算（显示时）

成本按你的模型定价配置估算：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead`、`cacheWrite` 的 **每 1M tokens USD 价格**。若缺少定价，OpenClaw 仅显示 tokens。OAuth token 永不显示美元成本。

## Cache TTL 与修剪影响

Provider 提示缓存只在 cache TTL 窗口内生效。OpenClaw 可选运行 **cache-ttl 修剪**：当 cache TTL 过期时修剪会话，然后重置缓存窗口，使后续请求复用新的缓存上下文而不是重写整个历史。这在会话超时闲置后可降低 cache 写入成本。

在 [Gateway configuration](/zh/gateway/configuration) 中配置，行为细节参见 [Session pruning](/zh/concepts/session-pruning)。

Heartbeat 可以在空闲间隔内保持缓存 **温热**。若模型 cache TTL 为 `1h`，将 heartbeat 间隔设置略小于该值（如 `55m`）可避免重新缓存完整 prompt，从而降低 cache 写入成本。

对于 Anthropic API 定价，cache 读取明显便宜于 input tokens，而 cache 写入按更高倍数计费。最新费率与 TTL 倍数请参考 Anthropic 的 prompt caching 定价：
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### 示例：用 heartbeat 保持 1h 缓存

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheControlTtl: "1h"
    heartbeat:
      every: "55m"
```

## 降低 token 压力的小技巧

- 使用 `/compact` 总结长会话。
- 在工作流中裁剪过大的工具输出。
- 保持 skill 描述简短（skill 列表会注入 prompt）。
- 在探索性、冗长工作中优先使用更小的模型。

技能列表开销的精确公式参见 [Skills](/zh/tools/skills)。
