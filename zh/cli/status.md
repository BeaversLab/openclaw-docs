---
summary: "`openclaw status` 的 CLI 参考（诊断、探测、用量快照）"
read_when:
  - 需要快速诊断频道健康 + 最近会话接收者
  - 需要可粘贴的 “all” 状态用于调试
title: "status"
---

# `openclaw status`

频道 + 会话诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

备注：

- `--deep` 会运行实时探测（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 当配置多个 agent 时，输出包含每个 agent 的会话存储。
- 概览在可用时包含 Gateway + node host 服务安装/运行状态。
- 概览包含更新通道 + git SHA（用于源码检出）。
- 更新信息显示在概览中；若有可用更新，status 会提示运行 `openclaw update`（见 [更新](/zh/install/updating)）。
