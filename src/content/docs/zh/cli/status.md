---
summary: " CLI 参考手册，用于 `openclaw status`（诊断、探测、使用快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

通道和会话的诊断信息。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

说明：

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- `--usage` 将标准化的提供商使用情况窗口打印为 `X% left`。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余配额，因此 OpenClaw 在显示前会将其反转；如果存在基于计数的字段，则优先使用。`model_remains` 响应首选聊天模型条目，需要时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照稀疏时，`/status` 可以从最新的对话使用日志中回填令牌和缓存计数器。现有的非零实时值仍然优先于对话回退值。
- 对话回退还可以在实时会话条目缺少该信息时恢复活动的运行时模型标签。如果该对话模型与所选模型不同，status 将针对恢复的运行时模型而非所选模型解析上下文窗口。
- 对于提示词大小统计，当会话元数据缺失或较小时，对话回退优先选择较大的面向提示词的总数，因此自定义提供商会话不会降级为 `0` 令牌显示。
- 当配置了多个代理时，输出包括每个代理的会话存储。
- 概览在可用时包括 Gateway(网关) + 节点主机服务的安装/运行时状态。
- 概览包括更新渠道 + git SHA（针对源代码检出）。
- 更新信息显示在概览中；如果有可用更新，status 会打印提示以运行 `openclaw update`（请参阅 [更新](/en/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会尽可能解析其目标配置路径支持的 SecretRefs。
- 如果配置了支持的渠道 SecretRef 但在当前命令路径中不可用，status 将保持只读并报告降级输出，而不是崩溃。人工输出会显示诸如“configured token unavailable in this command path”（此命令路径中配置的令牌不可用）之类的警告，JSON 输出则包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，status 优先使用解析的快照，并从最终输出中清除暂时的“secret unavailable”渠道标记。
- `status --all` 包含一个 Secrets 概览行和一个诊断部分，该部分汇总了 secret 诊断信息（为可读性已截断），而不会停止报告生成。
