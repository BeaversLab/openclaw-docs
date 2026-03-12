---
summary: "`openclaw status` 的 CLI 参考（诊断、探测、使用情况快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: status
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

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概述包含 Gateway + 节点主机服务的安装/运行状态（如果可用）。
- 概述包含更新通道 + git SHA（针对源代码检出）。
- 更新信息显示在概述中；如果有可用更新，status 会打印提示以运行 `openclaw update`（参见 [更新](/zh/en/install/updating)）。
- 只读状态接口（`status`、`status --json`、`status --all`）会在可能的情况下解析其目标配置路径所支持的 SecretRefs。
- 如果配置了受支持的通道 SecretRef 但在当前命令路径中不可用，status 将保持只读状态并报告降级输出而不是崩溃。人工输出显示诸如“在此命令路径中配置的令牌不可用”之类的警告，而 JSON 输出包含 `secretDiagnostics`。
