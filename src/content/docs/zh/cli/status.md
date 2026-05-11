---
summary: " CLI 参考手册，用于 `openclaw status`（诊断、探测、使用快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "Status"
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
- 会话状态输出将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`，`docker/*`），而 `Runtime` 告诉您会话是否正在使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端，或诸如 `codex (acp/acpx)` 之类的 ACP 后端。有关 提供商/模型/运行时 的区别，请参阅 [Agent runtimes](/zh/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段是剩余配额，因此 OpenClaw 在显示之前会将它们反转；如果存在基于计数的字段，则优先使用它们。`model_remains` 响应优先选择聊天模型条目，在需要时根据时间戳派生窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照稀疏时，`/status` 可以从最新的转录使用日志回填令牌和缓存计数。现有的非零实时值仍然优于转录回退值。
- 当实时会话条目缺少活动运行时模型标签时，转录回退还可以恢复它。如果该转录模型与所选模型不同，状态将根据恢复的运行时模型而不是所选模型来解析上下文窗口。
- 对于提示大小计算，当会话元数据缺失或较小时，转录回退更喜欢较大的面向提示的总数，因此自定义提供商会话不会退化为 `0` 令牌显示。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概述包括 Gateway(网关) + 节点主机服务安装/运行时状态（如果可用）。
- 概述包括更新渠道 + git SHA（用于源代码检出）。
- 更新信息显示在概述中；如果有可用更新，状态会打印提示以运行 `openclaw update`（请参阅 [Updating](/zh/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会在可能的情况下解析针对其配置路径支持的 SecretRefs。
- 如果配置了受支持的渠道 SecretRef 但在当前命令路径中不可用，状态将保持只读，并报告降级输出而不是崩溃。人类可读输出会显示诸如“configured token unavailable in this command path”之类的警告，而 JSON 输出则包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，状态优先使用解析的快照，并从最终输出中清除瞬时的“secret unavailable”渠道标记。
- `status --all` 包括一个 Secrets 概览行和一个诊断部分，该部分汇总了密钥诊断信息（为提高可读性而截断），且不会停止报告生成。

## 相关

- [CLI reference](/zh/cli)
- [Doctor](/zh/gateway/doctor)
