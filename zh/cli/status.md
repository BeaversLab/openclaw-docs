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

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概述包含 Gateway 网关 + 节点主机服务的安装/运行状态（如果可用）。
- 概述包含更新通道 + git SHA（针对源代码检出）。
- 更新信息显示在概览中；如果有可用的更新，status 会打印提示以运行 `openclaw update`（参见 [更新](/zh/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会在可能的情况下解析其目标配置路径所支持的 SecretRefs。
- 如果配置了支持的通道 SecretRef 但在当前命令路径中不可用，status 将保持只读状态，并报告降级输出而不是崩溃。人类可读输出会显示诸如“在此命令路径中配置的令牌不可用”之类的警告，而 JSON 输出将包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，status 会优先使用解析后的快照，并从最终输出中清除临时的“secret unavailable”渠道标记。
- `status --all` 包含一个机密概览行和一个诊断部分，该部分汇总机密诊断（为便于阅读而截断），而不会停止报告生成。

import zh from "/components/footer/zh.mdx";

<zh />
