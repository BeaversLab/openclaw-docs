---
summary: " CLI 参考手册，用于 `openclaw status`（诊断、探测、使用快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable "all" status for debugging
title: "openclaw status"
---

通道和会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

注意：

- `--deep`WhatsAppTelegramDiscordSlackSignal 运行实时探测（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 纯 `openclaw status` 保持在快速只读路径上，并在跳过内存检查时将内存标记为 `not checked` 而不是不可用。繁重的安全审计、插件兼容性和内存向量探测留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 报告由 `plugins.slots.memory` 选择的活动的内存插件运行时的内存详细信息。自定义内存插件可以禁用内置的 `agents.defaults.memorySearch.enabled` 并仍然报告它们自己的文件、块、向量和 FTS 状态。
- `--usage` 将标准化的提供商使用窗口打印为 `X% left`。
- 会话状态输出将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 则告诉你该会话是使用 `OpenClaw Default`、`OpenAI Codex`CLI、CLI 后端，还是诸如 `codex (acp/acpx)` 之类的 ACP 后端。有关提供商/模型/运行时之间的区别，请参阅 [Agent runtimes](/zh/concepts/agent-runtimes)。
- MiniMax 的原始 MiniMax`usage_percent` / `usagePercent`OpenClaw 字段是剩余配额，因此 OpenClaw 在显示之前将它们反转；当存在基于计数的字段时，它们优先。`model_remains` 响应优先选择聊天模型条目，在需要时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照稀疏时，`/status` 可以从最近的记录使用日志回填令牌和缓存计数器。现有的非零实时值仍然优先于记录回退值。
- `/status`Gateway(网关) 包括简化的 Gateway(网关) 进程运行时间和主机系统运行时间。
- 当实时会话条目缺少活动运行时模型标签时，记录回退也可以恢复它。如果该记录模型与所选模型不同，status 将根据恢复的运行时模型而不是所选模型来解析上下文窗口。
- 当会话被固定到与配置的主模型不同的模型时，状态会打印这两个值、原因（`session override`）以及清除提示（`/model <configured-default>` 或 `/reset`）。配置的主模型适用于新会话或未固定会话；现有的固定会话将保持其会话选择，直到被清除。
- 对于提示词大小统计，当会话元数据缺失或较小时，抄本回退优先选择较大的以提示词为导向的总数，因此自定义提供商会话不会折叠为 `0` token 显示。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概述中包含 Gateway（网关）+ 节点主机服务的安装/运行状态（如果可用）。
- 概述包含更新渠道 + git SHA（用于源代码检出）。
- 更新信息显示在概述中；如果有可用更新，状态会打印提示以运行 `openclaw update`（请参阅 [Updating](/zh/install/updating)）。
- 模型价格刷新失败显示为可选的价格警告。这并不表示 Gateway（网关）或渠道不健康。
- 只读状态表面（`status`、`status --json`、`status --all`）会在可能的情况下解析其目标配置路径支持的 SecretRefs。
- 如果配置了支持的渠道 SecretRef 但在当前命令路径中不可用，状态将保持只读，并报告降级输出而不是崩溃。人工输出显示诸如“configured token unavailable in this command path”之类的警告，JSON 输出包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，status 优先使用解析出的快照，并从最终输出中清除临时的“secret unavailable”渠道标记。
- `status --all` 包含一个 Secrets 概览行和一个诊断部分，该部分汇总了 secret 诊断信息（为提高可读性而截断），且不会停止报告生成。

## 相关

- [CLI 参考](CLI/en/cli)
- [Doctor](/zh/gateway/doctor)
