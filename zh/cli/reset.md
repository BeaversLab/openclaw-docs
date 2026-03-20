---
summary: "CLI 参考文档 `openclaw reset`（重置本地状态/配置）"
read_when:
  - 您希望在保留已安装的 CLI 的同时清除本地状态
  - 您希望预演将要删除的内容
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

如果您希望在删除本地状态之前获取可恢复的快照，请先运行 `openclaw backup create`。

import zh from "/components/footer/zh.mdx";

<zh />
