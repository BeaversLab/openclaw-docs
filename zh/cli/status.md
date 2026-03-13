---
summary: " `openclaw status` 的 CLI 参考（诊断、探针、使用情况快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

通道 + 会话的诊断信息。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

备注：

- `--deep` 运行实时探针（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概览包括 Gateway + 节点主机服务的安装/运行状态（如果可用）。
- 概览包括更新通道 + git SHA（针对源代码检出）。
- 更新信息会显示在概览中；如果有可用更新，status 会打印提示以运行 `openclaw update`（请参阅[更新](/zh/en/install/updating)）。
- 只读状态表面（`status`、`status --json`、`status --all`）在可能的情况下会解析其目标配置路径所支持的 SecretRefs。
- 如果配置了支持的通道 SecretRef 但在当前命令路径中不可用，状态将保持只读，并报告降级输出而不是崩溃。人类可读的输出会显示诸如“configured token unavailable in this command path”之类的警告，JSON 输出则包含 `secretDiagnostics`。

import zh from '/components/footer/zh.mdx';

<zh />
