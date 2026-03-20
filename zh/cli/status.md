---
summary: "CLI 参考文档，适用于 `openclaw status`（诊断、探测、使用快照）"
read_when:
  - 您希望对渠道运行状况 + 最近的会话接收者进行快速诊断
  - 您需要一个可粘贴的“所有”状态用于调试
title: "status"
---

# `openclaw status`

针对渠道和会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

备注：

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 当配置了多个代理时，输出包含每个代理的会话存储。
- 概览包含 Gateway(网关) 和节点主机服务的安装/运行状态（如果可用）。
- 概览包含更新渠道和 git SHA（针对源码检出）。
- 更新信息会显示在概览中；如果有可用更新，status 会打印提示以运行 `openclaw update`（请参阅 [更新](/zh/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会尽可能解析其目标配置路径所支持的 SecretRefs。
- 如果配置了支持的渠道 SecretRef 但在当前命令路径中不可用，status 将保持只读状态并报告降级输出，而不是崩溃。人类可读输出会显示诸如“在此命令路径中配置的令牌不可用”之类的警告，而 JSON 输出将包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，status 优先使用解析的快照，并从最终输出中清除临时的“secret unavailable（密钥不可用）”渠道标记。
- `status --all` 包括一个 Secrets 概览行和一个诊断部分，该部分汇总密钥诊断信息（为了可读性而截断），而不会停止报告生成。

import zh from "/components/footer/zh.mdx";

<zh />
