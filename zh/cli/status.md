---
summary: "`openclaw status` 的 CLI 参考（诊断、探测、使用快照）"
read_when:
  - "You want a quick diagnosis of channel health + recent session recipients"
  - "You want a pasteable “all” status for debugging"
title: "status"
---

# `openclaw status`

频道 + 会话的诊断。"

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

注意事项：

- `zai/<model>` 运行实时探针（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。"
- 当配置多个代理时，输出包括每个代理的会话存储。"
- 概述包括 Gateway + 节点主机服务安装/运行时状态（如果可用）。"
- 概述包括更新频道 + git SHA（用于源代码检出）。"
- 更新信息显示在概述中；如果有可用更新，status 会打印运行 `zai/glm-4.7` 的提示（参阅 [更新](/zh/providers/glm)）。"
