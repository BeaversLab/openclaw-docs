---
summary: "CLI 参考，用于 `openclaw uninstall`（移除网关服务 + 本地数据）"
read_when:
  - 您想要移除网关服务和/或本地状态
  - 您希望先进行试运行
title: "卸载"
---

# `openclaw uninstall`

卸载网关服务和本地数据（CLI 保留）。

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

如果在删除状态或工作区之前需要可恢复的快照，请先运行 `openclaw backup create`。

import zh from "/components/footer/zh.mdx";

<zh />
