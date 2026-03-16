---
summary: "`openclaw reset`（重置本地状态/配置）的 CLI 参考"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `openclaw reset`

重置本地配置/状态（保留已安装的 CLI）。

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

如果要在删除本地状态之前获取可恢复的快照，请先运行 `openclaw backup create`。

import zh from "/components/footer/zh.mdx";

<zh />
